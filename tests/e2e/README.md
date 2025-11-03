# E2E Testing with LLM Integration

> **Note:** These tests are **excluded from CI** and are intended for **manual developer testing only**.

## Overview

The E2E test suite validates BMAD agents and workflows through real LLM integration using LiteLLM proxy. These tests:

- Load agents/workflows through the MCP server
- Send responses to an LLM (via LiteLLM)
- Validate persona adoption, menu structure, and behavior
- Generate structured test reports (JSON + HTML)

## Prerequisites

### 1. Start LiteLLM Proxy

```bash
npm run litellm:docker:start
```

Verify it's running:

```bash
npm run litellm:docker:health
```

### 2. Configure LLM Provider

Edit `tests/support/litellm-config.yaml` to add your API keys:

```yaml
model_list:
  - model_name: gpt-4o-mini
    litellm_params:
      model: openai/gpt-4o-mini
      api_key: sk-your-real-key-here
```

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific Test Files

```bash
# Agent validation (12 agents)
npm run test:e2e -- tests/e2e/agent-validation-llm.spec.ts

# Workflow validation (18 workflows)
npm run test:e2e -- tests/e2e/workflow-validation-llm.spec.ts

# Single agent smoke test
npm run test:e2e -- tests/e2e/single-agent-llm-test.spec.ts
```

## Test Output

### Console Output

Each test displays:

- 🔍 Discovery phase (finding agents/workflows)
- 📤 USER_INPUT (command sent)
- 🛠️ TOOL_RESPONSE (raw MCP output)
- 🤖 SYSTEM_RESPONSE (LLM interpretation)
- ✅ TEST_RESULTS (validation results)

### Test Reports

Reports are generated in `test-results/reports/`:

- `test-results.json` - Structured JSON data
- `test-report.html` - HTML report with all details

## CI Behavior

E2E tests are **automatically excluded** from CI runs because:

1. They require LiteLLM proxy (not available in CI)
2. They require LLM API keys (not in CI environment)
3. They're for manual validation, not automated checks

The exclusion is configured in `vitest.config.ts`:

```typescript
exclude: [
  '**/tests/e2e/**', // E2E/LLM tests are for manual developer testing only
];
```

## Cleanup

Stop the LiteLLM proxy when done:

```bash
npm run litellm:docker:stop
```

## Troubleshooting

### LiteLLM Proxy Not Running

```bash
# Check if running
docker ps | grep litellm

# View logs
npm run litellm:docker:logs

# Restart if needed
npm run litellm:docker:stop
npm run litellm:docker:start
```

### API Key Issues

Check `tests/support/litellm-config.yaml` has valid API keys for your chosen provider.

### Test Timeouts

LLM tests have 30s timeout. Slow API responses may cause failures. Check your LiteLLM logs for API rate limits.
