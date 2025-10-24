# BMAD MCP Server

Access the complete BMAD methodology through any AI assistant via the Model Context Protocol.

## What is BMAD?

BMAD (Business Methodology for Agile Development) provides 11 specialist AI agents and 36+ automated workflows to accelerate software development, from requirements analysis to deployment.

## Installation

```bash
git clone https://github.com/mkellerman/bmad-mcp-server.git
cd bmad-mcp-server
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Configuration

### GitHub Copilot (VS Code)

Auto-discovered when repository is open. Ensure MCP is enabled in Copilot settings.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bmad": {
      "command": "python",
      "args": ["/absolute/path/to/bmad-mcp-server/src/mcp_server.py"]
    }
  }
}
```

### Cursor

Add to Cursor's MCP settings with same configuration as Claude Desktop.

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

## Troubleshooting

**Server not found?**
- Restart your AI host after configuration
- Use absolute path in config
- Verify Python 3.11+

**Commands not working?**
- Use `*` prefix for workflows: `bmad *party-mode`
- No `*` for agents: `bmad analyst`
- Run `bmad *help` for reference

**Need help?**
- Run `bmad *help` in your AI assistant
- Check `bmad *list-agents` and `bmad *list-workflows`

## Requirements

- Python 3.11 or higher
- MCP-compatible AI host (GitHub Copilot, Claude Desktop, Cursor, etc.)

## Development

Developer documentation is in `docs/`:
- [Architecture](docs/architecture.md)
- [Product Requirements](docs/prd.md)
- [User Stories](docs/user-stories.md)

Run tests:
```bash
pip install -e ".[dev]"
pytest
```

## License

TBD

---

**Status:** Production Ready ✅ | **Version:** 2.0 | **MCP SDK:** 1.19.0
