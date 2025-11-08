/**
 * Test Matrix for LLM Evaluation
 *
 * Run the same test against multiple judge models to compare performance,
 * consistency, and cost across different LLM providers.
 *
 * Usage:
 * ```typescript
 * const matrix = new TestMatrix([
 *   { model: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
 *   { model: 'claude-3-5-sonnet', name: 'Claude 3.5' },
 *   { model: 'gpt-3.5-turbo', name: 'GPT-3.5' },
 * ]);
 *
 * const results = await matrix.run(testName, response, criteria, scoring);
 * matrix.printComparison(results);
 * ```
 */

import type {
  MCPResponse,
  EvaluationCriteria,
  ScoringConfig,
  ConsistencyResult,
} from './types.js';
import { ConsistencyChecker } from './consistency-checker.js';

/**
 * Judge model configuration for matrix testing
 */
export interface MatrixJudgeModel {
  model: string;
  name: string;
  temperature?: number;
}

/**
 * Result from running a test across multiple judges
 */
export interface MatrixResult {
  judgeModel: MatrixJudgeModel;
  result: ConsistencyResult | null;
  error?: string;
  duration: number;
}

/**
 * Comparison metrics across all judges
 */
export interface MatrixComparison {
  results: MatrixResult[];
  consensus: {
    allPassed: boolean;
    allFailed: boolean;
    split: boolean;
    agreementRate: number;
  };
  scores: {
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
  };
  costs: {
    total: number;
    perJudge: Map<string, number>;
  };
}

/**
 * Test Matrix Runner
 */
export class TestMatrix {
  private judges: MatrixJudgeModel[];
  private consistencyChecker = new ConsistencyChecker();

  constructor(judges: MatrixJudgeModel[]) {
    this.judges = judges;
  }

  /**
   * Run test across all judge models
   */
  async run(
    testName: string,
    response: MCPResponse,
    criteria: EvaluationCriteria,
    scoring: ScoringConfig,
  ): Promise<MatrixResult[]> {
    const results: MatrixResult[] = [];

    for (const judge of this.judges) {
      const startTime = Date.now();
      let result: ConsistencyResult | null = null;
      let error: string | undefined;

      try {
        const judgeConfig = {
          model: judge.model,
          temperature: judge.temperature ?? 0.3,
          systemPrompt: this.buildSystemPrompt(criteria),
        };

        result = await this.consistencyChecker.evaluateWithRetesting(
          response,
          criteria,
          judgeConfig,
          scoring.passingScore,
        );
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }

      const duration = Date.now() - startTime;

      results.push({
        judgeModel: judge,
        result,
        error,
        duration,
      });
    }

    return results;
  }

  /**
   * Analyze results and compute comparison metrics
   */
  analyze(results: MatrixResult[]): MatrixComparison {
    const validResults = results.filter((r) => r.result !== null);
    const scores = validResults.map((r) => r.result!.finalScore);
    const passed = validResults.filter((r) => r.result!.passed);
    const failed = validResults.filter((r) => r.result && !r.result.passed);

    // Consensus analysis
    const allPassed = passed.length === validResults.length;
    const allFailed = failed.length === validResults.length;
    const split = !allPassed && !allFailed;
    const agreementRate =
      validResults.length > 0
        ? Math.max(passed.length, failed.length) / validResults.length
        : 0;

    // Score statistics
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length || 0;
    const sortedScores = [...scores].sort((a, b) => a - b);
    const median =
      scores.length > 0 ? sortedScores[Math.floor(scores.length / 2)] : 0;
    const min = Math.min(...scores, 0);
    const max = Math.max(...scores, 0);
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
        scores.length || 0;
    const stdDev = Math.sqrt(variance);

    // Cost tracking
    const costs = new Map<string, number>();
    let totalCost = 0;
    for (const result of validResults) {
      if (result.result) {
        const judgeModel = result.judgeModel.model;
        const cost = result.result.samples.reduce(
          (sum, sample) => sum + sample.metadata.cost,
          0,
        );
        costs.set(judgeModel, cost);
        totalCost += cost;
      }
    }

    return {
      results,
      consensus: { allPassed, allFailed, split, agreementRate },
      scores: { mean, median, min, max, stdDev },
      costs: { total: totalCost, perJudge: costs },
    };
  }

