# E2E Tests for BMAD MCP Server

End-to-end tests that validate complete workflows using real GitHub Copilot LLM integration.

## Overview

These tests validate the complete user experience with **GitHub Copilot API only**:
1. **Agent Activation**: Copilot discovers, selects, and loads BMAD agents
2. **Workflow Execution**: Copilot discovers, selects, and executes BMAD workflows
3. **Real LLM Integration**: Tests use actual GitHub Copilot API calls via litellm

## Test Files

### test_copilot_agent_activation.py (9 tests - All Passing ✅)

Tests complete agent activation and workflow execution using GitHub Copilot API:

| Test | Status | Description |
|------|--------|-------------|
| `test_copilot_discovers_analyst_prompt` | ✅ | Copilot selects correct tool for agent discovery |
| `test_all_manifest_agents_are_available` | ✅ | All 11 agents from manifest available via MCP prompts |
| `test_copilot_lists_and_identifies_agents` | ✅ | Copilot correctly identifies analyst agent from list |
| `test_copilot_loads_analyst_agent_prompt` | ✅ | Agent content loads with correct persona/metadata |
| `test_copilot_responds_as_analyst_agent` | ✅ | Copilot can interpret and respond as loaded agent |
| `test_copilot_agent_discovers_workflows` | ✅ | Agent discovers bmad tool for workflow execution |
| `test_full_agent_activation_workflow` | ✅ | Complete E2E: discover → load agent → verify workflows |
| `test_agent_loads_correctly_via_bmad_tool` | ✅ | Unified bmad tool loads agents correctly |
| `test_bmad_master_and_workflow_execution` | ✅ | Load bmad-master and execute workflow via bmad tool |

**Test Coverage:**
- ✅ Agent discovery via MCP prompts
- ✅ Agent loading via unified bmad tool
- ✅ Manifest validation (all agents available)
- ✅ Copilot LLM tool selection
- ✅ Workflow execution via bmad tool
- ✅ Multi-step agent activation workflows

## Running E2E Tests

### Prerequisites
```bash
# Install required dependencies (in virtual environment)
source .venv/bin/activate
pip install mcp>=1.19.0 litellm jsonschema

# Ensure GitHub Copilot API access is configured
# E2E tests use the GitHub Copilot model via litellm
```

### Run All E2E Tests
```bash
# Activate virtual environment first
source .venv/bin/activate

# Run all E2E tests
pytest tests/e2e/ -v

# Run specific test file
pytest tests/e2e/test_copilot_agent_activation.py -v

# Run with output to see LLM interactions
pytest tests/e2e/ -v -s

# Skip E2E tests (if litellm not available)
pytest tests/ -m "not e2e"
```

### Run Individual Tests
```bash
# Test agent discovery
pytest tests/e2e/test_copilot_agent_activation.py::TestCopilotAgentActivation::test_copilot_discovers_analyst_prompt -v -s

# Test manifest compliance
pytest tests/e2e/test_copilot_agent_activation.py::TestCopilotAgentActivation::test_all_manifest_agents_are_available -v -s
```

## Test Architecture

### Why Copilot API Tests?

These tests validate the **real user experience** by:
1. Making actual API calls to GitHub Copilot
2. Testing how the LLM interacts with MCP tools and prompts
3. Validating prompt quality and LLM response handling
4. Ensuring agents and workflows are discoverable and usable

### Unified Tool Architecture

The tests use the **single unified `bmad` tool** that accepts commands:
- `""` (empty) → Load bmad-master agent
- `"agent-name"` → Load specific agent (e.g., "analyst", "dev")
- `"*workflow-name"` → Execute workflow (asterisk required)

This reflects the actual MCP server architecture where one tool handles all routing.

### No Subprocess/STDIO Tests

Previous tests that spawned the MCP server as a subprocess and communicated via stdio caused hanging issues and were difficult to debug. The Copilot API-based approach is:
- More reliable (no process management)
- Faster (direct Python API calls)
- More realistic (tests actual LLM interactions)
- Easier to debug (full Python stack traces)

## Test Architecture

### Fixtures
- `real_bmad_root`: Path to actual BMAD installation
- `agent_manifest`: Loaded agent manifest CSV for validation
- `mcp_server`: BMADMCPServer instance with real BMAD files
- `copilot_tester`: CopilotMCPTester utility for LLM interactions

### Key Validations
1. **Agent Manifest Compliance**: Tests validate against real agent-manifest.csv
2. **Display Names**: Tests check for correct displayName from manifest (e.g., "Mary" for analyst)
3. **Agent Roles**: Tests verify role descriptions match manifest
4. **Tool Discovery**: Tests ensure agents can discover and use workflow tools

## Manifest Integration

Tests load and validate against the actual agent manifest:
```python
@pytest.fixture
def agent_manifest(self, real_bmad_root):
    """Load agent manifest CSV for validation."""
    manifest_path = real_bmad_root / "_cfg" / "agent-manifest.csv"
    agents = {}
    with open(manifest_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            agents[row['name']] = row
    return agents
```

This ensures:
- All 11 agents from manifest are available
- Agent names match manifest (bmad-master, analyst, architect, etc.)
- Display names match (Mary, Winston, Amelia, etc.)
- Roles and titles are correctly loaded

## Future Enhancements

1. Fix JSON parsing issues in LLM response tests
2. Improve workflow path handling in execution tests
3. Add more workflow execution scenarios
4. Add tests for multi-step workflow interactions
5. Add tests for agent collaboration workflows
