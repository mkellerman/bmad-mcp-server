/**
 * BMAD Read Operation
 *
 * Retrieves full definitions of agents, workflows, or resources.
 * This operation is READ-ONLY and has no side effects.
 *
 * Read targets:
 * - agent: Get agent definition (instructions, workflows, persona)
 * - workflow: Get workflow definition (YAML content)
 * - resource: Get arbitrary BMAD resource file content
 *
 * Returns complete definition including metadata and content.
 */

import type { BMADEngine, BMADResult } from '../../core/bmad-engine.js';

/**
 * Parameters for read operation
 */
export interface ReadParams {
  /** What to read (agent, workflow, resource) - OPTIONAL, inferred from other params */
  type?: 'agent' | 'workflow' | 'resource';
  /** Agent name (for type=agent) */
  agent?: string;
  /** Workflow name (for type=workflow) */
  workflow?: string;
  /** Resource URI (for type=resource) */
  uri?: string;
  /** Optional module hint for disambiguation */
  module?: string;
}

/**
 * Execute read operation
 *
 * @param engine - BMAD Engine instance
 * @param params - Read operation parameters
 * @returns BMADResult with definition content
 */
export async function executeReadOperation(
  engine: BMADEngine,
  params: ReadParams,
): Promise<BMADResult> {
  // Infer type from parameters if not explicitly provided
  let type = params.type;
  if (!type) {
    if (params.agent) {
      type = 'agent';
    } else if (params.workflow) {
      type = 'workflow';
    } else if (params.uri) {
      type = 'resource';
    }
  }

  switch (type) {
    case 'agent':
      if (!params.agent) {
        return {
          success: false,
          error: 'Missing required parameter: agent',
          text: '',
        };
      }
      return await engine.readAgent(params.agent, params.module);

    case 'workflow':
      if (!params.workflow) {
        return {
          success: false,
          error: 'Missing required parameter: workflow',
          text: '',
        };
      }
      return await engine.readWorkflow(params.workflow, params.module);

    case 'resource':
      if (!params.uri) {
        return {
          success: false,
          error: 'Missing required parameter: uri',
          text: '',
        };
      }
      return await engine.readResource(params.uri);

    default:
      return {
        success: false,
        error: `Cannot determine read type. Provide one of: agent, workflow, or uri`,
        text: '',
      };
  }
}

/**
 * Validate read operation parameters
 *
 * @param params - Parameters to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateReadParams(params: unknown): string | undefined {
  if (!params || typeof params !== 'object') {
    return 'Parameters must be an object';
  }

  const p = params as Partial<ReadParams>;

  // Type is now optional - we'll infer it from other params
  // But if provided, it must be valid
  if (p.type) {
    const validTypes = ['agent', 'workflow', 'resource'];
    if (!validTypes.includes(p.type)) {
      return `Invalid type: ${p.type}. Must be one of: ${validTypes.join(', ')}`;
    }
  }

  // Check that at least one identifying parameter is provided
  const hasIdentifier = !!(p.agent || p.workflow || p.uri);
  if (!hasIdentifier) {
    return 'Must provide one of: agent, workflow, or uri';
  }

  // Validate parameter types
  if (p.agent && typeof p.agent !== 'string') {
    return 'Parameter "agent" must be a string';
  }

  if (p.workflow && typeof p.workflow !== 'string') {
    return 'Parameter "workflow" must be a string';
  }

  if (p.uri && typeof p.uri !== 'string') {
    return 'Parameter "uri" must be a string';
  }

  if (p.module && typeof p.module !== 'string') {
    return 'Parameter "module" must be a string';
  }

  return undefined;
}

/**
 * Get usage examples for read operation
 */
export function getReadExamples(): string[] {
  return [
    'Read agent: { operation: "read", agent: "analyst" }',
    'Read agent with module: { operation: "read", agent: "analyst", module: "bmm" }',
    'Read workflow: { operation: "read", workflow: "prd" }',
    'Read workflow with module: { operation: "read", workflow: "prd", module: "bmm" }',
    'Read resource: { operation: "read", uri: "bmad://core/config.yaml" }',
  ];
}
