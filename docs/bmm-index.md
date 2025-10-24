# BMAD MCP Server - Project Documentation

**Generated:** October 24, 2025  
**Version:** 0.1.0  
**Project Type:** Model Context Protocol Server for BMAD Methodology  
**Technology Stack:** Python 3.11+, MCP SDK, Pytest

---

## Executive Summary

The **BMAD MCP Server** provides AI assistants with access to the complete BMAD (Business Methodology for Agile Development) framework via the Model Context Protocol. It exposes 11 specialist AI agents and 36+ automated workflows through a unified tool interface with instruction-based routing.

### Key Capabilities

- **Single Unified Tool**: `bmad` command with intelligent routing for agents and workflows
- **11 Specialist Agents**: Business Analyst, Architect, Developer, Test Architect, Product Manager, etc.
- **36+ Workflows**: Covering analysis, planning, architecture, implementation, and testing phases
- **Instruction-Based Routing**: Smart command parsing with fuzzy matching and helpful error messages
- **Security First**: Path traversal protection, input validation, and secure file reading
- **MCP Native**: Built on official MCP Python SDK with full protocol compliance

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Assistant (Copilot/Claude)            │
└────────────────────────┬────────────────────────────────────┘
                         │ MCP Protocol
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   BMAD MCP Server                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            mcp_server.py (Main Server)               │  │
│  │  • Tool Registration: bmad                           │  │
│  │  • Prompt Discovery: 11 agents                       │  │
│  │  • Resource Exposure: workflows, tasks               │  │
│  └──────────────┬──────────────────────────────┬─────────┘  │
│                 │                              │             │
│                 ▼                              ▼             │
│  ┌──────────────────────────┐  ┌──────────────────────────┐│
│  │  UnifiedBMADTool         │  │  ManifestLoader          ││
│  │  • Command Parsing       │  │  • Agent Manifest        ││
│  │  • Agent Loading         │  │  • Workflow Manifest     ││
│  │  • Workflow Execution    │  │  • Task Manifest         ││
│  │  • Fuzzy Matching        │  └──────────────────────────┘│
│  │  • Validation            │                              │
│  └──────────────┬───────────┘                              │
│                 │                                           │
│                 ▼                                           │
│  ┌──────────────────────────┐                              │
│  │  FileReader              │                              │
│  │  • Secure File Reading   │                              │
│  │  • Path Validation       │                              │
│  │  • Traversal Protection  │                              │
│  └──────────────────────────┘                              │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    BMAD Framework                           │
│  • Agent Definitions (Markdown)                             │
│  • Workflow Configurations (YAML)                           │
│  • Task Definitions (XML)                                   │
│  • Manifest Files (CSV)                                     │
└─────────────────────────────────────────────────────────────┘
```

### Command Flow

```
User Input: "bmad analyst"
     │
     ▼
┌─────────────────────────┐
│  UnifiedBMADTool        │
│  • Parse command        │
│  • Validate input       │
│  • Determine type       │
└──────────┬──────────────┘
           │
           ▼
    ┌──────────────┐
    │ Agent Load?  │
    └──────┬───────┘
           │ Yes
           ▼
┌─────────────────────────┐
│  _load_agent()          │
│  • Find in manifest     │
│  • Read agent.md        │
│  • Format response      │
└──────────┬──────────────┘
           │
           ▼
    Agent Content Returned
```

---

## Core Modules

### 1. MCP Server (`mcp_server.py`)

**Purpose**: Main entry point for the MCP server. Implements MCP protocol handlers and coordinates all server operations.

**Key Components**:
- `BMADMCPServer`: Main server class
- `list_tools()`: Exposes single `bmad` tool
- `list_prompts()`: Returns available agent prompts
- `get_prompt()`: Loads specific agent content
- `call_tool()`: Routes commands to UnifiedBMADTool
- `list_resources()`: Exposes workflows and tasks as resources

**Architecture Patterns**:
- **Server Pattern**: MCP server lifecycle management
- **Facade Pattern**: Unified interface to BMAD framework
- **Dependency Injection**: Components injected via constructor

**Key Features**:
```python
# Single unified tool
Tool(
    name="bmad",
    description="Unified BMAD tool with instruction-based routing",
    inputSchema={...}
)

# Agent prompts discovery
async def list_prompts() -> list[Prompt]:
    # Returns all agents from manifest
    
