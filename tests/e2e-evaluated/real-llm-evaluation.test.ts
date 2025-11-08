/**
 * Real LLM Evaluation Test (Optional)
 *
 * Tests actual LLM-as-judge evaluation with real API calls via GitHub Copilot Proxy.
 * Skipped if Copilot is not authenticated.
 *
 * To authenticate: npx copilot-proxy --auth
 * To run: npm test -- real-llm-evaluation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateTest } from '../helpers/llm-evaluation';
import { createRankingCriteria } from '../fixtures/evaluation-prompts';
import type { MCPResponse } from '../helpers/llm-evaluation/types';
import { isCopilotProxyAvailable } from '../helpers/llm-evaluation/copilot-check';

// Check if Copilot Proxy is available
async function checkCopilotAuth(): Promise<boolean> {
  try {
    const mod = await import('@hazeruno/copilot-proxy');
    const { GitHubCopilotAuth } = mod as unknown as {
      GitHubCopilotAuth: {
        isAuthenticated: () => Promise<boolean>;
      };
    };
    return await GitHubCopilotAuth.isAuthenticated();
  } catch {
    return false;
  }
}

describe('Real LLM Evaluation', () => {
  let shouldSkip = false;

  beforeAll(async () => {
    // Check both proxy availability and authentication
    const available = await isCopilotProxyAvailable();
    const authed = available ? await checkCopilotAuth() : false;

    if (!available || !authed) {
      shouldSkip = true;
      console.log('\n⚠️  GitHub Copilot not available or not authenticated.');
      console.log('   Skipping real LLM evaluation tests.');
      console.log('   To enable: npx copilot-proxy --auth\n');
    }
  });

  it('🤖 Should evaluate response quality with real judge LLM', async () => {
    if (shouldSkip) {
      console.log('⏭️  Skipping test - Copilot not available');
      return; // Skip test gracefully
    }
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
    if (shouldSkip) {
      console.log('⏭️  Skipping test - Copilot not available');
      return; // Skip test gracefully
    }
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
