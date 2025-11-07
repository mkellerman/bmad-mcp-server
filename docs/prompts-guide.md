# MCP Prompts Support

The BMAD MCP Server exposes all agents as **MCP Prompts**, providing an alternative activation mechanism to tool calls.

## Overview

- **ListPrompts**: Returns all 16 agents as available prompts
- **GetPrompt**: Returns agent activation instructions for LLM consumption

## Available Prompts

All agents are exposed as prompts with the naming convention: `{module}.{agent}`

Examples:

- `bmm.analyst` - Mary (Business Analyst)
- `bmm.architect` - Winston (Architect)
- `bmm.pm` - John (Product Manager)
- `bmm.dev` - Amelia (Developer Agent)
- `cis.brainstorming-coach` - Carson (Elite Brainstorming Specialist)
- `core.bmad-master` - BMad Master
- etc.

## Usage

### List All Prompts

```typescript
// MCP Request
{
  "method": "prompts/list"
}

// Response
{
  "prompts": [
    {
      "name": "bmm.analyst",
      "description": "Activate Mary (Business Analyst) - Business Analyst",
      "arguments": [
        {
          "name": "message",
          "description": "Initial message or question for the agent (optional)",
          "required": false
        }
      ]
    },
    // ... more prompts
  ]
}
```

### Get a Specific Prompt (Activate Agent)

```typescript
// MCP Request
{
  "method": "prompts/get",
  "params": {
    "name": "bmm.analyst",
    "arguments": {
      "message": "Help me create a product requirements document"
    }
  }
}

// Response
{
  "description": "Activate bmm.analyst agent",
  "messages": [
    {
      "role": "user",
      "content": {
        "type": "text",
        "text": "... full agent activation instructions ..."
      }
    }
  ]
}
```

## Benefits

### 1. **Direct Agent Activation**

Prompts provide a simpler way to activate agents compared to tool calls:

**Tool Call Approach:**

```typescript
await callTool('bmad', {
  operation: 'execute',
  agent: 'analyst',
  message: 'Help me with requirements',
});
```

**Prompt Approach:**

```typescript
await getPrompt('bmm.analyst', {
  message: 'Help me with requirements',
});
```

### 2. **LLM-Friendly Discovery**

LLMs can easily discover and activate agents through the prompts interface without needing to understand the unified tool's operation parameter structure.

### 3. **IDE/Client Integration**

Many MCP clients display prompts in a dedicated UI, making agents more discoverable to users.

### 4. **Conversational Context**

Prompts return messages that can be directly injected into LLM conversation context, making agent activation feel more natural.

## Implementation Details

The prompt handlers are implemented in `src/server.ts`:

- **ListPrompts**: Maps agent metadata to prompt definitions
- **GetPrompt**: Uses the `execute` operation internally to get agent activation instructions

Each prompt:

- Has a unique name based on module and agent
- Provides a descriptive title
- Accepts optional `message` argument
- Returns full agent activation instructions including:
  - Agent persona and identity
  - Communication style
  - Available workflows
  - Menu commands
  - Activation rules

## Comparison: Tools vs Prompts

| Feature          | Unified Tool                              | Prompts                   |
| ---------------- | ----------------------------------------- | ------------------------- |
| Discovery        | List operation with query parameter       | Native prompts/list       |
| Agent Info       | Read operation with type=agent            | Not directly available    |
| Agent Activation | Execute operation with agent parameter    | Native prompts/get        |
| Workflows        | Execute operation with workflow parameter | Not available via prompts |
| Search           | Optional search operation                 | Not available via prompts |
| Resources        | Resource URIs                             | Not available via prompts |

**Recommendation**:

- Use **prompts** for simple agent activation scenarios
- Use the **unified tool** for advanced workflows, resource access, and programmatic discovery

## Testing

Run the prompts test script:

```bash
node scripts/test-prompts.mjs
```

This verifies:

- All 16 agents are exposed as prompts
- Each prompt accepts optional message argument
- GetPrompt returns proper activation instructions
