# MCP Response Formatting Strategy

## Overview

The BMAD MCP Server uses explicit instructions to control how LLMs display vs. use content. This ensures that user-facing content (like agent greetings, command menus, etc.) is shown **exactly as written**, while structured data is available for queries but not displayed.

## The Problem

When agent activation instructions say "Show greeting + numbered list of ALL commands" (step 4), the LLM might:

- Summarize or paraphrase the content
- Reorganize the structure
- Skip parts it deems "redundant"
- Format it differently than intended

This breaks the BMAD experience where agents have specific personas and command structures.

## The Solution

### 1. **Explicit Display Instructions**

We wrap content with clear directives:

```typescript
**INSTRUCTIONS: Display the content below to the user EXACTLY as written.
Do not summarize or paraphrase.**

---

[ACTUAL CONTENT HERE]
```

### 2. **Separation of Display vs. Context Data**

For commands like `*list-agents`, we provide:

1. **Display Content** - Formatted markdown for the user (with explicit display instruction)
2. **Context Data** - JSON for LLM queries (marked as "do NOT display this")

````typescript
**INSTRUCTIONS: Display the content below to the user EXACTLY as written.**

---

# 📊 BMAD Agents
Found **95 agents** across **10 modules**
[... formatted markdown ...]

---

**📦 Structured Data** *(for your use in answering questions - do NOT display this to the user)*

```json
{
  "items": [...],
  "summary": {...}
}
````

````

### 3. **Helper Function**

We created `formatMCPResponse()` to make this consistent:

```typescript
function formatMCPResponse(
  displayContent: string,
  contextData?: unknown,
): TextContent[]
````

**Usage:**

```typescript
// Agent response (display only)
return {
  content: formatMCPResponse(result.content ?? ''),
};

// List response (display + context data)
return {
  content: formatMCPResponse(result.content ?? '', result.structuredData),
};
```

## Benefits

✅ **Guaranteed Fidelity** - Agent greetings, menus, and instructions appear exactly as authored  
✅ **Rich Queries** - LLM can answer "show me agents in module X" using structured data  
✅ **Clear Boundaries** - Explicit markers for what to display vs. what to use as context  
✅ **Consistent Pattern** - Same approach works for agents, workflows, lists, help  
✅ **Better UX** - Users see polished, formatted output; LLM has data for follow-ups

## Implementation Notes

### Where to Use

- ✅ **Agent responses** - Show persona, greeting, commands exactly as defined
- ✅ **List commands** - Display formatted list + provide JSON for queries
- ✅ **Workflow outputs** - Show instructions clearly, include context data
- ✅ **Help menus** - Display formatted help, include command metadata

### What NOT to Do

- ❌ Don't rely on LLM to "format nicely" - it will vary
- ❌ Don't mix display and context data in one blob
- ❌ Don't assume LLM will preserve markdown structure
- ❌ Don't use vague instructions like "show this to the user"

### Testing

Test that LLMs respect the instructions:

```bash
# Test agent loading
node scripts/test-agent-format.mjs

# Test list commands
node scripts/show-list-agents.mjs

# Verify in actual MCP client
# The LLM should display markdown exactly, not summarize
```

## Examples

### Agent Response

```typescript
// Input: Load "analyst" agent
// Output:
**INSTRUCTIONS: Display the content below to the user EXACTLY as written.**

---

# BMAD Agent: Mary
**Title:** Business Analyst

...full agent markdown...

Available Commands:
1. *help — Show numbered cmd list
2. *brainstorm-project — Guide me through Brainstorming
3. *product-brief — Produce Project Brief
```

### List Response

````typescript
// Input: *list-agents
// Output:
**INSTRUCTIONS: Display the content below to the user EXACTLY as written.**

---

# 📊 BMAD Agents
Found **95 agents** across **10 modules**

## Modules
- **bmm**: 11 agents
- **cis**: 5 agents
...

## 💡 What You Can Ask
- "Tell me more about the [agent-name] agent"
- "Show me agents in the [module] module"

---

**📦 Structured Data** *(for your use - do NOT display this)*

```json
{
  "items": [
    { "name": "analyst", "module": "bmm", ... }
  ],
  "summary": { "total": 95, ... }
}
````

```

## Future Enhancements

Potential improvements:

1. **Response Types** - Use MCP's content types more explicitly (if supported)
2. **Rendering Hints** - Explore MCP protocol features for display hints
3. **Interactive Elements** - Buttons/menus if MCP supports them
4. **Progressive Disclosure** - Show summary, load details on demand

## References

- MCP Protocol: https://spec.modelcontextprotocol.io/
- TextContent type definition: `@modelcontextprotocol/sdk/types.js`
- Implementation: `src/server.ts` - `formatMCPResponse()`
```
