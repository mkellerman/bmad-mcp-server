# BMAD MCP Server Scripts

This directory contains CLI utility scripts for testing and troubleshooting the BMAD MCP Server.

## Available Scripts

### bmad-cli.mjs (⭐ Recommended)

**Direct MCP Server Communication Tool** - Spawns the actual MCP server and communicates via JSON-RPC over stdio, giving you PRODUCTION behavior with CLI convenience.

**Usage:**

```bash
node scripts/bmad-cli.mjs <method> [params-json] [options]
```

**Methods:**

- `tools/list` - List all available tools
- `tools/call` - Call a specific tool
- `resources/list` - List all available resources
- `resources/read` - Read a specific resource

**Options:**

- `--raw` - Show raw JSON-RPC messages (for debugging)
- `--git=<url>` - Use specific Git remote

**Examples:**

```bash
# List all tools with descriptions
node scripts/bmad-cli.mjs tools/list

# Get raw tool schema
node scripts/bmad-cli.mjs tools/list --raw

# Call bmad-resources to list agents
node scripts/bmad-cli.mjs tools/call '{"name":"bmad-resources","arguments":{"operation":"agents"}}'

# Call bmad-resources to list workflows
node scripts/bmad-cli.mjs tools/call '{"name":"bmad-resources","arguments":{"operation":"workflows"}}'

# List all available resources
node scripts/bmad-cli.mjs resources/list

# Read a specific BMAD file
node scripts/bmad-cli.mjs resources/read '{"uri":"bmad://core/config.yaml"}'

# Call an agent
node scripts/bmad-cli.mjs tools/call '{"name":"bmm-debug","arguments":{"message":"Hello"}}'
```

## Quick Test Scripts

### show-tool-description.mjs

Display the raw tool description (schema) for any MCP tool.

**Usage:**

```bash
node scripts/show-tool-description.mjs <tool-name>
```

**Example:**

```bash
node scripts/show-tool-description.mjs bmad-resources
node scripts/show-tool-description.mjs bmad-workflow
node scripts/show-tool-description.mjs bmm-debug
```

### show-tool-output.mjs

Call any tool with arguments and display the raw output.

**Usage:**

```bash
node scripts/show-tool-output.mjs <tool-name> [args-json]
```

**Examples:**

```bash
node scripts/show-tool-output.mjs bmad-resources '{"operation":"modules"}'
node scripts/show-tool-output.mjs bmad-resources '{"operation":"agents"}'
node scripts/show-tool-output.mjs bmad-resources '{"operation":"workflows"}'
node scripts/show-tool-output.mjs bmad-workflow '{"workflow":"prd"}'
```

### show-list-agents.mjs

Display raw output from listing all agents.

**Usage:**

```bash
node scripts/show-list-agents.mjs
```

### show-list-workflows.mjs

Display raw output from listing all workflows.

**Usage:**

```bash
node scripts/show-list-workflows.mjs
```

### show-list-resources.mjs

Display raw output from listing all resources, optionally filtered by pattern.

**Usage:**

```bash
node scripts/show-list-resources.mjs [pattern]
```

**Examples:**

```bash
node scripts/show-list-resources.mjs
node scripts/show-list-resources.mjs "core/**/*.yaml"
node scripts/show-list-resources.mjs "bmm/agents/**"
```

## Output Format

All scripts display:

1. **RAW OUTPUT (JSON)** - The complete MCP response structure
2. **CONTENT (MARKDOWN)** - Human-readable formatted content
3. **STRUCTURED DATA** - Parsed metadata when available

This helps verify:

- MCP protocol compliance
- Tool registration and discovery
- Content formatting
- Resource loading
- Error handling

## Archive

The `archive/` directory contains previous versions of scripts that have been replaced by the new focused troubleshooting utilities.
