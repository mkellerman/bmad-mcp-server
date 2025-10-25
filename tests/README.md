# BMAD MCP Server - Test Suite# BMAD MCP Server - Test Suite

Comprehensive test suite with unit tests (Jest) and E2E tests (Playwright + LLM).## Overview

## Quick StartComprehensive test suite for the BMAD MCP Server featuring:

- **Unit Tests (Jest):** 66 passing tests with 90.28% coverage

### Unit Tests- **E2E Tests (Playwright + LLM):** YAML-based LLM-powered integration tests

````bash

npm test                    # Run all unit tests## Test Coverage

npm test -- --coverage      # With coverage report

```- **90.28%** overall code coverage

- **96.10%** utils coverage (FileReader, ManifestLoader)

### E2E Tests- **88.81%** tools coverage (UnifiedBMADTool)



**1. Start LiteLLM Proxy**## Test Structure

```bash

docker-compose up -d        # Start in background```

npm run litellm:docker:health  # Verify healthytests/

```├── e2e/                          # LLM-powered E2E tests (NEW!)

│   ├── framework/                # Test execution engine

**2. Run Tests**│   │   ├── llm-client.ts         # LiteLLM proxy client

```bash│   │   ├── yaml-loader.ts        # YAML test parser

npm run test:e2e           # Run all E2E tests│   │   ├── validators.ts         # Validation strategies

npm run test:e2e:ui        # Interactive UI mode│   │   └── runner.spec.ts        # Playwright test runner

npm run test:report        # View HTML report│   └── test-cases/               # YAML test definitions (QA writes these!)

```│       ├── agent-loading.yaml    # Agent loading tests

│       ├── discovery-commands.yaml # Discovery command tests

**3. Stop Proxy**│       └── error-handling.yaml   # Error handling tests

```bash├── support/

docker-compose down        # Stop and remove container│   └── litellm-config.yaml       # LiteLLM proxy configuration

```├── helpers/

│   └── test-fixtures.ts          # Test utilities and fixtures

> **Authentication**: Uses GitHub Copilot via `~/.config/litellm` volume mount. No API keys needed!├── unit/

│   ├── file-reader.test.ts       # FileReader tests (19 tests) ✓

## Test Coverage│   ├── manifest-loader.test.ts   # ManifestLoader tests (18 tests) ✓

│   └── unified-tool.test.ts      # UnifiedBMADTool tests (29 tests) ✓

Current status: **90.33% coverage** (91/91 tests passing)└── integration/

    └── bmad-integration.test.ts  # Integration tests (WIP)

| Component | Coverage | Tests |```

|-----------|----------|-------|

| Utils | 96.10% | 19 ✓ |## Running Tests

| Tools | 88.81% | 29 ✓ |

| Server | 85.71% | 43 ✓ |### Unit Tests (Jest)

| **Total** | **90.33%** | **91 ✓** |

```bash

## Test Structure# Run all unit tests

npm test

````

tests/# Run with coverage

├── unit/ # Jest unit testsnpm test -- --coverage

│ ├── file-reader.test.ts # 19 tests ✓

│ ├── manifest-loader.test.ts # 18 tests ✓# Run specific test file

│ └── unified-tool.test.ts # 29 tests ✓npm test -- tests/unit/file-reader.test.ts

├── e2e/ # Playwright E2E tests

│ ├── framework/ # Test engine# Run in watch mode

│ │ ├── llm-client.ts # LiteLLM clientnpm test -- --watch

│ │ ├── yaml-loader.ts # Test parser```

│ │ ├── validators.ts # Validation logic

│ │ └── runner.spec.ts # Test runner### E2E Tests (Playwright + LLM)

│ └── test-cases/ # YAML test definitions

│ ├── agent-loading.yaml**Prerequisites:** LiteLLM proxy must be running

│ ├── discovery-commands.yaml

│ └── error-handling.yaml```bash

└── support/# 1. Start LiteLLM proxy (separate terminal)

    └── litellm-config.yaml     # LiteLLM config (gpt-4.1)npm run litellm:start

````

# 2. Run E2E tests

## Writing E2E Testsnpm run test:e2e              # Run all E2E tests

npm run test:e2e:ui           # Run with Playwright UI

Create a YAML file in `tests/e2e/test-cases/`:npm run test:e2e:headed       # Run in headed mode

npm run test:e2e:debug        # Debug mode

```yamlnpm run test:report           # View test report

