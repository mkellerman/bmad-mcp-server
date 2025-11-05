# Integration Test Refactoring Plan

## Problem Statement

**Current Issue:**
Git lock conflicts occur because integration tests run in parallel and all access the same git cache directory (`~/.bmad/cache/git`).

**Root Cause:**
Two distinct types of tests are mixed together:

1. **Git operation tests** - Need real git clone/fetch (must be sequential)
2. **Agent loading tests** - Just need the cache to exist (can use mocks, run in parallel)

---

## Solution: Separate Test Concerns

### Category 1: Git Operations (Real, Sequential)

**Location:** `tests/integration/remote-api/`

**Purpose:** Test git cloning, caching, and repository discovery

**Characteristics:**

- ✅ Use **real git commands**
- ✅ Test **actual GitHub repositories**
- ⚠️ Run **sequentially** (prevent lock conflicts)
- ⏱️ Slower (30s+ per test)

**What to test:**

```typescript
// remote-api/git-operations.spec.ts
describe('Git Cache Operations', () => {
  // Test git clone
  it('should clone remote repository', async () => { ... });

  // Test git fetch/pull
  it('should update existing cache', async () => { ... });

  // Test cache invalidation
  it('should re-clone when branch changes', async () => { ... });

  // Test performance
  it('should use cache on second access', async () => { ... });
});
```

**Implementation:**

```typescript
// vitest.config.ts - Add sequential execution
const getPoolOptions = () => {
  if (testType === 'integration' && process.env.TEST_CATEGORY === 'git') {
    return {
      threads: {
        singleThread: true, // Sequential for git tests
      },
    };
  }
  return {};
};
```

---

### Category 2: Agent Loading (Mocked, Parallel)

**Location:** `tests/integration/mcp-protocol/`

**Purpose:** Test agent loading logic assuming cache exists

**Characteristics:**

- ✅ Use **mocked git cache** (fixtures)
- ✅ Run **in parallel**
- ✅ Fast (5s per test)
- ✅ Deterministic

**What to test:**

```typescript
// mcp-protocol/dynamic-agent-loading.spec.ts
describe('Dynamic Agent Loading', () => {
  beforeAll(() => {
    // Mock git resolver to return fixture
    mockGitResolver('/path/to/fixtures/awesome-agents');
  });

  // Test agent loading (no git involved)
  it('should load agent from cache', async () => { ... });

  // Test path parsing
  it('should parse @remote:path format', async () => { ... });

  // Test error handling
  it('should handle missing agent', async () => { ... });
});
```

**Implementation:**

```typescript
// Create test fixture helper
// tests/fixtures/git-cache/awesome-bmad-agents/
//   agents/
//     debug-diana-v6/
//       agents/
//         debug.md

// Mock git resolver
import { vi } from 'vitest';

vi.mock('../../../src/utils/git-source-resolver', () => ({
  GitSourceResolver: class MockGitSourceResolver {
    constructor() {}

    async resolve(gitUrl: string): Promise<string> {
      // Parse URL and return appropriate fixture path
      if (gitUrl.includes('awesome-bmad-agents')) {
        return path.join(
          __dirname,
          '../../fixtures/git-cache/awesome-bmad-agents',
        );
      }
      throw new Error(`Unknown remote: ${gitUrl}`);
    }
  },
}));
```

---

## Implementation Steps

### Step 1: Create Git Cache Fixture ✅

```bash
# Create fixture structure
mkdir -p tests/fixtures/git-cache/awesome-bmad-agents/agents/debug-diana-v6/agents
```

**Add sample agent:**

```markdown
<!-- tests/fixtures/git-cache/awesome-bmad-agents/agents/debug-diana-v6/agents/debug.md -->

# Diana - Debug Specialist

Test fixture agent for integration tests.
```

### Step 2: Create Mock Helper ✅

```typescript
// tests/support/mock-git-resolver.ts
import { vi } from 'vitest';
import path from 'path';

export function mockGitResolverWithFixtures() {
  vi.mock('../../../src/utils/git-source-resolver', () => ({
    GitSourceResolver: class MockGitSourceResolver {
      async resolve(gitUrl: string): Promise<string> {
        const fixturePath = path.join(
          __dirname,
          '../fixtures/git-cache/awesome-bmad-agents',
        );

        if (gitUrl.includes('awesome-bmad-agents')) {
          return fixturePath;
        }

        throw new Error(`Mock: Unknown git URL: ${gitUrl}`);
      }
    },
  }));
}

export function restoreGitResolver() {
  vi.unmock('../../../src/utils/git-source-resolver');
}
```

