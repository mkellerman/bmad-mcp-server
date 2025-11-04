# BMAD MCP Server - Test Suite# BMAD MCP Server - Test Suite

Comprehensive testing framework for the BMAD MCP Server with proper test categorization.Comprehensive test suite with unit, integration, E2E, and LLM tests.

## 📁 Test Structure## Quick Start

```````bash

tests/npm test                # Run unit + integration tests (483 tests)

├── unit/                           # Pure unit tests (isolated, fast, no I/O)npm run test:e2e        # Run E2E tests (21 tests, no LLM)

│   ├── utils/                      # Utility function testsnpm run test:llm        # Run LLM integration tests (66 tests, requires LiteLLM)

│   │   ├── path-resolution/        # Path finding & resolutionnpm run test:all        # Run all tests

│   │   ├── file-operations/        # File reading & YAML parsing```

│   │   ├── validation/             # Validators & XML validation

│   │   └── git/                    # Git source resolution## Test Structure

│   ├── services/                   # Service layer tests

│   ├── tools/                      # MCP tool tests```

│   └── helpers/                    # Test helper functionstests/

│├── unit/                    # Fast, isolated tests (433 tests)

├── integration/                    # Component integration (with I/O, external deps)│   └── *.test.ts

│   ├── mcp-protocol/               # MCP client ↔ server tests├── integration/             # Multi-component tests (50 tests)

│   ├── remote-api/                 # External API integration (GitHub, etc.)│   └── *.test.ts

│   └── file-system/                # File system integration tests├── e2e/                     # End-to-end tests WITHOUT LLM (21 tests)

││   ├── bmad-tool.spec.ts

├── e2e/                            # End-to-end (LLM + MCP + real workflows)│   ├── dynamic-agent-loading.spec.ts

│   ├── workflows/                  # Complete workflow validation│   ├── remote-discovery.spec.ts

│   ├── conversations/              # Multi-turn LLM conversations│   └── server-health.spec.ts

│   └── remote-integration/         # LLM + remote discovery├── llm/                     # LLM integration tests (66 tests, requires LiteLLM)

││   ├── framework/           # YAML test execution engine

├── framework/                      # Test framework itself│   │   ├── llm-client.ts    # LiteLLM proxy client

│   ├── core/                       # Core testing utilities│   │   ├── yaml-loader.ts   # YAML test parser

│   ├── reporters/                  # Custom test reporters│   │   ├── validators.ts    # Validation strategies

│   └── setup/                      # Global test setup│   │   └── runner.spec.ts   # YAML test runner (43 tests)

││   ├── test-cases/          # YAML test definitions

├── examples/                       # Usage examples (not run in CI)│   │   ├── agent-loading.yaml

├── support/                        # Shared test utilities│   │   ├── discovery-commands.yaml

└── helpers/                        # Test helper functions│   │   ├── error-handling.yaml

```│   │   └── workflow-execution.yaml

│   └── *.spec.ts            # Direct TypeScript LLM tests (23 tests)

## 🧪 Test Categories Explained├── framework/               # Test utilities

│   ├── core/                # Reporters, types, test context

### Unit Tests (`tests/unit/`)│   └── helpers/             # MCP client, file helpers

└── support/

**What:** Pure unit tests that validate individual functions/modules in isolation.    ├── litellm-config.yaml  # LiteLLM proxy config

    └── test-setup.ts        # Automatic test context tracking

**Characteristics:**```

- ⚡ Fast (< 5s total)

- 🔒 Isolated (no I/O, no network, no file system)## Test Categories

- 🎯 Focused (one function/module per test)

- ✅ Always passing in CI| Category | Count | Description | Speed | Requirements |

|----------|-------|-------------|-------|--------------|

**Run with:**| **Unit** | 433 | Fast, isolated, mocked | ~5s | None |

```bash| **Integration** | 50 | Multi-component | ~10s | None |

npm run test:unit| **E2E** | 21 | Full system, no LLM | ~30s | External services |

```| **LLM** | 66 | LLM behavior validation | ~2min | LiteLLM proxy |



**Examples:**## Running Tests

- Path resolution logic

- YAML parsing### Unit + Integration (Default)

- Validation functions

- String utilities```bash

npm test                     # Run all unit/integration tests

---npm run test:watch           # Watch mode

npm run test:ui              # Interactive UI

### Integration Tests (`tests/integration/`)npm run test:coverage        # Coverage report

```

**What:** Tests that validate how components work together, including real I/O.

### End-to-End Tests

**Characteristics:**

