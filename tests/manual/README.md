# Manual Tests

This directory contains tests that require manual setup or external services and are **not run automatically** in CI/CD pipelines.

## Directory Structure

```
tests/manual/
├── examples/           # Usage examples and documentation tests
└── llm-evaluated/      # LLM judge evaluation tests (requires Copilot Proxy)
```

## Test Categories

### 📚 Examples (`examples/`)

**Purpose:** Demonstrate framework features and provide usage examples

**Requirements:** May require external services (LiteLLM, etc.)

**Run:** `npm run test:manual:examples`

**Files:**

- `llm-helper-usage.test.ts` - Demonstrates LLM helper API (requires LiteLLM)
- `agent-logger-usage.test.ts` - Shows agent logging patterns
- `reporter-usage.test.ts` - Demonstrates unified test reporter
- `test-context-usage.test.ts` - Shows test context tracking

**Note:** These are primarily for documentation and may be skipped if dependencies aren't available.

---

### 🤖 LLM Evaluation (`llm-evaluated/`)

**Purpose:** Evaluate AI response quality using LLM-as-judge methodology

**Requirements:**

- GitHub Copilot Proxy running (`npx copilot-proxy --auth`)
- Active GitHub Copilot Plus subscription

**Run:** `npm run test:manual:llm`

**Files:**

- `copilot-proxy.smoke.test.ts` - Verify Copilot Proxy connection
- `demo-llm-judge.test.ts` - LLM judge framework demo
- `demo-test-matrix.test.ts` - Multi-judge comparison
- `real-llm-evaluation.test.ts` - Real LLM evaluation tests
- `ranking-quality.eval.test.ts` - Workflow ranking quality
- `demo-storage.test.ts` - Evaluation result storage
- `demo-version-comparison.test.ts` - Version comparison tracking

**Setup:**

```bash
# 1. Authenticate with Copilot Proxy
npx copilot-proxy --auth

# 2. Run LLM evaluation tests
npm run test:manual:llm
```

---

## Running Manual Tests

### Run All Manual Tests

```bash
npm run test:manual
```

### Run Specific Categories

```bash
# Examples only
npm run test:manual:examples

# LLM evaluation only
npm run test:manual:llm
```

### Run Individual Tests

```bash
# Run specific test file
npx vitest tests/manual/llm-evaluated/demo-llm-judge.test.ts

# Run in watch mode
npx vitest tests/manual/llm-evaluated/demo-llm-judge.test.ts --watch
```

---

## Why Manual Tests?

These tests are separated from automated CI/CD because they:

1. **Require Authentication** - Need Copilot or other service credentials
2. **Make Real API Calls** - May incur costs or have rate limits
3. **Need External Services** - Require LiteLLM, Copilot Proxy, etc.
4. **Are Examples/Docs** - Primarily for demonstration, not validation
5. **Are Optional** - Not required for core functionality validation

---

## CI/CD Integration

**Default test run (`npm test`)**: Runs only `tests/unit` and `tests/integration`

**Full automated suite (`npm run test:all`)**: Adds `tests/e2e` but **excludes manual tests**

**Manual tests**: Must be run explicitly with `npm run test:manual`

This ensures:

- ✅ Fast, reliable CI/CD pipelines
- ✅ No failed builds due to missing credentials
- ✅ No unexpected API costs
- ✅ Clear separation of concerns

---

## Contributing

When adding new tests:

- **Unit/Integration/E2E?** → Add to appropriate `tests/` directory
- **Requires manual setup?** → Add to `tests/manual/`
- **LLM evaluation?** → Add to `tests/manual/llm-evaluated/`
- **Usage example?** → Add to `tests/manual/examples/`

---

## Related Documentation

- [Test Strategy](../docs/test-strategy-mcp-protocol.md) - Overall testing approach
- [LLM Evaluation Framework](../docs/test-strategy-mcp-protocol.md#llm-evaluation) - Judge methodology
- [Copilot Proxy Integration](../docs/copilot-proxy-integration.md) - Setup guide
- [Testing Framework](../README.md) - Main testing docs