# Resource exposure
async def list_resources() -> list[Resource]:
    # Workflows, tasks, manifests
```

**Integration Points**:
- `UnifiedBMADTool`: Command execution
- `ManifestLoader`: Discovery metadata
- `FileReader`: Secure file access

---

### 2. Unified Tool (`unified_tool.py`)

**Purpose**: Intelligent command router with validation, fuzzy matching, and error handling. Implements the core `bmad` tool logic.

**Key Components**:
- `UnifiedBMADTool`: Main tool handler class
- `execute(command)`: Primary entry point
- `_parse_command()`: Command type detection
- `_validate_name()`: Input validation
- `_load_agent()`: Agent loading
- `_execute_workflow()`: Workflow execution
- `_find_closest_match()`: Fuzzy matching

**Command Routing Logic**:

```python
# Empty command → bmad-master
"" → _load_agent("bmad-master")

# Agent name → load agent
"analyst" → _load_agent("analyst")

# Workflow with asterisk → execute workflow
"*party-mode" → _execute_workflow("party-mode")

# Discovery commands
"*list-agents" → _list_agents()
"*list-workflows" → _list_workflows()
"*help" → _help()
```

**Validation Pipeline**:
1. Security check (dangerous characters, non-ASCII)
2. Length validation (2-50 characters)
3. Pattern validation (lowercase, hyphens only)
4. Existence validation (agent/workflow exists)
5. Case mismatch detection
6. Fuzzy matching for suggestions

**Error Handling**:
- **Helpful Messages**: Clear explanation of what went wrong
- **Suggestions**: Fuzzy match closest valid name (70% threshold)
- **Examples**: Show correct usage patterns
- **Exit Codes**: Consistent error codes for scripting

**Example Error Response**:
```json
{
    "success": false,
    "error_code": "UNKNOWN_AGENT",
    "error_message": "Agent 'analst' not found. Did you mean 'analyst'?",
    "suggestions": ["analyst"],
    "exit_code": 1
}
```

---

### 3. Manifest Loader (`loaders/manifest_loader.py`)

**Purpose**: Reads CSV manifest files for discovery. Does NOT parse agent/workflow files - just provides metadata for discovery.

**Key Features**:
- `load_agent_manifest()`: Returns agent metadata
- `load_workflow_manifest()`: Returns workflow metadata
- `load_task_manifest()`: Returns task metadata
- Error handling with empty list fallback

**Agent Manifest Schema**:
```csv
name,displayName,title,icon,role,identity,communicationStyle,principles,module,path
analyst,Mary,Business Analyst,📊,Strategic Business Analyst + Requirements Expert,...
```

**Workflow Manifest Schema**:
```csv
name,description,module,path
party-mode,Orchestrates group discussions...,core,bmad/core/workflows/party-mode/workflow.yaml
```

**Design Philosophy**:
- Discovery only - no file parsing
- Fail gracefully with empty lists
- Path resolution relative to bmad_root
- CSV for human readability and easy editing

---

### 4. File Reader (`utils/file_reader.py`)

**Purpose**: Secure file reading with path traversal protection. Ensures all file access stays within BMAD directory boundaries.

**Security Features**:
- **Path Traversal Prevention**: Validates resolved paths stay within bmad_root
- **Path Resolution**: Handles relative paths, symlinks, `..` safely
- **Error Handling**: Clear exceptions for security violations
- **Logging**: Security events logged for audit

**Key Methods**:
```python
def read_file(file_path: str) -> str:
    # Read with security validation
    
def file_exists(file_path: str) -> bool:
    # Safe existence check
    
def _validate_path(resolved_path: Path):
    # Ensure path is within bmad_root