- 🐢 Moderate speed (5-30s)```bash

- 🌐 Real dependencies (file system, APIs, MCP protocol)npm run test:e2e             # MCP server tests (no LLM)

- 📦 Multi-component (2+ modules interacting)npm run test:e2e -- tests/e2e/bmad-tool.spec.ts  # Specific file

- ⚠️ May fail due to external factors```



**Subdirectories:**### LLM Integration Tests



#### `mcp-protocol/` - MCP Client ↔ ServerRequires LiteLLM proxy. See [`tests/llm/README.md`](./llm/README.md) for setup.

Tests MCP server functionality via stdio protocol:

- Server health checks```bash

- Tool registrationnpm run test:litellm-start   # Start LiteLLM proxy

- Dynamic agent loading via MCPnpm run test:llm             # Run LLM tests

npm run test:litellm-stop    # Stop proxy when done

**Run with:**```

```bash

npm run test:integration -- tests/integration/mcp-protocol/### All Tests

```

```bash

#### `remote-api/` - External API Integrationnpm run test:all             # Run everything (unit + int + e2e + llm)

Tests integration with external services:```

- GitHub API (repository discovery)

- Remote registry access## Writing Tests

- Network error handling

### Unit Test Example

**Run with:**

```bash```typescript

npm run test:integration -- tests/integration/remote-api/import { describe, it, expect } from 'vitest';

```

describe('MyModule', () => {

#### `file-system/` - File System Integration  it('should do something', () => {

Tests real file system operations:    expect(true).toBe(true);

- BMAD installation detection  });

- Manifest loading from disk});

- Directory traversal```

- v6 inventory scanning

### E2E Test Example

**Run with:**

```bash```typescript

npm run test:integration -- tests/integration/file-system/import { describe, it, expect } from 'vitest';

```import { MCPTestClient } from '../framework/helpers/mcp-client';



---describe('BMAD Tool E2E', () => {

  let client: MCPTestClient;

### E2E Tests (`tests/e2e/`)

  beforeAll(async () => {

**What:** True end-to-end tests with LLM + MCP + complete workflows.    client = new MCPTestClient();

    await client.connect();

**Characteristics:**  });

- 🐌 Slow (30s - 5min)

- 🤖 Requires LiteLLM proxy  it('should list tools', async () => {

- 💰 API costs (uses real LLM)    const tools = await client.listTools();

- 🎭 Real user workflows    expect(tools).toContainEqual(

- 🎯 Business value validation      expect.objectContaining({ name: 'bmad' })

    );

**Prerequisites:**  });

```bash});

# Start LiteLLM proxy (required for E2E tests)```

npm run test:litellm-start

### LLM Test Example

# Check proxy health

