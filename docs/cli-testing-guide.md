# CLI Testing Guide - BMAD MCP Server

**Last Updated:** November 7, 2025  
**Audience:** Developers and QA Engineers  
**Purpose:** Command-line testing and debugging of the BMAD MCP Server

---

## Overview

This guide shows you how to test and debug the BMAD MCP Server directly from the command line using JSON-RPC 2.0 messages and `jq`. This approach provides fast, scriptable testing without requiring an AI assistant client.

**Why CLI Testing?**

- ✅ **Faster Development** - Test changes immediately without configuring Claude Desktop or other clients
- ✅ **Automation** - Build shell scripts and CI/CD pipelines for server validation
- ✅ **Debugging** - Inspect raw JSON-RPC messages and server responses
- ✅ **Documentation** - Generate examples and test edge cases systematically

**When to Use This Approach**

- During development before committing code
- When debugging server behavior or tool implementations
- For automated testing in CI/CD pipelines
- To verify server capabilities and response formats
- When documenting API examples

---

## Prerequisites

### Required Tools

1. **Node.js** - Version 18+ (already required for BMAD MCP Server)
2. **jq** - JSON processor for parsing responses (optional - for custom scripts)

```bash
# Install jq on macOS
brew install jq

# Install jq on Ubuntu/Debian
sudo apt-get install jq

# Install jq on Windows (via Chocolatey)
choco install jq
```

3. **BMAD MCP Server** - Built and ready to run

```bash
# Build the server if not already built
npm run build

# Verify build succeeded
ls -la build/index.js
ls -la build/cli-tester.js  # New CLI tool
```

### New: bmad-cli Tool

**We've created a dedicated CLI tool that makes testing much easier!**

The `bmad-cli` tool (built from `src/cli-tester.ts`) provides convenient commands for all common operations. You can use this tool instead of manually crafting JSON-RPC requests.

```bash
# Use the built tool directly
./build/cli-tester.js --help

# Or if installed globally
bmad-cli --help

# Available commands:
# - tools              List all MCP tools
# - resources          List all MCP resources
# - agents             List all BMAD agents
# - workflows          List all BMAD workflows
# - read-agent <name>  Read agent details
# - exec-agent <name> "<msg>"  Execute an agent
# ... and more
```

**When to use each approach:**

- **bmad-cli** - Quick testing, development, everyday use
- **Manual JSON-RPC** - Advanced scripting, CI/CD, custom automation
- **Shell helpers** - Custom workflows, reusable scripts

### Project Structure Reference

```
bmad-mcp-server/
├── build/           # Compiled TypeScript (your server executable)
│   ├── index.js     # Main server entry point
│   ├── server.js    # Server implementation
│   └── tools/       # Tool implementations
├── src/             # Source code
│   ├── server.ts    # Server implementation source
│   └── tools/       # Tool implementations source
└── scripts/         # Test scripts (current implementation)
```

---

## Quick Start with bmad-mcp-cli

The fastest way to start testing the MCP server:

```bash
# 1. Build the project
npm run build

# 2. List available tools
./build/cli-tester.js tools

# 3. List available agents
./build/cli-tester.js agents

# 4. List available workflows
./build/cli-tester.js workflows

# 5. Read agent details
./build/cli-tester.js read-agent analyst

# 6. List all resources
./build/cli-tester.js resources

# 7. Read a resource
./build/cli-tester.js read-resource "bmad://core/config.yaml"

# 8. Get raw JSON output (for piping to jq)
./build/cli-tester.js agents --raw | jq '.'

# 9. Use verbose mode for debugging
./build/cli-tester.js agents --verbose

# 10. Specify custom server path
./build/cli-tester.js tools --server "tsx src/index.ts"
```

**Pro Tip:** Create an alias for quick access:

```bash
# Add to ~/.zshrc or ~/.bashrc
alias mcp-cli='./build/cli-tester.js'

# Then use:
mcp-cli agents
mcp-cli workflows
```

---

## Understanding the Protocol

### JSON-RPC 2.0 Basics

The Model Context Protocol uses JSON-RPC 2.0 over stdio (standard input/output). Every request follows this structure:

```json
{
  "jsonrpc": "2.0",
  "method": "method/name",
  "id": 1,
  "params": {}
}
```

**Key Fields:**

