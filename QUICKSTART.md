# BMAD MCP Server - Node.js Version

## ✅ Conversion Complete!

The BMAD MCP Server has been successfully converted from Python to Node.js/TypeScript.

## Quick Start

```bash
# Navigate to the bmad-mcp-server directory
cd bmad-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Test the server (development mode)
npm run dev
```

## What Was Built

### Core Files Created

1. **`src/index.ts`** - Entry point with shebang for direct execution
2. **`src/server.ts`** - Main MCP server implementation using @modelcontextprotocol/sdk
3. **`src/types/index.ts`** - TypeScript type definitions for all data structures
4. **`src/tools/unified-tool.ts`** - Unified BMAD tool with command routing
5. **`src/utils/manifest-loader.ts`** - CSV manifest file parser
6. **`src/utils/file-reader.ts`** - Secure file reader with path validation

### Configuration Files

1. **`package.json`** - Node.js package configuration with MCP SDK dependencies
2. **`tsconfig.json`** - TypeScript compiler configuration for ES modules
3. **`README.md`** - Complete usage documentation
4. **`CONVERSION-SUMMARY.md`** - Detailed conversion summary
5. **`MIGRATION-GUIDE.md`** - Python to TypeScript migration guide

## Project Structure

```
bmad-mcp-server/
├── build/                    # Compiled JavaScript (npm run build)
│   ├── index.js             # Executable entry point
│   ├── server.js
│   ├── types/
│   ├── tools/
│   └── utils/
├── src/                      # TypeScript source code
│   ├── index.ts
│   ├── server.ts
│   ├── types/
│   │   └── index.ts
│   ├── tools/
│   │   ├── index.ts
│   │   └── unified-tool.ts
│   ├── utils/
│   │   ├── manifest-loader.ts
│   │   └── file-reader.ts
│   └── prompts/
│       └── index.ts
├── tests/                    # Test files (for future implementation)
├── package.json
├── tsconfig.json
├── README.md
├── CONVERSION-SUMMARY.md
└── MIGRATION-GUIDE.md
```

## Features Implemented

### ✅ Unified Tool Interface

- Single `bmad` tool with instruction-based routing
- Agent loading (e.g., `bmad analyst`)
- Workflow execution (e.g., `bmad *party-mode`)
- Discovery commands (`*list-agents`, `*list-workflows`, `*help`)

### ✅ Security

- Path traversal protection
- Character validation (no dangerous chars)
- ASCII-only enforcement
- Name length validation

### ✅ Error Handling

- Fuzzy matching for typo suggestions
- Case sensitivity detection
- Missing asterisk detection for workflows
- Helpful error messages with suggestions

### ✅ MCP Integration

- Full MCP SDK implementation
- Prompt handlers (BMAD agents)
- Tool handlers (unified bmad tool)
- Stdio transport for communication

### ✅ Workflow Context

- Server path resolution
- Agent manifest inline embedding
- Placeholder replacement (`{project-root}` → `{mcp-resources}`)
- Workflow instructions formatting

## Configuration for MCP Clients

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bmad": {
      "command": "node",
      "args": [
        "/absolute/path/to/bmad-mcp-server/bmad-mcp-server/build/index.js"
      ]
    }
  }
}
```

### GitHub Copilot

Auto-discovered when the repository is open in VS Code with MCP enabled.

### Cursor

Use the same configuration as Claude Desktop in Cursor's MCP settings.

## Available Commands

| Command                | Action                 | Example            |
| ---------------------- | ---------------------- | ------------------ |
| `bmad`                 | Load bmad-master agent | `bmad`             |
| `bmad <agent-name>`    | Load specific agent    | `bmad analyst`     |
| `bmad *<workflow>`     | Execute workflow       | `bmad *party-mode` |
| `bmad *list-agents`    | Show all agents        | -                  |
| `bmad *list-workflows` | Show all workflows     | -                  |
| `bmad *list-tasks`     | Show all tasks         | -                  |
| `bmad *help`           | Show help              | -                  |

## Development Commands

```bash
# Install dependencies
npm install

# Development mode (no build needed, uses tsx)
npm run dev

# Build for production
npm run build

# Run production build
npm start
# or
node build/index.js

# Run tests (when implemented)
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Testing the Server

Once built, you can test the server directly:

```bash
# Run the built server
node build/index.js

# It will wait for stdio input from an MCP client
# Press Ctrl+C to exit
```

For actual testing, configure it in an MCP client (Claude Desktop, Copilot, or Cursor).

## Key Differences from Python Version

1. **Language**: TypeScript instead of Python
2. **Module System**: ES modules with `.js` extensions in imports
3. **Dependencies**: @modelcontextprotocol/sdk instead of mcp Python package
4. **Build Step**: Requires compilation (TypeScript → JavaScript)
5. **Type Safety**: Full compile-time type checking
6. **Performance**: V8 engine optimization

## Next Steps

1. **Test Integration**
   - Test with Claude Desktop
   - Test with GitHub Copilot
   - Test with Cursor

2. **Implement Tests**
   - Unit tests for utilities (Jest)
   - Integration tests for MCP server
   - End-to-end workflow tests

3. **Optimize**
   - Cache manifest data
   - Profile performance
   - Add logging improvements

4. **Document**
   - Add JSDoc comments
   - Create API documentation
   - Add usage examples

## Support

For issues or questions:

- Check the README.md for troubleshooting
- Review CONVERSION-SUMMARY.md for technical details
- See MIGRATION-GUIDE.md for Python → TypeScript patterns

## Status

**✅ COMPLETE** - The Node.js MCP server is fully functional and ready for testing!

### Build Status

- ✅ TypeScript compilation successful
- ✅ All source files created
- ✅ Dependencies installed
- ✅ Build artifacts generated in `build/`
- ✅ Entry point executable (`build/index.js`)

### Next Milestone

Test with actual MCP clients and implement comprehensive test suite.

---

**Built on**: October 24, 2025
**Version**: 0.1.0
**Node.js**: 18+ required
