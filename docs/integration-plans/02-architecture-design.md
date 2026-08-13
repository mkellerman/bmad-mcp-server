# Manifest Merge Architecture Design

**Date:** November 7, 2025  
**Status:** Architecture Design  
**Architect:** Winston (based on ManifestGenerator analysis)  
**Dependencies:** Story 1 (ManifestGenerator Analysis)

---

## Executive Summary

This document defines the architecture for integrating BMAD-METHOD's `ManifestGenerator` into bmad-mcp-server to support multi-source BMAD roots with priority-based manifest merging.

### Architecture Principles

1. **Separation of Concerns:** ManifestCache handles orchestration; ManifestGenerator handles generation
2. **Priority-Based Resolution:** project > user > git remotes (configurable)
3. **Lazy Generation:** Generate manifests on-demand, cache aggressively
4. **Graceful Degradation:** Fall back to runtime scanning if manifest generation fails
5. **No BMAD-METHOD Modifications:** Use as-is via dependency

---

## System Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     bmad-mcp-server                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              ResourceLoaderGit                        │  │
│  │  (Existing - Modified to use ManifestCache)          │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                         │
│                   ▼                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              ManifestCache (NEW)                      │  │
│  │  • ensureManifests()                                 │  │
│  │  • getAllAgents()                                    │  │
│  │  • getAllWorkflows()                                 │  │
│  │  • detectModules()                                   │  │
│  │  • walkDirectory()                                   │  │
│  │  • mergeWithPriority()                               │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                         │
│                   ▼                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          ManifestGenerator Adapter (NEW)             │  │
│  │  • Wraps BMAD-METHOD's ManifestGenerator             │  │
│  │  • Provides bmad-mcp-server-specific interface       │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                         │
└───────────────────┼─────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────┐
│                    BMAD-METHOD                            │
│                 (npm dependency)                          │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              ManifestGenerator                       │ │
│  │  • generateManifests()                               │ │
│  │  • calculateFileHash()                               │ │
│  │  • collectWorkflows/Agents/Tasks/Tools               │ │
│  └─────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. ManifestCache

**Responsibility:** Orchestrate manifest generation, loading, and merging across multiple bmad_roots.

**Location:** `src/core/manifest-cache.ts`

#### Class Structure

