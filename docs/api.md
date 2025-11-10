# API Contracts - BMAD MCP Server

> **⚠️ NOTE:** This documentation is being updated. The `message` parameter has been removed from execute operations.  
> Execute operations now rely solely on conversation history for context. See bmad-unified.ts for current schema.

**Version:** 4.0.0  
**Protocol:** MCP 1.0.4  
**Last Updated:** November 10, 2025

---

## Overview

The BMAD MCP Server exposes two API layers:

1. **MCP Tools API** - External interface for AI assistants via Model Context Protocol
2. **TypeScript API** - Internal classes and methods for server operation

**Key Change in v4.0:** Unified tool architecture - single `bmad` tool replaces 100+ individual agent tools.

---

## MCP Tools API

### Tool: `bmad`

**Purpose:** Unified access to all BMAD functionality through a single intelligent tool

**Operations:**

- `list` - Discover agents, workflows, modules, resources
- `read` - Inspect agent/workflow definitions (read-only, no execution)
- `execute` - Run agents/workflows with user context (performs actions)
- `search` - Find agents/workflows by name/description (optional)

#### Tool Schema

```json
{
  "name": "bmad",
  "description": "Execute BMAD agents and workflows. Provides access to all BMAD modules.\n\n**Operations:**\n- `list`: Discover available agents/workflows/modules/resources\n- `read`: Inspect agent or workflow details (read-only, no execution)\n- `execute`: Run agent or workflow with user context (performs actions)\n\n**Available Agents:**\n\nBMM Module:\n  - analyst (Mary): Business Analyst\n  - architect (Winston): Architect\n  - debug (Diana): Debug Specialist\n  - dev (Amelia): Developer Agent\n  - pm (John): Product Manager\n  ...\n\n**Available Workflows:**\n\nBMM Module:\n  - prd: Product Requirements Document workflow\n  - architecture: Architecture design workflow\n  - debug-inspect: Comprehensive debugging workflow\n  ...\n\n**Usage Guide:**\n\n**When to use each operation:**\n- `list` - User asks \"what agents/workflows are available?\"\n- `read` - User asks \"what does the analyst do?\"\n- `execute` - User wants to actually run an agent/workflow\n\n**Examples:**\n\nDiscovery:\n  { operation: \"list\", query: \"agents\" }\n  { operation: \"list\", query: \"workflows\", module: \"bmm\" }\n\nCapability Query:\n  { operation: \"read\", type: \"agent\", agent: \"analyst\" }\n  { operation: \"read\", type: \"workflow\", workflow: \"prd\" }\n\nExecution:\n  { operation: \"execute\", agent: \"analyst\", message: \"Help me brainstorm\" }\n  { operation: \"execute\", workflow: \"prd\", message: \"Create PRD for app\" }\n",
  "inputSchema": {
    "type": "object",
    "properties": {
      "operation": {
        "type": "string",
        "enum": ["list", "read", "execute"],
        "description": "Operation type:\n- list: Get available agents/workflows/modules\n- read": Inspect agent or workflow details\n- execute: Run agent or workflow"
      },
      "query": {
        "type": "string",
        "description": "For list operation: \"agents\", \"workflows\", \"modules\", \"resources\""
      },
      "type": {
        "type": "string",
        "enum": ["agent", "workflow", "resource"],
        "description": "For read operation: type of resource to read"
      },
      "agent": {
        "type": "string",
        "description": "Agent name (for read/execute with agents)"
      },
      "workflow": {
        "type": "string",
        "description": "Workflow name (for read/execute with workflows)"
      },
      "module": {
        "type": "string",
        "enum": ["core", "bmm", "cis"],
        "description": "Optional module filter"
      },
      "message": {
        "type": "string",
        "description": "For execute operation: user's message or context"
      },
      "uri": {
        "type": "string",
        "description": "For read resource: bmad:// URI"
      }
    },
    "required": ["operation"]
  }
}
```

#### Operation 1: List

**Purpose:** Discover available agents, workflows, modules, resources

**Examples:**

```json
// List all agents
{
  "operation": "list",
  "query": "agents"
}

// List workflows in BMM module
{
  "operation": "list",
  "query": "workflows",
  "module": "bmm"
}

// List all modules
{
  "operation": "list",
  "query": "modules"
}

// List resources with pattern filter
{
  "operation": "list",
  "query": "resources",
  "pattern": "core/workflows/**/*.yaml"
}
```

