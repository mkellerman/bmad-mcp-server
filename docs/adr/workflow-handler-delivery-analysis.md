# Workflow Handler Delivery Analysis

**Date:** November 8, 2025  
**Scope:** Validate workflow execution flow and handler instruction delivery

---

## Current Implementation

### How Workflow Execution Works

**Step 1: User requests workflow execution**

```typescript
bmad({ operation: 'execute', workflow: 'brainstorm-project', message: '...' });
```

**Step 2: Server identifies workflow type**

**Option A: Standalone Workflow**

```typescript
// Workflow exists as standalone (no agent required)
executeWorkflow() → {
  agentWorkflowHandler: undefined,  // No handler needed
  text: "execution-mode: standalone\n[instructions to load workflow.yaml]"
}
```

**Option B: Agent-Based Workflow**

```typescript
// Workflow is offered by an agent (e.g., analyst offers brainstorm-project)
executeWorkflow() → {
  agent: "analyst",
  agentWorkflowHandler: "When menu item has: workflow=\"path/to/workflow.yaml\"\n...",
  text: "[frontmatter + handler instructions + resource access guide]"
}
```

---

## Handler Extraction Process

### 1. Agent File Structure (analyst.md)

```xml
<activation>
  <steps>
    <step n="7">When executing a menu item: Check menu-handlers section below...</step>
  </steps>

  <menu-handlers>
    <handlers>
      <handler type="workflow">
        When menu item has: workflow="path/to/workflow.yaml"
        1. CRITICAL: Always LOAD {project-root}/bmad/core/tasks/workflow.xml
        2. Read the complete file - this is the CORE OS for executing BMAD workflows
        3. Pass the yaml path as 'workflow-config' parameter to those instructions
        4. Execute workflow.xml instructions precisely following all steps
        5. Save outputs after completing EACH workflow step
        6. If workflow.yaml path is "todo", inform user the workflow hasn't been implemented yet
      </handler>
    </handlers>
  </menu-handlers>
</activation>
```

### 2. Server Extraction (resource-loader.ts:1274)

```typescript
// Extract workflow handler from menu-handlers section
if (agent.activation?.['menu-handlers']?.handlers?.handler) {
  const handlers = Array.isArray(
    agent.activation['menu-handlers'].handlers.handler,
  )
    ? agent.activation['menu-handlers'].handlers.handler
    : [agent.activation['menu-handlers'].handlers.handler];

  // Find the workflow handler
  const workflowHandler = handlers.find((h) => h['@_type'] === 'workflow');

  if (workflowHandler) {
    const handlerText =
      typeof workflowHandler === 'string'
        ? workflowHandler
        : workflowHandler['#text'] || '';

    metadata.workflowHandlerInstructions = String(handlerText).trim();
  }
}
```

**Extracted Handler:**

```
When menu item has: workflow="path/to/workflow.yaml"
    1. CRITICAL: Always LOAD {project-root}/bmad/core/tasks/workflow.xml
    2. Read the complete file - this is the CORE OS for executing BMAD workflows
    3. Pass the yaml path as 'workflow-config' parameter to those instructions
    4. Execute workflow.xml instructions precisely following all steps
    5. Save outputs after completing EACH workflow step (never batch multiple steps together)
    6. If workflow.yaml path is "todo", inform user the workflow hasn't been implemented yet
```

### 3. Execution Prompt (config.ts:187)

```typescript
export function getWorkflowExecutionPrompt(context: {
  workflow: string;
  workflowPath: string;
  agentWorkflowHandler?: string;
}): string {
  const frontmatter = `---
agent: ${context.agent}
workflow: ${context.workflow}
workflow-path: ${context.workflowPath}
user-prompt: ${context.userContext}
---`;

  const resourceInstructions = getResourceAccessInstructions();

  const handlerSection = context.agentWorkflowHandler
    ? `This workflow has been requested.\n\n${context.agentWorkflowHandler}`
    : 'This workflow has been requested.';

  return `${frontmatter}${resourceInstructions}${handlerSection}`;
}
```

**Delivered to LLM:**

