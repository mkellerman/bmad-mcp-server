# Testing Guide - BMAD MCP Server

**Test Framework:** Vitest 4.0.3  
**Coverage Target:** 80%+

---

## Overview

The BMAD MCP Server employs a comprehensive testing strategy with three test levels: unit, integration, and end-to-end tests. The testing framework is built on Vitest with custom reporters for rich result analysis.

**Testing Philosophy:**

- **Test-Driven Development:** Tests drive design and validate functionality
- **Comprehensive Coverage:** 80%+ coverage across all metrics
- **Fast Feedback:** Unit tests run in <5 seconds, full suite in <2 minutes
- **Rich Reporting:** Custom reporters capture LLM interactions and agent behaviors

---

## 🧪 Test Types & Strategy

### Test Pyramid

```
End-to-End Tests (E2E)     ████░░░░  20%
Integration Tests         ███████░  30%
Unit Tests               █████████  50%
```

### Test Categories

| Test Type       | Coverage | Timeout | Purpose                        | Examples                                |
| --------------- | -------- | ------- | ------------------------------ | --------------------------------------- |
| **Unit**        | 50%      | 5s      | Isolated functions, algorithms | Git URL parsing, path resolution        |
| **Integration** | 30%      | 10s     | Component interaction          | Resource loading, MCP protocol          |
| **E2E**         | 20%      | 30s     | Full workflows                 | Agent execution, workflow orchestration |

### Test Environments

- **Unit Tests:** Mocked dependencies, isolated execution
- **Integration Tests:** Real file system, mocked network calls
- **E2E Tests:** Full MCP server, real BMAD resources, LLM integration

---

## 🏃 Running Tests

### Basic Commands

```bash
# Run all tests
npm run test

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # End-to-end tests only

# Run with coverage
npm run test:coverage

# Run in watch mode (development)
npm run test:watch

# Run with UI (debugging)
npm run test:ui
```

### Advanced Options

```bash
# Run specific test file
npm run test -- tests/unit/lite-resource-loader.test.ts

# Run tests matching pattern
npm run test -- "*resource*"

# Run with verbose output
npm run test -- --reporter=verbose

# Run tests in specific order
TEST_TYPE=unit npm run test
```

### Test Results

**Console Output:**

```
✓ ResourceLoader (Lite) > should load an agent (2ms)
✓ ResourceLoader (Lite) > should load a workflow (1ms)
✓ GitSourceResolver > should resolve git+https URLs (45ms)

Test Files  3 passed (3)
Tests  12 passed (12)
Time  1.2s
```

**Coverage Report:**

- **Statements:** 85%
- **Branches:** 78%
- **Functions:** 92%
- **Lines:** 84%

---

## 📝 Writing Tests

### Test Structure

```
tests/
├── unit/                    # Unit tests (isolated functions)
├── integration/             # Component integration
├── e2e/                     # End-to-end workflows
├── framework/               # Test infrastructure
├── helpers/                 # Test utilities
├── fixtures/                # Test data
└── setup.ts                 # Global configuration
```

### Unit Test Example

**File:** `tests/unit/utils/git-source-resolver.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { GitSourceResolver } from '../../../src/utils/git-source-resolver.js';

describe('GitSourceResolver', () => {
  let resolver: GitSourceResolver;

  beforeEach(() => {
    resolver = new GitSourceResolver();
  });

  describe('URL Resolution', () => {
    it('should resolve basic git+https URLs', async () => {
      const result = await resolver.resolve(
        'git+https://github.com/org/repo.git',
      );
      expect(result).toContain('cache');
      expect(result).toMatch(/bmad-cache/);
    });

    it('should handle branch specifications', async () => {
      const result = await resolver.resolve(
        'git+https://github.com/org/repo.git#develop',
      );
      expect(result).toContain('develop');
    });

    it('should handle subpath specifications', async () => {
      const result = await resolver.resolve(
        'git+https://github.com/org/repo.git#master:/core',
      );
      expect(result).toContain('core');
    });
  });

  describe('Error Handling', () => {
    it('should reject invalid URLs', async () => {
      await expect(resolver.resolve('not-a-git-url')).rejects.toThrow(
        'Invalid Git URL',
      );
    });

    it('should handle network failures gracefully', async () => {
      // Mock network failure
      await expect(
        resolver.resolve('git+https://invalid-domain.com/repo.git'),
      ).rejects.toThrow();
    });
  });
});
```

