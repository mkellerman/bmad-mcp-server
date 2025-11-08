/**
 * Critical Tests Configuration
 *
 * Defines which tests always run LLM evaluation regardless of cost controls.
 * Also includes per-test custom thresholds and evaluation rules.
 */

export interface CriticalTestConfig {
  alwaysEvaluate: string[];
  conditional: string[];
  neverEvaluate: string[];
  customThresholds: Record<string, TestThresholds>;
}

export interface TestThresholds {
  passingScore: number;
  varianceThreshold?: number;
  retries?: number;
  scoreBandWidth?: number;
}

/**
 * Critical test suites configuration
 */
export const CRITICAL_TEST_SUITES: CriticalTestConfig = {
  /**
   * Tests that ALWAYS run LLM evaluation, regardless of cost controls
   * These are high-value tests that validate core system behavior
   */
  alwaysEvaluate: [
    'ranking-quality',
    'workflow-selection',
    'agent-response-relevance',
    'sampling-prioritization',
  ],

  /**
   * Tests that use LLM evaluation only when budget allows
   * Important but not critical
   */
  conditional: [
    'error-message-quality',
    'ambiguous-response-handling',
    'help-text-clarity',
    'workflow-description-accuracy',
  ],

  /**
   * Tests that never use LLM evaluation
   * These are better suited for traditional assertions (schema, structure, etc.)
   */
  neverEvaluate: [
    'basic-validation',
    'schema-compliance',
    'protocol-correctness',
    'type-safety',
    'error-codes',
  ],

  /**
   * Per-test custom thresholds (override defaults)
   */
  customThresholds: {
    // High bar - core ranking functionality
    'ranking-quality': {
      passingScore: 85,
      varianceThreshold: 5,
      retries: 5,
    },

    // Lower bar - subjective quality assessment
    'error-message-quality': {
      passingScore: 70,
      varianceThreshold: 15,
      retries: 3,
    },

    // Moderate bar - important but not critical
    'workflow-selection': {
      passingScore: 80,
      varianceThreshold: 10,
      retries: 3,
    },

    // High bar - directly impacts UX
    'agent-response-relevance': {
      passingScore: 85,
      varianceThreshold: 8,
      retries: 4,
    },

    // Moderate bar - optimization feature
    'sampling-prioritization': {
      passingScore: 75,
      varianceThreshold: 12,
      retries: 3,
    },

    // Lower bar - helpful but not critical
    'ambiguous-response-handling': {
      passingScore: 70,
      varianceThreshold: 15,
      scoreBandWidth: 8,
    },
  },
};

/**
 * Helper to check if a test should run LLM evaluation
 */
export function shouldEvaluateTest(
  testName: string,
  strategy: 'all' | 'selective' | 'sample' | 'none',
  sampleRate: number = 0.1,
): boolean {
  // Never evaluate if strategy is 'none'
  if (strategy === 'none') return false;

  // Never evaluate if in neverEvaluate list
  if (CRITICAL_TEST_SUITES.neverEvaluate.includes(testName)) return false;

  // Always evaluate critical tests
  if (CRITICAL_TEST_SUITES.alwaysEvaluate.includes(testName)) return true;

  // Strategy-based decisions for non-critical tests
  switch (strategy) {
    case 'all':
      return true;

    case 'selective':
      return false; // Only critical tests

    case 'sample':
      // Conditional tests use sample rate, others are skipped
      if (CRITICAL_TEST_SUITES.conditional.includes(testName)) {
        return Math.random() < sampleRate;
      }
      return false;

    default:
      return false;
  }
}

/**
 * Get custom thresholds for a test, or defaults
 */
export function getTestThresholds(
  testName: string,
  defaults: { passingScore: number; varianceThreshold: number },
): TestThresholds {
  const custom = CRITICAL_TEST_SUITES.customThresholds[testName];

  if (!custom) {
    return defaults;
  }

  return {
    passingScore: custom.passingScore ?? defaults.passingScore,
    varianceThreshold: custom.varianceThreshold ?? defaults.varianceThreshold,
    retries: custom.retries,
    scoreBandWidth: custom.scoreBandWidth,
  };
}
