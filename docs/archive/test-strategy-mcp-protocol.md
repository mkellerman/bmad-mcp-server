# MCP Protocol Test Strategy - BMAD MCP Server

**Author:** Murat (Master Test Architect)  
**Date:** November 7, 2025  
**Status:** Recommended Architecture  
**Purpose:** Comprehensive test strategy integrating CLI JSON-RPC methodology

---

## Executive Summary

This document outlines a risk-based test strategy for the BMAD MCP Server that integrates CLI JSON-RPC testing methodology with our existing Vitest framework. The strategy prioritizes protocol compliance, fast feedback loops, and automation-first quality gates.

**Key Objectives:**

1. **Protocol Compliance** - Validate 100% JSON-RPC 2.0 and MCP spec compliance
2. **Fast Feedback** - Sub-5-second test execution for developer workflow
3. **Automation First** - All quality gates automated in CI/CD
4. **Risk-Based Coverage** - Test depth scales with feature impact
5. **Maintainability** - Tests as living documentation

---

## Test Architecture

### Layered Testing Strategy

```
┌─────────────────────────────────────────────────────┐
│  E2E Tests (Real AI Client Integration)             │  ← Highest Confidence
│  - Actual Claude Desktop / Cline integration        │     Slowest Execution
│  - Real-world usage scenarios                       │     10-20% Coverage
├─────────────────────────────────────────────────────┤
│  MCP Protocol Tests (CLI JSON-RPC)                  │  ← NEW LAYER
│  - Direct stdio communication                       │     Fast Execution
│  - Protocol compliance validation                   │     40% Coverage
│  - Contract testing                                 │
├─────────────────────────────────────────────────────┤
│  Integration Tests (Component Integration)          │  ← Component Contracts
│  - Tool handlers + Engine integration               │     Medium Speed
│  - Resource loading workflows                       │     30% Coverage
│  - Multi-component scenarios                        │
├─────────────────────────────────────────────────────┤
│  Unit Tests (Isolated Components)                   │  ← Lowest Level
│  - Pure functions                                   │     Fastest Execution
│  - Business logic                                   │     80% Coverage
│  - Edge cases                                       │
└─────────────────────────────────────────────────────┘
```

### Test Categories and Priorities

| Category                    | Priority | Coverage Target | Max Runtime | Flakiness Tolerance |
| --------------------------- | -------- | --------------- | ----------- | ------------------- |
| **MCP Protocol Compliance** | P0       | 100%            | 10s         | 0%                  |
| **BMAD Tool Contracts**     | P0       | 100%            | 15s         | 0%                  |
| **Resource Loading**        | P1       | 95%             | 10s         | 0%                  |
| **Agent Execution**         | P1       | 80%             | 30s         | <1%                 |
| **Workflow Execution**      | P2       | 60%             | 60s         | <2%                 |
| **Error Handling**          | P1       | 90%             | 15s         | 0%                  |
| **Performance**             | P2       | Key paths       | 30s         | <5%                 |

---

## MCP Protocol Test Suite Design

### Test Structure

```typescript
// tests/protocol/jsonrpc-compliance.test.ts
// Direct stdio communication tests using CLI methodology

import { describe, test, expect } from 'vitest';
import { execSync } from 'child_process';

const SERVER_CMD = 'node build/index.js';

describe('MCP Protocol Compliance', () => {
  describe('JSON-RPC 2.0 Fundamentals', () => {
    test('accepts valid JSON-RPC 2.0 request structure', () => {
      const request = JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1,
      });

      const response = execJsonRpc(request);

      expect(response).toHaveProperty('jsonrpc', '2.0');
      expect(response).toHaveProperty('id', 1);
      expect(response).toHaveProperty('result');
    });

    test('rejects requests without jsonrpc field', () => {
      const request = JSON.stringify({
        method: 'tools/list',
        id: 1,
      });

      const response = execJsonRpc(request);

      expect(response).toHaveProperty('error');
      expect(response.error.code).toBe(-32600); // Invalid Request
    });

    test('handles missing id field (notification)', () => {
      const request = JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
      });

      // Server should process but not respond to notifications
      const output = execJsonRpcRaw(request);
      expect(output.trim()).toBe(''); // No response
    });
  });

  describe('MCP Methods', () => {
    test('tools/list returns valid tool schema', () => {
      const response = execJsonRpc(createRequest('tools/list'));

      expect(response.result).toHaveProperty('tools');
      expect(Array.isArray(response.result.tools)).toBe(true);

      const bmadTool = response.result.tools.find((t) => t.name === 'bmad');
      expect(bmadTool).toBeDefined();
      expect(bmadTool).toHaveProperty('inputSchema');
      expect(bmadTool.inputSchema.type).toBe('object');
    });

    test('resources/list returns valid resource schema', () => {
      const response = execJsonRpc(createRequest('resources/list'));

      expect(response.result).toHaveProperty('resources');
      expect(Array.isArray(response.result.resources)).toBe(true);

      // Validate each resource has required fields
      response.result.resources.forEach((resource) => {
        expect(resource).toHaveProperty('uri');
        expect(resource).toHaveProperty('name');
        expect(resource.uri).toMatch(/^bmad:\/\//);
      });
    });
  });
});
```

