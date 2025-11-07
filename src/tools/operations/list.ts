/**
 * BMAD List Operation
 *
 * Handles discovery operations for agents, workflows, modules, and resources.
 * This operation is READ-ONLY and has no side effects.
 *
 * Supported queries:
 * - agents: List all available agents
 * - workflows: List all available workflows
 * - modules: List all loaded BMAD modules
 * - resources: List all available resources (files)
 *
 * Can be filtered by module (core, bmm, cis, etc.)
 */

import type {
  BMADEngine,
  BMADResult,
  ListFilter,
} from '../../core/bmad-engine.js';

/**
 * Parameters for list operation
 */
export interface ListParams {
  /** What to list (agents, workflows, modules, resources) */
  query: 'agents' | 'workflows' | 'modules' | 'resources';
  /** Optional module filter */
  module?: string;
  /** Optional pattern for resources (glob-style) */
  pattern?: string;
}

/**
 * Execute list operation
 *
 * @param engine - BMAD Engine instance
 * @param params - List operation parameters
 * @returns BMADResult with list data
 */
export async function executeListOperation(
  engine: BMADEngine,
  params: ListParams,
): Promise<BMADResult> {
  const filter: ListFilter = {
    module: params.module,
    pattern: params.pattern,
  };

  switch (params.query) {
    case 'agents':
      return await engine.listAgents(filter);

    case 'workflows':
      return await engine.listWorkflows(filter);

    case 'modules':
      return await engine.listModules();

    case 'resources':
      return await engine.listResources(filter);

    default:
      return {
        success: false,
        error: `Invalid query type: ${String(params.query)}. Must be one of: agents, workflows, modules, resources`,
        text: '',
      };
  }
}

/**
 * Validate list operation parameters
 *
 * @param params - Parameters to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateListParams(params: unknown): string | undefined {
  if (!params || typeof params !== 'object') {
    return 'Parameters must be an object';
  }

  const p = params as Partial<ListParams>;

  if (!p.query) {
    return 'Missing required parameter: query';
  }

  const validQueries = ['agents', 'workflows', 'modules', 'resources'];
  if (!validQueries.includes(p.query)) {
    return `Invalid query type: ${String(p.query)}. Must be one of: ${validQueries.join(', ')}`;
  }

  if (p.module && typeof p.module !== 'string') {
    return 'Parameter "module" must be a string';
  }

  if (p.pattern && typeof p.pattern !== 'string') {
    return 'Parameter "pattern" must be a string';
  }

  return undefined;
}

/**
 * Get usage examples for list operation
 */
export function getListExamples(): string[] {
  return [
    'List all agents: { operation: "list", query: "agents" }',
    'List BMM agents: { operation: "list", query: "agents", module: "bmm" }',
    'List all workflows: { operation: "list", query: "workflows" }',
    'List core workflows: { operation: "list", query: "workflows", module: "core" }',
    'List all modules: { operation: "list", query: "modules" }',
    'List all resources: { operation: "list", query: "resources" }',
    'List core YAML files: { operation: "list", query: "resources", module: "core", pattern: "**/*.yaml" }',
  ];
}