test_suite: "My Tests"```

description: "Test description"

## E2E Test Framework (NEW!)

config:

  llm_model: "gpt-4.1"### Architecture

  temperature: 0.1

  timeout: 30000The E2E framework uses **real LLMs** to test the BMAD MCP server:



tests:1. **QA writes tests in YAML** (no coding required)

  - id: "test-001"2. **Framework sends prompts to LLM** (via LiteLLM proxy)

    name: "Test name"3. **LLM calls MCP tools** (bmad agent loading, workflows)

    prompt: |4. **Validators check responses** (contains, regex, LLM judge)

      You have a bmad tool.

      User request: "Load analyst agent"### Writing E2E Tests



    expectations:Create YAML files in `tests/e2e/test-cases/`:

      - type: "contains"

        value: "analyst"```yaml

        case_sensitive: falsetest_suite: "My Test Suite"

      description: "What this tests"

      - type: "response_length"

        min: 10config:

        max: 1000  llm_model: "gpt-4"

```  temperature: 0.1

  timeout: 30000

### Available Validators  judge_model: "claude-3-5-sonnet"

  judge_threshold: 0.8

| Type | Description | Example |

|------|-------------|---------|tests:

| `contains` | String matching | `value: "analyst"` |  - id: "test-001"

| `not_contains` | String absence | `value: "error"` |    name: "My test case"

| `regex` | Pattern matching | `pattern: "bmad.*"` |    prompt: |

| `response_length` | Length bounds | `min: 10, max: 500` |      You have a bmad tool.

      User: "Load the analyst agent"

> **Note**: LLM Judge validator is experimental (see `LLM-JUDGE-WIP.md`)

    expectations:

## Docker Commands      - type: "contains"

        value: "Mary"

```bash

# Start proxy      - type: "llm_judge"

docker-compose up -d        criteria: |

npm run litellm:docker:start          Check if response introduces Mary

          and shows a clear menu

# Check health        threshold: 0.85

npm run litellm:docker:health```

curl http://localhost:4000/health/readiness

### Validation Types

# View logs

docker logs -f litellm-proxy| Type | Description | Example |

npm run litellm:docker:logs|------|-------------|---------|

| `contains` | String must be in response | `value: "Mary"` |

# Stop proxy| `not_contains` | String must NOT be in response | `value: "error"` |

docker-compose down| `regex` | Regex pattern match | `pattern: "\\*\\w+"` |

npm run litellm:docker:stop| `response_length` | Length within range | `min: 100, max: 5000` |

```| `llm_judge` | LLM evaluates quality | `criteria: "Clear menu"` |



## Troubleshooting### LLM Judge



**Proxy not running:****LLM Judge** uses AI to evaluate response quality:

```bash- Sends response + criteria to LLM (claude-3-5-sonnet)

docker ps | grep litellm        # Check if container running- Returns pass/fail + confidence score (0.0-1.0)

docker logs litellm-proxy       # View logs- Threshold-based validation (default 0.8)

docker-compose restart          # Restart container- Perfect for qualitative checks (tone, clarity, completeness)

````

### Setup E2E Tests

**Port 4000 in use:**

````bash### Quick Start (Docker - Recommended)

lsof -i :4000                   # Find process using port

docker-compose down && docker-compose up -d1. **Start LiteLLM proxy:**

```   ```bash

   docker-compose up -d

**Tests timeout:**   # or

- Increase `timeout` in YAML config   npm run litellm:docker:start

- Check LiteLLM logs for API errors   ```

- Verify GitHub Copilot authentication

2. **Run tests:**

## CI/CD   ```bash

   npm run test:e2e

