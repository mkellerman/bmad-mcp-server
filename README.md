# 🚀 BMAD MCP Server

> **💡 Built on the BMAD Method**  
> This MCP server brings the power of the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) to any AI assistant. All methodology, workflows, and best practices are credited to the original BMAD Method project. This server makes it instantly accessible through the Model Context Protocol.

**Transform how you work with AI assistants across all your projects**

The traditional BMAD approach requires copying files to every project and manually loading agents. The MCP Server changes everything: configure once, access instantly everywhere, stay always updated. It's the difference between managing BMAD in every project versus having it just work.

## Why Choose the MCP Server Over Traditional BMAD?

### The Traditional Way (Single Project Installation)

You install BMAD files directly in your project:

- ❌ **Copy files to every project** - Manual setup for each workspace
- ❌ **Keep 5, 10, 20+ copies in sync** - When BMAD updates, update everywhere
- ❌ **Project clutter** - BMAD files mixed with your code
- ❌ **Version drift** - Different projects using different BMAD versions
- ❌ **Repetitive configuration** - Same setup over and over
- ❌ **Maintenance burden** - Multiply effort by number of projects

### The MCP Server Way (Universal Access)

One server installation serves all your projects:

- ✅ **Configure once, use everywhere** - Single setup for unlimited projects
- ✅ **Always up to date** - Update once, all projects benefit instantly
- ✅ **Zero project clutter** - No BMAD files in your repositories
- ✅ **Consistent experience** - Same agents and workflows everywhere
- ✅ **Instant access** - Available in every workspace immediately
- ✅ **Effortless maintenance** - Update one location, done
- ✅ **Smart overrides** - Customize per-project when needed, global by default

### Real Impact

**Scenario: You maintain 10 projects**

Traditional BMAD:

- 10 separate installations
- 10 places to update when BMAD improves
- 10 sets of files to manage
- Hours of maintenance time

MCP Server:

- 1 installation
- 1 update location
- 0 files in your projects
- Minutes to upgrade everything

**The MCP Server doesn't just make BMAD easier—it makes it scalable.**

## ⚡ Quick Start

Get BMAD working across all your projects in 2 minutes:

**Step 1: Add to your AI client configuration**

Add this to your VS Code settings, Claude Desktop, or Cursor config:

```json
{
  "servers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"]
    }
  }
}
```

**Step 2: Restart your AI client**

**Step 3: Start using BMAD anywhere**

Open any project and say:

```
bmad analyst
```

That's it! Mary (the Business Analyst) is ready to help. Works in this project, every project, instantly.

**Advanced: Discovery Modes**

The server supports two modes for finding BMAD installations:

- **`auto` (default)** - Automatically discovers from project, user defaults, or package
- **`strict`** - Uses only exact paths provided via CLI arguments (production use)

See [Installation Guide](./docs/installation.md) for detailed configuration options.

📖 **Detailed setup for your specific AI client:** [Installation Guide](./docs/installation.md)

## 🎯 What Makes BMAD Powerful?

### 11 Specialist AI Agents, Always Available

Every agent brings unique expertise, personality, and specialized workflows:

```bash
bmad analyst      # Mary - Strategic Business Analyst
bmad architect    # Winston - Solution Architect
bmad dev          # Amelia - Senior Implementation Engineer
bmad ux-expert    # Sally - UX/UI Specialist
bmad tea          # Murat - Master Test Architect
bmad pm           # John - Product Manager
bmad sm           # Bob - Scrum Master
# ... plus 4 game development specialists
```

### 36+ Automated Workflows

Complex multi-step processes become single commands:

```bash
bmad *party-mode       # Multi-agent brainstorming
bmad *workflow-status  # Project health check
bmad *atdd            # Generate acceptance tests
bmad *ux-spec         # Create UX specifications
```

### Works With Your Workflow

- **VS Code** - Integrated with GitHub Copilot
- **Claude Desktop** - Full MCP support
- **Cursor** - Native compatibility
- **Any MCP Client** - Standard protocol

### Flexible When You Need It

**Global by default:**

- Server provides BMAD to all projects
- Consistent methodology everywhere
- Zero setup per project

**Customizable when needed:**

- Place `./bmad` in any project for custom agents
- Project customizations override global defaults
- Keep global access for other projects

## 💡 How It Works

### Priority-Based Resource Discovery

The MCP Server intelligently finds BMAD resources:

| Priority | Location         | Use Case                          |
| -------- | ---------------- | --------------------------------- |
| 1        | `./bmad`         | Project-specific customizations   |
| 2        | CLI argument     | Development/testing               |
| 3        | `BMAD_ROOT` env  | Point to specific location        |
| 4        | `~/.bmad`        | Your personal defaults            |
| 5        | Package defaults | Built-in files (always available) |

**Project overrides work seamlessly:**

- Most projects: Use global BMAD (no local files needed)
- Special projects: Add `./bmad` folder with customizations
- MCP Server uses project version when present, global otherwise

📖 **Advanced configuration:** See [Installation Guide](./docs/installation.md)

## 🌟 Real-World Scenarios

### Building a New Feature

Work through the full development lifecycle with specialist agents:

```bash
# Requirements & Analysis
bmad analyst
# → Mary helps gather and structure requirements

# Architecture & Design
bmad architect
# → Winston designs the technical approach

# User Experience
bmad ux-expert
# → Sally crafts the interface and flow

# Implementation
bmad dev
# → Amelia builds following best practices

# Quality Assurance
bmad tea
# → Murat creates comprehensive tests
```

