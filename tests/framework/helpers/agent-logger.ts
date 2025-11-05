/**
 * Agent Logger Helper
 *
 * Provides utilities for capturing and formatting agent execution logs
 * for integration with the unified testing framework.
 *
 * Key features:
 * - Capture agent actions and execution flow
 * - Format logs for test reporting
 * - Track agent state transitions
 * - Measure agent execution timing
 */

import type { AgentLog } from '../core/types.js';

/**
 * Agent action types that can be logged
 */
export type AgentActionType =
  | 'workflow_start'
  | 'workflow_end'
  | 'task_start'
  | 'task_end'
  | 'agent_invoked'
  | 'tool_called'
  | 'state_change'
  | 'error'
  | 'info'
  | 'debug';

/**
 * Agent action entry
 */
export interface AgentAction {
  timestamp: string;
  type: AgentActionType;
  agent?: string;
  workflow?: string;
  task?: string;
  tool?: string;
  message: string;
  metadata?: Record<string, any>;
  duration?: number;
}

/**
 * Agent execution context
 */
export interface AgentExecutionContext {
  startTime: number;
  endTime?: number;
  agent?: string;
  workflow?: string;
  actions: AgentAction[];
  metadata: Record<string, any>;
}

/**
 * Agent Logger configuration
 */
export interface AgentLoggerConfig {
  captureDebug?: boolean;
  maxActions?: number;
  includeMetadata?: boolean;
}

/**
 * Agent Logger class for capturing agent execution
 */
export class AgentLogger {
  private context: AgentExecutionContext;
  private config: Required<AgentLoggerConfig>;

  constructor(config: AgentLoggerConfig = {}) {
    this.config = {
      captureDebug: config.captureDebug ?? false,
      maxActions: config.maxActions ?? 1000,
      includeMetadata: config.includeMetadata ?? true,
    };

    this.context = {
      startTime: Date.now(),
      actions: [],
      metadata: {},
    };
  }

  /**
   * Log an agent action
   */
  logAction(
    type: AgentActionType,
    message: string,
    metadata?: Record<string, any>,
  ): void {
    // Skip debug logs if not capturing
    if (type === 'debug' && !this.config.captureDebug) {
      return;
    }

    // Check max actions limit
    if (this.context.actions.length >= this.config.maxActions) {
      return;
    }

    const action: AgentAction = {
      timestamp: new Date().toISOString(),
      type,
      message,
    };

    // Add optional fields
    if (this.context.agent) {
      action.agent = this.context.agent;
    }
    if (this.context.workflow) {
      action.workflow = this.context.workflow;
    }
    if (metadata && this.config.includeMetadata) {
      action.metadata = metadata;
    }

    this.context.actions.push(action);
  }

  /**
   * Log workflow start
   */
  logWorkflowStart(workflow: string, metadata?: Record<string, any>): void {
    this.context.workflow = workflow;
    this.logAction('workflow_start', `Workflow started: ${workflow}`, metadata);
  }

  /**
   * Log workflow end
   */
  logWorkflowEnd(workflow: string, metadata?: Record<string, any>): void {
    this.logAction('workflow_end', `Workflow completed: ${workflow}`, metadata);
  }

  /**
   * Log task start
   */
  logTaskStart(task: string, metadata?: Record<string, any>): void {
    this.logAction('task_start', `Task started: ${task}`, {
      ...metadata,
      task,
    });
  }

  /**
   * Log task end
   */
  logTaskEnd(task: string, metadata?: Record<string, any>): void {
    this.logAction('task_end', `Task completed: ${task}`, {
      ...metadata,
      task,
    });
  }

  /**
   * Log agent invocation
   */
  logAgentInvoked(agent: string, metadata?: Record<string, any>): void {
    this.context.agent = agent;
    this.logAction('agent_invoked', `Agent invoked: ${agent}`, metadata);
  }

  /**
   * Log tool call
   */
  logToolCall(tool: string, args?: Record<string, any>, result?: any): void {
    this.logAction('tool_called', `Tool called: ${tool}`, {
      tool,
      args,
      result,
    });
  }

  /**
   * Log state change
   */
  logStateChange(
    from: string,
    to: string,
    metadata?: Record<string, any>,
  ): void {
    this.logAction('state_change', `State: ${from} → ${to}`, {
      ...metadata,
      from,
      to,
    });
  }

  /**
   * Log error
   */
  logError(error: Error | string, metadata?: Record<string, any>): void {
    const message = error instanceof Error ? error.message : error;
    const errorMetadata = {
      ...metadata,
      error: error instanceof Error ? error.stack : error,
    };
    this.logAction('error', `Error: ${message}`, errorMetadata);
  }

  /**
   * Log info message
   */
  logInfo(message: string, metadata?: Record<string, any>): void {
    this.logAction('info', message, metadata);
  }

