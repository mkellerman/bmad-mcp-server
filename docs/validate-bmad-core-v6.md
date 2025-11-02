# BMAD Core v6 Validation Guide

This document outlines the validation requirements that the BMAD MCP server performs when checking v6 BMAD installations for community agent submissions.

## Overview

BMAD Core v6 uses a project-based structure (`{project-root}/bmad/`) with a `_cfg/` directory containing manifest files. The validation process ensures that custom agents will load properly and integrate seamlessly with the BMAD ecosystem.

## Installation Structure Validation

### Required Directory Structure

```
{project-root}/bmad/
├── _cfg/                      # Required: Configuration directory
│   ├── manifest.yaml         # Optional: Installation metadata
│   ├── agent-manifest.csv    # Required: Agent registry
│   ├── workflow-manifest.csv # Optional: Workflow registry  
│   └── task-manifest.csv     # Optional: Task registry
├── <module>/                 # Module directories (e.g., core/, custom/)
│   ├── agents/              # Agent markdown files
│   ├── workflows/           # Workflow YAML files
│   ├── tasks/              # Task definition files
│   └── config.yaml         # Optional: Module configuration
└── config.yaml             # Optional: Global project configuration
```

### Manifest File Requirements

#### _cfg Directory (Required)

- **Directory Existence**: Must exist in bmad/ root
- **Permissions**: Must be readable by MCP server
- **At Least One Manifest**: Must contain either `manifest.yaml` OR `agent-manifest.csv`

#### manifest.yaml (Optional but Recommended)

- **YAML Syntax**: Must be valid YAML format if present
- **Required Fields** (if present):
  - `installation.version`: Semantic version (e.g., "6.0.0-alpha.0")
  - `modules`: Array of module definitions
  - `ides`: Array of supported IDE configurations

**Example Structure**:
```yaml
installation:
  version: "6.0.0-alpha.0"
  installed_at: "2024-11-02T10:00:00Z"
  
modules:
  - name: "core"
    version: "6.0.0"
    source: "package"
  - name: "custom" 
    version: "1.0.0"
    source: "local"

ides:
  - "vscode"
  - "cursor"
```

#### agent-manifest.csv (Required Alternative)

- **CSV Format**: Must be valid comma-separated values
- **Headers**: First row must contain column names
- **Required Columns**:
  - `name`: Agent identifier (kebab-case)
  - `title`: Human-readable title
  - `path`: Relative path to agent file
  - `module`: Module name containing the agent

**Example Structure**:
```csv
name,title,role,path,module,type
analyst,Business Analyst,analyst,agents/analyst.md,core,expert
architect,System Architect,architect,agents/architect.md,core,expert
debug,Debug Specialist,debug,agents/debug.md,core,simple
```

### Version Validation

- **Format**: Must follow semantic versioning with optional prerelease
- **Pattern**: `^\d+\.\d+\.\d+(?:-.*)?$`
- **Prerelease Support**: Allows alpha, beta, rc suffixes (e.g., "6.0.0-alpha.0")
- **Major Version**: v6 installations must have major version ≥ 6
- **Error Conditions**:
  - Missing version in manifest.yaml (when manifest.yaml exists)
  - Invalid semantic version format
  - Version major < 6 for v6 structure

### Module Validation

- **Module Definition**: Each module must be defined in manifest.yaml or inferred from file structure
- **Directory Existence**: Module directories must exist in bmad/ root
- **Naming Convention**: Module names should be lowercase with hyphens
- **Core Module**: "core" module is reserved for BMAD system agents

## Agent File Validation

### File Location Requirements

- **Module Directory**: Must be in `{module}/agents/` subdirectory
- **Extension**: Must use `.md` extension
- **Naming**: Must follow kebab-case convention matching manifest entry
- **Path Resolution**: Uses module-aware path resolution for file loading

### Agent Structure Validation

#### Required Header Elements

1. **BMAD Core Header**:
   ```markdown
   <!-- Powered by BMAD-CORE™ -->
   ```

2. **Title Section**:
   ```markdown
   # Agent Name
   ```

#### XML Structure Requirements

3. **Main Agent Wrapper**:
   ```xml
   <agent id="module/path/to/agent.md" name="AgentName" title="Agent Title" icon="🔧">
   ```
   - `id`: Module-qualified path (e.g., "core/agents/analyst.md")
   - `name`: Display name matching manifest entry
   - `title`: Human-readable title
   - `icon`: Single emoji character