```
---
agent: analyst
workflow: brainstorm-project
workflow-path: {project-root}/bmad/bmm/workflows/brainstorm-project/workflow.yaml
user-prompt: Help me brainstorm a new app
---

## HOW TO ACCESS BMAD RESOURCES
[Resource access instructions...]

---

This workflow has been requested.

When menu item has: workflow="path/to/workflow.yaml"
    1. CRITICAL: Always LOAD {project-root}/bmad/core/tasks/workflow.xml
    2. Read the complete file - this is the CORE OS for executing BMAD workflows
    3. Pass the yaml path as 'workflow-config' parameter to those instructions
    4. Execute workflow.xml instructions precisely following all steps
    5. Save outputs after completing EACH workflow step
    6. If workflow.yaml path is "todo", inform user the workflow hasn't been implemented yet
```

---

## Compliance Check: Pure Delivery Proxy

### ✅ What Server Does (Compliant)

1. **Extracts** handler instructions from agent XML at initialization
2. **Stores** in `agentMetadata.workflowHandlerInstructions`
3. **Delivers** raw handler text to LLM in execution prompt
4. **No preprocessing** - handler text delivered exactly as written

### ✅ What LLM Does (As Designed)

1. **Receives** frontmatter with workflow path
2. **Receives** handler instructions from agent
3. **Interprets** handler instructions (load workflow.xml, execute steps)
4. **Makes subsequent bmad calls** to read workflow.xml, workflow.yaml
5. **Executes** workflow according to handler logic

---

## Potential Optimization Issues

### 🔍 Issue 1: Handler Context Ambiguity

**Current Handler Text:**

```
When menu item has: workflow="path/to/workflow.yaml"
    1. CRITICAL: Always LOAD {project-root}/bmad/core/tasks/workflow.xml
    ...
```

**Problem:** Handler says "When menu item has: workflow=..." but LLM is NOT executing a menu item - it's executing a workflow directly.

**Context Mismatch:**

- Agent activation steps reference menu items
- Handler assumes it's processing a menu selection
- Execute operation bypasses menu entirely

**Risk:** LLM might be confused about whether this is menu-driven or direct execution

### 🔍 Issue 2: Redundant Instructions

**Handler tells LLM:**

> "Always LOAD {project-root}/bmad/core/tasks/workflow.xml"

**Resource Access Instructions also say:**

> "Use bmad tool with appropriate operation"

**Duplication:** Handler gives specific instructions that may conflict with or duplicate resource access guide.

### 🔍 Issue 3: Two-Step vs Direct Execution

**Current Flow:**

```
User: Execute workflow "brainstorm-project"
  ↓
Server: Returns handler instructions + workflow path
  ↓
LLM: Reads handler → Loads workflow.xml → Loads workflow.yaml → Executes
```

**Question:** Should the server just tell LLM to:

1. Load the agent definition (which contains handler)
2. Execute workflow via agent's menu system

**Alternative Flow:**

```
User: Execute workflow "brainstorm-project"
  ↓
Server: "Load agent 'analyst' and execute menu item '*brainstorm-project'"
  ↓
LLM: Loads analyst.md → Follows activation steps → Processes menu → Executes handler
```

### 🔍 Issue 4: Handler Extraction Loses Agent Context

**What gets extracted:**

```
When menu item has: workflow="path/to/workflow.yaml"
    1. CRITICAL: Always LOAD {project-root}/bmad/core/tasks/workflow.xml
    ...
```

**What gets lost:**

- Agent persona (analyst mindset)
- Activation steps (menu processing logic)
- Rules section (communication style, file loading rules)
- Full agent context

**Impact:** LLM receives handler instructions without agent embodiment.

---

## Recommendations

### Option 1: ✅ Keep Current (Minor Refinement)

**Current approach is mostly correct - just clarify handler text**

**Change handler instructions to:**

```xml
<handler type="workflow">
  Workflow execution instructions:
  1. CRITICAL: Load {project-root}/bmad/core/tasks/workflow.xml via bmad tool
  2. Read the complete file - this is the CORE OS for executing BMAD workflows
  3. Pass the workflow.yaml path as 'workflow-config' parameter to workflow.xml
  4. Execute workflow.xml instructions precisely following all steps
  5. Save outputs after completing EACH workflow step
  6. If workflow.yaml path is "todo", inform user the workflow hasn't been implemented yet
</handler>
```

