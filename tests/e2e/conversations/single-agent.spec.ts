/**
 * E2E Test: Single Agent LLM Integration
 * Quick validation that LLM integration works for agent loading
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  MCPClientFixture,
  createMCPClient,
} from '../../support/mcp-client-fixture';
import { LLMClient } from '../../support/llm-client';
import {
  startChatConversation,
  addChatMessage,
  finalizeChatConversation,
} from '../../framework/core/test-context.js';
import { verifyLiteLLMRunning } from '../../support/litellm-helper.mjs';

const LLM_MODEL = 'gpt-4.1';
const LLM_TEMPERATURE = 0.1;

// Skip test suite if explicitly disabled
// Default to localhost:4000 if LITELLM_PROXY_URL not explicitly set
const skipE2E = process.env.SKIP_LLM_TESTS === 'true';

describe.skipIf(skipE2E)('Single Agent LLM Integration Test', () => {
  let mcpClient: MCPClientFixture;
  let llmClient: LLMClient;

  beforeAll(async () => {
    mcpClient = await createMCPClient();
    llmClient = new LLMClient();

    // Verify LiteLLM is running (global setup should have started it)
    await verifyLiteLLMRunning(() => llmClient.healthCheck());
  });

  afterAll(async () => {
    await mcpClient.cleanup();
  });

  it('should load analyst agent through LLM and log response', async () => {
    const agentName = 'analyst';

    console.log(`\n🔍 Testing ${agentName} through LLM...`);

    // Start capturing the chat conversation
    await startChatConversation(`single-agent-${agentName}`, {
      name: 'litellm',
      model: LLM_MODEL,
    });

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

    // System message
    const systemMessage =
      'You are a helpful assistant. When asked to load an agent, use the mcp_bmad_bmad tool with JUST the agent name as the command parameter. For example, to load the analyst agent, call mcp_bmad_bmad with command="analyst".';
    await addChatMessage('system', systemMessage);

    // User message
    const userMessage = `Use the tool to load the ${agentName} agent`;
    await addChatMessage('user', userMessage);

    // Ask LLM to load the agent
    const completion = await llmClient.chat(
      LLM_MODEL,
      [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: userMessage,
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
    let totalTokens = {
      prompt: completion.usage?.prompt_tokens || 0,
      completion: completion.usage?.completion_tokens || 0,
      total: completion.usage?.total_tokens || 0,
    };

    if (toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      const toolFunc = 'function' in toolCall ? toolCall.function : null;

      if (toolFunc) {
        const args = JSON.parse(toolFunc.arguments);
        console.log(`Tool args: ${JSON.stringify(args)}`);

        // Assistant message with tool call
        const toolStartTime = Date.now();
        await addChatMessage('assistant', null, {
          toolCalls: [
            {
              name: 'mcp_bmad_bmad',
              arguments: args,
              timestamp: new Date().toISOString(),
              duration: 0, // Will be updated after execution
            },
          ],
        });

        // Execute the tool
        const toolResult = await mcpClient.callTool('bmad', args);
        Date.now() - toolStartTime; // Tool execution time
        console.log(`Tool result length: ${toolResult.content.length} chars`);

        // Tool result message
        await addChatMessage('tool', toolResult.content, {
          toolCallId: toolCall.id,
        });

        // Send result back to LLM
        const followUp = await llmClient.chat(
          LLM_MODEL,
          [
            {
              role: 'system',
              content: systemMessage,
            },
            {
              role: 'user',
              content: userMessage,
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

        // Final assistant response
        await addChatMessage('assistant', finalResponse);

        // Add follow-up tokens to total
        totalTokens.prompt += followUp.usage?.prompt_tokens || 0;
        totalTokens.completion += followUp.usage?.completion_tokens || 0;
        totalTokens.total += followUp.usage?.total_tokens || 0;
      }
    } else {
      finalResponse = llmClient.getResponseText(completion);
      await addChatMessage('assistant', finalResponse);
    }

    console.log(`\nLLM Response length: ${finalResponse.length} chars`);
    console.log(`First 200 chars: ${finalResponse.substring(0, 200)}`);

    // Finalize the chat conversation
    await finalizeChatConversation(totalTokens);

    expect(finalResponse.length).toBeGreaterThan(0);
    console.log(`✅ Test complete`);
  });
});
