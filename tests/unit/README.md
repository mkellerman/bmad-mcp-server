# Unit Tests

Pure unit tests that validate individual functions and modules in complete isolation.

## Characteristics

- ⚡ **Fast**: < 5 seconds total execution time
- 🔒 **Isolated**: No I/O, no network, no file system access
- 🎯 **Focused**: Each test validates one function/module
- ✅ **Reliable**: Always passing in CI (no external dependencies)

## Organization

### `utils/` - Utility Functions

#### `path-resolution/`

Tests for BMAD path discovery and resolution:

- **`bmad-path-resolver.test.ts`** - Resolves BMAD installations from various sources
- **`bmad-root-finder.test.ts`** - Finds BMAD root directories
- **`bmad-source-detector.test.ts`** - Detects BMAD installation sources (package, project, global)
- **`name-parser.test.ts`** - Parses qualified agent/workflow names
- **`path-parser.test.ts`** - Parses v4/v6 path formats

#### `file-operations/`

Tests for file reading and parsing:

- **`file-reader.test.ts`** - Reads files with module-aware path resolution
- **`yaml-loader.test.ts`** - Loads and parses YAML files

#### `validation/`

Tests for validation logic:

- **`validators.test.ts`** - Input validation functions
- **`xml-validator.test.ts`** - XML schema validation

#### `git/`

Tests for Git repository operations:

- **`git-source-resolver.test.ts`** - Resolves Git repositories from URLs

### `services/` - Service Layer

Tests for business logic services:

- **`master-manifest-snapshot.test.ts`** - Master manifest snapshot creation
- **`dynamic-agent-loader.test.ts`** - Dynamic agent loading from manifests

### `tools/` - MCP Tools

Tests for MCP tool implementation:

- **`unified-tool.test.ts`** - BMAD unified tool routing (agent/workflow/discovery)
- **`list-commands.test.ts`** - List agents/workflows commands
- **`tool-description.test.ts`** - Tool description generation
- **`doctor-v6.test.ts`** - System diagnostics (`*doctor` command)

### `helpers/` - Test Helpers

Tests for test framework utilities:

- **`llm-helper.test.ts`** - LLM client test helper
- **`mcp-helper.test.ts`** - MCP client test helper
- **`agent-logger.test.ts`** - Agent log collection
- **`test-builder.test.ts`** - Test data builder utilities

## Running Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific subdirectory
npm run test:unit -- tests/unit/utils/path-resolution/

# Run single test file
npm run test:unit -- tests/unit/utils/path-resolution/bmad-path-resolver.test.ts

# Run in watch mode
npm run test:unit -- --watch

# Run with coverage
npm run test:unit -- --coverage
```

## Writing Unit Tests

### Template

```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../../../src/utils/module.js';

describe('functionToTest', () => {
  it('should handle typical input', () => {
    const result = functionToTest('valid-input');
    expect(result).toBe('expected-output');
  });

  it('should handle edge case: null input', () => {
    expect(() => functionToTest(null)).toThrow('Invalid input');
  });

  it('should handle edge case: empty input', () => {
    const result = functionToTest('');
    expect(result).toBe('');
  });
});
```

### Best Practices

1. **Test one thing** - Each test validates a single behavior
2. **Use descriptive names** - "should X when Y"
3. **Test edge cases** - Null, undefined, empty, invalid inputs
4. **No I/O** - Mock file system, network, database calls
5. **Fast execution** - Each test should complete in milliseconds
6. **Deterministic** - Same input always produces same output
7. **Independent** - Tests can run in any order

### Example: Testing Path Resolution

```typescript
import { describe, it, expect } from 'vitest';
import { parseBmadPath } from '../../../src/utils/path-parser.js';

describe('parseBmadPath', () => {
  it('should parse v4 format (.bmad-core/file.md)', () => {
    const result = parseBmadPath('.bmad-core/agents/analyst.md');
    expect(result).toEqual({
      module: 'core',
      file: 'agents/analyst.md',
      format: 'v4',
    });
  });

  it('should parse v6 format ({project-root}/bmad/core/file.md)', () => {
    const result = parseBmadPath('{project-root}/bmad/core/agents/analyst.md');
    expect(result).toEqual({
      module: 'core',
      file: 'agents/analyst.md',
      format: 'v6',
    });
  });

  it('should throw on invalid format', () => {
    expect(() => parseBmadPath('/invalid/path.md')).toThrow();
  });
});
```

## Coverage Goals

- **Target**: 80%+ code coverage
- **Critical paths**: 95%+ coverage for:
  - Path resolution
  - File parsing
  - Validation functions
  - Tool routing

## Related Documentation

- [Integration Tests](../integration/README.md)
- [E2E Tests](../e2e/README.md)
- [Main Test README](../README.md)
