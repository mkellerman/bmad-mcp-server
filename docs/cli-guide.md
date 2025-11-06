# BMAD CLI Guide

The BMAD CLI is a command-line tool that provides access to BMAD agents and workflows. It works similarly to the GitHub CLI (`gh`) - you can use it with command-line parameters for scripting, or run it interactively with contextual menus.

## Installation

```bash
npm install -g bmad-mcp-server
```

Or use it locally in your project:

```bash
npx bmad
```

## Usage Modes

### 1. Interactive Mode (Contextual Menus)

Simply run `bmad` without any arguments to enter interactive mode:

```bash
bmad
```

This will present you with contextual menus to:

- List agents, workflows, or modules
- Search for specific capabilities
- Read detailed documentation
- Execute agents or workflows

### 2. Command-Line Mode (For Scripting)

Use commands and flags for automation and scripting:

```bash
bmad <command> <subcommand> [options]
```

## Commands

### `list` - List Available Resources

List all agents, workflows, or modules:

```bash
# List all agents
bmad list agents

# List all workflows
bmad list workflows

# List loaded modules
bmad list modules

# Output in JSON format for scripting
bmad list agents --json
```

**Example JSON Output:**

```json
{
  "success": true,
  "data": [
    {
      "name": "analyst",
      "displayName": "Mary",
      "title": "Business Analyst",
      "module": "bmm"
    }
  ]
}
```

### `search` - Find Agents and Workflows

Search for agents and workflows by keyword:

```bash
# Search everything
bmad search debug

# Search only agents
bmad search architecture --type=agents

# Search only workflows
bmad search test --type=workflows

# JSON output
bmad search debug --json
```

### `read` - View Details

Read detailed information about an agent or workflow:

```bash
# Read agent details
bmad read agent analyst
bmad read agent pm

# Read workflow details
bmad read workflow prd
bmad read workflow debug-inspect

# JSON output
bmad read agent dev --json
```

### `execute` - Run Agents and Workflows

Execute an agent or workflow:

```bash
# Execute an agent (message required)
bmad execute agent pm --message "Create a PRD for user authentication"

# Execute a workflow (message optional)
bmad execute workflow brainstorm-project --message "Mobile app for fitness tracking"

# JSON output
bmad execute agent dev --message "Create login form" --json
```

## Options

| Option             | Short | Description                                            |
| ------------------ | ----- | ------------------------------------------------------ |
| `--json`           | -     | Output results in JSON format (for scripting)          |
| `--message <text>` | `-m`  | Provide message/context for execution                  |
| `--type <value>`   | -     | Filter search results: `agents`, `workflows`, or `all` |
| `--help`           | `-h`  | Show help message                                      |

## Examples

### Scripting with JSON Output

```bash
# Get all agents and parse with jq
bmad list agents --json | jq '.data[] | {name, title}'

# Search for debugging workflows
bmad search debug --type=workflows --json | jq '.text'

# Execute agent and capture result
RESULT=$(bmad execute agent pm -m "Create PRD for chat app" --json)
echo $RESULT | jq '.success'
```

### Interactive Workflows

```bash
# Start interactive mode
bmad

# Navigate using arrow keys
# ↑/↓ to move between options
# Enter to select
# Esc or Ctrl+C to cancel
```

### Chaining Commands

```bash
# List agents, pick one, then read details
AGENT=$(bmad list agents --json | jq -r '.data[0].name')
bmad read agent $AGENT

# Search and execute
bmad search test --type=workflows --json | jq -r '.data[0].name' | \
  xargs -I {} bmad execute workflow {} -m "Run tests"
```

## Integration with BMAD Sources

The CLI respects the same BMAD loading mechanism as the MCP server:

1. **Project-local**: `.bmad/` directory in current working directory
2. **User-global**: `~/.bmad/` directory
3. **Git remotes**: Pass git URLs as arguments

```bash
# Load from git remote
bmad git+https://github.com/user/my-bmad-module.git list agents
```

## Exit Codes

- `0` - Success
- `1` - Error (invalid command, execution failure, etc.)

Perfect for CI/CD pipelines and automation scripts.

## Tips

1. **Use `--json` for scripting** - Makes it easy to parse output with tools like `jq`
2. **Interactive mode for discovery** - Great when you're not sure what's available
3. **Tab completion** (coming soon) - Will support shell tab completion for commands
4. **Pipe output** - JSON mode works great with Unix pipes and filters

## Troubleshooting

### No agents or workflows found

Make sure you have BMAD loaded in your project:

- Check for `.bmad/` directory
- Or run from a directory with BMAD configured
- Or provide git remote URLs

### Command not working

Try running with `--help` to see all available options:

```bash
bmad --help
bmad list --help
```

### Need to see what happened

Use JSON mode to see detailed success/error information:

```bash
bmad execute agent pm -m "Test" --json | jq
```
