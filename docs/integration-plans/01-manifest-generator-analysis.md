# ManifestGenerator Analysis for bmad-mcp-server Integration

**Date:** November 7, 2025  
**Status:** Analysis Complete  
**Analyzer:** Diana (Debug Specialist) based on code investigation

---

## Executive Summary

The `ManifestGenerator` in BMAD-METHOD is a **viable candidate** for integration into bmad-mcp-server, but requires **adapter pattern** implementation due to its current design for single bmad_root scenarios.

### Key Findings

- ✅ Well-structured, standalone logic for manifest generation
- ✅ CSV format already compatible with bmad-mcp-server
- ✅ Hash calculation (SHA256) implemented and tested
- ⚠️ Designed for single bmad_root (not multi-source)
- ⚠️ No cross-root deduplication (needs custom implementation)
- ⚠️ Depends on installer's file tracking for completeness

---

## 1. API Surface Documentation

### Primary Class: `ManifestGenerator`

**Location:** `/Users/mkellerman/GitHub/BMAD-METHOD/tools/cli/installers/lib/core/manifest-generator.js`

#### Public Methods

```javascript
class ManifestGenerator {
  constructor()

  /**
   * Generate all manifests for a bmad installation
   * @param {string} bmadDir - BMAD installation directory (single root)
   * @param {Array} selectedModules - Modules to include
   * @param {Array} installedFiles - All installed file paths (for hash tracking)
   * @param {Object} options - { ides: [], preservedModules: [] }
   * @returns {Object} { workflows, agents, tasks, tools, files, manifestFiles }
   */
  async generateManifests(bmadDir, selectedModules, installedFiles = [], options = {})
}
```

#### Internal Methods (Important for Understanding)

```javascript
// Workflow collection
async collectWorkflows(selectedModules)
async getWorkflowsFromPath(basePath, moduleName)

// Agent collection
async collectAgents(selectedModules)
async getAgentsFromDir(agentsPath, moduleName)

// Task collection
async collectTasks(selectedModules)

// Tool collection
async collectTools(selectedModules)

// Manifest writing
async writeMainManifest(cfgDir)
async writeWorkflowManifest(cfgDir)
async writeAgentManifest(cfgDir)
async writeTaskManifest(cfgDir)
async writeToolManifest(cfgDir)
async writeFilesManifest(cfgDir)

// Utility
async calculateFileHash(filePath)  // SHA256
async getPreservedCsvRows(csvPath, moduleColumnIndex, expectedColumns, defaultValues)
upgradeRowToSchema(rowValues, oldColumns, newColumns, defaultValues)
```

---

## 2. Dependency Map

### NPM Dependencies

```javascript
const path = require('node:path');
const fs = require('fs-extra'); // ← REQUIRED
const yaml = require('js-yaml'); // ← REQUIRED (already in bmad-mcp-server)
const crypto = require('node:crypto'); // ← Built-in
```

### Local Imports

```javascript
const { getSourcePath, getModulePath } = require('../../../lib/project-root');
const packageJson = require('../../../../../package.json');
```

**Analysis:**

- `fs-extra` is the only additional npm dependency needed
- `project-root.js` utilities are **installer-specific** - NOT needed for bmad-mcp-server
- `package.json` used for version info - can be replaced with bmad-mcp-server's version

---

## 3. Coupling Analysis

### ✅ Reusable Components (Low Coupling)

**1. Manifest Generation Logic**

- CSV structure creation
- Workflow/agent/task parsing
- Hash calculation
- Schema upgrade for existing CSVs

**2. File Scanning**

- Directory traversal
- YAML parsing for workflows
- XML parsing for agents (via separate utility)
- Module detection from path structure

**3. CSV Writing**

- Quote escaping
- Column ordering
- Header generation

### ⚠️ Installer-Specific Components (High Coupling)

**1. File Tracking via `installedFiles[]`**

```javascript
// Line 725: Relies on installer tracking
if (this.allInstalledFiles && this.allInstalledFiles.length > 0) {
  for (const filePath of this.allInstalledFiles) {
    // Process all tracked files
  }
} else {
  // FALLBACK: Only includes workflows/agents/tasks from this.files
  // MISSES: Documentation, templates, helper scripts
}
```

