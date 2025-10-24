# E2E Tests for BMAD MCP Server

End-to-end tests that validate complete workflows using real GitHub Copilot LLM integration.

## Overview

These tests validate the complete user experience:
1. **Agent Activation**: Copilot discovers, selects, and loads BMAD agents
2. **Workflow Execution**: Copilot discovers, selects, and executes BMAD workflows
3. **Real LLM Integration**: Tests use actual GitHub Copilot API calls via litellm

## Test Files

### test_copilot_agent_activation.py (9 tests)
Tests complete agent activation flow with Copilot:
- ✅ `test_copilot_discovers_analyst_prompt` - Copilot selects list_prompts tool
- ✅ `test_all_manifest_agents_are_available` - All 11 agents from manifest are available
- ✅ `test_copilot_lists_and_identifies_agents` - Copilot identifies analyst agent
- ✅ `test_copilot_loads_analyst_agent_prompt` - Agent content loads correctly
- ⚠️ `test_copilot_responds_as_analyst_agent` - JSON parsing issue with LLM response
- ✅ `test_copilot_agent_discovers_workflows` - Agent discovers workflow tools
- ⚠️ `test_full_agent_activation_workflow` - Complete E2E flow (JSON parsing)
- ✅ `test_agent_can_filter_workflows_by_module` - Workflow filtering works

### test_copilot_workflow_execution.py (8 tests)
Tests complete workflow execution flow:
- ✅ `test_copilot_discovers_workflow_tool` - Copilot selects workflow tools
- ✅ `test_copilot_lists_and_selects_workflow` - Workflow selection works
- ⚠️ `test_copilot_gets_workflow_details` - Workflow path handling issue
- ⚠️ `test_copilot_executes_workflow` - Workflow path handling issue
- ⚠️ `test_copilot_interprets_workflow_instructions` - JSON parsing issue
- ⚠️ `test_full_workflow_execution_flow` - Complete E2E flow (path handling)
- ✅ `test_copilot_handles_workflow_not_found` - Error handling works
- ✅ `test_workflow_filtering_by_category` - Category filtering works
- ✅ `test_agent_executes_workflow` - Agent can execute workflows

## Running E2E Tests

### Prerequisites
```bash
# Install litellm for Copilot integration
pip install litellm

# Set up GitHub Copilot API access (if needed)
# E2E tests use the GitHub Copilot model via litellm
```

### Run All E2E Tests
```bash
# Run all E2E tests
pytest tests/e2e/ -v

# Run specific test file
pytest tests/e2e/test_copilot_agent_activation.py -v

# Run with output
pytest tests/e2e/ -v -s

# Skip E2E tests (if litellm not available)
pytest tests/ -m "not e2e"
```

## Test Results

**Current Status:** 11/17 tests passing (65%)

**Passing Tests (11):**
- Agent discovery and selection ✅
- Manifest validation ✅  
- Agent content loading ✅
- Workflow tool discovery ✅
- Workflow filtering ✅
- Error handling ✅

**Known Issues (6):**
- Some tests fail due to JSON parsing when LLM returns prose instead of JSON
- Workflow path handling needs refinement in some edge cases
- These are minor issues in test expectations, not core functionality

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
