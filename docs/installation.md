# Installation Guide

Get BMAD MCP Server running in your AI client - works with VS Code, Claude Desktop, and Cursor.

## Prerequisites

- **Node.js 18+** - Check with `node --version`
- **AI Client** - VS Code (with Copilot), Claude Desktop, or Cursor
- **5 minutes** - That's all you need

## Quick Setup (Recommended)

The fastest way to get started uses `npx` to run BMAD directly from npm - no local installation needed.

### 1. Choose Your Use Case

**Most users: Global BMAD (No per-project setup)**

This gives you instant BMAD access in every project with zero maintenance.

**Advanced users: Project-specific customizations**

Start with global access, then customize individual projects when needed by adding a local `./bmad` folder.

### 2. Configure Your AI Client

Pick your AI client below and add the configuration:

<details>
<summary><b>VS Code with GitHub Copilot</b></summary>

Add to `.vscode/settings.json` (workspace) or User Settings:

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

</details>

<details>
<summary><b>Claude Desktop</b></summary>

Add to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

</details>

<details>
<summary><b>Cursor</b></summary>

Cursor uses the same configuration as Claude Desktop. Add to Cursor's MCP settings:

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

</details>

### 3. Restart Your AI Client

- **VS Code:** Reload window (Cmd/Ctrl+Shift+P → "Reload Window")
- **Claude Desktop:** Quit and reopen
- **Cursor:** Restart application

### 4. Verify It Works

In any project, type:

```
bmad analyst
```

You should see Mary (the Business Analyst) load. That's it—you're done! BMAD now works in every project.

---

## Advanced Configuration

### Understanding BMAD Resource Discovery

The MCP Server finds BMAD files using a priority system. Lower numbers win:

| Priority | Location         | When to Use                           |
| -------- | ---------------- | ------------------------------------- |
| 1        | `./bmad`         | Project-specific custom agents        |
| 2        | CLI argument     | Development/testing                   |
| 3        | `BMAD_ROOT` env  | Point to specific project             |
| 4        | `~/.bmad`        | Your personal agent customizations    |
| 5        | Package defaults | Always available, no setup needed     |

**How it works in practice:**

- **No local `./bmad` folder?** → Server uses global defaults (Priority 5)
- **Add `./bmad` to project?** → Server uses project version (Priority 1)
- **Multiple projects?** → Each can have its own customizations or use global

### Option 1: Global Access Only (Simplest)

**Best for:** Most users who want BMAD available everywhere

No additional setup needed! The basic configuration above provides BMAD to all projects.

You can optionally initialize a personal `~/.bmad` folder to customize agents globally:

```
# In your AI chat:
bmad *init --user
```

This copies BMAD files to `~/.bmad` where you can edit them. Changes apply to all projects (unless overridden).

### Option 2: Project-Specific Customizations

**Best for:** Projects needing custom agents or workflows

Create a local `./bmad` folder in any project:

```
# In your AI chat:
bmad *init --project
```

This copies BMAD files to `./bmad` in your current workspace. Customize as needed:

```
my-project/
├── bmad/                    # ← Project customizations
│   ├── _cfg/
│   ├── custom-agents/
│   └── custom-workflows/
└── src/
```

The MCP Server automatically detects and uses the local version for this project.

### Option 3: Point to Specific Location

**Best for:** Testing, shared team configurations

Use `BMAD_ROOT` to point to any location:

<details>
<summary><b>VS Code Example</b></summary>

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

</details>

<details>
<summary><b>Claude Desktop / Cursor Example</b></summary>

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server@latest"],
      "env": {
        "BMAD_ROOT": "/absolute/path/to/bmad"
      }
    }
  }
}
```

**Note:** Always use absolute paths with Claude Desktop and Cursor.

</details>

### Option 4: Local Development

**Best for:** Contributors working on the MCP Server itself

```bash
git clone https://github.com/mkellerman/bmad-mcp-server.git
cd bmad-mcp-server
npm install
npm run build
```

Then configure with absolute paths:

<details>
<summary><b>VS Code Development Config</b></summary>

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

</details>

---

## Understanding Priority & Selection

### How Resources Are Selected

When you run `bmad analyst`, the server:

1. **Finds all matches** - Searches all configured locations
2. **Filters by existence** - Only considers files that actually exist
3. **Sorts by priority** - Lower priority number wins
4. **Returns best match** - Uses highest-priority existing file

### Example: Project Override

You have BMAD globally but want a custom analyst for one project:

```bash
# 1. Create project customization
bmad *init --project

# 2. Edit the analyst
nano ./bmad/core/agents/analyst.md

# 3. Use as normal
bmad analyst  # ← Uses your custom version
```

**For this project only:**
- `bmad analyst` → Loads `./bmad/core/agents/analyst.md` (Priority 1)

**For all other projects:**
- `bmad analyst` → Loads global defaults (Priority 5)

### Multiple Locations Working Together

The server can discover and merge resources from multiple locations:

```
Priority 1: ./bmad (project)           → Custom architect
Priority 4: ~/.bmad (user)             → Custom analyst  
Priority 5: package (built-in)         → All other agents

Result: architect from project, analyst from user, rest from package
```

---

## Troubleshooting

### Server not responding?

1. **Restart your AI client completely**
2. **Check Node.js version:** `node --version` (must be 18+)
3. **Verify configuration syntax** (valid JSON, correct paths)

### Agent not found?

1. **Try the list command:** `bmad *list-agents`
2. **Check agent name spelling** (lowercase-hyphen format)
3. **Verify BMAD files exist** at expected location

### Path issues in Claude Desktop?

Claude Desktop's working directory may be undefined. **Always use absolute paths** in Claude Desktop configuration.

📖 **More solutions:** See [Troubleshooting Guide](./troubleshooting.md)

---

## Next Steps

- **Try different agents:** `bmad architect`, `bmad dev`, `bmad ux-expert`
- **Run a workflow:** `bmad *party-mode`
- **Customize for your needs:** `bmad *init --user` or `bmad *init --project`
- **Learn the architecture:** [Architecture Guide](./architecture.md)

---

## Need Help?

- **Troubleshooting:** [troubleshooting.md](./troubleshooting.md)
- **Development:** [development.md](./development.md)
- **Architecture:** [architecture.md](./architecture.md)
- **GitHub Issues:** [Report a problem](https://github.com/mkellerman/bmad-mcp-server/issues)