- `jsonrpc` - Always "2.0" (protocol version)
- `method` - The MCP method to call (e.g., "tools/list", "tools/call")
- `id` - Request identifier (number or string)
- `params` - Method-specific parameters (optional)

### How stdio Transport Works

The server communicates via stdin/stdout:

1. **Input (stdin)** - You send JSON-RPC request
2. **Output (stdout)** - Server sends JSON-RPC response
3. **Errors (stderr)** - Server logs go here (not part of protocol)

This allows piping: `echo '{"jsonrpc":"2.0",...}' | node build/index.js | jq`

---

## Basic Operations

### 1. List Available Tools

**What it does:** Shows all tools the server provides (agents, workflows, operations).

```bash
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  node build/index.js | jq
```

**Expected Response Structure:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "bmad",
        "description": "Execute BMAD agents and workflows...",
        "inputSchema": {
          "type": "object",
          "properties": {
            "operation": { "type": "string", "enum": ["list", "read", "execute"] },
            "agent": { "type": "string" },
            "workflow": { "type": "string" },
            ...
          },
          "required": ["operation"]
        }
      }
    ]
  }
}
```

**Filter to just tool names:**

```bash
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  node build/index.js | jq -r '.result.tools[].name'
```

**Output:** `bmad`

### 2. List Available Resources

**What it does:** Shows all resources the server provides (BMAD files, configs, documentation).

```bash
echo '{"jsonrpc":"2.0","method":"resources/list","id":2}' | \
  node build/index.js | jq
```

**Filter to just resource URIs:**

```bash
echo '{"jsonrpc":"2.0","method":"resources/list","id":2}' | \
  node build/index.js | jq -r '.result.resources[].uri'
```

**Expected Output:**

```
bmad://core/config.yaml
bmad://bmm/config.yaml
bmad://bmm/agents/analyst.md
bmad://bmm/agents/architect.md
...
```

### 3. Read a Resource

**What it does:** Reads the content of a specific BMAD resource.

```bash
echo '{
  "jsonrpc":"2.0",
  "method":"resources/read",
  "id":3,
  "params":{
    "uri":"bmad://core/config.yaml"
  }
}' | node build/index.js | jq
```

**Extract just the content:**

```bash
echo '{
  "jsonrpc":"2.0",
  "method":"resources/read",
  "id":3,
  "params":{"uri":"bmad://core/config.yaml"}
}' | node build/index.js | jq -r '.result.contents[0].text'
```

---

## BMAD-Specific Operations

### List All Agents

```bash
echo '{
  "jsonrpc":"2.0",
  "method":"tools/call",
  "id":4,
  "params":{
    "name":"bmad",
    "arguments":{
      "operation":"list",
      "query":"agents"
    }
  }
}' | node build/index.js | jq
```

**Extract agent names:**

```bash
echo '{
  "jsonrpc":"2.0",
  "method":"tools/call",
  "id":4,
  "params":{
    "name":"bmad",
    "arguments":{"operation":"list","query":"agents"}
  }
}' | node build/index.js | jq -r '.result.content[0].text | fromjson | .[].name'
```

**Expected Output:**

```
bmad-master
analyst
architect
debug
dev
pm
sm
tea
tech-writer
ux-designer
...
```

### List All Workflows

```bash
echo '{
  "jsonrpc":"2.0",
  "method":"tools/call",
  "id":5,
  "params":{
    "name":"bmad",
    "arguments":{
      "operation":"list",
      "query":"workflows"
    }
  }
}' | node build/index.js | jq
```

**Extract workflow names:**

```bash
echo '{
  "jsonrpc":"2.0",
  "method":"tools/call",
  "id":5,
  "params":{
    "name":"bmad",
    "arguments":{"operation":"list","query":"workflows"}
  }
}' | node build/index.js | jq -r '.result.content[0].text | fromjson | .[].name'
```

### Read Agent Details

**Without execution** - Get agent information only:

```bash
echo '{
  "jsonrpc":"2.0",
  "method":"tools/call",
  "id":6,
  "params":{
    "name":"bmad",
    "arguments":{
      "operation":"read",
      "type":"agent",
      "agent":"analyst"
    }
  }
}' | node build/index.js | jq
```

**Extract specific fields:**

```bash
# Get agent description
echo '{
  "jsonrpc":"2.0",
  "method":"tools/call",
  "id":6,
  "params":{
    "name":"bmad",
    "arguments":{"operation":"read","type":"agent","agent":"analyst"}
  }
}' | node build/index.js | jq -r '.result.content[0].text | fromjson | .description'
```

### Execute an Agent

**Example: Ask the analyst to help with market research**

```bash
echo '{
  "jsonrpc":"2.0",
  "method":"tools/call",
  "id":7,
  "params":{
    "name":"bmad",
    "arguments":{
      "operation":"execute",
      "agent":"analyst",
      "message":"Help me understand the e-commerce market for artisanal coffee subscriptions"
    }
  }
}' | node build/index.js | jq
```

**Note:** Agent execution may take several seconds and will return the agent's full response.

### Execute a Workflow

**Example: Run the PRD workflow**

```bash
echo '{
  "jsonrpc":"2.0",
  "method":"tools/call",
  "id":8,
  "params":{
    "name":"bmad",
    "arguments":{
      "operation":"execute",
      "workflow":"prd",
      "message":"Create a PRD for a mobile app that helps users track their daily water intake"
    }
  }
}' | node build/index.js | jq
```

---

## Shell Helper Functions

Create reusable functions for common operations. Add these to your `~/.zshrc` or `~/.bashrc`:

### Basic MCP Helpers

```bash
# List all MCP tools
mcp_tools() {
  local server_path="${1:-node build/index.js}"
  echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
    eval "$server_path" | jq
}

