/**
 * LLM Judge - Core Evaluation Engine
 *
 * Executes judge LLM calls to evaluate test responses.
 */

import type {
  MCPResponse,
  EvaluationCriteria,
  LLMJudgeConfig,
  EvaluationResult,
  CheckpointScore,
  EvidenceValidation,
} from './types.js';
import { getEvaluationConfig } from '../../config/llm-evaluation.config.js';
import { JUDGE_MODEL_COSTS } from '../../config/judge-models.config.js';

/**
 * Judge LLM response structure
 */
interface JudgeResponse {
  score: number;
  reasoning: string;
  checkpoints: Array<{
    criterion: string;
    score: number;
    evidence?: string;
    reasoning?: string;
  }>;
}

/**
 * LLM Judge executor
 */
export class LLMJudge {
  private config = getEvaluationConfig();

  /**
   * Evaluate a response using judge LLM
   */
  async evaluate(
    response: MCPResponse,
    criteria: EvaluationCriteria,
    judgeConfig: LLMJudgeConfig,
    attempt: number = 1,
  ): Promise<EvaluationResult> {
    const startTime = Date.now();

    try {
      // Build evaluation prompt
      const prompt = this.buildPrompt(
        response,
        criteria,
        judgeConfig.systemPrompt,
      );

      // Call judge LLM
      const judgeResponse = await this.callJudgeLLM(prompt, judgeConfig);

      // Parse response
      const parsed = this.parseJudgeResponse(judgeResponse.text);

      // Validate evidence if enabled
      const evidence = this.config.failureModes.evidenceValidation.enabled
        ? this.validateEvidence(parsed, response)
        : undefined;

      // Calculate cost
      const cost = this.calculateCost(
        judgeConfig.model,
        judgeResponse.inputTokens,
        judgeResponse.outputTokens,
      );

      // Build result
      const result: EvaluationResult = {
        score: parsed.score,
        passed: parsed.score >= this.config.scoring.defaultThreshold,
        reasoning: parsed.reasoning,
        checkpointScores: this.buildCheckpointScores(parsed.checkpoints),
        metadata: {
          model: judgeConfig.model,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
          inputTokens: judgeResponse.inputTokens,
          outputTokens: judgeResponse.outputTokens,
          cost,
          attempt,
        },
        evidence,
      };

      return result;
    } catch (error) {
      // Handle failure modes
      if (this.config.failureModes.gracefulDegradation.enabled) {
        return this.createFailedResult(error, judgeConfig.model, attempt);
      }
      throw error;
    }
  }

  /**
   * Build evaluation prompt
   */
  private buildPrompt(
    response: MCPResponse,
    criteria: EvaluationCriteria,
    systemPrompt: string,
  ): string {
    const responseText = response.content.map((c) => c.text).join('\n\n');

    return systemPrompt
      .replace('{criteria}', JSON.stringify(criteria, null, 2))
      .replace('{response}', responseText)
      .replace('{checkpoints}', criteria.checkpoints.join('\n'));
  }

  /**
   * Call judge LLM (placeholder - will use LiteLLM)
   */
  private async callJudgeLLM(
    prompt: string,
    config: LLMJudgeConfig,
  ): Promise<{
    text: string;
    inputTokens: number;
    outputTokens: number;
  }> {
    // TODO: Integrate with LiteLLM
    // Silence unused variable warnings - will be used when implemented
    void prompt;
    void config;

    // For now, throw to indicate not implemented
    throw new Error(
      'LLM judge not yet implemented - requires LiteLLM integration',
    );

    // Future implementation:
    // const response = await litellm.completion({
    //   model: config.model,
    //   messages: [{ role: 'user', content: prompt }],
    //   temperature: config.temperature,
    //   max_tokens: config.maxTokens,
    // });
    //
    // return {
    //   text: response.choices[0].message.content,
    //   inputTokens: response.usage.prompt_tokens,
    //   outputTokens: response.usage.completion_tokens,
    // };
  }

  /**
   * Parse judge LLM response
   */
  private parseJudgeResponse(text: string): JudgeResponse {
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in judge response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (
        typeof parsed.score !== 'number' ||
        !parsed.reasoning ||
        !Array.isArray(parsed.checkpoints)
      ) {
        throw new Error('Invalid judge response structure');
      }

      return parsed;
    } catch (error) {
      throw new Error(
        `Failed to parse judge response: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Build checkpoint scores map
   */
  private buildCheckpointScores(
    checkpoints: JudgeResponse['checkpoints'],
  ): Record<string, CheckpointScore> {
    const scores: Record<string, CheckpointScore> = {};

    for (const checkpoint of checkpoints) {
      scores[checkpoint.criterion] = {
        score: checkpoint.score,
        evidence: checkpoint.evidence,
        reasoning: checkpoint.reasoning,
      };
    }

    return scores;
  }

  /**
   * Validate evidence (anti-hallucination)
   */
  private validateEvidence(
    judgeResponse: JudgeResponse,
    actualResponse: MCPResponse,
  ): EvidenceValidation {
    const responseText = actualResponse.content
      .map((c) => c.text)
      .join('\n\n')
      .toLowerCase();

    const missingEvidence: string[] = [];
    const warnings: string[] = [];

    for (const checkpoint of judgeResponse.checkpoints) {
      if (checkpoint.evidence) {
        const evidenceLower = checkpoint.evidence.toLowerCase();

        if (this.config.failureModes.evidenceValidation.requireExactQuotes) {
          // Exact match required
          if (!responseText.includes(evidenceLower)) {
            missingEvidence.push(checkpoint.evidence);
          }
        } else {
          // Fuzzy match using similarity threshold
          const similarity = this.calculateSimilarity(
            evidenceLower,
            responseText,
          );
          if (
            similarity <
            this.config.failureModes.evidenceValidation.similarityThreshold
          ) {
            warnings.push(
              `Low similarity for evidence: "${checkpoint.evidence}" (${Math.round(similarity * 100)}%)`,
            );
          }
        }
      }
    }

    return {
      validated: missingEvidence.length === 0,
      missingEvidence,
      warnings,
    };
  }

  /**
   * Calculate text similarity (simple implementation)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(/\s+/);
    const words2Set = new Set(text2.split(/\s+/));

    const matchingWords = words1.filter((word) => words2Set.has(word));
    return matchingWords.length / words1.length;
  }

  /**
   * Calculate cost for evaluation
   */
  private calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const costs = JUDGE_MODEL_COSTS[model];
    if (!costs) {
      console.warn(`Unknown model for cost calculation: ${model}`);
      return 0;
    }

    return (
      (inputTokens / 1000) * costs.inputCost +
      (outputTokens / 1000) * costs.outputCost
    );
  }

  /**
   * Create failed result (graceful degradation)
   */
  private createFailedResult(
    error: unknown,
    model: string,
    attempt: number,
  ): EvaluationResult {
    return {
      score: 0,
      passed: false,
      reasoning: `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
      checkpointScores: {},
      metadata: {
        model,
        timestamp: Date.now(),
        duration: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        attempt,
      },
    };
  }
}
