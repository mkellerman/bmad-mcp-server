# Development Guide - BMAD MCP Server

**Version:** 4.0.0  
**Last Updated:** November 6, 2025

---

## Overview

Complete development workflow for the BMAD MCP Server - from setup through testing, building, and contributing.

**Tech Stack:**

- **Language:** TypeScript 5.7.2 (strict mode, ES2022)
- **Runtime:** Node.js 18+
- **Protocol:** MCP SDK 1.0.4
- **Testing:** Vitest 4.0.3
- **Linting:** ESLint 9.17.0 + Prettier 3.4.2

---

## Quick Start

### Prerequisites

**Required:**

- Node.js 18+ (`node --version`)
- npm 8+ (`npm --version`)
- Git

**Recommended:**

- VS Code with TypeScript extension
- GitHub Copilot (optional)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/mkellerman/bmad-mcp-server.git
cd bmad-mcp-server

# Install dependencies
npm install

# Build project
npm run build

# Verify installation
npm run cli:list-tools
```

### First Development Run

```bash
# Start in development mode
npm run dev

# In another terminal, test functionality
npm run cli:list-agents
```

---

## Project Structure

```
bmad-mcp-server/
├── src/                    # TypeScript source code
│   ├── index.ts            # MCP server entry point
│   ├── cli.ts              # CLI entry point
│   ├── server.ts           # MCP server implementation
│   ├── config.ts           # Configuration
│   ├── core/               # Core business logic
│   │   ├── bmad-engine.ts  # Transport-agnostic engine
│   │   └── resource-loader.ts # Multi-source content loading
│   ├── tools/              # Tool implementations
│   │   ├── bmad-unified.ts # Unified bmad tool
│   │   └── operations/     # Operation handlers
│   ├── types/              # TypeScript types
│   └── utils/              # Utilities
├── build/                  # Compiled JavaScript (generated)
├── tests/                  # Test suites
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   ├── e2e/                # End-to-end tests
│   ├── framework/          # Test infrastructure
│   ├── fixtures/           # Test data
│   └── helpers/            # Test utilities
├── scripts/                # Development scripts
├── docs/                   # Documentation
├── coverage/               # Test coverage (generated)
└── test-results/           # Test results (generated)
```

---

## Development Workflow

### Daily Development Cycle

```bash
# 1. Start clean
npm run clean

# 2. Install/update dependencies
npm install

# 3. Run tests
npm run test

# 4. Start development with auto-restart
npm run dev

# 5. Make changes, verify with tests
npm run test:unit

# 6. Format and lint
npm run format
npm run lint:fix

# 7. Build for production
npm run build
```

### Code Changes Workflow

```bash
# Make changes to .ts files in src/

# Run unit tests
npm run test:unit

# Run all tests
npm run test

# Format code
npm run format

# Fix linting issues
npm run lint:fix

# Build
npm run build

