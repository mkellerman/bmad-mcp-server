# BMAD MCP Server E2E Tests

# BMAD MCP Server E2E Tests

End-to-end integration tests for the BMAD MCP Server. Three test suites are available:

1. **Bash Integration Tests** (`test_mcp_integration.sh`) - Tests via GitHub Copilot CLI
2. **Python Infrastructure Tests** (`bmad_mcp_test_harness.py`) - Multi-phase validation with trace recording
3. **Claude Integration Tests** (`claude_mcp_integration_test.py`) - Real LLM interaction via Anthropic API

## Overview

These tests validate the complete MCP server integration by:
- Starting the server via `uv run`
- Connecting through the MCP protocol
- Executing queries via GitHub Copilot CLI
- Verifying server responses and logs

## Test Suite Overview

### 1. Bash Integration Tests (`test_mcp_integration.sh`)

**Purpose**: Validates MCP server through GitHub Copilot CLI integration  
**Runtime**: ~10 seconds  
**Requirements**: GitHub Copilot CLI installed

Tests:
- MCP server connects successfully
- Log files are created
- Server initialization messages
- MCP protocol compliance

### 2. Python Infrastructure Tests (`bmad_mcp_test_harness.py`)

**Purpose**: Multi-phase infrastructure validation with trace recording  
**Runtime**: ~5 seconds  
**Requirements**: Python 3.11+, dependencies in venv

Features:
- 6 test phases (A-F): manifest discovery, file reading, server init, prompt/resource listing, integration
- JSON schema validation for MCP protocol
- Trace recording to `trace.bmad.mcp.json`
- 19 assertions validating infrastructure

### 3. Claude Integration Tests (`claude_mcp_integration_test.py`)

**Purpose**: Real LLM interaction via Anthropic Claude API  
**Runtime**: ~15 seconds (with API calls)  
**Requirements**: Python 3.11+, Anthropic SDK, `ANTHROPIC_API_KEY` environment variable

Features:
- Tests actual Claude LLM calling MCP server tools
- Validates tool schema and Claude's tool-use behavior
- Demonstrates expected E2E workflow
- Gracefully skips if API key not set



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

### Quick Start - Run All Tests

```bash
# From project root
cd tests/e2e

# 1. Bash integration tests (via Copilot CLI)
./test_mcp_integration.sh

# 2. Python infrastructure tests
python bmad_mcp_test_harness.py

# 3. Claude integration tests (requires API key)
export ANTHROPIC_API_KEY="your-key-here"
python claude_mcp_integration_test.py
```

### Individual Test Suite Details

#### 1. Bash Integration Tests

```bash
cd tests/e2e
./test_mcp_integration.sh
```

**What it tests**:
- Server connects via GitHub Copilot CLI
- Log files created in `/tmp/test_mcp_server_*.log`
- Server responds to initialization
- MCP protocol compliance (JSON-RPC format)

**Output**:
```
============================================================
BMAD MCP Server Integration Tests
============================================================
✓ Test 1: MCP server connects successfully
✓ Test 2: Server creates log files  
✓ Test 3: Server initialization successful
✓ Test 4: MCP protocol compliance verified
============================================================
✅ All tests passed (4/4)
```

#### 2. Python Infrastructure Tests

```bash
cd tests/e2e
python bmad_mcp_test_harness.py
```

**What it tests**:
- **Phase A**: Manifest discovery (11 agents, 36 workflows)
- **Phase B**: Secure file reading (path traversal prevention)
- **Phase C**: MCP server initialization
- **Phase D**: Prompt listing (MCP protocol)
- **Phase E**: Resource listing (MCP protocol)
- **Phase F**: Integration test (subprocess startup)

**Output**:
```
BMAD MCP Server Test Harness
============================================================
Phase A: Manifest Discovery
  ✓ Found agent: bmad-master
  ✓ Found agent: analyst
  ... (19 assertions)
  
Test Summary
============================================================
Total assertions: 19
Passed: 19 ✓
Failed: 0 ✗

✅ Test harness completed.
Trace saved to: trace.bmad.mcp.json
```

