/**
 * Judge Models Configuration
 *
 * Model definitions, costs, and budget limits for LLM-as-judge evaluation.
 * Used for cost tracking and budget enforcement.
 *
 * Uses GitHub Copilot Proxy for multi-provider support:
 * - OpenAI (GPT-4o, GPT-5, O-series)
 * - Anthropic (Claude Sonnet 4)
 * - Google (Gemini 2.0, 2.5)
 * - xAI (Grok)
 *
 * All models accessed through Copilot Plus subscription.
 * No separate API keys required - authenticate with:
 *   npx copilot-proxy --auth
 *
 * Note: Costs listed below are equivalent API costs for comparison.
 * Actual usage is covered by Copilot subscription quota.
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
 *
 * COPILOT PROXY MODELS (via GitHub Copilot Plus subscription)
 */
export const JUDGE_MODEL_COSTS: Record<string, ModelCost> = {
  // === OpenAI Models (via Copilot) ===

  // GPT-4o - Latest GPT-4 optimized model
  'gpt-4o': {
    inputCost: 0.0025,
    outputCost: 0.01,
    displayName: 'GPT-4o (Copilot)',
    recommended: true,
  },

  // GPT-4.1 - Newer GPT-4 variant
  'gpt-4.1': {
    inputCost: 0.003,
    outputCost: 0.012,
    displayName: 'GPT-4.1 (Copilot)',
    recommended: true,
  },

  // GPT-5 - Next generation model
  'gpt-5': {
    inputCost: 0.005,
    outputCost: 0.02,
    displayName: 'GPT-5 (Copilot)',
    recommended: true,
  },

  // GPT-5 Mini - Faster, cheaper GPT-5
  'gpt-5-mini': {
    inputCost: 0.001,
    outputCost: 0.004,
    displayName: 'GPT-5 Mini (Copilot)',
    recommended: true,
  },

  // O4 Mini - Reasoning-optimized model
  'o4-mini': {
    inputCost: 0.002,
    outputCost: 0.008,
    displayName: 'O4 Mini (Copilot)',
    recommended: false,
  },

  // O3 Mini - Earlier reasoning model
  'o3-mini': {
    inputCost: 0.0015,
    outputCost: 0.006,
    displayName: 'O3 Mini (Copilot)',
    recommended: false,
  },

  // === Anthropic Models (via Copilot) ===

  // Claude Sonnet 4 - Latest Claude model
  'claude-sonnet-4': {
    inputCost: 0.003,
    outputCost: 0.015,
    displayName: 'Claude Sonnet 4 (Copilot)',
    recommended: true,
  },

  // === Google Models (via Copilot) ===

  // Gemini 2.0 Flash - Fast Gemini model
  'gemini-2.0-flash-001': {
    inputCost: 0.0001,
    outputCost: 0.0004,
    displayName: 'Gemini 2.0 Flash (Copilot)',
    recommended: true,
  },

  // Gemini 2.5 Pro - Advanced Gemini model
  'gemini-2.5-pro': {
    inputCost: 0.00125,
    outputCost: 0.005,
    displayName: 'Gemini 2.5 Pro (Copilot)',
    recommended: true,
  },

  // === xAI Models (via Copilot) ===

  // Grok Code Fast - Coding-optimized model
  'grok-code-fast-1': {
    inputCost: 0.0005,
    outputCost: 0.002,
    displayName: 'Grok Code Fast (Copilot)',
    recommended: false,
  },

  // === Legacy Models (for reference/comparison) ===

  // GPT-4 Turbo - High quality, moderate cost
  'gpt-4-turbo-preview': {
    inputCost: 0.01,
    outputCost: 0.03,
    displayName: 'GPT-4 Turbo',
    recommended: false,
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
    recommended: false,
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

  // Gemini Pro - Google's competitive offering
  'gemini-pro': {
    inputCost: 0.000125,
    outputCost: 0.000375,
    displayName: 'Gemini Pro',
    recommended: false, // Cheaper but needs validation
  },

  // Gemini 1.5 Pro - Latest Google model
  'gemini-1.5-pro': {
    inputCost: 0.00125,
    outputCost: 0.005,
    displayName: 'Gemini 1.5 Pro',
    recommended: false,
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