# Run integration tests
npm run test:integration
```

---

## npm Scripts Reference

### Build & Run

| Script    | Command                   | Purpose                                |
| --------- | ------------------------- | -------------------------------------- |
| `build`   | `tsc && chmod +x...`      | Compile TypeScript to JavaScript       |
| `start`   | `node build/index.js`     | Run production server                  |
| `dev`     | `tsx src/index.ts`        | Development mode with auto-restart     |
| `prepare` | `npm run build \|\| true` | Pre-install hook (runs on npm install) |

### Testing

| Script             | Command                                  | Purpose                    |
| ------------------ | ---------------------------------------- | -------------------------- |
| `test`             | `vitest run`                             | Run all tests once         |
| `test:watch`       | `vitest`                                 | Run tests in watch mode    |
| `test:ui`          | `vitest --ui`                            | Open Vitest UI             |
| `test:coverage`    | `vitest run --coverage`                  | Run with coverage report   |
| `test:unit`        | `vitest run tests/unit`                  | Run only unit tests        |
| `test:integration` | `vitest run tests/integration`           | Run only integration tests |
| `test:e2e`         | `vitest run tests/e2e`                   | Run only e2e tests         |
| `test:llm`         | Same as `test:e2e`                       | Alias for e2e tests        |
| `test:all`         | Runs unit, integration, e2e sequentially | Run complete test suite    |

### Code Quality

| Script      | Command                       | Purpose                      |
| ----------- | ----------------------------- | ---------------------------- |
| `lint`      | `eslint . --ext .ts,.js,.mjs` | Check linting errors         |
| `lint:fix`  | `eslint ... --fix`            | Auto-fix linting errors      |
| `format`    | `prettier --write .`          | Format all files             |
| `precommit` | `lint:fix` + `format`         | Manual pre-commit validation |

### CLI Tools

| Script               | Command                     | Purpose                  |
| -------------------- | --------------------------- | ------------------------ |
| `cli`                | `node scripts/bmad-cli.mjs` | Run BMAD CLI             |
| `cli:list-tools`     | List all MCP tools          | Enumerate tools          |
| `cli:list-resources` | List all resources          | Show available resources |
| `cli:list-agents`    | List all agents             | Show agent directory     |
| `cli:list-workflows` | List all workflows          | Show workflow directory  |

### Cleanup

| Script       | Command                               | Purpose               |
| ------------ | ------------------------------------- | --------------------- |
| `clean`      | Remove build/ coverage/ test-results/ | Clean generated files |
| `clean:all`  | `clean` + remove node_modules/        | Nuclear cleanup       |
| `test:clean` | Remove test result files              | Clean test artifacts  |

---

## Testing

### Test Structure

```
tests/
├── unit/                   # Isolated function tests
│   ├── engine.test.ts      # BMADEngine tests
│   ├── loader.test.ts      # ResourceLoader tests
│   └── validators.test.ts  # Validation logic tests
├── integration/            # Component interaction tests
│   ├── server.test.ts      # Server + Engine integration
│   └── loader-git.test.ts  # Loader with Git sources
├── e2e/                    # Full workflow tests
│   ├── agent-execution.test.ts
│   └── workflow-flow.test.ts
├── framework/              # Test infrastructure
│   ├── reporters/          # Custom reporters
│   └── setup/              # Global setup/teardown
├── fixtures/               # Mock BMAD content
│   ├── mock-agents/
│   └── mock-workflows/
└── helpers/                # Test utilities
    └── test-fixtures.ts
```

### Running Tests

```bash
# All tests
npm run test

# Specific test types
npm run test:unit           # Fast, isolated tests
npm run test:integration    # Component interaction
npm run test:e2e            # Full workflows

# Watch mode (auto-rerun on changes)
npm run test:watch

# Coverage report
npm run test:coverage

# UI mode (interactive)
npm run test:ui
```

### Writing Tests

**Unit Test Example:**

```typescript
import { describe, it, expect } from 'vitest';
import { BMADEngine } from '@/core/bmad-engine';

describe('BMADEngine', () => {
  it('should list agents', async () => {
    const engine = new BMADEngine();
    await engine.initialize();

    const agents = await engine.listAgents();

    expect(agents).toBeInstanceOf(Array);
    expect(agents.length).toBeGreaterThan(0);
  });
});
```

**Integration Test Example:**

```typescript
import { describe, it, expect } from 'vitest';
import { BMADEngine } from '@/core/bmad-engine';

