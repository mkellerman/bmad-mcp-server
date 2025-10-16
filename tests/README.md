# Testing Guide for BMad MCP Server

This guide explains the testing structure and how to contribute tests to the BMad MCP Server project.

## 🏗️ Test Structure

The test suite is organized into three main categories:

```
tests/
├── conftest.py              # Shared pytest fixtures
├── unit/                    # Fast, isolated component tests
│   ├── test_lean_loading.py
│   └── test_new_tools.py
├── integration/             # MCP protocol and tool integration tests
│   ├── test_bmad_agent.py
│   ├── test_bmad_file.py
│   ├── test_bmad_master.py
│   ├── test_bmad_task.py
│   ├── test_bmad_workflow.py
│   └── test_server.py
└── fixtures/                # Shared test data and helpers
```

### Test Categories

- **Unit Tests** (`tests/unit/`): Test individual functions and classes in isolation. These should be fast (< 1s each) and have no external dependencies.
  
- **Integration Tests** (`tests/integration/`): Test MCP tool handlers, server initialization, and embedded resource loading. These verify that components work together correctly.

- **Fixtures** (`tests/fixtures/`): Reusable test data, mock objects, and helper functions shared across tests.

## 🚀 Running Tests

### Run All Tests
```bash
pytest
```

### Run Specific Test Categories
```bash
# Run only unit tests
pytest tests/unit/

# Run only integration tests
pytest tests/integration/

# Run a specific test file
pytest tests/unit/test_lean_loading.py

# Run a specific test function
pytest tests/unit/test_lean_loading.py::test_specific_function
```

### Run with Coverage
```bash
# Generate coverage report in terminal
pytest --cov=bmad_mcp

# Generate HTML coverage report
pytest --cov=bmad_mcp --cov-report=html
# Open htmlcov/index.html in your browser
```

### Run Tests by Marker
```bash
# Run only unit tests (using marker)
pytest -m unit

# Run only integration tests
pytest -m integration

# Skip slow tests
pytest -m "not slow"
```

## ✍️ Writing Tests

### Basic Test Structure

```python
"""Test module for [component name]."""

import pytest
from bmad_mcp.resources import load_embedded_file


def test_load_config_file():
    """Test that config file can be loaded."""
    config = load_embedded_file("core/config.yaml")
    assert config is not None
    assert len(config) > 0


@pytest.mark.integration
def test_bmad_tool_returns_valid_json():
    """Test that bmad tool returns valid JSON."""
    from bmad_mcp.server import bmad_master
    import json
    
    result = bmad_master()
    data = json.loads(result)
    
    assert "instructions" in data
    assert len(data["instructions"]) > 0
```

### Using Fixtures

```python
def test_with_sample_config(sample_config):
    """Test using the shared sample_config fixture."""
    assert sample_config["user_name"] == "TestUser"
    assert sample_config["communication_language"] == "English"
```

### Marking Tests

```python
@pytest.mark.unit
def test_isolated_function():
    """Fast unit test."""
    pass


@pytest.mark.integration
def test_mcp_tool_integration():
    """Integration test for MCP tool."""
    pass


@pytest.mark.slow
def test_full_workflow_execution():
    """Slow end-to-end test."""
    pass
```

## 📋 Test Requirements

### Coverage Goals
- **Minimum coverage**: 60% (enforced by CI)
- **Target coverage**: 80% for core functionality
- New code should include tests

### What to Test

**Must Test:**
- ✅ MCP tool signatures and return types
- ✅ Embedded resource loading
- ✅ Agent manifest parsing
- ✅ Workflow YAML parsing
- ✅ Core business logic

**Nice to Test:**
- ✅ Edge cases and error handling
- ✅ Configuration validation
- ✅ Prompt generation
- ✅ File path resolution

**Don't Need to Test:**
- ❌ Third-party library internals
- ❌ Trivial getters/setters
- ❌ Generated code

## 🔧 Common Testing Patterns

### Testing Embedded Resources

```python
def test_embedded_agent_file_exists():
    """Verify agent file can be loaded."""
    from bmad_mcp.resources import load_embedded_file
    
    content = load_embedded_file("core/agents/bmad-master.md")
    assert "BMad Master" in content
```

### Testing MCP Tools

```python
def test_bmad_agent_tool():
    """Test bmad_agent tool returns expected structure."""
    from bmad_mcp.server import bmad_agent
    import json
    
    result = bmad_agent(name="analyst")
    data = json.loads(result)
    
    assert "instructions" in data
    assert "files" in data
```

### Testing Error Conditions

```python
def test_invalid_agent_name_raises_error():
    """Test that invalid agent name is handled gracefully."""
    from bmad_mcp.server import bmad_agent
    
    result = bmad_agent(name="nonexistent")
    assert "not found" in result.lower() or "error" in result.lower()
```

## 🤝 Contributing Tests

When contributing new features or fixes:

1. **Add tests for new code**: Every new function should have at least one test
2. **Update existing tests**: If you modify behavior, update relevant tests
3. **Run tests locally**: Ensure all tests pass before submitting PR
4. **Check coverage**: Aim to maintain or improve coverage percentage

### Test Checklist
- [ ] Tests run successfully with `pytest`
- [ ] Coverage meets minimum threshold (60%)
- [ ] Tests are properly categorized (unit vs integration)
- [ ] Tests use appropriate markers
- [ ] Test names clearly describe what's being tested
- [ ] Docstrings explain test purpose

## 🐛 Debugging Tests

### Verbose Output
```bash
pytest -vv
```

### Stop at First Failure
```bash
pytest -x
```

### Show Print Statements
```bash
pytest -s
```

### Run Last Failed Tests
```bash
pytest --lf
```

### Drop into Debugger on Failure
```bash
pytest --pdb
```

## 📚 Additional Resources

- [pytest Documentation](https://docs.pytest.org/)
- [pytest-cov Documentation](https://pytest-cov.readthedocs.io/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)

## ❓ Questions?

If you have questions about testing:
- Open a [Discussion](https://github.com/mkellerman/bmad-mcp-server/discussions)
- Check existing [Issues](https://github.com/mkellerman/bmad-mcp-server/issues)
- Ask in your PR and maintainers will help!
