/**
 * Remote Fuzzy Matcher
 *
 * Performs fuzzy matching on cached remote manifests.
 * Uses Levenshtein distance for typo correction.
 */

import type { CachedAgent, CachedWorkflow } from './remote-manifest-cache.js';

/**
 * Result of a fuzzy agent match
 */
export interface FuzzyAgentMatch {
  agent: CachedAgent;
  matchType: 'exact' | 'partial' | 'module-qualified' | 'typo';
  confidence: number; // 0.0 to 1.0
}

/**
 * Result of a fuzzy workflow match
 */
export interface FuzzyWorkflowMatch {
  workflow: CachedWorkflow;
  matchType: 'exact' | 'partial' | 'module-qualified' | 'typo';
  confidence: number;
}

/**
 * Calculate Levenshtein distance between two strings
 *
 * @param a - First string
 * @param b - Second string
 * @returns Edit distance (number of insertions/deletions/substitutions)
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Fuzzy match agents from manifest
 *
 * Supports multiple query formats:
 * - Simple name: "debug"
 * - Module-qualified: "debug-diana-v6/debug"
 * - Full repo path: "agents/debug-diana-v6/agents/debug"
 *
 * Matching strategies (in priority order):
 * 1. Exact match (case-insensitive)
 * 2. Module-qualified match
 * 3. Partial match (contains)
 * 4. Typo correction (Levenshtein distance ≤ 1)
 *
 * @param query - Agent search query
 * @param agents - Agents from cached manifest
 * @returns Array of matches, sorted by confidence (best first)
 */
