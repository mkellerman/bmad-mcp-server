# End-to-End (E2E) Tests# End-to-End Tests

True end-to-end tests that validate complete user workflows with LLM + MCP + real BMAD agents/workflows.> **Note:** These tests are **excluded from CI** and are intended for **manual developer testing only**.

## ⚠️ Prerequisites## Overview

**E2E tests require LiteLLM proxy running:**The E2E test suite validates BMAD MCP server functionality using external services but **without LLM interaction**. These tests:

````bash- Validate MCP server tools and capabilities

# Start LiteLLM proxy (uses Docker)- Test dynamic agent loading from remote sources

npm run test:litellm-start- Verify remote repository discovery

- Check server health and initialization

# Check proxy health

npm run test:litellm-health**For LLM integration tests**, see [`tests/llm/README.md`](../llm/README.md)



# View proxy logs## Test Categories

npm run test:litellm-logs

| Test Suite | Description | External Dependencies |

# Stop proxy when done|------------|-------------|----------------------|

npm run test:litellm-stop| `bmad-tool.spec.ts` | BMAD MCP tool functionality | None |

```| `dynamic-agent-loading.spec.ts` | Remote agent loading | GitHub API |

| `remote-discovery.spec.ts` | Repository discovery | GitHub API |

## Characteristics| `server-health.spec.ts` | Server initialization | None |



- 🐌 **Slow**: 30 seconds to 5 minutes per test## Prerequisites

- 🤖 **LLM Required**: Uses real LLM via LiteLLM proxy

- 💰 **API Costs**: Consumes tokens from your LLM providerNo special setup required for basic E2E tests. Tests that access remote repositories may require:

- 🎭 **Real Workflows**: Tests actual user scenarios end-to-end- GitHub access (public repos)

- 🎯 **Business Value**: Validates critical user journeys- Internet connection



## Organization## Running Tests



### `workflows/` - Complete Workflow Validation### Run All E2E Tests



Tests that all BMAD agents and workflows load and execute correctly via LLM.```bash

npm run test:e2e

**What it tests:**```

- All agents load successfully through LLM

- All workflows execute without errors### Run Specific Test Files

- Multi-step workflow orchestration

- Agent personality adoption```bash

- Tool call sequencing# Agent validation (12 agents)

npm run test:e2e -- tests/e2e/agent-validation-llm.spec.ts

**Files:**

- **`agent-validation.spec.ts`** - Validates all agents can be loaded# Workflow validation (18 workflows)

- **`workflow-validation.spec.ts`** - Validates all workflows executenpm run test:e2e -- tests/e2e/workflow-validation-llm.spec.ts

- **`agent-workflow-validation.spec.ts`** - Combined agent + workflow validation

# Single agent smoke test

**Run with:**npm run test:e2e -- tests/e2e/single-agent-llm-test.spec.ts

```bash```

npm run test:e2e -- tests/e2e/workflows/

```## Running Tests



**Example test:**```bash