**Changes:**

- Remove "When menu item has:" preamble (not menu-driven in execute operation)
- Clarify "Load via bmad tool"
- Keep same 6-step process

**Pros:**

- Minimal change
- Pure delivery maintained
- Handler instructions clear and direct

**Cons:**

- LLM still doesn't embody agent persona
- Handler extracted out of agent context

---

### Option 2: 🔄 Agent Embodiment First

**Execute workflow → Load agent → Execute via menu**

**New execution prompt:**

```
---
agent: analyst
workflow: brainstorm-project
user-prompt: Help me brainstorm a new app
---

This workflow has been requested.

**Step 1:** Load the agent definition:
  bmad({ operation: "read", agent: "analyst" })

**Step 2:** Follow the agent's activation steps to embody the persona

**Step 3:** Execute the workflow via the agent's menu system:
  - The agent offers workflow "brainstorm-project" via menu item
  - Follow the agent's menu-handlers section for workflow execution
  - The handler contains specific instructions for running workflows

**Why this approach:**
- Agent provides context, persona, and expertise
- Workflow executes within agent's framework
- Handler instructions are in proper context
```

**Pros:**

- ✅ LLM embodies agent persona
- ✅ Full agent context (rules, communication style)
- ✅ Handler in proper context (menu-driven flow)
- ✅ Consistent with agent-based architecture

**Cons:**

- ❌ Extra step (load agent first)
- ❌ More tokens (full agent definition)
- ❌ Slower (two-step process)

---

### Option 3: 🎯 Hybrid: Inline Agent Summary (RECOMMENDED)

**Keep handler delivery but add agent context**

**Enhanced execution prompt:**

```
---
agent: analyst
workflow: brainstorm-project
workflow-path: {project-root}/bmad/bmm/workflows/brainstorm-project/workflow.yaml
user-prompt: Help me brainstorm a new app
---

## AGENT CONTEXT

You are executing this workflow as **analyst** (Strategic Business Analyst + Requirements Expert).

**Agent persona:**
- Role: Strategic Business Analyst + Requirements Expert
- Expertise: Market research, competitive analysis, requirements elicitation
- Communication: Analytical and systematic, presents findings with clear data support

While executing the workflow, embody this agent's expertise and communication style.

## WORKFLOW HANDLER INSTRUCTIONS

[Handler instructions from agent...]

## RESOURCE ACCESS

[Standard resource access guide...]
```

**Pros:**

- ✅ Agent context without full definition
- ✅ Handler in proper context
- ✅ Single-step execution
- ✅ Token efficient (summary not full agent)
- ✅ Pure delivery maintained

**Cons:**

- Adds ~100 tokens to execution prompt

---

## Analysis: Which Option?

### Current State Assessment

**Handler Extraction: ✅ Compliant**

- Raw text delivery, no preprocessing

**Handler Delivery: ⚠️ Context Missing**

- Handler assumes menu-driven flow
- LLM doesn't embody agent
- "When menu item has:" preamble confusing

### Recommendation: Option 3 (Hybrid)

**Why:**

1. **Preserves Pure Delivery** - Still delivering content, not executing
2. **Adds Essential Context** - Agent summary helps LLM understand role
3. **Token Efficient** - Summary << full agent definition
4. **Better UX** - LLM provides analyst-quality output for brainstorming workflow

**Implementation:**

1. Add `agentSummary` to `AgentMetadata` (role + persona snippet)
2. Include in `getWorkflowExecutionPrompt()` when agent-based
3. Update handler text to remove "When menu item has:" preamble
4. Keep handler instructions as-is (pure delivery)

**Token Cost:**

- Agent context: ~100 tokens
- Worth it for proper agent embodiment

---

## Conclusion

**Current implementation: ✅ 95% compliant**

**Minor refinements needed:**

1. Add agent context summary to workflow execution
2. Update handler text to remove menu-item preamble
3. Keep pure delivery architecture intact

**No major violations - just context optimization for better LLM interpretation.**

---

**Prepared by:** GitHub Copilot  
**Date:** November 8, 2025  
**Status:** Analysis complete - Recommendation: Option 3 (Hybrid with agent context)
