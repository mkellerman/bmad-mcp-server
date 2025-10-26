# 🚀 BMAD MCP Server

> **💡 Built on the BMAD Method**  
> This MCP server brings the power of the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) to any AI assistant. All methodology, workflows, and best practices are credited to the original BMAD Method project. This server simply makes it accessible through the Model Context Protocol.

**Use BMAD in any project, instantly**

Load the complete BMAD methodology into your AI assistant with zero setup. No copying files, no project-specific installations - just configure once and access 11 specialist agents and 36+ workflows across all your projects.

## Why Use the MCP Server?

**Without the MCP Server:**

- ❌ Copy BMAD files to every project
- ❌ Keep methodology in sync across projects
- ❌ Manually load agents and workflows
- ❌ Reconfigure for each new workspace

**With the MCP Server:**

- ✅ **Configure once, use everywhere** - One setup for all your projects
- ✅ **Always up to date** - Update once, not per-project
- ✅ **Instant access** - Load agents and workflows with simple commands
- ✅ **Works anywhere** - VS Code, Claude Desktop, Cursor, any MCP-compatible client
- ✅ **Zero maintenance** - No files to manage in your projects

## ⚡ Quick Start

**Get started in 3 steps:**

1. **Add to your AI client** (VS Code, Claude Desktop, or Cursor)

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

2. **Restart your AI client**

3. **Say hello to your new team!**
   ```
   bmad *list-agents
   ```

📖 **Detailed setup:** [Installation Guide](./docs/installation.md)

## 📂 How BMAD Files Are Located

The server searches for BMAD files in this order (first match wins):

| Priority | Location         | Description           | Use Case                        |
| -------- | ---------------- | --------------------- | ------------------------------- |
| 1        | `./bmad`         | Local project folder  | Project-specific customizations |
| 2        | CLI argument     | Path passed to server | Development/testing             |
| 3        | `BMAD_ROOT` env  | Environment variable  | Point to specific project       |
| 4        | `~/.bmad`        | User home directory   | Shared across all projects      |
| 5        | Package defaults | Built-in files        | No setup needed                 |

💡 **Tip:** Run `bmad *discover` to see which location is active.

📖 **Configuration examples:** See [Installation Guide](./docs/installation.md) for detailed setup scenarios.

## 🎯 What Can BMAD Do?

### Meet Your Team

Load any specialist with a simple command:

```bash
bmad analyst      # Mary - Strategic Business Analyst
bmad architect    # Winston - Solution Architect
bmad dev          # Amelia - Senior Implementation Engineer
bmad ux-expert    # Sally - UX/UI Specialist
bmad tea          # Murat - Master Test Architect
bmad pm           # John - Product Manager
bmad sm           # Bob - Scrum Master
```

Each agent brings:

- **Unique expertise** and decision-making approach
- **Distinct personality** and communication style
- **Specialized workflows** tailored to their role
- **Consistent methodology** across all interactions

### Run Powerful Workflows

Execute complex, multi-step processes with a single command:

```bash
bmad *party-mode       # Multi-agent brainstorming session
bmad *workflow-status  # Check project status and get recommendations
bmad *atdd            # Generate acceptance tests before coding
bmad *ux-spec         # Create comprehensive UX specifications
```

See all workflows:

```bash
bmad *list-workflows   # Browse 36+ available workflows
```

## 🌟 Real-World Examples

**Scenario: Starting a new feature**

```bash
# Get requirements analysis
# Mary helps gather and structure requirements
bmad analyst

# Design the architecture
# Winston designs the technical approach
bmad architect

# Create UX specifications
# Sally crafts the user experience
bmad ux-expert

# Implement with best practices
# Amelia builds it following the design
bmad dev

# Ensure quality
# Murat creates comprehensive tests
bmad tea
```

**Scenario: Stuck on a complex problem**

```bash
bmad *party-mode
# Brings all agents together for a collaborative discussion
# Each contributes their unique perspective
# Get solutions you wouldn't have thought of alone
```

## 💡 Key Features

- **🎭 Role-Based Agents** - Each agent stays in character with consistent expertise
- **🔄 Automated Workflows** - Complex multi-step processes simplified
- **📚 Built-in Best Practices** - Software methodology baked into every interaction
- **🎨 Customizable** - Extend with your own agents and workflows
- **🔒 Local-First** - Your code and data stay on your machine
- **⚡ Instant Access** - No API keys, no accounts, just install and use

## 📚 Documentation

- **[Installation Guide](./docs/installation.md)** - Complete setup instructions for all platforms
- **[Development Guide](./docs/development.md)** - Contributing and local development
- **[Troubleshooting](./docs/troubleshooting.md)** - Solutions to common issues
- **[Release Process](./docs/release-process.md)** - Versioning and publishing guide

## 🛠️ All Available Agents

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

## 🔧 Commands Reference

| Command                | Purpose                      | Example            |
| ---------------------- | ---------------------------- | ------------------ |
| `bmad`                 | Load default orchestrator    | `bmad`             |
| `bmad <agent>`         | Load specialist agent        | `bmad analyst`     |
| `bmad *<workflow>`     | Execute workflow             | `bmad *party-mode` |
| `bmad *list-agents`    | Show all available agents    | -                  |
| `bmad *list-workflows` | Show all available workflows | -                  |
| `bmad *list-tasks`     | Show all available tasks     | -                  |
| `bmad *help`           | Show command reference       | -                  |

## 🚦 For Contributors

Want to help make BMAD even better?

```bash
git clone https://github.com/mkellerman/bmad-mcp-server.git
cd bmad-mcp-server
npm install
npm test          # Run 131 tests
npm run dev       # Start in development mode
```

See our **[Development Guide](./docs/development.md)** for:

- Architecture overview
- Coding standards
- Testing guidelines
- PR requirements

## 🎓 Learn More

**What is the Model Context Protocol (MCP)?**
MCP is a standard protocol that lets AI assistants connect to external tools and data sources. BMAD uses MCP to bring a complete software development methodology directly into your AI conversations.

**What makes BMAD different?**

- **Role consistency**: Agents maintain their expertise and personality
- **Workflow automation**: Complex processes become single commands
- **Methodology-driven**: Best practices built into every interaction
- **Framework agnostic**: Works with any AI client that supports MCP

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