**Response Format:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Available Agents:\n\n**BMM Module:**\n- analyst (Mary) - Business Analyst\n- architect (Winston) - Architect\n- debug (Diana) - Debug Specialist\n..."
    }
  ]
}
```

#### Operation 2: Read

**Purpose:** Inspect agent or workflow details without executing

**Examples:**

```json
// Read agent definition
{
  "operation": "read",
  "type": "agent",
  "agent": "analyst"
}

// Read workflow definition
{
  "operation": "read",
  "type": "workflow",
  "workflow": "prd",
  "module": "bmm"
}

// Read resource file
{
  "operation": "read",
  "type": "resource",
  "uri": "bmad://core/config.yaml"
}
```

**Response Format (Agent):**

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"name\": \"analyst\",\n  \"displayName\": \"Mary\",\n  \"title\": \"Business Analyst\",\n  \"module\": \"bmm\",\n  \"description\": \"Strategic analyst with market research expertise\",\n  \"capabilities\": [...],\n  \"workflows\": [...],\n  \"content\": \"# Full agent markdown...\"\n}"
    }
  ]
}
```

#### Operation 3: Execute

**Purpose:** Run agent or workflow with user context

**Examples:**

```json
// Execute agent
{
  "operation": "execute",
  "agent": "analyst",
  "message": "Help me analyze the market for a SaaS product"
}

// Execute workflow
{
  "operation": "execute",
  "workflow": "prd",
  "message": "Create PRD for task management app"
}

// Execute with module disambiguation
{
  "operation": "execute",
  "agent": "debug",
  "module": "bmm",
  "message": "Analyze this bug"
}
```

**Response Format:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "---\n\nagent: analyst\nmenu-item: execute\nuser-prompt: Help me analyze the market\n\n---\n\n[Agent execution prompt with instructions for AI to assume agent role]\n\n**Your role:** You are now Mary, the Business Analyst...\n\n**User request:** Help me analyze the market for a SaaS product\n\n**Instructions:** ...\n"
    }
  ]
}
```

---

## MCP Resources API

### Resource URI Scheme

**Format:** `bmad://{relative-path}`

**Examples:**

```
bmad://core/config.yaml
bmad://bmm/agents/analyst.md
bmad://bmm/workflows/prd/workflow.yaml
bmad://bmm/workflows/prd/instructions.md
bmad://cis/knowledge/brainstorming/scamper.md
```

### List Resources

**Request:**

```json
{
  "method": "resources/list",
  "params": {}
}
```

**Response:**

```json
{
  "resources": [
    {
      "uri": "bmad://core/config.yaml",
      "name": "core/config.yaml",
      "description": "BMAD resource: core/config.yaml",
      "mimeType": "application/x-yaml"
    },
    {
      "uri": "bmad://bmm/agents/analyst.md",
      "name": "bmm/agents/analyst.md",
      "description": "BMAD resource: bmm/agents/analyst.md",
      "mimeType": "text/markdown"
    }
  ]
}
```

### Read Resource

**Request:**

```json
{
  "method": "resources/read",
  "params": {
    "uri": "bmad://core/config.yaml"
  }
}
```

**Response:**

```json
{
  "contents": [
    {
      "uri": "bmad://core/config.yaml",
      "mimeType": "application/x-yaml",
      "text": "# BMAD Core Configuration\nversion: 6.0.0\n..."
    }
  ]
}
```

### Resource Templates

**Available Templates:**

| Template              | Description          | Example URI                                            |
| --------------------- | -------------------- | ------------------------------------------------------ |
| Agent Source          | Agent markdown files | `bmad://{module}/agents/{agent}.md`                    |
| Workflow Definition   | Workflow YAML config | `bmad://{module}/workflows/{workflow}/workflow.yaml`   |
| Workflow Instructions | Workflow steps       | `bmad://{module}/workflows/{workflow}/instructions.md` |
| Workflow Template     | Output template      | `bmad://{module}/workflows/{workflow}/template.md`     |
| Knowledge Base        | Knowledge articles   | `bmad://{module}/knowledge/{category}/{file}`          |
| Agent Customization   | Customization config | `bmad://_cfg/agents/{agent}.customize.yaml`            |
| Core Config           | Core configuration   | `bmad://core/config.yaml`                              |

