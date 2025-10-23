# BMAD MCP Server Tests

Comprehensive test suite for the BMAD MCP Server, including unit tests, integration tests, and Copilot-based MCP prompt testing.

## Quick Start

```bash
# Run all tests (excludes manual tests by default)
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run manual/interactive tests
pytest -m manual -v -s

# Run integration tests only
pytest -m integration
```

## Table of Contents

- [Structure](#structure)
- [Running Tests](#running-tests)
- [Pytest Commands](#pytest-commands)
- [Copilot Testing Framework](#copilot-testing-framework)
- [Test Types](#test-types)
- [Writing New Tests](#writing-new-tests)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Structure

```
tests/
├── README.md                    # This file - complete testing documentation
├── conftest.py                  # Pytest configuration and markers
├── unit/                        # Unit tests
│   ├── __init__.py
│   ├── test_file_reader.py      # File reading and path validation
│   └── test_manifest_loader.py  # Manifest loading and CSV parsing
├── integration/                 # Integration tests
│   ├── __init__.py
│   └── test_mcp_prompts.py      # ⭐ Copilot+MCP integration tests
├── manual/                      # Manual/interactive tests
│   ├── copilot_mcp.py           # ⭐ Interactive Copilot test (pytest compatible)
└── utils/                       # Shared test utilities
    ├── __init__.py
    └── copilot_tester.py        # ⭐ GitHub Copilot MCP testing utility
```

---

## Running Tests

### All Tests

```bash
# Run all tests (excludes manual tests by default)
pytest

# Include manual tests
pytest -m ""

# Run with verbose output
pytest -v

# Run with coverage
pytest --cov=src --cov-report=html
```

### By Test Type

```bash
# Unit tests only (fast)
pytest tests/unit/

# Integration tests only (requires litellm)
pytest -m integration
# or
pytest tests/integration/

# Manual/interactive tests only (verbose output)
pytest -m manual -v -s
```

### By Directory

```bash
# All unit tests
pytest tests/unit/

# All integration tests
pytest tests/integration/

# All manual tests
pytest tests/manual/

# Specific test file
pytest tests/integration/test_mcp_prompts.py
```

### By Test Name

```bash
# Run specific test class
pytest tests/integration/test_mcp_prompts.py::TestMCPPromptsWithCopilot

# Run specific test method
pytest tests/integration/test_mcp_prompts.py::TestMCPPromptsWithCopilot::test_copilot_selects_list_tools

# Run tests matching pattern
pytest -k "copilot"
pytest -k "list_tools"
```

### Excluding Tests

```bash
# Exclude manual tests (default)
pytest -m "not manual"

# Exclude integration tests
pytest -m "not integration"

# Exclude both
pytest -m "not manual and not integration"

# Run only unit tests (exclude integration and manual)
pytest tests/unit/
```

---

## Pytest Commands

### Common Options

```bash
# Stop at first failure
pytest -x

# Show local variables in tracebacks
pytest -l

# Run last failed tests
pytest --lf

# Run failed tests first, then others
pytest --ff

# Show what would be collected (dry run)
pytest --collect-only

# Quiet mode
pytest -q

# Very verbose
pytest -vv

# Show print statements
pytest -s
```

### Coverage

```bash
# Run with coverage
pytest --cov=src

# HTML coverage report
pytest --cov=src --cov-report=html
# Then open htmlcov/index.html

# Terminal coverage report
pytest --cov=src --cov-report=term

# Coverage for specific module
pytest --cov=src.mcp_server --cov-report=term
```

### Debugging

```bash
# Drop into debugger on failure
pytest --pdb

# Drop into debugger at start of test
pytest --trace

# Show all output (no capture)
pytest -s

# Show full diff on assertion failures
pytest -vv
```

### CI/CD Friendly

```bash
# Run all non-interactive tests with coverage
pytest -m "not manual" --cov=src --cov-report=xml

# Strict mode (warnings as errors)
pytest -W error

# JUnit XML output
pytest --junit-xml=test-results.xml
```

---

## Copilot Testing Framework

The Copilot testing framework uses GitHub Copilot to simulate real-world LLM interactions with MCP tools.

### Architecture

```
┌─────────────────────────────────┐
│ Your Test Code                  │
│ (test_mcp_prompts.py or         │
│  copilot_mcp.py)                │
└────────────┬────────────────────┘
             │ uses
             v
┌─────────────────────────────────┐
│ CopilotMCPTester                │
│ (tests/utils/copilot_tester.py) │
│                                 │
│ - ask_tool_selection()          │
│ - validate_tool_args()          │
│ - validate_tool_result()        │
│ - interpret_result()            │
└────────────┬────────────────────┘
             │ calls
             v
┌─────────────────────────────────┐
│ GitHub Copilot (via LiteLLM)    │
│ - Tool selection                │
│ - Result interpretation         │
└────────────┬────────────────────┘
             │ tests
             v
┌─────────────────────────────────┐
│ BMAD MCP Server                 │
│ (src/mcp_server.py)             │
│ - list_tools()                  │
│ - list_prompts()                │
│ - list_resources()              │
└─────────────────────────────────┘
```

### CopilotMCPTester Utility

**Location:** `tests/utils/copilot_tester.py`

Reusable class for testing MCP interactions:

```python
from tests.utils.copilot_tester import CopilotMCPTester

tester = CopilotMCPTester()

# Ask Copilot to select appropriate MCP tool
selection = await tester.ask_tool_selection(
    task="List all BMAD agents",
    available_tools=["list_prompts", "list_tools"]
)
# Returns: {"tool": "list_prompts", "args": {}, "confidence": 0.95, ...}

# Validate tool arguments
tester.validate_tool_args(selection["args"], arg_schema)

# Validate tool results
tester.validate_tool_result(result, result_schema)

# Interpret results
interpretation = await tester.interpret_result(
    task="List all BMAD agents",
    tool_result=result
)
# Returns: {"satisfied": true, "next_action": "answer_user", ...}
```

### First-Time Setup

1. **Install dependencies:**
   ```bash
   pip install -e ".[copilot-test]"
   ```

2. **Run a test that uses Copilot:**
   ```bash
   pytest tests/integration/test_mcp_prompts.py::TestMCPPromptsWithCopilot::test_copilot_selects_list_tools -v
   ```

3. **Authenticate when prompted:**
   - Visit https://github.com/login/device
   - Enter the displayed code
   - Approve the authentication

4. **Token is cached** at `~/.config/litellm/github_copilot/` for future use

### Testing New MCP Tools

When implementing a new MCP tool:

1. **Define schemas** in your test:
```python
tool_schemas = {
    "my_new_tool": {
        "args": {"type": "object", "properties": {...}},
        "result": {"type": "object", "properties": {...}}
    }
}
```

2. **Write integration test:**
```python
@pytest.mark.integration
@pytest.mark.asyncio
async def test_my_new_tool(self, copilot_tester, mcp_server):
    selection = await copilot_tester.ask_tool_selection(
        task="Use my new tool",
        available_tools=["my_new_tool", "other_tool"]
    )
    assert selection["tool"] == "my_new_tool"
```

3. **Run and debug:**
```bash
# Automated test
pytest tests/integration/test_mcp_prompts.py::test_my_new_tool -v

# Manual debugging
pytest -m manual -v -s
```

---

## Test Types

### Unit Tests (`unit/`)

- **Purpose:** Test individual components in isolation
- **Dependencies:** None beyond pytest
- **Speed:** Fast (< 1s each)
- **Examples:**
  - `test_file_reader.py` - File reading and path validation
  - `test_manifest_loader.py` - CSV parsing and manifest loading

### Integration Tests (`integration/`)

- **Purpose:** Test interactions between components and external services
- **Dependencies:** `litellm`, GitHub Copilot authentication
- **Speed:** Slower (API calls to Copilot)
- **Marker:** `@pytest.mark.integration`
- **Examples:**
  - `test_mcp_prompts.py` - MCP tool selection and execution via Copilot

**Available Integration Tests:**
- `test_copilot_selects_list_tools` - Verifies tool selection for list_tools
- `test_copilot_selects_list_prompts` - Verifies tool selection for prompts
- `test_copilot_interprets_empty_results` - Tests placeholder handling
- `test_full_copilot_mcp_workflow` - End-to-end workflow test

### Manual Tests (`manual/`)

- **Purpose:** Interactive testing and debugging with verbose output
- **Dependencies:** Same as integration tests
- **Marker:** `@pytest.mark.manual`
- **Usage:** `pytest -m manual -v -s`
- **Examples:**
  - `copilot_mcp.py` - Interactive Copilot+MCP workflow testing

**Note:** Manual tests are automatically excluded from regular `pytest` runs.

---

## Writing New Tests

### Unit Test Example

```python
# tests/unit/test_my_component.py
import pytest
from src.my_component import MyComponent

class TestMyComponent:
    @pytest.fixture
    def component(self):
        return MyComponent()
    
    def test_basic_functionality(self, component):
        result = component.do_something()
        assert result == expected_value
```

### Integration Test with Copilot

```python
# tests/integration/test_my_mcp_feature.py
import pytest
from tests.utils.copilot_tester import CopilotMCPTester, skip_if_no_litellm

@pytest.mark.integration
@skip_if_no_litellm()
class TestMyMCPFeature:
    @pytest.fixture
    def copilot_tester(self):
        return CopilotMCPTester()
    
    @pytest.mark.asyncio
    async def test_my_feature(self, copilot_tester):
        selection = await copilot_tester.ask_tool_selection(
            task="My task description",
            available_tools=["tool1", "tool2"]
        )
        assert selection["tool"] == "expected_tool"
```

### Manual Test Example

```python
# tests/manual/my_manual_test.py
import pytest
from tests.utils.copilot_tester import CopilotMCPTester, skip_if_no_litellm

@pytest.mark.manual
@pytest.mark.asyncio
@skip_if_no_litellm()
async def test_my_manual_workflow():
    """Interactive test with verbose output for debugging."""
    tester = CopilotMCPTester()
    
    print("🧪 Testing my workflow...")
    # ... test implementation with print statements
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -e ".[dev,copilot-test]"
      - name: Run tests
        run: |
          # Run all non-manual tests with coverage
          pytest -m "not manual" --cov=src --cov-report=xml -v
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Troubleshooting

### Import Errors

If you see import errors, ensure you're in the project root with venv active:

```bash
cd /path/to/bmad-mcp-server
source venv/bin/activate
pip install -e ".[dev,copilot-test]"
```

### "litellm not installed"

Tests are automatically skipped if litellm is missing. To run them:

```bash
pip install -e ".[copilot-test]"
```

### Copilot Authentication Issues

Clear cached tokens and re-authenticate:

```bash
rm -rf ~/.config/litellm/github_copilot/
pytest tests/integration/test_mcp_prompts.py -k test_copilot_selects_list_tools -v
```

### Async Test Warnings

Ensure `pytest-asyncio` is installed:

```bash
pip install pytest-asyncio
```

### Low Confidence Scores

If Copilot confidence is low:
- Check task description clarity
- Verify available_tools list is accurate
- Add more context parameter to `ask_tool_selection()`
- Review tool naming conventions

---

## Test Markers

Available markers (defined in `pyproject.toml` and `tests/conftest.py`):

- `@pytest.mark.manual` - Interactive tests with verbose output (excluded by default)
- `@pytest.mark.integration` - Integration tests (may be slow or require auth)
- `@pytest.mark.asyncio` - Async tests (auto-configured by pytest-asyncio)

---

## Best Practices

1. **Fixtures over setup/teardown** - Use pytest fixtures for test setup
2. **Descriptive test names** - `test_copilot_selects_correct_tool_for_list_agents`
3. **One assertion concept per test** - Test one thing at a time
4. **Mock external dependencies** - Use mocks for external APIs in unit tests
5. **Document test purpose** - Add docstrings explaining what is being tested
6. **Use skip decorators** - Skip tests gracefully when dependencies are missing
7. **Test tool selection separately** - One test per MCP tool
8. **Test interpretation separately** - Different test for result interpretation

---

## Examples

```bash
# Development: Run all tests with coverage
pytest --cov=src --cov-report=html -v

# Development: Run specific test during debugging
pytest tests/integration/test_mcp_prompts.py::TestMCPPromptsWithCopilot::test_copilot_selects_list_tools -v -s

# Manual testing: Interactive test with full output
pytest -m manual -v -s

# CI: Run all automated tests with coverage
pytest -m "not manual" --cov=src --cov-report=xml -v

# Quick check: Unit tests only
pytest tests/unit/ -q
```

---

## Related Documentation

- [Main README](../README.md) - Project overview
- [Architecture](../docs/architecture.md) - System design
- [Manual Test Guide](manual/README_copilot_mcp.md) - Interactive testing details

---

## Contributing

When adding new tests:

1. Follow existing patterns and structure
2. Add appropriate fixtures and markers
3. Document what you're testing with docstrings
4. Run full test suite before committing: `pytest`
5. Update this README if adding new test categories
6. For Copilot tests, update schemas in fixtures

---

## Configuration Files

- `pyproject.toml` - Pytest configuration, markers, test paths
- `tests/conftest.py` - Pytest fixtures and marker registration
- `.coveragerc` (if exists) - Coverage configuration

---

**Need help?** Check the troubleshooting section above or see individual test files for examples.
