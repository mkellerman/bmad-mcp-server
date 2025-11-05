# Integration Tests

Tests that validate how components work together, including real I/O operations, external dependencies, and multi-component interactions.

## Characteristics

- 🐢 **Moderate Speed**: 5-30 seconds execution time
- 🌐 **Real Dependencies**: File system, network APIs, MCP protocol
- 📦 **Multi-Component**: Tests 2+ modules interacting
- ⚠️ **Environmental**: May fail due to external factors (network, API limits)

## Organization

### `mcp-protocol/` - MCP Client ↔ Server

Tests MCP server functionality via stdio protocol (no LLM involved).

**What it tests:**

- MCP server lifecycle (start, health check, shutdown)
- Tool registration and discovery
- Tool execution via MCP protocol
- Dynamic agent loading through MCP
- Error handling and edge cases

**Files:**

- **`server-health.spec.ts`** - Server initialization and health checks
- **`bmad-tool.spec.ts`** - BMAD unified tool execution via MCP
- **`dynamic-agent-loading.spec.ts`** - Agent loading through MCP server

**Run with:**

```bash
npm run test:integration -- tests/integration/mcp-protocol/
```

**Example test:**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  MCPClientFixture,
  createMCPClient,
} from '../../support/mcp-client-fixture';

describe('MCP Tool Execution', () => {
  let mcpClient: MCPClientFixture;

  beforeAll(async () => {
    mcpClient = await createMCPClient();
  });

  afterAll(async () => {
    await mcpClient.cleanup();
  });

  it('should execute bmad tool with agent command', async () => {
    const result = await mcpClient.callTool('bmad', { command: 'analyst' });
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Mary');
  });
});
```

---

### `remote-api/` - External API Integration

Tests integration with external services (GitHub API, remote registries).

**What it tests:**

- GitHub repository discovery
- Remote BMAD installation detection
- Remote manifest fetching
- Network error handling
- API rate limiting

**Files:**

- **`remote-discovery.spec.ts`** - GitHub repository discovery via MCP
- **`remote-registry.test.ts`** - Remote registry API integration

**Run with:**

```bash
npm run test:integration -- tests/integration/remote-api/
```

**Example test:**

```typescript
import { describe, it, expect } from 'vitest';
import { discoverRemoteRepository } from '../../../src/services/remote-discovery.js';

describe('Remote Repository Discovery', () => {
  it('should discover BMAD installation in GitHub repo', async () => {
    const result = await discoverRemoteRepository('owner/repo');

    expect(result.found).toBe(true);
    expect(result.bmadRoot).toContain('bmad');
    expect(result.modules).toContain('core');
  });

  it('should handle repository not found', async () => {
    const result = await discoverRemoteRepository('invalid/repo-404');

    expect(result.found).toBe(false);
    expect(result.error).toContain('not found');
  });
});
```

---

### `file-system/` - File System Integration

Tests real file system operations (reading, scanning, discovery).

**What it tests:**

- BMAD installation detection from disk
- Manifest loading from files
- Directory traversal and scanning
- v6 inventory generation
- Multi-module discovery

**Files:**

- **`bmad-integration.test.ts`** - Complete BMAD installation loading
- **`no-installation.test.ts`** - Behavior when no BMAD found
- **`remote-discovery.test.ts`** - Remote installation detection on disk
- **`v6-inventory.test.ts`** - v6 format directory scanning

**Run with:**

```bash
npm run test:integration -- tests/integration/file-system/
```

**Example test:**

```typescript
import { describe, it, expect } from 'vitest';
import { findBmadInstallations } from '../../../src/utils/bmad-root-finder.js';
import { loadManifest } from '../../../src/utils/manifest-loader.js';

describe('BMAD Installation Loading', () => {
  it('should find BMAD installation in project', async () => {
    const installations = await findBmadInstallations(process.cwd());

    expect(installations.length).toBeGreaterThan(0);
    expect(installations[0].source).toBe('package');
  });

  it('should load manifest from installation', async () => {
    const installations = await findBmadInstallations(process.cwd());
    const manifest = await loadManifest(installations[0].path);

    expect(manifest.agents).toBeDefined();
    expect(manifest.workflows).toBeDefined();
  });
});
```

---

## Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific subdirectory
npm run test:integration -- tests/integration/mcp-protocol/
npm run test:integration -- tests/integration/remote-api/
npm run test:integration -- tests/integration/file-system/

# Run single test file
npm run test:integration -- tests/integration/mcp-protocol/server-health.spec.ts

# Run in watch mode
npm run test:integration -- --watch

# Run with verbose output
npm run test:integration -- --reporter=verbose
```

---

## Writing Integration Tests

### MCP Protocol Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  MCPClientFixture,
  createMCPClient,
} from '../../support/mcp-client-fixture';

describe('MCP Feature', () => {
  let mcpClient: MCPClientFixture;

  beforeAll(async () => {
    mcpClient = await createMCPClient();
  });

  afterAll(async () => {
    await mcpClient.cleanup();
  });

  it('should test MCP interaction', async () => {
    const result = await mcpClient.callTool('bmad', {
      command: '*list-agents',
    });
    expect(result.isError).toBe(false);
  });
});
```

### File System Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { findBmadInstallations } from '../../../src/utils/bmad-root-finder.js';

describe('File System Feature', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'bmad-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should find BMAD installation', async () => {
    // Create test BMAD structure
    await mkdir(join(testDir, 'bmad', 'core'), { recursive: true });
    await writeFile(
      join(testDir, 'bmad', 'core', 'agents.csv'),
      'name,file\nanalyst,agents/analyst.md',
    );

    const installations = await findBmadInstallations(testDir);
    expect(installations.length).toBe(1);
  });
});
```

### Remote API Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { fetchRemoteManifest } from '../../../src/services/remote-discovery.js';

describe('Remote API Feature', () => {
  it('should fetch manifest from GitHub', async () => {
    const manifest = await fetchRemoteManifest('owner/repo', 'main');

    expect(manifest).toBeDefined();
    expect(manifest.agents).toBeInstanceOf(Array);
  }, 10000); // 10s timeout for network call

  it('should handle network errors gracefully', async () => {
    await expect(fetchRemoteManifest('invalid/repo', 'main')).rejects.toThrow();
  });
});
```

---

## Best Practices

1. **Clean up resources** - Always use `afterAll`/`afterEach` hooks
2. **Isolate tests** - Each test should be independent
3. **Handle timeouts** - Set appropriate timeouts for network/I/O operations
4. **Mock sparingly** - Use real dependencies when possible (it's integration!)
5. **Test error cases** - Network failures, file not found, invalid input
6. **Use fixtures** - Shared setup utilities (e.g., `createMCPClient()`)
7. **Document dependencies** - Note external services required (GitHub API, etc.)

---

## Troubleshooting

### MCP Client Connection Errors

```bash
# Check if server starts correctly
npm run dev

# Check server logs in test output
npm run test:integration -- --reporter=verbose
```

### File System Permission Errors

```bash
# Ensure test directories are writable
chmod -R u+w test-results/

# Check temp directory access
ls -la /tmp/
```

### Network/API Failures

```bash
# Check network connectivity
curl https://api.github.com

# Check rate limits
curl -I https://api.github.com/rate_limit
```

### Test Timeouts

```typescript
// Increase timeout for slow operations
it('should complete slow operation', async () => {
  // test code
}, 30000); // 30 second timeout
```

---

## Related Documentation

- [Unit Tests](../unit/README.md)
- [E2E Tests](../e2e/README.md)
- [MCP Client Fixture](../support/mcp-client-fixture.ts)
- [Main Test README](../README.md)
