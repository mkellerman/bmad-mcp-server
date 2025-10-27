# BMAD Agent Architecture Reference

_LLM-Optimized Technical Documentation for Agent Building_

## Core Agent Structure

### Minimal Valid Agent

```xml
<!-- Powered by BMAD-CORE™ -->

# Agent Name

<agent id="path/to/agent.md" name="Name" title="Title" icon="🤖">
  <persona>
    <role>Primary function</role>
    <identity>Background and expertise</identity>
    <communication_style>How they interact</communication_style>
    <principles>Core beliefs and methodology</principles>
  </persona>
  <cmds>
    <c cmd="*help">Show numbered cmd list</c>
    <c cmd="*exit">Exit with confirmation</c>
  </cmds>
</agent>
```

## Agent XML Schema

### Root Element: `<agent>`

**Required Attributes:**

- `id` - Unique path identifier (e.g., "bmad/bmm/agents/analyst.md")
- `name` - Agent's name (e.g., "Mary", "John", "Helper")
- `title` - Professional title (e.g., "Business Analyst", "Security Engineer")
- `icon` - Single emoji representing the agent

### Core Sections

#### 1. Persona Section (REQUIRED)

```xml
<persona>
  <role>1-2 lines: Professional title and primary expertise</role>
  <identity>3-5 lines: Background, experience, specializations</identity>
  <communication_style>3-5 lines: Interaction approach, tone, quirks</communication_style>
  <principles>5-8 lines: Core beliefs, methodology, philosophy</principles>
</persona>
```

**Best Practices:**

- Role: Be specific about expertise area
- Identity: Include experience indicators (years, depth)
- Communication: Describe HOW they interact, not just tone and quirks
- Principles: Start with "I believe" or "I operate" for first-person voice

#### 2. Critical Actions Section

```xml
<critical-actions>
  <i>Load into memory {project-root}/bmad/{module}/config.yaml and set variables</i>
  <i>Remember the users name is {user_name}</i>
  <i>ALWAYS communicate in {communication_language}</i>
  <!-- Custom initialization actions -->
</critical-actions>
```

**For Expert Agents with Sidecars (CRITICAL):**

```xml
<critical-actions>
  <!-- CRITICAL: Load sidecar files FIRST -->
  <i critical="MANDATORY">Load COMPLETE file {agent-folder}/instructions.md and follow ALL directives</i>
  <i critical="MANDATORY">Load COMPLETE file {agent-folder}/memories.md into permanent context</i>
  <i critical="MANDATORY">You MUST follow all rules in instructions.md on EVERY interaction</i>

  <!-- Standard initialization -->
  <i>Load into memory {project-root}/bmad/{module}/config.yaml and set variables</i>
  <i>Remember the users name is {user_name}</i>
  <i>ALWAYS communicate in {communication_language}</i>

  <!-- Domain restrictions -->
  <i>ONLY read/write files in {user-folder}/diary/ - NO OTHER FOLDERS</i>
</critical-actions>
```

**Common Patterns:**

- Config loading for module agents
- User context initialization
- Language preferences
- **Sidecar file loading (Expert agents) - MUST be explicit and CRITICAL**
- **Domain restrictions (Expert agents) - MUST be enforced**

#### 3. Commands Section (REQUIRED)

```xml
<cmds>
  <c cmd="*trigger" [attributes]>Description</c>
</cmds>
```

**Command Attributes:**

- `run-workflow="{path}"` - Executes a workflow
- `exec="{path}"` - Executes a task
- `tmpl="{path}"` - Template reference
- `data="{path}"` - Data file reference

**Required Commands:**

- `*help` - Always first, shows command list
- `*exit` - Always last, exits agent

## Advanced Agent Patterns

### Activation Rules (OPTIONAL)

```xml
<activation critical="true">
  <initialization critical="true" sequential="MANDATORY">
    <step n="1">Load configuration</step>
    <step n="2">Apply overrides</step>
    <step n="3">Execute critical actions</step>
    <step n="4" critical="BLOCKING">Show greeting with menu</step>
    <step n="5" critical="BLOCKING">AWAIT user input</step>
  </initialization>
  <command-resolution critical="true">
    <rule>Numeric input → Execute command at cmd_map[n]</rule>
    <rule>Text input → Fuzzy match against commands</rule>
  </command-resolution>
</activation>
```

### Expert Agent Sidecar Pattern

```xml
<!-- DO NOT use sidecar-resources tag - Instead use critical-actions -->
<!-- Sidecar files MUST be loaded explicitly in critical-actions -->

<!-- Example Expert Agent with Diary domain -->
<agent id="diary-keeper" name="Personal Assistant" title="Diary Keeper" icon="📔">
  <critical-actions>
    <!-- MANDATORY: Load all sidecar files -->
    <i critical="MANDATORY">Load COMPLETE file {agent-folder}/diary-rules.md</i>
    <i critical="MANDATORY">Load COMPLETE file {agent-folder}/user-memories.md</i>
    <i critical="MANDATORY">Follow ALL rules from diary-rules.md</i>

    <!-- Domain restriction -->
    <i critical="MANDATORY">ONLY access files in {user-folder}/diary/</i>
    <i critical="MANDATORY">NEVER access files outside diary folder</i>
  </critical-actions>

  <persona>...</persona>
  <cmds>...</cmds>
</agent>
```

### Module Agent Integration

