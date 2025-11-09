/**
 * Judge prompt template for evaluating response completeness
 */

import type { EvaluationCriteria } from '../../helpers/llm-evaluation/types';

export const COMPLETENESS_JUDGE_CRITERIA: EvaluationCriteria = {
  description: `
Evaluate whether the response provides all necessary information to fully
answer the user's question or complete the requested task.
`,
  checkpoints: [
    'All required information is present',
    'No critical steps or details omitted',
    'Examples or context provided where helpful',
    'Edge cases or limitations mentioned if relevant',
    'Response enables user to take action or understand fully',
  ],
  context: `
**Evaluation Focus:**
- Coverage: Are all aspects of the request addressed?
- Depth: Is the level of detail appropriate and sufficient?
- Actionability: Can the user proceed with the information given?
- Context: Are prerequisites, dependencies, or limitations explained?

**Scoring Guidelines:**
- 90-100: Comprehensive coverage with all necessary details
- 80-89: Complete with minor omissions of edge case details
- 70-79: Covers main points but missing some helpful context
- 60-69: Partial coverage with significant gaps
- Below 60: Missing critical information that prevents action

**Red Flags (should lower score significantly):**
- Omitting required parameters or steps
- Not addressing all parts of multi-part questions
- Missing critical warnings or prerequisites
- Vague descriptions where specifics are needed
`,
};

/**
 * Create completeness criteria with custom requirements
 */
export function createCompletenessCriteria(
  requiredElements: string[],
  taskType:
    | 'explanation'
    | 'implementation'
    | 'analysis'
    | 'general' = 'general',
): EvaluationCriteria {
  const taskSpecificChecks = {
    explanation: [
      'Concept clearly defined',
      'Examples provided',
      'Use cases explained',
    ],
    implementation: [
      'All implementation steps included',
      'Code examples or pseudocode provided',
      'Error handling mentioned',
    ],
    analysis: [
      'Problem clearly identified',
      'Root causes analyzed',
      'Recommendations provided',
    ],
    general: [],
  };

  return {
    description: COMPLETENESS_JUDGE_CRITERIA.description,
    checkpoints: [
      ...requiredElements.map((elem) => `Includes required element: ${elem}`),
      ...taskSpecificChecks[taskType],
      ...COMPLETENESS_JUDGE_CRITERIA.checkpoints,
    ],
    context: `
${COMPLETENESS_JUDGE_CRITERIA.context}

**Task Type:** ${taskType}
**Required Elements:** ${requiredElements.join(', ')}
`,
  };
}
