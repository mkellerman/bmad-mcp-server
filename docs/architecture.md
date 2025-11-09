# Architecture - BMAD MCP Server# Architecture - BMAD MCP Server

**Version:** 5.0.0 **Version:** 4.0.0

**Architecture Pattern:** Pure Delivery Proxy **Architecture Pattern:** Unified Tool with Transport-Agnostic Engine

**Last Updated:** November 8, 2025**Last Updated:** November 6, 2025

---

## Executive Summary## Executive Summary

The BMAD MCP Server is a **Pure Delivery Proxy** that serves BMAD Method content through the Model Context Protocol. It delivers agents, workflows, and configuration files without preprocessing or interpretation, allowing LLMs to leverage BMAD's dynamic prompt engineering directly.The BMAD MCP Server is a **Node.js TypeScript library** that implements the Model Context Protocol (MCP) to expose BMAD methodology (agents, workflows, resources) to AI assistants. The v4.0 architecture introduces a **unified tool design** replacing the previous tool-per-agent approach, with a **transport-agnostic core engine** enabling reuse across MCP, CLI, and future interfaces.

**Key Principle:** The server delivers content; the LLM provides intelligence.**Key Characteristics:**

**Core Responsibilities:**- **Type:** Backend library/MCP server

- Multi-source discovery (project, user home, git remotes)- **Language:** TypeScript 5.7.2 (strict mode, ES2022 target)

- Content serving (agents, workflows, configs)- **Protocol:** MCP SDK 1.0.4

- Intelligent ranking (session-based + LLM sampling)- **Architecture:** Layered (Transport → Server → Engine → Loader)

- Response optimization (token efficiency)- **Distribution:** npm package with CLI binaries

**Non-Responsibilities:**---

- Template preprocessing

- Variable substitution## System Architecture

- Workflow execution

- Decision-making for LLM### High-Level Architecture

---```

┌─────────────────────────────────────────────────────────────┐

## Architecture Philosophy│ AI Assistant (Client) │

│ (Claude Desktop, Cline, etc.) │

### Pure Delivery Proxy Pattern└──────────────────────┬──────────────────────────────────────┘

                       │ MCP Protocol (stdio/JSON-RPC)

The server follows a **strict separation of concerns**:┌──────────────────────▼──────────────────────────────────────┐

│ Transport Layer (MCP) │

````│ - StdioServerTransport (stdio communication)                │

┌─────────────────────────────────────┐│  - MCP SDK Request/Response handling                         │

│  LLM (Intelligent Runtime)          │└──────────────────────┬──────────────────────────────────────┘

│  ───────────────────────────────    │                       │

│  ✓ Interprets activation steps      │┌──────────────────────▼──────────────────────────────────────┐

│  ✓ Executes workflows                ││               Server Layer (server.ts)                       │

│  ✓ Resolves {variables}              ││  - BMADServerLiteMultiToolGit class                         │

│  ✓ Makes decisions                   ││  - MCP request handlers (tools, resources, prompts, etc.)   │

│  ✓ Manages conversational state      ││  - Unified tool registration and validation                 │

└─────────────────────────────────────┘└──────────────────────┬──────────────────────────────────────┘

            ↕ MCP Protocol                       │

┌─────────────────────────────────────┐┌──────────────────────▼──────────────────────────────────────┐

│  BMAD MCP Server (Pure Proxy)       ││            Engine Layer (bmad-engine.ts)                     │

│  ───────────────────────────────    ││  - BMADEngine (transport-agnostic business logic)           │

│  ✓ Discovers BMAD installations     ││  - Operations: list, read, execute                          │

│  ✓ Serves .md files (agents)         ││  - Agent/workflow execution orchestration                   │

│  ✓ Serves instructions (workflows)   │└──────────────────────┬──────────────────────────────────────┘

│  ✓ Serves YAML (configs)             │                       │

│  ✓ Ranks options (recommendations)   │┌──────────────────────▼──────────────────────────────────────┐

│  ✓ Shapes responses (optimization)   ││          Resource Layer (resource-loader.ts)                 │

│                                      ││  - ResourceLoaderGit class                                  │

│  ✗ NO preprocessing                  ││  - Multi-source loading (project, user, git remotes)        │

│  ✗ NO template rendering             ││  - Manifest generation and caching                          │

│  ✗ NO execution logic                ││  - File system and Git operations                           │

└─────────────────────────────────────┘└─────────────────────────────────────────────────────────────┘

            ↕ File I/O```

