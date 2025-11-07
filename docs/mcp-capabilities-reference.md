# MCP SDK Types and Capabilities Reference

## Official Documentation

- **MCP Specification**: https://modelcontextprotocol.io/specification/latest
- **TypeScript SDK**: https://github.com/modelcontextprotocol/typescript-sdk
- **Type Definitions**: `node_modules/@modelcontextprotocol/sdk/dist/esm/types.d.ts`

## Current BMAD MCP Server Implementation

### ✅ Currently Implemented

| Capability             | Status         | Handler                         | Purpose                                                 |
| ---------------------- | -------------- | ------------------------------- | ------------------------------------------------------- |
| **Resources**          | ✅ Implemented | `ListResources`, `ReadResource` | Expose BMAD files via `bmad://` URIs                    |
| **Resource Templates** | ✅ Implemented | `ListResourceTemplates`         | Dynamic resource URIs with parameters (98.1% reduction) |
| **Tools**              | ✅ Implemented | `ListTools`, `CallTool`         | Unified `bmad` tool with list/read/execute operations   |
| **Prompts**            | ✅ Implemented | `ListPrompts`, `GetPrompt`      | Expose all 16 agents as native MCP prompts              |

### 🔍 Available but Not Yet Implemented

| Capability                 | Request Schemas                               | Use Case for BMAD                                                  | Priority    |
| -------------------------- | --------------------------------------------- | ------------------------------------------------------------------ | ----------- |
| **Resource Subscriptions** | `Subscribe`, `Unsubscribe`, `ResourceUpdated` | Real-time updates when BMAD files change                           | ⭐⭐ Medium |
| **Completions**            | `Complete`                                    | Auto-complete for agent names, workflow names, resource URIs       | ⭐⭐ Medium |
| **Sampling**               | `CreateMessage`                               | Allow agents to request LLM responses (agent-to-LLM communication) | ⭐ Low      |
| **Roots**                  | `ListRoots`, `RootsListChanged`               | Expose project root paths for multi-project scenarios              | ⭐ Low      |
| **Logging**                | `SetLevel`, `LoggingMessage`                  | Debug logging for MCP protocol                                     | ⭐ Low      |

## Detailed Capability Analysis

### 1. Resource Templates ✅ **IMPLEMENTED**

**What it does**: Define parameterized resource URIs that clients can discover and use.

**Implementation**: Exposed 7 resource templates that replace 368 static resources.

**Templates Available:**

- `bmad://{module}/agents/{agent}.md` - Agent source files
- `bmad://{module}/workflows/{workflow}/workflow.yaml` - Workflow configurations
- `bmad://{module}/workflows/{workflow}/instructions.md` - Workflow instructions
- `bmad://{module}/workflows/{workflow}/template.md` - Workflow templates
- `bmad://{module}/knowledge/{category}/{file}` - Knowledge base articles
- `bmad://_cfg/agents/{agent}.customize.yaml` - Agent customization
- `bmad://core/config.yaml` - Core configuration

**Benefits Achieved:**

- ✅ 98.1% reduction in exposed resources (368 → 7)
- ✅ Cleaner, self-documenting API
- ✅ Better client discovery experience
- ✅ Smaller payloads for resource listing

**Documentation**: See [Resource Templates Guide](./resource-templates-guide.md)

---

### 2. Resource Subscriptions ⭐⭐ **Good for Development**

**What it does**: Notify clients when resources change on disk.

**Use case**: During development, if a user edits an agent file, the client gets notified and can refresh.

**Implementation**:

```typescript
// Client subscribes to a resource
server.setRequestHandler(SubscribeRequestSchema, async (request) => {
  const uri = request.params.uri;
  // Track subscription
  subscriptions.add(uri);
  return {};
});

// When file changes (using fs.watch)
fs.watch(agentPath, () => {
  server.notification({
    method: 'notifications/resources/updated',
    params: { uri: 'bmad://bmm/agents/analyst.md' },
  });
});
```

**Benefits**:

- Live reload during development
- Always-fresh agent definitions
- Better DX for BMAD developers

---

### 3. Completions ⭐⭐ **Nice UX Enhancement**

**What it does**: Provide autocomplete suggestions for parameters.

**Use case**: When user types agent name or workflow name, show suggestions.

**Implementation**:

```typescript
server.setRequestHandler(CompleteRequestSchema, async (request) => {
  const { ref, argument } = request.params;

  if (ref.type === 'ref/prompt') {
    // Complete prompt (agent) names
    const agents = await engine.getAgentMetadata();
    return {
      completion: {
        values: agents
          .filter((a) => a.name.startsWith(argument.value))
          .map((a) => `${a.module}-${a.name}`),
      },
    };
  }

  return { completion: { values: [] } };
});
```

