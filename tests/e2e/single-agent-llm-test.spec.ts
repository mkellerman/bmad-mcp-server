/**
 * Single Agent LLM Test
 * Quick validation that LLM integration works for agent loading
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  MCPClientFixture,
  createMCPClient,
} from '../support/mcp-client-fixture';
import { LLMClient } from './framework/llm-client';
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'test-results', 'agent-logs');
const LLM_MODEL = 'gpt-4.1';
const LLM_TEMPERATURE = 0.1;

function writeLog(filename: string, content: string): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const logPath = path.join(LOG_DIR, filename);
  fs.writeFileSync(logPath, content, 'utf-8');
}

describe('Single Agent LLM Integration Test', () => {
  let mcpClient: MCPClientFixture;
  let llmClient: LLMClient;

  beforeAll(async () => {
    // Skip LLM tests in CI environment (no LiteLLM available)
    if (process.env.CI) {
      console.log('⏭️  Skipping LLM tests in CI environment');
      return;
    }

    mcpClient = await createMCPClient();
    llmClient = new LLMClient();

    const isHealthy = await llmClient.healthCheck();
    if (!isHealthy) {
      throw new Error('❌ LiteLLM proxy not running!');
    }
  });

  afterAll(async () => {
    await mcpClient.cleanup();
  });

  it('should load analyst agent through LLM and log response', async () => {
    if (process.env.CI) {
      console.log('⏭️  Skipping in CI');
      return;
    }

    const agentName = 'analyst';

    console.log(`\n🔍 Testing ${agentName} through LLM...`);

    // Define the BMAD tool
    const bmadTool = {
      type: 'function',
      function: {
        name: 'mcp_bmad_bmad',
        description:
          'Unified BMAD tool. To load an agent, pass the agent name as the command parameter. Example: {command: "analyst"} loads the analyst agent.',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description:
                'The agent name (e.g., "analyst", "debug", "architect"). Just the name, not "load analyst agent".',
            },
          },
          required: ['command'],
        },
      },
    };

    // Ask LLM to load the agent
    const completion = await llmClient.chat(
      LLM_MODEL,
      [
        {
          role: 'system',
          content:
            'You are a helpful assistant. When asked to load an agent, use the mcp_bmad_bmad tool with JUST the agent name as the command parameter. For example, to load the analyst agent, call mcp_bmad_bmad with command="analyst".',
        },
        {
          role: 'user',
          content: `Use the tool to load the ${agentName} agent`,
        },
      ],
      {
        temperature: LLM_TEMPERATURE,
        tools: [bmadTool],
      },
    );

    // Get tool calls
    const toolCalls = llmClient.getToolCalls(completion);
    console.log(`Tool calls: ${toolCalls.length}`);

    let finalResponse = '';

    if (toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      const toolFunc = 'function' in toolCall ? toolCall.function : null;

      if (toolFunc) {
        const args = JSON.parse(toolFunc.arguments);
        console.log(`Tool args: ${JSON.stringify(args)}`);

        // Execute the tool
        const toolResult = await mcpClient.callTool('bmad', args);
        console.log(`Tool result length: ${toolResult.content.length} chars`);

        // Send result back to LLM
        const followUp = await llmClient.chat(
          LLM_MODEL,
          [
            {
              role: 'system',
              content: 'You are a helpful assistant.',
            },
            {
              role: 'user',
              content: `Load the ${agentName} agent`,
            },
            {
              role: 'assistant',
              content: null,
              tool_calls: [toolCall],
            },
            {
              role: 'tool',
              content: toolResult.content,
              tool_call_id: toolCall.id,
            },
          ],
          {
            temperature: LLM_TEMPERATURE,
          },
        );

        finalResponse = llmClient.getResponseText(followUp);
      }
    } else {
      finalResponse = llmClient.getResponseText(completion);
    }

    console.log(`\nLLM Response length: ${finalResponse.length} chars`);
    console.log(`First 200 chars: ${finalResponse.substring(0, 200)}`);

    // Write log
    const logContent = `USER: #mcp_bmad_bmad ${agentName}\n\nSYSTEM: ${finalResponse}\n\nTEST ANALYSIS: ${finalResponse.length > 0 ? 'Response received' : 'No response'}`;

    const logPath = path.join(LOG_DIR, `${agentName}_test.log`);
    writeLog(`${agentName}_test.log`, logContent);

    console.log(`Log directory: ${LOG_DIR}`);
    console.log(`Log path: ${logPath}`);
    console.log(`Log file exists: ${fs.existsSync(logPath)}`);

    expect(finalResponse.length).toBeGreaterThan(0);
    console.log(`✅ Test complete - log written to ${agentName}_test.log`);
  });
});