**Request:**

```json
{
  "method": "resources/templates/list",
  "params": {}
}
```

---

## MCP Prompts API

### List Prompts

**Request:**

```json
{
  "method": "prompts/list",
  "params": {}
}
```

**Response:**

```json
{
  "prompts": [
    {
      "name": "agent-execution",
      "description": "Execute a BMAD agent with context",
      "arguments": [
        { "name": "agent", "description": "Agent name", "required": true },
        { "name": "message", "description": "User message", "required": false }
      ]
    },
    {
      "name": "workflow-execution",
      "description": "Execute a BMAD workflow",
      "arguments": [
        {
          "name": "workflow",
          "description": "Workflow name",
          "required": true
        },
        { "name": "message", "description": "Context", "required": false }
      ]
    }
  ]
}
```

### Get Prompt

**Request:**

```json
{
  "method": "prompts/get",
  "params": {
    "name": "agent-execution",
    "arguments": {
      "agent": "analyst",
      "message": "Help me analyze the market"
    }
  }
}
```

**Response:**

```json
{
  "messages": [
    {
      "role": "user",
      "content": {
        "type": "text",
        "text": "Execute analyst agent with message: Help me analyze the market"
      }
    }
  ]
}
```

---

## MCP Completions API

### Argument Completions

**Request:**

```json
{
  "method": "completion/complete",
  "params": {
    "ref": {
      "type": "ref/prompt",
      "name": "agent-execution"
    },
    "argument": {
      "name": "agent",
      "value": "ana"
    }
  }
}
```

**Response:**

```json
{
  "completion": {
    "values": ["analyst"],
    "total": 1,
    "hasMore": false
  }
}
```

---

## TypeScript API (Internal)

### BMADEngine

**Location:** `src/core/bmad-engine.ts`

**Purpose:** Transport-agnostic business logic core

```typescript
class BMADEngine {
  constructor(projectRoot?: string, gitRemotes?: string[]);

  // Initialization
  async initialize(): Promise<void>;

  // List operations
  async listAgents(filter?: ListFilter): Promise<AgentMetadata[]>;
  async listWorkflows(filter?: ListFilter): Promise<Workflow[]>;
  async listModules(): Promise<string[]>;
  async listResources(pattern?: string): Promise<ResourceFile[]>;

  // Read operations
  async readAgent(name: string, module?: string): Promise<AgentDefinition>;
  async readWorkflow(
    name: string,
    module?: string,
  ): Promise<WorkflowDefinition>;
  async readResource(uri: string): Promise<string>;

  // Execute operations
  async executeAgent(params: ExecuteParams): Promise<BMADResult>;
  async executeWorkflow(params: ExecuteParams): Promise<BMADResult>;

  // Search operations
  async searchAgents(query: string): Promise<AgentMetadata[]>;
  async searchWorkflows(query: string): Promise<Workflow[]>;

  // Getters
  getCachedResources(): ResourceFile[];
  getAgents(): AgentMetadata[];
  getWorkflows(): Workflow[];
}
```

### ResourceLoaderGit

**Location:** `src/core/resource-loader.ts`

**Purpose:** Multi-source BMAD content loading

```typescript
class ResourceLoaderGit {
  constructor(projectRoot?: string, gitRemotes?: string[]);

  // Initialization
  async initialize(): Promise<void>;
  async loadManifests(): Promise<void>;

  // Discovery
  getAgent(name: string, module?: string): AgentMetadata | undefined;
  getWorkflow(name: string, module?: string): Workflow | undefined;
  getResource(relativePath: string): ResourceFile | undefined;

  // Listing
  getAllAgents(module?: string): AgentMetadata[];
  getAllWorkflows(module?: string): Workflow[];
  getAllResources(pattern?: string): ResourceFile[];
  getModules(): string[];

  // File operations
  async readFile(relativePath: string): Promise<string>;

  // Search
  searchAgents(query: string): AgentMetadata[];
  searchWorkflows(query: string): Workflow[];
}
```

### BMADServerLiteMultiToolGit

**Location:** `src/server.ts`

**Purpose:** MCP server implementation

```typescript
class BMADServerLiteMultiToolGit {
  constructor(projectRoot?: string, gitRemotes?: string[]);

  async start(): Promise<void>;

  private setupHandlers(): void;
  private getMimeType(path: string): string;
}
```