```typescript# Run all E2E tests (no LLM required)

import { describe, it, expect, beforeAll, afterAll } from 'vitest';npm run test:e2e

import { LLMClient } from '../../support/llm-client';

import { MCPClientFixture, createMCPClient } from '../../support/mcp-client-fixture';# Run specific test file

import { startChatConversation, addChatMessage, finalizeChatConversation } from '../../framework/core/test-context';npm run test:e2e -- tests/e2e/bmad-tool.spec.ts

````

describe('Agent Validation', () => {

let llm: LLMClient;## vs LLM Tests

let mcpClient: MCPClientFixture;

| Aspect | E2E Tests (`tests/e2e/`) | LLM Tests (`tests/llm/`) |

beforeAll(async () => {|--------|-------------------------|--------------------------|

    llm = new LLMClient();| **LLM Required** | ❌ No | ✅ Yes (LiteLLM proxy) |

    mcpClient = await createMCPClient();| **Test Focus** | MCP server functionality | LLM behavior, tool calling |

});| **Speed** | Fast (~100ms per test) | Slow (~2s per test) |

| **Cost** | Free | API costs |

afterAll(async () => {| **Use Case** | Validate server logic | Validate AI interactions |

    await mcpClient.cleanup();

});## Test Output

it('should load analyst agent successfully', async () => {### Console Output

    startChatConversation('analyst-validation', 'litellm');

    Each test displays:

    addChatMessage('user', 'Load the analyst agent');

    - 🔍 Test initialization

    const response = await llm.sendMessage(- 📤 Tool calls made

      'Use the bmad tool to load the analyst agent',- ✅ Validation results

      [mcpClient.getTools()]

    );### Test Reports



    addChatMessage('assistant', response.text, { toolCalls: response.toolCalls });Reports are generated in `test-results/`:



    expect(response.toolCalls).toHaveLength(1);- `test-results.json` - Structured JSON data

    expect(response.toolCalls[0].name).toBe('bmad');- `test-report.html` - HTML report with all details

    expect(response.toolCalls[0].arguments.command).toBe('analyst');

    expect(response.text).toContain('Mary');## CI Behavior



    finalizeChatConversation(response.usage.total);E2E tests are **excluded from default CI runs** but can be run manually:

});

});```typescript

```// vitest.config.ts

exclude: [

---  '**/tests/e2e/**',  // Excluded unless RUN_E2E=true

  '**/tests/llm/**',  // Excluded unless RUN_E2E=true

### `conversations/` - Multi-Turn LLM Conversations];

```

Tests LLM conversation flows with context preservation across multiple turns.

**What it tests:**To run in CI:

- Single agent interactions```bash

- Persona adoption (agent personality in responses)RUN_E2E=true npm run test:e2e

- Context preservation across turns```

- Multi-turn tool calling

- Conversation coherence## Troubleshooting

**Files:**### Remote Repository Tests Failing

- **`single-agent.spec.ts`** - Single agent conversation flows

- **`persona-adoption.spec.ts`** - Agent personality adoption in LLM responsesSome tests access external GitHub repositories and may fail due to:

- Network connectivity issues

**Run with:**- GitHub API rate limits

```bash- Repository structure changes

npm run test:e2e -- tests/e2e/conversations/- Access permissions

```

These failures are expected in some environments and don't indicate bugs.

**Example test:**

````typescript### Test Timeouts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { LLMClient } from '../../support/llm-client';Default timeout is 30s. Increase if testing slow remote repositories:

import { MCPClientFixture, createMCPClient } from '../../support/mcp-client-fixture';

import { startChatConversation, addChatMessage, finalizeChatConversation } from '../../framework/core/test-context';```typescript

it('my test', { timeout: 60000 }, async () => {

describe('Persona Adoption', () => {  // test code

  let llm: LLMClient;});

  let mcpClient: MCPClientFixture;```



  beforeAll(async () => {

    llm = new LLMClient();## Troubleshooting

    mcpClient = await createMCPClient();

  });### Remote Repository Tests Failing



  afterAll(async () => {Some tests access external GitHub repositories and may fail due to:

    await mcpClient.cleanup();docker ps | grep litellm

  });

