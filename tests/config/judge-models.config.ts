/**
 * Judge Models Configuration
 *
 * Model definitions, costs, and budget limits for LLM-as-judge evaluation.
 * Used for cost tracking and budget enforcement.
 */

export interface ModelCost {
  inputCost: number; // Cost per 1K tokens
  outputCost: number; // Cost per 1K tokens
  displayName: string;
  recommended: boolean;
}

export interface BudgetLimits {
  local: number | null;
  ci: number;
  nightly: number;
  production: number;
}

/**
 * Judge model costs (as of November 2025)
 * Costs are per 1,000 tokens
 */
export const JUDGE_MODEL_COSTS: Record<string, ModelCost> = {
  // GPT-4 Turbo - High quality, moderate cost
  'gpt-4-turbo-preview': {
    inputCost: 0.01,
    outputCost: 0.03,
    displayName: 'GPT-4 Turbo',
    recommended: true,
  },

  // GPT-4 - Highest quality, highest cost
  'gpt-4': {
    inputCost: 0.03,
    outputCost: 0.06,
    displayName: 'GPT-4',
    recommended: false, // Too expensive for routine testing
  },

  // GPT-3.5 Turbo - Fast and cheap, lower quality
  'gpt-3.5-turbo': {
    inputCost: 0.0005,
    outputCost: 0.0015,
    displayName: 'GPT-3.5 Turbo',
    recommended: false, // Use as fallback only
  },

  // Claude 3.5 Sonnet - High quality, competitive cost
  'claude-3-5-sonnet-20241022': {
    inputCost: 0.003,
    outputCost: 0.015,
    displayName: 'Claude 3.5 Sonnet',
    recommended: true,
  },

  // Claude 3 Opus - Highest quality, high cost
  'claude-3-opus-20240229': {
    inputCost: 0.015,
    outputCost: 0.075,
    displayName: 'Claude 3 Opus',
    recommended: false, // Too expensive
  },

  // Claude 3 Haiku - Fast and cheap
  'claude-3-haiku-20240307': {
    inputCost: 0.00025,
    outputCost: 0.00125,
    displayName: 'Claude 3 Haiku',
    recommended: false, // Use as fallback only
  },
};

/**
 * Budget limits per environment
 * null = no limit
 */
export const BUDGET_LIMITS: BudgetLimits = {
  local: null, // No limit for local development
  ci: 0.5, // $0.50 per CI test run
  nightly: 5.0, // $5.00 per nightly run (comprehensive)
  production: 0.0, // Never run in production
};

/**
 * Estimated token usage per evaluation
 * Used for cost estimation before running tests
 */
export const ESTIMATED_TOKENS = {
  // Typical judge prompt (criteria + response excerpt)
  inputTokens: 500,

  // Typical judge response (score + reasoning + checkpoint scores)
  outputTokens: 300,

  // Average total per evaluation
  totalPerEvaluation: 800,
};

/**
 * Calculate estimated cost for a test run
 */
export function estimateCost(
  modelName: string,
  numEvaluations: number,
  retries: number = 3,
): number {
  const model = JUDGE_MODEL_COSTS[modelName];
  if (!model) {
    throw new Error(`Unknown model: ${modelName}`);
  }

  const totalEvaluations = numEvaluations * retries;

  const inputCost =
    (ESTIMATED_TOKENS.inputTokens / 1000) * model.inputCost * totalEvaluations;

  const outputCost =
    (ESTIMATED_TOKENS.outputTokens / 1000) *
    model.outputCost *
    totalEvaluations;

  return inputCost + outputCost;
}

/**
 * Get budget limit for current environment
 */
export function getBudgetLimit(): number | null {
  if (process.env.NODE_ENV === 'production') {
    return BUDGET_LIMITS.production;
  }

  const testProfile = process.env.TEST_PROFILE;

  if (testProfile === 'nightly') {
    return BUDGET_LIMITS.nightly;
  }

  if (process.env.CI === 'true' || testProfile === 'ci') {
    return BUDGET_LIMITS.ci;
  }

  return BUDGET_LIMITS.local;
}

/**
 * Check if estimated cost exceeds budget
 */
export function isWithinBudget(estimatedCost: number): boolean {
  const limit = getBudgetLimit();

  if (limit === null) {
    return true; // No limit
  }

  return estimatedCost <= limit;
}

/**
 * Get recommended model for current environment
 */
export function getRecommendedModel(): string {
  // Find first recommended model
  const recommended = Object.entries(JUDGE_MODEL_COSTS).find(
    ([, config]) => config.recommended,
  );

  return recommended ? recommended[0] : 'gpt-4-turbo-preview';
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

/**
 * Cost tracking for a test run
 */
export class CostTracker {
  private totalCost = 0;
  private evaluationCount = 0;
  private modelCosts: Record<string, number> = {};

  recordEvaluation(
    modelName: string,
    inputTokens: number,
    outputTokens: number,
  ): void {
    const model = JUDGE_MODEL_COSTS[modelName];
    if (!model) {
      console.warn(`Unknown model for cost tracking: ${modelName}`);
      return;
    }

    const cost =
      (inputTokens / 1000) * model.inputCost +
      (outputTokens / 1000) * model.outputCost;

    this.totalCost += cost;
    this.evaluationCount += 1;
    this.modelCosts[modelName] = (this.modelCosts[modelName] || 0) + cost;
  }

  getTotalCost(): number {
    return this.totalCost;
  }

  getEvaluationCount(): number {
    return this.evaluationCount;
  }

  getCostByModel(): Record<string, number> {
    return { ...this.modelCosts };
  }

  getAverageCostPerEvaluation(): number {
    return this.evaluationCount > 0 ? this.totalCost / this.evaluationCount : 0;
  }

  isOverBudget(): boolean {
    return !isWithinBudget(this.totalCost);
  }

  getSummary(): string {
    return [
      `Total Cost: ${formatCost(this.totalCost)}`,
      `Evaluations: ${this.evaluationCount}`,
      `Avg Cost: ${formatCost(this.getAverageCostPerEvaluation())}`,
      `Budget: ${getBudgetLimit() === null ? 'No limit' : formatCost(getBudgetLimit()!)}`,
      `Over Budget: ${this.isOverBudget() ? 'Yes' : 'No'}`,
    ].join('\n');
  }
}
