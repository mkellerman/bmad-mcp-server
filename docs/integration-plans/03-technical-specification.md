# Technical Specification: Manifest Integration

**Date:** November 7, 2025  
**Status:** Ready for Implementation  
**Phase:** 1 - Analysis & Architecture (Complete)  
**Dependencies:** Story 1 (Analysis) + Story 2 (Architecture)

---

## Document Purpose

This specification provides complete implementation guidance for integrating BMAD-METHOD's ManifestGenerator into bmad-mcp-server. It combines analysis findings with architectural design to create actionable implementation tasks.

---

## 1. Implementation Checklist

### Phase 1: Foundation ✅ COMPLETE

- [x] Story 1: ManifestGenerator analysis
- [x] Story 2: Architecture design
- [x] Story 3: Technical specification

### Phase 2: Setup (Story 4)

- [ ] Create feature branch `feature/manifest-integration`
- [ ] Add `fs-extra` to package.json
- [ ] Add `bmad-method` as local dependency
- [ ] Update TypeScript configuration for CommonJS imports
- [ ] Run `npm install` and verify no errors

### Phase 3: Core Implementation (Stories 5-8)

- [ ] Story 5: Create `src/core/manifest-cache.ts`
  - [ ] Implement ManifestCache class structure
  - [ ] Implement `detectModules()` method
  - [ ] Implement `walkDirectory()` method
  - [ ] Implement `generateManifests()` wrapper
  - [ ] Implement CSV loading methods
  - [ ] Add TypeScript types/interfaces
- [ ] Story 6: Implement deduplication logic
  - [ ] Implement `deduplicateByPriority()` method
  - [ ] Implement `getSources()` method
  - [ ] Implement `getAllAgents()` with merge
  - [ ] Implement `getAllWorkflows()` with merge
- [ ] Story 7: Update ResourceLoaderGit
  - [ ] Modify `listAgentsWithMetadata()` to use cache
  - [ ] Modify `listWorkflowsWithMetadata()` to use cache
  - [ ] Extract `scanAgentsRuntime()` fallback method
  - [ ] Add error handling and fallback logic
  - [ ] Add feature flag for gradual rollout

### Phase 4: Testing (Stories 9-11)

- [ ] Story 8: Unit tests
  - [ ] Test `detectModules()`
  - [ ] Test `walkDirectory()`
  - [ ] Test `deduplicateByPriority()`
  - [ ] Test `generateManifests()` wrapper
  - [ ] Test CSV loading methods
  - [ ] Test caching behavior
- [ ] Story 9: Integration tests
  - [ ] Test multi-source loading
  - [ ] Test priority-based deduplication
  - [ ] Test manifest regeneration
  - [ ] Test fallback to runtime scan
  - [ ] Test error scenarios
- [ ] Story 10: E2E validation
  - [ ] Test MCP server startup
  - [ ] Test agent listing via MCP
  - [ ] Test workflow execution
  - [ ] Performance benchmarks

### Phase 5: Documentation

- [ ] Story 11: Update documentation
  - [ ] Document ManifestCache usage
  - [ ] Document configuration options
  - [ ] Document performance characteristics
  - [ ] Update README with new dependency

---

## 2. API Contracts

### 2.1 ManifestCache Interface

```typescript
/**
 * Location: src/core/manifest-cache.ts
 */
export class ManifestCache {
  constructor(resourceLoader: ResourceLoaderGit);

  // Primary operations
  getAllAgents(): Promise<AgentMetadata[]>;
  getAllWorkflows(): Promise<Workflow[]>;
  getAllFiles(): Promise<FileEntry[]>;

  // Cache management
  clearCache(): void;
  regenerate(bmadRoot: string): Promise<void>;
  setTTL(milliseconds: number): void;

  // Internal methods (private)
  private ensureManifests(bmadRoot: string): Promise<void>;
  private generateManifests(bmadRoot: string): Promise<void>;
  private loadManifests(bmadRoot: string): Promise<CachedManifests>;
  private detectModules(bmadRoot: string): Promise<string[]>;
  private walkDirectory(bmadRoot: string): Promise<string[]>;
  private deduplicateByPriority<T>(items: T[], keyFn): T[];
  private getSources(): Promise<ManifestSource[]>;
}
```

### 2.2 Data Structures

```typescript
interface ManifestSource {
  root: string; // Absolute path to bmad_root
  priority: number; // Lower = higher priority (1 = highest)
  type: 'project' | 'user' | 'git';
}

interface CachedManifests {
  agents: AgentMetadata[];
  workflows: Workflow[];
  files: FileEntry[];
  timestamp: number;
}

interface FileEntry {
  type: string; // File extension
  name: string; // Filename without extension
  module: string; // Module name
  path: string; // Relative path
  hash: string; // SHA256 hash
}
```