```typescript
import { ManifestGenerator } from 'bmad-method';
import type { AgentMetadata, Workflow } from '../types/index.js';

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

export class ManifestCache {
  private resourceLoader: ResourceLoaderGit;
  private cache: Map<string, CachedManifests>;
  private manifestTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(resourceLoader: ResourceLoaderGit) {
    this.resourceLoader = resourceLoader;
    this.cache = new Map();
  }

  /**
   * Get all agents from all sources, merged with priority
   */
  async getAllAgents(): Promise<AgentMetadata[]> {
    const sources = await this.getSources();
    const allAgents: Array<AgentMetadata & { _priority: number }> = [];

    for (const source of sources) {
      await this.ensureManifests(source.root);
      const manifests = await this.loadManifests(source.root);

      for (const agent of manifests.agents) {
        allAgents.push({ ...agent, _priority: source.priority });
      }
    }

    return this.deduplicateByPriority(
      allAgents,
      (agent) => `${agent.module || 'core'}:${agent.name}`,
    );
  }

  /**
   * Get all workflows from all sources, merged with priority
   */
  async getAllWorkflows(): Promise<Workflow[]> {
    const sources = await this.getSources();
    const allWorkflows: Array<Workflow & { _priority: number }> = [];

    for (const source of sources) {
      await this.ensureManifests(source.root);
      const manifests = await this.loadManifests(source.root);

      for (const workflow of manifests.workflows) {
        allWorkflows.push({ ...workflow, _priority: source.priority });
      }
    }

    return this.deduplicateByPriority(
      allWorkflows,
      (workflow) => `${workflow.module}:${workflow.name}`,
    );
  }

  /**
   * Ensure manifests exist and are fresh for a bmad_root
   */
  private async ensureManifests(bmadRoot: string): Promise<void> {
    // Check if cached and fresh
    if (this.isCacheFresh(bmadRoot)) {
      return;
    }

    // Check if manifests exist on disk and are fresh
    const manifestPath = path.join(bmadRoot, '_cfg', 'manifest.yaml');
    if (await this.isManifestFresh(manifestPath)) {
      return;
    }

    // Generate new manifests
    await this.generateManifests(bmadRoot);
  }

  /**
   * Generate manifests for a bmad_root using ManifestGenerator
   */
  private async generateManifests(bmadRoot: string): Promise<void> {
    const generator = new ManifestGenerator();

    // Detect modules in this root
    const modules = await this.detectModules(bmadRoot);

    // Build complete file list
    const files = await this.walkDirectory(bmadRoot);

    // Generate manifests
    await generator.generateManifests(bmadRoot, modules, files, {
      ides: [],
      preservedModules: [],
    });
  }

  /**
   * Load manifests from disk and cache them
   */
  private async loadManifests(bmadRoot: string): Promise<CachedManifests> {
    const cached = this.cache.get(bmadRoot);
    if (cached && this.isCacheFresh(bmadRoot)) {
      return cached;
    }

    const cfgDir = path.join(bmadRoot, '_cfg');

    const manifests: CachedManifests = {
      agents: await this.loadAgentManifest(cfgDir),
      workflows: await this.loadWorkflowManifest(cfgDir),
      files: await this.loadFilesManifest(cfgDir),
      timestamp: Date.now(),
    };

    this.cache.set(bmadRoot, manifests);
    return manifests;
  }

  /**
   * Load and parse agent-manifest.csv
   */
  private async loadAgentManifest(cfgDir: string): Promise<AgentMetadata[]> {
    const csvPath = path.join(cfgDir, 'agent-manifest.csv');
    const content = await fs.readFile(csvPath, 'utf-8');
    const records = parseCsv(content, {
      columns: true,
      skip_empty_lines: true,
    });

    return records.map((record) => ({
      name: record.name,
      displayName: record.displayName,
      title: record.title,
      icon: record.icon,
      role: record.role,
      description: record.identity,
      communicationStyle: record.communicationStyle,
      principles: record.principles,
      module: record.module,
      // Additional fields populated by runtime if needed
    }));
  }

  /**
   * Load and parse workflow-manifest.csv
   */
  private async loadWorkflowManifest(cfgDir: string): Promise<Workflow[]> {
    const csvPath = path.join(cfgDir, 'workflow-manifest.csv');
    const content = await fs.readFile(csvPath, 'utf-8');
    const records = parseCsv(content, {
      columns: true,
      skip_empty_lines: true,
    });

    return records.map((record) => ({
      name: record.name,
      description: record.description,
      module: record.module,
      path: record.path,
      standalone: record.standalone?.toLowerCase() === 'true',
    }));
  }

  /**
   * Load and parse files-manifest.csv
   */
  private async loadFilesManifest(cfgDir: string): Promise<FileEntry[]> {
    const csvPath = path.join(cfgDir, 'files-manifest.csv');
    const content = await fs.readFile(csvPath, 'utf-8');
    const records = parseCsv(content, {
      columns: true,
      skip_empty_lines: true,
    });

    return records.map((record) => ({
      type: record.type,
      name: record.name,
      module: record.module,
      path: record.path,
      hash: record.hash,
    }));
  }

  /**
   * Deduplicate items by key, keeping highest priority (lowest number)
   */
  private deduplicateByPriority<T>(
    items: Array<T & { _priority: number }>,
    keyFn: (item: T) => string,
  ): T[] {
    const map = new Map<string, T & { _priority: number }>();

    for (const item of items) {
      const key = keyFn(item);
      const existing = map.get(key);

      // Keep item with lower priority number (higher priority)
      if (!existing || item._priority < existing._priority) {
        map.set(key, item);
      }
    }

    // Remove internal _priority field
    return Array.from(map.values()).map(({ _priority, ...item }) => item as T);
  }

  /**
   * Get all bmad_root sources with priority order
   */
  private async getSources(): Promise<ManifestSource[]> {
    const sources: ManifestSource[] = [];

    // Project bmad (highest priority)
    const projectPathInfo = this.resourceLoader.getProjectBmadPath();
    sources.push({
      root: projectPathInfo.bmadRoot,
      priority: 1,
      type: 'project',
    });

    // User bmad
    const userBmad = this.resourceLoader.getPaths().userBmad;
    if (await fs.pathExists(userBmad)) {
      sources.push({
        root: userBmad,
        priority: 2,
        type: 'user',
      });
    }

    // Git remotes (lowest priority)
    const gitPaths = this.resourceLoader.getResolvedGitPaths();
    let gitPriority = 3;
    for (const [_url, localPath] of gitPaths) {
      const pathInfo = this.resourceLoader.detectPathType(localPath);
      sources.push({
        root: pathInfo.bmadRoot,
        priority: gitPriority++,
        type: 'git',
      });
    }

    return sources;
  }

  /**
   * Auto-detect modules in a bmad_root
   */
  private async detectModules(bmadRoot: string): Promise<string[]> {
    const modules: string[] = [];

    const entries = await fs.readdir(bmadRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'core' || entry.name === '_cfg') continue;

      const entryPath = path.join(bmadRoot, entry.name);
      const hasAgents = await fs.pathExists(path.join(entryPath, 'agents'));
      const hasWorkflows = await fs.pathExists(
        path.join(entryPath, 'workflows'),
      );
      const hasTasks = await fs.pathExists(path.join(entryPath, 'tasks'));

      if (hasAgents || hasWorkflows || hasTasks) {
        modules.push(entry.name);
      }
    }

    return modules;
  }

  /**
   * Recursively walk directory and collect all file paths
   */
  private async walkDirectory(bmadRoot: string): Promise<string[]> {
    const files: string[] = [];

    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip excluded directories
        if (entry.isDirectory()) {
          if (['node_modules', '.git', 'cache'].includes(entry.name)) {
            continue;
          }
          await walk(fullPath);
        } else {
          // Skip hidden files
          if (!entry.name.startsWith('.')) {
            files.push(fullPath);
          }
        }
      }
    };

    await walk(bmadRoot);
    return files;
  }

  /**
   * Check if cached manifests are still fresh
   */
  private isCacheFresh(bmadRoot: string): boolean {
    const cached = this.cache.get(bmadRoot);
    if (!cached) return false;

    const age = Date.now() - cached.timestamp;
    return age < this.manifestTTL;
  }

  /**
   * Check if manifest file is fresh (within TTL)
   */
  private async isManifestFresh(manifestPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(manifestPath);
      const age = Date.now() - stats.mtimeMs;
      return age < this.manifestTTL;
    } catch {
      return false;
    }
  }

  /**
   * Clear cache (for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Force regeneration of manifests for a root
   */
  async regenerate(bmadRoot: string): Promise<void> {
    this.cache.delete(bmadRoot);
    await this.generateManifests(bmadRoot);
  }
}
```

