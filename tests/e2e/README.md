# BMAD MCP Server E2E Tests

End-to-end integration tests for the BMAD MCP Server using GitHub Copilot CLI.

## Overview

These tests validate the complete MCP server integration by:
- Starting the server via `uv run`
- Connecting through the MCP protocol
- Executing queries via GitHub Copilot CLI
- Verifying server responses and logs

## Prerequisites

1. **GitHub Copilot CLI** - Install from: https://github.com/github/gh-copilot
   ```bash
   gh extension install github/gh-copilot
   ```

2. **uv** - Python package manager
   ```bash
   brew install uv
   ```

3. **BMAD MCP Server** - Already installed in this repo

## Running Tests

### Quick Run
```bash
./tests/e2e/test_mcp_integration.sh
```

### With Verbose Output
```bash
bash -x ./tests/e2e/test_mcp_integration.sh
```

## Test Cases

### 1. MCP Server Loads
- **Purpose**: Verify the server starts and registers with MCP
- **Method**: Query available tools/servers
- **Success**: Response mentions "bmad"

### 2. Server Responds to Queries
- **Purpose**: Verify server responds to basic queries
- **Method**: Ask about available bmad tools
- **Success**: Response contains "bmad"

### 3. Log Files Created
- **Purpose**: Verify logging is working
- **Method**: Check `.logs` directory
- **Success**: Log files present

### 4. Server Initialization
- **Purpose**: Verify server initializes correctly
- **Method**: Check logs for initialization messages
- **Success**: Logs contain "Starting BMAD MCP Server" and "initialized successfully"

### 5. MCP Protocol Compliance
- **Purpose**: Verify MCP protocol interactions
- **Method**: Check logs for protocol messages
- **Success**: Logs contain ListToolsRequest/list_tools or ListPromptsRequest/list_prompts

## Test Output

Successful test run example:
```
BMAD MCP Server E2E Integration Tests
======================================

Setting up E2E test environment...
Test directory: /tmp/bmad-e2e-test-12345
Log directory: /Users/mkellerman/GitHub/bmad-mcp-server/.logs

==========================================
Test 1: MCP Server Loads
==========================================
Prompt: list available tools and servers

✓ PASS: Found expected pattern

==========================================
Test Summary
==========================================
Tests run:    5
Tests passed: 5
Tests failed: 0

All tests passed! ✓
```

## Debugging Failed Tests

### Check Server Logs
```bash
ls -lh .logs/
cat .logs/session-*.log | grep -i error
```

### Verify MCP Configuration
```bash
cat /tmp/bmad-e2e-test-*/​.vscode/mcp.json
```

### Test Server Manually
```bash
cd /tmp/bmad-e2e-test-12345  # Use actual test dir
copilot -p "test query" --allow-tool 'bmad' --log-level debug --log-dir /Users/mkellerman/GitHub/bmad-mcp-server/.logs
```

## CI/CD Integration

Add to GitHub Actions:
```yaml
- name: Run E2E Tests
  run: |
    ./tests/e2e/test_mcp_integration.sh
```

## Extending Tests

To add new test cases:

1. Create test function in `test_mcp_integration.sh`:
```bash
test_my_feature() {
    run_test \
        "My Feature Test" \
        "prompt to send" \
        "expected_pattern_in_response"
}
```

2. Add to main execution:
```bash
main() {
    # ... existing tests
    test_my_feature
    # ...
}
```

## Troubleshooting

### "copilot CLI not found"
Install GitHub Copilot CLI extension for gh

### "uv not found"
```bash
brew install uv
# or
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Server doesn't start
Check if server can run manually:
```bash
cd /Users/mkellerman/GitHub/bmad-mcp-server
uv run bmad-mcp-server
```

### Timeout errors
Increase timeout in `run_test()` function (default: 60s)

## Notes

- Tests create temporary directories in `/tmp/bmad-e2e-test-*`
- Cleanup happens automatically via trap
- Logs are preserved in `.logs/` directory
- Each test run creates new session logs
