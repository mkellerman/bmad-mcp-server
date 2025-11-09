# ADR-001: Pure Delivery Proxy Architecture

**Status:** Accepted  
**Date:** November 8, 2025  
**Decision Makers:** Product team (party-mode discussion with PM, Architect, MCP SDK Optimizer)

---

## Context

The BMAD MCP Server serves BMAD Method content (agents, workflows, configurations) to LLMs through the Model Context Protocol. A key architectural question arose: **Should the server preprocess content (variable substitution, template rendering) or deliver it raw?**

### BMAD's Dynamic Prompt Engineering

BMAD uses a 4-layer prompt engineering system:

1. **Layer 1: Persona Foundation** - Agent role, identity, communication style
2. **Layer 2: Configuration Adaptation** - User-specific settings (`{user_name}`, `{communication_language}`)
3. **Layer 3: Context-Aware Variables** - Project-specific resolution (`{project-root}`, `{output_folder}`)
4. **Layer 4: Dynamic Prompt Assembly** - Multi-source composition (prompts, workflows, external files)

**Example activation sequence:**

```xml
<step n="2">Load {project-root}/bmad/bmm/config.yaml and store {user_name}</step>
<step n="3">Remember: user's name is {user_name}</step>
<action>Communicate in {communication_language}</action>
<action>Save output to {output_folder}/research.md</action>
```

### The Question

Who should handle variable resolution and template processing?

**Option A: Smart Proxy** - Server preprocesses templates
**Option B: Pure Proxy** - LLM interprets instructions

---

## Decision

**We chose Option B: Pure Delivery Proxy**

The MCP server delivers BMAD content exactly as it exists on disk without preprocessing, template rendering, or variable substitution. The LLM handles ALL logic, interpretation, and execution.

---

## Rationale

### 1. BMAD's Design Requires LLM Intelligence

BMAD's dynamic prompt engineering is **semantic, not syntactic**. Consider:

```xml
<step n="2">Load {project-root}/bmad/bmm/config.yaml and store {user_name}</step>
```

This isn't just a variable to substitute - it's an **instruction** that requires:

- Parsing the semantic intent ("Load a file and extract a value")
- Resolving the path
- Reading the file
- Parsing YAML structure
- Extracting the specific field
- Storing in working memory

**A TypeScript server cannot "understand" these instructions** - it would need to reimplement BMAD's entire prompt interpretation logic.

### 2. Separation of Concerns

**LLM's Responsibility:**

- Interpret activation steps
- Load and parse configuration files
- Resolve variable references in context
- Execute workflow steps
- Make decisions
- Manage conversational state

**Server's Responsibility:**

- Discover BMAD installations
- Serve file content
- Rank options (guidance, not decisions)
- Optimize response formats

**Mixing these violates separation of concerns** and creates tight coupling.

### 3. Maintenance Burden

**Smart Proxy approach would require:**

```typescript
class TemplateEngine {
  // Parse XML activation steps
  // Detect variable patterns: {user_name}, {{var}}, {{{var}}}
  // Load config files
  // Resolve nested references
  // Handle conditional logic
  // Support BMAD's evolving prompt patterns
}
```

**Problems:**

- ❌ Duplicates BMAD's logic in TypeScript
- ❌ Breaks when BMAD prompt patterns evolve
- ❌ Requires updating server for every BMAD change
- ❌ Testing nightmare (combinatorial prompt variations)

**Pure Proxy approach:**

```typescript
async loadAgent(name: string): Promise<string> {
  const path = findAgentPath(name);
  return readFile(path, 'utf-8');
}
```

**Benefits:**

- ✅ Simple, focused, testable
- ✅ Works with any BMAD version
- ✅ Changes to BMAD prompts work immediately
- ✅ Zero maintenance overhead for prompt evolution

### 4. User's Strategic Direction

During party-mode discussion (November 8, 2025), the user explicitly stated:

