# Stagehand MCP Server - Local Mode.

[![npm version](https://badge.fury.io/js/stagehand-mcp-local.svg)](https://www.npmjs.com/package/stagehand-mcp-local)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Run [Stagehand](https://github.com/browserbase/stagehand) browser automation locally without cloud services. A fork of the official [@browserbasehq/mcp-server-browserbase](https://github.com/browserbase/mcp-server-browserbase) with LOCAL mode support.

## Why This Fork?

The official Browserbase MCP server **only supports cloud mode**, requiring a paid Browserbase subscription. However, Stagehand itself fully supports local browser execution.

This fork unlocks that capability:

| Feature | Official Version | This Fork |
|---------|-----------------|-----------|
| Browser execution | Browserbase Cloud only | **Local Headless Chrome** |
| Required credentials | `BROWSERBASE_API_KEY` + `PROJECT_ID` | Only LLM API key |
| Cost | Browserbase subscription | **Free** (bring your own LLM key) |
| Network requirement | Internet required | Works offline/intranet |
| Auto screenshots | ❌ | ✅ After each action |

## Use Cases

- **Local development** - Test browser automation without cloud costs
- **Self-hosted AI agents** - Run on your own servers
- **Air-gapped environments** - No external cloud dependency
- **CI/CD pipelines** - Automated testing without cloud API limits

## Quick Start

### Using npx (Recommended)

```bash
npx stagehand-mcp-local
```

### Add to Claude Code

```bash
claude mcp add stagehand-local \
  -e STAGEHAND_ENV=LOCAL \
  -e OPENAI_API_KEY=your_key \
  -- npx stagehand-mcp-local
```

### Add to Cursor / VS Code

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "stagehand-local": {
      "command": "npx",
      "args": ["stagehand-mcp-local"],
      "env": {
        "STAGEHAND_ENV": "LOCAL",
        "OPENAI_API_KEY": "your_openai_key"
      }
    }
  }
}
```

## Installation

### npm (Global)

```bash
npm install -g stagehand-mcp-local
```

### From Source

```bash
git clone https://github.com/weijiafu14/stagehand-mcp-local.git
cd stagehand-mcp-local
pnpm install
pnpm build
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `STAGEHAND_ENV` | Set to `LOCAL` for local mode | `BROWSERBASE` | **Yes** |
| `OPENAI_API_KEY` | OpenAI API key | - | One of these |
| `GEMINI_API_KEY` | Google Gemini API key | - | is required |
| `ANTHROPIC_API_KEY` | Anthropic API key | - | for Stagehand |
| `HEADLESS` | Run browser headless | `true` | No |
| `SCREENSHOT_ENABLED` | Enable auto screenshots | `true` | No |
| `SCREENSHOT_DIR` | Screenshot save directory | `/tmp/stagehand-screenshots` | No |

### CLI Options

All original Browserbase MCP server options are supported:

```bash
npx stagehand-mcp-local --browserWidth 1920 --browserHeight 1080 --experimental
```

| Flag | Description |
|------|-------------|
| `--browserWidth <width>` | Browser viewport width (default: 1024) |
| `--browserHeight <height>` | Browser viewport height (default: 768) |
| `--modelName <model>` | LLM model for Stagehand (default: gemini-2.0-flash) |
| `--experimental` | Enable experimental Stagehand features |

## Available MCP Tools

Once connected, your AI assistant can use these tools:

| Tool | Description |
|------|-------------|
| `browserbase_session_create` | Create a new browser session |
| `browserbase_session_close` | Close the current session |
| `browserbase_stagehand_navigate` | Navigate to a URL |
| `browserbase_stagehand_act` | Perform actions (click, type, etc.) |
| `browserbase_stagehand_extract` | Extract data from page |
| `browserbase_stagehand_observe` | Find interactive elements |
| `browserbase_screenshot` | Take a screenshot |
| `browserbase_stagehand_agent` | Run autonomous agent task |

## Auto Screenshots

In LOCAL mode, screenshots are automatically captured after each action for debugging and visualization:

```
Action performed: Click the login button
[SCREENSHOT:/tmp/stagehand-screenshots/default/1702012345678.jpg]
```

Parse the screenshot path programmatically:

```javascript
const match = output.match(/\[SCREENSHOT:(.+?)\]/);
if (match) {
  const screenshotPath = match[1];
  // Use the screenshot...
}
```

## System Requirements

### macOS / Windows

Playwright will download Chromium automatically.

### Linux (Ubuntu/Debian)

```bash
# Install browser dependencies
apt-get update && apt-get install -y \
  chromium libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libgbm1 libasound2 \
  libpango-1.0-0 libcairo2

# Install Playwright browsers
npx playwright install chromium
```

### Docker

```dockerfile
FROM node:20

RUN apt-get update && apt-get install -y \
  chromium libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libgbm1 libasound2 \
  libpango-1.0-0 libcairo2 \
  && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install chromium

ENV STAGEHAND_ENV=LOCAL
```

## Switching Between Modes

You can switch back to Browserbase cloud mode anytime:

```json
{
  "env": {
    "STAGEHAND_ENV": "BROWSERBASE",
    "BROWSERBASE_API_KEY": "your_key",
    "BROWSERBASE_PROJECT_ID": "your_project_id",
    "GEMINI_API_KEY": "your_gemini_key"
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Credits

This project is a fork of [@browserbasehq/mcp-server-browserbase](https://github.com/browserbase/mcp-server-browserbase) by [Browserbase, Inc](https://www.browserbase.com/).

Built with:
- [Stagehand](https://github.com/browserbase/stagehand) - AI browser automation framework
- [Model Context Protocol](https://modelcontextprotocol.io/) - LLM integration standard
- [Playwright](https://playwright.dev/) - Browser automation

## License

Apache-2.0 - See [LICENSE](./LICENSE) for details.

**Original work**: Copyright 2025 Browserbase, Inc.
**Modifications**: Copyright 2025 weijiafu14
