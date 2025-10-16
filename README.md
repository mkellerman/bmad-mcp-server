# BMad MCP Server

[![CI - Tests](https://github.com/mkellerman/bmad-mcp-server/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/mkellerman/bmad-mcp-server/actions/workflows/test.yml)
[![PyPI - Version](https://img.shields.io/pypi/v/bmad-mcp-server.svg)](https://pypi.org/project/bmad-mcp-server/)
[![codecov](https://codecov.io/gh/mkellerman/bmad-mcp-server/branch/main/graph/badge.svg)](https://codecov.io/gh/mkellerman/bmad-mcp-server)

**AI-powered MCP Server for [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) agent orchestration and workflow management.**

BMad MCP Server brings a team of specialized AI agent personas directly into your Claude conversations. Get instant access to Business Analysts, Architects, Developers, Product Managers, Scrum Masters, Test Architects, and UX Experts—all working together through structured workflows.

## 🌟 Features

- **11 Specialized Agent Personas**: Each with unique expertise, communication styles, and decision-making principles
- **Multi-Agent Collaboration**: Party Mode enables group discussions with multiple agents responding to your questions
- **Embedded Workflows**: Pre-built workflows for product briefs, architecture design, story creation, and more
- **Task Execution**: Systematic task management with the BMad Master orchestrator
- **Zero Configuration**: Agents and workflows are embedded—just install and go

## 📦 Installation

### Option 1: Install with pip

```bash
pip install bmad-mcp-server
```

### Option 2: Run instantly with uvx (recommended)

```bash
uvx bmad-mcp-server
```

## ⚙️ Configuration

### Claude Desktop Setup

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "bmad": {
      "command": "uvx",
      "args": ["bmad-mcp-server"]
    }
  }
}
```

**Alternative (if installed with pip):**

```json
{
  "mcpServers": {
    "bmad": {
      "command": "python",
      "args": ["-m", "bmad_mcp.server"]
    }
  }
}
```

After updating the config, restart Claude Desktop.

## 🚀 Quick Start

Once configured, you can interact with BMad agents directly in Claude:

### 1. Activate the BMad Master

```
#bmad
```

The BMad Master will greet you and present a menu of options including tasks, workflows, and party mode.

### 2. Access Specific Agents Directly

Jump straight to any agent by name:

```
#bmad analyst        → Mary (Business Analyst)
#bmad architect      → Winston (System Architect)  
#bmad dev            → Amelia (Developer)
#bmad pm             → John (Product Manager)
#bmad sm             → Bob (Scrum Master)
#bmad tea            → Murat (Test Architect)
#bmad ux-expert      → Sally (UX Expert)
```

Each agent has their own specialized menu and workflows tailored to their expertise.

### 3. Start Party Mode (Multi-Agent Chat)

```
#bmad *party-mode
```

This activates all agent personas for a group discussion. Ask any question and watch multiple experts respond with their unique perspectives!

**Example conversation:**
```
You: "We're building a task management app. What should we consider?"

📋 John (PM): [Strategic product perspective]
🏗️ Winston (Architect): [Technical architecture insights]
🎨 Sally (UX Expert): [User experience considerations]
💻 Amelia (Developer): [Implementation approach]
```

### 4. Explore Available Options

- `*help` - Show the main menu
- `*list-agents` - View all available agent personas with commands
- `*list-tasks` - View available tasks
- `*list-workflows` - Browse workflow library
- `*exit` - Exit party mode or current workflow

## 👥 Available Agent Personas

| Icon | Name | Role |
|------|------|------|
| 🧙 | **BMad Master** | Master orchestrator and workflow executor |
| 📊 | **Mary** | Business Analyst - Requirements & research expert |
| 🏗️ | **Winston** | Architect - System design & technical leadership |
| 💻 | **Amelia** | Developer - Implementation specialist |
| 📋 | **John** | Product Manager - Strategy & prioritization |
| 🏃 | **Bob** | Scrum Master - Agile & story preparation |
| 🧪 | **Murat** | Test Architect - Quality & testing strategy |
| 🎨 | **Sally** | UX Expert - User experience & design |

## 🔧 Advanced Usage

### Using with Other MCP Clients

BMad MCP Server works with any MCP-compatible client. The server communicates via stdio and implements the standard MCP protocol.

### Running Standalone

```bash
# Run the server directly
bmad-mcp-server

# Or with Python module syntax
python -m bmad_mcp.server
```

The server will start in stdio mode, waiting for MCP protocol messages.

## 🧪 Development & Testing

### Setup Development Environment

```bash
# Activate virtual environment first
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate   # Windows

# Or use uv to run commands directly
uv run pytest
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage report
pytest --cov=bmad_mcp

# Run specific test categories
pytest tests/unit/
pytest tests/integration/
```

### Test Structure

```
tests/
├── unit/          # Fast, isolated component tests
├── integration/   # MCP protocol and tool integration tests
└── fixtures/      # Shared test data and helpers
```

See [tests/README.md](tests/README.md) for detailed testing guidelines.

## 📚 Workflows

BMad includes embedded workflows for common development activities:

- **Analysis**: Product briefs, research, brainstorming
- **Planning**: Requirements, technical specs, architecture
- **Solutioning**: Architecture decisions, tech selection
- **Implementation**: Story creation, development, retrospectives

Access workflows through the BMad Master menu or by triggering them directly.

## 🛠️ Development Status

**Current Version**: 0.1.0 (Alpha)

This is an early-stage release. While fully functional, expect ongoing improvements and potential breaking changes in future versions.

### Release Channels

- **Pre-releases (TestPyPI)**: Automatic on every push to `main` - for testing and validation
- **Stable releases (PyPI)**: Manual releases after validation - for production use

See [Release Documentation](.github/RELEASE.md) for details on our automated release pipeline.

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🤝 Contributing

Contributions are welcome! We'd love your help making BMad MCP Server even better.

### Quick Start for Contributors

1. Fork and clone the repository
2. Install development dependencies: `uv pip install -e ".[dev]"`
3. Make your changes and add tests
4. Run tests: `pytest`
5. Submit a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:
- Development setup
- Testing requirements (60% minimum coverage)
- Code style guidelines
- Pull request process

Check the [issues](https://github.com/mkellerman/bmad-mcp-server/issues) page for good first issues and areas where you can help!

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/mkellerman/bmad-mcp-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mkellerman/bmad-mcp-server/discussions)

## 🙏 Acknowledgments

[BMAD-METHOD™](https://github.com/bmad-code-org/BMAD-METHOD): Universal AI Agent Framework

Built on the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) by Anthropic.


---

**Ready to get started?** Install BMad MCP Server and activate your AI agent team today! 🚀
