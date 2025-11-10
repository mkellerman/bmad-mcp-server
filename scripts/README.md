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

# Call bmad tool to list agents
node scripts/bmad-cli.mjs tools/call '{"name":"bmad","arguments":{"operation":"list","query":"agents"}}'

# Call bmad tool to list workflows
node scripts/bmad-cli.mjs tools/call '{"name":"bmad","arguments":{"operation":"list","query":"workflows"}}'

# Call bmad tool to execute an agent (uses conversation history for context)
node scripts/bmad-cli.mjs tools/call '{"name":"bmad","arguments":{"operation":"execute","agent":"debug"}}'

# Call bmad tool to execute a workflow
node scripts/bmad-cli.mjs tools/call '{"name":"bmad","arguments":{"operation":"execute","workflow":"prd"}}'

# List all available resources
node scripts/bmad-cli.mjs resources/list

# Read a specific BMAD file
node scripts/bmad-cli.mjs resources/read '{"uri":"bmad://core/config.yaml"}'
```

## Testing Scripts

### Test Discovery & Loading

- `test-discovery-modes.mjs` - Test multi-source discovery (project/user/git)
- `test-list-tools.mjs` - Test tool listing and registration
- `test-manifest-generation.mjs` - Test manifest generation
- `test-virtual-manifests.mjs` - Test virtual manifest CSV
- `verify-workflow-deduplication.mjs` - Test workflow deduplication

### Test Execution

- `test-agent-execution.mjs` - Test agent execution
- `test-agent-based-workflows.mjs` - Test non-standalone workflows
- `test-workflow-execution.mjs` - Test workflow execution
- `test-workflow-prompt-format.mjs` - Test execution prompt formatting
- `test-handler.mjs` - Test workflow handler extraction

### Test Prompts & Responses

- `test-prompts.mjs` - Test prompt generation
- `test-ambiguous-responses.mjs` - Test ambiguous response handling
- `test-completions.mjs` - Test LLM completions
- `test-copilot-models.mjs` - Test model detection

### Debug Tools

- `debug-workflow-matching.mjs` - Debug workflow name matching
- `test-workflow-extraction.mjs` - Test workflow extraction
- `test-xml-parse.mjs` - Test XML parsing

### Test Server

- `test-bmad-test-server.mjs` - Test server utility

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

The `archive/` directory contains previous versions of scripts that have been replaced by newer utilities or are no longer needed after the unified `bmad` tool migration.