# List all MCP resources
mcp_resources() {
  local server_path="${1:-node build/index.js}"
  echo '{"jsonrpc":"2.0","method":"resources/list","id":1}' | \
    eval "$server_path" | jq
}

# Read an MCP resource
mcp_read_resource() {
  local uri="$1"
  local server_path="${2:-node build/index.js}"
  echo "{\"jsonrpc\":\"2.0\",\"method\":\"resources/read\",\"id\":1,\"params\":{\"uri\":\"$uri\"}}" | \
    eval "$server_path" | jq -r '.result.contents[0].text'
}

# Call any MCP tool
mcp_call() {
  local tool_name="$1"
  local arguments="$2"
  local server_path="${3:-node build/index.js}"
  echo "{\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"id\":1,\"params\":{\"name\":\"$tool_name\",\"arguments\":$arguments}}" | \
    eval "$server_path" | jq
}
```

### BMAD-Specific Helpers

```bash
# List BMAD agents
bmad_list_agents() {
  local server_path="${1:-node build/index.js}"
  mcp_call "bmad" '{"operation":"list","query":"agents"}' "$server_path" | \
    jq -r '.result.content[0].text | fromjson | .[] | "\(.name) - \(.title)"'
}

# List BMAD workflows
bmad_list_workflows() {
  local server_path="${1:-node build/index.js}"
  mcp_call "bmad" '{"operation":"list","query":"workflows"}' "$server_path" | \
    jq -r '.result.content[0].text | fromjson | .[] | "\(.name) - \(.title)"'
}

# Read agent details
bmad_read_agent() {
  local agent_name="$1"
  local server_path="${2:-node build/index.js}"
  mcp_call "bmad" "{\"operation\":\"read\",\"type\":\"agent\",\"agent\":\"$agent_name\"}" "$server_path" | \
    jq -r '.result.content[0].text | fromjson'
}

# Execute agent (interactive - shows full response)
bmad_exec_agent() {
  local agent_name="$1"
  local message="$2"
  local server_path="${3:-node build/index.js}"
  local escaped_message=$(echo "$message" | jq -Rs .)
  mcp_call "bmad" "{\"operation\":\"execute\",\"agent\":\"$agent_name\",\"message\":$escaped_message}" "$server_path"
}

# Execute workflow (interactive - shows full response)
bmad_exec_workflow() {
  local workflow_name="$1"
  local message="$2"
  local server_path="${3:-node build/index.js}"
  local escaped_message=$(echo "$message" | jq -Rs .)
  mcp_call "bmad" "{\"operation\":\"execute\",\"workflow\":\"$workflow_name\",\"message\":$escaped_message}" "$server_path"
}
```

### Usage Examples

After adding these functions and running `source ~/.zshrc`:

```bash
# List all agents
bmad_list_agents

# List all workflows
bmad_list_workflows

# Read agent details
bmad_read_agent "analyst"

