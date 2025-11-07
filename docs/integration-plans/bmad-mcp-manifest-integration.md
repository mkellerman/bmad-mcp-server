# BMAD-MCP Manifest Integration Project Plan

**Status:** Planning Phase  
**Date:** November 7, 2025  
**Project Type:** Cross-Repository Integration  
**Complexity:** Medium-High

---

## Executive Summary

Integrate BMAD-METHOD's `ManifestGenerator` into `bmad-mcp-server` to enable fast, manifest-based resource loading with multi-source deduplication and hash-based integrity checking.

### Goals

- ✅ Reduce MCP server startup time (CSV parsing vs runtime XML/YAML parsing)
- ✅ Enable file integrity verification via SHA256 hashes
- ✅ Consolidate metadata extraction logic in single source of truth
- ✅ Support multi-source BMAD roots with priority-based deduplication

### Success Metrics

- 50%+ faster agent/workflow metadata loading
- Zero metadata extraction logic duplication
- Complete test coverage for multi-source scenarios
- Backward compatible with existing bmad-mcp-server deployments

---

## Project Phases

### Phase 1: Analysis & Architecture (Stories 1-3)

**Owner:** Architect + Analyst  
**Duration:** 2-3 days  
**Dependencies:** None

#### Deliverables

1. **ManifestGenerator Extraction Analysis**
   - Identify coupling to installer-specific logic
   - Document public API surface needed
   - List dependencies to extract/refactor
2. **Merge Architecture Design**
   - Multi-source manifest loading strategy
   - Priority-based deduplication algorithm
   - Conflict resolution rules
   - Caching and staleness detection
3. **Technical Specification**
   - API contracts and data structures
   - Sequence diagrams for key flows
   - Error handling strategy
   - Migration path for existing deployments

**Acceptance Criteria:**

- [ ] Architecture document approved
- [ ] API contracts defined and agreed
- [ ] All edge cases identified and documented

---

### Phase 2: BMAD-METHOD Refactoring (Story 4)

**Owner:** Developer  
**Duration:** 1-2 days  
**Dependencies:** Phase 1 complete

#### Tasks

1. Extract `ManifestGenerator` to standalone module
2. Remove installer-specific dependencies
3. Create clean public API with TypeScript definitions
4. Add proper exports in package.json
5. Maintain backward compatibility with existing installer

#### Files to Modify

- `tools/cli/installers/lib/core/manifest-generator.js`
- `package.json` (add exports)
- Create: `tools/lib/manifest-generator/` (new standalone location)

**Acceptance Criteria:**

- [ ] ManifestGenerator works standalone (no installer deps)
- [ ] Existing installer still functions correctly
- [ ] Public API documented with JSDoc
- [ ] Unit tests pass

---

### Phase 3: bmad-mcp-server Integration (Stories 5-8)

**Owner:** Developer  
**Duration:** 3-4 days  
**Dependencies:** Phase 2 complete

#### Story 5: Dependency Setup

```json
// bmad-mcp-server/package.json
{
  "dependencies": {
    "bmad-method": "file:../BMAD-METHOD" // Local dev
  }
}
```

#### Story 6: ManifestCache Implementation

Create `src/core/manifest-cache.ts`:

```typescript
class ManifestCache {
  // Generate manifests for a bmad_root if missing/stale
  async ensureManifest(bmadRoot: string): Promise<void>;

  // Load manifest CSVs from a bmad_root
  async loadAgentManifest(bmadRoot: string): Promise<AgentMetadata[]>;
  async loadWorkflowManifest(bmadRoot: string): Promise<Workflow[]>;
  async loadFilesManifest(bmadRoot: string): Promise<FileEntry[]>;

  // Merge manifests from all sources with priority
  async getAllAgents(): Promise<AgentMetadata[]>;
  async getAllWorkflows(): Promise<Workflow[]>;

  // Utility methods
  private detectModules(bmadRoot: string): Promise<string[]>;
  private isManifestStale(bmadRoot: string): Promise<boolean>;
  private deduplicateByPriority<T>(items: T[], keyFn): T[];
}
```

#### Story 7: Multi-Source Deduplication

Implement priority-based merge algorithm:

