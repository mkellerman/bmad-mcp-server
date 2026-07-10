/**
 * Consistency Checker
 *
 * Handles multi-sample evaluation with variance checking to ensure
 * consistent judge LLM scoring (Failure Mode 2).
 */

import type {
  MCPResponse,
  EvaluationCriteria,
  LLMJudgeConfig,
  EvaluationResult,
  ConsistencyResult,
} from './types.js';
import { LLMJudge } from './llm-judge.js';
import { getEvaluationConfig } from '../../config/llm-evaluation.config.js';

/**
 * Consistency checker for multi-sample evaluation
 */
export class ConsistencyChecker {
  private config = getEvaluationConfig();
  private judge = new LLMJudge();

  /**
   * Evaluate with consistency checking
   */
  async evaluateWithConsistency(
    response: MCPResponse,
    criteria: EvaluationCriteria,
    judgeConfig: LLMJudgeConfig,
  ): Promise<ConsistencyResult> {
    const consistencyConfig = this.config.failureModes.consistencyCheck;
    const numSamples = Math.min(
      this.config.consistency.retries,
      consistencyConfig.maxSamples,
    );

    // Collect multiple samples
    const samples: EvaluationResult[] = [];
    for (let i = 0; i < numSamples; i++) {
      try {
        const result = await this.judge.evaluate(
          response,
          criteria,
          judgeConfig,
          i + 1,
        );
        samples.push(result);
      } catch (error) {
        console.warn(`Sample ${i + 1} failed:`, error);
        // Continue collecting other samples
      }
    }

    if (samples.length === 0) {
      throw new Error('All consistency check samples failed');
    }

    // Calculate variance
    const scores = samples.map((s) => s.score);
    const variance = this.calculateVariance(scores);

    // Check if variance is acceptable
    const consistencyWarning = variance > consistencyConfig.varianceThreshold;

    if (consistencyWarning && consistencyConfig.logVariance) {
      console.warn(
        `High score variance detected: ${variance.toFixed(1)}% (threshold: ${consistencyConfig.varianceThreshold}%)`,
      );
      console.warn(`Scores: ${scores.join(', ')}`);
    }

    // Select final score using configured strategy
    const selectedSample = this.selectSample(
      samples,
      consistencyConfig.useMedian,
    );
    const finalScore = selectedSample.score;

    // Determine if test passed
    const passed = finalScore >= this.config.scoring.defaultThreshold;

    return {
      samples,
      finalScore,
      variance,
      passed,
      consistencyWarning,
      selectedSample,
    };
  }

  /**
   * Calculate variance across scores
   */
  private calculateVariance(scores: number[]): number {
    if (scores.length === 0) return 0;
    if (scores.length === 1) return 0;

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
      scores.length;

    const stdDev = Math.sqrt(variance);

    // Return as percentage of mean
    return (stdDev / mean) * 100;
  }

  /**
   * Select sample using configured strategy
   */
  private selectSample(
    samples: EvaluationResult[],
    useMedian: boolean,
  ): EvaluationResult {
    if (samples.length === 1) {
      return samples[0];
    }

    if (useMedian) {
      // Sort by score and take median
      const sorted = [...samples].sort((a, b) => a.score - b.score);
      const midIndex = Math.floor(sorted.length / 2);
      return sorted[midIndex];
    } else {
      // Take mean (find closest to average)
      const mean =
        samples.reduce((sum, s) => sum + s.score, 0) / samples.length;
      return samples.reduce((closest, current) =>
        Math.abs(current.score - mean) < Math.abs(closest.score - mean)
          ? current
          : closest,
      );
    }
  }

  /**
   * Check if retest is needed (score in band)
   */
  shouldRetest(score: number, threshold: number, bandWidth: number): boolean {
    return score >= threshold - bandWidth && score <= threshold + bandWidth;
  }

  /**
   * Evaluate with retesting for borderline scores
   */
  async evaluateWithRetesting(
    response: MCPResponse,
    criteria: EvaluationCriteria,
    judgeConfig: LLMJudgeConfig,
    threshold: number,
  ): Promise<ConsistencyResult> {
    const scoreBandConfig = this.config.failureModes.scoreBands;

    // Initial evaluation
    let result = await this.evaluateWithConsistency(
      response,
      criteria,
      judgeConfig,
    );

    // Check if in band and retest needed
    let retestCount = 0;
    while (
      scoreBandConfig.enabled &&
      scoreBandConfig.requireRetest &&
      retestCount < scoreBandConfig.maxRetests &&
      this.shouldRetest(result.finalScore, threshold, scoreBandConfig.bandWidth)
    ) {
      console.log(
        `Score ${result.finalScore} in band (${threshold}±${scoreBandConfig.bandWidth}), retesting...`,
      );

      retestCount++;
      const retestResult = await this.evaluateWithConsistency(
        response,
        criteria,
        judgeConfig,
      );

      // Combine samples
      result = {
        ...retestResult,
        samples: [...result.samples, ...retestResult.samples],
      };

      // Recalculate with all samples
      const selectedSample = this.selectSample(
        result.samples,
        this.config.failureModes.consistencyCheck.useMedian,
      );
      result.finalScore = selectedSample.score;
      result.selectedSample = selectedSample;
    }

    // Apply pass behavior for band scores
    if (
      scoreBandConfig.enabled &&
      this.shouldRetest(result.finalScore, threshold, scoreBandConfig.bandWidth)
    ) {
      switch (scoreBandConfig.passBehavior) {
        case 'optimistic':
          // Pass if any sample passed
          result.passed = result.samples.some((s) => s.score >= threshold);
          break;
        case 'pessimistic':
          // Pass only if all samples passed
          result.passed = result.samples.every((s) => s.score >= threshold);
          break;
        case 'median':
          // Use median (default behavior)
          result.passed = result.finalScore >= threshold;
          break;
      }
    }

    return result;
  }
}