┌─────────────────────────────────────┐

│  BMAD Installation (Source)         │### Component Responsibilities

│  ───────────────────────────────    │

│  • bmad/{module}/agents/*.md         │| Layer         | Component                  | Responsibility                                               |

│  • bmad/{module}/workflows/*/        │| ------------- | -------------------------- | ------------------------------------------------------------ |

│  • bmad/{module}/config.yaml         │| **Transport** | MCP SDK                    | JSON-RPC protocol, stdio communication                       |

│  • bmad/_cfg/agent-manifest.csv      │| **Server**    | BMADServerLiteMultiToolGit | MCP request routing, tool/resource handlers                  |

│  • bmad/_cfg/workflow-manifest.csv   │| **Tool**      | bmad-unified               | Unified tool with 4 operations (list, read, execute, search) |

└─────────────────────────────────────┘| **Engine**    | BMADEngine                 | Business logic, operation execution, validation              |

```| **Loader**    | ResourceLoaderGit          | Multi-source content loading, caching, Git support           |



### Why Pure Delivery?---



**BMAD's Dynamic Prompt Engineering** (4 layers):## Core Components

1. **Persona Foundation** - Agent role, identity, style

2. **Configuration Adaptation** - User-specific settings### 1. Server (server.ts)

3. **Context-Aware Variables** - Project-specific resolution

4. **Dynamic Prompt Assembly** - Multi-source composition**Class:** `BMADServerLiteMultiToolGit`



**These layers require LLM intelligence to interpret.** A "smart" proxy that preprocesses would:**Purpose:** MCP server implementation with request handlers

- ❌ Duplicate BMAD's logic in TypeScript

- ❌ Break when prompt patterns change**Capabilities:**

- ❌ Violate separation of concerns

- ❌ Create maintenance nightmare- Tools (unified bmad tool)

- Resources (bmad:// URI scheme)

**Pure delivery preserves BMAD's design:**- Resource Templates (URI templates for discovery)

- ✅ LLM interprets activation instructions- Prompts (agent/workflow prompts)

- ✅ LLM loads and parses config.yaml- Completions (argument suggestions)

- ✅ LLM resolves {user_name}, {output_folder}, etc.

- ✅ LLM follows workflow steps**Key Methods:**

- ✅ Changes to BMAD prompts work immediately

```typescript

---constructor(projectRoot?: string, gitRemotes?: string[])

async start(): Promise<void>

## System Architectureprivate setupHandlers(): void

private getMimeType(path: string): string

### Layered Architecture```



```### 2. Engine (bmad-engine.ts)

┌─────────────────────────────────────────────────────────────┐

│                    AI Assistant (Client)                     │**Class:** `BMADEngine`

│              (Claude Desktop, Cline, Copilot)                │

└──────────────────────┬──────────────────────────────────────┘**Purpose:** Transport-agnostic business logic core

                       │ MCP Protocol (stdio/JSON-RPC)

┌──────────────────────▼──────────────────────────────────────┐**Operations:**

│               Transport Layer (MCP SDK)                      │

│  • StdioServerTransport                                      │1. **List**: Discover agents, workflows, modules, resources

│  • JSON-RPC request/response                                 │2. **Read**: Inspect agent/workflow definitions (read-only)

└──────────────────────┬──────────────────────────────────────┘3. **Execute**: Run agents/workflows with user context (actions)

                       │4. **Search**: Find agents/workflows by name/description (optional)

┌──────────────────────▼──────────────────────────────────────┐

│               Server Layer (server.ts)                       │**Key Methods:**

│  • Tool registration (bmad unified tool)                     │

│  • Request handlers (list, read, execute)                    │```typescript