```typescript
private deduplicateByPriority<T>(
  items: Array<T & { _source: string; _priority: number }>,
  keyFn: (item: T) => string
): T[] {
  const map = new Map();

  for (const item of items) {
    const key = keyFn(item);
    const existing = map.get(key);

    // Keep item with LOWER priority number (higher priority)
    if (!existing || item._priority < existing._priority) {
      map.set(key, item);
    }
  }

  // Remove internal tracking fields
  return Array.from(map.values()).map(
    ({ _source, _priority, ...item }) => item
  );
}
```

#### Story 8: ResourceLoaderGit Updates

Modify `src/core/resource-loader.ts`:

```typescript
class ResourceLoaderGit {
  private manifestCache: ManifestCache;

  constructor(projectRoot?: string, gitRemotes?: string[]) {
    this.manifestCache = new ManifestCache(this);
  }

  async listAgentsWithMetadata(): Promise<AgentMetadata[]> {
    // Try manifest-based loading first
    try {
      return await this.manifestCache.getAllAgents();
    } catch (error) {
      // Fallback to runtime scanning (existing behavior)
      return await this.scanAgentsRuntime();
    }
  }
}
```

**Acceptance Criteria:**

- [ ] ManifestCache generates/loads manifests correctly
- [ ] Multi-source deduplication works with priority order
- [ ] ResourceLoaderGit uses manifests when available
- [ ] Fallback to runtime scanning on errors
- [ ] All existing tests pass

---

### Phase 4: Enhanced Features (Story 9)

**Owner:** Developer  
**Duration:** 1-2 days  
**Dependencies:** Phase 3 complete

#### Hash-Based Integrity Features

```typescript
class ManifestCache {
  /**
   * Detect files that have been modified since installation
   */
  async detectModifiedFiles(bmadRoot: string): Promise<string[]> {
    const manifest = await this.loadFilesManifest(bmadRoot);
    const modified = [];

    for (const entry of manifest) {
      const currentHash = await this.calculateHash(entry.path);
      if (currentHash !== entry.hash) {
        modified.push(entry.path);
      }
    }

    return modified;
  }

  /**
   * Verify integrity of all files in a bmad_root
   */
  async verifyIntegrity(bmadRoot: string): Promise<IntegrityReport> {
    const manifest = await this.loadFilesManifest(bmadRoot);
    const report = { valid: [], modified: [], missing: [] };

    for (const entry of manifest) {
      if (!existsSync(entry.path)) {
        report.missing.push(entry.path);
      } else {
        const hash = await this.calculateHash(entry.path);
        if (hash === entry.hash) {
          report.valid.push(entry.path);
        } else {
          report.modified.push(entry.path);
        }
      }
    }

    return report;
  }
}
```

**Acceptance Criteria:**

- [ ] Hash calculation matches BMAD-METHOD implementation
- [ ] Modified file detection works across all sources
- [ ] Integrity verification produces accurate reports

---

### Phase 5: Testing (Stories 10-12)

**Owner:** Test Architect + Developer  
**Duration:** 3-4 days  
**Dependencies:** Phase 4 complete

#### Test Coverage Requirements

**Unit Tests:**

- ManifestCache generation per bmad_root
- CSV parsing and validation
- Deduplication algorithm correctness
- Hash calculation and verification
- Error handling (missing files, corrupt CSVs, etc.)

**Integration Tests:**

```typescript
describe('Multi-source manifest loading', () => {
  it('should prioritize project over user over git', async () => {
    // Setup: 3 bmad_roots with same agent
    const fixtures = {
      project: { agents: [{ name: 'pm', version: 'v3' }] },
      user: { agents: [{ name: 'pm', version: 'v2' }] },
      git: { agents: [{ name: 'pm', version: 'v1' }] },
    };

    const result = await cache.getAllAgents();

    // Should get project version (highest priority)
    expect(result.find((a) => a.name === 'pm').version).toBe('v3');
  });

  it('should merge agents from different modules', async () => {
    // project has bmm.pm, user has cis.innovator
    const result = await cache.getAllAgents();
    expect(result.length).toBe(2);
  });

  it('should detect modified files via hash mismatch', async () => {
    // Modify a file after manifest generation
    const modified = await cache.detectModifiedFiles(projectRoot);
    expect(modified).toContain('core/agents/bmad-master.md');
  });
});
```

**E2E Tests:**

- Full MCP server startup with multi-source
- Agent execution from different sources
- Workflow execution with merged metadata
- Resource loading with integrity verification

**Acceptance Criteria:**

- [ ] 90%+ code coverage for new code
- [ ] All edge cases tested
- [ ] Performance benchmarks documented
- [ ] No regressions in existing functionality

