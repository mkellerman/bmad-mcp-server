/**
 * Judge prompt template for evaluating workflow/agent ranking quality
 */

import type { EvaluationCriteria } from '../../helpers/llm-evaluation/types';

export const RANKING_JUDGE_CRITERIA: EvaluationCriteria = {
  description: `
Evaluate the quality of workflow/agent ranking based on relevance to the user's query.
Focus on whether the most relevant items appear first and irrelevant items are deprioritized.
`,
  checkpoints: [
    'Top result is highly relevant to query',
    'Top 3 results are all relevant',
    'Top 5 results prioritize domain-specific workflows',
    'Irrelevant or generic items appear after position 5',
    'Ranking demonstrates understanding of query intent',
  ],
  context: `
**Evaluation Focus:**
- Semantic relevance: Does the workflow/agent match the query intent?
- Prioritization: Are the MOST relevant items ranked first?
- Domain specificity: Are specialized workflows ranked above generic ones?
- Negative signals: Are clearly irrelevant items ranked low?

**Scoring Guidelines:**
- 90-100: Perfect or near-perfect ranking with highly relevant top results
- 80-89: Good ranking with relevant top 3, minor issues in 4-5
- 70-79: Acceptable ranking with relevant top result but suboptimal ordering
- 60-69: Partial success - some relevant items ranked but mixed with irrelevant
- Below 60: Poor ranking with irrelevant items in top positions

**Red Flags (should lower score significantly):**
- Irrelevant workflow in position 1
- Generic workflow ranked above specialized one when specialized is needed
- Clear domain mismatch in top 3
- Opposite intent (e.g., delete ranked high for create query)
`,
};

/**
 * Create ranking criteria with custom query context
 */
export function createRankingCriteria(
  query: string,
  expectedDomain?: string,
  expectedTop?: string[],
): EvaluationCriteria {
  return {
    description: RANKING_JUDGE_CRITERIA.description,
    checkpoints: [
      ...(expectedTop?.map((item) => `"${item}" appears in top 5`) || []),
      ...RANKING_JUDGE_CRITERIA.checkpoints,
    ],
    context: `
${RANKING_JUDGE_CRITERIA.context}

**Query Being Evaluated:** "${query}"
${expectedDomain ? `**Expected Domain:** ${expectedDomain}` : ''}
${expectedTop ? `**Expected Top Results:** ${expectedTop.join(', ')}` : ''}
`,
  };
}