  /**
   * Log debug message
   */
  logDebug(message: string, metadata?: Record<string, any>): void {
    this.logAction('debug', message, metadata);
  }

  /**
   * Set context metadata
   */
  setMetadata(key: string, value: any): void {
    this.context.metadata[key] = value;
  }

  /**
   * Get all actions
   */
  getActions(): AgentAction[] {
    return [...this.context.actions];
  }

  /**
   * Get actions by type
   */
  getActionsByType(type: AgentActionType): AgentAction[] {
    return this.context.actions.filter((action) => action.type === type);
  }

  /**
   * Get execution duration
   */
  getDuration(): number {
    const end = this.context.endTime ?? Date.now();
    return end - this.context.startTime;
  }

  /**
   * Mark execution as complete
   */
  complete(): void {
    this.context.endTime = Date.now();
  }

  /**
   * Clear all actions
   */
  clear(): void {
    this.context.actions = [];
  }

  /**
   * Get execution summary
   */
  getSummary(): {
    duration: number;
    actionCount: number;
    errorCount: number;
    agent?: string;
    workflow?: string;
  } {
    return {
      duration: this.getDuration(),
      actionCount: this.context.actions.length,
      errorCount: this.getActionsByType('error').length,
      agent: this.context.agent,
      workflow: this.context.workflow,
    };
  }

  /**
   * Format actions as AgentLog for test reporter
   */
  formatForReporter(): AgentLog {
    return {
      id: `agent-log-${Date.now()}`,
      agentName: this.context.agent ?? 'unknown',
      startTime: new Date(this.context.startTime).toISOString(),
      endTime: this.context.endTime
        ? new Date(this.context.endTime).toISOString()
        : undefined,
      entries: this.context.actions.map((action) => ({
        timestamp: action.timestamp,
        level: this.mapActionTypeToLogLevel(action.type),
        message: action.message,
        context: action.metadata,
      })),
    };
  }

  /**
   * Map action type to log level
   */
  private mapActionTypeToLogLevel(
    type: AgentActionType,
  ): 'debug' | 'info' | 'warn' | 'error' {
    switch (type) {
      case 'error':
        return 'error';
      case 'debug':
        return 'debug';
      case 'workflow_start':
      case 'workflow_end':
      case 'task_start':
      case 'task_end':
      case 'agent_invoked':
      case 'tool_called':
      case 'state_change':
      case 'info':
      default:
        return 'info';
    }
  }
}

/**
 * Create a new agent logger
 */
export function createAgentLogger(config?: AgentLoggerConfig): AgentLogger {
  return new AgentLogger(config);
}

/**
 * Capture agent execution with automatic logging
 */
export async function captureAgentExecution<T>(
  // eslint-disable-next-line no-unused-vars
  fn: (_logger: AgentLogger) => Promise<T>,
  config?: AgentLoggerConfig,
): Promise<{ result: T; logger: AgentLogger }> {
  const logger = createAgentLogger(config);

  try {
    const result = await fn(logger);
    logger.complete();
    return { result, logger };
  } catch (error) {
    logger.logError(error as Error);
    logger.complete();
    throw error;
  }
}

/**
 * Format agent log for display
 */
export function formatAgentLog(log: AgentAction): string {
  const parts = [`[${log.timestamp}]`, `[${log.type.toUpperCase()}]`];

  if (log.agent) {
    parts.push(`[${log.agent}]`);
  }
  if (log.workflow) {
    parts.push(`[${log.workflow}]`);
  }
  if (log.task) {
    parts.push(`[${log.task}]`);
  }

  parts.push(log.message);

  if (log.metadata && Object.keys(log.metadata).length > 0) {
    parts.push(JSON.stringify(log.metadata));
  }

  return parts.join(' ');
}

/**
 * Format all logs for display
 */
export function formatAgentLogs(logs: AgentAction[]): string {
  return logs.map(formatAgentLog).join('\n');
}

/**
 * Create a logger and capture execution, returning formatted logs
 */
export async function logAndCapture<T>(
  // eslint-disable-next-line no-unused-vars
  fn: (_logger: AgentLogger) => Promise<T>,
  config?: AgentLoggerConfig,
): Promise<{
  result: T;
  logs: AgentLog;
  summary: ReturnType<AgentLogger['getSummary']>;
}> {
  const { result, logger } = await captureAgentExecution(fn, config);

  return {
    result,
    logs: logger.formatForReporter(),
    summary: logger.getSummary(),
  };
}

/**
 * Helper to measure action duration
 */
export async function measureAction<T>(
  logger: AgentLogger,
  actionName: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startTime = Date.now();
  logger.logInfo(`Starting: ${actionName}`);

  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    logger.logInfo(`Completed: ${actionName}`, { duration });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logError(error as Error, { action: actionName, duration });
    throw error;
  }
}