**Impact:** For complete `files-manifest.csv`, need to provide full file list or implement directory walking.

**2. Module Preservation Logic**

```javascript
// Line 39-40: For partial updates (installer-specific)
this.updatedModules = ['core', ...selectedModules];
this.preservedModules = preservedModules;
```

**Impact:** Not needed for bmad-mcp-server (always full regeneration).

**3. IDE Configuration**

```javascript
// Line 42-50: Installer-specific
if (!Object.prototype.hasOwnProperty.call(options, 'ides')) {
  throw new Error('ManifestGenerator requires `options.ides`');
}
```

**Impact:** Can pass empty array `{ ides: [] }` in bmad-mcp-server.

---

## 4. Output Formats

### 4.1 workflow-manifest.csv

**Structure:**

```csv
name,description,module,path,standalone
"prd","Product Requirements Document workflow","bmm","bmad/bmm/workflows/prd/workflow.yaml","false"
```

**Columns:**

- `name`: Workflow identifier (from YAML `name` field)
- `description`: Human-readable description (from YAML `description`)
- `module`: Module name (core, bmm, cis, etc.)
- `path`: Relative path to workflow.yaml
- `standalone`: Boolean string - can workflow run independently

**Source:** Recursively scans `{bmadDir}/{module}/workflows/**/**/workflow.yaml`

---

### 4.2 agent-manifest.csv

**Structure:**

```csv
name,displayName,title,icon,role,identity,communicationStyle,principles,module,path
"pm","Product Manager","Product Manager Agent","📊","Product Requirements Specialist","...","...","...","bmm","bmad/bmm/agents/pm.md"
```

**Columns:**

- `name`: Agent identifier (filename without .md)
- `displayName`: From XML `<agent name="...">`
- `title`: From XML `<agent title="...">`
- `icon`: Emoji from XML `<agent icon="...">`
- `role`: From XML `<persona><role>`
- `identity`: From XML `<persona><identity>`
- `communicationStyle`: From XML `<persona><communication_style>`
- `principles`: From XML `<persona><principles>`
- `module`: Module name
- `path`: Relative path to agent.md

**Source:** Scans `{bmadDir}/{module}/agents/*.md` and parses XML/YAML frontmatter

**Note:** Agent parsing is complex - requires XML extraction and YAML frontmatter parsing.

---

### 4.3 task-manifest.csv

**Structure:**

```csv
name,displayName,description,module,path,standalone
"workflow","Execute Workflow","Run a BMAD workflow","core","bmad/core/tasks/workflow.xml","false"
```

**Source:** Scans `{bmadDir}/{module}/tasks/*.xml`

---

### 4.4 tool-manifest.csv

**Structure:**

```csv
name,displayName,description,module,path,standalone
"grep","Text Search","Search for text patterns","core","bmad/core/tools/grep.xml","true"
```

**Source:** Scans `{bmadDir}/{module}/tools/*.xml`

---

### 4.5 files-manifest.csv

**Structure:**

```csv
type,name,module,path,hash
"md","pm","bmm","bmad/bmm/agents/pm.md","a1b2c3d4e5f6..."
"yaml","workflow","bmm","bmad/bmm/workflows/prd/workflow.yaml","f6e5d4c3b2a1..."
```

**Columns:**

- `type`: File extension (md, yaml, xml, etc.)
- `name`: Filename without extension
- `module`: Module name (or `_cfg` for manifest files)
- `path`: Relative path from workspace root
- `hash`: SHA256 hash (64 hex characters)

**Source:**

- **Primary:** Uses `allInstalledFiles` array passed to `generateManifests()`
- **Fallback:** Uses `this.files` (only workflows/agents/tasks - incomplete)

**Hash Calculation:**

```javascript
async calculateFileHash(filePath) {
  try {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return '';
  }
}
```

---

### 4.6 manifest.yaml

**Structure:**

```yaml
version: '6.0.0'
generated: '2025-11-07T...'
modules:
  - core
  - bmm
  - cis
ides:
  - cursor
  - cline
counts:
  workflows: 42
  agents: 15
  tasks: 8
  tools: 5
  files: 387
```