export function fuzzyMatchAgents(
  query: string,
  agents: CachedAgent[],
): FuzzyAgentMatch[] {
  const matches: FuzzyAgentMatch[] = [];

  // Parse query to extract module and agent parts
  const { modulePart, agentPart } = parseQuery(query);

  const agentPartLower = agentPart.toLowerCase();
  const modulePartLower = modulePart?.toLowerCase();

  // Strategy 1: Exact match on agent name
  for (const agent of agents) {
    if (agent.name.toLowerCase() === agentPartLower) {
      // If query has module part, verify module matches too
      if (modulePartLower) {
        if (agent.moduleName.toLowerCase().includes(modulePartLower)) {
          matches.push({
            agent,
            matchType: 'module-qualified',
            confidence: 1.0,
          });
        }
      } else {
        matches.push({
          agent,
          matchType: 'exact',
          confidence: 1.0,
        });
      }
    }
  }

  if (matches.length > 0) {
    return matches;
  }

  // Strategy 2: Module-qualified partial match
  if (modulePartLower) {
    for (const agent of agents) {
      const moduleMatches = agent.moduleName
        .toLowerCase()
        .includes(modulePartLower);
      const agentMatches = agent.name.toLowerCase().includes(agentPartLower);

      if (moduleMatches && agentMatches) {
        matches.push({
          agent,
          matchType: 'module-qualified',
          confidence: 0.9,
        });
      }
    }

    if (matches.length > 0) {
      return matches;
    }
  }

  // Strategy 3: Partial match on agent name
  for (const agent of agents) {
    const agentNameLower = agent.name.toLowerCase();

    if (
      agentNameLower.includes(agentPartLower) &&
      agentPartLower.length >= 3 &&
      agentPartLower.length / agentNameLower.length > 0.5
    ) {
      matches.push({
        agent,
        matchType: 'partial',
        confidence: 0.7,
      });
    }
  }

  if (matches.length > 0) {
    return matches;
  }

  // Strategy 4: Typo correction (distance ≤ 1)
  for (const agent of agents) {
    const distance = levenshteinDistance(
      agentPartLower,
      agent.name.toLowerCase(),
    );

    if (distance === 1) {
      matches.push({
        agent,
        matchType: 'typo',
        confidence: 0.8,
      });
    }
  }

  // Sort by confidence descending
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Fuzzy match workflows from manifest
 *
 * Same strategy as agent matching.
 *
 * @param query - Workflow search query
 * @param workflows - Workflows from cached manifest
 * @returns Array of matches, sorted by confidence (best first)
 */
export function fuzzyMatchWorkflows(
  query: string,
  workflows: CachedWorkflow[],
): FuzzyWorkflowMatch[] {
  const matches: FuzzyWorkflowMatch[] = [];

  const { modulePart, agentPart: workflowPart } = parseQuery(query);

  const workflowPartLower = workflowPart.toLowerCase();
  const modulePartLower = modulePart?.toLowerCase();

  // Strategy 1: Exact match
  for (const workflow of workflows) {
    if (workflow.name.toLowerCase() === workflowPartLower) {
      if (modulePartLower) {
        if (workflow.moduleName.toLowerCase().includes(modulePartLower)) {
          matches.push({
            workflow,
            matchType: 'module-qualified',
            confidence: 1.0,
          });
        }
      } else {
        matches.push({
          workflow,
          matchType: 'exact',
          confidence: 1.0,
        });
      }
    }
  }

  if (matches.length > 0) {
    return matches;
  }

  // Strategy 2: Module-qualified partial match
  if (modulePartLower) {
    for (const workflow of workflows) {
      const moduleMatches = workflow.moduleName
        .toLowerCase()
        .includes(modulePartLower);
      const workflowMatches = workflow.name
        .toLowerCase()
        .includes(workflowPartLower);

      if (moduleMatches && workflowMatches) {
        matches.push({
          workflow,
          matchType: 'module-qualified',
          confidence: 0.9,
        });
      }
    }

    if (matches.length > 0) {
      return matches;
    }
  }

  // Strategy 3: Partial match
  for (const workflow of workflows) {
    const workflowNameLower = workflow.name.toLowerCase();

    if (
      workflowNameLower.includes(workflowPartLower) &&
      workflowPartLower.length >= 3 &&
      workflowPartLower.length / workflowNameLower.length > 0.5
    ) {
      matches.push({
        workflow,
        matchType: 'partial',
        confidence: 0.7,
      });
    }
  }

  if (matches.length > 0) {
    return matches;
  }

  // Strategy 4: Typo correction
  for (const workflow of workflows) {
    const distance = levenshteinDistance(
      workflowPartLower,
      workflow.name.toLowerCase(),
    );

    if (distance === 1) {
      matches.push({
        workflow,
        matchType: 'typo',
        confidence: 0.8,
      });
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Parse query to extract module and agent/workflow parts
 *
 * Handles multiple formats:
 * - "debug" → { modulePart: undefined, agentPart: "debug" }
 * - "debug-diana-v6/debug" → { modulePart: "debug-diana-v6", agentPart: "debug" }
 * - "agents/debug-diana-v6/agents/debug" → { modulePart: "debug-diana-v6", agentPart: "debug" }
 *
 * @param query - Search query
 * @returns Parsed module and agent/workflow parts
 */
function parseQuery(query: string): {
  modulePart: string | undefined;
  agentPart: string;
} {
  if (!query.includes('/')) {
    return { modulePart: undefined, agentPart: query };
  }

  const parts = query.split('/');

  // Full repo path format: "agents/MODULE/agents/AGENT"
  if (parts.length >= 4 && parts[0] === 'agents' && parts[2] === 'agents') {
    return {
      modulePart: parts[1],
      agentPart: parts.slice(3).join('/'),
    };
  }

  // "MODULE/agents/AGENT" format
  if (parts.length >= 3 && parts[1] === 'agents') {
    return {
      modulePart: parts[0],
      agentPart: parts.slice(2).join('/'),
    };
  }

  // "modules/MODULE/agents/AGENT" format
  if (parts.length >= 4 && parts[0] === 'modules' && parts[2] === 'agents') {
    return {
      modulePart: parts[1],
      agentPart: parts.slice(3).join('/'),
    };
  }

  // Simple "MODULE/AGENT" format
  return {
    modulePart: parts[0],
    agentPart: parts.slice(1).join('/'),
  };
}
