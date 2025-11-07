# MCP Resource Templates Guide

## Overview

Resource Templates provide a **parameterized URI system** for accessing BMAD resources dynamically. Instead of exposing 368 static resource URIs, we expose 7 templates that clients can use to construct URIs on-demand.

**Key Benefits:**

- 📉 **98.1% reduction** in exposed resources (368 → 7 templates)
- 🎯 **Self-documenting** API with clear parameter structure
- 🚀 **Better performance** - smaller payloads for resource discovery
- 🔍 **Easier discovery** - clients understand the resource structure immediately

## Available Templates

### 1. Agent Source

```
bmad://{module}/agents/{agent}.md
```

Access agent markdown source files.

**Parameters:**

- `{module}` - Module name (bmm, bmb, cis, core)
- `{agent}` - Agent name (analyst, architect, pm, etc.)

**Examples:**

```
bmad://bmm/agents/analyst.md
bmad://bmm/agents/architect.md
bmad://cis/agents/brainstorming-coach.md
bmad://core/agents/bmad-master.md
```

---

### 2. Workflow Definition

```
bmad://{module}/workflows/{workflow}/workflow.yaml
```

Access workflow YAML configuration files.

**Parameters:**

- `{module}` - Module name (bmm, bmb, cis, core)
- `{workflow}` - Workflow name (prd, architecture, create-agent, etc.)

**Examples:**

```
bmad://bmb/workflows/audit-workflow/workflow.yaml
bmad://bmb/workflows/create-agent/workflow.yaml
bmad://core/workflows/party-mode/workflow.yaml
```

---

### 3. Workflow Instructions

```
bmad://{module}/workflows/{workflow}/instructions.md
```

Access workflow instruction templates (LLM prompts).

**Parameters:**

- `{module}` - Module name
- `{workflow}` - Workflow name

**Examples:**

```
bmad://bmb/workflows/create-agent/instructions.md
bmad://bmm/workflows/prd/instructions.md
```

---

### 4. Workflow Template

```
bmad://{module}/workflows/{workflow}/template.md
```

Access workflow output templates.

**Parameters:**

- `{module}` - Module name
- `{workflow}` - Workflow name

**Examples:**

```
bmad://bmb/workflows/create-agent/template.md
bmad://bmm/workflows/architecture/template.md
```

---

### 5. Knowledge Base

```
bmad://{module}/knowledge/{category}/{file}
```

Access knowledge base articles and references.

**Parameters:**

- `{module}` - Module name
- `{category}` - Knowledge category
- `{file}` - File name with extension

**Examples:**

```
bmad://bmm/knowledge/tea/testing-best-practices.md
bmad://bmm/knowledge/architecture/patterns.md
```

---

### 6. Agent Customization

```
bmad://_cfg/agents/{agent}.customize.yaml
```

Access agent customization configurations.

**Parameters:**

- `{agent}` - Full agent identifier (module-name format)

**Examples:**

```
bmad://_cfg/agents/bmm-analyst.customize.yaml
bmad://_cfg/agents/bmm-architect.customize.yaml
bmad://_cfg/agents/cis-brainstorming-coach.customize.yaml
```

---

### 7. Core Configuration

```
bmad://core/config.yaml
```

Access the BMAD core configuration file (no parameters).

**Example:**

```
bmad://core/config.yaml
```

---

## Usage

### Listing Templates

**MCP Request:**

```json
{
  "method": "resources/templates/list"
}
```

**Response:**

```json
{
  "resourceTemplates": [
    {
      "uriTemplate": "bmad://{module}/agents/{agent}.md",
      "name": "Agent Source",
      "description": "Agent markdown source file",
      "mimeType": "text/markdown"
    },
    {
      "uriTemplate": "bmad://{module}/workflows/{workflow}/workflow.yaml",
      "name": "Workflow Definition",
      "description": "Workflow YAML configuration",
      "mimeType": "application/x-yaml"
    }
    // ... more templates
  ]
}
```

### Reading Resources via Templates

Once you know the template structure, construct URIs and read them normally:

**MCP Request:**

```json
{
  "method": "resources/read",
  "params": {
    "uri": "bmad://bmm/agents/analyst.md"
  }
}
```

**Response:**

```json
{
  "contents": [
    {
      "uri": "bmad://bmm/agents/analyst.md",
      "mimeType": "text/markdown",
      "text": "---\nagent: analyst\nmodule: bmm\n..."
    }
  ]
}
```

---

## Migration from Static Resources

### Before (Static Resources)

