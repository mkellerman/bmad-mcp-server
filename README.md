# BMAD MCP Server

Model Context Protocol (MCP) server implementation for the BMAD (Business Methodology for Agile Development) framework.

## Overview

The BMAD MCP Server exposes BMAD methodology to any MCP-compatible host (Claude Desktop, Cursor, etc.) by serving raw BMAD files on-demand. The server acts as a **file proxy** - it doesn't parse or transform files, instead serving them as-is for the LLM to process according to BMAD methodology.

## Features

- **Agent Prompts**: Access 11 BMAD specialist agents via `/bmad-{name}` prompts
- **Workflow Discovery**: List and execute BMAD workflows dynamically
- **Task Execution**: Invoke BMAD tasks for structured guidance
- **Knowledge Base**: Access domain-specific knowledge (test architecture, patterns, etc.)
- **Format-Agnostic**: Server remains functional even if BMAD changes file formats

## Architecture

- **File Proxy Pattern**: Server serves raw files without parsing
- **Lazy Loading**: Resources loaded just-in-time through conversational discovery
- **Security**: Path validation ensures files stay within BMAD root directory
- **Zero Maintenance**: Updates via `git pull` in `/bmad` folder work seamlessly

## Installation

### Prerequisites

- Python 3.11 or higher
- BMAD v6-alpha installation

### Setup

1. **Clone repository:**
```bash
git clone https://github.com/mkellerman/bmad-mcp-server.git
cd bmad-mcp-server
```

2. **Install BMAD (if not already installed):**
```bash
npx git+https://github.com/bmad-code-org/BMAD-METHOD.git#v6-alpha install
```

3. **Create virtual environment (recommended):**
```bash
python3 -m venv .venv
source .venv/bin/activate  # macOS/Linux
# or
.venv\Scripts\activate     # Windows
```

4. **Install dependencies:**
```bash
# Production (MCP server only)
pip install -e .

# Development (includes all test dependencies, code quality tools, etc.)
pip install -e ".[dev]"
```

5. **Verify installation:**
```bash
python src/mcp_server.py
```

The server should start without errors (though it won't do much yet - Phase 1 in progress!).

## Usage

### Running the Server

```bash
python src/mcp_server.py
```

### Configuration

#### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "bmad": {
      "command": "python",
      "args": ["/path/to/bmad-mcp-server/src/mcp_server.py"]
    }
  }
}
```

#### Cursor

Add to Cursor's MCP settings:

```json
{
  "bmad": {
    "command": "python",
    "args": ["/path/to/bmad-mcp-server/src/mcp_server.py"]
  }
}
```

### Using BMAD Agents

Once configured, invoke agents in your MCP host:

```
/bmad-analyst    - Load Mary (Business Analyst)
/bmad-architect  - Load Winston (Solution Architect)
/bmad-dev        - Load Dev (Developer)
/bmad-pm         - Load John (Product Manager)
... and 7 more agents
```

## Development Status

**Current Phase: Phase 1 - Foundation (MVP)**

- [x] Story 1.1: Setup Project Structure & MCP Server Skeleton ✅ (IN PROGRESS)
- [ ] Story 1.2: Implement Manifest Loader
- [ ] Story 1.3: Implement File Reader
- [ ] Story 1.4: Implement Prompt Builder for Agent Prompts
- [ ] Story 1.5: Wire Prompt System to MCP Server

See [docs/user-stories.md](docs/user-stories.md) for full development roadmap.

## Project Structure

```
bmad-mcp-server/
├── src/
│   ├── mcp_server.py           # Main MCP server entry point ✅
│   ├── loaders/
│   │   ├── manifest_loader.py  # CSV manifest parsing (TODO)
│   │   └── file_reader.py      # Raw file reading (TODO)
│   ├── builders/
│   │   ├── prompt_builder.py   # Wrap raw files with BMAD instructions (TODO)
│   │   ├── tool_builder.py     # MCP tool definitions (TODO)
│   │   └── resource_builder.py # MCP resource definitions (TODO)
│   └── utils/
│       └── path_validator.py   # Security validation (TODO)
├── bmad/                       # BMAD v6-alpha installation ✅
├── docs/
│   ├── prd.md                  # Product Requirements ✅
│   ├── architecture.md         # Architecture Specification ✅
│   └── user-stories.md         # User Stories ✅
├── tests/
│   └── (test files TODO)
├── pyproject.toml              # Python project configuration ✅
└── README.md                   # This file ✅
```

## Testing

Install test dependencies:

```bash
pip install -e ".[dev]"
```

Run tests:

```bash
# All tests (unit + integration, excluding manual by default)
pytest

# Unit tests only (fast)
pytest tests/unit/

# With coverage report
pytest --cov=src --cov-report=html
```

See [tests/README.md](tests/README.md) for comprehensive testing documentation.

## Documentation

- [Product Requirements Document](docs/prd.md)
- [Architecture Specification](docs/architecture.md)
- [User Stories](docs/user-stories.md)

## Contributing

This is a structured development project following BMAD methodology. See user stories for current work items.

## License

TBD

## Acknowledgments

Built using:
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [BMAD Methodology](https://github.com/bmad-code-org/BMAD-METHOD)

---

**Status:** 🚧 Phase 1 Development - Story 1.1 Complete ✅
