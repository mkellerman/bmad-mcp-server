/**
 * Tool Call Tracker
 *
 * Tracks and analyzes tool calls made during test execution to measure
 * efficiency, detect errors, and score quality of LLM-tool interactions.
 *
 * Usage:
 * ```ts
 * const tracker = new ToolCallTracker();
 * 
 * tracker.trackCall({
 *   timestamp: new Date().toISOString(),
 *   operation: 'execute',
 *   parameters: { operation: 'execute', agent: 'debug', module: 'bmm' },
 *   response: 'success',
 *   duration: 500,
 * });
 * 
 * const metrics = tracker.getMetrics();
 * console.log('Total calls:', metrics.totalCalls);
 * console.log('Efficiency score:', calculateEfficiencyScore(metrics));
 * ```
 */

/**
 * Tool call event recorded during test execution
 */
export interface ToolCallEvent {
  /** ISO timestamp when call was made */
  timestamp: string;
  /** Tool operation (execute, list, read, search) */
  operation: string;
  /** Tool parameters passed in the call */
  parameters: Record<string, unknown>;
  /** Outcome of the call */
  response: 'success' | 'validation_error' | 'execution_error' | 'protocol_error';
  /** Error message if call failed */
  errorMessage?: string;
  /** Duration of call in milliseconds */
  duration: number;
}

/**
 * Aggregated metrics from tracked tool calls
 */
export interface ToolCallMetrics {
  /** Total number of tool calls made */
  totalCalls: number;
  /** Number of successful calls */
  validCalls: number;
  /** Number of calls with validation errors (missing/invalid parameters) */
  invalidCalls: number;
  /** Number of calls with execution errors (agent not found, workflow failed, etc.) */
  errorCalls: number;
  /** Number of calls with protocol errors (malformed JSON-RPC, etc.) */
  protocolErrorCalls: number;
  /** Total duration of all calls in milliseconds */
  duration: number;
  /** Average duration per call in milliseconds */
  averageDuration: number;
  /** Sequence of all calls in chronological order */
  callSequence: ToolCallEvent[];
  /** First call timestamp */
  startTime?: string;
  /** Last call timestamp */
  endTime?: string;
}

/**
 * Tool Call Tracker - Monitors and analyzes tool call patterns
 */
export class ToolCallTracker {
  private events: ToolCallEvent[] = [];

  /**
   * Track a tool call event
   *
   * @param event - Tool call event to record
   */
  trackCall(event: ToolCallEvent): void {
    this.events.push(event);
  }

  /**
   * Get aggregated metrics from all tracked calls
   *
   * @returns Metrics summary
   */
  getMetrics(): ToolCallMetrics {
    if (this.events.length === 0) {
      return {
        totalCalls: 0,
        validCalls: 0,
        invalidCalls: 0,
        errorCalls: 0,
        protocolErrorCalls: 0,
        duration: 0,
        averageDuration: 0,
        callSequence: [],
      };
    }

    const totalCalls = this.events.length;
    const validCalls = this.events.filter((e) => e.response === 'success').length;
    const invalidCalls = this.events.filter(
      (e) => e.response === 'validation_error',
    ).length;
    const errorCalls = this.events.filter(
      (e) => e.response === 'execution_error',
    ).length;
    const protocolErrorCalls = this.events.filter(
      (e) => e.response === 'protocol_error',
    ).length;

    const totalDuration = this.events.reduce((sum, e) => sum + e.duration, 0);
    const averageDuration = totalDuration / totalCalls;

    return {
      totalCalls,
      validCalls,
      invalidCalls,
      errorCalls,
      protocolErrorCalls,
      duration: totalDuration,
      averageDuration,
      callSequence: [...this.events],
      startTime: this.events[0]?.timestamp,
      endTime: this.events[this.events.length - 1]?.timestamp,
    };
  }

  /**
   * Detect if a response text indicates a validation error
   *
   * Validation errors occur when parameters are missing or invalid.
   * Example: "❌ Validation Error: Missing required parameter: module"
   *
   * @param response - Response text to check
   * @returns True if response contains validation error marker
   */
  detectValidationError(response: string): boolean {
    return response.includes('❌ Validation Error:');
  }

  /**
   * Detect if a response text indicates an execution error
   *
   * Execution errors occur when the operation fails during execution.
   * Examples:
   * - "❌ Error: Agent not found"
   * - "Failed to execute workflow"
   * - "❌ Agent 'debug' not found in module 'bmm'"
   *
   * @param response - Response text to check
   * @returns True if response contains execution error markers
   */
  detectExecutionError(response: string): boolean {
    // Check for explicit error markers
    if (response.includes('❌ Error:')) return true;
    if (response.includes('Failed to')) return true;
    if (response.includes('not found')) return true;

    // Check for common error patterns
    if (response.includes('does not exist')) return true;
    if (response.includes('could not')) return true;
    if (response.includes('unable to')) return true;

    return false;
  }

