# E2E Tests with Copilot-Proxy

## Testing Rules

### DO NOT

- ❌ Use LiteLLM for any E2E tests
- ❌ Use mocks for LLM evaluation tests
- ❌ Skip tests silently when copilot-proxy unavailable

### DO

- ✅ Mark tests as e2e if copilot-proxy is used
- ✅ Write clear comments explaining intent, steps, and expected results
- ✅ Test connection to copilot-proxy in beforeAll
- ✅ FAIL the entire test suite if copilot-proxy can't connect
- ✅ Show only 1 error per suite when copilot-proxy unavailable

## Test Structure

Each E2E test file must include:

```typescript
/**
 * E2E Test: [Test Name]
 *
 * INTENT:
 * Clear description of what this test is trying to accomplish
 *
 * EXPECTED STEPS:
 * 1. Step one
 * 2. Step two
 * 3. etc.
 *
 * EXPECTED RESULTS:
 * - What should happen when test passes
 * - What data should be returned
 * - What state should change
 *
 * FAILURE CONDITIONS:
 * - When should this test fail
 * - What errors are expected
 *
 * NOTE: This is an E2E test because it uses copilot-proxy.
 */

describe('E2E: Test Name', () => {
  let shouldSkip = false;
  let skipReason = '';

  beforeAll(async () => {
    // Test connection to copilot-proxy - fail suite if unavailable
    const available = await isCopilotProxyAvailable();
    if (!available) {
      shouldSkip = true;
      skipReason = 'Copilot Proxy not available';
    }
  });

  it('should do something', async () => {
    // FAIL if copilot-proxy is unavailable (per testing rules)
    if (shouldSkip) {
      throw new Error(
        `❌ E2E Test Suite Failed: ${skipReason}\n` +
          `   Action: Authenticate with GitHub Copilot\n` +
          `   Command: npx copilot-proxy --auth\n`,
      );
    }

    // Test implementation...
  });
});
```

## Running E2E Tests

### Prerequisites

```bash
# Authenticate with GitHub Copilot
npx copilot-proxy --auth
```

### Run Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific E2E test
npm test -- tests/e2e/copilot-proxy.smoke.test.ts
```

## Current E2E Tests

### copilot-proxy.smoke.test.ts

**INTENT:** Verify copilot-proxy server connectivity

- Starts local proxy server
- Tests HTTP endpoints
- Validates server response

### real-llm-evaluation.test.ts

**INTENT:** Test LLM-as-judge evaluation framework

- Real API calls to judge LLM
- Evaluates response quality
- Tracks token usage and costs
- Tests malformed response handling

### ranking-quality.eval.test.ts

**INTENT:** Evaluate workflow ranking quality

- BMAD ranks workflows for queries
- Judge LLM evaluates ranking quality
- Tests multiple query types
- Tracks evaluation costs

## Expected Behavior

### When Copilot-Proxy is Available

- ✅ All tests run with real LLM API calls
- ✅ Actual costs are tracked
- ✅ Real evaluations are performed
- ✅ Tests pass/fail based on actual LLM responses

### When Copilot-Proxy is NOT Available

- ❌ Test suite FAILS immediately
- ❌ Clear error message shown
- ❌ Instructions for authentication provided
- ❌ No silent skips or misleading passes

## Cost Warning

⚠️ **These tests make real API calls to GitHub Copilot**

- Each test run incurs actual costs
- Costs are tracked and displayed
- Use sparingly in CI/CD
- Consider cost limits in production

## Philosophy

These are **real E2E tests** - they test the actual integration with real LLM services. No mocks, no fake data, no placeholder responses. If the external service isn't available, the tests fail loudly and clearly.