│  • Sampling capability detection                             │async initialize(): Promise<void>

└──────────────────────┬──────────────────────────────────────┘async listAgents(filter?: ListFilter): Promise<AgentMetadata[]>

                       │async listWorkflows(filter?: ListFilter): Promise<Workflow[]>

┌──────────────────────▼──────────────────────────────────────┐async readAgent(name: string, module?: string): Promise<AgentDefinition>

│            Engine Layer (bmad-engine.ts)                     │async readWorkflow(name: string, module?: string): Promise<WorkflowDefinition>

│  • Operation routing (list → read → execute)                 │async executeAgent(params: ExecuteParams): Promise<BMADResult>

│  • Agent/workflow metadata extraction                        │async executeWorkflow(params: ExecuteParams): Promise<BMADResult>

│  • Response shaping (optimization)                           │```

│  • Ranking orchestration                                     │

└──────────────────────┬──────────────────────────────────────┘### 3. Resource Loader (resource-loader.ts)

                       │

┌──────────────────────▼──────────────────────────────────────┐**Class:** `ResourceLoaderGit`

│         Intelligence Layer (ranking + optimization)          │

│  ┌─────────────────────┐  ┌─────────────────────┐          │**Purpose:** Multi-source BMAD content loading with Git support

│  │ Session Tracker      │  │ LLM Ranker          │          │

│  │ • Recency           │  │ • Sampling support  │          │**Source Priority:**

│  │ • Frequency         │  │ • Hybrid fallback   │          │

│  │ • Manifest priority │  │ • Token-efficient   │          │1. Project-local: `./bmad/` (highest priority)

│  │ • Boost signals     │  │   prompts           │          │2. User-global: `~/.bmad/`

│  └─────────────────────┘  └─────────────────────┘          │3. Git remotes: Cloned to `~/.bmad/cache/git/` (lowest priority)

│                                                              │

│  ┌────────────────────────────────────────────┐            │**Key Features:**

│  │ Response Shaper                             │            │

│  │ • Ambiguous response optimization (52.3%)   │            │- Automatic manifest generation from YAML/MD sources

│  │ • Format improvements                       │            │- Git remote cloning and caching

│  │ • Token reduction strategies                │            │- Conflict resolution (higher priority wins)

│  └────────────────────────────────────────────┘            │- Virtual manifests for agent/workflow discovery

└──────────────────────┬──────────────────────────────────────┘

                       │**Key Methods:**

┌──────────────────────▼──────────────────────────────────────┐

│         Discovery Layer (resource-loader.ts)                 │```typescript

│  • Multi-source discovery (project, user, git)               │async initialize(): Promise<void>

│  • Priority resolution                                       │async loadManifests(): Promise<void>

│  • Manifest merge/dedupe                                     │getAgent(name: string, module?: string): AgentMetadata | undefined

│  • Git remote cloning                                        │getWorkflow(name: string, module?: string): Workflow | undefined

└──────────────────────┬──────────────────────────────────────┘getResource(relativePath: string): ResourceFile | undefined

                       │```

┌──────────────────────▼──────────────────────────────────────┐

│              BMAD Installations (File System)                │### 4. Unified Tool (tools/bmad-unified.ts)

│  • ./bmad/ (project-local)                                   │

│  • ~/.bmad/ (user-global)                                    │**Tool Name:** `bmad`

│  • ~/.cache/bmad-git/* (git remotes)                         │

└─────────────────────────────────────────────────────────────┘**Purpose:** Single tool exposing all BMAD functionality

````

**Operations:**

---

- `list` - Discover agents/workflows/modules/resources

## Core Components- `read` - Inspect definitions (read-only, no execution)

- `execute` - Run agents/workflows with context (performs actions)

### 1. Multi-Source Discovery- `search` - Find by name/description (optional, config-toggleable)

**Responsibility:** Find and merge BMAD installations**Operation Handlers:**

**Sources (Priority Order):**```typescript