**Trace File**: `trace.bmad.mcp.json` contains full execution details for debugging.

#### 3. Claude Integration Tests

```bash
cd tests/e2e

# Set your Anthropic API key
export ANTHROPIC_API_KEY="sk-ant-..."

python claude_mcp_integration_test.py
```

**What it tests**:
- **Phase A**: MCP server JSON-RPC communication
- **Phase B**: List prompts via MCP protocol
- **Phase C**: Claude LLM tool-use with simulated MCP tools
- **Phase D**: E2E workflow demonstration

**Output**:
```
Claude + BMAD MCP Server Integration Test
============================================================
Model: claude-3-5-sonnet-20241022
BMAD Root: /path/to/bmad
API Key: ✓ Set

Starting BMAD MCP server...
  ✓ MCP server started

Phase A: MCP Server Connection
  ✓ PASS: server_responds_to_initialize
  ✓ PASS: server_returns_capabilities

Phase B: List Available Prompts  
  ✓ PASS: list_prompts_responds
  ℹ️  No prompts returned (Story 1.4 implementation pending)

Phase C: Claude Tool Use Simulation
  ✓ PASS: simulated_tools_defined
  ✓ PASS: claude_attempts_tool_use
  - Tool: bmad_get_agent
    Args: {"agent_name": "analyst"}

Phase D: E2E Workflow Demonstration
  Expected workflow once Story 1.4 is complete:
  1. User asks: 'I need help analyzing requirements'
  2. Claude sees MCP tool: 'bmad_get_agent'
  3. Claude calls: bmad_get_agent(agent_name='analyst')
  4. MCP server returns: Mary the Analyst's full prompt
  5. Claude uses prompt to roleplay as Mary
  6. User gets expert analyst guidance
  ✓ PASS: workflow_documented

Test Summary
============================================================
Total tests: 7
Passed: 7 ✓
Failed: 0 ✗

✅ Claude + MCP integration test completed.
Trace saved to: trace.claude.mcp.integration.json
```

**Trace File**: `trace.claude.mcp.integration.json` contains API calls and responses.

**Without API Key**: Test gracefully skips:
```
⚠️  ANTHROPIC_API_KEY not set. Skipping Claude integration tests.
   Set ANTHROPIC_API_KEY environment variable to run these tests.
```



### Quick Run
```bash
./tests/e2e/test_mcp_integration.sh
```

### With Verbose Output
```bash
bash -x ./tests/e2e/test_mcp_integration.sh
```

## Test Architecture

### Infrastructure Tests (bmad_mcp_test_harness.py)

Validates the MCP server's internal infrastructure:
- Manifest loading and parsing
- File system security (path traversal prevention)  
- Server initialization and configuration
- MCP protocol type compliance

**Does NOT test**: Actual LLM interaction or tool calling

### Claude Integration Tests (claude_mcp_integration_test.py)

Validates the complete E2E flow with a real LLM:
- MCP server ↔ Claude API communication
- Tool schema validation
- Claude's tool-use decision making
- Request/response cycles

**Tests the actual use case**: LLM discovering and using BMAD agents via MCP

## Prerequisites

### For All Tests
- Python 3.11 or higher
- Virtual environment activated: `source venv/bin/activate`
- Dependencies installed: `pip install -r requirements.txt`
- BMAD installation at project root: `/bmad/`

### For Bash Tests Only
- GitHub Copilot CLI installed and configured
- Verify with: `copilot --version`

### For Claude Integration Tests Only
- Anthropic SDK: `pip install anthropic`
- Anthropic API key: Set via `.env` file or environment variable
  ```bash
  # Option 1: Create .env file (recommended)
  cp .env.example .env
  # Edit .env and add your key: ANTHROPIC_API_KEY=sk-ant-...
  
  # Option 2: Export environment variable
  export ANTHROPIC_API_KEY="sk-ant-..."
  ```
- Get API key from: https://console.anthropic.com/

**Note**: The test will automatically load `.env` if it exists in the project root.

## Debugging

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