```

**Security Boundary**:
```
bmad_root = /Users/user/bmad-mcp-server/src/
✅ /Users/user/bmad-mcp-server/src/bmad/core/agents/analyst.md
✅ /Users/user/bmad-mcp-server/src/bmad/bmm/workflows/prd/workflow.yaml
❌ /Users/user/.ssh/id_rsa (outside boundary)
❌ /etc/passwd (outside boundary)
```

**Exception Hierarchy**:
- `FileReadError`: Base exception
- `PathTraversalError`: Security violation (subclass)

---

## BMAD Framework Structure

### Agent System

**11 Specialist Agents** organized by module:

**Core Agents**:
- `bmad-master` - Orchestrator and methodology expert

**BMM Module Agents**:
- `analyst` (Mary) - Strategic Business Analyst
- `architect` (Winston) - Solution Architect  
- `dev` (Amelia) - Senior Developer
- `tea` (Murat) - Master Test Architect
- `pm` (John) - Product Manager
- `sm` (Bob) - Scrum Master
- `ux-expert` (Sally) - UX/UI Specialist
- `game-architect` (Cloud Dragonborn) - Game Systems Architect
- `game-designer` (Samus Shepard) - Lead Game Designer
- `game-dev` (Link Freeman) - Game Developer

**Agent Activation Flow**:
1. User: `bmad analyst`
2. Server looks up agent in manifest
3. Reads agent markdown file
4. Returns formatted prompt with agent identity, communication style, principles
5. AI assistant adopts agent persona

### Workflow System

**36+ Workflows** organized by development phase:

**Phase 1: Analysis**
- `brainstorming` - Creative ideation sessions
- `research` - Market/technical research
- `product-brief` - Product vision definition
- `game-brief` - Game design brief
- `document-project` - Brownfield documentation

**Phase 2: Planning**
- `prd` - Product Requirements Document
- `gdd` - Game Design Document
- `tech-spec-sm` - Technical specifications
- `ux-spec` - UX/UI specifications
- `narrative` - Narrative design

**Phase 3: Solutioning**
- `architecture` - Architecture decisions
- `solutioning-gate-check` - Quality gate validation

**Phase 4: Implementation**
- `sprint-planning` - Sprint management
- `create-story` - User story creation
- `dev-story` - Story implementation
- `story-context` - Story context assembly
- `review-story` - Senior developer review
- `retrospective` - Sprint retrospective

**Test Architecture**
- `testarch-framework` - Test framework setup
- `testarch-atdd` - Acceptance test generation
- `testarch-automate` - Test automation expansion
- `testarch-ci` - CI/CD pipeline setup
- `testarch-nfr` - Non-functional requirements
- `testarch-trace` - Requirements traceability

**Helpers**
- `workflow-status` - Status checking
- `workflow-init` - Project initialization
- `sprint-status` - Sprint tracking

**Workflow Execution Pattern**:
```yaml
# Workflow YAML structure
name: "workflow-name"
version: "1.0.0"
description: "What this workflow does"
config_source: "{mcp-resources}/bmad/bmm/config.yaml"
instructions: "{installed_path}/instructions.md"
template: "{installed_path}/template.md"
```

---

## Test Architecture

### Test Organization

```
tests/
├── unit/                    # Fast, isolated tests
│   ├── test_mcp_server.py
│   ├── test_unified_tool.py
│   ├── test_file_reader.py
│   ├── test_manifest_loader.py
│   └── test_security_validation.py
│
├── integration/             # Component integration tests
│   ├── test_mcp_server_integration.py
│   ├── test_agent_prompts.py
│   ├── test_workflow_execution.py
│   └── test_bmad_tool_mcp_validation.py
│
├── e2e/                     # End-to-end with AI
│   ├── test_copilot_agent_activation.py
│   ├── test_declarative_examples.py
│   └── test_multi_agent_workflows.py
│
└── utils/
    ├── copilot_tester.py    # E2E test framework
    └── e2e_framework.py     # Declarative test DSL
```

### Test Levels

**Unit Tests** (Fast, Isolated)
- Mock external dependencies
- Test single functions/methods
- Security validation tests
- Path resolution tests
- Command parsing tests

**Integration Tests** (Component Integration)
- Real manifest loading
- MCP protocol compliance
- Agent prompt generation
- Workflow execution flow
- JSON serialization

**E2E Tests** (Full Workflow with AI)
- Uses GitHub Copilot for LLM testing
- Declarative test framework
- Realistic agent activation
- Multi-agent workflows
- Content validation

### Test Frameworks

**Pytest Configuration**:
```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
markers = [
    "manual: Manual/interactive tests",
    "integration: Integration tests",
    "e2e: End-to-end tests (requires litellm)"
]
```

**E2E Framework** (`utils/e2e_framework.py`):
```python
# Declarative test DSL
await (
    Test("Test copilot agent activation")
    .invoke_tool("bmad", command="analyst")
    .expect_success()
    .expect_content_contains("Mary")
    .expect_content_contains("Business Analyst")
    .run()
)
```

**Coverage**:
- Unit tests: High coverage of core logic
- Integration: MCP protocol validation
- E2E: Real-world usage patterns

---

## Security & Validation

### Security Measures

**1. Path Traversal Protection**
- All file paths validated against bmad_root
- Symbolic links resolved and checked
- `..` and relative paths handled safely

**2. Input Validation**
```python
# Dangerous characters blocked
DANGEROUS_CHARS = [';', '&', '|', '$', '`', '<', '>', '\n', '\r', '(', ')']

