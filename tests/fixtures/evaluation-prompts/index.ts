/**
 * Evaluation prompt templates for LLM-as-judge testing
 *
 * These templates provide reusable criteria for common evaluation scenarios.
 * Each template includes:
 * - Description: What aspect of quality to evaluate
 * - Checkpoints: Specific items to verify
 * - Context: Scoring guidelines and red flags
 *
 * Usage:
 * ```typescript
 * import { createRankingCriteria } from './fixtures/evaluation-prompts';
 * import { evaluateTest } from './helpers/llm-evaluation';
 *
 * const result = await evaluateTest(
 *   'test-name',
 *   response,
 *   createRankingCriteria('mobile app development', 'UX/UI', ['create-ux-design'])
 * );
 * ```
 */

export { RANKING_JUDGE_CRITERIA, createRankingCriteria } from './ranking-judge';

export {
  RELEVANCE_JUDGE_CRITERIA,
  createRelevanceCriteria,
} from './relevance-judge';

export {
  COMPLETENESS_JUDGE_CRITERIA,
  createCompletenessCriteria,
} from './completeness-judge';
