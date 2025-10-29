# BMAD MCP Server Architecture

Technical deep-dive into the BMAD MCP Server's design and implementation (v0.2.x+).

> **For users:** See [Installation Guide](./installation.md) for setup instructions.  
> **For contributors:** Read this to understand how the system works internally.

## Overview

The BMAD MCP Server uses a **Master Manifest** architecture that inventories all BMAD resources from multiple locations and provides priority-based resolution for loading agents, workflows, and supporting files.

### Core Design Principles

1. **Single Source of Truth** - Master Manifest inventories all resources
2. **Priority-Based Resolution** - Multiple locations with clear precedence rules
3. **Separation of Concerns** - Discovery (manifest) vs. Loading (FileReader)
4. **Module-Qualified Names** - Support for `module/name` syntax
5. **Override-Friendly** - Project files override user files override package files

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP Protocol Layer                       │
│  (ListPrompts, GetPrompt, CallTool handlers)                │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                   UnifiedBMADTool                            │
│  - Parse commands (agent/workflow, module-qualified)         │
│  - Query master manifest for metadata                        │
│  - Load files via FileReader                                 │
│  - Format results                                            │
└────────────────────┬────────────────────────────────────────┘
                     ↓
         ┌───────────┴───────────┐
         ↓                       ↓
┌────────────────────┐  ┌────────────────────┐
│  Master Manifest   │  │    FileReader      │
│  - What exists     │  │  - How to load     │
│  - Metadata        │  │  - Priority chain  │
│  - Priority info   │  │  - File I/O        │
└────────┬───────────┘  └────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│              V4/V6 Inventory Modules                         │
│  - Scan filesystem for agents/workflows/tasks                │
│  - Read CSV manifests (v6) or YAML (v4)                     │
│  - Create MasterRecord entries                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Master Manifest Architecture

### What is the Master Manifest?

The Master Manifest is a **unified inventory** of all BMAD resources (agents, workflows, tasks, modules) discovered from all configured locations, with metadata about each resource's origin, priority, and existence.

### Key Characteristics

- **Not flattened** - Contains all records from all locations
- **Metadata-rich** - Each record knows its origin, priority, status
- **Built at startup** - Generated once during server initialization
- **Cached** - Stored in `MasterManifestService` for fast queries

### Master Record Structure

```typescript
interface MasterRecord {
  kind: 'agent' | 'workflow' | 'task';
  source: 'manifest' | 'filesystem';      // From CSV or discovered?
  origin: BmadOrigin;                     // Where it came from
  moduleName: string;                     // e.g., 'bmm', 'core'
  moduleVersion?: string;
  bmadVersion?: string;
  name?: string;
  displayName?: string;
  description?: string;
  bmadRelativePath: string;               // e.g., 'bmad/bmm/agents/analyst.md'
  moduleRelativePath: string;             // e.g., 'bmm/agents/analyst.md'
  absolutePath: string;                   // Full filesystem path
  exists: boolean;                        // File actually exists?
  status: 'verified' | 'not-in-manifest' | 'no-file-found';
}

interface BmadOrigin {
  kind: 'project' | 'cli' | 'env' | 'user' | 'package';
  displayName: string;                    // e.g., 'Project', 'User Defaults'
  root: string;                           // Absolute path to bmad root
  manifestDir: string;                    // Absolute path to _cfg
  priority: number;                       // Lower = higher priority
}
```

### Example Master Manifest

```json
{
  "agents": [
    {
      "kind": "agent",
      "name": "architect",
      "moduleName": "bmm",
      "absolutePath": "/project/bmad/bmm/agents/architect.md",
      "exists": true,
      "status": "verified",
      "origin": {
        "kind": "project",
        "displayName": "Project",
        "priority": 1
      }
    },
    {
      "kind": "agent",
      "name": "architect",
      "moduleName": "bmm",
      "absolutePath": "/home/user/.bmad/bmm/agents/architect.md",
      "exists": true,
      "status": "verified",
      "origin": {
        "kind": "user",
        "displayName": "User Defaults",
        "priority": 3
      }
    },
    {
      "kind": "agent",
      "name": "analyst",
      "moduleName": "bmm",
      "absolutePath": "/package/bmad/bmm/agents/analyst.md",
      "exists": true,
      "status": "verified",
      "origin": {
        "kind": "package",
        "displayName": "Package",
        "priority": 5
      }
    }
  ],
  "workflows": [...],
  "tasks": [...],
  "modules": [...]
}
```

---

## Priority-Based Resolution

### Priority Rules

