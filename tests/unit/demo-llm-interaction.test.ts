/**
 * Demo LLM Interaction Test
 * Shows how console output captures LLM-style interactions
 */

import { describe, it, expect } from 'vitest';

describe('Demo LLM Interaction', () => {
  it('should simulate an LLM conversation', async () => {
    // Simulate user prompt
    const userPrompt = 'What is the capital of France?';
    console.log(`[USER PROMPT]\n${userPrompt}\n`);

    // Simulate LLM processing
    console.log('[LLM PROCESSING]');
    console.log('Model: gpt-4.1');
    console.log('Temperature: 0.7');
    console.log('Max Tokens: 1000\n');

    // Simulate tool call
    console.log('[TOOL CALL]');
    console.log('Function: search_knowledge_base');
    console.log('Arguments: { query: "capital of France" }');
    console.log('Duration: 245ms\n');

    // Simulate tool result
    console.log('[TOOL RESULT]');
    console.log('Status: Success');
    console.log(
      'Data: { capital: "Paris", country: "France", population: "2.2M" }\n',
    );

    // Simulate LLM response
    const llmResponse =
      'The capital of France is Paris, which has a population of approximately 2.2 million people.';
    console.log(`[LLM RESPONSE]\n${llmResponse}\n`);

    // Simulate token usage
    console.log('[METRICS]');
    console.log('Prompt Tokens: 45');
    console.log('Completion Tokens: 28');
    console.log('Total Tokens: 73');
    console.log('Duration: 1.2s');

    expect(llmResponse).toContain('Paris');
  });

  it('should simulate multi-turn conversation', async () => {
    // Turn 1
    console.log('=== TURN 1 ===\n');
    console.log('[USER] Tell me a short joke');
    console.log(
      '[ASSISTANT] Why did the developer go broke? Because they used up all their cache!\n',
    );

    // Turn 2
    console.log('=== TURN 2 ===\n');
    console.log("[USER] That's funny! Tell me another one about programming");
    console.log(
      '[ASSISTANT] Why do programmers prefer dark mode? Because light attracts bugs!\n',
    );

    // Turn 3
    console.log('=== TURN 3 ===\n');
    console.log('[USER] Haha, one more!');
    console.log(
      "[ASSISTANT] How many programmers does it take to change a light bulb? None, that's a hardware problem!",
    );

    expect(true).toBe(true);
  });

  it('should show error handling flow', async () => {
    console.log('[USER PROMPT]');
    console.log('Prompt: Calculate the square root of -1\n');

    console.log('[TOOL CALL]');
    console.log('Function: calculator');
    console.log('Arguments: { operation: "sqrt", value: -1 }\n');

    console.error('[TOOL ERROR]');
    console.error('Error: Cannot calculate square root of negative number');
    console.error('Code: MATH_DOMAIN_ERROR\n');

    console.log('[LLM RESPONSE]');
    console.log(
      'I apologize, but I cannot calculate the square root of a negative number using real numbers.',
    );
    console.log(
      'However, in complex numbers, the square root of -1 is represented as "i" (the imaginary unit).',
    );

    expect(true).toBe(true);
  });

  it('should show structured data output', async () => {
    const request = {
      user: 'alice@example.com',
      task: 'Create new project',
      priority: 'high',
    };

    console.log('[REQUEST]');
    console.log(JSON.stringify(request, null, 2));
    console.log('');

    const response = {
      status: 'success',
      projectId: 'proj-12345',
      createdAt: new Date().toISOString(),
      assignedTo: 'alice@example.com',
      metadata: {
        estimatedDuration: '2 weeks',
        teamSize: 3,
      },
    };

    console.log('[RESPONSE]');
    console.log(JSON.stringify(response, null, 2));

    expect(response.status).toBe('success');
  });
});