### Test Helpers

```typescript
// tests/protocol/helpers/jsonrpc-executor.ts

import { execSync } from 'child_process';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  id?: number | string;
  params?: Record<string, any>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export function execJsonRpc(request: string | JsonRpcRequest): JsonRpcResponse {
  const requestStr =
    typeof request === 'string' ? request : JSON.stringify(request);

  try {
    const output = execSync(`echo '${requestStr}' | node build/index.js`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 30000, // 30s timeout
    });

    return JSON.parse(output);
  } catch (error) {
    throw new Error(`JSON-RPC execution failed: ${error.message}`);
  }
}

export function execJsonRpcRaw(request: string | JsonRpcRequest): string {
  const requestStr =
    typeof request === 'string' ? request : JSON.stringify(request);

  try {
    return execSync(`echo '${requestStr}' | node build/index.js`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
    });
  } catch (error) {
    return error.stdout || '';
  }
}

export function createRequest(
  method: string,
  params?: Record<string, any>,
  id: number | string = 1,
): JsonRpcRequest {
  return {
    jsonrpc: '2.0',
    method,
    id,
    ...(params && { params }),
  };
}

export function callBmadTool(
  operation: string,
  args: Record<string, any>,
): JsonRpcResponse {
  return execJsonRpc(
    createRequest('tools/call', {
      name: 'bmad',
      arguments: { operation, ...args },
    }),
  );
}
```

---

## Test Implementation Plan

### Phase 1: Protocol Compliance Layer (Week 1)

**Deliverables:**

1. **JSON-RPC 2.0 Compliance Suite**
   - File: `tests/protocol/jsonrpc-compliance.test.ts`
   - Coverage: All JSON-RPC 2.0 error codes and edge cases
   - Runtime: <5s

2. **MCP Method Validation Suite**
   - File: `tests/protocol/mcp-methods.test.ts`
   - Coverage: tools/list, tools/call, resources/list, resources/read
   - Runtime: <10s

3. **Helper Infrastructure**
   - File: `tests/protocol/helpers/jsonrpc-executor.ts`
   - Purpose: Reusable CLI execution functions
   - Features: Request builders, response validators, error handlers

**Success Criteria:**

- [ ] 100% MCP spec method coverage
- [ ] All JSON-RPC error codes tested
- [ ] Zero flaky tests
- [ ] <15s total execution time
- [ ] Integrated in CI/CD

### Phase 2: BMAD Tool Contract Tests (Week 2)

**Deliverables:**

1. **List Operations Suite**
   - File: `tests/protocol/bmad-list-operations.test.ts`
   - Tests: List agents, workflows, modules with/without filters
   - Validation: Response schema, data completeness

2. **Read Operations Suite**
   - File: `tests/protocol/bmad-read-operations.test.ts`
   - Tests: Read agents, workflows, resources
   - Validation: Content structure, metadata accuracy

3. **Execute Operations Suite** (Smoke tests only)
   - File: `tests/protocol/bmad-execute-smoke.test.ts`
   - Tests: Basic agent/workflow invocation (no full execution)
   - Purpose: Validate routing and parameter handling

**Success Criteria:**