Clients had to call `resources/list` to discover all 368 resources:

```json
{
  "method": "resources/list"
}
```

Response payload: **Large** (368 resource objects)

Then pick from the list:

```
bmad://bmm/agents/analyst.md
bmad://bmm/agents/architect.md
bmad://bmm/agents/pm.md
... (365 more)
```

### After (Resource Templates)

Clients call `resources/templates/list` to get 7 templates:

```json
{
  "method": "resources/templates/list"
}
```

Response payload: **Small** (7 template objects)

Then **construct URIs** using the template pattern:

```
bmad://{module}/agents/{agent}.md

→ bmad://bmm/agents/analyst.md
→ bmad://bmm/agents/architect.md
→ bmad://cis/agents/brainstorming-coach.md
```

---

## Benefits Analysis

| Metric                   | Static Resources            | Resource Templates              | Improvement          |
| ------------------------ | --------------------------- | ------------------------------- | -------------------- |
| **Resources exposed**    | 368                         | 7                               | **98.1% reduction**  |
| **Discovery payload**    | Large (368 objects)         | Small (7 objects)               | **~98% smaller**     |
| **Client understanding** | Must explore list           | Clear structure from templates  | **Self-documenting** |
| **Maintainability**      | Update on every file change | Update only on structure change | **Much easier**      |

---

## Advanced Usage

### Dynamic Agent Discovery

Instead of listing all agent resources, construct agent URIs from metadata:

```typescript
// Get agent metadata from BMAD tool
const agents = await callTool('bmad', {
  operation: 'list',
  query: 'agents',
});

// Construct URIs using template pattern
const agentURIs = agents.map(
  (agent) => `bmad://${agent.module}/agents/${agent.name}.md`,
);

// Read specific agent source
const analystSource = await readResource('bmad://bmm/agents/analyst.md');
```

### Workflow Exploration

```typescript
// Get workflow metadata
const workflows = await callTool('bmad', {
  operation: 'list',
  query: 'workflows',
});

// Construct workflow configuration URIs
const workflowConfigs = workflows.map(
  (wf) => `bmad://${wf.module}/workflows/${wf.name}/workflow.yaml`,
);

// Read workflow instructions
const prdInstructions = await readResource(
  'bmad://bmm/workflows/prd/instructions.md',
);
```

---

## TypeScript Example

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

// List available templates
const { resourceTemplates } = await client.request({
  method: 'resources/templates/list',
});

console.log('Available templates:', resourceTemplates.length);

// Construct URI from template
const agentTemplate = resourceTemplates.find((t) => t.name === 'Agent Source');

// Use template to read resource
const uri = 'bmad://bmm/agents/analyst.md';
const { contents } = await client.request({
  method: 'resources/read',
  params: { uri },
});

console.log('Agent source:', contents[0].text);
```

---

## Common Patterns

### 1. List all agents in a module

```typescript
// Get metadata first
const agents = await bmadTool({ operation: 'list', query: 'agents' });

// Filter by module
const bmmAgents = agents.filter((a) => a.module === 'bmm');

// Construct URIs
const uris = bmmAgents.map((a) => `bmad://${a.module}/agents/${a.name}.md`);
```

### 2. Read workflow bundle (config + instructions + template)

```typescript
const workflowName = 'prd';
const module = 'bmm';

const [config, instructions, template] = await Promise.all([
  readResource(`bmad://${module}/workflows/${workflowName}/workflow.yaml`),
  readResource(`bmad://${module}/workflows/${workflowName}/instructions.md`),
  readResource(`bmad://${module}/workflows/${workflowName}/template.md`),
]);
```

### 3. Agent customization lookup

```typescript
const agentId = 'bmm-analyst';
const customization = await readResource(
  `bmad://_cfg/agents/${agentId}.customize.yaml`,
);
```

---

## Notes

- **Static resources still available**: The `resources/list` endpoint still works for backward compatibility
- **Both approaches supported**: Clients can use templates OR static listing
- **No breaking changes**: Existing clients continue to work
- **Template validation**: URIs must match actual file paths or 404 error

---

## Summary

✅ **7 resource templates** replace 368 static resources  
✅ **98.1% reduction** in exposed resources  
✅ **Self-documenting** API with clear parameter structure  
✅ **Backward compatible** - static resources still work  
✅ **Better performance** - smaller discovery payloads  
✅ **Easier maintenance** - update templates, not individual resources

Resource Templates provide a **cleaner, more scalable** way to expose BMAD resources while maintaining full backward compatibility.