  /**
   * Categorize a response into success/validation_error/execution_error
   *
   * @param response - Response text or object to categorize
   * @returns Response category
   */
  categorizeResponse(
    response: string | unknown,
  ): 'success' | 'validation_error' | 'execution_error' {
    const responseText =
      typeof response === 'string' ? response : JSON.stringify(response);

    if (this.detectValidationError(responseText)) {
      return 'validation_error';
    }

    if (this.detectExecutionError(responseText)) {
      return 'execution_error';
    }

    return 'success';
  }

  /**
   * Reset tracker state (clear all events)
   */
  reset(): void {
    this.events = [];
  }

  /**
   * Get raw event list
   *
   * @returns Array of all tracked events
   */
  getEvents(): ToolCallEvent[] {
    return [...this.events];
  }

  /**
   * Get events filtered by response type
   *
   * @param responseType - Type of response to filter by
   * @returns Filtered array of events
   */
  getEventsByType(
    responseType: 'success' | 'validation_error' | 'execution_error' | 'protocol_error',
  ): ToolCallEvent[] {
    return this.events.filter((e) => e.response === responseType);
  }

  /**
   * Get events filtered by operation
   *
   * @param operation - Operation to filter by (execute, list, read, etc.)
   * @returns Filtered array of events
   */
  getEventsByOperation(operation: string): ToolCallEvent[] {
    return this.events.filter((e) => e.operation === operation);
  }
}

/**
 * Calculate efficiency score based on tool call metrics
 *
 * Scoring Algorithm:
 * - 1 successful call = 100 points (perfect)
 * - 2 calls (discovery + execute) = 85 points (good)
 * - 3 calls = 70 points (acceptable)
 * - 4+ calls = 70 - (n-3) * 15 points (diminishing)
 * - Each validation error = -10 points
 * - Each execution error = -15 points
 * - Each protocol error = -20 points
 *
 * @param metrics - Tool call metrics to score
 * @returns Efficiency score (0-100)
 */
export function calculateEfficiencyScore(metrics: ToolCallMetrics): number {
  let score = 100;

  // Base score from total call count
  if (metrics.totalCalls === 0) {
    return 0; // No calls = no score
  } else if (metrics.totalCalls === 1) {
    score = 100; // Perfect
  } else if (metrics.totalCalls === 2) {
    score = 85; // Good (likely discovery + execute)
  } else if (metrics.totalCalls === 3) {
    score = 70; // Acceptable
  } else {
    // Diminishing returns for more calls
    score = Math.max(0, 70 - (metrics.totalCalls - 3) * 15);
  }

  // Penalize for validation errors (missing/invalid parameters)
  score -= metrics.invalidCalls * 10;

  // Penalize more for execution errors (logic failures)
  score -= metrics.errorCalls * 15;

  // Penalize most for protocol errors (malformed requests)
  score -= metrics.protocolErrorCalls * 20;

  // Ensure score stays in 0-100 range
  return Math.max(0, Math.min(100, score));
}

/**
 * Get a human-readable efficiency rating from score
 *
 * @param score - Efficiency score (0-100)
 * @returns Rating description
 */
export function getEfficiencyRating(
  score: number,
): 'Excellent' | 'Good' | 'Acceptable' | 'Poor' | 'Failed' {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Acceptable';
  if (score > 0) return 'Poor';
  return 'Failed';
}

/**
 * Format metrics for console display
 *
 * @param metrics - Metrics to format
 * @returns Formatted string for logging
 */
export function formatMetrics(metrics: ToolCallMetrics): string {
  const score = calculateEfficiencyScore(metrics);
  const rating = getEfficiencyRating(score);

  const lines = [
    '📊 Tool Call Metrics',
    '─'.repeat(50),
    `Total calls:       ${metrics.totalCalls}`,
    `Valid calls:       ${metrics.validCalls}`,
    `Validation errors: ${metrics.invalidCalls}`,
    `Execution errors:  ${metrics.errorCalls}`,
    `Protocol errors:   ${metrics.protocolErrorCalls}`,
    `Total duration:    ${metrics.duration}ms`,
    `Avg duration:      ${metrics.averageDuration.toFixed(0)}ms`,
    '─'.repeat(50),
    `Efficiency Score:  ${score}/100 (${rating})`,
  ];

  if (metrics.startTime && metrics.endTime) {
    const start = new Date(metrics.startTime).getTime();
    const end = new Date(metrics.endTime).getTime();
    const elapsed = end - start;
    lines.push(`Wall time:         ${elapsed}ms`);
  }

  return lines.join('\n');
}