- [ ] All BMAD operations covered
- [ ] Schema validation for all response types
- [ ] Parameter validation tests
- [ ] Error handling for invalid inputs
- [ ] <20s total execution time

### Phase 3: Error Handling & Edge Cases (Week 2)

**Deliverables:**

1. **Error Scenario Suite**
   - File: `tests/protocol/error-handling.test.ts`
   - Coverage: Invalid JSON, malformed requests, unknown methods
   - Validation: Proper error codes and messages

2. **Edge Case Suite**
   - File: `tests/protocol/edge-cases.test.ts`
   - Coverage: Large payloads, special characters, concurrent requests
   - Validation: Graceful handling, no crashes

**Success Criteria:**

- [ ] All error codes documented and tested
- [ ] No unhandled exceptions
- [ ] Clear, actionable error messages
- [ ] Edge cases don't crash server

### Phase 4: CI/CD Integration (Week 3)

**Deliverables:**

1. **GitHub Actions Workflow**
   - File: `.github/workflows/protocol-tests.yml`
   - Triggers: PR, push to main, scheduled daily
   - Stages: Build → Protocol Tests → Quality Gate

2. **Quality Gate Configuration**
   - File: `vitest.config.protocol.ts`
   - Thresholds: 100% pass rate, <30s runtime, zero flakes
   - Reporting: JSON + HTML output

3. **Pre-commit Hook**
   - File: `.husky/pre-commit`
   - Action: Run P0 protocol tests locally
   - Bypass: Manual override with explanation

**Success Criteria:**

- [ ] Tests run on every PR
- [ ] Failures block merge
- [ ] <2 minute pipeline duration
- [ ] Results visible in PR checks

---

## Test Organization

### Directory Structure

```
tests/
├── protocol/                     # NEW - CLI JSON-RPC tests
│   ├── jsonrpc-compliance.test.ts
│   ├── mcp-methods.test.ts
│   ├── bmad-list-operations.test.ts
│   ├── bmad-read-operations.test.ts
│   ├── bmad-execute-smoke.test.ts
│   ├── error-handling.test.ts
│   ├── edge-cases.test.ts
│   └── helpers/
│       ├── jsonrpc-executor.ts
│       ├── schema-validators.ts
│       └── fixtures.ts
├── integration/                  # EXISTING - Component integration
│   ├── bmad-engine.test.ts
│   ├── resource-loader.test.ts
│   └── tool-handlers.test.ts
├── unit/                        # EXISTING - Unit tests
│   ├── config.test.ts
│   ├── manifest-cache.test.ts
│   └── utils/
└── e2e/                         # EXISTING - Full client tests
    └── claude-desktop.test.ts
```

### Test File Naming Convention

- `*.test.ts` - Vitest test files
- `*.spec.ts` - Alternative (avoid mixing)
- `helpers/*.ts` - Test utilities (no .test suffix)
- `fixtures/*.ts` - Test data (no .test suffix)

---

## Quality Gates

### Pre-Commit (Local)

**Run Time:** <10s  
**Scope:** P0 tests only

```bash
# Automatically run via Husky
npm run test:protocol:fast

# Manual override (with explanation)
git commit --no-verify
```

**Includes:**

- JSON-RPC compliance tests
- MCP method validation
- BMAD list/read operations

### Pull Request (CI)

**Run Time:** <2 minutes  
**Scope:** Full protocol + integration suite

```yaml
# .github/workflows/pr-tests.yml
name: PR Quality Gate

on: pull_request

jobs:
  protocol-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Protocol Compliance
        run: npm run test:protocol

      - name: Integration Tests
        run: npm run test:integration

      - name: Coverage Check
        run: npm run test:coverage:check
```

**Pass Criteria:**

- ✅ 100% protocol tests pass
- ✅ ≥95% integration tests pass
- ✅ Zero P0 test failures
- ✅ No new flaky tests introduced

### Main Branch (Post-Merge)

**Run Time:** <5 minutes  
**Scope:** Full test suite including E2E

```yaml
# .github/workflows/main-tests.yml
name: Main Branch Quality

on:
  push:
    branches: [main]

jobs:
  full-suite:
    runs-on: ubuntu-latest
    steps:
      - name: All Tests
        run: npm run test:all

      - name: Coverage Report
        run: npm run test:coverage:report
```