---

## 2. ResourceLoaderGit Integration

**Modifications:** Minimal changes to existing class, use ManifestCache as optional fast path.

```typescript
// src/core/resource-loader.ts (modifications)

export class ResourceLoaderGit {
  private manifestCache: ManifestCache;

  constructor(projectRoot?: string, gitRemotes?: string[]) {
    // ... existing initialization ...
    this.manifestCache = new ManifestCache(this);
  }

  /**
   * List all agents with metadata (modified to use ManifestCache)
   */
  async listAgentsWithMetadata(): Promise<AgentMetadata[]> {
    try {
      // FAST PATH: Use manifest cache
      return await this.manifestCache.getAllAgents();
    } catch (error) {
      console.warn(
        'Manifest cache failed, falling back to runtime scanning:',
        error,
      );

      // FALLBACK: Existing runtime scanning logic
      return await this.scanAgentsRuntime();
    }
  }

  /**
   * List all workflows with metadata (modified to use ManifestCache)
   */
  async listWorkflowsWithMetadata(): Promise<Workflow[]> {
    try {
      // FAST PATH: Use manifest cache
      return await this.manifestCache.getAllWorkflows();
    } catch (error) {
      console.warn(
        'Manifest cache failed, falling back to runtime scanning:',
        error,
      );

      // FALLBACK: Existing runtime scanning logic (already exists at line 1231)
      const workflowNames = await this.listWorkflows();
      return workflowNames.map((name) => ({
        name,
        description: '',
        module: 'unknown',
        path: '',
        standalone: true,
      }));
    }
  }

  /**
   * FALLBACK: Runtime agent scanning (existing logic extracted)
   */
  private async scanAgentsRuntime(): Promise<AgentMetadata[]> {
    const agentNames = await this.listAgents();
    const metadata: AgentMetadata[] = [];

    for (const name of agentNames) {
      const meta = await this.getAgentMetadata(name);
      if (meta) {
        metadata.push(meta);
      }
    }

    return metadata;
  }
}
```

---

## 3. Data Flow Diagrams

### 3.1 Manifest Generation Flow

```
┌─────────────┐
│   Request   │ getAllAgents()
│   Agents    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│          ManifestCache.getAllAgents()       │
│                                             │
│  1. getSources() → [project, user, git]     │
│                                             │
│  2. For each source:                        │
│     ├─ ensureManifests(root)                │
│     │  ├─ isCacheFresh? → Skip              │
│     │  ├─ isManifestFresh? → Skip           │
│     │  └─ generateManifests(root)           │
│     │     ├─ detectModules(root)            │
│     │     ├─ walkDirectory(root)            │
│     │     └─ ManifestGenerator.generate()   │
│     │                                        │
│     └─ loadManifests(root)                  │
│        └─ parseCsv(agent-manifest.csv)      │
│                                             │
│  3. deduplicateByPriority(allAgents)        │
│     └─ Keep highest priority per name       │
│                                             │
│  4. Return merged agents                    │
└──────────────┬──────────────────────────────┘
               │
               ▼
         ┌─────────────┐
         │   Agents    │
         │  (Merged)   │
         └─────────────┘
```

