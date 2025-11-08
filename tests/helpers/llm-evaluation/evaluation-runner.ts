/**
 * Evaluation Runner
 *
 * High-level API for running LLM-evaluated tests.
 * Orchestrates judge execution, consistency checking, cost tracking, and result storage.
 */

import type {
  MCPResponse,
  EvaluationCriteria,
  LLMJudgeConfig,
  ScoringConfig,
  ConsistencyResult,
  EvaluationOptions,
} from './types.js';
import { ConsistencyChecker } from './consistency-checker.js';
import { CostTracker } from '../../config/judge-models.config.js';
import { getEvaluationConfig } from '../../config/llm-evaluation.config.js';
import {
  shouldEvaluateTest,
  getTestThresholds,
} from '../../config/critical-tests.config.js';

/**
 * Main evaluation runner
 */
export class EvaluationRunner {
  private config = getEvaluationConfig();
  private consistencyChecker = new ConsistencyChecker();
  private costTracker = new CostTracker();

  /**
   * Evaluate a test response
   */
  async evaluate(
    testName: string,
    response: MCPResponse,
    criteria: EvaluationCriteria,
    scoring: ScoringConfig,
    options: EvaluationOptions = {},
  ): Promise<ConsistencyResult | null> {
    // Check if evaluation should run for this test
    if (
      !shouldEvaluateTest(
        testName,
        this.config.costControl.strategy,
        this.config.costControl.samplePercentage,
      )
    ) {
      if (options.logVerbose) {
        console.log(`Skipping LLM evaluation for ${testName} (cost control)`);
      }
      return null;
    }

    // Get test-specific thresholds
    const thresholds = getTestThresholds(testName, {
      passingScore: this.config.scoring.defaultThreshold,
      varianceThreshold:
        this.config.failureModes.consistencyCheck.varianceThreshold,
    });

    // Build judge config
    const judgeConfig: LLMJudgeConfig = {
      model: this.config.judge.defaultModel,
      temperature: this.config.judge.temperature,
      systemPrompt: this.buildSystemPrompt(criteria),
      maxTokens: this.config.judge.maxTokens,
      timeout: this.config.judge.timeout,
    };

    try {
      // Run evaluation with consistency checking
      const result = await this.consistencyChecker.evaluateWithRetesting(
        response,
        criteria,
        judgeConfig,
        thresholds.passingScore,
      );

      // Track costs
      if (
        options.enableCostTracking ??
        this.config.failureModes.costControl.enabled
      ) {
        for (const sample of result.samples) {
          this.costTracker.recordEvaluation(
            sample.metadata.model,
            sample.metadata.inputTokens,
            sample.metadata.outputTokens,
          );
        }

        // Check budget
        if (this.costTracker.isOverBudget()) {
          console.warn('⚠️  Budget exceeded:', this.costTracker.getSummary());

          if (this.config.failureModes.costControl.stopOnBudgetExceeded) {
            throw new Error('Budget limit exceeded, stopping evaluation');
          }
        }
      }

      // Log results
      if (options.logVerbose ?? this.config.reporting.verbose) {
        this.logResult(testName, result);
      }

      return result;
    } catch (error) {
      if (
        options.skipOnError ??
        this.config.failureModes.gracefulDegradation.skipOnError
      ) {
        console.warn(`Evaluation failed for ${testName}, skipping:`, error);
        return null;
      }
      throw error;
    }
  }

  /**
   * Build system prompt for judge
   * Note: criteria parameter reserved for future use (custom prompts per test)
   */
  private buildSystemPrompt(_criteria?: EvaluationCriteria): string {
    void _criteria; // Reserved for future use

    // Criteria will be injected via template replacement in LLMJudge
    return `You are a quality assurance evaluator for an AI agent system.

Your task: Evaluate if the response appropriately meets the evaluation criteria.

Evaluation criteria:
{criteria}

Response to evaluate:
{response}

CRITICAL INSTRUCTIONS:
- Only evaluate based on ACTUAL CONTENT in the response
- Do NOT assume or infer information not explicitly present
- For each checkpoint, cite the EXACT TEXT that supports your score
- Be consistent in your scoring

Provide your evaluation in JSON format:
{
  "score": <number 0-100>,
  "reasoning": "<explanation of overall score>",
  "checkpoints": [
    {
      "criterion": "<checkpoint from criteria>",
      "score": <number 0-100>,
      "evidence": "<exact quote from response>",
      "reasoning": "<why this score>"
    }
  ]
}`;
  }

  /**
   * Log evaluation result
   */
  private logResult(testName: string, result: ConsistencyResult): void {
    console.log(`\n📊 LLM Evaluation: ${testName}`);
    console.log(
      `   Score: ${result.finalScore}/100 (${result.passed ? '✅ PASS' : '❌ FAIL'})`,
    );
    console.log(`   Samples: ${result.samples.length}`);
    console.log(`   Variance: ${result.variance.toFixed(1)}%`);

    if (result.consistencyWarning) {
      console.log(`   ⚠️  High variance detected`);
    }

    if (this.config.reporting.showReasoningInTests) {
      console.log(`   Reasoning: ${result.selectedSample.reasoning}`);
    }

    // Evidence validation warnings
    if (result.selectedSample.evidence?.warnings.length) {
      console.log(`   ⚠️  Evidence warnings:`);
      for (const warning of result.selectedSample.evidence.warnings) {
        console.log(`      - ${warning}`);
      }
    }

    if (result.selectedSample.evidence?.missingEvidence.length) {
      console.log(`   ❌ Missing evidence:`);
      for (const evidence of result.selectedSample.evidence.missingEvidence) {
        console.log(`      - ${evidence}`);
      }
    }
  }

  /**
   * Get cost summary
   */
  getCostSummary(): string {
    return this.costTracker.getSummary();
  }

  /**
   * Reset cost tracker
   */
  resetCostTracker(): void {
    this.costTracker = new CostTracker();
  }
}

/**
 * Global evaluation runner instance
 */
let globalRunner: EvaluationRunner | null = null;

/**
 * Get or create global evaluation runner
 */
export function getEvaluationRunner(): EvaluationRunner {
  if (!globalRunner) {
    globalRunner = new EvaluationRunner();
  }
  return globalRunner;
}

/**
 * Reset global evaluation runner (for testing)
 */
export function resetEvaluationRunner(): void {
  globalRunner = null;
}
