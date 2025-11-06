/**
 * BMAD Execute Operation
 *
 * Executes agents or workflows with user messages.
 * This operation PERFORMS ACTIONS and may have side effects (file creation, etc.).
 *
 * Execute targets:
 * - agent: Execute an agent with a user message
 * - workflow: Execute a workflow with context
 *
 * Returns execution result including any outputs or artifacts.
 *
 * ⚠️ WARNING: This operation may modify the workspace or create files.
 */

import type {
  BMADEngine,
  BMADResult,
  ExecuteParams,
} from '../../core/bmad-engine.js';

/**
 * Parameters for execute operation
 */
export interface ExecuteOperationParams {
  /** What to execute (agent, workflow) */
  type: 'agent' | 'workflow';
  /** Agent name (for type=agent) */
  agent?: string;
  /** Workflow name (for type=workflow) */
  workflow?: string;
  /** User message/context (REQUIRED) */
  message: string;
  /** Optional module hint for disambiguation */
  module?: string;
}

/**
 * Execute operation
 *
 * @param engine - BMAD Engine instance
 * @param params - Execute operation parameters
 * @returns BMADResult with execution output
 */
export async function executeExecuteOperation(
  engine: BMADEngine,
  params: ExecuteOperationParams,
): Promise<BMADResult> {
  // Build ExecuteParams for engine
  const execParams: ExecuteParams = {
    agent: params.agent,
    workflow: params.workflow,
    message: params.message,
    module: params.module,
  };

  switch (params.type) {
    case 'agent':
      if (!params.agent) {
        return {
          success: false,
          error: 'Missing required parameter: agent',
          text: '',
        };
      }
      return await engine.executeAgent(execParams);

    case 'workflow':
      if (!params.workflow) {
        return {
          success: false,
          error: 'Missing required parameter: workflow',
          text: '',
        };
      }
      return await engine.executeWorkflow(execParams);

    default:
      return {
        success: false,
        error: `Invalid execute type: ${String(params.type)}. Must be one of: agent, workflow`,
        text: '',
      };
  }
}

/**
 * Validate execute operation parameters
 *
 * @param params - Parameters to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateExecuteParams(params: unknown): string | undefined {
  if (!params || typeof params !== 'object') {
    return 'Parameters must be an object';
  }

  const p = params as Partial<ExecuteOperationParams>;

  if (!p.type) {
    return 'Missing required parameter: type';
  }

  const validTypes = ['agent', 'workflow'];
  if (!validTypes.includes(p.type)) {
    return `Invalid type: ${p.type}. Must be one of: ${validTypes.join(', ')}`;
  }

  if (!p.message) {
    return 'Missing required parameter: message';
  }

  if (typeof p.message !== 'string') {
    return 'Parameter "message" must be a string';
  }

  if (p.message.trim().length === 0) {
    return 'Parameter "message" cannot be empty';
  }

  // Type-specific validation
  if (p.type === 'agent' && !p.agent) {
    return 'Missing required parameter: agent (when type=agent)';
  }

  if (p.type === 'workflow' && !p.workflow) {
    return 'Missing required parameter: workflow (when type=workflow)';
  }

  if (p.agent && typeof p.agent !== 'string') {
    return 'Parameter "agent" must be a string';
  }

  if (p.workflow && typeof p.workflow !== 'string') {
    return 'Parameter "workflow" must be a string';
  }

  if (p.module && typeof p.module !== 'string') {
    return 'Parameter "module" must be a string';
  }

  return undefined;
}

/**
 * Get usage examples for execute operation
 */
export function getExecuteExamples(): string[] {
  return [
    'Execute agent: { operation: "execute", type: "agent", agent: "analyst", message: "Help me brainstorm a mobile app" }',
    'Execute with module: { operation: "execute", type: "agent", agent: "debug", module: "bmm", message: "Analyze this error" }',
    'Execute workflow: { operation: "execute", type: "workflow", workflow: "prd", message: "Create PRD for e-commerce platform" }',
  ];
}