**One server, complete methodology, every project.**

### Stuck on a Complex Problem?

```bash
bmad *party-mode
```

Brings all agents together for collaborative problem-solving. Each specialist contributes their unique perspective. Get solutions you wouldn't have thought of alone.

### Everyday Development

```bash
# Quick requirements check
bmad analyst "Review this user story"

# Architecture review
bmad architect "Is this design pattern appropriate?"

# Code review
bmad dev "Improve this implementation"

# Test strategy
bmad tea "What test cases am I missing?"
```

Every command works in every project. No setup, no configuration, just results.

## � Key Features

- **🎭 Role-Based Expertise** - Agents maintain consistent personality and domain knowledge
- **🔄 Workflow Automation** - Multi-step processes become single commands
- **📚 Battle-Tested Methodology** - Software best practices built into every interaction
- **🎨 Fully Customizable** - Override globally or per-project as needed
- **🔒 Privacy-First** - Runs locally, your code stays on your machine
- **⚡ Zero Overhead** - No API keys, no accounts, install and use immediately
- **🌐 Universal Access** - One configuration, unlimited projects

## 📚 Documentation

- **[Installation Guide](./docs/installation.md)** - Complete setup instructions for all platforms
- **[Development Guide](./docs/development.md)** - Contributing and local development
- **[Troubleshooting](./docs/troubleshooting.md)** - Solutions to common issues
- **[Release Process](./docs/release-process.md)** - Versioning and publishing guide

## 🛠️ Complete Agent Roster

| Agent | Name             | Role                              | Load with                    |
| ----- | ---------------- | --------------------------------- | ---------------------------- |
| 🧙    | BMad Master      | Orchestrator & Methodology Expert | `bmad` or `bmad bmad-master` |
| 📊    | Mary             | Strategic Business Analyst        | `bmad analyst`               |
| 🏗️    | Winston          | System Architect                  | `bmad architect`             |
| 💻    | Amelia           | Senior Implementation Engineer    | `bmad dev`                   |
| 🎨    | Sally            | UX/UI Specialist                  | `bmad ux-expert`             |
| 🧪    | Murat            | Master Test Architect             | `bmad tea`                   |
| 📋    | John             | Product Manager                   | `bmad pm`                    |
| 🔄    | Bob              | Scrum Master                      | `bmad sm`                    |
| 🎮    | Cloud Dragonborn | Game Systems Architect            | `bmad game-architect`        |
| 🎲    | Samus Shepard    | Lead Game Designer                | `bmad game-designer`         |
| 🕹️    | Link Freeman     | Senior Game Developer             | `bmad game-dev`              |

**Every agent, every project, instantly available.**

## 🔧 Commands Reference

| Command            | Purpose                   | Example            |
| ------------------ | ------------------------- | ------------------ |
| `bmad`             | Load default orchestrator | `bmad`             |
| `bmad <agent>`     | Load specialist agent     | `bmad analyst`     |
| `bmad *<workflow>` | Execute workflow          | `bmad *party-mode` |

## 🚦 Contributing

Want to improve BMAD for everyone?

```bash
git clone https://github.com/mkellerman/bmad-mcp-server.git
cd bmad-mcp-server
npm install
npm test          # Run comprehensive test suite
npm run dev       # Start in development mode
```

📖 **Complete contributor guide:** [Development Documentation](./docs/development.md)

- Architecture overview and design principles
- Coding standards and best practices
- Testing guidelines (unit, integration, E2E)
- Pull request requirements

## 📖 Documentation

- **[Installation Guide](./docs/installation.md)** - Setup for VS Code, Claude Desktop, Cursor
- **[Architecture Guide](./docs/architecture.md)** - How the MCP server works internally
- **[Development Guide](./docs/development.md)** - Contributing and extending BMAD
- **[Troubleshooting](./docs/troubleshooting.md)** - Common issues and solutions
- **[Release Process](./docs/release-process.md)** - For maintainers

## 🎓 Understanding MCP & BMAD

**What is the Model Context Protocol (MCP)?**

MCP is an open standard that lets AI assistants connect to external tools and data sources. Think of it as a universal adapter: your AI assistant speaks MCP, the BMAD server speaks MCP, and they work together seamlessly.

**What makes BMAD MCP Server different from other tools?**

- **Methodology-driven**: Not just tools, but a complete development approach
- **Role consistency**: Agents maintain expertise and personality across sessions
- **Proven workflows**: Battle-tested processes become single commands
- **Universal access**: Works everywhere you work, not project-by-project
- **Framework agnostic**: Works with any AI client that supports MCP

**BMAD scales with you**: Whether you're working on 1 project or 100, the MCP server provides consistent access to the complete BMAD methodology.

## 📦 Project Structure

```
bmad-mcp-server/
├── src/
│   ├── server.ts              # MCP server implementation
│   ├── tools/unified-tool.ts  # Command routing and execution
│   └── bmad/                  # Methodology files
│       ├── _cfg/              # Agent/workflow manifests
│       ├── core/              # Core agents & workflows
│       └── bmm/               # Extended methodology module
├── docs/                      # Documentation
└── tests/                     # Comprehensive test suite
```

## 📄 License

ISC

## 🌟 Star Us!

If BMAD is helping you build better software, give us a star! It helps others discover the project.

---

**Ready to transform your AI assistant?** [Get started now →](./docs/installation.md)