**Lower priority number = Higher priority**

| Source | Priority | Description | Example |
|--------|----------|-------------|---------|
| Project | 1 | Local `./bmad` folder | `/project/bmad` |
| CLI Args | 2+ | Command-line paths | `--path /custom/bmad` |
| Environment | 3+ | `BMAD_ROOT` variable | `BMAD_ROOT=/path` |
| User | 4+ | `~/.bmad` folder | `/home/user/.bmad` |
| Package | 5 | Embedded in npm package | `/package/bmad` |

### Selection Algorithm

When loading a resource (e.g., agent "architect"):

```typescript
function findAgentByName(
  manifest: MasterManifests,
  name: string,
  module?: string
): MasterRecord | undefined {

  // 1. Filter by name and exists=true
  let candidates = manifest.agents.filter(
    a => a.name === name && a.exists === true
  );

  // 2. If module specified, filter by module
  if (module) {
    candidates = candidates.filter(a => a.moduleName === module);
  }

  // 3. Sort by priority (ascending - lowest wins)
  candidates.sort((a, b) => a.origin.priority - b.origin.priority);

  // 4. Return first match (highest priority)
  return candidates[0];
}
```

### Resolution Examples

#### Example 1: No Module Qualifier

```bash
# Command: bmad architect

Master Manifest:
  - architect (bmm, project, priority=1)   ✅ SELECTED
  - architect (bmm, user, priority=3)
  - architect (core, package, priority=5)

Result: /project/bmad/bmm/agents/architect.md
```

#### Example 2: Module Qualifier

```bash
# Command: bmad core/architect

Master Manifest:
  - architect (bmm, project, priority=1)   ❌ Wrong module
  - architect (bmm, user, priority=3)      ❌ Wrong module
  - architect (core, package, priority=5)  ✅ SELECTED

Result: /package/bmad/core/agents/architect.md
```

#### Example 3: Override Scenario

User wants to customize `bmm/architect` for this project:

```bash
# 1. User creates: /project/bmad/bmm/agents/architect.md

# 2. Command: bmad bmm/architect

Master Manifest:
  - architect (bmm, project, priority=1)   ✅ SELECTED (override!)
  - architect (bmm, user, priority=3)      ⚪ Available but not used
  - architect (bmm, package, priority=5)   ⚪ Available but not used

Result: /project/bmad/bmm/agents/architect.md (custom version)
```

---

## FileReader: Supporting File Resolution

### Purpose

While the Master Manifest handles **primary resources** (agents, workflows, tasks), **FileReader** handles **supporting files** (templates, customizations, configs) with priority-based fallback.

### How It Works

FileReader maintains a priority-ordered list of BMAD roots and tries each location in order:

```typescript
class FileReader {
  private roots: string[];  // ['/project/bmad', '~/.bmad', '/package/bmad']

  readFile(relativePath: string): string {
    for (const root of this.roots) {
      const fullPath = path.join(root, relativePath);
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, 'utf-8');
      }
    }
    throw new Error(`File not found: ${relativePath}`);
  }
}
```

### Example Usage

```typescript
// Loading an agent
const agentRecord = findAgentByName(manifest, 'architect');

// Primary file: Use absolute path from master record
const agentMd = fs.readFileSync(agentRecord.absolutePath, 'utf-8');

// Supporting files: Use FileReader with fallback
try {
  const customization = fileReader.readFile(
    '_cfg/agents/bmm-architect.customize.yaml'
  );
  // Tries: project → user → package
} catch (e) {
  // Not found in any location - that's ok
}

try {
  const template = fileReader.readFile('templates/story.md');
  // Tries: project → user → package
} catch (e) {
  // Not found in any location - that's ok
}
```

### FileReader vs Master Manifest

| Aspect | Master Manifest | FileReader |
|--------|----------------|------------|
| **Purpose** | What resources exist | How to load any file |
| **Scope** | Agents, workflows, tasks | Templates, configs, arbitrary files |
| **Discovery** | Pre-built inventory | On-demand lookup |
| **Fallback** | Priority-based selection | Sequential try-each-location |
| **Performance** | Fast (cached) | Slower (filesystem checks) |

---

## Module-Qualified Loading

### Syntax

```bash
# Without module qualifier (searches all modules)
bmad architect

# With module qualifier (searches specific module)
bmad bmm/architect
bmad core/bmad-master

# Workflows work the same way
bmad *party-mode
bmad *core/brainstorming
```

### Name Parser