---

### 3.2 Priority-Based Deduplication

```
INPUT: Agents from multiple sources

Project bmad:  { name: 'pm', module: 'bmm', _priority: 1, version: 'v3' }
User bmad:     { name: 'pm', module: 'bmm', _priority: 2, version: 'v2' }
Git bmad:      { name: 'pm', module: 'bmm', _priority: 3, version: 'v1' }

         │
         ▼
┌────────────────────────────────────┐
│  deduplicateByPriority()           │
│                                    │
│  Key = "bmm:pm"                    │
│                                    │
│  Map:                              │
│    "bmm:pm" → priority 1 (project) │  ← WINS (lowest priority number)
│                                    │
│  Discard:                          │
│    priority 2 (user)               │
│    priority 3 (git)                │
└────────────┬───────────────────────┘
             │
             ▼

OUTPUT: { name: 'pm', module: 'bmm', version: 'v3' }  (from project)
```

---

## 4. API Contracts

### 4.1 ManifestCache Public API

```typescript
interface IManifestCache {
  // Primary operations
  getAllAgents(): Promise<AgentMetadata[]>;
  getAllWorkflows(): Promise<Workflow[]>;
  getAllFiles(): Promise<FileEntry[]>;

  // Cache management
  clearCache(): void;
  regenerate(bmadRoot: string): Promise<void>;

  // Configuration
  setTTL(milliseconds: number): void;
}
```

---

### 4.2 ManifestGenerator Integration

```typescript
// bmad-method dependency (read-only, no modifications)
import { ManifestGenerator } from 'bmad-method';

// Usage in ManifestCache
const generator = new ManifestGenerator();
const result = await generator.generateManifests(
  bmadRoot, // string: absolute path
  modules, // string[]: module names
  files, // string[]: all file paths
  { ides: [], preservedModules: [] }, // options
);

// Result structure
interface GenerateResult {
  workflows: number;
  agents: number;
  tasks: number;
  tools: number;
  files: number;
  manifestFiles: string[]; // Paths to generated CSVs
}
```

---

## 5. Error Handling Strategy

### Graceful Degradation Layers

```
┌─────────────────────────────────────────┐
│ Layer 1: Manifest Cache (Fastest)      │
│ ├─ In-memory cache (5 min TTL)         │
│ └─ On error → Layer 2                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Layer 2: Disk Manifests (Fast)         │
│ ├─ Read CSV manifests from disk        │
│ └─ On error → Layer 3                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Layer 3: Generate Manifests (Slower)   │
│ ├─ Run ManifestGenerator               │
│ └─ On error → Layer 4                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Layer 4: Runtime Scan (Slowest)        │
│ ├─ Parse files directly (existing)     │
│ └─ Always succeeds (may be incomplete) │
└─────────────────────────────────────────┘
```

### Error Scenarios & Responses

| Error                                | Layer | Response                         |
| ------------------------------------ | ----- | -------------------------------- |
| Cache miss                           | L1    | → Check disk manifests (L2)      |
| Manifest file missing                | L2    | → Generate manifests (L3)        |
| Generation fails (BMAD-METHOD error) | L3    | → Runtime scan (L4)              |
| Permission error writing manifests   | L3    | → Runtime scan (L4), warn user   |
| Corrupt CSV                          | L2    | → Regenerate (L3)                |
| Module detection fails               | L3    | → Assume empty modules, continue |

---

## 6. Performance Characteristics

### Expected Performance

| Operation                      | Manifest-Based | Runtime Scan | Improvement     |
| ------------------------------ | -------------- | ------------ | --------------- |
| List agents (50 agents)        | ~10ms          | ~500ms       | **50x faster**  |
| List workflows (100 workflows) | ~15ms          | ~800ms       | **53x faster**  |
| Server initialization          | ~50ms          | ~2000ms      | **40x faster**  |
| Subsequent calls (cached)      | ~1ms           | ~500ms       | **500x faster** |

### Caching Strategy

**In-Memory Cache:**

- TTL: 5 minutes (configurable)
- Invalidation: On manifest regeneration
- Memory usage: ~1MB per bmad_root (negligible)