> "We want the instructions from the BMAD method to serve as if the LLM was reading the files from disk themselves. The LLM should make all decisions, processing, logic, etc."

This clarifies the **product vision**: The server is a **delivery system**, not an **execution framework**.

---

## Consequences

### Positive

**Simplicity:**

- Server code remains focused and maintainable
- No complex template engine to debug
- Fewer moving parts = fewer failure modes

**Compatibility:**

- Works with any BMAD version (past, present, future)
- No version coupling between server and BMAD
- Prompt changes deploy independently

**Performance:**

- Zero preprocessing overhead
- Fast file delivery
- No template parsing/rendering costs

**Correctness:**

- LLM interprets instructions as BMAD intended
- No risk of server "misunderstanding" prompts
- BMAD's dynamic prompt engineering works as designed

### Negative

**Token Usage:**

- LLM receives full activation instructions (not preprocessed)
- However: These instructions are already minimal (~50-100 tokens per agent)
- Mitigation: Response shaping optimizes other areas (52.3% reduction on ambiguous responses)

**LLM Capability Dependency:**

- Requires LLM capable of following multi-step instructions
- However: This is BMAD's design assumption anyway
- Mitigation: BMAD content is designed for capable LLMs

---

## Alternatives Considered

### Alternative 1: Hybrid Preprocessing

Preprocess simple variables, leave complex logic to LLM:

```typescript
// Server does simple substitution
content = content.replace(/{user_name}/g, config.user_name);
content = content.replace(/{project-root}/g, projectRoot);

// LLM handles workflow execution, conditional logic, etc.
```

**Rejected because:**

- Where to draw the line between "simple" and "complex"?
- Still couples server to BMAD's variable syntax
- Brittle (breaks if BMAD changes variable format)
- Violates "Pure Proxy" principle partially

### Alternative 2: Server-Side Workflow Execution

Server interprets and executes workflow steps:

```typescript
class WorkflowExecutor {
  async executeWorkflow(workflow: Workflow) {
    for (const step of workflow.steps) {
      await this.executeStep(step);
    }
  }
}
```

**Rejected because:**

- BMAD workflows are designed for LLM interpretation
- Would require reimplementing BMAD's entire workflow engine
- Interactive workflows need LLM conversational capability
- Massive scope creep

### Alternative 3: Configuration Injection

Automatically load and inject config into every response:

```typescript
response = {
  agent: agentContent,
  config: loadedConfig, // Auto-included
};
```

**Rejected because:**

- LLM should decide when to load config (per activation steps)
- Wastes tokens if config not needed for this operation
- Violates principle that LLM controls execution flow

---

## Implementation Notes

### Current Implementation Aligns

The existing codebase already follows Pure Delivery Proxy:

```typescript
// resource-loader.ts - No preprocessing
async loadAgent(name: string): Promise<Resource> {
  const path = this.findAgentPath(name);
  const content = await readFile(path, 'utf-8');
  return { name, path, content, source };
}
```

### What Doesn't Change

- Multi-source discovery (project, user, git)
- Manifest merging
- Session-based ranking
- LLM sampling integration
- Response optimization

These are **delivery optimizations**, not preprocessing.

### What We Won't Add

- Template engines (Handlebars, Liquid, etc.)
- Variable substitution logic
- Workflow execution engines
- State management for LLM sessions

---

## References

- Party-mode discussion: November 8, 2025
- Comprehensive Architecture Guide: `docs/research/bmad-dynamic-prompts.md`
- Session-based ranking: [ADR-002](./002-session-based-ranking.md)
- LLM sampling: [ADR-003](./003-llm-sampling.md)

---

## Review

**Next Review:** When considering any feature that involves content modification before delivery

**Success Criteria:**

- Server code remains under 2000 lines per file
- No BMAD-version-specific logic in server
- LLM successfully interprets all BMAD prompts
- Changes to BMAD work without server updates
