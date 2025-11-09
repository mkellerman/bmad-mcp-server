# Architecture - BMAD MCP Server

**Version:** 4.0.0  
**Architecture Pattern:** Unified Tool with Transport-Agnostic Engine  
**Last Updated:** November 6, 2025

---

## Executive Summary

The BMAD MCP Server is a **Node.js TypeScript library** that implements the Model Context Protocol (MCP) to expose BMAD methodology (agents, workflows, resources) to AI assistants. The v4.0 architecture introduces a **unified tool design** replacing the previous tool-per-agent approach, with a **transport-agnostic core engine** enabling reuse across MCP, CLI, and future interfaces.

**Key Characteristics:**

- **Type:** Backend library/MCP server
- **Language:** TypeScript 5.7.2 (strict mode, ES2022 target)
- **Protocol:** MCP SDK 1.0.4
- **Architecture:** Layered (Transport → Server → Engine → Loader)
- **Distribution:** npm package with CLI binaries

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Assistant (Client)                     │
│              (Claude Desktop, Cline, etc.)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ MCP Protocol (stdio/JSON-RPC)
┌──────────────────────▼──────────────────────────────────────┐
│                   Transport Layer (MCP)                      │
│  - StdioServerTransport (stdio communication)                │
│  - MCP SDK Request/Response handling                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│               Server Layer (server.ts)                       │
│  - BMADServerLiteMultiToolGit class                         │
│  - MCP request handlers (tools, resources, prompts, etc.)   │
│  - Unified tool registration and validation                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│            Engine Layer (bmad-engine.ts)                     │
│  - BMADEngine (transport-agnostic business logic)           │
│  - Operations: list, read, execute                          │
│  - Agent/workflow execution orchestration                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│          Resource Layer (resource-loader.ts)                 │
│  - ResourceLoaderGit class                                  │
│  - Multi-source loading (project, user, git remotes)        │
│  - Manifest generation and caching                          │
│  - File system and Git operations                           │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Layer         | Component                  | Responsibility                                               |
| ------------- | -------------------------- | ------------------------------------------------------------ |
| **Transport** | MCP SDK                    | JSON-RPC protocol, stdio communication                       |
| **Server**    | BMADServerLiteMultiToolGit | MCP request routing, tool/resource handlers                  |
| **Tool**      | bmad-unified               | Unified tool with 4 operations (list, read, execute, search) |
| **Engine**    | BMADEngine                 | Business logic, operation execution, validation              |
| **Loader**    | ResourceLoaderGit          | Multi-source content loading, caching, Git support           |

---

## Core Components

### 1. Server (server.ts)

**Class:** `BMADServerLiteMultiToolGit`

**Purpose:** MCP server implementation with request handlers

**Capabilities:**

