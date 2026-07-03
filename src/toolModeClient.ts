import { generateText, tool as aiTool } from "ai";
import { AISdkClient } from "@browserbasehq/stagehand";
import type { ChatCompletionOptions, CreateChatCompletionOptions } from "@browserbasehq/stagehand";
import type { CoreMessage } from "ai";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import type { ChatCompletion } from "openai/resources";

/**
 * GLM (Z.AI) and some other OpenAI-compatible endpoints silently ignore
 * `response_format: { type: "json_schema", ... }` and return prose/markdown
 * instead of the requested JSON object. They DO, however, return clean,
 * schema-conforming JSON via `tool_calls[0].function.arguments` when given a
 * `tools` array and forced to call a specific tool.
 *
 * The stock `AISdkClient.createChatCompletion` always uses
 * `generateObject({ model, messages, schema })` for the `response_model`
 * (structured output) path, which under the hood sends
 * `responseFormat: { type: "json", schema }` to the provider (see
 * `ai/dist/index.js` `generateObject()` -> `model.doGenerate`). There is no
 * `mode: 'tool'` option in `ai@5.x` (that API existed in `ai@3`/`ai@4` and was
 * removed) — `generateObject` unconditionally uses the JSON response-format
 * path, and `generateText`'s `experimental_output` also sets `responseFormat`
 * under the hood, so it does NOT solve this either.
 *
 * The actual fix: bypass `generateObject`/`experimental_output` entirely and
 * force structured output via real function-calling — define a single tool
 * whose `inputSchema` is the requested Zod schema, force the model to call it
 * with `toolChoice: { type: "tool", toolName }`, then read the parsed,
 * already-validated arguments off `response.toolCalls[0].input`.
 *
 * This subclass overrides only the `response_model` branch; all other
 * behavior (plain chat completions / raw tool-calling for `act`/`observe`)
 * is delegated to the base `AISdkClient` implementation unchanged.
 */
export class ToolModeAISdkClient extends AISdkClient {
  /**
   * `AISdkClient.model` is `private` on the base class (see the installed
   * package's `aisdk.d.ts`), so it is not accessible from this subclass.
   * We keep our own reference to the same `LanguageModelV2` passed in,
   * rather than depending on base-class internals.
   */
  private readonly toolModeModel: LanguageModelV2;

  constructor(opts: { model: LanguageModelV2 }) {
    super(opts);
    this.toolModeModel = opts.model;
  }

  async createChatCompletion<T = ChatCompletion>({
    options,
    logger,
    retries,
  }: CreateChatCompletionOptions): Promise<T> {
    if (!options.response_model) {
      // No structured-output request: delegate to the stock implementation
      // (plain text / native tool-calling path is untouched).
      return super.createChatCompletion<T>({ options, logger, retries });
    }

    const formattedMessages = formatMessages(options);
    const toolName = sanitizeToolName(options.response_model.name) || "extract_structured_output";

    const response = await generateText({
      model: this.toolModeModel,
      messages: formattedMessages,
      tools: {
        [toolName]: aiTool({
          description:
            "Return the extracted/structured result. You MUST call this tool exactly once with the final answer instead of replying in plain text.",
          inputSchema: options.response_model.schema,
        }),
      },
      toolChoice: { type: "tool", toolName },
    });

    const call = response.toolCalls?.[0];
    if (!call) {
      throw new Error(
        `ToolModeAISdkClient: model did not produce a tool call for "${toolName}". ` +
          `finishReason=${response.finishReason} text=${JSON.stringify(response.text).slice(0, 500)}`,
      );
    }

    const data = (call as { input?: unknown }).input;

    return {
      data,
      usage: {
        prompt_tokens: response.usage.inputTokens ?? 0,
        completion_tokens: response.usage.outputTokens ?? 0,
        reasoning_tokens: response.usage.reasoningTokens ?? 0,
        cached_input_tokens: response.usage.cachedInputTokens ?? 0,
        total_tokens: response.usage.totalTokens ?? 0,
      },
    } as unknown as T;
  }
}

/**
 * Mirrors the private message-formatting logic inside the stock
 * `AISdkClient.createChatCompletion` (it is inlined, not an overridable
 * method, so it is reproduced here rather than modifying the installed
 * package under node_modules).
 */
function formatMessages(options: ChatCompletionOptions): CoreMessage[] {
  return options.messages.map((message): CoreMessage => {
    if (Array.isArray(message.content)) {
      if (message.role === "system") {
        return {
          role: "system",
          content: message.content
            .map((c) => ("text" in c && c.text ? c.text : ""))
            .join("\n"),
        };
      }

      const contentParts = message.content.map((content) => {
        if ("image_url" in content && content.image_url) {
          return { type: "image" as const, image: content.image_url.url };
        }
        return { type: "text" as const, text: content.text ?? "" };
      });

      if (message.role === "user") {
        return { role: "user", content: contentParts };
      }

      const textOnlyParts = contentParts.map((part) => ({
        type: "text" as const,
        text: part.type === "image" ? "[Image]" : part.text,
      }));
      return { role: "assistant", content: textOnlyParts };
    }

    return {
      role: message.role,
      content: message.content,
    } as CoreMessage;
  });
}

function sanitizeToolName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}
