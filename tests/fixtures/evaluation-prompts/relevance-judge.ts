/**
 * Judge prompt template for evaluating response relevance and appropriateness
 */

import type { EvaluationCriteria } from '../../helpers/llm-evaluation/types';

export const RELEVANCE_JUDGE_CRITERIA: EvaluationCriteria = {
  description: `
Evaluate whether the agent's response directly addresses the user's request
and provides appropriate, helpful information without hallucination or irrelevance.
`,
  checkpoints: [
    'Response directly addresses the user query',
    'Information provided is accurate and factual',
    'No hallucinated or fabricated details',
    'Tone and depth appropriate to request',
    'Response is complete (not truncated or missing key info)',
  ],
  context: `
**Evaluation Focus:**
- Direct relevance: Does the response answer what was asked?
- Accuracy: Are facts, names, and technical details correct?
- Completeness: Is the response thorough without being verbose?
- Appropriateness: Is the tone, format, and depth suitable?

**Scoring Guidelines:**
- 90-100: Perfectly relevant, accurate, complete response
- 80-89: Highly relevant with minor omissions or excess detail
- 70-79: Mostly relevant but missing some key points or has minor inaccuracies
- 60-69: Partially relevant with significant gaps or tone issues
- Below 60: Misses the point, hallucinations, or fundamentally wrong

**Red Flags (should lower score significantly):**
- Hallucinated names, features, or capabilities
- Answering a different question than asked
- Missing critical information that was explicitly requested
- Fabricated technical details or non-existent functions
`,
};

/**
 * Create relevance criteria with custom request context
 */
export function createRelevanceCriteria(
  userRequest: string,
  expectedElements?: string[],
  domain?: string,
): EvaluationCriteria {
  return {
    description: RELEVANCE_JUDGE_CRITERIA.description,
    checkpoints: [
      ...(expectedElements?.map((elem) => `Response includes: ${elem}`) || []),
      ...RELEVANCE_JUDGE_CRITERIA.checkpoints,
    ],
    context: `
${RELEVANCE_JUDGE_CRITERIA.context}

**User Request:** "${userRequest}"
${domain ? `**Domain Context:** ${domain}` : ''}
${expectedElements ? `**Expected Elements:** ${expectedElements.join(', ')}` : ''}
`,
  };
}