### Integration Test Example

**File:** `tests/integration/resource-loading.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ResourceLoaderGit } from '../../src/resource-loader.js';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

describe('Resource Loading Integration', () => {
  let testDir: string;
  let loader: ResourceLoaderGit;

  beforeEach(() => {
    // Create isolated test environment
    testDir = join(tmpdir(), `bmad-integration-${Date.now()}`);
    mkdirSync(join(testDir, 'bmad', 'agents'), { recursive: true });
    mkdirSync(join(testDir, 'bmad', 'workflows'), { recursive: true });

    // Setup test BMAD structure
    writeFileSync(
      join(testDir, 'bmad', 'agents', 'test-agent.md'),
      '---\nname: test-agent\ntitle: Test Agent\n---\n# Test Agent\nDescription here',
    );

    loader = new ResourceLoaderGit(testDir);
  });

  afterEach(() => {
    // Clean up test environment
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should discover agents from project directory', async () => {
    const agents = await loader.listAgentsWithMetadata();
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('test-agent');
    expect(agents[0].title).toBe('Test Agent');
  });

  it('should load agent content correctly', async () => {
    const resource = await loader.loadAgent('test-agent');
    expect(resource.content).toContain('# Test Agent');
    expect(resource.source).toBe('project');
  });

  it('should handle missing agents gracefully', async () => {
    await expect(loader.loadAgent('nonexistent')).rejects.toThrow(
      'Agent not found',
    );
  });
});
```

### E2E Test Example

**File:** `tests/e2e/agent-execution.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { BMADServerLiteMultiToolGit } from '../../src/server.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

describe('Agent Execution E2E', () => {
  let server: BMADServerLiteMultiToolGit;

  beforeEach(() => {
    server = new BMADServerLiteMultiToolGit('./test-project');
  });

  it('should list available tools', async () => {
    // Simulate MCP list tools request
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    });

    expect(response.result.tools).toBeDefined();
    expect(response.result.tools.length).toBeGreaterThan(0);

    // Should include agent tools and built-in tools
    const toolNames = response.result.tools.map((t) => t.name);
    expect(toolNames).toContain('bmad-workflow');
    expect(toolNames).toContain('bmad-resources');
  });

  it('should execute agent tool successfully', async () => {
    // First get available tools
    const listResponse = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    });

    const agentTool = listResponse.result.tools.find((t) =>
      t.name.startsWith('core-'),
    );

    if (agentTool) {
      // Execute the agent
      const executeResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: agentTool.name,
          arguments: {
            message: 'Hello, can you help me with a task?',
          },
        },
      });

      expect(executeResponse.result.content).toBeDefined();
      expect(executeResponse.result.content[0].text).toBeTruthy();
    }
  });
});
```

---

## 🛠️ Test Infrastructure

### Custom Test Reporter

**File:** `tests/framework/reporters/bmad-vitest-reporter.ts`

The custom reporter captures:

- **Test execution times** and results
- **LLM interactions** during E2E tests
- **Agent behavior logs** and responses
- **MCP protocol compliance** validation
- **Performance metrics** and bottlenecks

**Usage:**

```typescript
// Tests can add custom metadata
import { addTestMetadata } from '../setup.js';

it('should execute complex workflow', async () => {
  const result = await executeWorkflow('complex-workflow');

  addTestMetadata({
    llmInteractions: result.llmCalls,
    agentResponses: result.agentOutputs,
    executionTime: result.duration,
  });

  expect(result.success).toBe(true);
});
```