4. **Required XML Sections**:
   - `<persona>`: Agent personality and behavior definition
   - `<cmds>`: Command definitions with proper v6 workflow references

#### Persona Section Validation

Must contain all required subsections:

```xml
<persona>
  <role>Professional role description (1-2 lines)</role>
  <identity>Background and expertise (3-5 lines)</identity>
  <communication_style>Interaction approach (3-5 lines)</communication_style>
  <principles>Core beliefs and methodology (5-8 lines, first-person)</principles>
</persona>
```

**Quality Checks**:
- No placeholder text (TODO, FILL THIS IN, etc.)
- Principles should start with first-person statements ("I believe...", "I approach...")
- All sections must contain meaningful, specific content
- Role should clearly define the agent's primary expertise

#### Command Section Validation

```xml
<cmds>
  <c cmd="*help">Show numbered cmd list</c>
  <c cmd="*solution-architecture" run-workflow="{project-root}/bmad/core/workflows/solution-architecture.yaml">Create system architecture</c>
  <c cmd="*exit">Goodbye+exit persona</c>
</cmds>
```

**Requirements**:
- Minimum 2 commands (*help and *exit are required)
- All commands must start with asterisk (`*`)
- Unique command triggers within agent
- Workflow references must use `{project-root}` placeholder
- Valid workflow paths that exist in the project structure

#### v6-Specific Features

5. **Critical Actions with Module Loading**:
   ```xml
   <critical-actions>
     <i>Load into memory {project-root}/bmad/{module}/config.yaml</i>
     <i>Set variables: project_name, output_folder, user_name, communication_language</i>
     <i>Remember the user's name is {user_name}</i>
     <i>ALWAYS communicate in {communication_language}</i>
   </critical-actions>
   ```

6. **Module-Aware Workflow References**:
   ```xml
   <c cmd="*validate-workflow" validate-workflow="{project-root}/bmad/core/workflows/validate.yaml">
   ```

7. **Enhanced Activation Rules**:
   ```xml
   <activation critical="MANDATORY">
     <init>
       <step n="1">Load persona from current file</step>
       <step n="2">Override with {project-root}/bmad/_cfg/agents/{agent-filename} if exists</step>
       <step n="3">Execute critical-actions if present</step>
       <step n="4">Show greeting + numbered command list</step>
       <step n="5">CRITICAL HALT. AWAIT user input</step>
     </init>
   </activation>
   ```

### CSV Manifest Validation

#### Agent Manifest Entry Requirements

- **Name Match**: Agent filename must match manifest `name` field
- **Valid Path**: Path must point to existing .md file
- **Module Exists**: Module must exist as directory or be defined in manifest.yaml
- **Type Classification**: Agent type should be one of: simple, expert, module
- **Role Consistency**: Role should match agent's declared persona

#### Supported Columns

```csv
name,title,role,path,module,type,tags,description
```

- `name` (Required): Kebab-case identifier
- `title` (Required): Display title
- `role` (Optional): Agent's professional role
- `path` (Required): Relative path from module root
- `module` (Required): Module name
- `type` (Optional): Agent classification
- `tags` (Optional): Comma-separated keywords
- `description` (Optional): Brief description

## Security Validation

### Enhanced v6 Security

- **Module Isolation**: Agents can only access files within their module or explicitly allowed modules
- **Workflow Validation**: All workflow references must exist and be accessible
- **Path Sanitization**: All `{project-root}` references are validated and sandboxed
- **Configuration Security**: Config files are validated for safe variable references

### Input Sanitization (Same as v4)

