# MCP Completions Guide

## Overview

MCP Completions provide **autocomplete support** for prompts and resources, making it easier for users and clients to discover and use BMAD agents and resources without memorizing exact names.

**Key Benefits:**

- 🎯 **Smart Autocomplete** - Type-ahead suggestions for agent names and resources
- 🔍 **Fuzzy Matching** - Partial string matching for flexible discovery
- ⚡ **Fast** - In-memory filtering with <1ms response time
- 📦 **Comprehensive** - Covers 16 agents and 368 resources
- 🔤 **Case Insensitive** - Works regardless of input casing

## Supported Completion Types

### 1. Prompt Completions (Agent Names)

Autocomplete agent names when using MCP prompts.

**Reference Type:** `ref/prompt`

**Example:**

```typescript
// User types: "ana"
// Completions suggest: ["bmm.analyst"]

// User types: "bmm"
// Completions suggest: [
//   "bmm.analyst",
//   "bmm.architect",
//   "bmm.debug",
//   "bmm.dev",
//   "bmm.pm",
//   // ... more bmm agents
// ]
```

---

### 2. Resource Completions (URIs)

Autocomplete resource URIs when accessing BMAD files.

**Reference Type:** `ref/resource`

**Example:**

```typescript
// User types: "analyst"
// Completions suggest: [
//   "bmad://_cfg/agents/bmm-analyst.customize.yaml",
//   "bmad://bmm/agents/analyst.md"
// ]

// User types: "bmad://bmm/workflows"
// Completions suggest: [
//   "bmad://bmm/workflows/prd/workflow.yaml",
//   "bmad://bmm/workflows/architecture/workflow.yaml",
//   // ... more workflows
// ]
```

---

## Usage

### MCP Client Request

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Complete prompt name (agent)
const result = await client.request({
  method: 'completion/complete',
  params: {
    ref: {
      type: 'ref/prompt',
    },
    argument: {
      name: 'prompt',
      value: 'ana', // What the user has typed
    },
  },
});

console.log(result.completion.values);
// Output: ['bmm.analyst']
```

### Response Format

```typescript
{
  completion: {
    values: string[],      // Array of completion suggestions
    total: number,         // Total number of matches
    hasMore: boolean       // Whether more results are available
  }
}
```

---

## Examples

### Example 1: Agent Name Autocomplete

**User Input:** `"arch"`

**Request:**

```json
{
  "method": "completion/complete",
  "params": {
    "ref": { "type": "ref/prompt" },
    "argument": {
      "name": "prompt",
      "value": "arch"
    }
  }
}
```

**Response:**

```json
{
  "completion": {
    "values": ["bmm.architect"],
    "total": 1,
    "hasMore": false
  }
}
```

---

### Example 2: Module Filter

**User Input:** `"bmm."`

**Request:**

```json
{
  "method": "completion/complete",
  "params": {
    "ref": { "type": "ref/prompt" },
    "argument": {
      "name": "prompt",
      "value": "bmm."
    }
  }
}
```

**Response:**

```json
{
  "completion": {
    "values": [
      "bmm.analyst",
      "bmm.architect",
      "bmm.debug",
      "bmm.dev",
      "bmm.pm",
      "bmm.sm",
      "bmm.tea",
      "bmm.tech-writer",
      "bmm.ux-designer"
    ],
    "total": 9,
    "hasMore": false
  }
}
```

---

### Example 3: Resource URI Autocomplete

**User Input:** `"workflow"`

**Request:**

```json
{
  "method": "completion/complete",
  "params": {
    "ref": { "type": "ref/resource" },
    "argument": {
      "name": "uri",
      "value": "workflow"
    }
  }
}
```

**Response:**

```json
{
  "completion": {
    "values": [
      "bmad://_cfg/workflow-manifest.csv",
      "bmad://bmb/workflows/audit-workflow/workflow.yaml",
      "bmad://bmb/workflows/create-agent/workflow.yaml",
      "bmad://bmb/workflows/create-workflow/workflow.yaml",
      "bmad://bmb/workflows/edit-workflow/workflow.yaml"
      // ... up to 20 results
    ],
    "total": 20,
    "hasMore": true
  }
}
```

---

### Example 4: File Extension Filter

**User Input:** `".yaml"`

**Request:**

```json
{
  "method": "completion/complete",
  "params": {
    "ref": { "type": "ref/resource" },
    "argument": {
      "name": "uri",
      "value": ".yaml"
    }
  }
}
```

**Response:**

```json
{
  "completion": {
    "values": [
      "bmad://_cfg/agents/bmm-analyst.customize.yaml",
      "bmad://_cfg/agents/bmm-architect.customize.yaml",
      "bmad://bmm/workflows/prd/workflow.yaml"
      // ... more yaml files
    ],
    "total": 20,
    "hasMore": true
  }
}
```

---

## Matching Behavior

### Case Insensitive

Completions work regardless of input casing:

| Input       | Matches          |
| ----------- | ---------------- |
| `"analyst"` | ✅ `bmm.analyst` |
| `"ANALYST"` | ✅ `bmm.analyst` |
| `"AnAlYsT"` | ✅ `bmm.analyst` |

### Partial String Matching

Matches anywhere in the name:

| Input     | Matches                           |
| --------- | --------------------------------- |
| `"ana"`   | ✅ `bmm.analyst`                  |
| `"lyst"`  | ✅ `bmm.analyst`                  |
| `"bmm.a"` | ✅ `bmm.analyst`, `bmm.architect` |

### Module Filtering

Include module prefix for targeted results:

| Input    | Results                    |
| -------- | -------------------------- |
| `"bmm"`  | All BMM module agents      |
| `"cis"`  | All CIS module agents      |
| `"bmm."` | Only BMM agents (with dot) |

---

## Performance

- **Agent Completions:** 16 agents indexed in memory
- **Resource Completions:** 368 resources indexed in memory
- **Query Time:** <1ms (in-memory filtering)
- **Result Limit:** 20 items max per request
- **Concurrent Queries:** Fully supported (stateless)

---

## Integration Examples

### VS Code Extension

```typescript
import * as vscode from 'vscode';

class BMADCompletionProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.CompletionItem[]> {
    const line = document.lineAt(position).text;
    const prefix = line.substring(0, position.character);

    // Request completions from MCP server
    const result = await mcpClient.request({
      method: 'completion/complete',
      params: {
        ref: { type: 'ref/prompt' },
        argument: { name: 'prompt', value: prefix },
      },
    });

    // Convert to VS Code completion items
    return result.completion.values.map(
      (value) =>
        new vscode.CompletionItem(value, vscode.CompletionItemKind.Function),
    );
  }
}
```

### Claude Desktop

Completions work automatically when:

- Typing in prompt selector
- Entering resource URIs
- Using autocomplete shortcuts

### CLI Tool with Readline

```typescript
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: async (line) => {
    const result = await mcpClient.request({
      method: 'completion/complete',
      params: {
        ref: { type: 'ref/prompt' },
        argument: { name: 'prompt', value: line },
      },
    });

    return [result.completion.values, line];
  },
});

rl.question('Select agent: ', (answer) => {
  console.log(`You selected: ${answer}`);
  rl.close();
});
```

---

## Advanced Usage

### Progressive Refinement

Users can progressively refine searches:

```
1. Type: ""           → Shows all 16 agents
2. Type: "b"          → Filters to BMM + BMB agents
3. Type: "bmm"        → Shows only BMM agents
4. Type: "bmm."       → Explicit BMM module filter
5. Type: "bmm.a"      → Filters to analyst + architect
6. Type: "bmm.ana"    → Matches only analyst
```

### Smart Resource Discovery

```
1. Type: "yaml"       → All YAML files
2. Type: "workflow"   → All workflow-related files
3. Type: "prd"        → PRD workflow files
4. Type: "bmm/prd"    → Only BMM PRD files
```

---

## Edge Cases

### No Matches

```json
{
  "completion": {
    "values": [],
    "total": 0,
    "hasMore": false
  }
}
```

### Template URIs

Template parameters (e.g., `{module}`) are not completed:

```typescript
// Input: "bmad://{module}/agents/{agent}"
// Returns: Empty array (template parameters not supported)
```

### Large Result Sets

Results are limited to 20 items:

```json
{
  "completion": {
    "values": [...], // 20 items
    "total": 20,
    "hasMore": true  // More results available
  }
}
```

---

## Comparison with Other Features

| Feature               | Purpose                | Use Case                      |
| --------------------- | ---------------------- | ----------------------------- |
| **List Operations**   | Browse all items       | Discovery of what's available |
| **Search Operations** | Query with filters     | Targeted search with criteria |
| **Completions**       | Type-ahead suggestions | Interactive autocomplete UX   |

---

## Benefits for Users

### 1. Faster Workflows

- No need to remember exact agent names
- Quick discovery through typing
- Reduced errors from typos

### 2. Better Discovery

- Find agents by module
- Locate resources by keyword
- Explore without documentation

### 3. Improved UX

- Native autocomplete in clients
- Progressive refinement
- Familiar interface pattern

---

## Summary

✅ **Prompt completions** - Autocomplete for 16 agent names  
✅ **Resource completions** - Autocomplete for 368 resources  
✅ **Case insensitive** - Works with any casing  
✅ **Partial matching** - Matches substrings anywhere  
✅ **Fast performance** - <1ms in-memory filtering  
✅ **Result limiting** - Max 20 items per request  
✅ **Client-friendly** - Standard MCP completion protocol

Completions make BMAD more accessible by providing intelligent autocomplete suggestions for both agent names and resource URIs, improving the overall user experience across all MCP clients.
