# BMAD MCP Server - Project Overview

**Repository:** https://github.com/mkellerman/bmad-mcp-server  
**Type:** Backend MCP Server (Monolith)

## Executive Summary

The BMAD MCP Server is a Model Context Protocol server that provides universal access to the BMAD (Business-Managed Agile Development) methodology through a tool-per-agent architecture with Git remote support. Instead of copying BMAD files to every project, this server enables one-time configuration with instant access across all workspaces.

**Key Innovation:** Transforms BMAD from a per-project installation model to a universal server model, eliminating file duplication and version drift across multiple projects.

## Project Classification

- **Repository Type:** Monolith (single cohesive codebase)
- **Project Type:** Backend + Library (MCP Server)
- **Primary Language:** TypeScript
- **Runtime:** Node.js (ES2022, ESNext modules)
- **Architecture Pattern:** Server/Service with modular resource loading

## Technology Stack

| Category      | Technology                | Version | Purpose                      |
| ------------- | ------------------------- | ------- | ---------------------------- |
| Language      | TypeScript                | 5.7.2   | Type-safe development        |
| Runtime       | Node.js                   | Latest  | Server execution             |
| Module System | ESNext                    | ES2022  | Modern JavaScript modules    |
| MCP SDK       | @modelcontextprotocol/sdk | ^1.0.4  | MCP protocol implementation  |
| Parsing       | csv-parse                 | ^6.1.0  | Manifest file parsing        |
| Configuration | js-yaml                   | ^4.1.0  | YAML processing              |
| Testing       | Vitest                    | ^4.0.3  | Unit/integration/e2e testing |
| Linting       | ESLint                    | ^9.17.0 | Code quality                 |
| Formatting    | Prettier                  | ^3.4.2  | Code formatting              |
| Git Hooks     | Husky                     | ^9.1.7  | Pre-commit automation        |

## Architecture Overview

### Core Components

1. **Entry Point** (`src/index.ts`)
   - CLI argument parsing for Git remotes
   - Server initialization and startup
   - Error handling and process management

2. **Server** (`src/server.ts`)
   - MCP protocol handlers (tools, resources)
   - Tool-per-agent architecture implementation
   - Dynamic tool generation from agent metadata
   - Resource caching and lazy initialization

3. **Resource Loader** (`src/resource-loader.ts`)
   - Multi-source file resolution (project → user → git remotes)
   - Agent and workflow discovery
   - Metadata extraction from agent files
   - Smart path detection (flat vs modular structures)

4. **Git Source Resolver** (`src/utils/git-source-resolver.ts`)
   - Git remote URL parsing and validation
   - Smart caching with TTL and auto-update
   - Cache invalidation on ref/subpath changes
   - Atomic clone and update operations

5. **Type System** (`src/types/index.ts`)
   - Comprehensive TypeScript interfaces
   - Agent, Workflow, and Task metadata types
   - MCP tool result structures
   - Git URL specifications

## Key Features

### Universal Access Model

- **One Configuration:** Single MCP server serves all projects
- **Zero Clutter:** No BMAD files in individual repositories
- **Always Updated:** Single update point for all projects
- **Smart Overrides:** Per-project customization when needed

### Git Remote Support

- **npm-style URLs:** `git+https://github.com/org/repo.git#branch:/subpath`
- **Smart Caching:** Local cache with metadata tracking
- **Auto-update:** Optional automatic pulls on startup
- **Cache Validation:** Detects URL/ref changes and invalidates appropriately

### Tool-per-Agent Architecture

- **Dynamic Tools:** Each BMAD agent becomes an MCP tool
- **Rich Metadata:** Extracted from agent files (persona, capabilities, workflows)
- **Module Organization:** Supports both flat and modular BMAD structures
- **Workflow Execution:** Dedicated workflow tool with context injection

### Resource System

- **MCP Resources:** Exposes all BMAD files as `bmad://` URIs
- **File Discovery:** Lists all available resources with metadata
- **Search Capability:** Fuzzy search across agents and workflows
- **Module Listing:** Query loaded modules and their contents

## Project Structure

```
bmad-mcp-server/
├── src/                       # Source code (TypeScript)
│   ├── index.ts              # Entry point + CLI
│   ├── server.ts             # MCP server implementation
│   ├── resource-loader.ts    # Multi-source file loading
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts          # Core interfaces and types
│   └── utils/                # Utility modules
│       ├── git-source-resolver.ts  # Git remote handling
│       └── logger.ts         # Logging abstraction
├── build/                    # Compiled JavaScript output
├── tests/                    # Test suites
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   ├── e2e/                  # End-to-end tests
│   ├── fixtures/             # Test fixtures
│   └── docs/                 # Testing documentation
├── scripts/                  # Utility scripts
├── docs/                     # Generated documentation
├── package.json              # Project configuration
├── tsconfig.json             # TypeScript configuration
├── vitest.config.ts          # Test configuration
└── README.md                 # Project readme

```

## Development Workflow

### Prerequisites

- Node.js (version specified in `.nvmrc`)
- npm or compatible package manager
- Git (for remote source support)

### Setup

```bash
npm install
npm run build
```

### Available Commands

```bash
npm run dev          # Run in development mode (tsx)
npm run build        # Compile TypeScript → JavaScript
npm run test         # Run all tests
npm run test:unit    # Run unit tests only
npm run test:integration  # Run integration tests
npm run test:e2e     # Run end-to-end tests
npm run test:coverage     # Generate coverage report
npm run lint         # Check code quality
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier
```

## Testing Strategy

- **Unit Tests:** Individual function and class testing
- **Integration Tests:** Component interaction testing
- **E2E Tests:** Full workflow execution with LiteLLM
- **Coverage Target:** Comprehensive with V8 coverage reporting
- **Test Framework:** Vitest with UI and watch modes

## Quality Gates

1. **Type Safety:** Strict TypeScript compilation
2. **Linting:** ESLint with TypeScript rules
3. **Formatting:** Prettier for consistent style
4. **Pre-commit:** Husky hooks run lint + format
5. **Testing:** Comprehensive test suite
6. **Coverage:** V8 coverage tracking

## Deployment

### As CLI Tool

```bash
npm install -g bmad-mcp-server
bmad-mcp-server git+https://github.com/org/repo.git#branch
```

### As MCP Server

Configure in MCP client settings (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "bmad": {
      "command": "node",
      "args": ["/path/to/bmad-mcp-server/build/index.js"]
    }
  }
}
```

## Links to Detailed Documentation

- [Architecture Documentation](./architecture.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [API Contracts](./api-contracts.md)
- [Development Guide](./development-guide.md)
- [Testing Strategy](../tests/docs/README.md)
- [Code Quality Report](./code-quality-report.md)

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) (if exists) or refer to the repository's issue tracker and pull request guidelines.

## License

ISC License - See [LICENSE](../LICENSE) for details.

---

**Documentation Version:** 1.0.0
