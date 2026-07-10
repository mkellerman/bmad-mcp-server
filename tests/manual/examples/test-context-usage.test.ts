/**
 * Example: How to add rich LLM interaction data to tests
 *
 * This example demonstrates how to use the test context system
 * to attach LLM interactions, agent logs, and other rich data
 * that will appear in the HTML test report.
 */

import { describe, it, expect } from 'vitest';
import {
  addLLMInteraction,
  setBehavior,
} from '../../framework/core/test-context.js';

describe('LLM Test Context Example', () => {
  it('should capture LLM interaction data', () => {
    // Your actual test code...
    const userPrompt = 'What is 2+2?';
    const llmResponse = 'The answer is 4';

    // Record the LLM interaction for the report
    addLLMInteraction({
      id: 'interaction-1',
      timestamp: new Date().toISOString(),
      prompt: userPrompt,
      systemMessage: 'You are a helpful math assistant.',
      provider: {
        name: 'openai',
        model: 'gpt-4',
      },
      toolCalls: [
        {
          name: 'calculate',
          arguments: { expression: '2+2' },
          result: 4,
          timestamp: new Date().toISOString(),
          duration: 50,
        },
      ],
      response: llmResponse,
      duration: 150,
      tokenUsage: {
        prompt: 20,
        completion: 10,
        total: 30,
      },
    });

    // Set expected vs actual behavior
    setBehavior(
      'Should correctly answer math questions',
      'Correctly answered with "The answer is 4"',
    );

    // Your assertions
    expect(llmResponse).toContain('4');
  });
});
