/**
 * Real LLM Evaluation Test (Optional)
 *
 * Tests actual LLM-as-judge evaluation with real API calls.
 * Skipped if OPENAI_API_KEY is not set.
 *
 * To run: OPENAI_API_KEY=sk-... npm test -- real-llm-evaluation
 */

import { describe, it, expect } from 'vitest';
import { evaluateTest } from '../helpers/llm-evaluation';
import { createRankingCriteria } from '../fixtures/evaluation-prompts';
import type { MCPResponse } from '../helpers/llm-evaluation/types';

// Skip if no API key
const skipIfNoApiKey =
  !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-dummy-key';

describe.skipIf(skipIfNoApiKey)('Real LLM Evaluation', () => {
  it('🤖 Should evaluate response quality with real judge LLM', async () => {
    // Create a mock response that should score well
    const response: MCPResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            model: 'gpt-4-turbo',
            workflows: [
              {
                name: 'create-ux-design',
                score: 0.95,
                reasoning: 'Directly addresses UX design needs for mobile apps',
              },
              {
                name: 'product-brief',
                score: 0.88,
                reasoning: 'Helps define product requirements before design',
              },
              {
                name: 'brainstorm-project',
                score: 0.82,
                reasoning: 'Useful for ideation phase of app development',
              },
              {
                name: 'create-epics-and-stories',
                score: 0.75,
                reasoning: 'Good for planning development work',
              },
              {
                name: 'prd',
                score: 0.7,
                reasoning: 'Helps document requirements',
              },
            ],
          }),
        },
      ],
      isError: false,
    };

    // Evaluate with ranking criteria
    const criteria = createRankingCriteria(
      'Help me design a mobile app with great user experience',
      'UX/UI Design',
      ['create-ux-design', 'product-brief'],
    );

    console.log('\n🤖 Calling real judge LLM...');
    console.log('   (This will make an actual API call and incur costs)');

    const result = await evaluateTest('real-llm-test', response, criteria, {
      logVerbose: true,
    });

    expect(result).toBeDefined();
    expect(result?.passed).toBeDefined();
    expect(result?.selectedSample.score).toBeGreaterThan(0);

    console.log('\n✅ Real LLM Evaluation Complete:');
    console.log(`   Score: ${result?.selectedSample.score}/100`);
    console.log(`   Passed: ${result?.passed ? '✅' : '❌'}`);
    console.log(`   Model: ${result?.selectedSample.metadata.model}`);
    console.log(
      `   Input tokens: ${result?.selectedSample.metadata.inputTokens}`,
    );
    console.log(
      `   Output tokens: ${result?.selectedSample.metadata.outputTokens}`,
    );
    console.log(`   Cost: $${result?.selectedSample.metadata.cost.toFixed(4)}`);
    console.log(`\n💭 Reasoning: ${result?.selectedSample.reasoning}`);
  }, 30000); // 30 second timeout for API call

  it('🔍 Should handle malformed responses gracefully', async () => {
    // Create a response that's harder to evaluate
    const response: MCPResponse = {
      content: [
        {
          type: 'text',
          text: 'This is not JSON, just plain text with some workflows mentioned',
        },
      ],
      isError: false,
    };

    const criteria = createRankingCriteria('Test query', 'Testing', [
      'workflow-1',
      'workflow-2',
    ]);

    console.log('\n🔍 Testing error handling with malformed response...');

    const result = await evaluateTest(
      'malformed-response-test',
      response,
      criteria,
      {
        logVerbose: false,
      },
    );

    // Should handle gracefully
    expect(result).toBeDefined();
    console.log(
      `   Result: ${result?.passed ? 'Passed' : 'Failed'} (${result?.selectedSample.score}/100)`,
    );
  }, 30000);
});

describe('Real LLM Evaluation (Skipped)', () => {
  it.skipIf(!skipIfNoApiKey)('⚠️  Skipping - OPENAI_API_KEY not set', () => {
    // This test runs only if API key IS set, to show the message
    expect(true).toBe(true);
  });

  it.skipIf(skipIfNoApiKey)('ℹ️  Real LLM tests require API key', () => {
    console.log('\n' + '═'.repeat(80));
    console.log('⚠️  REAL LLM EVALUATION TESTS SKIPPED');
    console.log('═'.repeat(80));
    console.log('\nTo run these tests, set your OpenAI API key:');
    console.log('   OPENAI_API_KEY=sk-... npm test -- real-llm-evaluation');
    console.log('\nSupported providers:');
    console.log('   • OpenAI (default)');
    console.log('   • Azure OpenAI (set OPENAI_BASE_URL)');
    console.log('   • OpenAI-compatible endpoints (set OPENAI_BASE_URL)');
    console.log(
      '\nNote: Real API calls will incur costs (~$0.01-0.05 per test)',
    );
    console.log('═'.repeat(80) + '\n');

    expect(true).toBe(true);
  });
});