### Test Helpers

**File:** `tests/helpers/index.ts`

```typescript
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Create a temporary BMAD project structure for testing
 */
export function createTestProject(): string {
  const testDir = mkdtempSync(join(tmpdir(), 'bmad-test-'));

  // Create BMAD structure
  writeFileSync(join(testDir, 'bmad', 'agents', 'test.md'), '# Test Agent');
  writeFileSync(join(testDir, 'bmad', 'workflows', 'test.yaml'), 'name: test');

  return testDir;
}

/**
 * Mock Git repository for testing
 */
export function mockGitRepository(url: string): void {
  // Mock implementation for Git operations
}

/**
 * Assert MCP protocol compliance
 */
export function assertMCPCompliance(response: any): void {
  expect(response.jsonrpc).toBe('2.0');
  expect(response.id).toBeDefined();
  expect(response.result || response.error).toBeDefined();
}
```

### Test Fixtures

**Directory:** `tests/fixtures/`

Contains:

- **Sample BMAD agents** with various capabilities
- **Workflow definitions** for different scenarios
- **MCP protocol examples** for validation
- **Git repository mocks** for remote testing

---

## 📊 Coverage Analysis

### Coverage Metrics

**Target:** 80%+ across all categories

| Metric     | Target | Current | Status |
| ---------- | ------ | ------- | ------ |
| Statements | 80%    | 85%     | ✅     |
| Branches   | 80%    | 78%     | ⚠️     |
| Functions  | 80%    | 92%     | ✅     |
| Lines      | 80%    | 84%     | ✅     |

### Coverage Configuration

**File:** `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/', 'build/', 'tests/', 'scripts/', '**/*.d.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

### Viewing Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html

# Check coverage by file
cat coverage/coverage-summary.json | jq '.total'
```

### Improving Coverage

**Common Gaps:**

- **Error paths:** Exception handling code
- **Edge cases:** Unusual input combinations
- **Platform-specific:** OS-dependent code paths

**Strategies:**

```typescript
// Test error conditions
it('should handle network failures', async () => {
  // Mock network failure
  mockNetworkFailure();
  await expect(operation()).rejects.toThrow('Network error');
});

// Test edge cases
it('should handle empty input', () => {
  expect(processInput('')).toEqual(defaultValue);
});

// Test platform differences
if (process.platform === 'win32') {
  it('should handle Windows paths', () => {
    // Windows-specific test
  });
}
```

---

## 🔄 Continuous Integration

### CI/CD Pipeline

**GitHub Actions Workflow:**

```yaml
name: CI/CD
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### Pre-commit Hooks

**Husky Configuration:**

```bash
# Run tests before commit
npm run test:unit

