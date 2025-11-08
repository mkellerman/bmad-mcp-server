/**
 * LLM Evaluation Framework
 *
 * Dual-LLM testing framework for behavioral quality validation.
 *
 * Usage:
 * ```typescript
 * import { evaluateTest } from './helpers/llm-evaluation';
 *
 * const result = await evaluateTest('ranking-quality', response, {
 *   description: 'Workflows should rank by relevance',
 *   checkpoints: ['Mobile workflows in top 5', 'No irrelevant workflows in top 3'],
 * });
 *
 * expect(result?.passed).toBe(true);
 * ```
 */

export * from './types.js';
export * from './llm-judge.js';
export * from './consistency-checker.js';
export * from './evaluation-runner.js';

import type {
  MCPResponse,
  EvaluationCriteria,
  ConsistencyResult,
} from './types.js';
import { getEvaluationRunner } from './evaluation-runner.js';

/**
 * Simplified API for evaluating a test
 */
export async function evaluateTest(
  testName: string,
  response: MCPResponse,
  criteria: EvaluationCriteria,
  options?: {
    passingScore?: number;
    logVerbose?: boolean;
  },
): Promise<ConsistencyResult | null> {
  const runner = getEvaluationRunner();

  return runner.evaluate(
    testName,
    response,
    criteria,
    {
      passingScore: options?.passingScore ?? 80,
    },
    {
      logVerbose: options?.logVerbose,
    },
  );
}

/**
 * Get cost summary for current test run
 */
export function getEvaluationCostSummary(): string {
  const runner = getEvaluationRunner();
  return runner.getCostSummary();
}