- **Dangerous Characters**: No shell injection characters: `;&|`<>$`
- **ASCII Preference**: Non-ASCII characters generate warnings
- **Name Format**: Agent names must match: `^[a-z]+(-[a-z]+)*$`
- **Module Names**: Module names must match: `^[a-z]+(-[a-z0-9]+)*$`

### v6-Specific Security

- **Workflow Path Validation**: Workflow references must be within project structure
- **Module Boundary Enforcement**: Agents cannot reference files outside their module scope
- **Configuration Variable Validation**: Only approved variables allowed in critical-actions
- **Cross-Module References**: Explicit permission required for cross-module file access

## Error Conditions

### Critical Errors (Installation Fails)

1. **Missing _cfg Directory**: v6 structure not recognized
2. **No Valid Manifests**: Neither manifest.yaml nor agent-manifest.csv found
3. **Invalid YAML/CSV Syntax**: Manifest files cannot be parsed
4. **Version Validation Failures**:
   - Missing version in manifest.yaml (when present)
   - Invalid semantic version format
   - Major version < 6 for v6 installations
5. **Agent File Issues**:
   - Missing agent files referenced in manifest
   - Invalid XML structure in agent files
   - Missing required XML sections (persona, cmds)
6. **Module Validation Failures**:
   - Referenced modules don't exist
   - Invalid module directory structure
7. **Security Violations**:
   - Dangerous characters in names or paths
   - Invalid workflow references
   - Unauthorized cross-module access

### Warnings (Installation Succeeds with Issues)

1. **Incomplete Manifests**: Missing optional manifest files
2. **Missing Directories**: Expected module subdirectories don't exist
3. **Deprecated Features**: Using v4-style configurations
4. **Inconsistent Metadata**: Manifest data doesn't match file contents
5. **Performance Issues**: Large numbers of agents or complex workflows
6. **Best Practice Violations**: Non-standard naming or organization

### v6-Specific Error Codes

```typescript
enum V6ErrorCode {
  MISSING_CFG_DIRECTORY = 'MISSING_CFG_DIRECTORY',
  INVALID_MANIFEST_YAML = 'INVALID_MANIFEST_YAML',
  INVALID_CSV_FORMAT = 'INVALID_CSV_FORMAT',
  MODULE_NOT_FOUND = 'MODULE_NOT_FOUND',
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  INVALID_MODULE_NAME = 'INVALID_MODULE_NAME',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
  CROSS_MODULE_VIOLATION = 'CROSS_MODULE_VIOLATION'
}
```

## Best Practices for v6 Community Submissions

### Project Organization

1. **Modular Design**: Organize agents by domain into separate modules
2. **Clear Dependencies**: Document inter-module dependencies
3. **Version Consistency**: Maintain consistent versioning across modules
4. **Configuration Management**: Use module-level config files appropriately

### Agent Development

1. **Module-Aware Paths**: Always use `{project-root}` for file references
2. **Workflow Integration**: Create reusable workflows that agents can share
3. **Role Specialization**: Design agents with clear, non-overlapping roles
4. **Command Consistency**: Use consistent command naming across related agents

### Manifest Management

1. **Complete Metadata**: Fill all relevant CSV columns
2. **Accurate Paths**: Verify all file paths before submission
3. **Module Assignment**: Assign agents to appropriate modules
4. **Type Classification**: Properly classify agent types (simple/expert/module)

### v6 Migration from v4

1. **Structure Conversion**: Convert dotfolder to project structure
2. **Manifest Creation**: Generate CSV manifests from existing agents
3. **Path Updates**: Update all file references to use v6 patterns
4. **Workflow Migration**: Convert v4 workflows to v6 format
5. **Testing**: Validate agents work in v6 environment

## Advanced v6 Features

### Module-Qualified Names

Agents can be referenced by module:
- `analyst` (finds first analyst agent by priority)
- `core/analyst` (specifically the core module analyst)
- `custom/analyst` (specifically the custom module analyst)

### Workflow Inheritance

v6 supports workflow inheritance and composition:
```xml
<c cmd="*complex-task" run-workflow="{project-root}/bmad/core/workflows/base.yaml" 
   data="{project-root}/bmad/custom/data/overrides.yaml">
```

### Configuration Cascading

Configuration loads in priority order:
1. Global: `{project-root}/bmad/config.yaml`
2. Module: `{project-root}/bmad/{module}/config.yaml`
3. Agent: `{project-root}/bmad/_cfg/agents/{agent-name}.yaml`

## Troubleshooting v6 Issues

### "Missing _cfg directory"

- Verify bmad/_cfg directory exists
- Check directory permissions
- Ensure at least one manifest file exists

### "No v6 manifest found"

- Create agent-manifest.csv with proper headers
- Validate CSV syntax and encoding
- Ensure manifest.yaml has proper structure (if using)

### "Module not found"

- Check module directory exists in bmad/
- Verify module name in manifest matches directory
- Ensure proper naming convention (lowercase-hyphen)

### "Workflow not found"

- Verify workflow file exists at referenced path
- Check `{project-root}` placeholder resolution
- Ensure workflow is in accessible module

### "Invalid module-qualified name"

- Use format: `module/agent-name`
- Ensure both module and agent exist
- Check for typos in module or agent names

For additional help, run: `*doctor` or `*list-agents` to see available resources.