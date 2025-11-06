# Development Guide - BMAD MCP Server

**Audience:** Developers, Contributors

---

## Overview

This guide covers the complete development workflow for the BMAD MCP Server, from initial setup through testing, building, and deployment.

**Tech Stack:**

- **Language:** TypeScript 5.7.2 (Strict mode, ES2022 target)
- **Runtime:** Node.js (ES modules)
- **Protocol:** MCP 1.0.4 (Model Context Protocol)
- **Testing:** Vitest 4.0.3 with coverage reporting
- **Linting:** ESLint 9.17.0 with TypeScript support
- **Formatting:** Prettier 3.4.2
- **Build:** TypeScript compiler (no bundler)

---

## 🚀 Quick Start

### Prerequisites

**Required:**

- Node.js 18+ (check with `node --version`)
- npm 8+ (check with `npm --version`)
- Git (for cloning and Git remote support)

**Recommended:**

- VS Code with TypeScript and Node.js extensions
- GitHub Copilot for AI-assisted development

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/mkellerman/bmad-mcp-server.git
cd bmad-mcp-server

# Install dependencies
npm install

# Verify setup
npm run doctor:show
```

### First Development Run

```bash
# Start development server with auto-restart
npm run dev

# In another terminal, test basic functionality
npm run lite:list
```

---

## 📁 Project Structure

```
bmad-mcp-server/
├── src/                    # Source code (TypeScript)
├── build/                  # Compiled JavaScript (generated)
├── tests/                  # Test suites and fixtures
├── scripts/                # Development utilities
├── docs/                   # Documentation (generated)
├── coverage/               # Test coverage reports (generated)
├── test-results/           # Test execution results (generated)
├── node_modules/           # Dependencies
├── package.json            # Project configuration
├── tsconfig.json           # TypeScript configuration
└── vitest.config.ts        # Test framework configuration
```

### Key Directories

| Directory  | Purpose                 | Key Files                                           |
| ---------- | ----------------------- | --------------------------------------------------- |
| `src/`     | Source code             | `server.ts`, `resource-loader.ts`, `types/index.ts` |
| `tests/`   | Test infrastructure     | Unit, integration, e2e test suites                  |
| `scripts/` | Development tools       | Build helpers, diagnostics, utilities               |
| `docs/`    | Generated documentation | API docs, architecture, guides                      |
| `build/`   | Distribution artifacts  | Compiled JavaScript for npm publish                 |

---

## 🛠️ Development Workflow

### Daily Development Cycle

```bash
# 1. Start with a clean state
npm run clean

# 2. Install/update dependencies
npm install

# 3. Run tests to ensure everything works
npm run test

# 4. Start development with auto-restart
npm run dev

# 5. Make changes, verify with tests
npm run test:unit

# 6. Format and lint code
npm run format
npm run lint:fix

# 7. Build for production
npm run build

# 8. Run integration tests
npm run test:integration
```

### Code Changes Workflow

```bash
# Make your changes to .ts files in src/

# Run unit tests for your changes
npm run test:unit

# Run all tests to ensure no regressions
npm run test

# Format code
npm run format

# Fix any linting issues
npm run lint:fix

# Build to verify compilation
npm run build

# Run integration tests if needed
npm run test:integration
```

### Pre-Commit Checks

The project uses Husky for Git hooks. These run automatically on commit:

```bash
# Manual pre-commit validation
npm run guard:src-js  # Validate source code
npm run lint:fix      # Auto-fix linting issues
npm run format        # Format all files
```

**What happens on commit:**

1. **Source validation:** Ensures no JavaScript in `src/` (must be TypeScript)
2. **Linting:** Auto-fixes ESLint issues
3. **Formatting:** Applies Prettier formatting
4. **Type checking:** TypeScript compilation verification

---

## 🧪 Testing Strategy

### Test Types

| Test Type       | Command                    | Purpose                   | Timeout  |
| --------------- | -------------------------- | ------------------------- | -------- |
| **Unit**        | `npm run test:unit`        | Isolated function testing | 5s       |
| **Integration** | `npm run test:integration` | Component interaction     | 10s      |
| **E2E**         | `npm run test:e2e`         | Full workflow testing     | 30s      |
| **All**         | `npm run test:all`         | Complete test suite       | Variable |

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run LLM integration tests
npm run test:llm
```

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