1. **Project** - `{projectRoot}/bmad/`// Modular operation handlers in tools/operations/

2. **User** - `~/.bmad/`executeListOperation(engine, params); // list.ts

3. **Git Remotes** - `git+https://...` (cloned to cache)executeReadOperation(engine, params); // read.ts

executeExecuteOperation(engine, params); // execute.ts

**Discovery Modes:**executeSearchOperation(engine, params); // search.ts

- `auto` - All sources (default)```

- `local` - Project only

- `user` - User home only---

- `strict` - Git remotes only

## Data Flow

**Manifest Merging:**

- Loads `agent-manifest.csv` from each source### List Operation Example

- Loads `workflow-manifest.csv` from each source

- Deduplicates entries (priority order)```

- Provides unified view to LLM1. AI Client → MCP Request

  {"method": "tools/call", "params": {"name": "bmad",

**See:** [ADR-004: Multi-Source Discovery](./adr/004-multi-source-discovery.md) "arguments": {"operation": "list", "query": "agents"}}}

---2. Server → validate → route to bmad-unified handler

### 2. Content Serving3. bmad-unified → validateListParams() → executeListOperation()

**Responsibility:** Deliver BMAD files to LLMs4. Engine → listAgents(filter)

**Agent Serving:**5. ResourceLoader → return cached agent metadata

````typescript

// Request: { operation: "read", agent: "analyst" }6. Engine → format results as text

// Response: Content from bmad/{module}/agents/analyst.md

7. Server → MCP Response

loadAgent(name: string): Promise<Resource> {   {"content": [{"type": "text", "text": "...agent list..."}]}

  // 1. Search priority paths

  // 2. Return first match found8. AI Client ← parses response

  // 3. NO preprocessing - raw .md content```

}

```### Execute Operation Example



**Workflow Serving:**```

```typescript1. AI Client → MCP Request

// Request: { operation: "read", workflow: "prd" }   {"method": "tools/call", "params": {"name": "bmad",

// Response: instructions.md + workflow.yaml metadata    "arguments": {"operation": "execute", "agent": "analyst",

                 "message": "Help me..."}}}

loadWorkflow(name: string): Promise<Workflow> {

  // 1. Load workflow.yaml (metadata)2. Server → validate → route to bmad-unified handler

  // 2. Load instructions.md (execution steps)

  // 3. Return both - LLM interprets3. bmad-unified → validateExecuteParams() → executeExecuteOperation()

}

```4. Engine → executeAgent(params)

   - Load agent definition

**Config Serving:**   - Generate execution prompt

```typescript   - Return context for AI to act as agent

// LLM requests via resource URIs

// bmad://bmm/config.yaml → bmad/bmm/config.yaml content5. Server → MCP Response (agent prompt + instructions)

````

6. AI Client ← receives context, continues conversation as agent

---```

### 3. Session-Based Ranking---

**Responsibility:** Track usage and recommend intelligently## Multi-Source Loading

**Four Ranking Signals:**### Source Discovery Order

1. **Recency** - When last used (exponential decay)```

2. **Frequency** - How often used (logarithmic scaling)Priority 1: ./bmad/ (Project-local - user customizations)

3. **Manifest Priority** - Declared importance (0-100)Priority 2: ~/.bmad/ (User-global - personal library)

4. **Boost Signals** - Special emphasis (module/agent priority)Priority 3: git+https://... (Git remotes - shared/team content)

````

**Score Formula:**

```### Conflict Resolution

score = (recency_weight * recency_score) +

        (frequency_weight * frequency_score) +**When same agent/workflow exists in multiple sources:**

        (manifest_weight * manifest_priority) +

        (boost_weight * boost_score)- Higher priority source wins

```- Example: `./bmad/bmm/agents/analyst.md` overrides `~/.bmad/bmm/agents/analyst.md`



**Use Cases:**### Git Remote Support

- Ambiguous queries → rank likely candidates

- List operations → show most relevant first**URL Formats:**

- Discovery → guide LLM selection

```bash