---

## Type Definitions

### Core Types

```typescript
// Agent metadata
interface AgentMetadata {
  name: string;
  displayName: string;
  title: string;
  module?: string;
  description?: string;
  persona?: string;
  capabilities?: string[];
  workflows?: string[];
}

// Workflow definition
interface Workflow {
  name: string;
  description: string;
  module: string;
  standalone?: boolean;
}

// Resource file
interface ResourceFile {
  relativePath: string;
  fullPath: string;
  source: 'project' | 'user' | 'git';
  content?: string;
}

// Operation result
interface BMADResult {
  success: boolean;
  data?: unknown;
  error?: string;
  text: string;
}

// List filter
interface ListFilter {
  module?: string;
  pattern?: string;
}

// Execute parameters
interface ExecuteParams {
  agent?: string;
  workflow?: string;
  message?: string;
  module?: string;
}
```

---

## Error Handling

### Error Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Invalid Request",
    "data": {
      "details": "Missing required parameter: operation"
    }
  }
}
```

### Common Error Codes

| Code   | Meaning          | Example                    |
| ------ | ---------------- | -------------------------- |
| -32600 | Invalid Request  | Missing required parameter |
| -32601 | Method not found | Unknown MCP method         |
| -32602 | Invalid params   | Invalid operation type     |
| -32603 | Internal error   | File read failure          |

### Validation Errors

**Invalid Operation:**

```json
{
  "error": "Invalid operation. Supported: list, read, execute"
}
```

**Missing Parameters:**

```json
{
  "error": "Missing required parameter: agent name for read operation"
}
```

**Not Found:**

```json
{
  "error": "Agent 'unknown' not found in any module"
}
```

---

## Usage Patterns

### Pattern 1: Discovery → Read → Execute

```typescript
// 1. Discover available agents
await bmad({ operation: 'list', query: 'agents' });

// 2. Read agent details
await bmad({ operation: 'read', type: 'agent', agent: 'analyst' });

// 3. Execute agent
await bmad({ operation: 'execute', agent: 'analyst', message: 'Help me...' });
```

### Pattern 2: Direct Execution

```typescript
// Execute directly if you know the agent
await bmad({
  operation: 'execute',
  agent: 'analyst',
  message: 'Analyze market for SaaS product',
});
```

### Pattern 3: Module Filtering

```typescript
// List only BMM workflows
await bmad({ operation: 'list', query: 'workflows', module: 'bmm' });

// Execute with module hint (disambiguation)
await bmad({ operation: 'execute', agent: 'debug', module: 'bmm' });
```

---

## Migration from v3.x

### Old Pattern (Tool-per-Agent)

```json
// v3.x - Multiple tools
{"name": "bmm-analyst", "arguments": {"message": "Help me"}}
{"name": "bmm-architect", "arguments": {"message": "Design this"}}
{"name": "core-john", "arguments": {"message": "Create PRD"}}
```

### New Pattern (Unified Tool)

```json
// v4.0 - Single tool with operation
{"name": "bmad", "arguments": {"operation": "execute", "agent": "analyst", "message": "Help me"}}
{"name": "bmad", "arguments": {"operation": "execute", "agent": "architect", "message": "Design this"}}
{"name": "bmad", "arguments": {"operation": "execute", "agent": "pm", "message": "Create PRD"}}
```

### Benefits of Migration

- ✅ Single tool → easier LLM routing
- ✅ Consistent parameter structure
- ✅ Better validation and error messages
- ✅ Read-only inspection without execution
- ✅ Discovery without knowing all agent names

---

## Performance

### Latency Expectations

| Operation | First Call | Subsequent Calls            |
| --------- | ---------- | --------------------------- |
| List      | ~100-500ms | <10ms (cached)              |
| Read      | ~50-200ms  | <10ms (cached)              |
| Execute   | ~100-500ms | Variable (depends on agent) |

### Caching Strategy

- **Manifests:** Loaded once on initialization, cached in memory
- **Resources:** Lazy-loaded on read, cached in memory
- **Git clones:** Cached on disk at `~/.bmad/cache/git/`

---

## Testing the API

### Using Scripts

```bash
# List all tools
npm run cli:list-tools