**Purpose:** Metadata about the manifest generation run.

---

## 5. Usage Requirements for bmad-mcp-server

### What bmad-mcp-server Must Provide

**1. bmad_root Path**

```javascript
const bmadDir = '/Users/username/project/bmad'; // Single root at a time
```

**2. Module List**

```javascript
const selectedModules = ['bmm', 'cis']; // Modules to scan (exclude 'core' - auto-included)
```

**3. File List (for complete files-manifest.csv)**

```javascript
const installedFiles = [
  '/Users/username/project/bmad/core/agents/bmad-master.md',
  '/Users/username/project/bmad/bmm/workflows/prd/workflow.yaml',
  // ... all files in bmadDir
];
```

**Alternative:** If file list not provided, implement directory walking to build it.

**4. Options Object**

```javascript
const options = {
  ides: [], // Empty array for bmad-mcp-server (not needed)
  preservedModules: [], // Empty for full regeneration
};
```

---

### How bmad-mcp-server Would Use It

```javascript
// Pseudocode for bmad-mcp-server integration
import { ManifestGenerator } from 'bmad-method';

class ManifestCache {
  async generateManifestForRoot(bmadRoot) {
    const generator = new ManifestGenerator();

    // Detect modules in this root
    const modules = await this.detectModules(bmadRoot);

    // Build file list via directory walk
    const files = await this.walkDirectory(bmadRoot);

    // Generate manifests
    const result = await generator.generateManifests(bmadRoot, modules, files, {
      ides: [],
      preservedModules: [],
    });

    return result;
  }

  async detectModules(bmadRoot) {
    // Scan for directories with agents/ or workflows/ subdirs
    const entries = await fs.readdir(bmadRoot, { withFileTypes: true });
    const modules = [];

    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        entry.name !== 'core' &&
        entry.name !== '_cfg'
      ) {
        const hasAgents = await fs.pathExists(
          path.join(bmadRoot, entry.name, 'agents'),
        );
        const hasWorkflows = await fs.pathExists(
          path.join(bmadRoot, entry.name, 'workflows'),
        );
        if (hasAgents || hasWorkflows) {
          modules.push(entry.name);
        }
      }
    }

    return modules;
  }

  async walkDirectory(bmadRoot) {
    // Recursively collect all file paths (excluding node_modules, .git, etc.)
    const files = [];
    const walk = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'cache'].includes(entry.name)) {
            await walk(fullPath);
          }
        } else {
          files.push(fullPath);
        }
      }
    };
    await walk(bmadRoot);
    return files;
  }
}
```

---

## 6. Integration Strategy

### Option A: Use ManifestGenerator as-is (Recommended)

**Approach:**

1. Add `bmad-method` as npm dependency (or `file:../BMAD-METHOD` for local dev)
2. Create wrapper class `ManifestCache` in bmad-mcp-server
3. For each bmad_root, call `generateManifests()` independently
4. Implement custom merge logic for multi-source deduplication

**Pros:**

- ✅ Leverages existing, tested code
- ✅ Minimal code duplication
- ✅ Automatic updates when ManifestGenerator improves

**Cons:**

- ⚠️ Requires BMAD-METHOD as dependency
- ⚠️ Need to implement directory walking (for file list)
- ⚠️ Need custom merge logic (not provided by ManifestGenerator)

---

### Option B: Extract and Adapt ManifestGenerator

**Approach:**

1. Copy relevant code into bmad-mcp-server
2. Remove installer-specific dependencies
3. Adapt for multi-source scenarios

**Pros:**

- ✅ No external dependency
- ✅ Full control over implementation
- ✅ Can optimize for bmad-mcp-server use case

**Cons:**

- ❌ Code duplication
- ❌ Maintenance burden (two parsers to update)
- ❌ Misses bug fixes/improvements in BMAD-METHOD

**Verdict:** NOT RECOMMENDED due to duplication.

---

## 7. Critical Gaps for Multi-Source Support

### Gap 1: No Cross-Root Deduplication

**Current Behavior:**