# Execute analyst with a question
bmad_exec_agent "analyst" "What are the top 3 trends in mobile app development?"

# Execute PRD workflow
bmad_exec_workflow "prd" "Create a PRD for a task management app"

# Use with custom server path (e.g., during development)
bmad_list_agents "tsx src/index.ts"
```

---

## Development Workflow Integration

### Quick Feedback Loop

Use CLI testing for rapid iteration during development:

```bash
# 1. Make code changes in src/

# 2. Build
npm run build

# 3. Test immediately
bmad_list_agents

# 4. Test specific functionality
bmad_read_agent "debug"

# 5. Verify changes
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  node build/index.js | jq '.result.tools[0].inputSchema'
```

### Pre-Commit Validation

Create a pre-commit script to validate server health:

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "🔍 Validating BMAD MCP Server..."

# Build
npm run build || exit 1

# Test tools/list
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  node build/index.js > /dev/null || {
    echo "❌ Server failed to list tools"
    exit 1
  }

# Test resources/list
echo '{"jsonrpc":"2.0","method":"resources/list","id":1}' | \
  node build/index.js > /dev/null || {
    echo "❌ Server failed to list resources"
    exit 1
  }

echo "✅ Server validation passed"
```

### CI/CD Integration

Add CLI tests to your GitHub Actions or CI pipeline:

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  cli-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install jq
        run: sudo apt-get install -y jq

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Test tools/list
        run: |
          echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
            node build/index.js | jq -e '.result.tools[0].name == "bmad"'

      - name: Test resources/list
        run: |
          echo '{"jsonrpc":"2.0","method":"resources/list","id":1}' | \
            node build/index.js | jq -e '.result.resources | length > 0'

      - name: Test BMAD list agents
        run: |
          echo '{
            "jsonrpc":"2.0",
            "method":"tools/call",
            "id":1,
            "params":{
              "name":"bmad",
              "arguments":{"operation":"list","query":"agents"}
            }
          }' | node build/index.js | \
            jq -e '.result.content[0].text | fromjson | length > 0'
```

---

## Debugging Tips

### 1. Validate JSON Syntax

Before sending requests, validate JSON:

```bash
# Good - validate first
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | jq . && \
  echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node build/index.js | jq

# If jq validation fails, you'll see the error before sending to server
```

### 2. Monitor Server Logs

The server may log to stderr. Capture it separately:

```bash
# Send request and capture both stdout and stderr
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  node build/index.js 2>server.log | jq

# Check logs
cat server.log
```

### 3. Test Error Handling

Deliberately trigger errors to verify handling:

```bash
# Invalid method
echo '{"jsonrpc":"2.0","method":"invalid/method","id":1}' | \
  node build/index.js | jq

# Missing required parameters
echo '{
  "jsonrpc":"2.0",
  "method":"tools/call",
  "id":1,
  "params":{"name":"bmad","arguments":{}}
}' | node build/index.js | jq

# Invalid agent name
echo '{
  "jsonrpc":"2.0",
  "method":"tools/call",
  "id":1,
  "params":{
    "name":"bmad",
    "arguments":{"operation":"read","type":"agent","agent":"nonexistent"}
  }
}' | node build/index.js | jq
```

### 4. Inspect Full Response Structure

Use jq's identity filter to see complete response:

```bash
# Pretty-print entire response
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  node build/index.js | jq '.'

# Save to file for inspection
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  node build/index.js | jq '.' > response.json
```

### 5. Compare Responses

Test before/after changes:

```bash
# Before changes
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  node build/index.js | jq '.' > before.json

# Make code changes, rebuild

# After changes
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  node build/index.js | jq '.' > after.json

# Compare
diff before.json after.json
```

---

## Advanced jq Techniques

### Extract Specific Tool Schema

```bash
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  node build/index.js | \
  jq '.result.tools[] | select(.name == "bmad") | .inputSchema'
```

### Get All Agent Names and Descriptions

```bash
echo '{
  "jsonrpc":"2.0",
  "method":"tools/call",
  "id":1,
  "params":{
    "name":"bmad",
    "arguments":{"operation":"list","query":"agents"}
  }
}' | node build/index.js | \
  jq -r '.result.content[0].text | fromjson |
         .[] | "\(.name): \(.description)"'