  /**
   * Print comparison table
   */
  printComparison(comparison: MatrixComparison): void {
    console.log('\n' + '═'.repeat(80));
    console.log('📊 TEST MATRIX COMPARISON');
    console.log('═'.repeat(80));

    // Results table
    console.log('\n🎯 Judge Results:');
    console.log('┌' + '─'.repeat(78) + '┐');
    console.log(
      '│ Judge Model              │ Result │ Score   │ Variance │ Duration │ Cost     │',
    );
    console.log('├' + '─'.repeat(78) + '┤');

    for (const result of comparison.results) {
      const name = result.judgeModel.name.padEnd(24);
      const status = result.error
        ? 'ERROR '
        : result.result
          ? result.result.passed
            ? '✅ PASS'
            : '❌ FAIL'
          : 'SKIP  ';
      const score = result.result
        ? `${result.result.finalScore}/100`.padEnd(7)
        : 'N/A    ';
      const variance = result.result
        ? `${result.result.variance.toFixed(1)}%`.padEnd(8)
        : 'N/A     ';
      const duration = `${result.duration}ms`.padEnd(8);
      const cost = result.result
        ? `$${result.result.samples.reduce((sum, s) => sum + s.metadata.cost, 0).toFixed(4)}`.padEnd(
            8,
          )
        : 'N/A     ';

      console.log(
        `│ ${name} │ ${status} │ ${score} │ ${variance} │ ${duration} │ ${cost} │`,
      );

      if (result.error) {
        console.log(`│   Error: ${result.error.slice(0, 67).padEnd(67)} │`);
      }
    }

    console.log('└' + '─'.repeat(78) + '┘');

    // Consensus analysis
    console.log('\n🤝 Consensus Analysis:');
    if (comparison.consensus.allPassed) {
      console.log('   ✅ All judges PASSED (100% agreement)');
    } else if (comparison.consensus.allFailed) {
      console.log('   ❌ All judges FAILED (100% agreement)');
    } else if (comparison.consensus.split) {
      console.log(
        `   ⚠️  Split decision (${(comparison.consensus.agreementRate * 100).toFixed(0)}% agreement)`,
      );
    }

    // Score statistics
    console.log('\n📈 Score Statistics:');
    console.log(`   Mean:   ${comparison.scores.mean.toFixed(1)}/100`);
    console.log(`   Median: ${comparison.scores.median.toFixed(1)}/100`);
    console.log(
      `   Range:  ${comparison.scores.min.toFixed(1)} - ${comparison.scores.max.toFixed(1)}`,
    );
    console.log(`   StdDev: ${comparison.scores.stdDev.toFixed(1)}`);

    // Cost summary
    console.log('\n💰 Cost Summary:');
    console.log(`   Total: $${comparison.costs.total.toFixed(4)}`);
    for (const [model, cost] of comparison.costs.perJudge) {
      const modelName =
        comparison.results.find((r) => r.judgeModel.model === model)?.judgeModel
          .name || model;
      console.log(`   ${modelName}: $${cost.toFixed(4)}`);
    }

    console.log('\n' + '═'.repeat(80) + '\n');
  }

  /**
   * Build system prompt for judge
   */
  private buildSystemPrompt(criteria: EvaluationCriteria): string {
    return `You are an expert evaluator assessing the quality of AI-generated responses.

${criteria.description}

${criteria.context || ''}

Evaluate the response against these checkpoints:
${criteria.checkpoints.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Provide your evaluation as JSON with this structure:
{
  "score": <number 0-100>,
  "reasoning": "<detailed explanation>",
  "checkpoints": {
    "<checkpoint text>": {
      "score": <number 0-100>,
      "evidence": "<quote from response>",
      "reasoning": "<why this score>"
    }
  }
}`;
  }
}

/**
 * Common judge model presets
 */
export const JUDGE_MODELS = {
  GPT4_TURBO: { model: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo' },
  GPT35_TURBO: { model: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  CLAUDE_35_SONNET: {
    model: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
  },
  CLAUDE_3_OPUS: { model: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
  CLAUDE_3_HAIKU: { model: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
  GEMINI_PRO: { model: 'gemini-pro', name: 'Gemini Pro' },
} as const;
