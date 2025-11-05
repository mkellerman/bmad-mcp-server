# Development Guide

Complete guide for contributing to the BMAD MCP Server.

> **New to the project?** Start here to understand how to contribute, test, and submit changes.

## Quick Start

```bash
# Clone and setup
git clone https://github.com/mkellerman/bmad-mcp-server.git
cd bmad-mcp-server
npm install

# Verify everything works
npm test          # Run full test suite
npm run build     # Build for production
```

## Essential Commands

```bash
npm install              # Install dependencies
npm run dev              # Run in development mode (tsx with watch)
npm run build            # Compile TypeScript to build/
npm test                 # Run all tests
npm run test:coverage    # Generate coverage report
npm run lint:fix         # Auto-fix linting issues
npm run format           # Format code with Prettier
npm run precommit        # Run all checks (runs before commit)
```

## Testing Strategy

The project has comprehensive test coverage across multiple levels. See `tests/README.md` for detailed testing documentation.

### Unit Tests

Fast, focused tests for individual modules:

```bash
# Run all unit tests (generates JSON + HTML reports)
npm test

# Run specific test file
npm test -- tests/unit/manifest-loader.test.ts

# Watch mode during development
npm run test:watch

# With coverage report
npm run test:coverage
```

**Where to add unit tests:**

- New utilities in `src/utils/`
- Path resolution logic
- Tool routing and parsing
- Manifest loading and querying

### Integration Tests

Test how components work together:

```bash
npm test -- tests/integration/
```

### E2E Tests (LLM-Powered)

End-to-end tests using Playwright and LiteLLM to simulate real AI interactions:

```bash
# Start LiteLLM Docker container
npm run test:litellm-start

# Run E2E tests (automatically generates JSON + HTML reports)
npm run test:e2e

# Stop LiteLLM
npm run test:litellm-stop

# Health check
npm run test:litellm-health
```

**E2E test structure:**

- Specs: `tests/e2e/framework/*.spec.ts`
- Test cases: `tests/e2e/test-cases/*.yaml`

### Coverage Goals

- Maintain or increase coverage with each PR
- Focus on critical paths (manifest loading, file resolution, tool routing)
- Current coverage visible in `coverage/` after `npm run test:coverage`

## Code Quality Standards

### Pre-commit Checks

Husky automatically runs checks before each commit:

```bash
# Manual run (same checks as pre-commit)
npm run precommit
```

This runs:

- ESLint (code quality)
- Prettier (formatting)
- Type checking

### TypeScript & Module System

- **Language:** TypeScript with ESM modules
- **Imports:** Use explicit `.js` extension in relative imports (required for ESM)
- **Types:** Prefer `interface` over `type` aliases for object shapes

```typescript
// ✅ Correct
import { FileReader } from './utils/file-reader.js';

// ❌ Wrong
import { FileReader } from './utils/file-reader';
```

### Code Style

**Prettier configuration** (`.prettierrc`):

- 2-space indentation
- 80 character line width
- Single quotes
- Trailing commas

**ESLint rules** (typescript-eslint flat config):

- Semicolons required
- `no-console` warns (allowed in tests and scripts)
- TypeScript strict mode enabled

**Apply formatting:**

```bash
npm run format      # Prettier
npm run lint:fix    # ESLint auto-fix
```

### Naming Conventions

**Runtime (BMAD resources):**

- Agents and workflows: lowercase-hyphen (e.g., `analyst`, `party-mode`)
- Workflow invocation: `*` prefix (e.g., `bmad *party-mode`)

**Code (TypeScript/JavaScript):**

- Variables/functions: camelCase
- Classes/interfaces: PascalCase
- Files: kebab-case (e.g., `manifest-loader.ts`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `DEFAULT_PRIORITY`)

## Project Structure

```
bmad-mcp-server/
├── src/                     # TypeScript source code
│   ├── index.ts             # CLI entry point
│   ├── server.ts            # MCP server implementation
│   ├── types/               # TypeScript type definitions
│   ├── services/            # Singleton services (master manifest cache)
│   ├── tools/               # MCP tool implementations
│   │   ├── index.ts         # UnifiedBMADTool export
│   │   ├── common/          # Shared utilities
│   │   └── internal/        # Built-in commands (doctor, init, list)
│   ├── utils/               # Core utilities
│   │   ├── master-manifest.ts       # Manifest builder
│   │   ├── master-manifest-query.ts # Query functions
│   │   ├── v4-module-inventory.ts   # V4 scanner
│   │   ├── v6-module-inventory.ts   # V6 scanner
│   │   ├── file-reader.ts           # Priority-based file I/O
│   │   └── bmad-path-resolver.ts    # BMAD root discovery
│   ├── prompts/             # MCP prompt definitions
│   └── bmad/                # Embedded BMAD methodology files
│       ├── _cfg/            # Configuration and manifests
│       ├── core/            # Core agents and workflows
│       └── bmm/             # BMM module
├── tests/                   # Test suite
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # End-to-end tests
├── build/                   # Compiled JavaScript (generated)
├── docs/                    # Documentation
└── scripts/                 # Helper scripts
```

### Key Components

**Server Layer** (`src/server.ts`)

- MCP protocol implementation using `@modelcontextprotocol/sdk`
- Stdio transport for communication
- Registers prompt handlers and unified `bmad` tool