### Step 3: Refactor Agent Loading Tests ✅

```typescript
// tests/integration/mcp-protocol/dynamic-agent-loading.spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  mockGitResolverWithFixtures,
  restoreGitResolver,
} from '../../support/mock-git-resolver';
import { MCPClientFixture } from '../../support/mcp-client-fixture';

describe('Dynamic Agent Loading (Mocked Git)', () => {
  let client: MCPClientFixture;

  beforeAll(async () => {
    // Use mocked git cache (fixtures)
    mockGitResolverWithFixtures();

    client = new MCPClientFixture();
    await client.setup();
  });

  afterAll(async () => {
    await client.cleanup();
    restoreGitResolver();
  });

  describe('@remote:agents/name command', () => {
    it('should load agent from cache (no git operation)', async () => {
      const result = await client.callTool('bmad', {
        command: '@awesome:agents/debug-diana-v6/agents/debug',
      });

      expect(result.isError).toBe(false);
      expect(result.content).toContain('Diana');
      expect(result.content).toContain('Debug Specialist');
    }, 5000); // Fast - no git!
  });
});
```

### Step 4: Configure Sequential Execution for Git Tests ✅

```typescript
// vitest.config.ts
const getPoolOptions = () => {
  const testCategory = process.env.TEST_CATEGORY;

  // Git tests must run sequentially
  if (testType === 'integration' && testCategory === 'git') {
    return {
      threads: {
        singleThread: true,
      },
    };
  }

  return {}; // Parallel by default
};

export default defineConfig({
  test: {
    // ...
    poolOptions: getPoolOptions(),
  },
});
```

### Step 5: Update Test Scripts ✅

```json
// package.json
{
  "scripts": {
    "test:integration": "TEST_TYPE=integration vitest run",
    "test:integration:git": "TEST_TYPE=integration TEST_CATEGORY=git vitest run tests/integration/remote-api/",
    "test:integration:mcp": "TEST_TYPE=integration vitest run tests/integration/mcp-protocol/",
    "test:integration:fs": "TEST_TYPE=integration vitest run tests/integration/file-system/"
  }
}
```

---

## Benefits

### Before Refactoring

- ❌ Git lock conflicts (parallel tests + shared cache)
- ❌ Slow tests (all tests do git operations)
- ❌ Flaky tests (network-dependent)
- ❌ Can't run in parallel

### After Refactoring

- ✅ No git lock conflicts (git tests sequential, loading tests use mocks)
- ✅ Fast agent loading tests (no network, use fixtures)
- ✅ Reliable tests (deterministic fixtures)
- ✅ Most tests can run in parallel

---

## Testing Strategy

### Local Development

```bash
# Fast - Run mocked tests (parallel)
npm run test:integration:mcp

# Slow - Run git tests (sequential)
npm run test:integration:git

# All integration tests
npm run test:integration
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
- name: Integration Tests (File System)
  run: npm run test:integration:fs
  # Fast, parallel

- name: Integration Tests (MCP Protocol)
  run: npm run test:integration:mcp
  # Fast, parallel, uses fixtures

- name: Integration Tests (Git Operations)
  run: npm run test:integration:git
  # Slow, sequential, real git
```

---

## Migration Checklist

- [ ] Create fixture directory structure
- [ ] Add sample agent fixture
- [ ] Create mock helper utility
- [ ] Refactor `dynamic-agent-loading.spec.ts` to use mock
- [ ] Update vitest config for sequential git tests
- [ ] Add test category scripts to package.json
- [ ] Run tests to verify no conflicts
- [ ] Update test documentation
- [ ] Update CI/CD configuration

---

## Next Steps

Would you like me to:

1. **Implement the mock helper** (`tests/support/mock-git-resolver.ts`)
2. **Create the fixture structure** with sample agent
3. **Refactor dynamic-agent-loading.spec.ts** to use the mock
4. **Update vitest config** for sequential git tests

Let's start with step 1 - shall I implement the mock helper?