**See:** [ADR-002: Session-Based Ranking](./adr/002-session-based-ranking.md)git+https://github.com/org/repo.git              # HTTPS

git+https://github.com/org/repo.git#main         # Branch

---git+https://github.com/org/repo.git#v2.0.0       # Tag

git+https://github.com/org/repo.git#main:/path   # Subpath (monorepo)

### 4. LLM Sampling Integrationgit+ssh://git@github.com/org/repo.git            # SSH (private repos)

````

**Responsibility:** Let LLM participate in ranking when capable

**Cache Location:** `~/.bmad/cache/git/{hash}/`

**Hybrid Strategy:**

1. **Detect** sampling capability in MCP client**Update Strategy:** Clone on first use, manual update required

2. **Use LLM** ranking when available (send candidates + query)

3. **Fallback** to session-based ranking---

**Token Efficiency:**## Technology Stack

- Ranking prompt: ~200 tokens

- Candidate list: name + 1-line description| Category | Technology | Version | Purpose |

- No full content sent for ranking| -------------- | --------------- | ------- | -------------------------- |

| **Language** | TypeScript | 5.7.2 | Type-safe development |

**Benefits:**| **Runtime** | Node.js | 18+ | Server execution |

- LLM understands semantic nuance| **Protocol** | MCP SDK | 1.0.4 | AI assistant communication |

- Session data provides baseline| **Build** | tsc | 5.7.2 | TypeScript compilation |

- Graceful degradation without sampling| **Testing** | Vitest | 4.0.3 | Unit/integration/e2e tests |

| **Linting** | ESLint | 9.17.0 | Code quality |

**See:** [ADR-003: LLM Sampling Integration](./adr/003-llm-sampling.md)| **Formatting** | Prettier | 3.4.2 | Code style |

| **Parsing** | fast-xml-parser | 5.3.1 | XML parsing |

---| **Parsing** | js-yaml | 4.1.0 | YAML parsing |

| **Parsing** | csv-parse | 6.1.0 | CSV parsing |

### 5. Response Optimization

---

**Responsibility:** Shape MCP responses for LLM comprehension

## File Structure

**Ambiguous Response Optimization:**

- **Before:** 2,847 tokens (raw list of 16 agents)```

- **After:** 1,358 tokens (structured with recommendations)src/

- **Reduction:** 52.3%├── index.ts # Entry point (MCP server startup)

├── cli.ts # CLI entry point (bmad command)

**Techniques:**├── server.ts # BMADServerLiteMultiToolGit (MCP layer)

- Remove redundant metadata├── config.ts # Configuration constants

- Highlight key differentiators├── core/

- Provide ranked recommendations│ ├── bmad-engine.ts # BMADEngine (business logic)

- Include next-step guidance│ └── resource-loader.ts # ResourceLoaderGit (content loading)

├── tools/

**Future Optimizations:**│ ├── index.ts # Tool exports

- Tool description lazy loading (75-80% target)│ ├── bmad-unified.ts # Unified bmad tool

- List operation pagination│ └── operations/

- Conditional detail levels│ ├── list.ts # List operation handler

│ ├── read.ts # Read operation handler

**See:** `src/utils/shaper.ts`│ ├── execute.ts # Execute operation handler

│ └── search.ts # Search operation handler

---├── types/

│ └── index.ts # TypeScript type definitions

## Data Flow└── utils/

    ├── logger.ts         # Logging utilities

### Execute Operation (Key Example) └── git-source-resolver.ts # Git URL parsing

````build/ # Compiled JavaScript (generated)

1. LLM → bmad({ operation: "execute", agent: "analyst", message: "..." })tests/

├── unit/                 # Unit tests (isolated functions)

2. Server → Engine├── integration/          # Integration tests (component interaction)

   ├─ Load agent content (same as read)├── e2e/                  # End-to-end tests (full workflows)

   ├─ Include user message in context├── framework/            # Test infrastructure

   └─ Return execution prompt├── fixtures/             # Test data

└── helpers/              # Test utilities

3. LLM receives:```

   ├─ Agent persona and instructions

   ├─ User message/context---

   └─ Activation steps to follow

