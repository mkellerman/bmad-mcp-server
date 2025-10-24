# BMAD MCP Server - Test Suite

Complete test coverage for production-ready releases.

## Quick Start

```bash
# Run all tests
./tests/run_all_tests.sh all

# Run by category
pytest tests/unit/           # Unit tests
pytest tests/integration/    # Integration tests
pytest -m e2e                # E2E tests
```

## Test Structure

```
tests/
├── unit/              # Fast, isolated tests
├── integration/       # Component integration tests
├── e2e/              # End-to-end workflow tests
└── utils/            # Test utilities & frameworks
```

## Writing Tests

### Unit/Integration Tests
Standard pytest syntax:
```python
def test_my_feature():
    result = my_function()
    assert result == expected
```

### E2E Tests (Declarative Framework)
Simple "command → validation" pattern:
```python
from tests.utils.e2e_framework import E2ETest

test = E2ETest("My test")
test.step("analyst", contains=["analyst", "Mary"])
test.step("*workflow-status", contains=["workflow"])
result = await test.run(mcp_server)
assert result
```

**Validation options:**
- `contains=["text"]` - Must contain strings
- `not_contains=["text"]` - Must NOT contain strings
- `min_length=100` - Minimum response length
- `description="..."` - Human-readable description

**Helper functions:**
```python
# Simplest syntax
await quick_test(mcp_server, [
    ("analyst", ["Mary", "analyst"]),
    ("*workflow-status", ["workflow"])
])

# Just run commands
await test_sequence(mcp_server, ["analyst", "pm", "dev"])

# Method chaining
test = (E2ETest("Test")
    .step("analyst", contains=["analyst"])
    .step("pm", contains=["product"]))
```

## Test Categories

| Marker | Description | Count |
|--------|-------------|-------|
| `@pytest.mark.e2e` | E2E with real API | 30+ |
| `@pytest.mark.integration` | Integration tests | 20+ |
| `@pytest.mark.security` | Security validation | 15 |
| `@pytest.mark.performance` | Performance benchmarks | 12+ |
| `@pytest.mark.manual` | Manual/interactive | 3 |

## Running Tests

```bash
# By marker
pytest -m e2e -v
pytest -m security -v

# By directory
pytest tests/unit/ -v
pytest tests/integration/ -v

# Specific test
pytest tests/e2e/test_declarative_examples.py::TestDeclarativeExamples::test_example_1 -v

# With coverage
pytest --cov=src --cov-report=html

# Fast tests only (skip E2E)
./tests/run_all_tests.sh fast
```

## Test Script Options

```bash
./tests/run_all_tests.sh [mode]

Modes:
  unit          - Unit tests only
  integration   - Integration tests only
  e2e           - E2E tests only
  security      - Security tests only
  performance   - Performance benchmarks
  fast          - Unit + integration (no E2E)
  coverage      - All tests with coverage report
  all           - All tests (default)
```

## Examples

See `tests/e2e/test_declarative_examples.py` for 10 complete examples.

## Requirements

**Core:**
- pytest >= 8.4.2
- pytest-asyncio

**Optional (for E2E tests):**
- litellm (Copilot API integration)
- mcp (MCP protocol)

## Test Results

Latest run: **63/63 unit tests passing** (100%)

Total coverage:
- Unit: 63 tests
- Integration: 20+ tests
- E2E: 30+ tests
- Security: 15 tests
- Performance: 12+ tests

**Total: 150+ tests**
