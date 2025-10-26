# Development Guide

Complete guide for contributing to and developing the BMAD MCP Server.

## Development Setup

```bash
git clone https://github.com/mkellerman/bmad-mcp-server.git
cd bmad-mcp-server
npm install
```

## Available Commands

```bash
npm install              # Install dependencies
npm run dev              # Run in development mode (tsx)
npm run build            # Build for production
npm test                 # Run tests (131 passing)
npm run test:coverage    # With coverage report
npm run lint:fix         # Auto-fix linting issues
npm run format           # Format code with Prettier
npm run precommit        # Run linting and formatting checks
```

## Testing

See `tests/README.md` for comprehensive testing documentation including:

- Unit tests
- Integration tests
- LLM-powered E2E tests with Playwright

### Running Tests

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/manifest-loader.test.ts

# Run E2E tests (requires LiteLLM)
npm run e2e:start    # Start LiteLLM Docker container
npm run test:e2e     # Run E2E tests
npm run test:report  # View Playwright report
npm run e2e:stop     # Stop LiteLLM container
```

## Pre-commit Hooks

Husky runs linting and formatting automatically before each commit. Run manually with:

```bash
npm run precommit
```

## Coding Standards

### Language & Module System

- **TypeScript** with ESM modules
- Use explicit `.js` in relative imports (required for ESM)
- Prefer `interface` over `type` aliases

### Code Style

**Prettier** (`.prettierrc`):

- 2-space indentation
- 80 character line width
- Single quotes
- Trailing commas

**ESLint** (typescript-eslint flat config):

- Semicolons required
- `no-console` warns (allowed in tests/scripts)

Run formatters:

```bash
npm run format      # Prettier
npm run lint:fix    # ESLint auto-fix
```

### Naming Conventions

**Runtime naming:**

- Agents and workflows use lowercase-hyphen format (e.g., `analyst`, `party-mode`)
- Workflows are invoked with `*` prefix (e.g., `bmad *party-mode`)

**Code naming:**

- TypeScript follows standard conventions (camelCase, PascalCase)
- Files use kebab-case (e.g., `manifest-loader.ts`)

## Project Architecture

### Directory Structure

```
src/
├── index.ts              # Entry point
├── server.ts             # MCP server implementation
├── types/
│   └── index.ts          # TypeScript type definitions
├── tools/
│   ├── index.ts          # Tools module exports
│   └── unified-tool.ts   # Unified BMAD tool implementation
├── utils/
│   ├── manifest-loader.ts # CSV manifest parser
│   ├── file-reader.ts     # Secure file reader
│   ├── file-scanner.ts    # Directory scanner
│   └── bmad-path-resolver.ts # BMAD root discovery
├── prompts/
│   └── index.ts          # Prompt definitions
└── bmad/                 # BMAD methodology files
    ├── _cfg/             # Configuration and manifests
    ├── core/             # Core BMAD agents and workflows
    ├── bmm/              # BMM module agents and workflows
    └── docs/             # BMAD documentation
```

### Key Components

**MCP Server** (`src/server.ts`)

- Uses `@modelcontextprotocol/sdk` with stdio transport
- Registers prompt handlers and the unified `bmad` tool

**Unified Tool** (`src/tools/unified-tool.ts`)

- Routes commands:
  - Empty string → default agent (bmad-master)
  - `<agent-name>` → load specific agent
  - `*<workflow-name>` → execute workflow
- Includes discovery commands (`*list-agents`, `*list-workflows`, etc.)

**BMAD Discovery** (`src/utils/bmad-path-resolver.ts`)

- Resolves active BMAD root from:
  1. Current working directory (`./bmad`)
  2. CLI argument
  3. `BMAD_ROOT` environment variable
  4. User defaults (`~/.bmad`)
  5. Package defaults

**Manifest Loading** (`src/utils/manifest-loader.ts`)

- Reads CSV manifests for agents, workflows, and tasks
- Returns agent content and workflow YAML without mutating files

**Safe I/O** (`src/utils/file-reader.ts`)

- Validates paths and prevents directory traversal
- Server acts as file proxy; LLM processes content

## Testing Guidelines

### Unit Tests

- Located in `tests/unit/*.test.ts`
- Keep or increase coverage
- Add tests for new utils, path resolution, and tool routing

Example:

```bash
npm test -- tests/unit/manifest-loader.test.ts
```

### E2E Tests

- Specs in `tests/e2e/framework/*.spec.ts`
- YAML test cases in `tests/e2e/test-cases/`
- Requires LiteLLM (Docker)

Verify LiteLLM health:

```bash
npm run litellm:docker:health
```

## Commit Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `chore:` - Maintenance tasks
- `refactor:` - Code restructuring
- `test:` - Test updates
- `docs:` - Documentation changes

Examples:

```bash
git commit -m "feat: add new workflow discovery command"
git commit -m "fix: resolve path traversal security issue"
git commit -m "test: add coverage for manifest loader"
```

## Pull Request Guidelines

PRs must include:

1. **Clear description** of changes
2. **Linked issues** (if applicable)
3. **Test plan** demonstrating verification
4. **Updated tests** (unit/E2E as needed)
5. **Updated documentation** (README, docs/, manifests)
6. **Updated manifests** (`src/bmad/_cfg/*.csv`) if adding agents/workflows

### CI Requirements

- `npm run precommit` passes (lint + format)
- All tests pass
- For E2E changes, attach Playwright report or logs

## Security Considerations

- All file access goes through `utils/file-reader.ts` to prevent path traversal
- Never expose raw file system operations to the LLM
- Validate all user inputs
- Use `BMAD_ROOT` explicitly during development for predictable behavior

## Development Tips

### Using BMAD_ROOT

Prefer explicit `BMAD_ROOT` during development:

```bash
BMAD_ROOT=/path/to/project npm run dev
```

### Debugging

Enable verbose logging by modifying `src/server.ts` or add debug statements:

```typescript
console.error('[DEBUG]', yourVariable);
```

### Building

Always build before testing published behavior:

```bash
npm run build
node build/index.js
```

## Getting Help

- Check existing issues: [GitHub Issues](https://github.com/mkellerman/bmad-mcp-server/issues)
- Review `AGENTS.md` for architecture overview
- See `tests/README.md` for testing details
- Ask in discussions: [GitHub Discussions](https://github.com/mkellerman/bmad-mcp-server/discussions)
