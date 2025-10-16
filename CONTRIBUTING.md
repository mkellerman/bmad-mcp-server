# Contributing to BMad MCP Server

Thank you for your interest in contributing to BMad MCP Server! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

### Prerequisites

- Python 3.10 or higher
- [uv](https://docs.astral.sh/uv/) package manager (recommended) or pip

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/mkellerman/bmad-mcp-server.git
   cd bmad-mcp-server
   ```

2. **Create a virtual environment**
   ```bash
   # Using uv (recommended)
   uv venv
   source .venv/bin/activate  # On macOS/Linux
   # .venv\Scripts\activate   # On Windows

   # Or using venv
   python -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   # Using uv (recommended)
   uv pip install -e ".[dev]"

   # Or using pip
   pip install -e ".[dev]"
   ```

4. **Run tests to verify setup**
   ```bash
   pytest
   ```

## 🧪 Testing

We use pytest for all testing. Tests are organized into:

- `tests/unit/` - Fast, isolated component tests
- `tests/integration/` - MCP protocol and tool integration tests
- `tests/fixtures/` - Shared test data and helpers

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=bmad_mcp

# Run specific category
pytest tests/unit/
pytest tests/integration/

# Run specific file
pytest tests/unit/test_lean_loading.py
```

### Coverage Requirements

- Minimum coverage: **60%** (enforced by CI)
- Target coverage: **80%** for core functionality
- New features should include tests

See [tests/README.md](tests/README.md) for detailed testing guidelines.

## 📝 Code Style

### Python Style Guide

- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/)
- Use type hints where appropriate
- Write docstrings for public functions and classes
- Keep functions focused and small

### Docstring Format

```python
def load_embedded_file(path: str) -> str:
    """Load a file from the embedded resources directory.
    
    Args:
        path: Relative path to the file within embedded resources.
        
    Returns:
        The file content as a string.
        
    Raises:
        FileNotFoundError: If the file doesn't exist.
    """
    pass
```

## 🔄 Pull Request Process

### Before Submitting

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, focused commits
   - Add tests for new functionality
   - Update documentation if needed

3. **Run tests locally**
   ```bash
   pytest
   ```

4. **Verify code style**
   ```bash
   # Run linting if configured
   flake8 src/
   ```

5. **Update documentation**
   - Update README.md if adding features
   - Update docstrings for modified functions
   - Add examples if helpful

### Submitting the PR

1. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request**
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changes you made and why
   - Include screenshots/examples if applicable

3. **PR Description Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update
   - [ ] Performance improvement
   - [ ] Code refactoring
   
   ## Testing
   - [ ] Tests added/updated
   - [ ] All tests pass locally
   - [ ] Coverage maintained/improved
   
   ## Related Issues
   Fixes #123
   ```

### Review Process

- Maintainers will review your PR
- Address any requested changes
- Once approved, your PR will be merged
- Thank you for your contribution! 🎉

## 🐛 Reporting Bugs

### Bug Report Guidelines

When reporting bugs, please include:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**: Minimal steps to reproduce the issue
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: 
   - OS (macOS, Windows, Linux)
   - Python version
   - BMad MCP Server version
6. **Logs**: Any relevant error messages or logs

### Where to Report

- [GitHub Issues](https://github.com/mkellerman/bmad-mcp-server/issues)

## 💡 Suggesting Features

We welcome feature suggestions! Please:

1. Check existing [Issues](https://github.com/mkellerman/bmad-mcp-server/issues) and [Discussions](https://github.com/mkellerman/bmad-mcp-server/discussions)
2. Open a new Discussion with:
   - Clear description of the feature
   - Use case explaining why it's valuable
   - Example of how it would work
   - Any implementation ideas (optional)

## 🎯 Areas for Contribution

Looking for where to start? Here are some ideas:

### Good First Issues
- Documentation improvements
- Test coverage expansion
- Bug fixes
- Example workflows

### Advanced Contributions
- New agent personas
- Additional workflows
- Performance improvements
- CI/CD enhancements

### Documentation
- Tutorial improvements
- API documentation
- Example use cases
- Video guides

## 🏗️ Project Structure

```
bmad-mcp-server/
├── src/bmad_mcp/          # Main package
│   ├── server.py          # MCP server and tool definitions
│   ├── resources.py       # Embedded resource loading
│   ├── prompts/           # Prompt generation logic
│   └── embedded/          # Embedded agents, workflows, tasks
│       ├── core/          # Core BMAD platform
│       └── bmm/           # BMM module (agents, workflows)
├── tests/                 # Test suite
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── fixtures/         # Test fixtures
├── pyproject.toml        # Project configuration
└── README.md             # Main documentation
```

## 📜 Commit Message Guidelines

Use clear, descriptive commit messages:

```
type: Brief description (max 50 chars)

More detailed explanation if needed (wrap at 72 chars).
Explain what changed and why, not how.

Fixes #123
```

### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test additions/changes
- `refactor`: Code restructuring
- `perf`: Performance improvements
- `chore`: Maintenance tasks

### Examples
```
feat: Add game-dev agent persona

Added new game development specialist agent with expertise
in Unity, Unreal, and gameplay programming.

Fixes #42
```

```
fix: Correct workflow YAML parsing error

Fixed issue where workflows with special characters in names
would fail to load properly.

Fixes #87
```

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🤝 Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other contributors

### Unacceptable Behavior

- Harassment or discriminatory language
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information
- Other unprofessional conduct

## 💬 Communication

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions, ideas, and general discussion
- **Pull Requests**: Code contributions and reviews

## ❓ Questions?

If you have questions about contributing:

- Check this guide and [tests/README.md](tests/README.md)
- Search existing [Issues](https://github.com/mkellerman/bmad-mcp-server/issues) and [Discussions](https://github.com/mkellerman/bmad-mcp-server/discussions)
- Open a new Discussion
- Ask in your PR - maintainers are here to help!

---

Thank you for contributing to BMad MCP Server! 🎉
