# BMAD Core v4 Validation Guide

This document outlines the validation requirements that the BMAD MCP server performs when checking v4 BMAD installations for community agent submissions.

## Overview

BMAD Core v4 uses a dotfolder structure (`.bmad-<module>/`) with an `install-manifest.yaml` file for configuration. The validation process ensures that custom agents will load properly and function within the BMAD ecosystem.

## Installation Structure Validation

### Required Directory Structure

```
.bmad-<module>/
├── install-manifest.yaml    # Required: Installation metadata
├── core-config.yaml        # Optional: Core configuration
├── agents/                 # Optional but common: Agent files
│   └── *.md               # Agent markdown files
└── workflows/             # Optional: Workflow files
    └── *.yaml            # Workflow configuration files
```

### Manifest File Requirements

#### install-manifest.yaml (Required)

- **File Existence**: Must exist in the dotfolder root
- **YAML Syntax**: Must be valid YAML format
- **Required Fields**:
  - `version`: Semantic version (e.g., "4.44.1")
  - `installed_at`: ISO timestamp of installation
  - `install_type`: Installation method identifier

**Example Structure**:
```yaml
version: "4.44.1"
installed_at: "2024-11-02T10:00:00Z"
install_type: "manual"
expansion_packs: []  # Optional array
```

#### core-config.yaml (Optional)

- **YAML Syntax**: Must be valid YAML if present
- **Version Override**: If present, version field takes precedence over install-manifest.yaml
- **Configuration Data**: May contain additional module configuration

### Version Validation

- **Format**: Must follow semantic versioning (major.minor.patch)
- **Pattern**: `^\d+\.\d+\.\d+(?:-.*)?$`
- **Source Priority**: 
  1. `core-config.yaml` version field (if present)
  2. `install-manifest.yaml` version field
- **Error Conditions**:
  - Missing version in both files
  - Invalid semantic version format
  - Non-numeric major/minor/patch components

## Agent File Validation

### File Location Requirements

- **Directory**: Must be in `agents/` subdirectory
- **Extension**: Must use `.md` extension
- **Naming**: Should follow kebab-case convention (e.g., `my-agent.md`)

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
   <agent id="path/to/agent.md" name="AgentName" title="Agent Title" icon="🔧">
   ```
   - `id`: File path relative to module root
   - `name`: Display name for the agent
   - `title`: Human-readable title
   - `icon`: Single emoji character

4. **Required XML Sections**:
   - `<persona>`: Agent personality and behavior definition
   - `<cmds>`: Command definitions

#### Persona Section Validation

Must contain all required subsections:

```xml
<persona>
  <role>1-2 line professional role description</role>
  <identity>3-5 lines of background and expertise</identity>
  <communication_style>3-5 lines describing interaction approach</communication_style>
  <principles>5-8 lines of core beliefs and methodology (first-person)</principles>
</persona>
```

**Quality Checks**:
- No placeholder text (TODO, FILL THIS IN, etc.)
- Principles should start with first-person statements
- All sections must have meaningful content

#### Command Section Validation

```xml
<cmds>
  <c cmd="*help">Show numbered cmd list</c>
  <c cmd="*exit">Goodbye+exit persona</c>
  <!-- Additional commands... -->
</cmds>
```

**Requirements**:
- Minimum 2 commands (help and exit)
- All commands must start with asterisk (`*`)
- Unique command triggers (no duplicates)
- Proper XML syntax with closing tags

#### Optional Sections

5. **Critical Actions** (if present):
   ```xml
   <critical-actions>
     <i>Load config from {project-root}/bmad/module/config.yaml</i>
     <i>Set variables: {user_name}, {communication_language}</i>
   </critical-actions>
   ```

6. **Activation Rules** (if present):
   ```xml
   <activation critical="MANDATORY">
     <!-- Custom activation sequence -->
   </activation>
   ```

### XML Syntax Validation

- **Well-formed XML**: All tags must be properly opened and closed
- **Nested Structure**: Tags must be properly nested
- **Attribute Syntax**: Attributes must be quoted and unique
- **Character Encoding**: Must be valid UTF-8

## Security Validation

### Input Sanitization

- **Dangerous Characters**: No shell injection characters: `;&|`<>$`
- **ASCII Only**: Non-ASCII characters trigger warnings
- **Path Traversal**: No `../` sequences in file paths
- **Name Format**: Agent names must match pattern: `^[a-z]+(-[a-z]+)*$`

### File Access Validation

- **Bounded Access**: All file references must be within BMAD structure
- **No System Access**: No references to system files or external paths
- **Module Scoping**: File paths must reference valid module resources

## Error Conditions

### Critical Errors (Installation Fails)

1. **Missing install-manifest.yaml**: Dotfolder structure not recognized
2. **Invalid YAML Syntax**: Manifest files cannot be parsed
3. **Missing Version**: No version found in any manifest file
4. **Invalid Version Format**: Version doesn't match semantic versioning
5. **Invalid XML**: Agent files have malformed XML structure
6. **Missing Required Sections**: Agent lacks persona or cmds sections
7. **Security Violations**: Dangerous characters or invalid file paths

### Warnings (Installation Succeeds with Issues)

1. **Missing Directories**: agents/ or workflows/ folders don't exist
2. **Empty Sections**: Required XML sections exist but are empty
3. **Placeholder Content**: TODO or template text remains in agent files
4. **Non-standard Naming**: Files don't follow kebab-case convention
5. **Deprecated Features**: Using deprecated configuration patterns

### Validation Error Codes

```typescript
enum ErrorCode {
  INVALID_CHARACTERS = 'INVALID_CHARACTERS',
  NON_ASCII_CHARACTERS = 'NON_ASCII_CHARACTERS', 
  NAME_TOO_SHORT = 'NAME_TOO_SHORT',
  NAME_TOO_LONG = 'NAME_TOO_LONG',
  INVALID_NAME_FORMAT = 'INVALID_NAME_FORMAT',
  UNKNOWN_AGENT = 'UNKNOWN_AGENT'
}
```

## Best Practices for Community Submissions

### File Organization

1. Use clear, descriptive filenames in kebab-case
2. Organize agents by domain or functionality
3. Include comprehensive documentation in agent descriptions
4. Test agents locally before submission

### Agent Design

1. Define clear, focused roles for each agent
2. Provide meaningful command descriptions
3. Use consistent communication styles
4. Include helpful error messages and guidance

### Version Management

1. Use semantic versioning consistently
2. Document changes in expansion packs
3. Maintain backward compatibility when possible
4. Test with multiple BMAD versions

### Security Considerations

1. Never include sensitive information in agent files
2. Avoid system-level operations or file access
3. Use only approved BMAD variables and placeholders
4. Validate all user inputs within agent logic

## Troubleshooting Common Issues

### "Missing version in core-config.yaml or install-manifest.yaml"

- Ensure version field exists in at least one manifest file
- Check YAML syntax with a validator
- Verify semantic version format (e.g., "4.44.1")

### "Agent Not Found" after installation

- Check filename matches manifest entry
- Verify file exists in agents/ directory
- Ensure proper XML structure with required attributes

### "Invalid XML syntax"

- Validate XML with online checker
- Ensure all tags are properly closed
- Check for proper attribute quoting
- Verify nested structure is correct

### "Invalid characters detected"

- Remove shell metacharacters: `;&|`<>$`
- Use only ASCII characters in critical sections
- Avoid path traversal sequences like `../`

For additional help, run the diagnostic tool: `*doctor`