**Disk Manifest Freshness:**

- Check: File modification time
- TTL: 5 minutes (configurable)
- Auto-regeneration: On staleness

---

## 7. Testing Strategy

### Unit Tests

```typescript
describe('ManifestCache', () => {
  describe('detectModules', () => {
    it('should detect modules with agents directories');
    it('should detect modules with workflows directories');
    it('should exclude core and _cfg directories');
    it('should handle empty bmad_roots');
  });

  describe('walkDirectory', () => {
    it('should collect all files recursively');
    it('should exclude node_modules and .git');
    it('should exclude hidden files');
    it('should handle symlinks correctly');
  });

  describe('deduplicateByPriority', () => {
    it('should keep highest priority item');
    it('should handle same priority (first wins)');
    it('should deduplicate by module:name key');
  });

  describe('generateManifests', () => {
    it('should call ManifestGenerator with correct params');
    it('should handle generation errors gracefully');
    it('should create _cfg directory if missing');
  });
});
```

### Integration Tests

```typescript
describe('Multi-source manifest loading', () => {
  it('should prioritize project over user over git', async () => {
    // Setup 3 roots with same agent (different versions)
    const agents = await cache.getAllAgents();
    expect(agents.find((a) => a.name === 'pm').source).toBe('project');
  });

  it('should merge unique agents from different sources', async () => {
    // project: pm, user: analyst, git: architect
    const agents = await cache.getAllAgents();
    expect(agents.length).toBe(3);
  });

  it('should handle missing manifests gracefully', async () => {
    // Delete manifest file, should regenerate
    const agents = await cache.getAllAgents();
    expect(agents.length).toBeGreaterThan(0);
  });

  it('should fall back to runtime scan on generation failure', async () => {
    // Mock ManifestGenerator to throw error
    const agents = await cache.getAllAgents();
    expect(agents.length).toBeGreaterThan(0); // Still works
  });
});
```

---

## 8. Migration Path

### Phase 1: Feature Flag (Week 1)

```typescript
// Add feature flag for gradual rollout
const USE_MANIFEST_CACHE = process.env.BMAD_USE_MANIFESTS !== 'false';

async listAgentsWithMetadata(): Promise<AgentMetadata[]> {
  if (USE_MANIFEST_CACHE) {
    try {
      return await this.manifestCache.getAllAgents();
    } catch (error) {
      console.warn('Manifest cache failed:', error);
    }
  }

  // Fallback to existing runtime scanning
  return await this.scanAgentsRuntime();
}
```

### Phase 2: Default Enabled (Week 2)

```typescript
// Enable by default, allow opt-out
const USE_MANIFEST_CACHE = process.env.BMAD_USE_MANIFESTS !== 'false';
```

### Phase 3: Remove Runtime Scan (Week 4)

```typescript
// After validation, remove fallback completely
async listAgentsWithMetadata(): Promise<AgentMetadata[]> {
  return await this.manifestCache.getAllAgents();
}
```

---

## 9. Security Considerations

### File System Access

- **Constraint:** Only read/write within bmad_roots
- **Validation:** Sanitize paths to prevent directory traversal
- **Permissions:** Graceful handling of read-only file systems

### Hash Verification

```typescript
// Verify file integrity before using
async verifyFileIntegrity(filePath: string, expectedHash: string): Promise<boolean> {
  const content = await fs.readFile(filePath);
  const actualHash = crypto.createHash('sha256').update(content).digest('hex');
  return actualHash === expectedHash;
}
```

---

## 10. Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Manifest Diffing:**
   - Detect changed files since last generation
   - Incremental manifest updates

2. **Custom File Detection:**
   - Identify user-modified files via hash comparison
   - Warn before overwriting customizations

3. **Background Regeneration:**
   - Watch file system for changes
   - Auto-regenerate manifests asynchronously

4. **Manifest Compression:**
   - Gzip CSV manifests for large bmad_roots
   - Transparent decompression on load

5. **Distributed Caching:**
   - Share manifest cache across MCP server instances
   - Redis/Memcached integration

---

## Conclusion

This architecture provides:

- ✅ **Fast manifest-based loading** (50x+ faster than runtime scanning)
- ✅ **Multi-source support** with configurable priority
- ✅ **Graceful degradation** (4-layer fallback strategy)
- ✅ **Zero BMAD-METHOD modifications** (dependency-only integration)
- ✅ **Backward compatibility** (feature flag + fallback)
- ✅ **Comprehensive testing** (unit + integration coverage)

**Ready for implementation in Story 6-8.**