### 2.3 ResourceLoaderGit Modifications

```typescript
/**
 * Location: src/core/resource-loader.ts
 * Modifications: Add manifestCache, update methods
 */
export class ResourceLoaderGit {
  private manifestCache: ManifestCache; // NEW

  constructor(projectRoot?: string, gitRemotes?: string[]) {
    // ... existing code ...
    this.manifestCache = new ManifestCache(this); // NEW
  }

  // MODIFIED: Use manifest cache with fallback
  async listAgentsWithMetadata(): Promise<AgentMetadata[]> {
    if (process.env.BMAD_USE_MANIFESTS !== 'false') {
      try {
        return await this.manifestCache.getAllAgents();
      } catch (error) {
        console.warn('Manifest cache failed:', error);
      }
    }
    return await this.scanAgentsRuntime();
  }

  // MODIFIED: Use manifest cache with fallback
  async listWorkflowsWithMetadata(): Promise<Workflow[]> {
    if (process.env.BMAD_USE_MANIFESTS !== 'false') {
      try {
        return await this.manifestCache.getAllWorkflows();
      } catch (error) {
        console.warn('Manifest cache failed:', error);
      }
    }
    return await this.scanWorkflowsRuntime();
  }

  // NEW: Extracted fallback method
  private async scanAgentsRuntime(): Promise<AgentMetadata[]> {
    // Existing logic moved here
  }

  // NEW: Extracted fallback method
  private async scanWorkflowsRuntime(): Promise<Workflow[]> {
    // Existing logic from line 1231+
  }
}
```

---

## 3. Dependencies

### 3.1 New Dependencies

```json
{
  "dependencies": {
    "bmad-method": "file:../BMAD-METHOD",
    "fs-extra": "^11.2.0"
  }
}
```

### 3.2 Existing Dependencies (Already in bmad-mcp-server)

- `js-yaml`: ^4.1.0 (YAML parsing)
- `csv-parse`: ^6.1.0 (CSV parsing)
- `crypto`: Built-in (SHA256 hashing)

---

## 4. File Structure

```
bmad-mcp-server/
├── package.json                    # MODIFIED: Add dependencies
├── src/
│   ├── core/
│   │   ├── manifest-cache.ts      # NEW: Main implementation
│   │   ├── resource-loader.ts     # MODIFIED: Use ManifestCache
│   │   └── bmad-engine.ts         # No changes needed
│   └── types/
│       └── index.ts               # MODIFIED: Add FileEntry type
├── tests/
│   ├── unit/
│   │   └── manifest-cache.test.ts # NEW: Unit tests
│   └── integration/
│       └── multi-source.test.ts   # NEW: Integration tests
└── docs/
    └── integration-plans/
        ├── 01-manifest-generator-analysis.md      # ✅ Complete
        ├── 02-architecture-design.md              # ✅ Complete
        └── 03-technical-specification.md          # ✅ Complete (this file)
```

---

## 5. Implementation Sequence

### Step 1: Setup (Story 4) - 30 minutes

```bash
# Create feature branch
git checkout -b feature/manifest-integration

# Add dependencies
npm install --save fs-extra
# Note: bmad-method will be added as file:// dependency

# Update package.json manually:
{
  "dependencies": {
    "bmad-method": "file:../BMAD-METHOD",
    "fs-extra": "^11.2.0"
  }
}

# Install
npm install

# Verify
npm list bmad-method
npm list fs-extra
```

### Step 2: Create ManifestCache (Story 5) - 4 hours

**File:** `src/core/manifest-cache.ts`

**Implementation Order:**

1. Create file with imports and class structure
2. Implement `detectModules()` (simple directory scan)
3. Implement `walkDirectory()` (recursive file collection)
4. Implement `generateManifests()` (wrapper around ManifestGenerator)
5. Implement CSV loading methods (parse agent/workflow/files manifests)
6. Add caching logic and staleness detection

**Testing After Each Method:**

```bash
npm run test:unit -- manifest-cache.test.ts
```

### Step 3: Implement Deduplication (Story 6) - 2 hours

**Methods to Implement:**

1. `getSources()` - Build prioritized source list
2. `deduplicateByPriority()` - Generic deduplication algorithm
3. `getAllAgents()` - Load and merge agents from all sources
4. `getAllWorkflows()` - Load and merge workflows from all sources

**Testing:**

```bash
npm run test:unit -- manifest-cache.test.ts --grep "deduplicate"
npm run test:integration -- multi-source.test.ts
```

### Step 4: Update ResourceLoaderGit (Story 7) - 2 hours

**Modifications:**