# List agents
npm run cli:list-agents

# List workflows
npm run cli:list-workflows

# Test tool execution
node scripts/test-tool-output.mjs
```

### Using Test Suite

```bash
# Run all tests
npm run test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

---

## References

- **MCP Specification:** https://modelcontextprotocol.io/specification/
- **MCP SDK:** https://github.com/modelcontextprotocol/typescript-sdk
- **BMAD Method:** https://github.com/bmad-code-org/BMAD-METHOD

          "description": "What to search (for operation=search). Default: all"
        }
      },
      "required": ["operation"]

  }
  }

````

#### Operation Examples

**Read a specific file:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "bmad-resources",
    "arguments": {
      "operation": "read",
      "uri": "bmad://core/workflows/prd-workflow.yaml"
    }
  }
}
````

**List workflow files:**

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "bmad-resources",
    "arguments": {
      "operation": "list",
      "pattern": "**/workflows/*.yaml"
    }
  }
}
```

**Search for agents:**

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "bmad-resources",
    "arguments": {
      "operation": "search",
      "query": "product manager",
      "type": "agents"
    }
  }
}
```

**List all agents:**

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "bmad-resources",
    "arguments": {
      "operation": "agents"
    }
  }
}
```

---

## MCP Resources (File Access)

### Resource Discovery

**Endpoint:** `resources/list`  
**Purpose:** List all available BMAD resource files

**Response Schema:**

```json
{
  "resources": [
    {
      "uri": "bmad://core/config.yaml",
      "name": "core/config.yaml",
      "description": "BMAD resource: core/config.yaml (source: git)",
      "mimeType": "application/x-yaml"
    }
  ]
}
```

### Resource Reading

**Endpoint:** `resources/read`  
**Purpose:** Read content of specific BMAD resource files

**Request Schema:**

```json
{
  "params": {
    "uri": "bmad://core/workflows/prd-workflow.yaml"
  }
}
```

**Response Schema:**

```json
{
  "contents": [
    {
      "uri": "bmad://core/workflows/prd-workflow.yaml",
      "mimeType": "application/x-yaml",
      "text": "# PRD Workflow Configuration\n\nname: prd\n..."
    }
  ]
}
```

### URI Format

**Pattern:** `bmad://{relativePath}`  
**Examples:**

- `bmad://core/config.yaml`
- `bmad://bmm/workflows/architecture-workflow.yaml`
- `bmad://cis/prompts/brainstorming-guide.md`

**MIME Type Mapping:**

- `.md` → `text/markdown`
- `.yaml`/`.yml` → `application/x-yaml`
- `.json` → `application/json`
- `.xml` → `application/xml`
- `.csv` → `text/csv`
- Other → `text/plain`

---

## Internal APIs (TypeScript)

### ResourceLoaderGit Class

**Purpose:** Multi-source BMAD resource discovery and loading  
**File:** `src/resource-loader.ts`  
**Architecture:** Priority-based resolution (project → user → git)

#### Public Methods

##### `loadAgent(name: string): Promise<Resource>`

**Purpose:** Load a specific agent by name  
**Parameters:**

- `name`: Agent name (e.g., "john", "architect")  
  **Returns:** `Promise<Resource>` with content, path, and source  
  **Throws:** Error if agent not found

##### `loadWorkflow(name: string): Promise<Resource>`

**Purpose:** Load a specific workflow by name  
**Parameters:**

- `name`: Workflow name (e.g., "prd", "architecture")  
  **Returns:** `Promise<Resource>` with YAML content  
  **Throws:** Error if workflow not found

##### `listAgents(): Promise<string[]>`

**Purpose:** Get list of all available agent names  
**Returns:** `Promise<string[]>` of agent names  
**Throws:** Never (returns empty array on error)

##### `listWorkflows(): Promise<string[]>`

**Purpose:** Get list of all available workflow names  
**Returns:** `Promise<string[]>` of workflow names  
**Throws:** Never (returns empty array on error)

##### `getAgentMetadata(name: string): Promise<AgentMetadata | null>`

**Purpose:** Get detailed metadata for a specific agent  
**Parameters:**

- `name`: Agent name  
  **Returns:** `Promise<AgentMetadata | null>` with full agent information  
  **Throws:** Never (returns null on error)

##### `listAgentsWithMetadata(): Promise<AgentMetadata[]>`