describe('Engine + Loader Integration', () => {
  it('should execute agent workflow', async () => {
    const engine = new BMADEngine();
    await engine.initialize();

    const result = await engine.executeAgent({
      agent: 'analyst',
      message: 'Test message',
    });

    expect(result.success).toBe(true);
    expect(result.text).toContain('analyst');
  });
});
```

### Test Configuration

**File:** `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/build/**'],
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
    },
  },
});
```

---

## Building

### TypeScript Compilation

```bash
# Standard build
npm run build

# Watch mode (auto-rebuild)
tsc --watch
```

### Build Output

```
build/
├── index.js              # MCP server entry (executable)
├── index.d.ts            # Type declarations
├── cli.js                # CLI entry (executable)
├── cli.d.ts
├── server.js
├── server.d.ts
├── core/
│   ├── bmad-engine.js
│   ├── bmad-engine.d.ts
│   └── ...
├── tools/
└── types/
```

### TypeScript Configuration

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "strict": true,
    "outDir": "./build",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build", "tests"]
}
```

---

## Code Quality

### Linting

```bash
# Check for linting errors
npm run lint

# Auto-fix errors
npm run lint:fix
```

**Configuration:** `eslint.config.mjs`

### Formatting

```bash
# Format all files
npm run format
```

**Configuration:** `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### Pre-commit Hooks

**Husky + lint-staged automatically:**

1. Validates source (no .js in src/)
2. Fixes linting errors
3. Formats code
4. Type-checks compilation

**Manual pre-commit check:**

```bash
npm run precommit
```

---

## Debugging

### VS Code Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug MCP Server",
      "program": "${workspaceFolder}/src/index.ts",
      "runtimeArgs": ["-r", "tsx"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "${file}"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Debug Logging

```typescript
// Enable debug logging
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.error('[DEBUG] Engine initialized');
}
```

---

## Contributing

### Branch Strategy

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes, commit
git add .
git commit -m "feat: add my feature"

# Push and create PR
git push origin feature/my-feature
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix bug
docs: update documentation
test: add tests
refactor: refactor code
chore: update dependencies
```

**Commitlint validates automatically on commit.**

### Pull Request Process

1. Create feature branch
2. Make changes with tests
3. Run `npm run test:all`
4. Run `npm run lint:fix`
5. Run `npm run format`
6. Push and create PR
7. Wait for CI checks
8. Request review

---

## Troubleshooting

### Build Errors

**Issue:** TypeScript compilation fails

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

**Issue:** Module not found

```bash
# Ensure dependencies are installed
npm install

# Check tsconfig.json paths
```

### Test Failures

**Issue:** Tests failing after changes

```bash
# Run specific test file
npm run test tests/unit/engine.test.ts

# Run with verbose output
npx vitest run --reporter=verbose
```

**Issue:** Test timeout

```bash
# Increase timeout in vitest.config.ts
testTimeout: 60000  # 60 seconds
```

### Git Remote Issues

**Issue:** Git clone fails

```bash
# Check Git URL format
git+https://github.com/org/repo.git

# For SSH (private repos)
git+ssh://git@github.com/org/repo.git

# Check Git credentials
git config --list
```

---

## Release Process

### Semantic Release

This project uses semantic-release for automated versioning.

**Configuration:** `.releaserc.json`

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/git"
  ]
}
```

**Versioning:**

- `feat:` commits → minor version bump (0.x.0)
- `fix:` commits → patch version bump (0.0.x)
- `BREAKING CHANGE:` → major version bump (x.0.0)

---

## Environment Variables

| Variable    | Purpose               | Default           |
| ----------- | --------------------- | ----------------- |
| `BMAD_ROOT` | Override project root | Current directory |
| `DEBUG`     | Enable debug logging  | `false`           |
| `NODE_ENV`  | Environment mode      | `development`     |

**Usage:**

```bash
# Override project root
BMAD_ROOT=/custom/path npm run dev

# Enable debug logging
DEBUG=true npm run dev
```

---

## Performance Profiling

### CPU Profiling

```bash
# Profile server startup
node --prof build/index.js

# Process profile
node --prof-process isolate-*.log > profile.txt
```

### Memory Profiling

```bash
# Heap snapshot
node --inspect build/index.js

# Then in Chrome: chrome://inspect
```

---

## Additional Resources

### Documentation

- [Architecture](./architecture.md) - System design
- [API Contracts](./api-contracts.md) - MCP tools and TypeScript APIs
- [README](../README.md) - Project overview

### External Links

- [MCP Specification](https://modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD)

### Getting Help

- **Issues:** https://github.com/mkellerman/bmad-mcp-server/issues
- **Discussions:** GitHub Discussions
- **BMAD Method:** https://github.com/bmad-code-org/BMAD-METHOD

### Test Structure

```
tests/
├── unit/                    # Unit tests (isolated)
├── integration/             # Component integration tests
├── e2e/                     # End-to-end workflow tests
├── framework/               # Test infrastructure
├── helpers/                 # Test utilities
├── fixtures/                # Test data
├── support/                 # Test support files
└── setup.ts                 # Global test configuration
```

### Writing Tests

**Unit Test Example:**

```typescript
import { describe, it, expect } from 'vitest';
import { GitSourceResolver } from '../../src/utils/git-source-resolver.js';

describe('GitSourceResolver', () => {
  it('should resolve git+https URLs', async () => {
    const resolver = new GitSourceResolver();
    const result = await resolver.resolve(
      'git+https://github.com/org/repo.git',
    );
    expect(result).toContain('cache');
  });
});
```

**Integration Test Example:**

```typescript
import { describe, it, expect } from 'vitest';
import { ResourceLoaderGit } from '../../src/resource-loader.js';

describe('ResourceLoaderGit Integration', () => {
  it('should load agents from git remotes', async () => {
    const loader = new ResourceLoaderGit();
    const agents = await loader.listAgents();
    expect(agents.length).toBeGreaterThan(0);
  });
});
```

### Coverage Requirements

- **Target:** 80%+ coverage across statements, branches, functions, lines
- **Reporting:** HTML reports in `coverage/lcov-report/`
- **CI/CD:** Coverage data uploaded to external services

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

---

## 🏗️ Build & Deployment

### Build Process

```bash
# Clean previous build
npm run clean

# Build TypeScript to JavaScript
npm run build

# Verify build output
ls -la build/
```

**Build Output:**

- `build/index.js` - CLI entry point (executable)
- `build/server.js` - Compiled MCP server
- `build/resource-loader.js` - Compiled resource loader
- `build/types/index.d.ts` - TypeScript declarations
- All other `.js` and `.d.ts` files

### Development vs Production

| Mode            | Command       | Features                       | Use Case           |
| --------------- | ------------- | ------------------------------ | ------------------ |
| **Development** | `npm run dev` | Auto-restart, source maps, tsx | Active development |
| **Production**  | `npm start`   | Optimized, compiled JS         | Deployment         |

### Publishing to NPM

```bash
# Ensure clean build
npm run clean && npm run build

# Run full test suite
npm run test:all

# Publish to NPM
npm publish

# Or use semantic-release (automated)
# Configured in .releaserc.json and package.json
```

---

## 🔧 Configuration

### TypeScript Configuration

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "outDir": "./build",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build", "tests"]
}
```

### Test Configuration

**File:** `vitest.config.ts`

- **Environment:** Node.js
- **Globals:** Enabled (no imports needed)
- **Timeouts:** Type-based (unit: 5s, integration: 10s, e2e: 30s)
- **Coverage:** V8 engine with HTML reports

### Linting Configuration

**File:** `eslint.config.mjs`

- **TypeScript-aware** linting
- **Auto-fixable** rules enabled
- **Prettier** integration
- **Import/export** validation

---

## 🚀 Available Commands

### Core Development

| Command         | Description                          | When to Use              |
| --------------- | ------------------------------------ | ------------------------ |
| `npm run dev`   | Development server with auto-restart | Active development       |
| `npm run build` | Compile TypeScript to JavaScript     | Before testing/deploying |
| `npm run clean` | Remove build artifacts and caches    | Starting fresh           |
| `npm run start` | Run production build                 | Testing deployment       |

### Code Quality

| Command                | Description                 | When to Use              |
| ---------------------- | --------------------------- | ------------------------ |
| `npm run lint`         | Check code style and errors | Before commit            |
| `npm run lint:fix`     | Auto-fix linting issues     | After seeing lint errors |
| `npm run format`       | Format code with Prettier   | Before commit            |
| `npm run guard:src-js` | Ensure no JS in src/        | Pre-commit hook          |

### Testing

| Command                    | Description             | When to Use         |
| -------------------------- | ----------------------- | ------------------- |
| `npm run test`             | Run all tests           | After changes       |
| `npm run test:unit`        | Run unit tests only     | During development  |
| `npm run test:integration` | Run integration tests   | Before merge        |
| `npm run test:e2e`         | Run end-to-end tests    | Before release      |
| `npm run test:coverage`    | Run tests with coverage | CI/CD, final checks |
| `npm run test:watch`       | Run tests in watch mode | Development         |
| `npm run test:ui`          | Run tests with UI       | Debugging tests     |

### BMAD Integration

| Command               | Description                  | When to Use              |
| --------------------- | ---------------------------- | ------------------------ |
| `npm run bmad`        | Execute BMAD commands        | Testing BMAD integration |
| `npm run cli`         | Interactive BMAD CLI         | Exploring BMAD features  |
| `npm run lite:list`   | List available MCP tools     | Verifying tool discovery |
| `npm run doctor:show` | Show BMAD system diagnostics | Troubleshooting          |

### Maintenance

| Command               | Description               | When to Use       |
| --------------------- | ------------------------- | ----------------- |
| `npm run test:report` | Generate HTML test report | After test runs   |
| `npm run precommit`   | Run all pre-commit checks | Manual pre-commit |
| `npm run prepare`     | Post-install hook         | After npm install |

---

## 🐛 Debugging

### Common Issues

#### Build Failures

```bash
# Check TypeScript errors
npx tsc --noEmit

# Clean and rebuild
npm run clean && npm run build
```

#### Test Failures

```bash
# Run with verbose output
npm run test -- --reporter=verbose

# Run specific test
npm run test -- tests/unit/specific.test.ts

# Debug with UI
npm run test:ui
```

#### Runtime Issues

```bash
# Enable debug logging
DEBUG=1 npm run dev

# Check BMAD paths
npm run doctor:show -- --full
```

### Development Tools

#### VS Code Integration

- **TypeScript Hero:** Organize imports
- **Prettier:** Code formatting
- **ESLint:** Real-time linting
- **Debugger:** Attach to Node.js processes

#### Useful Scripts

```bash
# Check what's running on ports
lsof -i :4000

# Kill processes on port
lsof -ti:4000 | xargs kill -9

# Monitor file changes
npm run dev &
fswatch -o src/ | xargs -n1 -I{} npm run build
```

---

## 🤝 Contributing

### Development Process

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Make changes** following the development workflow
4. **Add tests** for new functionality
5. **Run full test suite:** `npm run test:all`
6. **Update documentation** if needed
7. **Commit** with conventional format: `git commit -m "feat: add new feature"`
8. **Push** and create pull request

### Commit Message Format

Follow [Conventional Commits](https://conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Testing
- `chore:` - Maintenance

### Pull Request Process

1. **Title:** Clear, descriptive title
2. **Description:** What changes, why, how to test
3. **Labels:** bug, enhancement, documentation, etc.
4. **Assignees:** Request review from maintainers
5. **Checks:** All CI checks must pass

### Code Review Checklist

- [ ] **Tests pass:** `npm run test:all`
- [ ] **Linting clean:** `npm run lint`
- [ ] **Formatting applied:** `npm run format`
- [ ] **TypeScript compiles:** `npm run build`
- [ ] **Coverage maintained:** `npm run test:coverage`
- [ ] **Documentation updated:** If public APIs changed

---

## 📊 Performance Monitoring

### Build Performance

```bash
# Time the build
time npm run build

# Check bundle size
du -sh build/
```

### Test Performance

```bash
# Run with timing
npm run test -- --reporter=verbose

# Check slowest tests
npm run test -- --reporter=json | jq '.testResults[].assertionResults[] | select(.duration > 1000)'
```

### Runtime Performance

```bash
# Profile with clinic
npm install -g clinic
clinic doctor -- npm start

# Memory usage
node --expose-gc build/index.js &
# Monitor with Activity Monitor or htop
```

---

## 🔒 Security

### Development Security

- **Dependencies:** Regular `npm audit` checks
- **Secrets:** Never commit API keys or credentials
- **Input validation:** All external inputs validated
- **Path traversal:** Protected against `../../../` attacks

### Pre-commit Security

```bash
# Check for secrets
npm install -g git-secrets
git secrets --scan

# Audit dependencies
npm audit

# Check for vulnerable packages
npm audit --audit-level high
```

---

## 📚 Additional Resources

### Documentation

- [README.md](../README.md) - Project overview
- [API Contracts](api-contracts.md) - MCP tools and internal APIs
- [Architecture](architecture.md) - System design and components
- [Source Tree Analysis](source-tree-analysis.md) - File and directory purposes

### External Links

- [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) - Original methodology
- [MCP Specification](https://modelcontextprotocol.io/specification) - Protocol documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Language reference
- [Vitest Documentation](https://vitest.dev/) - Testing framework

### Community

- **Issues:** [GitHub Issues](https://github.com/mkellerman/bmad-mcp-server/issues)
- **Discussions:** [GitHub Discussions](https://github.com/mkellerman/bmad-mcp-server/discussions)
- **Contributing:** See [CONTRIBUTING.md](../CONTRIBUTING.md) (if exists)

---

**Last Updated:** Development workflow active
