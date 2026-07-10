# Copilot CLI Tool Calling Test

## Overview

This test script validates that the Copilot CLI can successfully call tools from our BMAD MCP server. This approach bypasses the copilot-proxy HTTP API and uses the native Copilot CLI tool calling mechanism.

## Prerequisites

1. **Copilot CLI** must be installed:
   ```bash
   npm install -g @githubnext/copilot-cli
   ```

2. **GitHub Copilot subscription** (required for CLI access)

3. **Project built**:
   ```bash
   npm run build
   ```

## How It Works

The test script performs the following steps:

1. **Checks Prerequisites**: Verifies Copilot CLI is installed
2. **Builds Project**: Ensures latest code is compiled
3. **Configures MCP**: Dynamically adds BMAD server to `~/.copilot/mcp.json`
4. **Runs Tool Calling**: Executes `copilot -p "..." --allow-tool "bmad-test-guid"`
5. **Validates Response**: Checks for Diana/debug-related content
6. **Cleanup**: Restores original MCP config

## Usage

### Quick Run
```bash
npm run test:copilot-cli
```

### Manual Run
```bash
node scripts/test-copilot-cli-tool-calling.mjs
```

## What Gets Tested

The script sends this prompt to Copilot:
```
"Have diana help me with debugging this project"
```

With tool access to:
- `bmad-test-guid` - Our BMAD MCP server

## Expected Behavior

✅ **Success**: Copilot should:
- Connect to the BMAD MCP server
- Call the appropriate tool (likely `bmad` operation with `operation: "execute"`, `agent: "debug"`)
- Return Diana's response about debugging

❌ **Failure**: If Copilot:
- Cannot find the MCP server
- Returns generic response without tool calling
- Errors during execution

## Output Examples

### Successful Tool Call
```
🤖 Running Copilot CLI with tool calling...
ℹ️  Command: copilot -p "Have diana help me with debugging this project" --allow-tool "bmad-test-guid"

────────────────────────────────────────────────────────────────────────────────
📝 Copilot Output:
────────────────────────────────────────────────────────────────────────────────
I'll connect you with Diana, our debug specialist...

[Tool called: bmad with agent=debug]

Diana: Hello! I'm Diana, your debugging specialist. Let's analyze your project...

✓ Validating response...
✅ Diana agent mentioned
✅ Debug-related content
✅ BMAD methodology mentioned
✅ Tool calling mentioned

════════════════════════════════════════════════════════════════════════════════
✅ TEST PASSED: Tool calling appears to be working!
════════════════════════════════════════════════════════════════════════════════
```

### Failed Tool Call
```
🤖 Running Copilot CLI with tool calling...

────────────────────────────────────────────────────────────────────────────────
📝 Copilot Output:
────────────────────────────────────────────────────────────────────────────────
I can help you debug your project. Here are some general debugging tips...

⚠️  Missing: Tool calling mentioned
⚠️  Missing: Diana agent mentioned

════════════════════════════════════════════════════════════════════════════════
⚠️  TEST INCONCLUSIVE: Response received but validation failed
ℹ️  Check the output above to verify tool calling manually
════════════════════════════════════════════════════════════════════════════════
```

## MCP Configuration

The script temporarily modifies `~/.copilot/mcp.json`:

```json
{
  "mcpServers": {
    "bmad-test-guid": {
      "command": "node",
      "args": ["/path/to/bmad-mcp-server/build/index.js"],
      "env": {
        "NODE_ENV": "test"
      }
    }
  }
}
```

**Note**: Original config is backed up and restored after the test.

## Troubleshooting

### Copilot CLI Not Found
```bash
npm install -g @githubnext/copilot-cli
```

### Permission Issues
```bash
chmod +x scripts/test-copilot-cli-tool-calling.mjs
```

### Build Errors
```bash
npm run build
# Check for TypeScript errors
```

### MCP Server Not Starting
Check server logs:
```bash
node build/index.js
# Should output: "BMAD MCP Server running on stdio"
```

### Tool Not Being Called
1. Verify MCP config:
   ```bash
   cat ~/.copilot/mcp.json
   ```

2. Test MCP server manually:
   ```bash
   npm run mcp:agents
   # Should list Diana and other agents
   ```

3. Check Copilot CLI version:
   ```bash
   copilot --version
   # Ensure it supports --allow-tool flag
   ```

## Comparison: CLI vs Proxy

| Feature | Copilot CLI | Copilot Proxy |
|---------|-------------|---------------|
| Tool Calling | ✅ Supported | ❌ Not Yet |
| Setup | Config file | HTTP server |
| Authentication | GitHub account | API key |
| Use Case | Local dev/testing | API integration |
| MCP Support | Native | Via proxy layer |

## Why This Test Matters

This test helps us determine if:

1. **Copilot CLI supports tool calling** - If YES, we can use it for E2E tests
2. **BMAD MCP server works correctly** - Validates our MCP implementation
3. **Tool calling issue is proxy-specific** - Confirms our hypothesis from research

## Next Steps Based on Results

### ✅ If Test Passes
- Update E2E tests to use Copilot CLI instead of proxy
- Document Copilot CLI as recommended approach
- Keep proxy for HTTP API use cases

### ❌ If Test Fails
- Try direct OpenAI API (as recommended in decision doc)
- File issue with GitHub about Copilot CLI tool calling
- Use mocks for E2E tests until support is added

## Related Documentation

- [Decision: Tool Calling Approach](../docs/decision-tool-calling-approach.md)
- [Research Findings: Tool Calling Issue](../docs/research-findings-tool-calling-issue.md)
- [Test Execution Summary](../docs/test-execution-summary.md)

## License

ISC