**Purpose:** Get metadata for all available agents  
**Returns:** `Promise<AgentMetadata[]>` with full agent details  
**Throws:** Never (returns empty array on error)

##### `listAllFiles(): Promise<FileInfo[]>`

**Purpose:** Recursively list all BMAD resource files  
**Returns:** `Promise<FileInfo[]>` with relative paths, full paths, and sources  
**Throws:** Never (returns empty array on error)

##### `loadFile(relativePath: string): Promise<string>`

**Purpose:** Load any BMAD file by relative path  
**Parameters:**

- `relativePath`: Path relative to BMAD root (e.g., "core/config.yaml")  
  **Returns:** `Promise<string>` with file content  
  **Throws:** Error if file not found or unreadable

#### Internal Methods

##### `detectPathType(): PathType`

**Purpose:** Determine BMAD directory structure (flat vs modular)  
**Algorithm:** Priority-based search with fallback logic  
**Returns:** Path type classification

##### `walkDirectory(): FileInfo[]`

**Purpose:** Recursively walk directory tree collecting files  
**Parameters:** Directory path, base directory, source type, accumulator  
**Returns:** Array of file information objects

### GitSourceResolver Class

**Purpose:** Intelligent Git repository caching and resolution  
**File:** `src/utils/git-source-resolver.ts`  
**Features:** Smart hashing, atomic operations, auto-updates

#### Public Methods

##### `resolve(gitUrl: string): Promise<string>`

**Purpose:** Resolve git+ URL to local cached path  
**Parameters:**

- `gitUrl`: Git URL (e.g., "git+https://github.com/org/repo.git#branch:/subpath")  
  **Returns:** `Promise<string>` local cache path  
  **Throws:** Error on clone/update failure

##### `clearCache(): Promise<void>`

**Purpose:** Clear all cached Git repositories  
**Returns:** `Promise<void>`  
**Throws:** Error on filesystem operations

##### `listCache(): Promise<CacheEntry[]>`

**Purpose:** List all cached repositories with metadata  
**Returns:** `Promise<CacheEntry[]>` with cache information  
**Throws:** Error on filesystem operations

#### URL Format Support

**Supported Patterns:**

- `git+https://github.com/org/repo.git`
- `git+https://github.com/org/repo.git#branch`
- `git+https://github.com/org/repo.git#v1.0.0`
- `git+https://github.com/org/repo.git#commit:/subpath`

**Parsed Components:**

```typescript
interface GitUrlSpec {
  protocol: 'https' | 'ssh';
  host: string;
  org: string;
  repo: string;
  ref: string; // branch, tag, or commit
  subpath?: string; // optional path within repo
}
```

### BMADServerLiteMultiToolGit Class

**Purpose:** Main MCP server implementation  
**File:** `src/server.ts`  
**Pattern:** Tool-per-agent with lazy initialization

#### Public Methods

##### `constructor(projectRoot?: string, gitRemotes?: string[])`

**Purpose:** Initialize MCP server with configuration  
**Parameters:**

- `projectRoot?`: Override default project root discovery
- `gitRemotes?`: Additional Git remote sources  
  **Side Effects:** Registers MCP protocol handlers

##### `initialize(): Promise<void>`

**Purpose:** Lazy-load all agents, workflows, and resources  
**Returns:** `Promise<void>`  
**Side Effects:** Populates in-memory caches

#### Private Methods

##### `setupHandlers(): void`

**Purpose:** Register MCP request handlers  
**Handlers Registered:**

- `ListToolsRequestSchema`
- `CallToolRequestSchema`
- `ListResourcesRequestSchema`
- `ReadResourceRequestSchema`

##### `invokeAgent(agent: AgentMetadata, message: string): Promise<string>`

**Purpose:** Execute agent with message context  
**Parameters:**

- `agent`: Agent metadata
- `message`: User message/question  
  **Returns:** `Promise<string>` agent response

##### `executeWorkflow(workflowName: string, context?: string): Promise<string>`

**Purpose:** Execute BMAD workflow  
**Parameters:**

- `workflowName`: Workflow identifier
- `context?`: Optional execution context  
  **Returns:** `Promise<string>` workflow result

##### `formatAgentDescription(agent: AgentMetadata): string`

**Purpose:** Generate tool description from agent metadata  
**Parameters:**