## Design Principles

4. LLM interprets and executes:

   ├─ Reads activation: "Load config.yaml"### 1. Transport Agnostic Core

   ├─ Makes tool call → bmad({ type: "resource", uri: "bmad://bmm/config.yaml" })

   ├─ Parses YAML, extracts {user_name}**Principle:** Business logic (BMADEngine) has no MCP dependencies

   ├─ Follows next activation step

   └─ Continues until complete**Benefits:**

````

- Reusable across interfaces (MCP, CLI, HTTP API, etc.)

**Key Insight:** Execute operation delivers content for LLM to interpret - it doesn't execute anything itself.- Easier testing (no transport mocking)

- Clear separation of concerns

---

**Implementation:**

## Key Design Decisions

````typescript

### Why Not Preprocess Variables?// ✅ Engine returns plain objects

interface BMADResult {

**BMAD activation steps:**  success: boolean;

```xml  data?: unknown;

<step n="2">Load {project-root}/bmad/bmm/config.yaml</step>  error?: string;

<step n="3">Remember: user's name is {user_name}</step>  text: string;

```}



**Option A: Server preprocesses (REJECTED)**// ❌ Engine does NOT return MCP types

```typescript// No: CallToolResult, TextContent, etc.

// Server would need to:```

- Parse activation XML

- Detect variable references### 2. Unified Tool Pattern

- Load config.yaml

- Substitute {user_name}**Previous (v3.x):** Tool-per-agent (bmm-analyst, bmm-architect, core-john, etc.)

- Return modified content

- 🔴 100+ tools → LLM confusion

❌ Duplicates BMAD logic in TypeScript- 🔴 Duplicate logic across tools

❌ Breaks when BMAD prompt patterns change- 🔴 Hard to add new agents

❌ Violates Pure Delivery Proxy principle

```**Current (v4.0):** Single unified tool with operation parameter



**Option B: LLM interprets (CHOSEN)**- ✅ 1 tool → clear LLM routing

```typescript- ✅ Shared validation and logic

// Server delivers raw content- ✅ Easy to add agents (just content, no code)

// LLM reads: "Load config.yaml"

// LLM makes tool call to load it### 3. Layered Architecture

// LLM extracts {user_name}

// LLM continues with next step**Transport → Server → Engine → Loader**



✅ BMAD's dynamic prompt engineering works as designedEach layer has single responsibility:

✅ Server stays simple and focused

✅ LLM uses its intelligence- **Transport**: Protocol communication

✅ Changes to BMAD work immediately- **Server**: Request routing

```- **Engine**: Business logic

- **Loader**: Content management

**See:** [ADR-001: Pure Delivery Proxy](./adr/001-pure-delivery-proxy.md)

### 4. Multi-Source with Priority

---

**Source discovery order enables:**

## Related Documentation

- Global defaults (git remotes, user-global)

- **[ADRs](./adr/)** - Architecture decisions with rationale- Project customization (project-local overrides)

- **[API Reference](./api.md)** - MCP tool interface- Zero project clutter (no files in repo if not needed)

- **[Development Guide](./development.md)** - Setup and testing

- **[Research](./research/)** - BMAD dynamics and token optimization---



---## Extension Points



## Changelog### Adding New Operations



**5.0.0 (November 8, 2025)** - Pure Delivery Proxy architecture established  1. Create handler in `src/tools/operations/new-operation.ts`

**4.0.0 (November 6, 2025)** - Unified tool with transport-agnostic engine  2. Export from `src/tools/operations/index.ts`

**3.0.0** - LLM sampling integration + session-based ranking  3. Add to `BMADToolParams` interface

**2.0.0** - Multi-source discovery with git remote support  4. Update `bmad-unified.ts` operation enum

**1.0.0** - Initial MCP server implementation  5. Add validation and execution logic


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
````
