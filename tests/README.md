# BMAD MCP Server - Test Suite

## Overview

Comprehensive test suite for the BMAD MCP Server with **66 passing tests** covering all core functionality.

## Test Coverage

- **90.28%** overall code coverage
- **96.10%** utils coverage (FileReader, ManifestLoader)
- **88.81%** tools coverage (UnifiedBMADTool)

## Test Structure

```
tests/
├── helpers/
│   └── test-fixtures.ts          # Test utilities and fixtures
├── unit/
│   ├── file-reader.test.ts       # FileReader tests (19 tests) ✓
│   ├── manifest-loader.test.ts   # ManifestLoader tests (18 tests) ✓
│   └── unified-tool.test.ts      # UnifiedBMADTool tests (29 tests) ✓
├── integration/
│   └── bmad-integration.test.ts  # Integration tests (WIP)
└── e2e/
    └── (Future end-to-end tests)
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/unit/file-reader.test.ts

# Run in watch mode
npm test -- --watch
```

## Test Categories

### Unit Tests

#### FileReader Tests (19 tests)
- ✅ Constructor and initialization
- ✅ File reading (absolute/relative paths)
- ✅ Path traversal protection
- ✅ Symlink handling
- ✅ Permission error handling
- ✅ File existence checks
- ✅ Path validation

#### ManifestLoader Tests (18 tests)
- ✅ Constructor with multiple directory structures
- ✅ Agent manifest loading and parsing
- ✅ Workflow manifest loading
- ✅ Task manifest loading
- ✅ Empty row filtering
- ✅ Malformed CSV handling
- ✅ Agent/workflow lookup by name

#### UnifiedBMADTool Tests (29 tests)
- ✅ Tool initialization
- ✅ Empty command handling (default agent)
- ✅ Agent loading by name
- ✅ Workflow execution with `*` prefix
- ✅ Discovery commands (`*list-agents`, `*list-workflows`, `*list-tasks`, `*help`)
- ✅ Input validation (dangerous characters, length, patterns)
- ✅ Fuzzy matching and suggestions
- ✅ Error handling and recovery
- ✅ Edge cases (empty manifests, missing files)

### Integration Tests (WIP)
- End-to-end agent loading
- End-to-end workflow execution
- Discovery workflows
- Error handling integration
- Concurrent operations

## Test Fixtures

The test suite uses a comprehensive fixture system that creates temporary test environments with:

- Proper BMAD directory structure (`src/bmad/_cfg`)
- Sample manifests (agents, workflows, tasks)
- Sample agent and workflow files
- Automatic cleanup after tests

### Example Usage

```typescript
import { createTestFixture, createBMADStructure, createAgentManifest } from '../helpers/test-fixtures';

const fixture = createTestFixture();
createBMADStructure(fixture.tmpDir);
createAgentManifest(fixture.tmpDir);

// ... run tests ...

fixture.cleanup(); // Automatic cleanup
```

## Test Configuration

### Jest Configuration (`jest.config.cjs`)

- **Preset**: `ts-jest/presets/default-esm` for ES module support
- **Environment**: Node.js
- **Coverage**: HTML, LCOV, and text reports
- **Module Resolution**: Supports `.js` imports from `.ts` files
- **Target**: ESNext for modern JavaScript features

### Key Features

- ✅ ES Module support
- ✅ TypeScript compilation
- ✅ Coverage collection
- ✅ Parallel test execution
- ✅ Isolated test environments

## Coverage Details

### Utils (96.10%)

| File | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| file-reader.ts | 92.85% | 88.88% | 100% | 92.85% |
| manifest-loader.ts | 100% | 100% | 100% | 100% |

### Tools (88.81%)

| File | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| unified-tool.ts | 88.81% | 66.95% | 86.66% | 88.88% |

## What's Tested

### Security Features
- ✅ Path traversal prevention
- ✅ Dangerous character detection
- ✅ Input validation and sanitization
- ✅ Permission error handling

### Core Functionality
- ✅ Agent discovery and loading
- ✅ Workflow discovery and execution
- ✅ Manifest parsing (CSV)
- ✅ File reading with security
- ✅ Error messages and suggestions

### Edge Cases
- ✅ Empty manifests
- ✅ Missing files
- ✅ Malformed CSV
- ✅ Invalid names
- ✅ Path traversal attempts
- ✅ Symlink handling

## Known Limitations

- Server.ts tests are WIP due to import.meta.url compatibility with jest
- Integration tests for BMADMCPServer are partially complete
- Some edge cases in workflow context resolution have lower coverage

## Future Improvements

1. Complete integration tests for BMADMCPServer
2. Add E2E tests for MCP protocol communication
3. Add performance benchmarks
4. Add mutation testing
5. Increase branch coverage in unified-tool.ts to 85%+

## CI/CD Integration

Tests are designed to run in CI/CD environments:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: npm test
  
- name: Upload Coverage
  run: npm test -- --coverage
```

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure >90% coverage for new code
3. Run full test suite before committing
4. Update this README if adding new test categories

## Test Philosophy

- **Fast**: Tests run in under 3 seconds
- **Isolated**: Each test uses its own temporary environment
- **Comprehensive**: Cover happy paths, edge cases, and error conditions
- **Maintainable**: Clear test names and good fixtures
- **Reliable**: No flaky tests, deterministic outcomes