1. Add `private manifestCache: ManifestCache` field
2. Initialize in constructor
3. Update `listAgentsWithMetadata()` with try/catch
4. Update `listWorkflowsWithMetadata()` with try/catch
5. Extract existing logic to `scanAgentsRuntime()` and `scanWorkflowsRuntime()`

**Testing:**

```bash
npm run test:integration -- resource-loader.test.ts
npm run test:e2e
```

### Step 5: Comprehensive Testing (Stories 8-10) - 6 hours

**Unit Tests:**

- `detectModules()` with various directory structures
- `walkDirectory()` with exclusions and symlinks
- `deduplicateByPriority()` with edge cases
- Cache freshness logic
- Error handling

**Integration Tests:**

- Multi-source loading (3 bmad_roots)
- Priority-based resolution (same agent in multiple sources)
- Manifest regeneration triggers
- Fallback to runtime scan
- Performance benchmarks

**E2E Tests:**

- Full MCP server startup
- List agents via MCP protocol
- Execute agent via MCP
- Performance comparison (with/without manifests)

---

## 6. Acceptance Criteria

### Story 4: Setup ✅

- [ ] Feature branch created
- [ ] Dependencies installed without errors
- [ ] `bmad-method` accessible via import
- [ ] TypeScript compiles successfully

### Story 5: ManifestCache Implementation ✅

- [ ] `ManifestCache` class exists and compiles
- [ ] `detectModules()` returns correct module list
- [ ] `walkDirectory()` collects all files (excluding node_modules, .git)
- [ ] `generateManifests()` calls ManifestGenerator correctly
- [ ] CSV loading methods parse manifests correctly
- [ ] Caching works (in-memory + staleness detection)
- [ ] Unit tests pass (90%+ coverage)

### Story 6: Deduplication Logic ✅

- [ ] `getSources()` returns correct priority order
- [ ] `deduplicateByPriority()` keeps highest priority item
- [ ] `getAllAgents()` merges agents from all sources
- [ ] `getAllWorkflows()` merges workflows from all sources
- [ ] Integration tests pass for multi-source scenarios
- [ ] Same agent in multiple sources → project wins

### Story 7: ResourceLoaderGit Integration ✅

- [ ] `listAgentsWithMetadata()` uses ManifestCache first
- [ ] `listWorkflowsWithMetadata()` uses ManifestCache first
- [ ] Fallback to runtime scan works on error
- [ ] Feature flag controls behavior
- [ ] All existing tests still pass
- [ ] No breaking changes to public API

### Story 8-10: Testing ✅

- [ ] Unit test coverage ≥ 90%
- [ ] Integration test coverage ≥ 80%
- [ ] E2E tests pass
- [ ] Performance improvement documented (target: 50x+)
- [ ] Error scenarios handled gracefully
- [ ] No regressions in existing functionality

---

## 7. Performance Targets

| Metric             | Current (Runtime) | Target (Manifest) | Improvement     |
| ------------------ | ----------------- | ----------------- | --------------- |
| List 50 agents     | ~500ms            | ~10ms             | **50x faster**  |
| List 100 workflows | ~800ms            | ~15ms             | **53x faster**  |
| Server init        | ~2000ms           | ~50ms             | **40x faster**  |
| Subsequent calls   | ~500ms            | ~1ms              | **500x faster** |

**Measurement Method:**

```typescript
const start = Date.now();
await resourceLoader.listAgentsWithMetadata();
const duration = Date.now() - start;
console.log(`Duration: ${duration}ms`);
```

---

## 8. Error Handling

### Error Types and Responses

| Error                              | Handling Strategy                      |
| ---------------------------------- | -------------------------------------- |
| ManifestGenerator throws error     | Log warning, fall back to runtime scan |
| Manifest file corrupt/missing      | Regenerate manifests, retry once       |
| Permission denied writing manifest | Log warning, use runtime scan only     |
| Module detection fails             | Assume empty modules, continue         |
| CSV parsing error                  | Try regeneration, then runtime scan    |
| Out of memory (large bmad_root)    | Reduce cache TTL, implement streaming  |

### Logging Strategy

```typescript
// Use existing logger from bmad-mcp-server
import { logger } from '../utils/logger.js';

// Log levels
logger.debug('Manifest cache hit for root:', bmadRoot);
logger.info('Generating manifests for root:', bmadRoot);
logger.warn('Manifest cache failed, falling back to runtime scan:', error);
logger.error('Failed to generate manifests:', error);
```

---

## 9. Configuration

### Environment Variables

