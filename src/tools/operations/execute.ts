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
import {
  emit,
  metricsEnabled,
  metricsVariant,
  correlationId,
} from '../../utils/metrics.js';

function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  onTimeout: () => void,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      try {
        onTimeout();
      } catch {
        /* noop */
      }
      reject(new Error('EXECUTE_TIMEOUT'));
    }, ms);
    p.then((v) => {
      if (timer) clearTimeout(timer);
      resolve(v);
    }).catch((e) => {
      if (timer) clearTimeout(timer);
      reject(e instanceof Error ? e : new Error(String(e)));
    });
  });
}

/**
 * Parameters for execute operation
 */
export interface ExecuteOperationParams {
  /** What to execute (agent, workflow) - OPTIONAL, inferred from other params */
  type?: 'agent' | 'workflow';
  /** Agent name (for type=agent) */
  agent?: string;
  /** Workflow name (for type=workflow) */
  workflow?: string;
  /** User message/context (optional - some agents/workflows may work without initial message) */
  message?: string;
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
  const timeoutMs = Math.max(
    1000,
    Number(process.env.BMAD_EXECUTE_TIMEOUT_MS || 60000),
  );
  const corr = correlationId();

  // Infer type from parameters if not explicitly provided
  let type = params.type;
  if (!type) {
    if (params.agent) {
      type = 'agent';
    } else if (params.workflow) {
      type = 'workflow';
    }
  }

  // Build ExecuteParams for engine
  const execParams: ExecuteParams = {
    agent: params.agent,
    workflow: params.workflow,
    message: params.message || '', // Default to empty string if not provided
    module: params.module,
  };

  switch (type) {
    case 'agent':
      if (!params.agent) {
        return {
          success: false,
          error: 'Missing required parameter: agent',
          text: '',
        };
      }
      if (metricsEnabled()) {
        await emit({
          event: 'execute_step',
          variant: metricsVariant(),
          id: corr,
          stage: 'agent:start',
          agent: params.agent ?? '',
        });
      }
      try {
        const result = await withTimeout(
          engine.executeAgent(execParams),
          timeoutMs,
          () => {
            if (metricsEnabled())
              void emit({
                event: 'execute_timeout',
                variant: metricsVariant(),
                id: corr,
                stage: 'agent:timeout',
                timeoutMs,
              });
          },
        );
        if (metricsEnabled())
          await emit({
            event: 'execute_step',
            variant: metricsVariant(),
            id: corr,
            stage: 'agent:done',
          });
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === 'EXECUTE_TIMEOUT') {
          return {
            success: false,
            error: `Execution timed out after ${timeoutMs}ms`,
            text: '',
          };
        }
        return { success: false, error: msg, text: '' };
      }

    case 'workflow':
      if (!params.workflow) {
        return {
          success: false,
          error: 'Missing required parameter: workflow',
          text: '',
        };
      }
      if (metricsEnabled()) {
        await emit({
          event: 'execute_step',
          variant: metricsVariant(),
          id: corr,
          stage: 'workflow:start',
          workflow: params.workflow ?? '',
        });
      }
      try {
        const result = await withTimeout(
          engine.executeWorkflow(execParams),
          timeoutMs,
          () => {
            if (metricsEnabled())
              void emit({
                event: 'execute_timeout',
                variant: metricsVariant(),
                id: corr,
                stage: 'workflow:timeout',
                timeoutMs,
              });
          },
        );
        if (metricsEnabled())
          await emit({
            event: 'execute_step',
            variant: metricsVariant(),
            id: corr,
            stage: 'workflow:done',
          });
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === 'EXECUTE_TIMEOUT') {
          return {
            success: false,
            error: `Execution timed out after ${timeoutMs}ms`,
            text: '',
          };
        }
        return { success: false, error: msg, text: '' };
      }

    default:
      return {
        success: false,
        error: `Cannot determine execute type. Provide either 'agent' or 'workflow' parameter`,
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

  // Type is now optional - we'll infer it from other params
  // But if provided, it must be valid
  if (p.type) {
    const validTypes = ['agent', 'workflow'];
    if (!validTypes.includes(p.type)) {
      return `Invalid type: ${p.type}. Must be one of: ${validTypes.join(', ')}`;
    }
  }

  // Check that at least one identifying parameter is provided
  const hasIdentifier = !!(p.agent || p.workflow);
  if (!hasIdentifier) {
    return 'Must provide either agent or workflow parameter';
  }

  // Message is optional, but if provided must be valid
  if (p.message !== undefined) {
    if (typeof p.message !== 'string') {
      return 'Parameter "message" must be a string';
    }
    // Allow empty string - some agents/workflows might accept it
  }

  // Validate parameter types
  if (p.agent && typeof p.agent !== 'string') {
    return 'Parameter "agent" must be a string';
  }

  if (p.workflow && typeof p.workflow !== 'string') {
    return 'Parameter "workflow" must be a string';
  }

  if (p.module && typeof p.module !== 'string') {
    return 'Parameter "module" must be a string';
  }

  // Module is required for execute operations
  if (!p.module) {
    return 'Missing required parameter: module (required for execute operations to ensure proper discovery)';
  }

  return undefined;
}

/**
 * Get usage examples for execute operation
 */
export function getExecuteExamples(): string[] {
  return [
    'Execute agent: { operation: "execute", agent: "analyst", module: "bmm", message: "Help me brainstorm a mobile app" }',
    'Execute workflow: { operation: "execute", workflow: "prd", module: "bmm", message: "Create PRD for e-commerce platform" }',
    'Execute agent without message: { operation: "execute", agent: "bmad-master", module: "core" }',
  ];
}
