/**
 * BMAD Search Operation
 *
 * Performs fuzzy search across agents and workflows by name, title, and description.
 * This operation is READ-ONLY and has no side effects.
 *
 * Search targets:
 * - agents: Search agent names, titles, and descriptions
 * - workflows: Search workflow names and descriptions
 * - all: Search both agents and workflows
 *
 * Returns ranked results with relevance scoring.
 */

import type { BMADEngine, BMADResult } from '../../core/bmad-engine.js';

/**
 * Parameters for search operation
 */
export interface SearchParams {
  /** Search query string */
  query: string;
  /** What to search (agents, workflows, all) */
  type?: 'agents' | 'workflows' | 'all';
  /** Optional module filter */
  module?: string;
}

/**
 * Execute search operation
 *
 * @param engine - BMAD Engine instance
 * @param params - Search operation parameters
 * @returns BMADResult with search results
 */
export async function executeSearchOperation(
  engine: BMADEngine,
  params: SearchParams,
): Promise<BMADResult> {
  const searchType = params.type || 'all';

  // Note: engine.search() doesn't support module filter yet
  // TODO: Add module filtering after search results are returned
  return await engine.search(params.query, searchType);
}

/**
 * Validate search operation parameters
 *
 * @param params - Parameters to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateSearchParams(params: unknown): string | undefined {
  if (!params || typeof params !== 'object') {
    return 'Parameters must be an object';
  }

  const p = params as Partial<SearchParams>;

  if (!p.query) {
    return 'Missing required parameter: query';
  }

  if (typeof p.query !== 'string') {
    return 'Parameter "query" must be a string';
  }

  if (p.query.trim().length === 0) {
    return 'Parameter "query" cannot be empty';
  }

  if (p.type) {
    const validTypes = ['agents', 'workflows', 'all'];
    if (!validTypes.includes(p.type)) {
      return `Invalid type: ${p.type}. Must be one of: ${validTypes.join(', ')}`;
    }
  }

  if (p.module && typeof p.module !== 'string') {
    return 'Parameter "module" must be a string';
  }

  return undefined;
}

/**
 * Get usage examples for search operation
 */
export function getSearchExamples(): string[] {
  return [
    'Search all: { operation: "search", query: "debug" }',
    'Search agents: { operation: "search", query: "testing", type: "agents" }',
    'Search workflows: { operation: "search", query: "architecture", type: "workflows" }',
    'Search in BMM: { operation: "search", query: "analyst", module: "bmm" }',
  ];
}