```bash
# Enable/disable manifest cache (default: enabled)
BMAD_USE_MANIFESTS=true|false

# Cache TTL in milliseconds (default: 300000 = 5 minutes)
BMAD_MANIFEST_TTL=300000

# Force manifest regeneration on startup (default: false)
BMAD_FORCE_REGENERATE=true|false

# Log level for manifest operations (default: info)
BMAD_MANIFEST_LOG_LEVEL=debug|info|warn|error
```

### Usage Example

```bash
# Disable manifest cache (use runtime scan only)
BMAD_USE_MANIFESTS=false npm start

# Reduce cache TTL to 1 minute
BMAD_MANIFEST_TTL=60000 npm start

# Force regeneration and debug logging
BMAD_FORCE_REGENERATE=true BMAD_MANIFEST_LOG_LEVEL=debug npm start
```

---

## 10. Migration & Rollout Plan

### Week 1: Development + Testing

- Implement Stories 4-7
- Unit + integration tests
- Feature flag = **disabled by default**

### Week 2: Alpha Testing

- Enable feature flag in development
- Test with real BMAD configurations
- Measure performance improvements
- Fix any bugs discovered

### Week 3: Beta Testing

- Enable feature flag = **enabled by default**
- Allow opt-out via `BMAD_USE_MANIFESTS=false`
- Monitor for issues
- Collect performance metrics

### Week 4: Production Release

- Remove feature flag (always enabled)
- Keep fallback logic for safety
- Document final performance improvements
- Update all documentation

---

## 11. Risks & Mitigations

| Risk                                  | Impact | Probability | Mitigation                                            |
| ------------------------------------- | ------ | ----------- | ----------------------------------------------------- |
| BMAD-METHOD changes break integration | High   | Low         | Pin to specific version, add integration tests        |
| Performance regression on large roots | Medium | Low         | Benchmark with large fixtures, optimize caching       |
| Windows path compatibility issues     | Medium | Medium      | Use path.posix for relative paths, test on Windows    |
| Manifest staleness causes confusion   | Low    | Medium      | Clear cache on BMAD file changes (future enhancement) |
| Feature flag complexity               | Low    | Low         | Simple boolean check, well-documented                 |

---

## 12. Success Metrics

### Quantitative Metrics

- ✅ Performance improvement ≥ 50x for agent listing
- ✅ Performance improvement ≥ 50x for workflow listing
- ✅ Test coverage ≥ 90% for new code
- ✅ Zero breaking changes to existing API
- ✅ All existing tests pass

### Qualitative Metrics

- ✅ Code is maintainable and well-documented
- ✅ Architecture is extensible for future enhancements
- ✅ Error messages are clear and actionable
- ✅ Integration is transparent to MCP clients
- ✅ Fallback behavior provides safety net

---

## 13. Future Enhancements (Post-MVP)

### Phase 2 Features

1. **File System Watching**
   - Auto-regenerate manifests on file changes
   - Debounce rapid changes

2. **Custom File Detection**
   - Compare hashes to detect user modifications
   - Warn before overwriting customizations

3. **Manifest Diffing**
   - Incremental updates instead of full regeneration
   - Track only changed files

4. **Compression**
   - Gzip large manifest files
   - Transparent decompression

5. **Remote Caching**
   - Share manifests across server instances
   - Redis/Memcached integration

---

## 14. Documentation Requirements

### Code Documentation

- [ ] JSDoc comments for all public methods
- [ ] Type definitions for all interfaces
- [ ] Inline comments for complex logic
- [ ] Example usage in comments

### User Documentation

- [ ] Update README with new dependency
- [ ] Document configuration options
- [ ] Add performance benchmarks
- [ ] Troubleshooting guide

### Developer Documentation

- [ ] Architecture overview
- [ ] Implementation details
- [ ] Testing strategy
- [ ] Contribution guidelines

---

## 15. Definition of Done

### For Each Story

- [ ] Code implemented and compiling
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing (if applicable)
- [ ] Code reviewed by architect
- [ ] Documentation updated
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Performance benchmarks run and documented

### For Overall Project

- [ ] All stories complete
- [ ] All tests passing
- [ ] Performance targets met
- [ ] No regressions in existing functionality
- [ ] Documentation complete
- [ ] Feature flag strategy documented
- [ ] Rollout plan executed
- [ ] Success metrics achieved

---

## Conclusion

This technical specification provides complete implementation guidance for the BMAD-MCP manifest integration project. The approach:

- ✅ Leverages existing, tested code (ManifestGenerator)
- ✅ Maintains backward compatibility (feature flag + fallback)
- ✅ Provides significant performance improvements (50x+ faster)
- ✅ Includes comprehensive testing strategy
- ✅ Has clear acceptance criteria and success metrics
- ✅ Plans for graceful rollout and migration

**Status:** Ready for implementation starting with Story 4 (Setup).

**Next Action:** Create feature branch and begin implementation.
