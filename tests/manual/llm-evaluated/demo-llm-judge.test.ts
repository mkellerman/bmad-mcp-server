/**
 * Demo: LLM Judge Framework Visualization
 *
 * This test demonstrates what the LLM evaluation framework output will look
 * like once LiteLLM integration is complete. It uses mock judge responses
 * to show the full evaluation flow.
 *
 * Run with: npm test -- demo-llm-judge
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from 'vitest';
import { LLMJudge } from '../helpers/llm-evaluation/llm-judge';
import { ConsistencyChecker } from '../helpers/llm-evaluation/consistency-checker';
import { getEvaluationRunner } from '../helpers/llm-evaluation/evaluation-runner';
import type {
  MCPResponse,
  EvaluationCriteria,
} from '../helpers/llm-evaluation/types';
import { createRankingCriteria } from '../fixtures/evaluation-prompts';
import { isCopilotProxyAvailable } from '../helpers/llm-evaluation/copilot-check';

describe('DEMO: LLM Judge Framework Visualization', () => {
  let originalCallJudgeLLM: any;

  beforeAll(async () => {
    // Check if Copilot Proxy is available
    const available = await isCopilotProxyAvailable();
    if (!available) {
      console.log(
        '\n⚠️  Copilot Proxy not available - tests will use mocked responses only',
      );
      console.log('   For real LLM evaluation: npx copilot-proxy --auth\n');
    }
  });

  beforeEach(() => {
    // Mock the LLM call to show realistic evaluation output
    originalCallJudgeLLM = (LLMJudge as any).prototype.callJudgeLLM;

    (LLMJudge as any).prototype.callJudgeLLM = vi.fn(async () => {
      // Simulate realistic judge response
      return {
        text: JSON.stringify({
          score: 92,
          reasoning: `The ranking demonstrates excellent relevance to the mobile app development query. 
The top results (create-ux-design, product-brief, brainstorm-project) are all highly relevant 
to designing a mobile app. The UX/design workflows are correctly prioritized over generic workflows. 
Minor deduction: One workflow in position 4 is slightly less domain-specific than ideal.`,
          checkpoints: [
            {
              criterion: 'create-ux-design workflow appears in top 5',
              score: 100,
              evidence: 'Found "create-ux-design" at position 1',
              reasoning: 'Perfect - most relevant workflow ranked first',
            },
            {
              criterion: 'product-brief workflow appears in top 5',
              score: 100,
              evidence: 'Found "product-brief" at position 2',
              reasoning: 'Excellent placement for product planning',
            },
            {
              criterion: 'Response prioritizes UI/UX workflows',
              score: 95,
              evidence: 'Top 3 all relate to design/product',
              reasoning: 'Clear prioritization of design-focused workflows',
            },
            {
              criterion: 'No irrelevant workflows in top 3',
              score: 100,
              evidence: 'All top 3 workflows are domain-relevant',
              reasoning: 'No generic or off-topic workflows in top positions',
            },
          ],
        }),
        inputTokens: 500,
        outputTokens: 150,
      };
    });
  });

  afterEach(() => {
    // Restore original implementation
    if (originalCallJudgeLLM) {
      (LLMJudge as any).prototype.callJudgeLLM = originalCallJudgeLLM;
    }
  });

  it('📊 DEMO: High-Quality Ranking (Score: 92/100)', async () => {
    const response: MCPResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query: 'Help me design a mobile app',
            rankedWorkflows: [
              { name: 'create-ux-design', description: 'Create UX designs' },
              { name: 'product-brief', description: 'Product brief creation' },
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

    const runner = getEvaluationRunner();
    const result = await runner.evaluate(
      'demo-high-quality-ranking',
      response,
      criteria,
      { passingScore: 80 },
      { logVerbose: true },
    );

    console.log('\n' + '='.repeat(70));
    console.log('📊 LLM JUDGE EVALUATION RESULT (DEMO)');
    console.log('='.repeat(70));

    if (result) {
      console.log(`\n✅ Overall Result: ${result.passed ? 'PASS' : 'FAIL'}`);
      console.log(`📈 Score: ${result.selectedSample.score}/100`);
      console.log(`📊 Samples: ${result.samples.length}`);
      console.log(`📉 Variance: ${result.variance?.toFixed(1)}%`);

      console.log(`\n💭 Judge Reasoning:`);
      console.log(
        `   ${result.selectedSample.reasoning.replace(/\n/g, '\n   ')}`,
      );

      console.log(`\n🎯 Checkpoint Scores:`);
      Object.entries(result.selectedSample.checkpointScores).forEach(
        ([checkpoint, data]) => {
          const icon = data.score >= 90 ? '✅' : data.score >= 70 ? '⚠️' : '❌';
          console.log(`   ${icon} ${checkpoint}: ${data.score}/100`);
          if (data.evidence) {
            console.log(`      Evidence: "${data.evidence}"`);
          }
        },
      );

      console.log(`\n⚙️  Evaluation Metadata:`);
      console.log(`   Model: ${result.selectedSample.metadata.model}`);
      console.log(`   Duration: ${result.selectedSample.metadata.duration}ms`);
      console.log(
        `   Tokens: ${result.selectedSample.metadata.inputTokens} in, ${result.selectedSample.metadata.outputTokens} out`,
      );
      console.log(
        `   Cost: $${result.selectedSample.metadata.cost.toFixed(4)}`,
      );

      if (result.selectedSample.evidence) {
        console.log(`\n🔍 Evidence Validation:`);
        console.log(
          `   Validated: ${result.selectedSample.evidence.validated ? '✅ PASS' : '❌ FAIL'}`,
        );
        if (result.selectedSample.evidence.warnings.length > 0) {
          console.log(
            `   Warnings: ${result.selectedSample.evidence.warnings.join(', ')}`,
          );
        }
        if (result.selectedSample.evidence.missingEvidence.length > 0) {
          console.log(
            `   Missing Evidence: ${result.selectedSample.evidence.missingEvidence.join(', ')}`,
          );
        }
      }

      console.log('\n' + '='.repeat(70));
      console.log('💰 Cost Summary');
      console.log('='.repeat(70));
      console.log(runner.getCostSummary());
      console.log('='.repeat(70) + '\n');

      expect(result.passed).toBe(true);
      expect(result.selectedSample.score).toBeGreaterThanOrEqual(80);
    }
  });

  it('📊 DEMO: Low-Quality Ranking (Score: 45/100)', async () => {
    // Mock a poor ranking response
    (LLMJudge as any).prototype.callJudgeLLM = vi.fn(async () => {
      return {
        text: JSON.stringify({
          score: 45,
          reasoning: `The ranking shows poor relevance to the mobile app query. Generic workflows 
like 'debug' and 'code-review' are ranked higher than domain-specific UX/design workflows. 
The create-ux-design workflow doesn't appear until position 6, which is a critical failure. 
This ranking would not help a user trying to design a mobile app.`,
          checkpoints: [
            {
              criterion: 'create-ux-design workflow appears in top 5',
              score: 0,
              evidence:
                'create-ux-design not found in top 5 (appears at position 6)',
              reasoning:
                'Critical failure - most relevant workflow not prioritized',
            },
            {
              criterion: 'product-brief workflow appears in top 5',
              score: 60,
              evidence: 'Found "product-brief" at position 4',
              reasoning: 'Present but should be higher given query',
            },
            {
              criterion: 'Response prioritizes UI/UX workflows',
              score: 20,
              evidence: 'Top 3 are: debug, code-review, architecture',
              reasoning:
                'Generic development workflows prioritized over design',
            },
            {
              criterion: 'No irrelevant workflows in top 3',
              score: 30,
              evidence:
                'debug and code-review are irrelevant to mobile app design',
              reasoning: 'Two of top 3 workflows are off-topic',
            },
          ],
        }),
        inputTokens: 500,
        outputTokens: 150,
      };
    });

    const response: MCPResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query: 'Help me design a mobile app',
            rankedWorkflows: [
              { name: 'debug', description: 'Debug code' },
              { name: 'code-review', description: 'Review code' },
              { name: 'architecture', description: 'System architecture' },
              { name: 'product-brief', description: 'Product brief' },
              { name: 'prd', description: 'PRD creation' },
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

    const runner = getEvaluationRunner();
    runner.resetCostTracker(); // Reset for second demo

    const result = await runner.evaluate(
      'demo-low-quality-ranking',
      response,
      criteria,
      { passingScore: 80 },
      { logVerbose: true },
    );

    console.log('\n' + '='.repeat(70));
    console.log('❌ LLM JUDGE EVALUATION RESULT - FAILURE CASE (DEMO)');
    console.log('='.repeat(70));

    if (result) {
      console.log(`\n❌ Overall Result: ${result.passed ? 'PASS' : 'FAIL'}`);
      console.log(
        `📉 Score: ${result.selectedSample.score}/100 (Threshold: 80)`,
      );

      console.log(`\n💭 Judge Reasoning:`);
      console.log(
        `   ${result.selectedSample.reasoning.replace(/\n/g, '\n   ')}`,
      );

      console.log(`\n🎯 Checkpoint Scores (Failures):`);
      Object.entries(result.selectedSample.checkpointScores)
        .filter(([, data]) => data.score < 70)
        .forEach(([checkpoint, data]) => {
          console.log(`   ❌ ${checkpoint}: ${data.score}/100`);
          if (data.reasoning) {
            console.log(`      ${data.reasoning}`);
          }
        });

      console.log('\n' + '='.repeat(70) + '\n');

      expect(result.passed).toBe(false);
      expect(result.selectedSample.score).toBeLessThan(80);
    }
  });

  it('📊 DEMO: Consistency Checking with Variance', async () => {
    // Mock multiple samples with variance
    let callCount = 0;
    const scores = [88, 92, 85]; // Variance of 3.6%

    (LLMJudge as any).prototype.callJudgeLLM = vi.fn(async () => {
      const score = scores[callCount % scores.length];
      callCount++;

      return {
        text: JSON.stringify({
          score,
          reasoning: `Sample ${callCount}: Score ${score}/100. Ranking quality is good with minor variations.`,
          checkpoints: [
            {
              criterion: 'Test checkpoint',
              score,
              evidence: 'Sample evidence',
              reasoning: 'Sample reasoning',
            },
          ],
        }),
        inputTokens: 500,
        outputTokens: 150,
      };
    });

    const response: MCPResponse = {
      content: [{ type: 'text', text: JSON.stringify({ test: 'data' }) }],
      isError: false,
    };

    const criteria: EvaluationCriteria = {
      description: 'Test consistency checking',
      checkpoints: ['Test checkpoint'],
      context: 'Demo of multi-sample evaluation',
    };

    const checker = new ConsistencyChecker();
    const judgeConfig = {
      model: 'gpt-4-turbo',
      temperature: 0.3,
      systemPrompt: 'You are an evaluation judge',
    };

    const result = await checker.evaluateWithConsistency(
      response,
      criteria,
      judgeConfig,
    );

    console.log('\n' + '='.repeat(70));
    console.log('🔄 CONSISTENCY CHECKING DEMO');
    console.log('='.repeat(70));

    if (result) {
      console.log(`\n📊 Multi-Sample Results:`);
      result.samples.forEach((sample, i) => {
        console.log(`   Sample ${i + 1}: ${sample.score}/100`);
      });

      console.log(`\n📈 Statistics:`);
      console.log(`   Selected: ${result.selectedSample.score}/100 (median)`);
      console.log(`   Variance: ${result.variance?.toFixed(1)}%`);
      console.log(`   Threshold: 10.0% (configurable)`);
      console.log(
        `   Status: ${result.variance && result.variance < 10 ? '✅ Consistent' : '⚠️  High Variance'}`,
      );

      console.log('\n' + '='.repeat(70) + '\n');

      expect(result.samples.length).toBe(3);
      expect(result.variance).toBeDefined();
    }
  });
});