# Check coverage thresholds
npm run test:coverage -- --run --coverageThreshold='{"global":{"statements":80}}'
```

### Quality Gates

- **Tests pass:** All test suites must pass
- **Coverage maintained:** Coverage cannot decrease
- **Linting clean:** No ESLint errors
- **TypeScript clean:** No compilation errors
- **Build successful:** Production build works

---

## 🐛 Debugging Tests

### Common Issues

#### Test Timeouts

```typescript
// Increase timeout for slow operations
it('should handle large Git repositories', async () => {
  // 10 second timeout for Git operations
}, 10000);
```

#### Flaky Tests

```typescript
// Retry flaky operations
it('should connect to external service', async () => {
  await retry(async () => {
    const result = await externalCall();
    expect(result).toBeDefined();
  }, 3);
});
```

#### Async Issues

```typescript
// Ensure proper async handling
it('should complete async operation', async () => {
  const promise = asyncOperation();
  await expect(promise).resolves.toBeDefined();
});
```

### Debugging Tools

#### Vitest UI

```bash
npm run test:ui
# Opens browser interface for test debugging
```

#### Verbose Output

```bash
npm run test -- --reporter=verbose --logHeapUsage
```

#### Step-through Debugging

```typescript
// Add debugger statements
it('should debug step by step', () => {
  debugger; // Will break in Node.js inspector
  const result = someOperation();
  expect(result).toBe(expected);
});
```

---

## 📈 Performance Testing

### Test Performance Benchmarks

```typescript
describe('Performance Benchmarks', () => {
  it('should load agents within 100ms', async () => {
    const start = Date.now();
    await loader.listAgents();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should resolve Git URLs within 2 seconds', async () => {
    const start = Date.now();
    await resolver.resolve('git+https://github.com/org/repo.git');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });
});
```

### Memory Leak Detection

```typescript
describe('Memory Usage', () => {
  it('should not leak memory during repeated operations', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Perform many operations
    for (let i = 0; i < 1000; i++) {
      await someOperation();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const growth = finalMemory - initialMemory;

    // Allow some growth but not excessive
    expect(growth).toBeLessThan(10 * 1024 * 1024); // 10MB
  });
});
```

---

## 🎯 Best Practices

### Test Organization

#### Arrange-Act-Assert Pattern

```typescript
it('should validate input correctly', () => {
  // Arrange
  const validator = new InputValidator();
  const invalidInput = 'invalid@input';

  // Act
  const result = validator.validate(invalidInput);

  // Assert
  expect(result.valid).toBe(false);
  expect(result.errors).toContain('Invalid format');
});
```

#### Test Data Management

```typescript
// Use factories for test data
function createTestAgent(overrides = {}) {
  return {
    name: 'test-agent',
    title: 'Test Agent',
    description: 'A test agent',
    ...overrides,
  };
}

it('should process agent metadata', () => {
  const agent = createTestAgent({ name: 'custom-agent' });
  // Test with custom agent
});
```

### Mocking Strategy

#### External Dependencies

```typescript
import { vi } from 'vitest';

// Mock file system operations
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

// Mock network calls
vi.mock('node:http', () => ({
  request: vi.fn(),
}));
```

#### Complex Objects

```typescript
// Create spies for method calls
const mockLoader = {
  listAgents: vi.fn().mockResolvedValue(['agent1', 'agent2']),
  loadAgent: vi.fn().mockResolvedValue({ name: 'agent1', content: '...' }),
};
```

### Test Maintenance

#### Keep Tests DRY

```typescript
// Shared setup in beforeEach
let server: BMADServerLiteMultiToolGit;

beforeEach(() => {
  server = new BMADServerLiteMultiToolGit();
});

// Reuse in multiple tests
it('should handle valid requests', async () => {
  const response = await server.handleRequest(validRequest);
  expect(response.result).toBeDefined();
});

it('should reject invalid requests', async () => {
  const response = await server.handleRequest(invalidRequest);
  expect(response.error).toBeDefined();
});
```

#### Descriptive Test Names

```typescript
// Good: Specific and descriptive
it('should return 404 for non-existent resources', async () => {
  // Test implementation
});

// Bad: Vague and unhelpful
it('should work correctly', async () => {
  // Test implementation
});
```

---

## 📋 Test Checklist

### Before Committing

- [ ] All tests pass: `npm run test`
- [ ] Coverage maintained: `npm run test:coverage`
- [ ] No linting errors: `npm run lint`
- [ ] TypeScript compiles: `npm run build`

### For New Features

- [ ] Unit tests written for new functions
- [ ] Integration tests for component interaction
- [ ] E2E tests for complete workflows
- [ ] Error conditions tested
- [ ] Edge cases covered
- [ ] Documentation updated

### For Bug Fixes

- [ ] Regression test added
- [ ] Root cause identified and tested
- [ ] Related edge cases tested
- [ ] Fix verified with existing tests

---

**Test Framework:** Vitest 4.0.3  
**Coverage Target:** 80%+  
**Test Count:** 50+ tests across 3 levels
