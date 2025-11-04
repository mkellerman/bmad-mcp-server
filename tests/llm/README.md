# LLM Integration Tests

This directory contains tests that interact with Large Language Models through the LiteLLM proxy.

## Overview

**LLM tests** validate the BMAD MCP server's behavior when used by actual AI assistants. These tests:

- Require LiteLLM proxy running (`npm run test:litellm-start`)
- Make real API calls to LLMs (GPT-4, etc.)
- Test agent loading, workflow execution, and tool calling
- Validate LLM understanding and responses

## Test Structure

```
tests/llm/
├── agent-validation-llm.spec.ts       # Validates all agents with persona/menu
├── agent-workflow-validation.spec.ts  # Comprehensive agent+workflow tests
├── persona-adoption.spec.ts           # Tests persona adoption behavior
├── remote-discovery-llm.spec.ts       # Remote repository discovery
├── single-agent-llm-test.spec.ts      # Simple single agent test
└── workflow-validation-llm.spec.ts    # Validates all workflows
```

## Running Tests

```bash
# Start LiteLLM proxy (required)
npm run test:litellm-start

# Run all LLM tests
npm run test:llm

# Run specific test file
npm run test:llm -- tests/llm/agent-validation-llm.spec.ts

# Stop LiteLLM proxy
npm run test:litellm-stop
```

## Test Coverage

### Agent Validation (`agent-validation-llm.spec.ts`)

- Dynamically discovers all available agents
- Loads each agent through LLM tool calling
- Validates persona adoption (e.g., "Winston" for architect)
- Checks for menu/command lists in responses

### Workflow Validation (`workflow-validation-llm.spec.ts`)

- Discovers all workflows
- Executes workflows through LLM
- Validates workflow content delivery

### Comprehensive Tests (`agent-workflow-validation.spec.ts`)

- Discovery commands (`*list-agents`, `*list-workflows`)
- All agents with detailed validation
- All workflows with logging
- Agent-to-workflow command validation

## Adding New Tests

Create a new TypeScript test file in `tests/llm/`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  MCPClientFixture,
  createMCPClient,
} from '../support/mcp-client-fixture';
import { LLMClient } from './llm-client';

describe('My LLM Test', () => {
  let llmClient: LLMClient;
  let mcpClient: MCPClientFixture;

  beforeAll(async () => {
    llmClient = new LLMClient();
    mcpClient = await createMCPClient();

    const isHealthy = await llmClient.healthCheck();
    if (!isHealthy) {
      throw new Error('❌ LiteLLM proxy is not running!');
    }
  });

  afterAll(async () => {
    await mcpClient.cleanup();
  });

  it('should do something', async () => {
    // Define BMAD tool for LLM
    const bmadTool = {
      type: 'function',
      function: {
        name: 'mcp_bmad_bmad',
        description: 'BMAD tool for loading agents and workflows',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Agent name or *workflow-name',
            },
          },
          required: ['command'],
        },
      },
    };

    // Ask LLM to use the tool
    const completion = await llmClient.chat(
      'gpt-4.1',
      [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Load the analyst agent' },
      ],
      { temperature: 0.1, tools: [bmadTool] },
    );

    // Get tool calls and execute them
    const toolCalls = llmClient.getToolCalls(completion);
    expect(toolCalls.length).toBeGreaterThan(0);

    const toolCall = toolCalls[0];
    const args = JSON.parse(toolCall.function.arguments);

    // Execute MCP tool
    const result = await mcpClient.callTool('bmad', args);

    // Validate result
    expect(result.content).toBeDefined();
  });
});
```

## vs E2E Tests

| Aspect           | LLM Tests (`tests/llm/`)   | E2E Tests (`tests/e2e/`) |
| ---------------- | -------------------------- | ------------------------ |
| **LLM Required** | ✅ Yes (LiteLLM proxy)     | ❌ No                    |
| **Test Focus**   | LLM behavior, tool calling | MCP server functionality |
| **Speed**        | Slow (~2s per test)        | Fast (~100ms per test)   |
| **Cost**         | API costs                  | Free                     |
| **Use Case**     | Validate AI interactions   | Validate server logic    |

## Environment Variables

- `LITELLM_PROXY_URL` - LiteLLM endpoint (default: `http://localhost:4000`)
- `LITELLM_PROXY_API_KEY` - API key (default: `sk-test-bmad-1234`)
- `RUN_E2E=true` - Required to run LLM tests

## Troubleshooting

**Tests fail with connection error:**

```bash
# Check LiteLLM is running
npm run test:litellm-health

# Start if not running
npm run test:litellm-start
```

**LiteLLM not responding:**

```bash
# Check logs
npm run test:litellm-logs

# Restart
npm run test:litellm-stop
npm run test:litellm-start
```

**Tests timeout:**

- LLM tests can take 1-5 seconds each
- Increase timeout in test or config
- Check LiteLLM proxy performance
