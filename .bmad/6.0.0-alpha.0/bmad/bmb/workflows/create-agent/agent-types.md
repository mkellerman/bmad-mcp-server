# BMAD Agent Types Reference

## Overview

BMAD agents come in three distinct types, each designed for different use cases and complexity levels.

## Agent Types

### 1. Simple Agent

**Purpose:** Self-contained, standalone agents with embedded capabilities

**Characteristics:**

- All logic embedded within the agent file
- No external dependencies
- Quick to create and deploy
- Perfect for single-purpose tools

**Use Cases:**

- Calculator agents
- Format converters
- Simple analyzers
- Static advisors

**Structure:**

```xml
<agent id="simple-agent" name="Helper" title="Simple Helper" icon="🤖">
  <persona>
    <role>Simple Helper Role</role>
    <identity>...</identity>
    <communication_style>...</communication_style>
    <principles>...</principles>
  </persona>
  <embedded-data>
    <!-- Optional embedded data/logic -->
  </embedded-data>
  <cmds>
    <c cmd="*help">Show commands</c>
    <c cmd="*calculate">Perform calculation</c>
    <c cmd="*exit">Exit</c>
  </cmds>
</agent>
```

### 2. Expert Agent

**Purpose:** Specialized agents with domain expertise and sidecar resources

**Characteristics:**

- Has access to specific folders/files
- Domain-restricted operations
- Maintains specialized knowledge
- Can have memory/context files

**Use Cases:**

- Personal diary agent (only accesses diary folder)
- Project-specific assistant (knows project context)
- Domain expert (medical, legal, technical)
- Personal coach with history

**Structure:**

```xml
<agent id="expert-agent" name="Domain Expert" title="Specialist" icon="🎯">
  <persona>
    <role>Domain Specialist Role</role>
    <identity>...</identity>
    <communication_style>...</communication_style>
    <principles>...</principles>
  </persona>
  <critical-actions>
    <!-- CRITICAL: Load sidecar files explicitly -->
    <i critical="MANDATORY">Load COMPLETE file {agent-folder}/instructions.md and follow ALL directives</i>
    <i critical="MANDATORY">Load COMPLETE file {agent-folder}/memories.md into permanent context</i>
    <i critical="MANDATORY">ONLY access {user-folder}/diary/ - NO OTHER FOLDERS</i>
  </critical-actions>
  <cmds>...</cmds>
</agent>
```

**Sidecar Structure:**

```
expert-agent/
├── agent.md          # Main agent file
├── memories.md       # Personal context/memories
├── knowledge/        # Domain knowledge base
└── data/            # Agent-specific data
```

### 3. Module Agent

**Purpose:** Full-featured agents belonging to a module with access to workflows and resources

**Characteristics:**

- Part of a BMAD module (bmm, bmb, cis)
- Access to multiple workflows
- Can invoke other tasks and agents
- Professional/enterprise grade

**Use Cases:**

- Product Manager (creates PRDs, manages requirements)
- Security Engineer (threat models, security reviews)
- Test Architect (test strategies, automation)
- Business Analyst (market research, requirements)

**Structure:**

```xml
<agent id="bmad/bmm/agents/pm.md" name="John" title="Product Manager" icon="📋">
  <persona>
    <role>Product Management Expert</role>
    <identity>...</identity>
    <communication_style>...</communication_style>
    <principles>...</principles>
  </persona>
  <critical-actions>
    <i>Load config from {project-root}/bmad/{module}/config.yaml</i>
  </critical-actions>
  <cmds>
    <c cmd="*help">Show numbered cmd list</c>
    <c cmd="*create-prd" run-workflow="{project-root}/bmad/bmm/workflows/prd/workflow.yaml">Create PRD</c>
    <c cmd="*validate" exec="{project-root}/bmad/core/tasks/validate-workflow.md">Validate document</c>
    <c cmd="*exit">Exit</c>
  </cmds>
</agent>
```

## Choosing the Right Type

### Choose Simple Agent when:

- Single, well-defined purpose
- No external data needed
- Quick utility functions
- Embedded logic is sufficient

### Choose Expert Agent when:

- Domain-specific expertise required
- Need to maintain context/memory
- Restricted to specific data/folders
- Personal or specialized use case

### Choose Module Agent when:

- Part of larger system/module
- Needs multiple workflows
- Professional/team use
- Complex multi-step processes

## Migration Path

```
Simple Agent → Expert Agent → Module Agent
```

Agents can evolve:

1. Start with Simple for proof of concept
2. Add sidecar resources to become Expert
3. Integrate with module to become Module Agent

## Best Practices

1. **Start Simple:** Begin with the simplest type that meets your needs
2. **Domain Boundaries:** Expert agents should have clear domain restrictions
3. **Module Integration:** Module agents should follow module conventions
4. **Resource Management:** Document all external resources clearly
5. **Evolution Planning:** Design with potential growth in mind