```typescript
interface ParsedName {
  module?: string;  // Optional module qualifier
  name: string;     // The actual resource name
  original: string; // Original input
}

function parseQualifiedName(input: string): ParsedName {
  if (input.includes('/')) {
    const [module, name] = input.split('/');
    return { module, name, original: input };
  }
  return { name: input, original: input };
}
```

### Query Flow

```
User Input: "bmm/architect"
        ↓
Parse: { module: "bmm", name: "architect" }
        ↓
Query Master Manifest:
  1. Filter by name="architect" → 3 matches
  2. Filter by module="bmm" → 2 matches
  3. Filter by exists=true → 2 matches
  4. Sort by priority → [project(1), user(3)]
  5. Return first → project
        ↓
Selected: /project/bmad/bmm/agents/architect.md
```

---

## Data Flow: Loading an Agent

### Complete Flow Diagram

```
┌───────────────────────────────────────────────────────────────┐
│ 1. User Command: "bmad bmm/architect"                         │
└────────────────────────┬──────────────────────────────────────┘
                         ↓
┌───────────────────────────────────────────────────────────────┐
│ 2. UnifiedBMADTool.execute()                                  │
│    - Parse command → { module: "bmm", name: "architect" }     │
└────────────────────────┬──────────────────────────────────────┘
                         ↓
┌───────────────────────────────────────────────────────────────┐
│ 3. Query Master Manifest                                      │
│    findAgentByName(manifest, "architect", "bmm")              │
│    - Filter by name + module + exists                         │
│    - Sort by priority                                         │
│    - Return highest priority match                            │
└────────────────────────┬──────────────────────────────────────┘
                         ↓
┌───────────────────────────────────────────────────────────────┐
│ 4. Selected MasterRecord                                      │
│    {                                                           │
│      name: "architect",                                        │
│      module: "bmm",                                            │
│      absolutePath: "/project/bmad/bmm/agents/architect.md",   │
│      origin: { kind: "project", priority: 1 }                 │
│    }                                                           │
└────────────────────────┬──────────────────────────────────────┘
                         ↓
┌───────────────────────────────────────────────────────────────┐
│ 5. Load Primary File                                          │
│    fs.readFileSync(record.absolutePath)                       │
│    → Agent markdown content                                   │
└────────────────────────┬──────────────────────────────────────┘
                         ↓
┌───────────────────────────────────────────────────────────────┐
│ 6. Load Supporting Files (FileReader with fallback)           │
│    fileReader.readFile("_cfg/agents/bmm-architect.yaml")      │
│    → Tries: project → user → package                          │
│    → Returns first match or throws                            │
└────────────────────────┬──────────────────────────────────────┘
                         ↓
┌───────────────────────────────────────────────────────────────┐
│ 7. Format Response                                            │
│    - Combine agent markdown + customizations                  │
│    - Add metadata                                             │
│    - Return BMADToolResult                                    │
└───────────────────────────────────────────────────────────────┘
```

### Console Logging

Throughout the process, detailed logging shows what's happening:

```
🔍 Found 3 candidates for agent 'architect'
🔍 After module filter 'bmm': 2 candidates
✅ Selected: architect from module 'bmm' at Project (project, priority=1)
📄 Reading file: bmm/agents/architect.md from /project/bmad
📄 Reading file: _cfg/agents/bmm-architect.customize.yaml from /home/user/.bmad
```

---

## Key Components

### MasterManifestService

**File:** `src/services/master-manifest-service.ts`

Manages the master manifest lifecycle:

```typescript
class MasterManifestService {
  private cache: MasterManifests | null = null;

  generate(): MasterManifests {
    // Build master manifest from all origins
    const origins = originsFromResolution(this.discovery);
    this.cache = buildMasterManifests(origins);
    return this.cache;
  }

  get(): MasterManifests {
    // Return cached manifest (build if needed)
    if (!this.cache) return this.generate();
    return this.cache;
  }

  reload(): MasterManifests {
    // Force rebuild
    return this.generate();
  }
}
```

### V6 Module Inventory

**File:** `src/utils/v6-module-inventory.ts`

Scans v6 BMAD installations:

1. Reads CSV manifests (if available)
2. Scans filesystem for actual files
3. Creates MasterRecords with:
   - `source: 'manifest'` for CSV entries
   - `source: 'filesystem'` for discovered files
   - `status: 'verified' | 'not-in-manifest' | 'no-file-found'`

### V4 Module Inventory

**File:** `src/utils/v4-module-inventory.ts`

Scans v4 BMAD installations:

1. Reads `install-manifest.yaml`
2. Scans filesystem for orphaned files
3. Creates MasterRecords similar to v6