- `agent`: Agent metadata  
  **Returns:** `string` formatted description with capabilities

---

## Data Types and Interfaces

### Core Types

#### `Resource`

```typescript
interface Resource {
  name: string;
  path: string;
  content: string;
  source: 'project' | 'user' | 'git';
}
```

#### `AgentMetadata`

```typescript
interface AgentMetadata {
  name: string;
  title: string;
  displayName: string;
  description?: string;
  persona?: string;
  capabilities?: string[];
  menuItems?: string[];
  module?: string;
  workflows?: string[];
  workflowMenuItems?: string[];
}
```

#### `WorkflowContext`

```typescript
interface WorkflowContext {
  bmadServerRoot: string;
  projectRoot: string;
  mcpResources: string;
  agentManifestPath: string;
  agentManifestData: Agent[];
  agentCount: number;
  placeholders: {
    project_root: string;
    bmad_root: string;
    module_root: string;
    config_source: string;
    installed_path: string;
    output_folder: string;
  };
  moduleInfo?: {
    name: string;
    version?: string;
    bmadVersion?: string;
  };
  originInfo?: {
    kind: BmadOriginSource;
    displayName: string;
    priority: number;
  };
}
```

### Error Handling

#### Error Types

- **Resource Not Found**: File or agent doesn't exist
- **Invalid URI**: Malformed `bmad://` URI
- **Git Clone Failure**: Network or authentication issues
- **Permission Denied**: File system access issues

#### Error Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Resource not found: core/missing-file.yaml (Error: ENOENT: no such file or directory)",
    "data": {
      "uri": "bmad://core/missing-file.yaml",
      "suggestions": ["bmad://core/config.yaml", "bmad://core/workflows/"]
    }
  }
}
```

---

## Protocol Compliance

### MCP 1.0.4 Features Used

- ✅ **Tools**: Dynamic tool enumeration and execution
- ✅ **Resources**: File-based resource access with MIME types
- ✅ **Stdio Transport**: JSON-RPC 2.0 over standard I/O
- ✅ **Error Handling**: Structured error responses

### JSON-RPC 2.0 Compliance

- ✅ **Request Format**: `{"jsonrpc": "2.0", "id": number, "method": string, "params": object}`
- ✅ **Response Format**: `{"jsonrpc": "2.0", "id": number, "result": object}`
- ✅ **Error Format**: `{"jsonrpc": "2.0", "id": number, "error": {"code": number, "message": string}}`
- ✅ **Notification Support**: Bidirectional communication

---

## Performance Characteristics

### Latency Expectations

| Operation          | Expected Latency | Notes                       |
| ------------------ | ---------------- | --------------------------- |
| Tool List          | <100ms           | Cached in memory            |
| Agent Execution    | 1-30s            | Depends on agent complexity |
| Workflow Execution | 5-60s            | Multi-step processes        |
| Resource List      | <500ms           | File system scan            |
| File Read          | <100ms           | Direct file access          |
| Git Resolution     | 1-30s            | Network dependent           |

### Caching Strategy

- **Agent Metadata**: In-memory cache, populated on first access
- **File Lists**: In-memory cache with lazy loading
- **Git Repositories**: Local filesystem cache with validation
- **Resource Content**: Read from disk on demand

### Scalability Limits

- **Concurrent Requests**: Limited by Node.js single-threaded nature
- **Memory Usage**: ~50MB baseline + cached Git repositories
- **File Size**: No hard limits, but large files may impact performance
- **Git Repository Size**: Limited by available disk space

---

## Security Considerations

### Input Validation

- **URI Sanitization**: Strict regex validation for `bmad://` URIs
- **Path Traversal Prevention**: Relative path resolution prevents `../../../` attacks
- **Git URL Validation**: Protocol and format validation for remote sources

### Access Control

- **Tool Scoping**: Each agent becomes isolated tool with specific capabilities
- **Resource Scoping**: Files scoped to source (project/user/git)
- **Cache Isolation**: Git repositories cached in user-specific directories

### Safe Execution

- **No Code Execution**: BMAD agents are data files, not executable code
- **Read-Only Access**: All operations are read-only (no file modification)
- **Timeout Protection**: Git operations have configurable timeouts

---

**MCP Version:** 1.0.4  
**Next Review:** After API changes