npm run test:litellm-health```typescript

import { LLMClient } from '../support/llm-client';

# View proxy logsimport { MCPClientFixture, createMCPClient } from '../support/mcp-client-fixture';

npm run test:litellm-logs

```describe('My LLM Test', () => {

  let llmClient: LLMClient;

**Subdirectories:**  let mcpClient: MCPClientFixture;



#### `workflows/` - Complete Workflow Validation  beforeAll(async () => {

Tests full agent/workflow execution:    llmClient = new LLMClient();

- Agent validation (all agents load correctly)    mcpClient = await createMCPClient();

- Workflow validation (all workflows execute)

- Multi-step workflows    const isHealthy = await llmClient.healthCheck();

    if (!isHealthy) {

**Run with:**      throw new Error('❌ LiteLLM proxy is not running!');

```bash    }

npm run test:e2e -- tests/e2e/workflows/  });

```

  afterAll(async () => {

#### `conversations/` - Multi-Turn LLM Conversations    await mcpClient.cleanup();

Tests LLM conversation flows:  });

- Single agent interactions

- Persona adoption  it('should understand bmad tool', async () => {

- Context preservation across turns    const completion = await llmClient.chat(

      'gpt-4.1',

**Run with:**      [{ role: 'user', content: 'Load the analyst agent using bmad' }],

```bash      { temperature: 0.1 }

npm run test:e2e -- tests/e2e/conversations/    );

```

    expect(completion.choices[0].message.content).toContain('analyst');

#### `remote-integration/` - LLM + Remote Discovery  });

Tests LLM using remote agents:});

- Remote repository discovery via LLM```

- Agent loading from external sources

## Test Reports

**Run with:**

```bashAll tests generate rich reports in `test-results/`:

npm run test:e2e -- tests/e2e/remote-integration/

```- **JSON Report** (`test-results.json`) - Machine-readable results

- **HTML Report** (`test-report.html`) - Human-friendly interactive report

**Stop proxy when done:**- **Test Contexts** (`.contexts/`) - Automatic test metadata capture

```bash

npm run test:litellm-stopView HTML report:

``````bash

open test-results/test-report.html

---```



## 🚀 Running Tests## When to Use Each Test Type



### Quick Commands### Unit Tests (`tests/unit/`)

- ✅ Testing individual functions/modules

```bash- ✅ Fast feedback during development

# Run all unit tests (fast, always run in CI)- ✅ Mocked external dependencies

npm run test:unit- ❌ Not for integration scenarios



# Run all integration tests (moderate, may require setup)### Integration Tests (`tests/integration/`)

npm run test:integration- ✅ Testing multiple components together

- ✅ File system interactions

# Run all E2E tests (slow, requires LiteLLM)- ✅ Configuration loading

npm run test:e2e- ❌ Not for external services

# OR (alias)

npm run test:llm### E2E Tests (`tests/e2e/`)

- ✅ Full MCP server behavior

# Run everything (unit + integration + e2e)- ✅ Remote repository access

npm run test:all- ✅ Server initialization

- ❌ Not for LLM behavior validation

# Run tests in watch mode (for development)

npm run test:watch### LLM Tests (`tests/llm/`)

- ✅ Agent/workflow behavior with real LLM

# Run tests with UI (interactive)- ✅ Persona adoption validation

npm run test:ui- ✅ Tool calling patterns

- ❌ Expensive (API costs, time)

# Run with coverage

npm run test:coverage## Validation Types (YAML Tests)

```

| Type              | Description                    | Example               |

### Targeted Test Runs| ----------------- | ------------------------------ | --------------------- |

| `contains`        | String must be in response     | `value: "Mary"`       |

```bash| `not_contains`    | String must NOT be in response | `value: "error"`      |

# Run specific test file| `regex`           | Regex pattern match            | `pattern: "\\*\\w+"`  |

npm run test:unit -- tests/unit/utils/path-resolution/bmad-path-resolver.test.ts| `response_length` | Length within range            | `min: 100, max: 5000` |



# Run tests matching pattern## Coverage

npm run test:integration -- tests/integration/mcp-protocol/

Generate coverage report:

# Run single test by name

npm run test:e2e -- -t "should load analyst agent"```bash

```npm run test:coverage

```

---

Coverage thresholds (configured in `vitest.config.ts`):

## 📊 Test Reports- Branches: 60%

- Functions: 60%

After running tests, reports are generated in `test-results/`:- Lines: 60%

- Statements: 60%

- **`test-results.json`** - Structured JSON data (all test types combined)

- **`test-results.html`** - Interactive HTML report with tree view## CI/CD

  - Click tests in left sidebar to view details

  - Collapsible sections for chat conversations, errors, metadataDefault CI runs only unit + integration tests for speed and cost:

  - Full test data available as JSON

```bash

**View HTML report:**npm test  # Fast, free, no external dependencies

```bash```

open test-results/test-results.html

```Manual CI triggers can run E2E/LLM tests:



---```bash

RUN_E2E=true npm run test:e2e   # E2E tests

## 🎯 Test Type Decision TreeRUN_E2E=true npm run test:llm   # LLM tests (requires API keys)

```

**Choose your test type:**

## Troubleshooting

```

┌─ Testing a single function/module?### Tests Not Running

│  └─ Yes → unit/

│Check test file naming:

├─ Testing MCP protocol/server behavior?- Unit/Integration: `*.test.ts`

│  └─ Yes → integration/mcp-protocol/- E2E: `*.spec.ts` in `tests/e2e/`

│- LLM: `*.spec.ts` in `tests/llm/`

├─ Testing external API (GitHub, etc.)?

│  └─ Yes → integration/remote-api/### LiteLLM Connection Failed

│

├─ Testing file system operations?```bash

│  └─ Yes → integration/file-system/npm run test:litellm-health    # Check if proxy is running

│npm run test:litellm-start     # Start if needed

└─ Testing complete user workflow with LLM?```

   └─ Yes → e2e/

```### Coverage Too Low



---Add tests for uncovered code paths. Check coverage report:



## 🛠️ Test Framework Features```bash

npm run test:coverage

### Rich Data Collectionopen coverage/index.html

```

All tests automatically capture:

- ✅ Test metadata (name, file, duration, status)### Port 4000 in Use

- ✅ Console output (stdout/stderr)

- ✅ Error details (stack traces, diffs)```bash

- ✅ Hook execution statuslsof -i :4000                  # Find process using port

npm run test:litellm-stop      # Stop proxy

**E2E tests additionally capture:**```

- 💬 Chat conversations (multi-turn with roles)

- 🔧 Tool calls (arguments, results, timing)## Further Reading

- 🎫 Token usage (prompt, completion, total)

- 🤖 Provider info (model, endpoint)- [`tests/llm/README.md`](./llm/README.md) - LLM test setup and usage

- [`tests/e2e/README.md`](./e2e/README.md) - E2E test details

### Custom Reporters- [`LLM-SETUP.md`](./LLM-SETUP.md) - LiteLLM proxy configuration


- **BMAD Reporter**: Captures rich test context
- **Console Reporter**: Standard Vitest output
- **HTML Reporter**: Interactive tree-view report

### Parallel Execution

Tests run in parallel by default for speed:
- Unit tests: Full parallelism
- Integration tests: Full parallelism
- E2E tests: Full parallelism (each test isolated)

---

## 📝 Writing New Tests

### Unit Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../../src/utils/my-module.js';

describe('myFunction', () => {
  it('should handle basic input', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });

  it('should handle edge cases', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClientFixture, createMCPClient } from '../../support/mcp-client-fixture';

describe('MCP Integration', () => {
  let mcpClient: MCPClientFixture;

  beforeAll(async () => {
    mcpClient = await createMCPClient();
  });

  afterAll(async () => {
    await mcpClient.cleanup();
  });

  it('should execute tool', async () => {
    const result = await mcpClient.callTool('bmad', { command: 'analyst' });
    expect(result.isError).toBe(false);
  });
});
```

### E2E Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LLMClient } from '../../support/llm-client';
import { MCPClientFixture, createMCPClient } from '../../support/mcp-client-fixture';
import { startChatConversation, addChatMessage, finalizeChatConversation } from '../../framework/core/test-context';

describe('LLM Workflow', () => {
  let llm: LLMClient;
  let mcpClient: MCPClientFixture;

  beforeAll(async () => {
    llm = new LLMClient();
    mcpClient = await createMCPClient();
  });

  afterAll(async () => {
    await mcpClient.cleanup();
  });

  it('should complete workflow', async () => {
    startChatConversation('test-workflow', 'litellm');

    // User asks LLM to do something
    addChatMessage('user', 'Load the analyst agent');

    // LLM calls tool via MCP
    const response = await llm.sendMessage('Use the tool to load analyst agent', [mcpClient.getTools()]);

    addChatMessage('assistant', response.text, { toolCalls: response.toolCalls });

    expect(response.toolCalls).toHaveLength(1);
    expect(response.text).toContain('Mary');

    finalizeChatConversation(response.usage.total);
  });
});
```

---

## 🔧 Troubleshooting

### Tests Not Found

```bash
# Check if files moved correctly
find tests -name "*.spec.ts" -o -name "*.test.ts" | sort

# Check if glob pattern matches
npm run test:unit -- --reporter=verbose
```

### Import Errors After Moving Files

Update import paths to match new directory depth:
- 2 levels deep: `../../src/`
- 3 levels deep: `../../../src/`

### E2E Tests Timeout

```bash
# Increase timeout in vitest.config.e2e.ts
testTimeout: 300000, // 5 minutes
```

### LiteLLM Proxy Not Running

```bash
# Check if proxy is healthy
npm run test:litellm-health

# Restart proxy
npm run test:litellm-stop
npm run test:litellm-start

# View logs
npm run test:litellm-logs
```

---

## 📚 Related Documentation

- [Test Framework Details](./framework/README.md)
- [E2E Testing Guide](./e2e/README.md)
- [LLM Test Setup](./LLM-SETUP.md)
- [Contributing Tests](../CONTRIBUTING.md)

---

## 🎓 Best Practices

1. **Write unit tests first** - Fastest feedback, easiest to debug
2. **Add integration tests for boundaries** - Where components meet
3. **Add E2E tests for critical workflows** - User-facing value
4. **Keep tests independent** - No shared state between tests
5. **Use descriptive test names** - "should X when Y"
6. **Test edge cases** - Null, empty, invalid inputs
7. **Clean up resources** - Use `afterAll`/`afterEach` hooks
8. **Capture rich context** - Use test framework helpers for LLM tests
9. **Run tests locally before CI** - Catch issues early
10. **Review HTML reports** - Understand test failures better

---

**Last Updated:** January 2025
**Test Framework Version:** 2.0.0
**Total Tests:** 464 tests (416 unit + 34 integration + 14 e2e)
```````
