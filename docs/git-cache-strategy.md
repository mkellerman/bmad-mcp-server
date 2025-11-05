# Git Cache Strategy - Solutions Analysis

## Current Behavior

### Auto-Update Mode (Default)

```typescript
// src/config.ts
const gitAutoUpdate = toBool(env.BMAD_AUTO_UPDATE_GIT, true); // Default: TRUE

// src/utils/git-source-resolver.ts
if (this.autoUpdate) {
  // ALWAYS pulls latest on every access
  await this.updateRepository(spec, cachePath, gitUrl);
}
```

**Current Flow:**

```
1. Check if cache exists
2. If exists + autoUpdate=true → git pull (EVERY TIME)
3. If exists + autoUpdate=false → use cached version
4. If not exists → git clone
```

**Problem:**

- Tests run in parallel
- ALL tests do `git pull` on the same repository
- Concurrent `git pull` → lock conflicts ❌

---

## Proposed Solutions

### Solution 1: **Default to Cache-First (Reverse Current Behavior)** ⭐ RECOMMENDED

**Philosophy:** "Use cache by default, update only when explicitly requested"

**Changes:**

```typescript
// Default: Use cache (don't auto-update)
const gitAutoUpdate = toBool(env.BMAD_AUTO_UPDATE_GIT, false); // Changed to FALSE

// Add explicit update command
*update-cache @remote   // Force update specific remote
*update-cache           // Force update all remotes
```

**Behavior:**

```
Normal operation:
  → Use cache if exists (fast, no git operations)

When user wants latest:
  → bmad *update-cache @awesome
  → Does git pull
  → Shows "Updated @awesome to commit abc123"

On first use (no cache):
  → Clones repository (one-time setup)
```

**Benefits:**

- ✅ Fast - no git operations on every use
- ✅ No lock conflicts - cache is read-only
- ✅ Predictable - same results until explicit update
- ✅ Tests work reliably
- ✅ User controls when to update

**Trade-offs:**

- Users must manually update to get latest agents
- Could miss new agents/updates

**Implementation:**

```typescript
// 1. Change default in config.ts
const gitAutoUpdate = toBool(env.BMAD_AUTO_UPDATE_GIT, false);

// 2. Add update-cache command
// src/tools/internal/update-cache.ts
export async function handleUpdateCache(
  remoteName?: string,
  masterManifestService?: MasterManifestService,
): Promise<ToolResponse> {
  if (remoteName) {
    // Update specific remote
    await gitResolver.forceUpdate(remoteUrl);
    return { content: `✅ Updated ${remoteName}`, success: true };
  } else {
    // Update all remotes
    for (const remote of remotes) {
      await gitResolver.forceUpdate(remote.url);
    }
    return { content: `✅ Updated all remotes`, success: true };
  }
}
```

---

### Solution 2: **Time-Based Cache Invalidation**

**Philosophy:** "Cache is valid for X hours, then auto-update"

**Changes:**

```typescript
class GitSourceResolver {
  private cacheTTL: number = 24 * 60 * 60 * 1000; // 24 hours

  async resolve(gitUrl: string): Promise<string> {
    if (cacheExists) {
      const metadata = await this.loadMetadata(cachePath);
      const cacheAge = Date.now() - new Date(metadata.lastPull).getTime();

      if (cacheAge > this.cacheTTL) {
        // Cache expired → update
        await this.updateRepository(spec, cachePath, gitUrl);
      } else {
        // Cache fresh → use it
        logger.info(
          `Using cached version (${Math.floor(cacheAge / 1000 / 60)} minutes old)`,
        );
      }
    }
  }
}
```

**Configuration:**

```bash
BMAD_GIT_CACHE_TTL=86400  # 24 hours (default)
BMAD_GIT_CACHE_TTL=0      # Always update (current behavior)
BMAD_GIT_CACHE_TTL=-1     # Never update (cache forever)
```

**Benefits:**