**Master Manifest System**

- `MasterManifestService` - Builds and caches inventory of all BMAD resources
- `v4-module-inventory` / `v6-module-inventory` - Scan BMAD installations
- `master-manifest-adapter` - Convert MasterRecords to legacy interfaces
- `master-manifest-query` - Priority-based resource lookup

**Unified Tool** (`src/tools/index.ts`)

- Command routing and parsing
- Handles: agents, workflows, built-in commands
- Supports module-qualified names (`module/name`)

**Resource Loading**

- `bmad-path-resolver` - Discovers BMAD roots (project → CLI → env → user → package)
- `file-reader` - Priority-based file loading with fallback
- All file access validated and secure

📖 **Detailed architecture:** See [Architecture Guide](./architecture.md)

## Contributing Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Your Changes

- Write clean, well-documented code
- Follow naming conventions and style guide
- Add or update tests as needed
- Keep commits focused and atomic

### 3. Test Thoroughly

```bash
# Run tests
npm test

# Check coverage
npm run test:coverage

# Run linting
npm run lint:fix

# Format code
npm run format
```

### 4. Commit with Conventional Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
# Features
git commit -m "feat: add support for custom agent templates"

# Bug fixes
git commit -m "fix: resolve path resolution on Windows"

# Documentation
git commit -m "docs: update installation guide"

# Maintenance
git commit -m "chore: update dependencies"

# Refactoring
git commit -m "refactor: simplify manifest loading logic"

# Tests
git commit -m "test: add coverage for file reader"
```

**Commit types:**

- `feat:` New feature (MINOR version)
- `fix:` Bug fix (PATCH version)
- `docs:` Documentation only
- `chore:` Maintenance, dependencies
- `refactor:` Code restructuring without behavior change
- `test:` Test additions or updates
- `BREAKING CHANGE:` in footer (MAJOR version)

### 5. Submit a Pull Request

**PR must include:**

1. ✅ **Clear description** - What and why
2. ✅ **Linked issues** - Reference related issues
3. ✅ **Test plan** - How you verified changes
4. ✅ **Updated tests** - Add/update unit/E2E tests
5. ✅ **Updated docs** - README, docs/, code comments
6. ✅ **Updated manifests** - If adding agents/workflows to `src/bmad/_cfg/*.csv`

**CI Requirements:**

- All tests passing (`npm test`)
- Linting clean (`npm run precommit`)
- No type errors
- For E2E changes: include Playwright report or logs

**Example PR description:**

```markdown
## Summary

Add support for loading agents from custom directories

## Changes

- Added `--custom-path` CLI argument
- Updated `bmad-path-resolver` to include custom paths
- Added priority level 2.5 for custom paths

## Testing

- Added unit tests for custom path resolution
- Verified with local test directory
- All existing tests still pass

## Documentation

- Updated installation.md with custom path examples
- Added architecture notes about priority ordering

Fixes #123
```

## Development Tips

### Local Testing

**Test the built version:**

```bash
npm run build
node build/index.js
```

**Development mode with auto-rebuild:**

```bash
npm run dev
```

**Point to specific BMAD location:**

```bash
BMAD_ROOT=/path/to/test/bmad npm run dev
```

### Debugging

**Enable verbose output:**

```typescript
// Add to any file
console.error('[DEBUG]', variableName);
```

**Inspect master manifest:**

```bash
npm run build
node -e "
  const { buildMasterManifests } = require('./build/utils/master-manifest.js');
  const manifest = buildMasterManifests([...]);
  console.log(JSON.stringify(manifest, null, 2));
"
```

**Test MCP communication:**

The server uses stdio for MCP protocol. Test manually:

```bash
echo '{"method":"initialize"}' | node build/index.js
```

### Common Development Tasks

**Add a new agent to embedded BMAD:**

1. Create agent file: `src/bmad/<module>/agents/new-agent.md`
2. Update manifest: `src/bmad/_cfg/agent-manifest.csv`
3. Rebuild: `npm run build`
4. Test: `bmad new-agent`

**Add a new workflow:**

1. Create workflow: `src/bmad/<module>/workflows/<name>/workflow.yaml`
2. Update manifest: `src/bmad/_cfg/workflow-manifest.csv`
3. Rebuild and test: `npm run build && bmad *workflow-name`

**Update utility function:**

1. Modify file in `src/utils/`
2. Add/update unit tests in `tests/unit/`
3. Run tests: `npm test`
4. Check coverage: `npm run test:coverage`

### Security Considerations

**File access safety:**

- All file reads go through `FileReader`
- Path validation prevents directory traversal
- Master manifest defines allowed resources
- Never expose raw filesystem operations to LLM

**Environment variables:**

- `BMAD_ROOT` for explicit path override
- Use absolute paths in production configs
- Validate all user-provided paths

### Performance Tips

- Master manifest built once at startup (cached in `MasterManifestService`)
- FileReader checks filesystem on-demand (cache if needed for performance)
- Large BMAD installations: ensure manifests are accurate to avoid filesystem scans

## Getting Help

- Check existing issues: [GitHub Issues](https://github.com/mkellerman/bmad-mcp-server/issues)
- Review `docs/architecture.md` for architectural overview
- See `tests/README.md` for testing details
- Ask in discussions: [GitHub Discussions](https://github.com/mkellerman/bmad-mcp-server/discussions)
