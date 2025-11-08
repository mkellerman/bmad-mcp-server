/**
 * LLM Judge API - Core Types
 *
 * Type definitions for the dual-LLM evaluation framework.
 */

/**
 * Test case with LLM evaluation
 */
export interface LLMEvaluatedTest {
  testCase: {
    name: string;
    setup?: () => Promise<void>;
    action: () => Promise<MCPResponse>;
    cleanup?: () => Promise<void>;
  };
  evaluation: {
    criteria: EvaluationCriteria;
    judge: LLMJudgeConfig;
    scoring: ScoringConfig;
  };
}

/**
 * MCP Response (from first LLM)
 */
export interface MCPResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
  _meta?: {
    requestId?: string;
    timestamp?: number;
    model?: string;
  };
}

/**
 * Evaluation criteria - what to judge
 */
export interface EvaluationCriteria {
  description: string;
  checkpoints: string[];
  context?: string;
  requiredEvidence?: string[];
}

/**
 * Judge LLM configuration
 */
export interface LLMJudgeConfig {
  model: string;
  temperature: number;
  systemPrompt: string;
  maxTokens?: number;
  timeout?: number;
}

/**
 * Scoring configuration
 */
export interface ScoringConfig {
  passingScore: number;
  weights?: Record<string, number>;
  retries?: number;
  varianceThreshold?: number;
  scoreBandWidth?: number;
}

/**
 * Evaluation result from judge LLM
 */
export interface EvaluationResult {
  score: number;
  passed: boolean;
  reasoning: string;
  checkpointScores: Record<string, CheckpointScore>;
  metadata: EvaluationMetadata;
  evidence?: EvidenceValidation;
}

/**
 * Individual checkpoint score
 */
export interface CheckpointScore {
  score: number;
  evidence?: string;
  reasoning?: string;
}

/**
 * Evaluation metadata
 */
export interface EvaluationMetadata {
  model: string;
  timestamp: number;
  duration: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  attempt: number;
}

/**
 * Evidence validation (anti-hallucination)
 */
export interface EvidenceValidation {
  validated: boolean;
  missingEvidence: string[];
  warnings: string[];
}

/**
 * Multi-sample evaluation result
 */
export interface ConsistencyResult {
  samples: EvaluationResult[];
  finalScore: number;
  variance: number;
  passed: boolean;
  consistencyWarning: boolean;
  selectedSample: EvaluationResult;
}

/**
 * Budget tracking
 */
export interface BudgetStatus {
  totalCost: number;
  evaluationCount: number;
  budgetLimit: number | null;
  isOverBudget: boolean;
  remainingBudget: number | null;
}

/**
 * Evaluation options
 */
export interface EvaluationOptions {
  enableConsistencyCheck?: boolean;
  enableEvidenceValidation?: boolean;
  enableCostTracking?: boolean;
  enableStorage?: boolean;
  skipOnError?: boolean;
  logVerbose?: boolean;
}