```javascript
// ManifestGenerator processes ONE bmadDir at a time
async generateManifests(bmadDir, ...) {
  // Scans this.bmadDir only
  // No concept of other roots
}
```

**What bmad-mcp-server Needs:**

```javascript
// Process multiple roots with priority
const projectManifest = await generateManifestForRoot('/project/bmad');
const userManifest = await generateManifestForRoot('~/.bmad');
const gitManifest = await generateManifestForRoot('~/.bmad/cache/git-xyz');

// Custom merge with priority: project > user > git
const mergedAgents = deduplicateByPriority([
  ...projectManifest.agents.map((a) => ({ ...a, _priority: 1 })),
  ...userManifest.agents.map((a) => ({ ...a, _priority: 2 })),
  ...gitManifest.agents.map((a) => ({ ...a, _priority: 3 })),
]);
```

**Solution:** Implement in bmad-mcp-server's `ManifestCache` class.

---

### Gap 2: Incomplete File Tracking Without Installer

**Current Behavior:**

```javascript
// When installedFiles is empty, fallback mode:
if (this.allInstalledFiles && this.allInstalledFiles.length > 0) {
  // Use provided file list
} else {
  // FALLBACK: Only includes this.files (workflows/agents/tasks)
  // MISSING: Documentation, templates, helper scripts
}
```

**What bmad-mcp-server Needs:**

- Complete file list for hash tracking
- Must implement directory walking

**Solution:** Implement `walkDirectory()` in `ManifestCache`.

---

### Gap 3: Module Detection

**Current Behavior:**

```javascript
// Modules explicitly provided by installer
generateManifests(bmadDir, ['bmm', 'cis'], ...)
```

**What bmad-mcp-server Needs:**

- Auto-detect modules in each bmad_root
- Handle varying module combinations across roots

**Solution:** Implement `detectModules()` in `ManifestCache`.

---

## 8. Dependencies Summary

### Required for Integration

```json
{
  "dependencies": {
    "bmad-method": "file:../BMAD-METHOD", // Local dev
    "fs-extra": "^11.1.0" // Only new dependency
  }
}
```

**Note:** `js-yaml` and `csv-parse` already in bmad-mcp-server.

---

## 9. Risk Assessment

| Risk                                        | Probability | Impact | Mitigation                          |
| ------------------------------------------- | ----------- | ------ | ----------------------------------- |
| BMAD-METHOD not published to npm            | High        | Medium | Use `file://` dependency for now    |
| ManifestGenerator changes break integration | Low         | Medium | Pin to specific version             |
| Performance with large bmad_roots           | Low         | Low    | Aggressive caching, lazy generation |
| File system differences (Windows/Mac/Linux) | Low         | Medium | Use `path.posix` for relative paths |

---

## 10. Recommendations

### ✅ Proceed with Option A: Use ManifestGenerator as Dependency

**Rationale:**

1. Avoid code duplication
2. Leverage tested, production code
3. Benefit from future improvements
4. Single source of truth for metadata extraction

### Implementation Checklist

- [ ] Add `fs-extra` to bmad-mcp-server dependencies
- [ ] Add `bmad-method` as local file dependency
- [ ] Create `src/core/manifest-cache.ts`
- [ ] Implement `detectModules(bmadRoot)`
- [ ] Implement `walkDirectory(bmadRoot)`
- [ ] Implement `generateManifestForRoot(bmadRoot)`
- [ ] Implement `mergeManifests()` with priority-based deduplication
- [ ] Update `ResourceLoaderGit` to use ManifestCache
- [ ] Add comprehensive tests for multi-source scenarios
- [ ] Document the integration approach

---

## Conclusion

The `ManifestGenerator` is **well-suited for integration** into bmad-mcp-server with the adapter pattern. The main work involves:

1. **Wrapper Implementation** (ManifestCache) - Medium effort
2. **Directory Walking** (for file list) - Low effort
3. **Module Detection** (auto-scan) - Low effort
4. **Multi-Source Merge** (custom logic) - Medium effort
5. **Testing** (multi-root scenarios) - High effort

**Total Estimated Effort:** ~2-3 sprints (2-3 weeks)

This analysis provides the foundation for Winston's architecture design in Story 2.
