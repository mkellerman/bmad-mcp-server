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
  /** What to read (agent, workflow, resource) */
  type: 'agent' | 'workflow' | 'resource';
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
  switch (params.type) {
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
        error: `Invalid read type: ${String(params.type)}. Must be one of: agent, workflow, resource`,
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

  if (!p.type) {
    return 'Missing required parameter: type';
  }

  const validTypes = ['agent', 'workflow', 'resource'];
  if (!validTypes.includes(p.type)) {
    return `Invalid type: ${p.type}. Must be one of: ${validTypes.join(', ')}`;
  }

  // Type-specific validation
  if (p.type === 'agent' && !p.agent) {
    return 'Missing required parameter: agent (when type=agent)';
  }

  if (p.type === 'workflow' && !p.workflow) {
    return 'Missing required parameter: workflow (when type=workflow)';
  }

  if (p.type === 'resource' && !p.uri) {
    return 'Missing required parameter: uri (when type=resource)';
  }

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
    'Read agent: { operation: "read", type: "agent", agent: "analyst" }',
    'Read agent with module: { operation: "read", type: "agent", agent: "analyst", module: "bmm" }',
    'Read workflow: { operation: "read", type: "workflow", workflow: "prd" }',
    'Read workflow with module: { operation: "read", type: "workflow", workflow: "prd", module: "bmm" }',
    'Read resource: { operation: "read", type: "resource", uri: "bmad://core/config.yaml" }',
  ];
}
