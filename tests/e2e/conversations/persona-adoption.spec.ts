import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  MCPClientFixture,
  createMCPClient,
} from '../../support/mcp-client-fixture';
import { LLMClient } from '../../support/llm-client';
import { addLLMInteraction } from '../../framework/core/test-context.js';
import { ensureLiteLLMRunning } from '../../support/litellm-helper';

/**
 * E2E Test: Persona adoption with LLM
 *
 * Flow:
 * 1) Load an agent via MCP tool (architect)
 * 2) Send the agent content to an LLM
 * 3) Verify the LLM adopts the persona correctly
 *
 * Requires: LiteLLM proxy running (skip if unavailable)
 */

const skipE2E = process.env.SKIP_LLM_TESTS === 'true';

describe.skipIf(skipE2E)('Persona adoption', () => {
  let mcpClient: MCPClientFixture;
  let llm: LLMClient;

  beforeAll(async () => {
    // Start MCP client
    mcpClient = await createMCPClient();

    // Init LLM client and ensure it's running
    llm = new LLMClient();
    await ensureLiteLLMRunning(() => llm.healthCheck());
  });

  afterAll(async () => {
    await mcpClient.cleanup();
  });

  it('should respond in persona after loading architect', async () => {
    // 1) Load the architect agent via MCP tool
    const load = await mcpClient.callTool('bmad', { command: 'architect' });
    expect(load.isError).toBe(false);
    expect(load.content).toContain('BMAD Agent');

    // 2) Ask the LLM a question with the agent content as system context
    const completion = await llm.chat(
      process.env.LLM_MODEL || 'gpt-4.1',
      [
        { role: 'system', content: load.content },
        {
          role: 'user',
          content: 'What is your name and what are your duties?',
        },
      ],
      { temperature: 0.1, max_tokens: 200 },
    );

    const answer = llm.getResponseText(completion);

    // 3) Validate the reply reflects the persona from sample assets
    // Architect sample (v6) uses name="Winston" and role includes "System Architect"
    expect(answer.toLowerCase()).toContain('winston');
    expect(answer.toLowerCase()).toMatch(
      /architect|system architect|technical design/,
    );

    // Capture LLM interaction for HTML report
    await addLLMInteraction({
      id: 'persona-adoption-architect',
      timestamp: new Date().toISOString(),
      prompt: 'What is your name and what are your duties?',
      response: answer,
      provider: {
        name: 'litellm',
        model: process.env.LLM_MODEL || 'gpt-4.1',
      },
      toolCalls: [
        {
          name: 'mcp_bmad_bmad',
          arguments: { command: 'architect' },
          timestamp: new Date().toISOString(),
          duration: 0,
          result: load.content,
        },
      ],
      tokenUsage: {
        prompt: completion.usage?.prompt_tokens || 0,
        completion: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0,
      },
      duration: 0,
    });
  }, 45000);
});