# Non-ASCII rejected
if not command.isascii():
    raise ValidationError("Non-ASCII characters not allowed")

# Length limits
MIN_NAME_LENGTH = 2
MAX_NAME_LENGTH = 50
```

**3. Name Pattern Validation**
```python
# Agents: lowercase + hyphens
AGENT_NAME_PATTERN = r'^[a-z]+(-[a-z]+)*$'

# Workflows: lowercase + numbers + hyphens  
WORKFLOW_NAME_PATTERN = r'^[a-z0-9]+(-[a-z0-9]+)*$'
```

**4. Existence Validation**
- Agent name must exist in manifest
- Workflow name must exist in manifest
- File paths must exist before reading

**5. Fuzzy Matching for UX**
- 70% similarity threshold
- Prevents typo frustration
- Suggests closest valid name

### Error Handling Strategy

**Principle**: Fail helpfully, not silently

**Error Response Structure**:
```json
{
    "success": false,
    "error_code": "UNKNOWN_AGENT",
    "error_message": "Clear human-readable message",
    "suggestions": ["closest-match"],
    "exit_code": 1
}
```

**Error Categories**:
- **Security Errors**: Dangerous characters, path traversal
- **Validation Errors**: Invalid format, length, existence
- **User Errors**: Typos, case mismatch, missing asterisk
- **System Errors**: File not found, read errors

---

## Configuration

### Installation Paths

The server supports multiple installation patterns:

```python
# Option 1: Project root (contains bmad/ subdirectory)
bmad_root = /Users/user/bmad-mcp-server
manifest_dir = bmad_root / "bmad" / "_cfg"

# Option 2: Source root (contains src/bmad/ subdirectory)
bmad_root = /Users/user/bmad-mcp-server/src
manifest_dir = bmad_root / "bmad" / "_cfg"

# Option 3: BMAD directory itself
bmad_root = /Users/user/bmad-mcp-server/src/bmad
manifest_dir = bmad_root / "_cfg"
```

### BMM Module Configuration

```yaml
# src/bmad/bmm/config.yaml
project_name: bmad-mcp-server
user_skill_level: expert
user_name: BLad
communication_language: English
document_output_language: English
output_folder: '{project-root}/docs'
tech_docs: '{project-root}/docs'
dev_story_location: '{project-root}/docs/stories'
tea_use_mcp_enhancements: true
```

### AI Assistant Configuration

**GitHub Copilot (VS Code)**:
```json
// Auto-discovered when repository is open
// Ensure MCP is enabled in Copilot settings
```

**Claude Desktop**:
```json
{
  "mcpServers": {
    "bmad": {
      "command": "python",
      "args": ["/absolute/path/to/bmad-mcp-server/src/mcp_server.py"]
    }
  }
}
```

**Cursor**:
Same configuration as Claude Desktop in Cursor's MCP settings.

---

## Usage Patterns

### Command Patterns

```bash
# Load default agent (bmad-master)
bmad

# Load specific agent
bmad analyst
bmad architect
bmad dev

# Execute workflow
bmad *party-mode
bmad *brainstorming
bmad *document-project

# Discovery commands
bmad *list-agents
bmad *list-workflows
bmad *list-tasks
bmad *help
```

### Workflow Progression

**Typical Project Flow**:
1. `bmad *workflow-init` - Initialize project tracking
2. `bmad *product-brief` - Define product vision
3. `bmad *research` - Market/technical research
4. `bmad *prd` - Create PRD and epics
5. `bmad *architecture` - Architecture decisions
6. `bmad *solutioning-gate-check` - Validate completeness
7. `bmad *sprint-planning` - Plan implementation
8. `bmad *create-story` - Generate user stories
9. `bmad *story-context` - Assemble context
10. `bmad *dev-story` - Implement story
11. `bmad *review-story` - Senior review
12. `bmad *retrospective` - Extract learnings

### Agent Usage Patterns

**Multi-Agent Collaboration**:
```bash
# Start group discussion
bmad *party-mode