# View logs

  it('should adopt analyst persona after loading agent', async () => {npm run litellm:docker:logs

    startChatConversation('persona-adoption', 'litellm');

    # Restart if needed

    // Turn 1: Load agentnpm run litellm:docker:stop

    addChatMessage('user', 'Load the analyst agent');npm run litellm:docker:start

    const loadResponse = await llm.sendMessage(```

      'Use the bmad tool to load the analyst agent',

      [mcpClient.getTools()]### API Key Issues

    );

    addChatMessage('assistant', loadResponse.text, { toolCalls: loadResponse.toolCalls });Check `tests/support/litellm-config.yaml` has valid API keys for your chosen provider.



    // Turn 2: Check persona adoption### Test Timeouts

    addChatMessage('user', 'Who are you?');

    const personaResponse = await llm.sendMessage(LLM tests have 30s timeout. Slow API responses may cause failures. Check your LiteLLM logs for API rate limits.

      'Who are you?',
      [mcpClient.getTools()]
    );
    addChatMessage('assistant', personaResponse.text);

    expect(personaResponse.text).toContain('Mary');
    expect(personaResponse.text.toLowerCase()).toContain('analyst');

    finalizeChatConversation(loadResponse.usage.total + personaResponse.usage.total);
  });
});
````

---

### `remote-integration/` - LLM + Remote Discovery

Tests LLM discovering and loading agents from remote repositories.

**What it tests:**

- Remote repository discovery via LLM
- Remote agent loading through LLM + MCP
- External GitHub integration
- Dynamic remote installation

**Files:**

- **`remote-discovery.spec.ts`** - LLM discovers and loads remote agents

**Run with:**

```bash
npm run test:e2e -- tests/e2e/remote-integration/
```

**Example test:**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LLMClient } from '../../support/llm-client';
import {
  MCPClientFixture,
  createMCPClient,
} from '../../support/mcp-client-fixture';
import {
  startChatConversation,
  addChatMessage,
  finalizeChatConversation,
} from '../../framework/core/test-context';

describe('Remote Discovery', () => {
  let llm: LLMClient;
  let mcpClient: MCPClientFixture;

  beforeAll(async () => {
    llm = new LLMClient();
    mcpClient = await createMCPClient();
  });

  afterAll(async () => {
    await mcpClient.cleanup();
  });

  it('should discover and load agent from remote repository', async () => {
    startChatConversation('remote-discovery', 'litellm');

    addChatMessage('user', 'Find and load an agent from owner/repo-name');

    const response = await llm.sendMessage(
      'Use the bmad tool to discover and load agents from owner/repo-name on GitHub',
      [mcpClient.getTools()],
    );

    addChatMessage('assistant', response.text, {
      toolCalls: response.toolCalls,
    });

    expect(response.toolCalls.length).toBeGreaterThan(0);
    expect(response.text).toContain('discovered');

    finalizeChatConversation(response.usage.total);
  });
});
```

---

## Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e
# OR (alias)
npm run test:llm

# Run specific subdirectory
npm run test:e2e -- tests/e2e/workflows/
npm run test:e2e -- tests/e2e/conversations/
npm run test:e2e -- tests/e2e/remote-integration/

# Run single test file
npm run test:e2e -- tests/e2e/workflows/agent-validation.spec.ts

# Run single test by name
npm run test:e2e -- -t "should load analyst agent"

# Run with verbose output
npm run test:e2e -- --reporter=verbose
```

---

## Test Data Capture

E2E tests automatically capture rich context:

### Chat Conversations

- **Role**: user, assistant, tool
- **Content**: Message text
- **Tool calls**: Name, arguments, results
- **Timestamps**: Message timing

### Token Usage

- **Prompt tokens**: Input tokens consumed
- **Completion tokens**: Output tokens generated
- **Total tokens**: Combined usage
- **Cost**: Estimated cost (if configured)

### Provider Info

- **Model**: LLM model used (e.g., gpt-4o)
- **Provider**: Service (litellm, openai, anthropic)
- **Endpoint**: API endpoint URL

### Test Metadata

- **Duration**: Test execution time
- **Status**: passed, failed, skipped
- **Errors**: Stack traces, error messages
- **Screenshots**: (if applicable - future enhancement)

**View reports:**

```bash
open test-results/test-results.html
```

---

## Writing E2E Tests

### Basic Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LLMClient } from '../../support/llm-client';
import {
  MCPClientFixture,
  createMCPClient,
} from '../../support/mcp-client-fixture';
import {
  startChatConversation,
  addChatMessage,
  finalizeChatConversation,
} from '../../framework/core/test-context';

describe('E2E Feature', () => {
  let llm: LLMClient;
  let mcpClient: MCPClientFixture;

  beforeAll(async () => {
    llm = new LLMClient();
    mcpClient = await createMCPClient();
  });

  afterAll(async () => {
    await mcpClient.cleanup();
  });

  it('should complete user workflow', async () => {
    // Start conversation tracking
    startChatConversation('workflow-name', 'litellm');

    // User message
    addChatMessage('user', 'User request here');

    // LLM processes request
    const response = await llm.sendMessage('Instruction to LLM', [
      mcpClient.getTools(),
    ]);

    // Log assistant response
    addChatMessage('assistant', response.text, {
      toolCalls: response.toolCalls,
    });

    // Assertions
    expect(response.toolCalls).toHaveLength(1);
    expect(response.text).toContain('expected output');

    // Finalize with token usage
    finalizeChatConversation(response.usage.total);
  });
});
```

### Multi-Turn Conversation Template

```typescript
it('should handle multi-turn conversation', async () => {
  startChatConversation('multi-turn', 'litellm');

  let totalTokens = 0;

  // Turn 1
  addChatMessage('user', 'First request');
  const response1 = await llm.sendMessage('First instruction', [
    mcpClient.getTools(),
  ]);
  addChatMessage('assistant', response1.text, {
    toolCalls: response1.toolCalls,
  });
  totalTokens += response1.usage.total;

  // Turn 2
  addChatMessage('user', 'Follow-up request');
  const response2 = await llm.sendMessage('Second instruction', [
    mcpClient.getTools(),
  ]);
  addChatMessage('assistant', response2.text);
  totalTokens += response2.usage.total;

  expect(response2.text).toContain('expected');

  finalizeChatConversation(totalTokens);
});
```

---

## Best Practices

1. **Start LiteLLM proxy first** - Tests will fail without it
2. **Use descriptive conversation IDs** - Helps in debugging reports
3. **Track all turns** - Use `addChatMessage()` for every message
4. **Accumulate token usage** - Sum tokens across all turns
5. **Test critical paths only** - E2E tests are expensive
6. **Set appropriate timeouts** - LLM calls can be slow (30s - 5min)
7. **Clean up resources** - Always use `afterAll()` hooks
8. **Review HTML reports** - Check conversation flows visually
9. **Monitor costs** - Track token usage in reports
10. **Handle flakiness** - LLM responses can vary, test behavior not exact text

---

## Troubleshooting

### LiteLLM Proxy Not Running

```bash
# Check proxy health
npm run test:litellm-health

# Start proxy
npm run test:litellm-start

# Check Docker containers
docker ps | grep litellm
```

### Test Timeouts

```typescript
// Increase timeout for slow LLM calls
it('should complete slow workflow', async () => {
  // test code
}, 300000); // 5 minutes
```

### Token Limit Exceeded

```bash
# Check usage in test reports
open test-results/test-results.html

# Reduce test scope or use smaller model
# Edit tests/support/litellm-config.yaml
```

### API Rate Limits

```bash
# Add delays between tests
await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay

# Run fewer tests in parallel
npm run test:e2e -- --maxWorkers=1
```

---

## Cost Management

E2E tests consume real LLM tokens. Monitor usage:

1. **Review reports**: Check `test-results/test-results.html` for token counts
2. **Use cheaper models**: Configure in `tests/support/litellm-config.yaml`
3. **Run selectively**: Don't run all E2E tests on every commit
4. **CI optimization**: Run E2E tests only on main branch or PRs

**Estimated costs** (GPT-4o):

- Agent validation: ~100 tokens/test (~$0.001)
- Workflow validation: ~500 tokens/test (~$0.005)
- Multi-turn conversations: ~1000 tokens/test (~$0.01)

---

## Related Documentation

- [Unit Tests](../unit/README.md)
- [Integration Tests](../integration/README.md)
- [LLM Setup Guide](../LLM-SETUP.md)
- [LiteLLM Configuration](../support/litellm-config.yaml)
- [Main Test README](../README.md)
