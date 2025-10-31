import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  MCPClientFixture,
  createMCPClient,
} from '../support/mcp-client-fixture';
import { LLMClient } from './framework/llm-client';

/**
 * E2E: Persona adoption smoke test
 *
 * Flow:
 * 1) Load an agent via MCP tool (architect)
 * 2) Feed the returned agent content to the LLM as a system message
 * 3) Ask: "What is your name and what are your duties?"
 * 4) Validate the reply reflects the loaded persona (name + role)
 *
 * Note: This test requires the LiteLLM proxy running. If it's not running,
 * the test will be skipped without failing the suite.
 */

describe('Persona adoption', () => {
  let mcpClient: MCPClientFixture;
  let llm: LLMClient;
  let healthy = false;

  beforeAll(async () => {
    // Start MCP client
    mcpClient = await createMCPClient();

    // Init LLM client and check health
    llm = new LLMClient();
    healthy = await llm.healthCheck();
  });

  afterAll(async () => {
    await mcpClient.cleanup();
  });

  it('should respond in persona after loading architect', async () => {
    if (!healthy) {
      // Skip when LiteLLM proxy is not running
      console.warn(
        '⚠️  Skipping persona adoption test: LiteLLM proxy not running',
      );
      expect(true).toBe(true);
      return;
    }

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
  }, 45000);
});