```xml
<module-integration>
  <module-path>{project-root}/bmad/{module-code}</module-path>
  <config-source>{module-path}/config.yaml</config-source>
  <workflows-path>{project-root}/bmad/{module-code}/workflows</workflows-path>
</module-integration>
```

## Variable System

### System Variables

- `{project-root}` - Root directory of project
- `{user_name}` - User's name from config
- `{communication_language}` - Language preference
- `{date}` - Current date
- `{module}` - Current module code

### Config Variables

Format: `{config_source}:variable_name`
Example: `{config_source}:output_folder`

### Path Construction

```
Good: {project-root}/bmad/{module}/agents/
Bad:  /absolute/path/to/agents/
Bad:  ../../../relative/paths/
```

## Command Patterns

### Workflow Commands

```xml
<!-- Full path -->
<c cmd="*create-prd" run-workflow="{project-root}/bmad/bmm/workflows/prd/workflow.yaml">
  Create Product Requirements Document
</c>

<!-- Placeholder for future -->
<c cmd="*analyze" run-workflow="todo">
  Perform analysis (workflow to be created)
</c>
```

### Task Commands

```xml
<c cmd="*validate" exec="{project-root}/bmad/core/tasks/validate-workflow.md">
  Validate document
</c>
```

### Template Commands

```xml
<c cmd="*brief"
   exec="{project-root}/bmad/core/tasks/create-doc.md"
   tmpl="{project-root}/bmad/bmm/templates/brief.md">
  Create project brief
</c>
```

### Data-Driven Commands

```xml
<c cmd="*standup"
   exec="{project-root}/bmad/bmm/tasks/daily-standup.md"
   data="{project-root}/bmad/_cfg/agent-party.xml">
  Run daily standup
</c>
```

## Agent Type Specific Patterns

### Simple Agent

- Self-contained logic
- Minimal or no external dependencies
- May have embedded functions
- Good for utilities and converters

### Expert Agent

- Domain-specific with sidecar resources
- Restricted access patterns
- Memory/context files
- Good for specialized domains

### Module Agent

- Full integration with module
- Multiple workflows and tasks
- Config-driven behavior
- Good for professional tools

## Common Anti-Patterns to Avoid

### ❌ Bad Practices

```xml
<!-- Missing required persona elements -->
<persona>
  <role>Helper</role>
  <!-- Missing identity, style, principles -->
</persona>

<!-- Hard-coded paths -->
<c cmd="*run" exec="/Users/john/project/task.md">

<!-- No help command -->
<cmds>
  <c cmd="*do-something">Action</c>
  <!-- Missing *help -->
</cmds>

<!-- Duplicate command triggers -->
<c cmd="*analyze">First</c>
<c cmd="*analyze">Second</c>
```

### ✅ Good Practices

```xml
<!-- Complete persona -->
<persona>
  <role>Data Analysis Expert</role>
  <identity>Senior analyst with 10+ years...</identity>
  <communication_style>Analytical and precise...</communication_style>
  <principles>I believe in data-driven...</principles>
</persona>

<!-- Variable-based paths -->
<c cmd="*run" exec="{project-root}/bmad/module/task.md">

<!-- Required commands present -->
<cmds>
  <c cmd="*help">Show commands</c>
  <c cmd="*analyze">Perform analysis</c>
  <c cmd="*exit">Exit</c>
</cmds>
```

## Agent Lifecycle

### 1. Initialization

1. Load agent file
2. Parse XML structure
3. Load critical-actions
4. Apply config overrides
5. Present greeting

### 2. Command Loop

1. Show numbered menu
2. Await user input
3. Resolve command
4. Execute action
5. Return to menu

### 3. Termination

1. User enters \*exit
2. Cleanup if needed
3. Exit persona

## Testing Checklist

Before deploying an agent:

- [ ] Valid XML structure
- [ ] All persona elements present
- [ ] *help and *exit commands exist
- [ ] All paths use variables
- [ ] No duplicate commands
- [ ] Config loading works
- [ ] Commands execute properly

## LLM Building Tips

When building agents:

1. Start with agent type (Simple/Expert/Module)
2. Define complete persona first
3. Add standard critical-actions
4. Include *help and *exit
5. Add domain commands
6. Test command execution
7. Validate with checklist

## Integration Points

### With Workflows

- Agents invoke workflows via run-workflow
- Workflows can be incomplete (marked "todo")
- Workflow paths must be valid or "todo"

### With Tasks

- Tasks are single operations
- Executed via exec attribute
- Can include data files

### With Templates

- Templates define document structure
- Used with create-doc task
- Variables passed through

## Quick Reference

### Minimal Commands

```xml
<cmds>
  <c cmd="*help">Show numbered cmd list</c>
  <c cmd="*exit">Exit with confirmation</c>
</cmds>
```

### Standard Critical Actions

```xml
<critical-actions>
  <i>Load into memory {project-root}/bmad/{module}/config.yaml</i>
  <i>Remember the users name is {user_name}</i>
  <i>ALWAYS communicate in {communication_language}</i>
</critical-actions>
```

### Module Agent Pattern

```xml
<agent id="bmad/{module}/agents/{name}.md"
       name="{Name}"
       title="{Title}"
       icon="{emoji}">
  <persona>...</persona>
  <critical-actions>...</critical-actions>
  <cmds>
    <c cmd="*help">...</c>
    <c cmd="*{command}" run-workflow="{path}">...</c>
    <c cmd="*exit">...</c>
  </cmds>
</agent>
```
