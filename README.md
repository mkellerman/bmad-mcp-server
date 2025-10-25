# BMAD MCP Server (Node.js)

Access the complete BMAD methodology through any AI assistant via the Model Context Protocol.

## What is BMAD?

BMAD (Business Methodology for Agile Development) provides 11 specialist AI agents and 36+ automated workflows to accelerate software development, from requirements analysis to deployment.

## Prerequisites

- Node.js 18 or higher
- npm or yarn

## Installation

### Quick Start (No Clone Required)

Use directly from GitHub via `npx` - no installation needed!

### Local Development

```bash
git clone https://github.com/mkellerman/bmad-mcp-server.git
cd bmad-mcp-server
npm install
npm run build
```

## Configuration

### GitHub Copilot (VS Code)

**Remote (recommended):**
```json
{
  "servers": {
    "bmad": {
      "command": "npx",
      "args": ["git+https://github.com/mkellerman/bmad-mcp-server#v2-node", "bmad-mcp-server"]
    }
  }
}
```

**Local:**

Auto-discovered when repository is open locally.

### Claude Desktop / Cursor

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

**Remote (recommended):**
```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": ["git+https://github.com/mkellerman/bmad-mcp-server#v2-node", "bmad-mcp-server"]
    }
  }
}
```

**Local:**
```json
{
  "mcpServers": {
    "bmad": {
      "command": "node",
      "args": ["/absolute/path/to/bmad-mcp-server/build/index.js"]
    }
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode (with tsx)
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Start E2E test environment (LiteLLM proxy)
npm run e2e:start

# Stop E2E test environment
npm run e2e:stop

# View E2E environment logs
npm run e2e:logs

# Lint code
npm run lint

# Format code
npm run format
```

## Quick Start

```bash
# Get help
bmad *help

# See what's available
bmad *list-agents
bmad *list-workflows

# Load an agent
bmad analyst      # Business Analyst
bmad dev          # Senior Developer
bmad tea          # Test Architect

# Run a workflow
bmad *party-mode      # Multi-agent discussion
bmad *brainstorming   # Creative ideation
```

## Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `bmad` | Load bmad-master (default) | `bmad` |
| `bmad <agent>` | Load specialist agent | `bmad analyst` |
| `bmad *<workflow>` | Execute workflow | `bmad *party-mode` |
| `bmad *list-agents` | Show all agents | - |
| `bmad *list-workflows` | Show all workflows | - |
| `bmad *help` | Show command reference | - |

## Available Agents

- **bmad-master** - Orchestrator and methodology expert
- **analyst** (Mary) - Strategic Business Analyst
- **architect** (Winston) - Solution Architect
- **dev** (Olivia) - Senior Developer
- **tea** (Murat) - Master Test Architect
- **pm** (John) - Product Manager
- **sm** (Sarah) - Scrum Master
- **ux-expert** (Alex) - UX/UI Specialist
- Plus 3 more specialized agents

## Popular Workflows

- `*party-mode` - Multi-agent group discussions
- `*brainstorming` - Facilitated creative ideation
- `*framework` - Initialize test framework
- `*atdd` - Generate E2E tests before implementation
- `*workflow-status` - Check workflow status
- Plus 31 more workflows

## Project Structure

```
bmad-mcp-server/
├── bmad/                     # BMAD methodology files (agents, workflows)
│   ├── _cfg/                 # Configuration and manifests
│   │   ├── agent-manifest.csv
│   │   ├── workflow-manifest.csv
│   │   ├── task-manifest.csv
│   │   └── agents/           # Agent customization files
│   ├── core/                 # Core BMAD agents and workflows
│   ├── bmm/                  # BMM module agents and workflows
│   └── docs/                 # BMAD documentation
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server implementation
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── tools/
│   │   ├── index.ts          # Tools module exports
│   │   └── unified-tool.ts   # Unified BMAD tool implementation
│   ├── utils/
│   │   ├── manifest-loader.ts # CSV manifest parser
│   │   └── file-reader.ts     # Secure file reader
│   └── prompts/
│       └── index.ts          # Prompt definitions (placeholder)
├── build/                    # Compiled JavaScript (generated)
├── tests/                    # Test files
├── package.json
├── tsconfig.json
└── README.md
```

## Troubleshooting

**Server not found?**
- Restart your AI host after configuration
- Use absolute path in config
- Ensure Node.js 18+ is installed
- Check that build/ directory exists (run `npm run build`)

**Build errors?**
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version with `node --version`
- Try deleting `node_modules` and `build` folders, then run `npm install && npm run build`

**Import errors?**
- Ensure `type: "module"` is in package.json
- Check that all imports use `.js` extensions
- Verify tsconfig.json has `"module": "ESNext"`

## License

ISC