# Specific sequence
bmad analyst      # Requirements analysis
bmad architect    # Design solution
bmad dev          # Implementation
bmad tea          # Test strategy
```

**Single Agent Focus**:
```bash
# Deep dive with one agent
bmad analyst
# User has conversation with analyst
# Analyst stays in context
```

---

## Development

### Project Structure

```
bmad-mcp-server/
├── src/                      # Source code
│   ├── mcp_server.py        # Main MCP server
│   ├── unified_tool.py      # Command router
│   ├── loaders/             # Manifest loaders
│   ├── utils/               # File reader, paths
│   └── bmad/                # BMAD framework
│       ├── _cfg/            # CSV manifests
│       ├── core/            # Core agents/workflows
│       └── bmm/             # BMM module
│
├── tests/                   # Test suite
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   ├── e2e/               # E2E tests
│   └── utils/             # Test frameworks
│
├── docs/                   # Documentation
├── pyproject.toml         # Project config
└── README.md              # Quick start
```

### Running Tests

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run all tests (excluding manual)
pytest

# Run specific test level
pytest tests/unit/
pytest tests/integration/
pytest tests/e2e/

# Run with coverage
pytest --cov=src --cov-report=html

# Run manual/interactive tests
pytest -m manual -v
```

### Development Workflow

1. **Setup Environment**:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

2. **Run Tests**:
```bash
pytest tests/unit/        # Fast feedback
pytest tests/integration/ # Integration
pytest tests/e2e/        # Full validation
```

3. **Check Coverage**:
```bash
pytest --cov=src --cov-report=html
open htmlcov/index.html
```

4. **Code Quality**:
```bash
black src/ tests/         # Format
isort src/ tests/         # Sort imports
flake8 src/ tests/        # Lint
mypy src/                 # Type check
```

### Adding New Agents

1. Create agent markdown file in `src/bmad/{module}/agents/{agent-name}.md`
2. Add entry to `src/bmad/_cfg/agent-manifest.csv`:
```csv
name,displayName,title,icon,role,identity,communicationStyle,principles,module,path
new-agent,AgentName,Title,🎯,Role,Identity...,Style...,Principles...,bmm,bmad/bmm/agents/new-agent.md
```
3. Server automatically discovers on restart

### Adding New Workflows

1. Create workflow directory: `src/bmad/{module}/workflows/{phase}/{workflow-name}/`
2. Add files:
   - `workflow.yaml` - Configuration
   - `instructions.md` - Execution instructions
   - `template.md` - Output template (if applicable)
3. Add entry to `src/bmad/_cfg/workflow-manifest.csv`:
```csv
name,description,module,path
new-workflow,Description of workflow,bmm,bmad/bmm/workflows/phase/new-workflow/workflow.yaml
```
4. Server automatically discovers on restart

---

## Dependencies

### Core Dependencies

```toml
[project]
requires-python = ">=3.11"
dependencies = [
    "mcp>=1.19.0",  # Model Context Protocol SDK
]
```

### Development Dependencies

```toml
[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",          # Test framework
    "pytest-asyncio>=0.21.0", # Async test support
    "pytest-cov>=4.0.0",      # Coverage reporting
    "pytest-mock>=3.12.0",    # Mocking
    "litellm>=1.78.0",        # LLM testing (e2e)
    "jsonschema>=4.20.0",     # JSON validation
    "faker>=22.0.0",          # Test data generation
    "black>=24.0.0",          # Code formatting
    "isort>=5.13.0",          # Import sorting
    "flake8>=7.0.0",          # Linting
    "mypy>=1.8.0",            # Type checking
    "rich>=13.0.0",           # Terminal formatting
]
```

### Runtime Requirements

- **Python 3.11+**: Required for modern async features
- **MCP SDK**: Official Model Context Protocol library
- **No Heavy Dependencies**: Minimal runtime footprint

---

## Performance Considerations

### Design for Performance

**Lazy Loading**:
- Manifests loaded once on startup
- Agent/workflow files loaded on demand
- No pre-parsing of content

**Efficient Discovery**:
- CSV manifests for fast parsing
- In-memory manifest cache
- O(n) lookup for validation

**Minimal Processing**:
- Server is a file proxy
- No content transformation
- LLM does the processing

**Async Operations**:
- All MCP operations are async
- Non-blocking file I/O
- Concurrent request handling

### Scalability