```

### Filter Workflows by Module

```bash
echo '{
  "jsonrpc":"2.0",
  "method":"tools/call",
  "id":1,
  "params":{
    "name":"bmad",
    "arguments":{"operation":"list","query":"workflows"}
  }
}' | node build/index.js | \
  jq -r '.result.content[0].text | fromjson |
         .[] | select(.module == "bmm") | .name'
```

### Create CSV Report

```bash
# Export agents to CSV
echo '{
  "jsonrpc":"2.0",
  "method":"tools/call",
  "id":1,
  "params":{
    "name":"bmad",
    "arguments":{"operation":"list","query":"agents"}
  }
}' | node build/index.js | \
  jq -r '.result.content[0].text | fromjson |
         ["Name","Module","Title"] as $headers |
         ($headers | @csv),
         (.[] | [.name, .module, .title] | @csv)' > agents.csv
```

---

## Troubleshooting

### Problem: `jq: command not found`

**Solution:** Install jq:

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# Windows (Chocolatey)
choco install jq
```

### Problem: `Cannot find module 'build/index.js'`

**Solution:** Build the project first:

```bash
npm run build
```

### Problem: No output from server

**Checklist:**

1. Verify server builds successfully: `npm run build`
2. Check server can be run directly: `node build/index.js --version`
3. Validate JSON syntax: `echo '<your-json>' | jq .`
4. Check for stderr output: `node build/index.js 2>&1`

### Problem: JSON parse errors

**Common causes:**

- Missing quotes around property names
- Single quotes instead of double quotes
- Unescaped special characters in message strings

**Solution:** Use jq to validate before sending:

```bash
# Validate JSON first
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | jq .
# If valid, pipe to server
```

### Problem: Agent/workflow not executing

**Debug steps:**

1. Verify agent/workflow exists:

   ```bash
   bmad_list_agents | grep "agent-name"
   bmad_list_workflows | grep "workflow-name"
   ```

2. Read agent/workflow details first:

   ```bash
   bmad_read_agent "agent-name"
   ```

3. Check error response:
   ```bash
   bmad_exec_agent "agent-name" "test" | jq '.error'
   ```

---

## Next Steps

### For New Developers

1. **Install Prerequisites** - Ensure you have Node.js and jq installed
2. **Practice Basic Commands** - Run the examples in "Basic Operations"
3. **Add Shell Helpers** - Copy the helper functions to your shell config
4. **Test Your Changes** - Use CLI testing during development

### For Advanced Users

1. **Create Custom Scripts** - Build automation scripts using these techniques
2. **Integrate with CI/CD** - Add CLI tests to your pipeline
3. **Build Monitoring** - Create health check scripts for production servers
4. **Generate Documentation** - Use CLI to auto-generate API documentation

### Related Documentation

- [Development Guide](./development-guide.md) - Full development workflow
- [API Contracts](./api-contracts.md) - Complete API reference
- [Architecture](./architecture.md) - System design and components

---

## Reference

### Common JSON-RPC Methods

| Method           | Purpose                      | Example                        |
| ---------------- | ---------------------------- | ------------------------------ |
| `tools/list`     | List all available tools     | See "List Available Tools"     |
| `tools/call`     | Execute a tool               | See "BMAD-Specific Operations" |
| `resources/list` | List all available resources | See "List Available Resources" |
| `resources/read` | Read a resource              | See "Read a Resource"          |
| `prompts/list`   | List available prompts       | Similar to resources/list      |
| `prompts/get`    | Get a prompt                 | Similar to resources/read      |

### BMAD Tool Operations

| Operation | Required Params                    | Optional Params     | Purpose                        |
| --------- | ---------------------------------- | ------------------- | ------------------------------ |
| `list`    | `query` (agents/workflows/modules) | `module`            | List available items           |
| `read`    | `type`, `agent`/`workflow`/`uri`   | `module`            | Read details without executing |
| `execute` | `agent`/`workflow`                 | `message`, `module` | Execute agent or workflow      |

### Exit Codes

- `0` - Success
- `1` - General error
- `2` - Invalid JSON
- `3` - Server error

---

**Need Help?**

- Open an issue: [GitHub Issues](https://github.com/mkellerman/bmad-mcp-server/issues)
- Read the docs: [Documentation Index](./index.md)
- Check examples: [scripts/](../scripts/)

---

_This guide follows the BMAD documentation standards. Last updated: November 7, 2025_
