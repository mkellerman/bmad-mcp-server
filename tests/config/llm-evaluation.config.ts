/**
 * LLM Evaluation Framework Configuration
 *
 * Central configuration for the dual-LLM testing framework.
 * Controls judge behavior, cost limits, failure modes, and reporting.
 */

export interface LLMEvaluationConfig {
  judge: JudgeConfig;
  costControl: CostControlConfig;
  consistency: ConsistencyConfig;
  scoring: ScoringConfig;
  failureModes: FailureModesConfig;
  storage: StorageConfig;
  reporting: ReportingConfig;
  monitoring: MonitoringConfig;
}

export interface JudgeConfig {
  defaultModel: string;
  fallbackModel: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

export interface CostControlConfig {
  enabled: boolean;
  strategy: 'all' | 'selective' | 'sample' | 'none';
  samplePercentage: number;
  maxConcurrent: number;
  budgetLimit: number | null;
}

export interface ConsistencyConfig {
  retries: number;
  varianceThreshold: number;
  requireUnanimous: boolean;
  medianSelection: boolean;
}

export interface ScoringConfig {
  defaultThreshold: number;
  scoreBandWidth: number;
  checkpointWeights: Record<string, number>;
}

export interface FailureModesConfig {
  gracefulDegradation: {
    enabled: boolean;
    skipOnError: boolean;
    logWarning: boolean;
    retryAttempts: number;
    retryDelay: number;
    fallbackBehavior: 'skip' | 'warn' | 'fail';
  };
  consistencyCheck: {
    enabled: boolean;
    varianceThreshold: number;
    minSamples: number;
    maxSamples: number;
    failOnHighVariance: boolean;
    useMedian: boolean;
    logVariance: boolean;
  };
  evidenceValidation: {
    enabled: boolean;
    requireExactQuotes: boolean;
    similarityThreshold: number;
    failOnMissingEvidence: boolean;
    logHallucinations: boolean;
    strictMode: boolean;
  };
  costControl: {
    enabled: boolean;
    trackSpending: boolean;
    maxCostPerRun: number | null;
    maxCostPerTest: number;
    stopOnBudgetExceeded: boolean;
    warnThreshold: number;
  };
  scoreBands: {
    enabled: boolean;
    bandWidth: number;
    requireRetest: boolean;
    maxRetests: number;
    passBehavior: 'optimistic' | 'pessimistic' | 'median';
  };
}

export interface StorageConfig {
  enabled: boolean;
  path: string;
  retention: number;
  format: 'json' | 'yaml';
}

export interface ReportingConfig {
  verbose: boolean;
  showReasoningInTests: boolean;
  aggregateOnCompletion: boolean;
  storeResults: boolean;
}

export interface MonitoringConfig {
  trackMetrics: boolean;
  metricsPath: string;
  alerts: {
    highVariance: boolean;
    budgetExceeded: boolean;
    hallucinationDetected: boolean;
    judgeUnavailable: boolean;
  };
}

/**
 * Base configuration with sensible defaults
 */
export const LLM_EVALUATION_CONFIG: LLMEvaluationConfig = {
  // Judge Configuration
  judge: {
    defaultModel: 'gpt-4-turbo-preview',
    fallbackModel: 'gpt-3.5-turbo',
    temperature: 0.0, // Consistent scoring
    maxTokens: 1000,
    timeout: 30000, // 30 seconds
  },

  // Cost Controls
  costControl: {
    enabled: true,
    strategy: 'selective', // Only critical tests by default
    samplePercentage: 0.1, // 10% when using 'sample' strategy
    maxConcurrent: 3, // Limit parallel judge calls
    budgetLimit: null, // No limit by default
  },

  // Consistency & Reliability
  consistency: {
    retries: 3, // Number of judge samples
    varianceThreshold: 10, // Max % variance across samples
    requireUnanimous: false, // Don't require all samples to agree
    medianSelection: true, // Use median of samples
  },

  // Scoring
  scoring: {
    defaultThreshold: 80, // Pass score (0-100)
    scoreBandWidth: 5, // ±5 around threshold for retesting
    checkpointWeights: {}, // Empty = equal weights
  },

  // Failure Modes (Defensive Defaults)
  failureModes: {
    // Mode 1: Judge LLM Unavailable
    gracefulDegradation: {
      enabled: true,
      skipOnError: true, // Don't fail test run
      logWarning: true,
      retryAttempts: 2,
      retryDelay: 1000, // ms
      fallbackBehavior: 'skip',
    },

    // Mode 2: Inconsistent Scoring
    consistencyCheck: {
      enabled: true,
      varianceThreshold: 10, // %
      minSamples: 3,
      maxSamples: 5,
      failOnHighVariance: false, // Warn instead
      useMedian: true,
      logVariance: true,
    },

    // Mode 3: Judge Hallucination
    evidenceValidation: {
      enabled: true,
      requireExactQuotes: false, // Allow fuzzy matching
      similarityThreshold: 0.9,
      failOnMissingEvidence: false, // Warn instead
      logHallucinations: true,
      strictMode: false,
    },

    // Mode 4: Cost Explosion
    costControl: {
      enabled: true,
      trackSpending: true,
      maxCostPerRun: null, // No limit
      maxCostPerTest: 0.1, // $0.10 per test max
      stopOnBudgetExceeded: false, // Warn instead
      warnThreshold: 0.8, // Warn at 80% budget
    },

    // Mode 5: Flaky Tests
    scoreBands: {
      enabled: true,
      bandWidth: 5, // ±5 points
      requireRetest: true,
      maxRetests: 2,
      passBehavior: 'optimistic', // Pass if any sample passes
    },
  },

  // Storage
  storage: {
    enabled: true,
    path: 'tests/results/evaluations',
    retention: 30, // Days
    format: 'json',
  },

  // Reporting
  reporting: {
    verbose: false,
    showReasoningInTests: true,
    aggregateOnCompletion: true,
    storeResults: true,
  },

  // Monitoring & Alerting
  monitoring: {
    trackMetrics: true,
    metricsPath: 'tests/results/llm-eval-metrics.json',
    alerts: {
      highVariance: true,
      budgetExceeded: true,
      hallucinationDetected: true,
      judgeUnavailable: true,
    },
  },
};

/**
 * Environment-specific profiles
 */
const PROFILES: Record<string, Partial<LLMEvaluationConfig>> = {
  development: {
    costControl: {
      enabled: true,
      strategy: 'all', // Run all evaluations locally
      samplePercentage: 1.0,
      maxConcurrent: 3,
      budgetLimit: null,
    },
    consistency: {
      retries: 1, // Faster feedback
      varianceThreshold: 15,
      requireUnanimous: false,
      medianSelection: false,
    },
    reporting: {
      verbose: true,
      showReasoningInTests: true,
      aggregateOnCompletion: false,
      storeResults: false, // Don't store in development
    },
  },

  ci: {
    costControl: {
      enabled: true,
      strategy: 'selective', // Only critical tests
      samplePercentage: 0,
      maxConcurrent: 2,
      budgetLimit: 0.5, // $0.50 per run
    },
    consistency: {
      retries: 3,
      varianceThreshold: 10,
      requireUnanimous: false,
      medianSelection: true,
    },
    reporting: {
      verbose: false,
      showReasoningInTests: false,
      aggregateOnCompletion: true,
      storeResults: true, // Store in CI for trend analysis
    },
  },

  nightly: {
    costControl: {
      enabled: true,
      strategy: 'all', // Full evaluation
      samplePercentage: 1.0,
      maxConcurrent: 5,
      budgetLimit: 5.0, // $5 per nightly run
    },
    consistency: {
      retries: 5, // Maximum reliability
      varianceThreshold: 8,
      requireUnanimous: false,
      medianSelection: true,
    },
    reporting: {
      verbose: true,
      showReasoningInTests: true,
      aggregateOnCompletion: true,
      storeResults: true, // Store in nightly for historical data
    },
  },
};

/**
 * Deep merge utility for config objects
 */
function deepMerge<T>(base: T, override: Partial<T>): T {
  const result = { ...base };

  for (const key in override) {
    const value = override[key];
    if (value !== undefined) {
      if (
        typeof value === 'object' &&
        !Array.isArray(value) &&
        value !== null
      ) {
        result[key] = deepMerge(result[key] as any, value as any);
      } else {
        result[key] = value as any;
      }
    }
  }

  return result;
}

/**
 * Get configuration with environment overrides
 */
export function getEvaluationConfig(): LLMEvaluationConfig {
  // Start with base config
  let config = { ...LLM_EVALUATION_CONFIG };

  // Apply profile if specified
  const profile = process.env.TEST_PROFILE || 'development';
  if (PROFILES[profile]) {
    config = deepMerge(config, PROFILES[profile]);
  }

  // Environment variable overrides (highest priority)
  if (process.env.CI === 'true' && !process.env.TEST_PROFILE) {
    config = deepMerge(config, PROFILES.ci);
  }

  if (process.env.SKIP_LLM_EVAL === 'true') {
    config.costControl.strategy = 'none';
  }

  if (process.env.LLM_EVAL_MODEL) {
    config.judge.defaultModel = process.env.LLM_EVAL_MODEL;
  }

  if (process.env.LLM_EVAL_SAMPLE_RATE) {
    config.costControl.samplePercentage = parseFloat(
      process.env.LLM_EVAL_SAMPLE_RATE,
    );
  }

  if (process.env.LLM_EVAL_BUDGET) {
    config.costControl.budgetLimit = parseFloat(process.env.LLM_EVAL_BUDGET);
  }

  return config;
}
