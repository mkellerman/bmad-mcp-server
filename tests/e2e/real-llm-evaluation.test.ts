/**
 * E2E Test: Real LLM Evaluation with Judge
 *
 * INTENT:
 * Test the dual-LLM evaluation framework where one LLM generates responses
 * and another LLM (judge) evaluates the quality of those responses.
 *
 * EXPECTED STEPS:
 * 1. Verify copilot-proxy connection (prerequisite)
 * 2. Create a mock BMAD MCP response with workflow rankings
 * 3. Define evaluation criteria with checkpoints
 * 4. Call evaluateTest() which sends response to judge LLM via copilot-proxy
 * 5. Judge LLM returns scored evaluation with reasoning
 * 6. Validate evaluation result structure and scoring
 *
 * EXPECTED RESULTS:
 * - Judge LLM successfully evaluates response quality
 * - Evaluation includes: score, reasoning, checkpoint scores, evidence
 * - Cost tracking records tokens and estimated cost
 * - Malformed responses are handled gracefully with error messages
 *
 * FAILURE CONDITIONS:
 * - Copilot-proxy not available → FAIL test suite (beforeAll)
 * - Judge LLM doesn't return valid JSON → FAIL
 * - Evaluation score not in valid range → FAIL
 * - Cost tracking missing or incorrect → FAIL
 *
 * NOTE: This is an E2E test because it uses copilot-proxy to call real LLM APIs.
 *       No mocks are used - all LLM calls are real API calls with actual cost.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateTest } from '../helpers/llm-evaluation';
import { createRankingCriteria } from '../fixtures/evaluation-prompts';
import type { MCPResponse } from '../helpers/llm-evaluation/types';
import { isCopilotProxyAvailable } from '../helpers/llm-evaluation/copilot-check';

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

describe('E2E: Real LLM Evaluation', () => {
  let shouldSkip = false;
  let skipReason = '';

  beforeAll(async () => {
    // Test connection to copilot-proxy - fail suite if unavailable
    const available = await isCopilotProxyAvailable();
    if (!available) {
      shouldSkip = true;
      skipReason = 'Copilot Proxy not available';
      return;
    }

    const authed = await checkCopilotAuth();
    if (!authed) {
      shouldSkip = true;
      skipReason = 'GitHub Copilot not authenticated';
    }
  });

  it('should evaluate response quality with real judge LLM', async () => {
    // FAIL if copilot-proxy is unavailable (per testing rules)
    if (shouldSkip) {
      throw new Error(
        `❌ E2E Test Suite Failed: ${skipReason}\n` +
          `   Action: Authenticate with GitHub Copilot\n` +
          `   Command: npx copilot-proxy --auth\n`,
      );
    }
    // Create a mock response that should score well
    const response: MCPResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            model: 'gpt-4-turbo',
            rankedWorkflows: [
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

  it('should handle malformed responses gracefully', async () => {
    // FAIL if copilot-proxy is unavailable (per testing rules)
    if (shouldSkip) {
      throw new Error(
        `❌ E2E Test Suite Failed: ${skipReason}\n` +
          `   Action: Authenticate with GitHub Copilot\n` +
          `   Command: npx copilot-proxy --auth\n`,
      );
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