**Single User Model**:
- Designed for personal AI assistant
- Not a multi-tenant server
- Process per user (Copilot/Claude)

**File System Bound**:
- Performance limited by file system
- Typical latency: <100ms for agent load
- Manifest loading: <50ms

---

## Troubleshooting

### Common Issues

**Issue**: Server not discovered by AI assistant  
**Solution**: 
- Restart AI assistant after config changes
- Use absolute paths in configuration
- Check MCP is enabled in assistant settings

**Issue**: Agent/workflow not found  
**Solution**:
- Run `bmad *list-agents` or `bmad *list-workflows`
- Check CSV manifest files
- Verify file paths in manifest are correct

**Issue**: Path traversal error  
**Solution**:
- Ensure all files are within bmad_root
- Check for symlinks outside boundary
- Verify manifest paths use relative paths

**Issue**: Command not recognized  
**Solution**:
- Check command format (no spaces, correct asterisk usage)
- Use `bmad *help` for command reference
- Fuzzy matching will suggest corrections

### Debug Mode

```python
# Enable verbose logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Run server with debug output
python src/mcp_server.py
```

### Test Validation

```bash
# Verify server works
pytest tests/integration/test_mcp_server_integration.py -v

# Validate MCP responses
pytest tests/integration/test_bmad_tool_mcp_validation.py -v

# Check agent activation
pytest tests/e2e/test_copilot_agent_activation.py -v
```

---

## Future Enhancements

### Planned Features

1. **Performance Metrics**
   - Command execution timing
   - Cache hit rates
   - Usage analytics

2. **Enhanced Workflows**
   - Workflow state persistence
   - Resume capabilities
   - Parallel workflow execution

3. **Agent Improvements**
   - Custom agent creation tools
   - Agent personality tuning
   - Multi-agent coordination patterns

4. **Developer Experience**
   - VS Code extension for BMAD
   - CLI tool for testing workflows
   - Interactive workflow debugger

5. **Documentation**
   - Auto-generated API docs
   - Workflow visualization
   - Video tutorials

### Research Areas

- **Adaptive Agents**: Agents that learn from interactions
- **Workflow Optimization**: Smart workflow routing
- **Context Management**: Better context assembly
- **Multi-Agent Protocols**: Standardized agent communication

---

## Contributing

### Development Setup

```bash
# Clone repository
git clone https://github.com/mkellerman/bmad-mcp-server.git
cd bmad-mcp-server

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest
```

### Code Standards

- **Python 3.11+** syntax
- **Type hints** for all functions
- **Docstrings** for all public methods
- **Tests** for all new features
- **Black** formatting (line length 100)
- **Async/await** for I/O operations

### Pull Request Process

1. Create feature branch
2. Write tests first (TDD)
3. Implement feature
4. Ensure tests pass
5. Run code quality checks
6. Submit PR with description

---

## License & Credits

**License**: MIT (see LICENSE file)

**Author**: mkellerman

**BMAD Methodology**: Business Methodology for Agile Development

**Model Context Protocol**: Anthropic

---

## Appendix

### Glossary

- **BMAD**: Business Methodology for Agile Development
- **MCP**: Model Context Protocol
- **Agent**: Specialist AI persona with specific expertise
- **Workflow**: Automated process with steps and templates
- **Manifest**: CSV file listing available resources
- **bmad_root**: Security boundary for file access
- **Unified Tool**: Single `bmad` command with routing

### File Locations

```
Configuration Files:
- Agent Manifest: src/bmad/_cfg/agent-manifest.csv
- Workflow Manifest: src/bmad/_cfg/workflow-manifest.csv
- Task Manifest: src/bmad/_cfg/task-manifest.csv
- BMM Config: src/bmad/bmm/config.yaml

Agent Files:
- Core: src/bmad/core/agents/
- BMM: src/bmad/bmm/agents/

Workflow Files:
- Core: src/bmad/core/workflows/
- BMM: src/bmad/bmm/workflows/

Documentation:
- Output: docs/
- Stories: docs/stories/
```

### Version History

- **0.1.0** (Oct 2025): Initial release
  - 11 specialist agents
  - 36+ workflows
  - Unified tool interface
  - MCP protocol compliance
  - Comprehensive test suite

---

**Document Status**: Complete ✅  
**Last Updated**: October 24, 2025  
**Generated by**: BMAD MCP Server - document-project workflow