### Nightly (Scheduled)

**Run Time:** <15 minutes  
**Scope:** Extended tests + performance benchmarks

```yaml
# .github/workflows/nightly.yml
name: Nightly Extended Tests

on:
  schedule:
    - cron: '0 2 * * *' # 2 AM daily

jobs:
  extended-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Performance Tests
        run: npm run test:performance

      - name: Load Tests
        run: npm run test:load

      - name: Compatibility Matrix
        run: npm run test:matrix
```

---

## Automation Framework Design

### CLI Test Runner Wrapper

```typescript
// tests/protocol/helpers/cli-test-runner.ts

import { spawn } from 'child_process';
import { Readable, Writable } from 'stream';

export class McpCliTestRunner {
  private serverProcess: any;
  private serverPath: string;

  constructor(serverPath: string = 'node build/index.js') {
    this.serverPath = serverPath;
  }

  async start(): Promise<void> {
    this.serverProcess = spawn(this.serverPath, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Wait for server ready (if implements ready signal)
    await this.waitForReady();
  }

  async stop(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill();
      await this.waitForExit();
    }
  }

  async sendRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    return new Promise((resolve, reject) => {
      const requestStr = JSON.stringify(request) + '\n';

      let responseData = '';

      const onData = (chunk: Buffer) => {
        responseData += chunk.toString();

        try {
          const response = JSON.parse(responseData);
          this.serverProcess.stdout.off('data', onData);
          resolve(response);
        } catch (e) {
          // Not complete JSON yet, wait for more data
        }
      };

      this.serverProcess.stdout.on('data', onData);
      this.serverProcess.stdin.write(requestStr);

      // Timeout after 30s
      setTimeout(() => {
        this.serverProcess.stdout.off('data', onData);
        reject(new Error('Request timeout'));
      }, 30000);
    });
  }

  private async waitForReady(): Promise<void> {
    // Implement server ready detection if needed
    return new Promise((resolve) => setTimeout(resolve, 100));
  }

  private async waitForExit(): Promise<void> {
    return new Promise((resolve) => {
      this.serverProcess.on('exit', resolve);
    });
  }
}
```

### Schema Validators

```typescript
// tests/protocol/helpers/schema-validators.ts

import Ajv from 'ajv';

const ajv = new Ajv();

// MCP Tool Schema
export const toolSchema = {
  type: 'object',
  required: ['name', 'description', 'inputSchema'],
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    inputSchema: {
      type: 'object',
      required: ['type', 'properties'],
      properties: {
        type: { const: 'object' },
        properties: { type: 'object' },
        required: { type: 'array', items: { type: 'string' } },
      },
    },
  },
};

// MCP Resource Schema
export const resourceSchema = {
  type: 'object',
  required: ['uri', 'name'],
  properties: {
    uri: { type: 'string', pattern: '^bmad://' },
    name: { type: 'string' },
    description: { type: 'string' },
    mimeType: { type: 'string' },
  },
};

export function validateToolSchema(tool: any): boolean {
  const validate = ajv.compile(toolSchema);
  return validate(tool);
}

export function validateResourceSchema(resource: any): boolean {
  const validate = ajv.compile(resourceSchema);
  return validate(resource);
}
```

---

## Performance & Monitoring

### Performance Targets

| Test Suite          | Target Runtime | Max Runtime | P95 Latency |
| ------------------- | -------------- | ----------- | ----------- |
| Protocol Compliance | <5s            | 10s         | <100ms      |
| BMAD Operations     | <15s           | 30s         | <200ms      |
| Integration Tests   | <20s           | 45s         | <500ms      |
| Full Suite          | <60s           | 120s        | <1s         |

### Monitoring Strategy

**Metrics to Track:**

1. **Test Execution Time**
   - Track trends over time
   - Alert on >20% regression
   - Dashboard in CI/CD

2. **Flakiness Rate**
   - Track retries and failures
   - Alert on >1% flakiness
   - Auto-quarantine flaky tests

3. **Coverage Metrics**
   - Line coverage (target: 80%)
   - Branch coverage (target: 75%)
   - Protocol coverage (target: 100%)

