# Build Agent Validation Checklist

## Agent Structure Validation

### XML Structure

- [ ] Valid XML syntax with proper opening and closing tags
- [ ] Agent tag has required attributes: id, name, title, icon
- [ ] All XML tags properly nested and closed
- [ ] No duplicate attribute names within same element

### Core Components

- [ ] `<!-- Powered by BMAD-CORE™ -->` header present at top of file
- [ ] Title section with agent name exists after header
- [ ] Main `<agent>` wrapper element present
- [ ] `<persona>` section exists and is not empty
- [ ] `<cmds>` section exists with at least 2 commands

## Persona Completeness

### Required Persona Elements

- [ ] `<role>` tag present with 1-2 line description of agent's professional role
- [ ] `<identity>` tag present with 3-5 lines describing background and expertise
- [ ] `<communication_style>` tag present with 3-5 lines describing interaction approach
- [ ] `<principles>` tag present with 5-8 lines of core beliefs and methodology

### Persona Quality

- [ ] Role clearly defines primary expertise area
- [ ] Identity includes relevant experience indicators
- [ ] Communication style describes how agent interacts with users
- [ ] Principles start with "I believe" or "I operate" or similar first-person statement
- [ ] No placeholder text like "TODO" or "FILL THIS IN" remains

## Command Structure

### Required Commands

- [ ] `*help` command present to show command list
- [ ] `*exit` command present to exit agent persona
- [ ] All commands start with asterisk (\*) prefix
- [ ] Each command has descriptive text explaining its purpose

### Command Validation

- [ ] No duplicate command triggers (each cmd attribute is unique)
- [ ] Commands are properly formatted as `<c cmd="*trigger">Description</c>`
- [ ] For workflow commands: `run-workflow` attribute has valid path or "todo"
- [ ] For task commands: `exec` attribute has valid path
- [ ] No malformed command attributes

## Agent Type Specific

### Simple Agent

- [ ] Self-contained with no external workflow dependencies OR marked as "todo"
- [ ] Any embedded data properly structured
- [ ] Logic description clear if embedded functionality exists

### Expert Agent

- [ ] Sidecar resources clearly defined if applicable
- [ ] Domain restrictions documented in critical-actions or sidecar-resources
- [ ] Memory/knowledge file paths specified if used
- [ ] Access patterns (read/write) defined for resources

### Module Agent

- [ ] Module path correctly references existing module (bmm/bmb/cis or custom)
- [ ] Config loading path in critical-actions matches module structure
- [ ] At least one workflow or task reference (or marked "todo")
- [ ] Module-specific conventions followed

## Critical Actions (if present)

### Standard Actions

- [ ] Config loading path is valid: `{project-root}/bmad/{module}/config.yaml`
- [ ] User name variable reference: `{user_name}`
- [ ] Communication language reference: `{communication_language}`
- [ ] All variable references use proper syntax: `{variable_name}`

### Custom Actions

- [ ] Custom initialization clearly described
- [ ] No syntax errors in action statements
- [ ] All file paths use {project-root} or other valid variables

## Optional Elements

### Activation Rules (if custom)

- [ ] Initialization sequence clearly defined
- [ ] Command resolution logic specified
- [ ] Input handling rules documented
- [ ] All custom rules properly structured

### Config File (if created)

- [ ] Located in correct path: `{project-root}/bmad/_cfg/agents/`
- [ ] Follows config override structure
- [ ] Name matches agent filename

## Final Validation

### File Quality

- [ ] No syntax errors that would prevent agent loading
- [ ] All placeholders replaced with actual values
- [ ] File saved to correct location as specified in workflow
- [ ] Filename follows kebab-case convention

### Usability

- [ ] Agent purpose is clear from title and persona
- [ ] Commands logically match agent's expertise
- [ ] User would understand how to interact with agent
- [ ] Next steps for implementation are clear

## Issues Found

### Critical Issues

<!-- List any issues that MUST be fixed before agent can function -->

### Warnings

<!-- List any issues that should be addressed but won't break functionality -->

### Improvements

<!-- List any optional enhancements that could improve the agent -->