E2E tests are ready for CI/CD but require:   ```

- Docker environment

- GitHub Copilot authentication setup> **Note**: Authentication handled via `~/.config/litellm` volume mount. No API keys needed!

- Dedicated test API key (optional)

See `tests/DOCKER-SETUP.md` for detailed setup.

## Documentation

## Test Categories

- `LLM-JUDGE-WIP.md` - LLM Judge validation (experimental, disabled)

- `docker-compose.yml` - LiteLLM proxy configuration### Unit Tests

- `playwright.config.ts` - Playwright settings

#### FileReader Tests (19 tests)

## Models- ✅ Constructor and initialization

- ✅ File reading (absolute/relative paths)

Current setup uses:- ✅ Path traversal protection

- **gpt-4.1** (github_copilot/gpt-4.1-2025-04-14)- ✅ Symlink handling

- Authentication via `~/.config/litellm` volume mount- ✅ Permission error handling

- No API keys required- ✅ File existence checks

- ✅ Path validation

To add other models, edit `tests/support/litellm-config.yaml`

#### ManifestLoader Tests (18 tests)
- ✅ Constructor with multiple directory structures
- ✅ Agent manifest loading and parsing
- ✅ Workflow manifest loading
- ✅ Task manifest loading
- ✅ Empty row filtering
- ✅ Malformed CSV handling
- ✅ Agent/workflow lookup by name

#### UnifiedBMADTool Tests (29 tests)
- ✅ Tool initialization
- ✅ Empty command handling (default agent)
- ✅ Agent loading by name
- ✅ Workflow execution with `*` prefix
- ✅ Discovery commands (`*list-agents`, `*list-workflows`, `*list-tasks`, `*help`)
- ✅ Input validation (dangerous characters, length, patterns)
- ✅ Fuzzy matching and suggestions
- ✅ Error handling and recovery
- ✅ Edge cases (empty manifests, missing files)

### Integration Tests (WIP)
- End-to-end agent loading
- End-to-end workflow execution
- Discovery workflows
- Error handling integration
- Concurrent operations

## Test Fixtures

The test suite uses a comprehensive fixture system that creates temporary test environments with:

- Proper BMAD directory structure (`src/bmad/_cfg`)
- Sample manifests (agents, workflows, tasks)
- Sample agent and workflow files
- Automatic cleanup after tests

### Example Usage

```typescript
import { createTestFixture, createBMADStructure, createAgentManifest } from '../helpers/test-fixtures';

const fixture = createTestFixture();
createBMADStructure(fixture.tmpDir);
createAgentManifest(fixture.tmpDir);

// ... run tests ...

fixture.cleanup(); // Automatic cleanup
````

## Test Configuration

### Jest Configuration (`jest.config.cjs`)

- **Preset**: `ts-jest/presets/default-esm` for ES module support
- **Environment**: Node.js
- **Coverage**: HTML, LCOV, and text reports
- **Module Resolution**: Supports `.js` imports from `.ts` files
- **Target**: ESNext for modern JavaScript features

### Key Features

- ✅ ES Module support
- ✅ TypeScript compilation
- ✅ Coverage collection
- ✅ Parallel test execution
- ✅ Isolated test environments

## Coverage Details

### Utils (96.10%)

| File               | Statements | Branches | Functions | Lines  |
| ------------------ | ---------- | -------- | --------- | ------ |
| file-reader.ts     | 92.85%     | 88.88%   | 100%      | 92.85% |
| manifest-loader.ts | 100%       | 100%     | 100%      | 100%   |

### Tools (88.81%)

| File            | Statements | Branches | Functions | Lines  |
| --------------- | ---------- | -------- | --------- | ------ |
| unified-tool.ts | 88.81%     | 66.95%   | 86.66%    | 88.88% |

## What's Tested

### Security Features

- ✅ Path traversal prevention
- ✅ Dangerous character detection
- ✅ Input validation and sanitization
- ✅ Permission error handling

### Core Functionality

- ✅ Agent discovery and loading
- ✅ Workflow discovery and execution
- ✅ Manifest parsing (CSV)
- ✅ File reading with security
- ✅ Error messages and suggestions

### Edge Cases

- ✅ Empty manifests
- ✅ Missing files
- ✅ Malformed CSV
- ✅ Invalid names
- ✅ Path traversal attempts
- ✅ Symlink handling

## Known Limitations

- Server.ts tests are WIP due to import.meta.url compatibility with jest
- Integration tests for BMADMCPServer are partially complete
- Some edge cases in workflow context resolution have lower coverage

## Future Improvements

1. Complete integration tests for BMADMCPServer
2. Add E2E tests for MCP protocol communication
3. Add performance benchmarks
4. Add mutation testing
5. Increase branch coverage in unified-tool.ts to 85%+

## CI/CD Integration

Tests are designed to run in CI/CD environments:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: npm test

- name: Upload Coverage
  run: npm test -- --coverage
```

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure >90% coverage for new code
3. Run full test suite before committing
4. Update this README if adding new test categories

## Test Philosophy

- **Fast**: Tests run in under 3 seconds
- **Isolated**: Each test uses its own temporary environment
- **Comprehensive**: Cover happy paths, edge cases, and error conditions
- **Maintainable**: Clear test names and good fixtures
- **Reliable**: No flaky tests, deterministic outcomes