4. **Failure Analysis**
   - Categorize failures (code vs test vs infra)
   - Track MTTR (mean time to resolve)
   - Root cause patterns

### Test Health Dashboard

```typescript
// scripts/test-health-report.ts

interface TestMetrics {
  suite: string;
  executionTime: number;
  passRate: number;
  flakinessRate: number;
  coverage: number;
  trend: 'improving' | 'stable' | 'degrading';
}

export function generateHealthReport(): TestMetrics[] {
  // Parse test results from CI artifacts
  // Calculate metrics
  // Generate trend analysis
  // Output markdown report
}
```

---

## Migration Path

### Week 1: Foundation

- [ ] Create `tests/protocol/` directory structure
- [ ] Implement JSON-RPC executor helpers
- [ ] Write 10 foundational protocol tests
- [ ] Set up Vitest config for protocol tests
- [ ] Document test patterns

### Week 2: Core Coverage

- [ ] Complete JSON-RPC compliance suite (20 tests)
- [ ] Complete MCP methods suite (15 tests)
- [ ] Complete BMAD operations suite (25 tests)
- [ ] Add schema validation
- [ ] Review with team

### Week 3: Quality & Integration

- [ ] Add error handling tests (15 tests)
- [ ] Add edge case tests (10 tests)
- [ ] Configure GitHub Actions workflow
- [ ] Set up pre-commit hooks
- [ ] Create test documentation

### Week 4: Optimization & Rollout

- [ ] Optimize slow tests
- [ ] Add performance benchmarks
- [ ] Train team on new patterns
- [ ] Monitor CI/CD metrics
- [ ] Iterate based on feedback

---

## Test Patterns & Best Practices

### Pattern 1: Arrange-Act-Assert

```typescript
test('tools/list returns bmad tool', () => {
  // Arrange
  const request = createRequest('tools/list');

  // Act
  const response = execJsonRpc(request);

  // Assert
  expect(response.result.tools).toContainEqual(
    expect.objectContaining({ name: 'bmad' }),
  );
});
```

### Pattern 2: Table-Driven Tests

```typescript
describe('BMAD list operations', () => {
  test.each([
    ['agents', 'name', 'analyst'],
    ['workflows', 'name', 'prd'],
    ['modules', 'name', 'bmm'],
  ])('list %s returns valid data', (query, field, expectedValue) => {
    const response = callBmadTool('list', { query });

    expect(response.result.content[0].text).toBeDefined();
    const data = JSON.parse(response.result.content[0].text);
    expect(data.some((item) => item[field] === expectedValue)).toBe(true);
  });
});
```

### Pattern 3: Snapshot Testing (Use Sparingly)

```typescript
test('tools/list schema matches snapshot', () => {
  const response = execJsonRpc(createRequest('tools/list'));

  // Only snapshot stable structures
  expect(response.result.tools[0].inputSchema).toMatchSnapshot();
});
```

### Anti-Patterns to Avoid

❌ **Don't:** Test implementation details  
✅ **Do:** Test contracts and behavior

❌ **Don't:** Write flaky tests (timing-dependent)  
✅ **Do:** Use deterministic assertions

❌ **Don't:** Mock everything  
✅ **Do:** Use real server via stdio

❌ **Don't:** Write one giant test  
✅ **Do:** Isolate each scenario

---

## Acceptance Criteria

### For This Strategy

- [ ] Covers 100% of MCP protocol methods
- [ ] Covers 100% of BMAD tool operations
- [ ] Integrates with existing Vitest framework
- [ ] Runs in CI/CD (<2 min for PR gate)
- [ ] Provides clear failure diagnostics
- [ ] Zero tolerance for flaky tests
- [ ] Documented with examples
- [ ] Team trained and onboarded

### For Individual Tests

- [ ] Single responsibility (one assertion focus)
- [ ] Deterministic (same input = same output)
- [ ] Fast (<1s per test unless justified)
- [ ] Isolated (no shared state)
- [ ] Clear naming (describes what and why)
- [ ] Fails with actionable message
- [ ] Documented if complex

---

## Next Steps

### Immediate Actions (This Week)