---

### Phase 6: Documentation & Optimization (Stories 13-14)

**Owner:** Technical Writer + Developer  
**Duration:** 2 days  
**Dependencies:** Phase 5 complete

#### Documentation Updates

**BMAD-METHOD:**

- ManifestGenerator standalone usage guide
- API reference documentation
- Examples for external consumers

**bmad-mcp-server:**

- Multi-source configuration guide
- Manifest caching behavior documentation
- Performance comparison (manifest vs runtime)
- Troubleshooting guide

#### Performance Optimization

- Benchmark manifest loading vs runtime parsing
- Optimize caching strategy (memory vs disk)
- Add manifest staleness detection (timestamps)
- Document performance improvements

**Acceptance Criteria:**

- [ ] All documentation updated
- [ ] Performance benchmarks show 50%+ improvement
- [ ] Optimization applied and tested

---

## Implementation Order

### Sprint 1: Foundation (Week 1)

1. ✅ Analysis & Architecture (Stories 1-3)
2. ✅ ManifestGenerator extraction (Story 4)
3. ✅ Dependency setup (Story 5)

### Sprint 2: Core Implementation (Week 2)

4. ✅ ManifestCache implementation (Story 6)
5. ✅ Deduplication logic (Story 7)
6. ✅ ResourceLoaderGit integration (Story 8)

### Sprint 3: Features & Testing (Week 3)

7. ✅ Hash-based features (Story 9)
8. ✅ Test strategy & unit tests (Stories 10-11)
9. ✅ Integration tests (Story 12)

### Sprint 4: Polish & Ship (Week 4)

10. ✅ Documentation (Story 13)
11. ✅ Performance optimization (Story 14)
12. ✅ Final testing and release

---

## Risk Assessment

| Risk                                         | Probability | Impact | Mitigation                                         |
| -------------------------------------------- | ----------- | ------ | -------------------------------------------------- |
| ManifestGenerator too coupled to installer   | Medium      | High   | Careful extraction with wrapper layer if needed    |
| TypeScript/CommonJS compatibility issues     | Low         | Medium | Use proper module resolution, add type definitions |
| Performance regression with multiple sources | Low         | Medium | Aggressive caching, lazy generation                |
| Manifest staleness causing stale data        | Medium      | Medium | Timestamp-based staleness detection                |
| Breaking changes to existing MCP clients     | Low         | High   | Maintain backward compatibility, feature flags     |

---

## Agent Assignments

### Phase 1-2: Architecture & Refactoring

- **Winston (Architect):** Design manifest merge architecture
- **Mary (Analyst):** Analyze ManifestGenerator extraction needs
- **Amelia (Developer):** Refactor ManifestGenerator

### Phase 3-4: Integration & Features

- **Amelia (Developer):** Implement ManifestCache and integration
- **Winston (Architect):** Review architecture compliance

### Phase 5: Testing

- **Murat (Test Architect):** Design test strategy
- **Amelia (Developer):** Implement tests
- **Diana (Debug):** Root cause analysis for any issues

### Phase 6: Documentation

- **Paige (Technical Writer):** Create all documentation
- **Amelia (Developer):** Performance optimization

---

## Success Criteria

### Technical

- ✅ ManifestGenerator works standalone
- ✅ bmad-mcp-server uses manifests for all metadata
- ✅ Multi-source deduplication works correctly
- ✅ Hash-based integrity checking functional
- ✅ 90%+ test coverage
- ✅ 50%+ performance improvement

### Process

- ✅ All code reviewed by architect
- ✅ Documentation complete and accurate
- ✅ No breaking changes to existing deployments
- ✅ Migration guide provided

### Business

- ✅ Faster MCP server startup
- ✅ Better file integrity guarantees
- ✅ Simplified maintenance (one parser)
- ✅ Foundation for future enhancements

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Enable BMAD agents** in MCP configuration
3. **Execute Phase 1** (Analysis & Architecture)
4. **Create GitHub issues** for each story
5. **Set up project board** for tracking
6. **Begin implementation** Sprint 1

---

## Notes

- This is a **cross-repository** project requiring coordination
- Consider using **feature branches** in both repos
- Test with **local file:// dependency** before publishing
- Plan for **BMAD-METHOD npm publication** if needed
- Monitor **bmad-mcp-server backward compatibility** throughout