- Tools (unified bmad tool)
- Resources (bmad:// URI scheme)
- Resource Templates (URI templates for discovery)
- Prompts (agent/workflow prompts)
- Completions (argument suggestions)

**Key Methods:**

```typescript
constructor(projectRoot?: string, gitRemotes?: string[])
async start(): Promise<void>
private setupHandlers(): void
private getMimeType(path: string): string
```

### 2. Engine (bmad-engine.ts)

**Class:** `BMADEngine`

**Purpose:** Transport-agnostic business logic core

**Operations:**

1. **List**: Discover agents, workflows, modules, resources
2. **Read**: Inspect agent/workflow definitions (read-only)
3. **Execute**: Run agents/workflows with user context (actions)
4. **Search**: Find agents/workflows by name/description (optional)

**Key Methods:**

```typescript
async initialize(): Promise<void>
async listAgents(filter?: ListFilter): Promise<AgentMetadata[]>
async listWorkflows(filter?: ListFilter): Promise<Workflow[]>
async readAgent(name: string, module?: string): Promise<AgentDefinition>
async readWorkflow(name: string, module?: string): Promise<WorkflowDefinition>
async executeAgent(params: ExecuteParams): Promise<BMADResult>
async executeWorkflow(params: ExecuteParams): Promise<BMADResult>
```

### 3. Resource Loader (resource-loader.ts)

**Class:** `ResourceLoaderGit`

**Purpose:** Multi-source BMAD content loading with Git support

**Source Priority:**

1. Project-local: `./bmad/` (highest priority)
2. User-global: `~/.bmad/`
3. Git remotes: Cloned to `~/.bmad/cache/git/` (lowest priority)

**Key Features:**

- Automatic manifest generation from YAML/MD sources
- Git remote cloning and caching
- Conflict resolution (higher priority wins)
- Virtual manifests for agent/workflow discovery

**Key Methods:**

```typescript
async initialize(): Promise<void>
async loadManifests(): Promise<void>
getAgent(name: string, module?: string): AgentMetadata | undefined
getWorkflow(name: string, module?: string): Workflow | undefined
getResource(relativePath: string): ResourceFile | undefined
```

### 4. Unified Tool (tools/bmad-unified.ts)

**Tool Name:** `bmad`

**Purpose:** Single tool exposing all BMAD functionality

**Operations:**

- `list` - Discover agents/workflows/modules/resources
- `read` - Inspect definitions (read-only, no execution)
- `execute` - Run agents/workflows with context (performs actions)
- `search` - Find by name/description (optional, config-toggleable)

**Operation Handlers:**

```typescript
// Modular operation handlers in tools/operations/
executeListOperation(engine, params); // list.ts
executeReadOperation(engine, params); // read.ts
executeExecuteOperation(engine, params); // execute.ts
executeSearchOperation(engine, params); // search.ts
```

---

## Data Flow

### List Operation Example

```
1. AI Client → MCP Request
   {"method": "tools/call", "params": {"name": "bmad",
    "arguments": {"operation": "list", "query": "agents"}}}

2. Server → validate → route to bmad-unified handler

3. bmad-unified → validateListParams() → executeListOperation()

4. Engine → listAgents(filter)

5. ResourceLoader → return cached agent metadata

6. Engine → format results as text

7. Server → MCP Response
   {"content": [{"type": "text", "text": "...agent list..."}]}

8. AI Client ← parses response
```

### Execute Operation Example

```
1. AI Client → MCP Request
   {"method": "tools/call", "params": {"name": "bmad",
    "arguments": {"operation": "execute", "agent": "analyst",
                 "message": "Help me..."}}}

2. Server → validate → route to bmad-unified handler

3. bmad-unified → validateExecuteParams() → executeExecuteOperation()

4. Engine → executeAgent(params)
   - Load agent definition
   - Generate execution prompt
   - Return context for AI to act as agent

5. Server → MCP Response (agent prompt + instructions)

6. AI Client ← receives context, continues conversation as agent
```

---

## Multi-Source Loading

### Source Discovery Order

```
Priority 1: ./bmad/          (Project-local - user customizations)
Priority 2: ~/.bmad/         (User-global - personal library)
Priority 3: git+https://...  (Git remotes - shared/team content)
```

### Conflict Resolution

**When same agent/workflow exists in multiple sources:**

- Higher priority source wins
- Example: `./bmad/bmm/agents/analyst.md` overrides `~/.bmad/bmm/agents/analyst.md`

### Git Remote Support

**URL Formats:**

```bash
git+https://github.com/org/repo.git              # HTTPS
git+https://github.com/org/repo.git#main         # Branch
git+https://github.com/org/repo.git#v2.0.0       # Tag
git+https://github.com/org/repo.git#main:/path   # Subpath (monorepo)
git+ssh://git@github.com/org/repo.git            # SSH (private repos)
```

**Cache Location:** `~/.bmad/cache/git/{hash}/`

**Update Strategy:** Clone on first use, manual update required

---

## Technology Stack

| Category       | Technology      | Version | Purpose                    |
| -------------- | --------------- | ------- | -------------------------- |
| **Language**   | TypeScript      | 5.7.2   | Type-safe development      |
| **Runtime**    | Node.js         | 18+     | Server execution           |
| **Protocol**   | MCP SDK         | 1.0.4   | AI assistant communication |
| **Build**      | tsc             | 5.7.2   | TypeScript compilation     |
| **Testing**    | Vitest          | 4.0.3   | Unit/integration/e2e tests |
| **Linting**    | ESLint          | 9.17.0  | Code quality               |
| **Formatting** | Prettier        | 3.4.2   | Code style                 |
| **Parsing**    | fast-xml-parser | 5.3.1   | XML parsing                |
| **Parsing**    | js-yaml         | 4.1.0   | YAML parsing               |
| **Parsing**    | csv-parse       | 6.1.0   | CSV parsing                |

---

## File Structure

```
src/
├── index.ts              # Entry point (MCP server startup)
├── cli.ts                # CLI entry point (bmad command)
├── server.ts             # BMADServerLiteMultiToolGit (MCP layer)
├── config.ts             # Configuration constants
├── core/
│   ├── bmad-engine.ts    # BMADEngine (business logic)
│   └── resource-loader.ts # ResourceLoaderGit (content loading)
├── tools/
│   ├── index.ts          # Tool exports
│   ├── bmad-unified.ts   # Unified bmad tool
│   └── operations/
│       ├── list.ts       # List operation handler
│       ├── read.ts       # Read operation handler
│       ├── execute.ts    # Execute operation handler
│       └── search.ts     # Search operation handler
├── types/
│   └── index.ts          # TypeScript type definitions
└── utils/
    ├── logger.ts         # Logging utilities
    └── git-source-resolver.ts # Git URL parsing

build/                    # Compiled JavaScript (generated)
tests/
├── unit/                 # Unit tests (isolated functions)
├── integration/          # Integration tests (component interaction)
├── e2e/                  # End-to-end tests (full workflows)
├── framework/            # Test infrastructure
├── fixtures/             # Test data
└── helpers/              # Test utilities
```

---

## Design Principles

### 1. Transport Agnostic Core

**Principle:** Business logic (BMADEngine) has no MCP dependencies

**Benefits:**

- Reusable across interfaces (MCP, CLI, HTTP API, etc.)
- Easier testing (no transport mocking)
- Clear separation of concerns

**Implementation:**

```typescript
// ✅ Engine returns plain objects
interface BMADResult {
  success: boolean;
  data?: unknown;
  error?: string;
  text: string;
}

// ❌ Engine does NOT return MCP types
// No: CallToolResult, TextContent, etc.
```

### 2. Unified Tool Pattern

**Previous (v3.x):** Tool-per-agent (bmm-analyst, bmm-architect, core-john, etc.)

- 🔴 100+ tools → LLM confusion
- 🔴 Duplicate logic across tools
- 🔴 Hard to add new agents

**Current (v4.0):** Single unified tool with operation parameter

- ✅ 1 tool → clear LLM routing
- ✅ Shared validation and logic
- ✅ Easy to add agents (just content, no code)

### 3. Layered Architecture

**Transport → Server → Engine → Loader**

Each layer has single responsibility:

- **Transport**: Protocol communication
- **Server**: Request routing
- **Engine**: Business logic
- **Loader**: Content management

### 4. Multi-Source with Priority

**Source discovery order enables:**

- Global defaults (git remotes, user-global)
- Project customization (project-local overrides)
- Zero project clutter (no files in repo if not needed)

---

## Extension Points

### Adding New Operations

1. Create handler in `src/tools/operations/new-operation.ts`
2. Export from `src/tools/operations/index.ts`
3. Add to `BMADToolParams` interface
4. Update `bmad-unified.ts` operation enum
5. Add validation and execution logic

### Adding New MCP Capabilities

1. Update server capabilities in `server.ts` constructor
2. Add request handler via `server.setRequestHandler()`
3. Implement handler logic using `BMADEngine` methods
4. Update API contracts documentation

### Supporting New Transport

1. Create new entry point (e.g., `http-server.ts`)
2. Import and use `BMADEngine` directly
3. Map transport requests to engine operations
4. Return results in transport-specific format

---

## Performance Considerations

### Initialization

**Lazy Loading:** Engine initializes on first request, not on startup

- First request: ~100-500ms (manifest loading)
- Subsequent requests: <10ms (cached)

### Caching Strategy

**Manifest Caching:**

- Generated once during initialization
- Cached in memory for server lifetime
- No disk caching (future enhancement)

**Git Caching:**

- Cloned once to `~/.bmad/cache/git/`
- Subsequent starts reuse cached clone
- Manual update required

### Scalability

**Current:** Single-process, in-memory caching
**Future:** Multi-process, Redis caching, hot reload

---

## Security

### Git Remote Security

**SSH Support:** Private repositories via git+ssh://
**Cache Isolation:** Each remote in separate directory
**Path Traversal:** Prevented by path validation

### Resource Access

**URI Validation:** Only bmad:// URIs allowed
**Path Sanitization:** Prevents access outside bmad directories
**No Arbitrary Execution:** Agents return prompts, not code execution

---

## Testing Architecture

### Test Layers

| Layer           | Location             | Purpose                 | Examples                        |
| --------------- | -------------------- | ----------------------- | ------------------------------- |
| **Unit**        | `tests/unit/`        | Isolated function tests | Engine operations, validators   |
| **Integration** | `tests/integration/` | Component interaction   | Server + Engine, Loader + Git   |
| **E2E**         | `tests/e2e/`         | Full workflow tests     | Agent execution, workflow flows |

### Test Infrastructure

**Framework:** Vitest 4.0.3

- Parallel execution
- Coverage reporting (v8)
- Custom BMAD reporter
- Global setup/teardown

**Fixtures:** `tests/fixtures/` - Mock BMAD content
**Helpers:** `tests/helpers/` - Test utilities
**Support:** `tests/support/` - Mock implementations

---

## Future Enhancements

### Planned Features

1. **Hot Reload:** Watch for content changes, reload without restart
2. **Disk Cache:** Persist manifests to disk for faster startups
3. **HTTP API:** REST/GraphQL interface for web clients
4. **Multi-process:** Worker threads for parallel execution
5. **Metrics:** Performance monitoring and usage analytics
6. **Auto-update:** Automatic git remote updates with versioning

### Architectural Evolution

**Current:** Monolith (all layers in one process)
**Future:** Microservices (engine as separate service)

---

## References

- **MCP Specification:** https://modelcontextprotocol.io/
- **BMAD Method:** https://github.com/bmad-code-org/BMAD-METHOD
- **TypeScript:** https://www.typescriptlang.org/
- **Vitest:** https://vitest.dev/
