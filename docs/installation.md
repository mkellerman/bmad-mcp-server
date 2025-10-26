# Installation Guide

Complete installation and configuration instructions for the BMAD MCP Server.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- An MCP-compatible AI client (VS Code with GitHub Copilot, Claude Desktop, or Cursor)

## Installation Methods

### Quick Start (Recommended)

Use directly from GitHub via `npx` - no installation needed!

This method is perfect for:

- Getting started quickly
- Always using the latest version
- Not needing to manage local installations

### Local Development

For contributors or users who want to modify BMAD:

```bash
git clone https://github.com/mkellerman/bmad-mcp-server.git
cd bmad-mcp-server
npm install
npm run build
```

## Configuration

The BMAD MCP server locates BMAD templates using this priority order (first match wins):

1. **Local project** – `./bmad` inside the current workspace
2. **Command-line argument** – `node build/index.js /path/to/bmad`
3. **Environment variable** – `BMAD_ROOT=/path/to/bmad`
4. **User defaults** – `~/.bmad` (create with `bmad *init --user`)
5. **Package defaults** – read-only templates bundled with the server

Use `bmad *discover` to inspect which location is active, and `bmad *init --help` to copy templates into a writable directory.

## Configuration Examples by Use Case

### Option 1: Use Package Defaults (Easiest)

**Best for:** Just trying out BMAD, no customization needed

No configuration needed - just use the built-in BMAD files:

```json
{
  "servers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"]
    }
  }
}
```

### Option 2: Local Project BMAD Files

**Best for:** Project-specific BMAD customizations

Have a `bmad/` folder in your workspace? It will be detected automatically:

```json
{
  "servers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"]
    }
  }
}
```

Your workspace structure:

```
my-project/
├── bmad/              # ← Automatically detected (Priority 1)
│   ├── _cfg/
│   │   ├── agent-manifest.csv
│   │   └── workflow-manifest.csv
│   ├── custom-agents/
│   └── custom-workflows/
└── src/
```

To initialize this folder:

```bash
# In your AI chat, run:
bmad *init --project
```

### Option 3: Environment Variable (Specific Project)

**Best for:** Pointing to a specific project without a local `bmad/` folder

Use `BMAD_ROOT` to specify the project path:

```json
{
  "servers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"],
      "env": {
        "BMAD_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
```

For VS Code with workspace variables:

```json
{
  "servers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"],
      "env": {
        "BMAD_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

### Option 4: User Defaults (Shared Across Projects)

**Best for:** Custom agents/workflows you want to use in all projects

Initialize BMAD files in your home directory once:

```bash
# In your AI chat, run:
bmad *init --user
```

This creates `~/.bmad/` with editable BMAD files. Then configure with no special settings:

```json
{
  "servers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"]
    }
  }
}
```

All projects will use `~/.bmad/` unless they have their own `./bmad` folder (Priority 1).

### Option 5: CLI Argument (Local Development)

**Best for:** MCP server development, testing custom BMAD locations

For contributors working on the MCP server itself:

```json
{
  "servers": {
    "bmad": {
      "command": "node",
      "args": [
        "/path/to/bmad-mcp-server/build/index.js",
        "/path/to/custom/bmad"
      ]
    }
  }
}
```

## Client Setup

### GitHub Copilot (VS Code)

**Basic Setup (using package defaults):**

Add to your VS Code settings (`.vscode/settings.json` or User Settings):

```json
{
  "github.copilot.chat.mcp.enabled": true,
  "github.copilot.chat.mcp.servers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"]
    }
  }
}
```

**With workspace BMAD_ROOT:**

```json
{
  "github.copilot.chat.mcp.enabled": true,
  "github.copilot.chat.mcp.servers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"],
      "env": {
        "BMAD_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

**Local development (working on MCP server itself):**

```json
{
  "github.copilot.chat.mcp.enabled": true,
  "github.copilot.chat.mcp.servers": {
    "bmad": {
      "command": "node",
      "args": ["${workspaceFolder}/build/index.js"],
      "env": {
        "BMAD_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

**Basic setup (using package defaults):**

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server@latest"]
    }
  }
}
```

**With BMAD_ROOT (pointing to specific project):**

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server@latest"],
      "env": {
        "BMAD_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
```

**Local development:**

```json
{
  "mcpServers": {
    "bmad": {
      "command": "node",
      "args": ["/absolute/path/to/bmad-mcp-server/build/index.js"],
      "env": {
        "BMAD_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
```

**Important**: Claude Desktop's working directory may be undefined (like `/` on macOS), so always use absolute paths.

### Cursor

Cursor uses the same configuration format as Claude Desktop. Add the configuration to your Cursor settings.

## Initialize Templates (Optional)

Run the MCP server and execute one of the following commands to copy BMAD templates to an editable location:

- `bmad *init --project` → Copy templates into your current workspace (`./bmad`)
- `bmad *init --user` → Copy templates into `~/.bmad` for reuse across projects
- `bmad *init <path>` → Copy templates into a shared or custom location

After initialization, restart your MCP client or reconnect the server, then run `bmad *discover` to verify the active location.

## Verification

After configuration, verify your installation:

1. Restart your AI client (VS Code, Claude Desktop, or Cursor)
2. Start a new chat/session
3. Try: `bmad *help`
4. You should see the BMAD master menu

If you encounter issues, see the [Troubleshooting Guide](./troubleshooting.md).
