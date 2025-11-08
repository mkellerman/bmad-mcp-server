/**
 * Demo: Test Matrix Across Multiple Judge Models
 *
 * This test demonstrates running the same evaluation across multiple
 * judge models to compare their performance, consistency, and cost.
 *
 * Run with: npm test -- demo-test-matrix
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import {
  TestMatrix,
  JUDGE_MODELS,
  type MatrixJudgeModel,
} from '../helpers/llm-evaluation/test-matrix';
import type { MCPResponse } from '../helpers/llm-evaluation/types';
import { createRankingCriteria } from '../fixtures/evaluation-prompts';
import { LLMJudge } from '../helpers/llm-evaluation/llm-judge';
import { isCopilotProxyAvailable } from '../helpers/llm-evaluation/copilot-check';

describe('DEMO: Test Matrix - Multi-Judge Comparison', () => {
  beforeAll(async () => {
    const available = await isCopilotProxyAvailable();
    if (!available) {
      console.log(
        '\n⚠️  Copilot Proxy not available - tests will use mocked responses',
      );
      console.log('   For real LLM evaluation: npx copilot-proxy --auth\n');
    }
  });
  it('📊 Should compare evaluation across GPT-4, Claude, and GPT-3.5', async () => {
    // Mock different judge responses to simulate model variation
    const mockResponses: Record<string, any> = {
      'gpt-4-turbo-preview': {
        score: 92,
        reasoning:
          'GPT-4: Excellent ranking with strong domain focus. UX workflows properly prioritized.',
        checkpoints: [
          {
            criterion: 'create-ux-design workflow appears in top 5',
            score: 100,
            evidence: 'Found at position 1',
          },
          {
            criterion: 'product-brief workflow appears in top 5',
            score: 100,
            evidence: 'Found at position 2',
          },
          {
            criterion: 'Response prioritizes UI/UX workflows',
            score: 95,
          },
          {
            criterion: 'No irrelevant workflows in top 3',
            score: 100,
          },
        ],
      },
      'claude-3-5-sonnet-20241022': {
        score: 88,
        reasoning:
          'Claude: Good ranking overall. Minor concern about position 4 workflow relevance.',
        checkpoints: [
          {
            criterion: 'create-ux-design workflow appears in top 5',
            score: 100,
            evidence: 'Present at top',
          },
          {
            criterion: 'product-brief workflow appears in top 5',
            score: 95,
          },
          {
            criterion: 'Response prioritizes UI/UX workflows',
            score: 85,
          },
          {
            criterion: 'No irrelevant workflows in top 3',
            score: 90,
          },
        ],
      },
      'gpt-3.5-turbo': {
        score: 78,
        reasoning:
          'GPT-3.5: Acceptable ranking but less nuanced analysis. Some workflows could be better ordered.',
        checkpoints: [
          {
            criterion: 'create-ux-design workflow appears in top 5',
            score: 90,
          },
          {
            criterion: 'product-brief workflow appears in top 5',
            score: 85,
          },
          {
            criterion: 'Response prioritizes UI/UX workflows',
            score: 70,
          },
          {
            criterion: 'No irrelevant workflows in top 3',
            score: 75,
          },
        ],
      },
    };

    // Mock the LLM call to return model-specific responses
    const originalCallJudgeLLM = (LLMJudge as any).prototype.callJudgeLLM;
    const judgeCallHistory: string[] = [];

    // @ts-ignore - mock function uses 'this' context
    (LLMJudge as any).prototype.callJudgeLLM = vi.fn(async function () {
      // Try to get model from config (stored during judge construction)
      const judge = this as any;
      const model = judge.config?.model || 'gpt-3.5-turbo';
      judgeCallHistory.push(model);

      const response = mockResponses[model] || mockResponses['gpt-3.5-turbo'];
      return {
        text: JSON.stringify(response),
        inputTokens: 500,
        outputTokens: 150,
      };
    });

    try {
      // Test response to evaluate
      const response: MCPResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              model: 'claude-3-opus-20240229', // Subject model being tested
              query: 'Help me design a mobile app',
              rankedWorkflows: [
                {
                  name: 'create-ux-design',
                  description: 'Create UX designs',
                },
                { name: 'product-brief', description: 'Product brief' },
                {
                  name: 'brainstorm-project',
                  description: 'Brainstorm features',
                },
                { name: 'architecture', description: 'System architecture' },
                { name: 'prd', description: 'Product requirements' },
              ],
            }),
          },
        ],
        isError: false,
      };

      const criteria = createRankingCriteria(
        'Help me design a mobile app',
        'UX/UI Design and Product Planning',
        ['create-ux-design', 'product-brief', 'brainstorm-project'],
      );

      // Create test matrix with multiple judges
      const judges: MatrixJudgeModel[] = [
        JUDGE_MODELS.GPT4_TURBO,
        JUDGE_MODELS.CLAUDE_35_SONNET,
        JUDGE_MODELS.GPT35_TURBO,
      ];

      const matrix = new TestMatrix(judges);

      // Run evaluation across all judges
      console.log('\n🔄 Running test matrix across 3 judge models...\n');

      const results = await matrix.run(
        'ranking-quality-mobile-app',
        response,
        criteria,
        { passingScore: 80 },
      );

      // Analyze and print comparison
      const comparison = matrix.analyze(results);
      matrix.printComparison(comparison);

      // Assertions
      expect(results.length).toBe(3);
      expect(comparison.consensus.split).toBe(true); // GPT-3.5 fails (78 < 80)
      expect(comparison.scores.mean).toBeGreaterThan(80);
      expect(comparison.scores.stdDev).toBeGreaterThan(0); // Models disagree
    } finally {
      // Restore original implementation
      (LLMJudge as any).prototype.callJudgeLLM = originalCallJudgeLLM;
    }
  });

  it('📊 Should show consensus when all judges agree', async () => {
    // Mock unanimous PASS
    (LLMJudge as any).prototype.callJudgeLLM = vi.fn(async () => {
      return JSON.stringify({
        score: 95,
        reasoning: 'Perfect ranking - all judges agree this is excellent.',
        checkpoints: {
          test: { score: 95, evidence: 'Strong evidence' },
        },
      });
    });

    const response: MCPResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ model: 'gpt-4', test: 'data' }),
        },
      ],
      isError: false,
    };

    const criteria = createRankingCriteria('test query');

    const matrix = new TestMatrix([
      JUDGE_MODELS.GPT4_TURBO,
      JUDGE_MODELS.CLAUDE_35_SONNET,
    ]);

    const results = await matrix.run('test-unanimous', response, criteria, {
      passingScore: 80,
    });

    const comparison = matrix.analyze(results);

    console.log('\n═'.repeat(40));
    console.log('🤝 UNANIMOUS CONSENSUS EXAMPLE');
    console.log('═'.repeat(40));
    matrix.printComparison(comparison);

    expect(comparison.consensus.allPassed).toBe(true);
    expect(comparison.consensus.agreementRate).toBe(1.0);
  });

  it('📊 Should handle judge failures gracefully', async () => {
    // Mock one judge failing
    let callCount = 0;
    (LLMJudge as any).prototype.callJudgeLLM = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Judge model timeout');
      }
      return JSON.stringify({
        score: 85,
        reasoning: 'Working judge response',
        checkpoints: { test: { score: 85 } },
      });
    });

    const response: MCPResponse = {
      content: [{ type: 'text', text: JSON.stringify({ test: 'data' }) }],
      isError: false,
    };

    const criteria = createRankingCriteria('test query');

    const matrix = new TestMatrix([
      { model: 'failing-model', name: 'Failing Judge' },
      JUDGE_MODELS.GPT4_TURBO,
    ]);

    const results = await matrix.run('test-failure', response, criteria, {
      passingScore: 80,
    });

    const comparison = matrix.analyze(results);

    console.log('\n═'.repeat(40));
    console.log('⚠️  PARTIAL FAILURE EXAMPLE');
    console.log('═'.repeat(40));
    matrix.printComparison(comparison);

    expect(results[0].error).toBeDefined();
    expect(results[1].result).not.toBeNull();
  });
});