**Benefits**:

- Better UX in MCP clients
- Fewer typos
- Discoverability

---

### 4. Sampling ⭐ **Advanced Use Case**

**What it does**: Allows the server to request LLM completions from the client.

**Use case**: BMAD agents could use this to internally consult the LLM during workflow execution.

**Example**: An agent executing a workflow could ask the LLM questions during execution:

```typescript
const response = await server.request({
  method: 'sampling/createMessage',
  params: {
    messages: [
      { role: 'user', content: 'Should we use REST or GraphQL for this API?' },
    ],
    systemPrompt: 'You are a technical architect...',
    maxTokens: 500,
  },
});
```

**Benefits**:

- More intelligent workflows
- Agent-driven LLM interactions
- Dynamic decision making

**Challenges**:

- Requires careful prompt design
- Potential infinite loops
- Cost implications

---

### 5. Roots ⭐ **Multi-Project Scenarios**

**What it does**: Expose multiple project roots that the server has access to.

**Use case**: If BMAD server manages multiple project workspaces simultaneously.

**Current state**: We only expose the configured BMAD root, not project roots.

**Potential use**:

```typescript
server.setRequestHandler(ListRootsRequestSchema, async () => {
  return {
    roots: [
      {
        uri: 'file:///Users/user/project1',
        name: 'Project 1',
      },
      {
        uri: 'file:///Users/user/project2',
        name: 'Project 2',
      },
    ],
  };
});
```

**Benefits**:

- Multi-project management
- Workspace switching
- Better organization

---

## Recommendations

### Immediate Priority (Recently Completed)

1. **Resource Templates** ✅ **IMPLEMENTED**
   - Replaced 368 static resources with 7 templates
   - 98.1% reduction in exposed resources
   - Cleaner, self-documenting API
   - See [Resource Templates Guide](./resource-templates-guide.md)

### Medium Priority (Consider for v5.0)

2. **Completions** ⭐⭐
   - Improve UX in compatible clients
   - Low effort, high value
   - **Effort**: Low (1-2 hours)

3. **Resource Subscriptions** ⭐⭐
   - Great for development workflow
   - Requires file watching infrastructure
   - **Effort**: Medium (3-4 hours)

### Low Priority (Future Enhancement)

4. **Sampling** ⭐
   - Advanced workflows only
   - Requires careful design
   - **Effort**: High (design + implementation)

5. **Roots** ⭐
   - Only needed for multi-project support
   - Current single-root works fine
   - **Effort**: Low, but questionable value

---

## MCP Protocol Type Reference

### Server Request Handlers (What clients can call)

```typescript
// Resources
ListResourcesRequestSchema; // List all resources ✅
ListResourceTemplatesRequestSchema; // List resource templates ✅
ReadResourceRequestSchema; // Read specific resource ✅
SubscribeRequestSchema; // Subscribe to resource updates ⭐

// Prompts
ListPromptsRequestSchema; // List all prompts ✅
GetPromptRequestSchema; // Get specific prompt ✅

// Tools
ListToolsRequestSchema; // List all tools ✅
CallToolRequestSchema; // Call a tool ✅

// Completions
CompleteRequestSchema; // Get autocomplete suggestions ⭐

// Sampling (Server-to-Client)
CreateMessageRequestSchema; // Request LLM completion ⭐

// Roots
ListRootsRequestSchema; // List workspace roots ⭐

// Logging
SetLevelRequestSchema; // Set logging level
```

### Server Notifications (What server can send)

```typescript
ResourceListChangedNotification; // Resource list changed
ResourceUpdatedNotification; // Specific resource updated ⭐
PromptListChangedNotification; // Prompt list changed
ToolListChangedNotification; // Tool list changed
RootsListChangedNotification; // Roots list changed
LoggingMessageNotification; // Log message
ProgressNotification; // Operation progress
```

### Server Capabilities Declaration

```typescript
{
  capabilities: {
    resources: {},                    // ✅ Implemented
    resourceTemplates: {},            // ✅ Implemented
    prompts: {},                      // ✅ Implemented
    tools: {},                        // ✅ Implemented
    completions: {},                  // ⭐ Nice to have
    sampling: {},                     // ⭐ Advanced
    roots: {},                        // ⭐ Multi-project
    logging: {}                       // ⭐ Debugging
  }
}
```

---

## Summary

**Current Implementation**: ✅ Comprehensive foundation (Resources, Resource Templates, Tools, Prompts)

**Next Steps**:

1. ⭐⭐ Add Completions (better UX)
2. ⭐⭐ Add Resource Subscriptions (development workflow)

**Type Definitions**: All types available in `@modelcontextprotocol/sdk/types.js`

**Documentation**: https://modelcontextprotocol.io/specification/latest