- ✅ Balance between freshness and performance
- ✅ Automatic updates (users don't need to think about it)
- ✅ Fewer git operations (only when cache is stale)

**Trade-offs:**

- Tests might fail if cache expires during test run
- Still possible (but less likely) to have concurrent updates

---

### Solution 3: **Distributed Lock for Git Operations**

**Philosophy:** "Allow concurrent reads, serialize git updates"

**Implementation:**

```typescript
// src/utils/git-lock.ts
import { open, writeFile } from 'fs/promises';

class GitLockManager {
  private locks = new Map<string, Promise<void>>();

  async withLock<T>(
    cacheKey: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // If operation already in progress, wait for it
    if (this.locks.has(cacheKey)) {
      await this.locks.get(cacheKey);
      // After wait, use the cached result
      return operation();
    }

    // Start new operation
    const promise = this.executeWithLock(cacheKey, operation);
    this.locks.set(cacheKey, promise.then(() => {}).catch(() => {}));

    try {
      return await promise;
    } finally {
      this.locks.delete(cacheKey);
    }
  }

  private async executeWithLock<T>(
    cacheKey: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const lockFile = `/tmp/bmad-git-${cacheKey}.lock`;
    const fd = await open(lockFile, 'wx'); // Exclusive write

    try {
      await writeFile(fd, `${process.pid}`);
      return await operation();
    } finally {
      await fd.close();
      await fs.unlink(lockFile).catch(() => {});
    }
  }
}

// Usage in GitSourceResolver
async resolve(gitUrl: string): Promise<string> {
  const cacheKey = `${spec.host}-${spec.org}-${spec.repo}-${spec.ref}`;

  return await gitLockManager.withLock(cacheKey, async () => {
    // Git operations here
    // Only one process can execute this at a time
    // Other processes wait and then use the result
  });
}
```

**Benefits:**

- ✅ Allows parallel test execution
- ✅ Prevents concurrent git operations
- ✅ Automatic queueing

**Trade-offs:**

- More complex
- Lock files need cleanup
- Requires process-level coordination

---

### Solution 4: **Test-Specific Git Cache** ⭐ BEST FOR TESTS

**Philosophy:** "Tests use isolated cache directories"

**Implementation:**

```typescript
// tests/support/test-git-cache.ts
export async function setupTestGitCache(): Promise<string> {
  const testCacheDir = path.join(
    os.tmpdir(),
    'bmad-test-cache',
    `git-${Date.now()}-${process.pid}`,
  );

  // Set env var for this test
  process.env.BMAD_GIT_CACHE_DIR = testCacheDir;

  return testCacheDir;
}

// In test files
describe('Remote Integration', () => {
  let testCache: string;

  beforeAll(async () => {
    testCache = await setupTestGitCache();
    mcpClient = await createMCPClient();
  });

  afterAll(async () => {
    await rm(testCache, { recursive: true, force: true });
  });
});
```

**Benefits:**

- ✅ Complete test isolation
- ✅ Tests can run in parallel
- ✅ No shared state
- ✅ Clean slate per test

**Trade-offs:**

- Each test clones repositories (slower, more network)
- Uses more disk space

---

### Solution 5: **Hybrid: Cache-First + Background Updates**

**Philosophy:** "Use cache immediately, update in background"

**Implementation:**

```typescript
class GitSourceResolver {
  async resolve(gitUrl: string): Promise<string> {
    if (cacheExists && isValidCache) {
      // Return cache immediately
      const result = this.getCachedPath(cachePath, spec);

      // Start background update (don't await)
      this.backgroundUpdate(spec, cachePath, gitUrl).catch((err) =>
        logger.warn('Background update failed:', err),
      );

      return result;
    }

    // No cache → must clone synchronously
    return await this.cloneRepository(spec, cachePath, gitUrl);
  }

  private async backgroundUpdate(spec, cachePath, gitUrl) {
    // Wait a bit to avoid thundering herd
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 5000));

    // Try to update (may fail if another process is updating)
    try {
      await this.updateRepository(spec, cachePath, gitUrl);
    } catch (err) {
      // Ignore lock errors - another process is updating
      if (!err.message.includes('lock')) throw err;
    }
  }
}
```

**Benefits:**

- ✅ Fast response (uses cache)
- ✅ Eventually consistent (updates in background)
- ✅ Lock errors are harmless

**Trade-offs:**

- Users see old version initially
- Background process consumes resources

---

## Recommendation: Combined Approach

### For Production: **Solution 1 (Cache-First) + Solution 2 (TTL)**

```typescript
// config.ts
const gitAutoUpdate = toBool(env.BMAD_AUTO_UPDATE_GIT, false); // Cache-first
const gitCacheTTL = parseInt(env.BMAD_GIT_CACHE_TTL || '86400', 10); // 24h

// git-source-resolver.ts
async resolve(gitUrl: string): Promise<string> {
  if (cacheExists && isValidCache) {
    const cacheAge = Date.now() - new Date(metadata.lastPull).getTime();

    if (this.autoUpdate || cacheAge > this.cacheTTL) {
      // Auto-update enabled OR cache expired → update
      await this.updateRepository(spec, cachePath, gitUrl);
    } else {
      // Use cache
      logger.info(`Using cache (age: ${formatAge(cacheAge)})`);
    }
  }
}
```

**Environment Variables:**

```bash
# Production defaults
BMAD_AUTO_UPDATE_GIT=false    # Cache-first
BMAD_GIT_CACHE_TTL=86400      # Update after 24h

# Development (always fresh)
BMAD_AUTO_UPDATE_GIT=true
BMAD_GIT_CACHE_TTL=0

# Tests (never update)
BMAD_AUTO_UPDATE_GIT=false
BMAD_GIT_CACHE_TTL=-1         # Cache forever
```

**Commands:**

```bash
bmad *update-cache             # Force update all
bmad *update-cache @awesome    # Force update one remote
```

### For Tests: **Solution 4 (Isolated Cache)**

```typescript
// Each test suite gets its own cache
beforeAll(async () => {
  testCache = await setupTestGitCache();
  process.env.BMAD_AUTO_UPDATE_GIT = 'false';
});
```

---

## Summary

| Solution             | Production | Tests  | Complexity | Speed  | Freshness |
| -------------------- | ---------- | ------ | ---------- | ------ | --------- |
| 1. Cache-First       | ⭐⭐⭐     | ⭐⭐   | Low        | Fast   | Manual    |
| 2. TTL               | ⭐⭐       | ⭐     | Medium     | Fast   | Auto      |
| 3. Lock Manager      | ⭐         | ⭐⭐⭐ | High       | Medium | Auto      |
| 4. Isolated Cache    | ❌         | ⭐⭐⭐ | Low        | Slow   | N/A       |
| 5. Background Update | ⭐⭐       | ❌     | High       | Fast   | Auto      |

**Recommended:**

- **Production:** Solution 1 + 2 (Cache-first with TTL)
- **Tests:** Solution 4 (Isolated cache per test)
- **Commands:** Add `*update-cache` for manual updates

---

## Implementation Priority

1. **Quick Win (Now):** Disable auto-update for tests

   ```typescript
   // tests/setup.ts
   process.env.BMAD_AUTO_UPDATE_GIT = 'false';
   ```

2. **Short-term:** Change default to cache-first

   ```typescript
   // src/config.ts
   const gitAutoUpdate = toBool(env.BMAD_AUTO_UPDATE_GIT, false);
   ```

3. **Medium-term:** Add TTL and update command
   - Add `BMAD_GIT_CACHE_TTL` support
   - Implement `*update-cache` command

4. **Long-term:** Isolated test caches
   - Create `setupTestGitCache()` helper
   - Update all integration tests

Would you like me to implement step 1 (quick win) now?
