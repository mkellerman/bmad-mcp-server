# 🚀 BMAD MCP Server

[![npm version](https://badge.fury.io/js/bmad-mcp-server.svg)](https://www.npmjs.com/package/bmad-mcp-server)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

> **Your AI assistant just got a complete development team.**
>
> The BMAD MCP Server gives you instant access to specialist AI agents and battle-tested workflows across every project. Mary the Business Analyst shapes requirements. Winston the Architect designs systems. Amelia the Developer implements features. Murat the Test Architect ensures quality—and many more.
>
> **Configure once. Use everywhere. Never copy files again.**
>
> Install the MCP Server in VS Code, Claude Desktop, or Cursor. Every workspace you open instantly has the complete BMAD methodology—no setup, no file copying, no version drift. Update once, every project benefits. It's BMAD, but effortless.

Built on the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) and the Model Context Protocol (MCP) standard.

---

## ⚡ Quick Start

Get BMAD working across all your projects in under 2 minutes.

**Step 1: Install BMAD methodology files**

Install BMAD to `~/.bmad` to make it available across all projects:

```bash
# Install v6 Alpha (recommended)
npx bmad-method@alpha install

# Or install stable v4
npx bmad-method install
```

**Step 2: Add MCP Server to your AI client configuration**

For VS Code, Claude Desktop, or Cursor, add this to your MCP settings:

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"]
    }
  }
}
```

**Step 3: Restart your AI client**

**Step 4: Start using BMAD**

Open any project and try:

```
bmad analyst
```

That's it! Mary the Business Analyst is ready to help. Works in this project, every project, instantly.

📖 **Detailed setup guides:** [Installation Documentation](./docs/installation.md)

---

## ✨ Key Features

- **🎭 Complete Development Team** - Business Analyst, Architect, Developers, Test Engineer, UX Expert, Product Manager, and more
- **🔄 Battle-Tested Workflows** - Multi-step processes automated into single commands (party-mode brainstorming, ATDD test generation, UX specifications)
- **🔗 Multi-Source Agent Loading** - Combine agents from multiple projects, local folders, and GitHub repositories. Pull custom agents directly with Git URLs
- **🌐 Universal Access** - One configuration serves unlimited projects across all your workspaces
- **📦 Zero Project Clutter** - No BMAD files in your repositories unless you want custom overrides
- **🔄 Effortless Updates** - Update the server once, every project benefits instantly
- **🎨 Flexible Customization** - Global by default, project-specific when needed
- **🔒 Privacy-First** - Runs locally, your code stays on your machine
- **⚡ No Overhead** - No API keys, no accounts, just install and use

---

### Advanced: Load Agents from Multiple Sources

Combine BMAD resources from different locations:

```json
{
  "mcpServers": {
    "bmad": {
      "command": "npx",
      "args": [
        "-y",
        "bmad-mcp-server",
        "git+https://github.com/your-org/custom-agents.git#main",
        "/path/to/local/bmad/folder"
      ]
    }
  }
}
```

The server automatically merges agents from all sources, with later sources taking priority for duplicates.

**Supported Git URL formats:**
- `git+https://github.com/org/repo.git#branch` - Load from specific branch
- `git+https://github.com/org/repo.git#v2.0.0` - Pin to tagged version
- `git+https://github.com/org/repo.git#main:/bmad/custom` - Load from subdirectory

Changes are pulled automatically on server restart. Perfect for team-shared agents and community extensions.

---

## Why Choose the MCP Server Over Traditional BMAD?

### The Traditional Way (Single Project Installation)

You install BMAD files directly in your project:

- ❌ **Copy files to every project** - Manual setup for each workspace
- ❌ **Keep multiple copies in sync** - When BMAD updates, update everywhere
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

---

## 🎯 What You Get

### Specialist AI Agents, Always Available

Every agent brings unique expertise, personality, and specialized workflows:

```bash
bmad analyst      # Mary - Strategic Business Analyst
bmad architect    # Winston - Solution Architect
bmad dev          # Amelia - Senior Implementation Engineer
bmad ux-expert    # Sally - UX/UI Specialist
bmad tea          # Murat - Master Test Architect
bmad pm           # John - Product Manager
bmad sm           # Bob - Scrum Master
# ... and more specialist agents
```

### Automated Workflows

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

---

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

---

## 💡 How It Works

### Priority-Based Resource Discovery

The MCP Server intelligently finds BMAD resources in this order:

| Priority | Location         | Use Case                          |
| -------- | ---------------- | --------------------------------- |
| 1        | `./bmad`         | Project-specific customizations   |
| 2        | CLI argument     | Development/testing               |
| 3        | `BMAD_ROOT` env  | Point to specific location        |
| 4        | `~/.bmad`        | Your personal defaults            |
| 5        | Package defaults | Built-in files (always available) |

**How it works:**
- Most projects use global BMAD (no local files needed)
- Add `./bmad` folder for project-specific customizations
- MCP Server automatically uses project version when present, global otherwise
- Mix multiple sources using CLI arguments or Git URLs (see Advanced section above)

---

## 🛠️ Available Agents & Commands

### Specialist Agents

| Agent | Name             | Role                              | Command                      |
| ----- | ---------------- | --------------------------------- | ---------------------------- |
| 🧙    | BMad Master      | Orchestrator & Methodology Expert | `bmad` or `bmad bmad-master` |
| 📊    | Mary             | Strategic Business Analyst        | `bmad analyst`               |
| 🏗️    | Winston          | System Architect                  | `bmad architect`             |
| 💻    | Amelia           | Senior Implementation Engineer    | `bmad dev`                   |
| 🎨    | Sally            | UX/UI Specialist                  | `bmad ux-expert`             |
| 🧪    | Murat            | Master Test Architect             | `bmad tea`                   |
| 📋    | John             | Product Manager                   | `bmad pm`                    |
| 📝    | Sarah            | Product Owner                     | `bmad po`                    |
| 🔄    | Bob              | Scrum Master                      | `bmad sm`                    |
| 🎮    | Cloud Dragonborn | Game Systems Architect            | `bmad game-architect`        |
| 🎲    | Samus Shepard    | Lead Game Designer                | `bmad game-designer`         |
| 🕹️    | Link Freeman     | Senior Game Developer             | `bmad game-dev`              |

### Command Reference

| Command            | Purpose                   | Example            |
| ------------------ | ------------------------- | ------------------ |
| `bmad`             | Load default orchestrator | `bmad`             |
| `bmad <agent>`     | Load specialist agent     | `bmad analyst`     |
| `bmad *<workflow>` | Execute workflow          | `bmad *party-mode` |

---

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

---

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

---

## 📚 Documentation

- **[Installation Guide](./docs/installation.md)** - Complete setup for VS Code, Claude Desktop, Cursor
- **[Architecture Guide](./docs/architecture.md)** - How the MCP server works internally
- **[Development Guide](./docs/development.md)** - Contributing and extending BMAD
- **[Troubleshooting](./docs/troubleshooting.md)** - Common issues and solutions
- **[Release Process](./docs/release-process.md)** - For maintainers

---

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
