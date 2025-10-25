# BMAD MCP Server - Test Suite

Comprehensive test suite: **131 tests passing**, 61.62% coverage.

## Quick Start

```bash
npm test                # Run all unit/integration/e2e tests
npm test -- --coverage  # With coverage report
npm run test:llm        # Run LLM-powered E2E tests (requires setup)
```

## Test Structure

```
tests/
├── unit/                    # 7 unit test files
├── integration/             # 5 integration test files
├── e2e/                     # 2 standard E2E tests
│   ├── framework/           # LLM test execution engine
│   │   ├── llm-client.ts    # LiteLLM proxy client
│   │   ├── yaml-loader.ts   # YAML test parser
│   │   ├── validators.ts    # Validation strategies
│   │   └── runner.spec.ts   # LLM test runner (9 tests)
│   └── test-cases/          # YAML test definitions
│       ├── agent-loading.yaml
│       ├── discovery-commands.yaml
│       └── error-handling.yaml
└── support/
    ├── litellm-config.yaml  # LiteLLM proxy config
    └── mcp-client-fixture.ts # MCP client fixture
```

## Running Tests

### Standard Tests (Vitest)

```bash
npm test                     # Run all standard tests (131 tests)
npm run test:watch           # Watch mode
npm run test:ui              # Interactive UI
npm run test:coverage        # Coverage report
```

### LLM-Powered E2E Tests

Requires one-time setup. See `LLM-SETUP.md` for detailed instructions.

**Quick start:**

```bash
npm run litellm:docker:start   # Start LiteLLM proxy
npm run test:llm               # Run LLM tests (9 tests)
npm run litellm:docker:stop    # Stop proxy when done
```

## Writing LLM E2E Tests

Create YAML files in `tests/e2e/test-cases/`:

```yaml
test_suite: "My Test Suite"
description: "What this tests"

config:
  llm_model: "gpt-4.1"
  temperature: 0.1
  timeout: 30000

tests:
  - id: "test-001"

tests:
  - id: "test-001"
    name: "Test name"
    prompt: |
      You have a bmad tool.
      User request: "Load analyst agent"
    
    expectations:
      - type: "contains"
        value: "analyst"
        case_sensitive: false
      
      - type: "response_length"
        min: 100
        max: 5000
```

### Validation Types

| Type | Description | Example |
|------|-------------|---------|
| `contains` | String must be in response | `value: "Mary"` |
| `not_contains` | String must NOT be in response | `value: "error"` |
| `regex` | Regex pattern match | `pattern: "\\*\\w+"` |
| `response_length` | Length within range | `min: 100, max: 5000` |

## Coverage Report

```
File                    Statements  Branches  Functions  Lines
utils/
  file-reader.ts        91.09%      74.19%    100%       91.09%
  manifest-loader.ts    100%        100%      100%       100%
tools/
  unified-tool.ts       64.84%      42.42%    78.26%     64.88%
server.ts               17.69%      0%        33.33%     17.69%
-------------------------------------------------------------
Total                   61.62%      41.20%    71.87%     61.73%
```

## Troubleshooting

**LLM tests fail with proxy error:**
```bash
docker ps | grep litellm       # Check if proxy is running
npm run litellm:docker:logs    # View logs
npm run litellm:docker:health  # Check health
```

**Proxy needs authentication:**
Follow the one-time setup steps above to authenticate with GitHub for Copilot access.

**Port 4000 in use:**
```bash
lsof -i :4000                  # Find process using port
npm run litellm:docker:stop    # Stop proxy
```

