# Automatic Test Context Tracking

## Overview

The BMAD test framework now automatically tracks which test is currently running, eliminating the need for manual `setCurrentTest()` calls in every test.

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────┐
│ vitest.config.ts                                │
│ - setupFiles: ['./tests/framework/setup/       │
│   test-setup.ts']                               │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ tests/framework/setup/test-setup.ts             │
│ - beforeEach: setCurrentTest(context.task.name) │
│ - afterEach: setCurrentTest('')                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ tests/framework/core/test-context.ts            │
│ - File-based storage: .contexts/<testname>.json│
│ - Functions: addLLMInteraction, addAgentLog... │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ vitest.config.ts (BMADReporter)                 │
│ - getAllTestContexts() from disk               │
│ - Merge context data into test results         │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ test-results/test-results.{json,html}           │
│ - Rich LLM interactions                         │
│ - Agent logs                                    │
│ - XML validations                               │
└─────────────────────────────────────────────────┘
```

### Key Components

1. **`vitest.config.ts`** - Configures `setupFiles` to load test-setup.ts for every test file
2. **`tests/framework/setup/test-setup.ts`** - Registers beforeEach/afterEach hooks in test context
3. **`tests/framework/core/test-context.ts`** - File-based storage for test metadata
4. **`tests/framework/setup/global-setup.ts`** - Cleans old contexts before tests run

### File-Based Persistence

Test context data is saved to disk to survive async operations and module reloading:

```
test-results/
  .contexts/
    my-test-name.json
    another-test.json
    ...
```

Each context file contains:

```json
{
  "testName": "should send chat request and return response",
  "llmInteractions": [
    {
      "id": "test-interaction-1",
      "prompt": "What is 2+2?",
      "response": "4",
      "provider": {
        "name": "openai",
        "model": "gpt-4.1"
      },
      "tokenUsage": {
        "prompt": 10,
        "completion": 5,
        "total": 15
      }
    }
  ],
  "agentLogs": [],
  "xmlValidation": null
}
```

## Usage

### Before (Manual Tracking)

```typescript
import { test, expect } from 'vitest';
import { setCurrentTest, addLLMInteraction } from '../framework/core/test-context.js';

test('my LLM test', async () => {
  setCurrentTest('my LLM test'); // ❌ Manual call required

  await addLLMInteraction({...});

  expect(result).toBe('expected');
});
```

### After (Automatic Tracking)

```typescript
import { test, expect } from 'vitest';
import { addLLMInteraction } from '../framework/core/test-context.js';

test('my LLM test', async () => {
  // ✅ Test name is automatically tracked!

  await addLLMInteraction({...});

  expect(result).toBe('expected');
});
```

## Benefits

1. **Less Boilerplate** - No need to call `setCurrentTest()` in every test
2. **Fewer Errors** - Can't forget to set test name or mismatch test names
3. **Cleaner Tests** - Tests focus on logic, not framework mechanics
4. **Automatic Cleanup** - afterEach clears test name to prevent leaks

## Implementation Details

### setupFiles vs globalSetup

**globalSetup** runs before Vitest runner initialization:

- ✅ Good for: Cleaning directories, starting services
- ❌ Bad for: Registering test hooks (beforeEach/afterEach)

**setupFiles** runs in test context for each test file:

- ✅ Good for: Registering beforeEach/afterEach hooks
- ✅ Good for: Setting up test environment
- ✅ Has access to: Vitest test context and APIs

### Why File-Based Storage?

Initial implementation used in-memory Map, but this failed because:

- Module reloading caused data loss
- Reporter runs in different execution context
- Async operations needed persistent storage

File-based storage solved this by:

- Writing to disk immediately on each data capture
- Loading from disk in reporter before generating results
- Surviving module reloads and async operations

## Performance

- **507 tests** run in **~2 seconds**
- File I/O is minimal (one file per test)
- Cleanup is fast (rm -rf .contexts/)
- No noticeable overhead

## Verification

Check that automatic tracking is working:

```bash
# Run tests
npm test

# Check how many tests have LLM data
cat test-results/test-results.json | \
  jq '[.tests[] | select(.llmInteractions and (.llmInteractions | length) > 0)] | length'

# View a specific test's context
cat test-results/.contexts/should-send-chat-request-and-return-response.json | jq
```

## Future Enhancements

- [ ] Track test execution time automatically
- [ ] Capture console output per test
- [ ] Add performance metrics (CPU, memory)
- [ ] Support nested test suites with hierarchical context
- [ ] Add context inheritance from parent suites
