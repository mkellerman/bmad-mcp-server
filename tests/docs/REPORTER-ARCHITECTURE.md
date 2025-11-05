# Reporter Architecture - Per-Test JSON Fragments

## Overview

The unified testing framework uses a **fragment-based architecture** where each test writes its own JSON file immediately when reported. This enables:

1. **Parallel test execution** - No shared state between test files
2. **Incremental reporting** - Results saved even if test run crashes
3. **Simple merging** - Global teardown merges all fragments into final report

## How It Works

### 1. Test Execution

Each test calls `await reporter.addTest(suiteName, testResult)`:

```typescript
const testResult = TestBuilder.unit().name('my test').passed().build();

await reporter.addTest('My Suite', testResult);
```

### 2. Immediate Persistence

The reporter immediately writes a JSON fragment file:

```
test-results/.fragments/
  ├── My_Suite__test-1.json
  ├── My_Suite__test-2.json
  ├── Other_Suite__test-3.json
  └── Other_Suite__test-4.json
```

Each fragment contains:

```json
{
  "suiteName": "My Suite",
  "test": {
    "id": "test-1",
    "name": "my test",
    "type": "unit",
    "status": "passed",
    ...
  },
  "timestamp": "2025-11-03T17:44:28.123Z"
}
```

### 3. Global Teardown

After all tests complete, Vitest calls the global teardown which:

1. Reads all `.json` files from `.fragments/`
2. Groups tests by suite name
3. Calculates summary statistics
4. Writes final `test-results.json`
5. HTML generator reads `test-results.json` and creates `test-results.html`

## Benefits

### Parallel Execution

- Each test file writes its own fragments
- No race conditions or shared state
- Faster test execution (5.58s → 1.88s sequential → parallel)

### Crash Recovery

- If tests crash, existing fragments are preserved
- Partial results can still be reported
- No data loss from incomplete runs

### Simple Architecture

- No complex state management
- No locking mechanisms needed
- Easy to debug (inspect fragment files directly)

### Incremental Adoption

- Existing tests continue to work
- Framework only collects data from tests that use `reporter.addTest()`
- Migrate tests one file at a time

## File Structure

```
test-results/
├── .fragments/                  # Individual test result files (hidden)
│   ├── Suite_A__test-1.json
│   ├── Suite_A__test-2.json
│   └── Suite_B__test-3.json
├── test-results.json            # Merged final report
├── test-results.html            # Interactive HTML report
├── e2e-results.json             # E2E test results
└── e2e-results.html             # E2E HTML report
```

## Configuration

### Vitest Config

```typescript
export default defineConfig({
  test: {
    fileParallelism: true, // Enable parallel execution
    globalSetup: ['./tests/framework/setup/global-setup.ts'],
  },
});
```

### Global Setup

```typescript
// Clean old fragments before tests
export async function setup() {
  await fs.rm('test-results/.fragments', {
    recursive: true,
    force: true,
  });
}

// Generate report after tests
export async function teardown() {
  await reporter.generateReport();
}
```

## Implementation Details

### Fragment Filename

Format: `<SafeSuiteName>__<SafeTestId>.json`

Example: `My_Test_Suite__test-abc-123.json`

Safety rules:

- Non-alphanumeric characters replaced with `_`
- Ensures unique filename per test
- Easy to identify test by filename

### Loading Fragments

```typescript
private async loadAllFragments() {
  const files = await fs.readdir(this.testResultsDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  return await Promise.all(
    jsonFiles.map(async (file) => {
      const content = await fs.readFile(path.join(this.testResultsDir, file));
      return JSON.parse(content);
    })
  );
}
```

### Merging Algorithm

1. Load all fragments
2. Group by suite name
3. Calculate aggregated suite duration
4. Generate type-based statistics (unit, integration, e2e, llm, agent)
5. Calculate overall summary
6. Write final JSON

## Migration Notes

### Important: Async Reporter

```typescript
// OLD (synchronous) - No longer valid
reporter.addTest('Suite', testResult);

// NEW (async) - Must await
await reporter.addTest('Suite', testResult);
```

The reporter is now async because it writes to disk immediately. Always use `await`.

### Test Isolation

Each test should report itself:

- Don't share reporter state between tests
- Each test writes its own fragment
- Fragments are merged automatically

### Suite Naming

Suite names group related tests:

```typescript
// Same suite
await reporter.addTest('Authentication', test1);
await reporter.addTest('Authentication', test2);

// Different suites
await reporter.addTest('Authentication', test1);
await reporter.addTest('Authorization', test2);
```

## Performance

### Sequential vs Parallel

- **Sequential** (old): ~5.58s for 516 tests
- **Parallel** (new): ~1.88s for 516 tests
- **Speedup**: ~3x faster

### Fragment I/O

- Each test writes ~1-2KB JSON file
- Async file operations don't block test execution
- Negligible overhead compared to test execution time

### Report Generation

- Reading fragments: O(n) where n = number of tests
- Merging: O(n log n) for sorting/grouping
- Writing JSON: O(1)
- Total overhead: <100ms for typical test suite

## Troubleshooting

### Missing Tests in Report

**Symptom**: Some tests don't appear in HTML report

**Causes**:

1. Test didn't call `await reporter.addTest()`
2. Test threw error before reporting
3. Fragment write failed (disk space, permissions)

**Solution**: Check `test-results/.fragments/` for fragment files

### Duplicate Tests

**Symptom**: Same test appears multiple times

**Cause**: Test calls `reporter.addTest()` multiple times

**Solution**: Ensure `addTest()` is called once per test

### Fragment Cleanup

**Symptom**: Old fragments from previous runs

**Solution**: Global setup automatically cleans fragments. Manual cleanup:

```bash
rm -rf test-results/.fragments
```

## Future Enhancements

Potential improvements:

- Streaming report generation (update HTML in real-time)
- Fragment compression for large test suites
- Distributed test execution across machines
- Test result caching and diffing
