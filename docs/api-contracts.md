# API Contracts - BMAD MCP Server

**Contract Types:** MCP Tools (External) + Internal APIs

---

## Overview

The BMAD MCP Server exposes two types of APIs:

1. **MCP Tools**: External tools available to AI assistants via the Model Context Protocol
2. **Internal APIs**: TypeScript classes and methods for internal server operation

**Protocol Version:** MCP 1.0.4  
**Tool Pattern:** Tool-per-Agent + Specialized Tools  
**Response Format:** JSON-RPC 2.0

---

## MCP Tools (External API)

### Tool Discovery

**Endpoint:** `tools/list`  
**Purpose:** Enumerate all available tools dynamically generated from BMAD agents

**Response Schema:**

```json
{
  "tools": [
    {
      "name": "string",
      "description": "string",
      "inputSchema": {
        "type": "object",
        "properties": {...},
        "required": ["string"]
      }
    }
  ]
}
```

### 1. Agent Tools (Dynamic)

**Pattern:** `{module}-{agent}` or `bmad-{agent}`  
**Quantity:** Variable (1 tool per BMAD agent)  
**Purpose:** Execute specific BMAD agents with contextual messages

#### Tool Schema

```json
{
  "name": "core-john",
  "description": "Product Manager + Investigative Product Strategist + Market-Savvy PM - Product management veteran with 8+ years experience launching B2B and consumer products. Expert in market research, competitive analysis, and user behavior.\n\nAvailable actions:\n• Check workflow status and get recommendations (START HERE!)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "message": {
        "type": "string",
        "description": "Your message or question for Product Manager"
      }
    },
    "required": ["message"]
  }
}
```

#### Invocation Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "core-john",
    "arguments": {
      "message": "Help me analyze the market opportunity for a new SaaS product targeting small businesses"
    }
  }
}
```

#### Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "As a Product Manager with 8+ years of experience, I'll help you analyze this market opportunity...\n\n## Market Analysis Framework\n\n### 1. Target Market Validation\n**TAM (Total Addressable Market):** Small businesses (1-50 employees) represent approximately 5.8 million firms in the US alone, with $1.2T in annual revenue potential.\n\n..."
      }
    ]
  }
}
```

### 2. Workflow Execution Tool

**Name:** `bmad-workflow`  
**Purpose:** Execute BMAD workflows like PRD generation, architecture analysis, debugging

#### Tool Schema

```json
{
  "name": "bmad-workflow",
  "description": "Execute BMAD workflows like prd, architecture, debug-inspect, etc.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "workflow": {
        "type": "string",
        "description": "Workflow name (without the * prefix)"
      },
      "context": {
        "type": "string",
        "description": "Optional context or parameters for the workflow"
      }
    },
    "required": ["workflow"]
  }
}
```

#### Invocation Examples

**Basic Workflow Execution:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "bmad-workflow",
    "arguments": {
      "workflow": "prd",
      "context": "Create a PRD for a task management app"
    }
  }
}
```

**Workflow with Parameters:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "bmad-workflow",
    "arguments": {
      "workflow": "architecture",
      "context": "target_platform: web, team_size: 5, timeline: 3_months"
    }
  }
}
```

### 3. Resources Tool

**Name:** `bmad-resources`  
**Purpose:** Access BMAD resources, discover modules/agents/workflows, search capabilities

#### Tool Schema

```json
{
  "name": "bmad-resources",
  "description": "Access BMAD resources: read files, discover modules/agents/workflows, search by name/description. This is the primary tool for exploring and accessing BMAD content.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "operation": {
        "type": "string",
        "enum": ["read", "list", "modules", "agents", "workflows", "search"],
        "description": "Operation type:\n- read: Get file content from bmad:// URI\n- list: List all available resource files (optionally filtered by pattern)\n- modules: Show all loaded BMAD modules\n- agents: List all available agents with metadata\n- workflows: List all available workflows\n- search: Fuzzy search agents/workflows by name/title/description"
      },
      "uri": {
        "type": "string",
        "description": "The bmad:// URI to read (required for operation=read). Example: \"bmad://core/config.yaml\""
      },
      "pattern": {
        "type": "string",
        "description": "Glob pattern to filter resources (optional for operation=list). Example: \"core/workflows/**/*.yaml\""
      },
      "query": {
        "type": "string",
        "description": "Search query (required for operation=search). Searches in name, title, and description fields."
      },
      "type": {
        "type": "string",
        "enum": ["agents", "workflows", "all"],
        "description": "What to search (for operation=search). Default: all"
      }
    },
    "required": ["operation"]
  }
}
```

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
```

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