1. **Review & Approve** - Team review of this strategy
2. **Create Spike** - POC with 5 protocol tests
3. **Estimate Work** - Break down into implementable tasks
4. **Assign Owner** - Designate test champion

### Short Term (Weeks 1-2)

1. Implement Phase 1 (Protocol Compliance)
2. Implement Phase 2 (BMAD Contracts)
3. Set up CI/CD integration

### Medium Term (Weeks 3-4)

1. Complete Phase 3 (Error Handling)
2. Complete Phase 4 (CI/CD)
3. Train team and document

### Long Term (Ongoing)

1. Monitor test health metrics
2. Refactor slow/flaky tests
3. Expand coverage as features grow
4. Keep tests as living documentation

---

## Appendix: Example Test Suite

### Complete Protocol Test Example

```typescript
// tests/protocol/mcp-compliance.test.ts

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { McpCliTestRunner } from './helpers/cli-test-runner';
import { createRequest, callBmadTool } from './helpers/jsonrpc-executor';
import {
  validateToolSchema,
  validateResourceSchema,
} from './helpers/schema-validators';

describe('MCP Protocol Compliance Suite', () => {
  let runner: McpCliTestRunner;

  beforeAll(async () => {
    runner = new McpCliTestRunner();
    await runner.start();
  });

  afterAll(async () => {
    await runner.stop();
  });

  describe('JSON-RPC 2.0 Compliance', () => {
    test('responds with correct protocol version', async () => {
      const response = await runner.sendRequest(createRequest('tools/list'));
      expect(response.jsonrpc).toBe('2.0');
    });

    test('echoes request id in response', async () => {
      const response = await runner.sendRequest(
        createRequest('tools/list', {}, 'test-123'),
      );
      expect(response.id).toBe('test-123');
    });

    test('returns error for invalid method', async () => {
      const response = await runner.sendRequest(
        createRequest('invalid/method'),
      );
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32601); // Method not found
    });
  });

  describe('MCP Tools Protocol', () => {
    test('tools/list returns valid tool array', async () => {
      const response = await runner.sendRequest(createRequest('tools/list'));

      expect(response.result).toHaveProperty('tools');
      expect(Array.isArray(response.result.tools)).toBe(true);
      expect(response.result.tools.length).toBeGreaterThan(0);
    });

    test('each tool has valid schema', async () => {
      const response = await runner.sendRequest(createRequest('tools/list'));

      response.result.tools.forEach((tool) => {
        expect(validateToolSchema(tool)).toBe(true);
      });
    });

    test('tools/call executes bmad tool', async () => {
      const response = await runner.sendRequest(
        createRequest('tools/call', {
          name: 'bmad',
          arguments: { operation: 'list', query: 'agents' },
        }),
      );

      expect(response.result).toHaveProperty('content');
      expect(Array.isArray(response.result.content)).toBe(true);
    });
  });

  describe('MCP Resources Protocol', () => {
    test('resources/list returns valid resource array', async () => {
      const response = await runner.sendRequest(
        createRequest('resources/list'),
      );

      expect(response.result).toHaveProperty('resources');
      expect(Array.isArray(response.result.resources)).toBe(true);
    });

    test('each resource has valid schema', async () => {
      const response = await runner.sendRequest(
        createRequest('resources/list'),
      );

      response.result.resources.forEach((resource) => {
        expect(validateResourceSchema(resource)).toBe(true);
      });
    });

    test('resources/read returns resource content', async () => {
      const listResponse = await runner.sendRequest(
        createRequest('resources/list'),
      );
      const firstResourceUri = listResponse.result.resources[0].uri;

      const readResponse = await runner.sendRequest(
        createRequest('resources/read', { uri: firstResourceUri }),
      );

      expect(readResponse.result).toHaveProperty('contents');
      expect(readResponse.result.contents[0]).toHaveProperty('text');
    });
  });
});
```

---

**Recommended By:** Murat (Master Test Architect)  
**Review Status:** Pending Team Approval  
**Implementation Priority:** High (P0)  
**Estimated Effort:** 3-4 weeks (1 engineer)  
**ROI:** High - Faster feedback, higher confidence, lower regression rate

---

_This strategy follows BMAD testing principles: Risk-based coverage, automation-first, tests as documentation._