### Master Manifest Adapters

**File:** `src/utils/master-manifest-adapter.ts`

Converts MasterRecords to legacy interfaces:

```typescript
function filterExisting(records: MasterRecord[]): MasterRecord[] {
  return records.filter(r => r.exists === true);
}

function masterRecordToAgent(record: MasterRecord): Agent {
  return {
    name: record.name || '',
    displayName: record.displayName || record.name || '',
    title: record.description || '',
    module: record.moduleName,
    path: record.absolutePath,
    sourceRoot: record.origin.root,
    sourceLocation: record.origin.displayName,
  };
}
```

### Master Manifest Query

**File:** `src/utils/master-manifest-query.ts`

Query functions with priority logic:

```typescript
function findAgentByName(
  manifest: MasterManifests,
  name: string,
  module?: string
): MasterRecord | undefined;

function findWorkflowByName(
  manifest: MasterManifests,
  name: string,
  module?: string
): MasterRecord | undefined;
```

---

## Filtering Strategy

### Simple Rule: Only Serve Existing Files

```typescript
// Filter records to only include files that exist
const existingAgents = masterManifest.agents.filter(a => a.exists === true);
const existingWorkflows = masterManifest.workflows.filter(w => w.exists === true);
```

**Why this works:**

1. **Cannot serve non-existent files** - Obvious constraint
2. **Master manifest tracks existence** - `exists: boolean` field
3. **No complex status logic** - Just check `exists === true`
4. **Clean and simple** - Easy to understand and maintain

---

## Design Decisions

### Why Not Flatten Master Manifest?

**Decision:** Master manifest contains all records from all origins (not flattened by priority)

**Rationale:**
- Transparency - Can see all available options
- Flexibility - Query can apply different filters
- Debugging - Easy to see what's available where
- Future - May want to show users all options

### Why Keep FileReader?

**Decision:** Use FileReader for supporting files instead of inventorying everything

**Rationale:**
- **Primary resources** (agents/workflows/tasks) - Use master manifest (predictable, discoverable)
- **Supporting files** (templates/configs) - Use FileReader (arbitrary paths, on-demand)
- Master manifest would be huge if it included every file
- FileReader is simpler for unpredictable file access patterns

### Why Module-Qualified Names?

**Decision:** Support both `architect` and `bmm/architect` syntax

**Rationale:**
- Convenience - Short names for common cases
- Precision - Module qualifier when needed (e.g., same name in different modules)
- Overrides - User can customize specific module's agent without affecting others

---

## Migration from CSV-Based System

### What Changed

| Old (main branch) | New (v0.2.x+) |
|-------------------|---------------|
| CSV files only | Master manifest (CSV + filesystem) |
| Single location | Multiple locations with priority |
| ManifestLoader | MasterManifestService + Query |
| Direct CSV reads | Master records with metadata |
| No module support | Module-qualified names |

### What Stayed the Same

- UnifiedBMADTool as main orchestrator
- FileReader for file I/O
- MCP protocol handlers
- Tool command syntax (`bmad`, `bmad *workflow`)

### Backward Compatibility

The adapter layer ensures existing code works:

```typescript
// Old code expects Agent[]
const agents: Agent[] = this.manifestLoader.loadAgentManifest();

// New code provides Agent[] from master manifest
const agents: Agent[] = filterExisting(masterManifest.agents)
  .map(masterRecordToAgent);
```

---

## Future Enhancements

### Possible Extensions

1. **Resource Caching** - Cache loaded file contents
2. **Hot Reload** - Watch filesystem for changes
3. **Preference UI** - Let users choose which origin to use
4. **Resource Browser** - Show all available resources with origins
5. **Validation** - Check for conflicts/duplicates across origins
6. **Metrics** - Track which resources are used most

### Design Allows

- Adding new origin types (e.g., `remote`, `plugin`)
- Custom priority schemes
- Resource filtering (by module, version, etc.)
- Dynamic resource loading
- Multi-workspace support

---

## Summary

The BMAD MCP Server architecture provides:

1. ✅ **Single source of truth** - Master manifest knows all resources
2. ✅ **Priority-based resolution** - Clear precedence rules
3. ✅ **Module-qualified names** - Precise resource selection
4. ✅ **Override-friendly** - Project files override defaults
5. ✅ **Separation of concerns** - Discovery vs. loading
6. ✅ **Clean and simple** - Only serve existing files
7. ✅ **Extensible** - Easy to add new features

This design makes BMAD flexible for users while maintaining clarity and predictability for developers.
