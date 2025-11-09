/**
 * Example: Using LLM Helper
 *
 * This example demonstrates how to use the LLM Helper to test
 * LLM interactions and automatically capture metadata.
 *
 * The LLM Helper handles:
 * - Making requests to LiteLLM proxy
 * - Automatically capturing prompts, responses, and timing
 * - Recording token usage
 * - Managing conversation history
 * - Executing tool calls
 *
 * All metadata is captured automatically and can be retrieved with
 * getInteractions() for use in test reporters.
 */

import { describe, it, expect } from 'vitest';
import { LLMHelper } from '../../framework/helpers/llm-helper.js';
import {
  validateXML,
  extractTagContent,
} from '../../framework/helpers/xml-validator.js';

describe('LLM Helper Example', () => {
  it('should test LLM chat interaction with automatic metadata capture', async () => {
    // Skip if LiteLLM is not running (for CI)
    const liteLLMRunning = await checkLiteLLM();
    if (!liteLLMRunning) {
      console.log('⚠️  LiteLLM not running, skipping test');
      return;
    }

    // Create LLM helper
    const llm = new LLMHelper({
      baseURL: 'http://localhost:4000',
      model: 'gpt-4.1',
      systemMessage: 'You are a helpful assistant that answers concisely.',
    });

    // Make a simple request
    const response = await llm.chat(
      'What is 2+2? Answer with just the number.',
    );

    // Assertions
    expect(response.content).toContain('4');

    // Get interactions (automatically captured!)
    const interactions = llm.getInteractions();
    expect(interactions).toHaveLength(1);
    expect(interactions[0].prompt).toBe(
      'What is 2+2? Answer with just the number.',
    );
    expect(interactions[0].provider.model).toBe('gpt-4.1');
    expect(interactions[0].tokenUsage).toBeDefined();

    console.log(`✅ Test passed! Response: ${response.content}`);
    console.log(`📊 Token usage: ${JSON.stringify(llm.getTotalTokenUsage())}`);
    console.log(`⏱️  Duration: ${llm.getTotalDuration()}ms`);
  });

  it('should test XML-structured LLM response', async () => {
    const liteLLMRunning = await checkLiteLLM();
    if (!liteLLMRunning) {
      console.log('⚠️  LiteLLM not running, skipping test');
      return;
    }

    // Create LLM helper with XML instruction
    const llm = new LLMHelper({
      baseURL: 'http://localhost:4000',
      model: 'gpt-4.1',
      systemMessage: `You must respond using XML tags.
Format your response as:
<instructions>Internal reasoning goes here</instructions>
<content>User-facing content goes here</content>`,
    });

    // Request
    const response = await llm.chat(
      'Explain what 2+2 equals and why. Keep it brief.',
    );

    // Validate XML structure
    const xmlValidation = validateXML(response.content, [
      'instructions',
      'content',
    ]);

    // Extract content
    const userContent = xmlValidation.valid
      ? extractTagContent(response.content, 'content')
      : null;

    // Assertions
    expect(xmlValidation.valid).toBe(true);
    expect(userContent).toBeTruthy();
    expect(xmlValidation.instructionLeakage).toBe(false);

    // Check interactions
    const interactions = llm.getInteractions();
    expect(interactions).toHaveLength(1);
    expect(interactions[0].systemMessage).toContain('XML tags');

    console.log(`✅ XML validation passed!`);
    console.log(`📄 User content: ${userContent}`);
  });

  it('should test LLM with tool calls', async () => {
    const liteLLMRunning = await checkLiteLLM();
    if (!liteLLMRunning) {
      console.log('⚠️  LiteLLM not running, skipping test');
      return;
    }

    // Create LLM helper with tool
    const llm = new LLMHelper({
      baseURL: 'http://localhost:4000',
      model: 'gpt-4.1',
      systemMessage: 'You are a helpful assistant with access to a calculator.',
      tools: [
        {
          type: 'function',
          function: {
            name: 'calculate',
            description: 'Perform arithmetic operations',
            parameters: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: ['add', 'subtract', 'multiply', 'divide'],
                },
                a: { type: 'number' },
                b: { type: 'number' },
              },
              required: ['operation', 'a', 'b'],
            },
          },
        },
      ],
    });

    // Request that should trigger tool call
    const response = await llm.chat('What is 15 multiplied by 3?');

    // Check if tool was called
    const toolCalled = response.toolCalls.length > 0;

    // Execute tool if called
    let finalResponse = response.content;
    if (toolCalled) {
      const toolCall = response.toolCalls[0];

      // Execute the tool
      const result = await llm.executeTool(toolCall, async (args) => {
        const { operation, a, b } = args as {
          operation: string;
          a: number;
          b: number;
        };
        switch (operation) {
          case 'multiply':
            return a * b;
          case 'add':
            return a + b;
          case 'subtract':
            return a - b;
          case 'divide':
            return b !== 0 ? a / b : 'Error: Division by zero';
          default:
            return 'Unknown operation';
        }
      });

      // Verify tool result
      expect(result).toBe(45);

      // Continue conversation with tool result would go here
      // (skipped for simplicity in this example)
    }

    // Assertions
    expect(toolCalled || finalResponse.includes('45')).toBe(true);

    // Check interactions
    const interactions = llm.getInteractions();
    expect(interactions.length).toBeGreaterThan(0);
    if (toolCalled) {
      expect(interactions[0].toolCalls).toHaveLength(1);
      expect(interactions[0].toolCalls[0].name).toBe('calculate');
    }

    console.log(`✅ Tool test passed!`);
    console.log(`🔧 Tool called: ${toolCalled}`);
    console.log(`📝 Final response: ${finalResponse}`);
  });
});

/**
 * Check if LiteLLM is running
 */
async function checkLiteLLM(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:4000/health', {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}
