# BMAD Core v6 Format Comparison & Validation Guide

This document compares the **Official BMAD v6 YAML format** (from BMAD-METHOD repo) with the **MCP-Compatible Markdown format** and provides validation guidance for both.

## 📋 **Format Overview**

BMAD Core v6 supports **two agent definition formats**:

### 1. **Official YAML Format** (Primary)
- **Files**: `*.agent.yaml` 
- **Structure**: Structured YAML with Zod schema validation
- **Source**: [BMAD-METHOD repository](https://github.com/bmad-code-org/BMAD-METHOD/tree/v6-alpha)
- **Validation**: Official schema with comprehensive testing framework

### 2. **MCP-Compatible Markdown Format** (Secondary)
- **Files**: `*.md`
- **Structure**: Markdown with XML-like tags
- **Source**: bmad-mcp-server project  
- **Validation**: Flexible parsing for MCP tool compatibility

## 🎯 **When to Use Each Format**

### Use **Official YAML** When:
- Building production BMAD installations
- Contributing to official BMAD-METHOD project
- Need strict schema validation
- Want comprehensive testing framework
- Developing core or module agents

### Use **MCP Markdown** When:
- Integrating with existing MCP tools
- Need backward compatibility
- Prefer human-readable documentation format
- Rapid prototyping and development
- Custom integrations

## 📝 **Format Comparison**

### **Official YAML Structure**
```yaml
agent:
  metadata:
    id: "core/analysts/business-analyst"
    name: "business-analyst"
    title: "Business Analyst"
    icon: "📊"
    module: "core"  # Required for modules, forbidden for core
  
  persona:
    role: "Senior Business Analyst specializing in requirements gathering"
    identity: "Expert in stakeholder communication and process analysis"
    communication_style: "Professional yet approachable, uses business terminology"
    principles:
      - "I believe data-driven decisions lead to better outcomes"
      - "I focus on understanding user needs before technical solutions"
      - "I bridge the gap between business and technical teams"
  
  menu:
    - trigger: "help"
      description: "Show available commands"
      action: "help"
    - trigger: "analyze-requirements"
      description: "Analyze business requirements"
      workflow: "requirements-analysis.yaml"
    - trigger: "exit"
      description: "Exit analyst persona"
      action: "exit"
  
  critical_actions:
    - "Load project configuration from config.yaml"
    - "Initialize user context and communication preferences"
  
  prompts:
    - id: "requirement-template"
      content: "Template for gathering requirements..."
      description: "Standard requirements gathering template"
```

### **MCP Markdown Structure**
```markdown
<!-- Powered by BMAD-CORE™ -->

# Business Analyst

<agent id="core/analysts/business-analyst" name="business-analyst" title="Business Analyst" icon="📊">
  <persona>
    <role>Senior Business Analyst specializing in requirements gathering</role>
    <identity>Expert in stakeholder communication and process analysis</identity>
    <communication_style>Professional yet approachable, uses business terminology</communication_style>
    <principles>I believe data-driven decisions lead to better outcomes. I focus on understanding user needs before technical solutions. I bridge the gap between business and technical teams.</principles>
  </persona>
  
  <critical-actions>
    <i>Load project configuration from {project-root}/bmad/core/config.yaml</i>
    <i>Initialize user context and communication preferences</i>
  </critical-actions>
  
  <cmds>
    <c cmd="*help">Show available commands</c>
    <c cmd="*analyze-requirements" run-workflow="{project-root}/bmad/core/workflows/requirements-analysis.yaml">Analyze business requirements</c>
    <c cmd="*exit">Exit analyst persona</c>
  </cmds>
</agent>
```

## ✅ **Official YAML Validation**

### **Schema Requirements**

#### **Metadata Section** (Required)
```yaml
metadata:
  id: string               # Unique identifier
  name: string             # Agent name (kebab-case)
  title: string            # Display title
  icon: string             # Single emoji character
  module?: string          # Required for modules, forbidden for core
```

**Validation Rules**:
- **Core agents**: Must NOT include `module` field
- **Module agents**: Must include `module` field matching file path
- **Name format**: Must be kebab-case (`agent-name`)
- **Icon**: Should be a single emoji character

#### **Persona Section** (Required)
```yaml
persona:
  role: string                    # Professional role (1-2 lines)
  identity: string                # Background/expertise (3-5 lines)  
  communication_style: string     # Interaction approach (3-5 lines)
  principles: [string]            # Array of principles (3+ recommended)
```

**Quality Guidelines**:
- **Role**: Clear, concise professional description
- **Identity**: Specific expertise and background
- **Communication Style**: How the agent interacts
- **Principles**: First-person statements about beliefs/approach

#### **Menu Section** (Required)
```yaml
menu:
  - trigger: string              # kebab-case command name
    description: string          # Command description
    # One of these command targets required:
    workflow?: string            # Workflow file path
    run-workflow?: string        # Run workflow path  
    validate-workflow?: string   # Validate workflow path
    exec?: string               # Execute file path
    action?: string             # Action to perform
    tmpl?: string              # Template file path
    data?: string              # Data file path
```

**Validation Rules**:
- **Minimum 1 menu item** required
- **Trigger format**: Must be kebab-case (`help`, `analyze-data`)
- **No duplicates**: Each trigger must be unique within agent
- **Command target**: Each menu item must have at least one command field
- **Standard commands**: Should include `help` and `exit`

#### **Optional Sections**
```yaml
critical_actions?: [string]     # Initialization actions
prompts?: [object]             # Reusable prompts/templates
```

### **File Path Validation**

The schema validates module scope based on file location:

- **Core agents**: `src/core/agents/*.agent.yaml` → No module field
- **Module agents**: `src/modules/{module}/agents/*.agent.yaml` → Module field must match

### **Official Test Suite**

Run official validation tests:
```bash
# Official BMAD-METHOD validation
node test/test-agent-schema.js

# Unit tests for edge cases  
node test/unit-test-schema.js
```

## ✅ **MCP Markdown Validation**

### **Required Elements**

#### **Header** (Required)
```markdown
<!-- Powered by BMAD-CORE™ -->
```

#### **Agent Wrapper** (Required)
```xml
<agent id="module/path" name="agent-name" title="Display Title" icon="🔧">
  <!-- Content -->
</agent>
```

**Attributes**:
- `id`: Module-qualified path for v6
- `name`: Agent identifier
- `title`: Human-readable title
- `icon`: Single emoji

#### **Persona Section** (Required)
```xml
<persona>
  <role>Professional role description</role>
  <identity>Background and expertise</identity>
  <communication_style>Interaction approach</communication_style>
  <principles>First-person principles and beliefs</principles>
</persona>
```

#### **Commands Section** (Required)
```xml
<cmds>
  <c cmd="*help">Show help</c>
  <c cmd="*custom-command" run-workflow="{project-root}/path">Description</c>
  <c cmd="*exit">Exit</c>
</cmds>
```

### **v6-Specific Features**

#### **Project Root Placeholders**
```xml
<c cmd="*workflow" run-workflow="{project-root}/bmad/core/workflows/task.yaml">
```

#### **Module-Aware Critical Actions**
```xml
<critical-actions>
  <i>Load config from {project-root}/bmad/{module}/config.yaml</i>
  <i>Set variables: {user_name}, {communication_language}</i>
</critical-actions>
```

## 🔧 **Validation Tools**

### **Enhanced Validation Script**
```bash
# Validates both formats + MCP compatibility
node scripts/validate-bmad-v6-enhanced.mjs ./bmad
```

**Features**:
- ✅ Official YAML schema validation (Zod-based)
- ✅ MCP Markdown format validation  
- ✅ MCP tool compatibility testing
- ✅ Format comparison and recommendations
- ✅ Quality checks and best practices

### **Original Format-Specific Scripts**
```bash
# Original v6 markdown validation
node scripts/validate-bmad-v6.mjs ./bmad

# v4 validation  
node scripts/validate-bmad-v4.mjs .bmad-core
```

## 📊 **Validation Report Example**

```
🔍 Enhanced BMAD Core v6 Validation Starting...

📄 Official YAML Schema Validation
   ✅ analyst.agent.yaml: Passes official schema validation
   ✅ Has help command
   ⚠️  Should have at least 3 principles

📝 MCP-Compatible Markdown Validation  
   ✅ architect.md: BMAD-CORE™ header present
   ✅ Uses v6 {project-root} placeholders
   ✅ No placeholder text found

🔧 MCP Tool Compatibility Test
   ✅ Agent listing works  
   ✅ Agent 'analyst' loads in MCP
   ✅ Agent 'architect' loads in MCP

📈 Overall Statistics:
   ✅ Passed: 12
   ⚠️  Warnings: 1
   ❌ Failed: 0

📋 Format Breakdown:
   📄 Official YAML (.agent.yaml): 1 agents
   📝 MCP Markdown (.md): 1 agents
```

## 🎯 **Migration Guidelines**

### **YAML → Markdown**
1. Convert YAML structure to XML tags
2. Transform `menu` array to `<cmds>` with `<c>` elements
3. Add BMAD-CORE™ header
4. Use `{project-root}` placeholders

### **Markdown → YAML**  
1. Extract XML content to YAML structure
2. Convert `<cmds>` to `menu` array
3. Split persona into required subsections
4. Add module field for module agents

### **Best Practices**
1. **Choose one format** per project for consistency
2. **Official YAML** for production/submission
3. **MCP Markdown** for development/integration
4. **Validate both** formats during testing
5. **Document format choice** in project README

## 🔗 **References**

- **Official Schema**: [BMAD-METHOD/tools/schema/agent.js](https://github.com/bmad-code-org/BMAD-METHOD/blob/v6-alpha/tools/schema/agent.js)
- **Test Suite**: [BMAD-METHOD/test/test-agent-schema.js](https://github.com/bmad-code-org/BMAD-METHOD/blob/v6-alpha/test/test-agent-schema.js)
- **MCP Integration**: [bmad-mcp-server documentation](../docs/)
- **v6 Guidelines**: [validate-bmad-core-v6.md](./validate-bmad-core-v6.md)