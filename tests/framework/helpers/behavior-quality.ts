/**
 * Behavior Quality Metrics Framework
 *
 * Measures the quality of agent behavior beyond functional correctness:
 * - Tool call accuracy (correct parameters, appropriate operations)
 * - Response relevance (on-topic, appropriate responses)
 * - Instruction adherence (following system prompts, user intent)
 * - Conversation coherence (logical flow, context awareness)
 * - Efficiency (minimal unnecessary calls, optimal paths)
 *
 * Usage:
 * ```ts
 * const qualityChecker = new BehaviorQualityChecker();
 * 
 * // Score tool call quality
 * const toolQuality = qualityChecker.scoreToolCallQuality({
 *   expectedOperation: 'execute',
 *   actualOperation: 'execute',
 *   requiredParams: ['agent', 'message'],
 *   providedParams: { agent: 'debug', message: 'help' },
 *   contextAppropriate: true
 * });
 * 
 * // Get overall quality score
 * const overallScore = qualityChecker.calculateOverallQuality(sessionAnalysis);
 * ```
 */

import type { SessionAnalysis, ToolCall } from './copilot-session-helper';

/**
 * Quality dimensions for behavior assessment
 */
export interface QualityDimensions {
  /** Tool calls use correct operations (execute vs list vs read) */
  toolCallAccuracy: number;
  /** Tool parameters are valid and complete */
  parameterCompleteness: number;
  /** Tool calls are contextually appropriate */
  contextualRelevance: number;
  /** Conversation maintains coherent flow */
  conversationCoherence: number;
  /** Efficient path to goal (minimal wasted calls) */
  efficiency: number;
  /** Instructions and constraints followed */
  instructionAdherence: number;
}

/**
 * Tool call quality assessment
 */
export interface ToolCallQuality {
  /** Tool call being assessed */
  toolCall: ToolCall;
  /** Was the operation type appropriate? */
  operationCorrect: boolean;
  /** Were required parameters provided? */
  parametersComplete: boolean;
  /** Were parameters valid? */
  parametersValid: boolean;
  /** Was this call contextually appropriate? */
  contextAppropriate: boolean;
  /** Quality score (0-100) */
  score: number;
  /** Issues found (if any) */
  issues: string[];
}

/**
 * Expected behavior criteria for validation
 */
export interface BehaviorCriteria {
  /** Expected operation type (execute, list, read) */
  expectedOperation?: string;
  /** Required parameter names */
  requiredParams?: string[];
  /** Forbidden parameter combinations */
  forbiddenParams?: string[][];
  /** Expected agent/workflow name */
  expectedTarget?: string;
  /** Maximum allowed tool calls */
  maxToolCalls?: number;
  /** Should include discovery step? */
  shouldDiscover?: boolean;
}

/**
 * Overall behavior quality assessment
 */
export interface BehaviorQualityReport {
  /** Quality scores by dimension */
  dimensions: QualityDimensions;
  /** Overall quality score (0-100) */
  overallScore: number;
  /** Quality rating */
  rating: 'Excellent' | 'Good' | 'Acceptable' | 'Poor' | 'Failed';
  /** Individual tool call assessments */
  toolCallQualities: ToolCallQuality[];
  /** Detailed findings */
  findings: string[];
  /** Recommendations for improvement */
  recommendations: string[];
}

/**
 * Behavior Quality Checker
 *
 * Assesses agent behavior quality across multiple dimensions
 */
export class BehaviorQualityChecker {
  private findings: string[] = [];
  private recommendations: string[] = [];

  /**
   * Score the quality of a single tool call
   *
   * @param toolCall - Tool call to assess
   * @param criteria - Expected behavior criteria
   * @returns Quality assessment
   */
  scoreToolCallQuality(toolCall: ToolCall, criteria?: BehaviorCriteria): ToolCallQuality {
    const issues: string[] = [];
    let score = 100;

    // Check operation type
    const operationCorrect = !criteria?.expectedOperation || 
      toolCall.arguments.operation === criteria.expectedOperation;
    
    if (!operationCorrect) {
      issues.push(
        `Expected operation '${criteria?.expectedOperation}', got '${toolCall.arguments.operation}'`
      );
      score -= 25;
    }

    // Check required parameters
    const providedParams = Object.keys(toolCall.arguments);
    const requiredParams = criteria?.requiredParams || [];
    const missingParams = requiredParams.filter(
      (param) => !providedParams.includes(param)
    );
    
    const parametersComplete = missingParams.length === 0;
    if (!parametersComplete) {
      issues.push(`Missing required parameters: ${missingParams.join(', ')}`);
      score -= missingParams.length * 15;
    }

    // Check parameter validity
    let parametersValid = true;
    
    // Agent/workflow name should not have module prefix
    if (toolCall.arguments.agent && typeof toolCall.arguments.agent === 'string') {
      const agent = toolCall.arguments.agent as string;
      if (agent.includes('-') && !['design-thinking', 'creative-problem-solver'].includes(agent)) {
        // Likely has module prefix (e.g., 'bmm-debug' instead of 'debug')
        issues.push(`Agent name should not include module prefix: '${agent}'`);
        parametersValid = false;
        score -= 20;
      }
    }

    if (toolCall.arguments.workflow && typeof toolCall.arguments.workflow === 'string') {
      const workflow = toolCall.arguments.workflow as string;
      if (workflow.includes('-') && workflow.split('-').length > 3) {
        // Suspiciously long workflow name with multiple hyphens
        issues.push(`Workflow name may include module prefix: '${workflow}'`);
        parametersValid = false;
        score -= 20;
      }
    }

    // Check forbidden parameter combinations
    if (criteria?.forbiddenParams) {
      for (const forbidden of criteria.forbiddenParams) {
        const hasForbidden = forbidden.every((param) => providedParams.includes(param));
        if (hasForbidden) {
          issues.push(`Invalid parameter combination: ${forbidden.join(' + ')}`);
          parametersValid = false;
          score -= 20;
        }
      }
    }

    // Check contextual appropriateness
    let contextAppropriate = true;
    
    // Execute should have message or explicit context
    if (toolCall.arguments.operation === 'execute') {
      if (!toolCall.arguments.message && !toolCall.arguments.agent && !toolCall.arguments.workflow) {
        issues.push('Execute operation missing context (message, agent, or workflow)');
        contextAppropriate = false;
        score -= 15;
      }
    }

    // List/read shouldn't have agent+workflow together
    if (['list', 'read'].includes(toolCall.arguments.operation as string)) {
      if (toolCall.arguments.agent && toolCall.arguments.workflow) {
        issues.push('List/read should specify agent OR workflow, not both');
        contextAppropriate = false;
        score -= 15;
      }
    }

    return {
      toolCall,
      operationCorrect,
      parametersComplete,
      parametersValid,
      contextAppropriate,
      score: Math.max(0, Math.min(100, score)),
      issues,
    };
  }

  /**
   * Calculate tool call accuracy dimension
   *
   * @param toolQualities - Assessed tool call qualities
   * @returns Score 0-100
   */
  private calculateToolCallAccuracy(toolQualities: ToolCallQuality[]): number {
    if (toolQualities.length === 0) return 0;
    
    const correctOps = toolQualities.filter((q) => q.operationCorrect).length;
    return (correctOps / toolQualities.length) * 100;
  }

  /**
   * Calculate parameter completeness dimension
   *
   * @param toolQualities - Assessed tool call qualities
   * @returns Score 0-100
   */
  private calculateParameterCompleteness(toolQualities: ToolCallQuality[]): number {
    if (toolQualities.length === 0) return 0;
    
    const complete = toolQualities.filter((q) => q.parametersComplete).length;
    return (complete / toolQualities.length) * 100;
  }

  /**
   * Calculate contextual relevance dimension
   *
   * @param toolQualities - Assessed tool call qualities
   * @returns Score 0-100
   */
  private calculateContextualRelevance(toolQualities: ToolCallQuality[]): number {
    if (toolQualities.length === 0) return 0;
    
    const appropriate = toolQualities.filter((q) => q.contextAppropriate).length;
    return (appropriate / toolQualities.length) * 100;
  }

  /**
   * Calculate conversation coherence
   *
   * Measures logical flow and context awareness
   *
   * @param analysis - Session analysis
   * @returns Score 0-100
   */
  private calculateConversationCoherence(analysis: SessionAnalysis): number {
    let score = 100;

    // Check for message balance (not too one-sided)
    const messageRatio = analysis.assistantMessages / Math.max(1, analysis.userMessages);
    if (messageRatio > 5) {
      this.findings.push('Assistant dominated conversation (message ratio too high)');
      score -= 20;
    } else if (messageRatio < 0.5) {
      this.findings.push('User dominated conversation (message ratio too low)');
      score -= 10;
    }

    // Check for tool call clustering (good) vs scattered calls (poor)
    if (analysis.toolCalls.length > 3) {
      const timestamps = analysis.toolCalls.map((tc) => new Date(tc.timestamp).getTime());
      const gaps = [];
      for (let i = 1; i < timestamps.length; i++) {
        gaps.push(timestamps[i] - timestamps[i - 1]);
      }
      
      const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
      const maxGap = Math.max(...gaps);
      
      // Large gaps suggest loss of context or confusion
      if (maxGap > avgGap * 5) {
        this.findings.push('Large time gaps between tool calls suggest context loss');
        score -= 15;
      }
    }

    // Check for repetitive calls (suggests confusion)
    const operationCounts = new Map<string, number>();
    for (const call of analysis.bmadCalls) {
      const key = `${call.arguments.operation}-${call.arguments.agent || call.arguments.workflow || ''}`;
      operationCounts.set(key, (operationCounts.get(key) || 0) + 1);
    }
    
    for (const [operation, count] of operationCounts) {
      if (count > 3) {
        this.findings.push(`Repeated operation '${operation}' ${count} times (possible confusion)`);
        score -= 10;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Calculate efficiency score
   *
   * @param analysis - Session analysis
   * @param criteria - Expected behavior criteria
   * @returns Score 0-100
   */
  private calculateEfficiency(analysis: SessionAnalysis, criteria?: BehaviorCriteria): number {
    let score = 100;

    // Penalize excessive tool calls
    const maxAllowed = criteria?.maxToolCalls || 5;
    if (analysis.bmadCalls.length > maxAllowed) {
      const excess = analysis.bmadCalls.length - maxAllowed;
      this.findings.push(`Made ${analysis.bmadCalls.length} tool calls (expected ≤${maxAllowed})`);
      score -= excess * 15;
    }

    // Check for optimal discovery pattern
    if (criteria?.shouldDiscover) {
      const hasListCall = analysis.bmadCalls.some(
        (call) => call.arguments.operation === 'list'
      );
      const hasReadCall = analysis.bmadCalls.some(
        (call) => call.arguments.operation === 'read'
      );
      
      if (!hasListCall && !hasReadCall) {
        this.findings.push('Missing discovery step (list or read) before execution');
        this.recommendations.push('Add discovery step to understand available options');
        score -= 20;
      }
    }

    // Check for wasted calls (errors that didn't lead to correction)
    const errorCount = analysis.toolCalls.length - 
      analysis.toolExecutions.filter((e) => e.success).length;
    
    if (errorCount > 1) {
      this.findings.push(`${errorCount} tool calls failed (inefficient error recovery)`);
      score -= errorCount * 10;
    }

    return Math.max(0, score);
  }

  /**
   * Calculate instruction adherence
   *
   * @param analysis - Session analysis
   * @param criteria - Expected behavior criteria
   * @returns Score 0-100
   */
  private calculateInstructionAdherence(
    analysis: SessionAnalysis,
    criteria?: BehaviorCriteria
  ): number {
    let score = 100;

    // Check if expected target was used
    if (criteria?.expectedTarget) {
      const usedTarget = analysis.bmadCalls.some(
        (call) =>
          call.arguments.agent === criteria.expectedTarget ||
          call.arguments.workflow === criteria.expectedTarget
      );
      
      if (!usedTarget) {
        this.findings.push(`Did not use expected target '${criteria.expectedTarget}'`);
        this.recommendations.push(`Ensure agent/workflow '${criteria.expectedTarget}' is invoked`);
        score -= 30;
      }
    }

    // Check for all tools succeeding (basic instruction adherence)
    if (!analysis.allToolsSucceeded) {
      this.findings.push('Not all tool calls succeeded (partial instruction adherence)');
      score -= 20;
    }

    return Math.max(0, score);
  }

  /**
   * Calculate overall behavior quality from session analysis
   *
   * @param analysis - Session analysis from Copilot CLI
   * @param criteria - Expected behavior criteria (optional)
   * @returns Comprehensive quality report
   */
  calculateOverallQuality(
    analysis: SessionAnalysis,
    criteria?: BehaviorCriteria
  ): BehaviorQualityReport {
    // Reset findings and recommendations
    this.findings = [];
    this.recommendations = [];

    // Score individual tool calls
    const toolCallQualities = analysis.bmadCalls.map((call) =>
      this.scoreToolCallQuality(call, criteria)
    );

    // Calculate dimension scores
    const dimensions: QualityDimensions = {
      toolCallAccuracy: this.calculateToolCallAccuracy(toolCallQualities),
      parameterCompleteness: this.calculateParameterCompleteness(toolCallQualities),
      contextualRelevance: this.calculateContextualRelevance(toolCallQualities),
      conversationCoherence: this.calculateConversationCoherence(analysis),
      efficiency: this.calculateEfficiency(analysis, criteria),
      instructionAdherence: this.calculateInstructionAdherence(analysis, criteria),
    };

    // Calculate weighted overall score
    const weights = {
      toolCallAccuracy: 0.20,
      parameterCompleteness: 0.20,
      contextualRelevance: 0.15,
      conversationCoherence: 0.15,
      efficiency: 0.15,
      instructionAdherence: 0.15,
    };

    const overallScore =
      dimensions.toolCallAccuracy * weights.toolCallAccuracy +
      dimensions.parameterCompleteness * weights.parameterCompleteness +
      dimensions.contextualRelevance * weights.contextualRelevance +
      dimensions.conversationCoherence * weights.conversationCoherence +
      dimensions.efficiency * weights.efficiency +
      dimensions.instructionAdherence * weights.instructionAdherence;

    // Determine rating
    let rating: 'Excellent' | 'Good' | 'Acceptable' | 'Poor' | 'Failed';
    if (overallScore >= 90) rating = 'Excellent';
    else if (overallScore >= 75) rating = 'Good';
    else if (overallScore >= 60) rating = 'Acceptable';
    else if (overallScore > 0) rating = 'Poor';
    else rating = 'Failed';

    // Generate recommendations based on low scores
    if (dimensions.toolCallAccuracy < 70) {
      this.recommendations.push('Improve tool call operation selection (use correct operation types)');
    }
    if (dimensions.parameterCompleteness < 70) {
      this.recommendations.push('Ensure all required parameters are provided in tool calls');
    }
    if (dimensions.contextualRelevance < 70) {
      this.recommendations.push('Make tool calls more contextually appropriate to user intent');
    }
    if (dimensions.conversationCoherence < 70) {
      this.recommendations.push('Improve conversation flow and context awareness');
    }
    if (dimensions.efficiency < 70) {
      this.recommendations.push('Reduce unnecessary tool calls and improve error recovery');
    }
    if (dimensions.instructionAdherence < 70) {
      this.recommendations.push('Better follow system instructions and user constraints');
    }

    return {
      dimensions,
      overallScore,
      rating,
      toolCallQualities,
      findings: this.findings,
      recommendations: this.recommendations,
    };
  }

  /**
   * Format quality report for console display
   *
   * @param report - Quality report to format
   * @returns Formatted string
   */
  formatQualityReport(report: BehaviorQualityReport): string {
    const lines = [
      '🎯 Behavior Quality Report',
      '═'.repeat(60),
      '',
      '📊 Quality Dimensions:',
      `  Tool Call Accuracy:      ${report.dimensions.toolCallAccuracy.toFixed(1)}/100`,
      `  Parameter Completeness:  ${report.dimensions.parameterCompleteness.toFixed(1)}/100`,
      `  Contextual Relevance:    ${report.dimensions.contextualRelevance.toFixed(1)}/100`,
      `  Conversation Coherence:  ${report.dimensions.conversationCoherence.toFixed(1)}/100`,
      `  Efficiency:              ${report.dimensions.efficiency.toFixed(1)}/100`,
      `  Instruction Adherence:   ${report.dimensions.instructionAdherence.toFixed(1)}/100`,
      '',
      `🏆 Overall Score: ${report.overallScore.toFixed(1)}/100 (${report.rating})`,
    ];

    if (report.findings.length > 0) {
      lines.push('', '🔍 Findings:');
      report.findings.forEach((finding) => lines.push(`  • ${finding}`));
    }

    if (report.recommendations.length > 0) {
      lines.push('', '💡 Recommendations:');
      report.recommendations.forEach((rec) => lines.push(`  • ${rec}`));
    }

    if (report.toolCallQualities.some((q) => q.issues.length > 0)) {
      lines.push('', '⚠️  Tool Call Issues:');
      report.toolCallQualities.forEach((quality, idx) => {
        if (quality.issues.length > 0) {
          lines.push(`  Call #${idx + 1} (${quality.toolCall.toolName}):`);
          quality.issues.forEach((issue) => lines.push(`    - ${issue}`));
        }
      });
    }

    lines.push('═'.repeat(60));

    return lines.join('\n');
  }
}

/**
 * Helper function to create quality assertions for tests
 *
 * @param report - Quality report
 * @param minScore - Minimum acceptable score
 * @returns Assertion object for test frameworks
 */
export function assertQualityMeetsStandard(
  report: BehaviorQualityReport,
  minScore = 70
): { passed: boolean; message: string } {
  const passed = report.overallScore >= minScore;
  
  let message = `Quality score: ${report.overallScore.toFixed(1)}/100 (${report.rating})`;
  
  if (!passed) {
    message += `\nExpected: ≥${minScore}, Got: ${report.overallScore.toFixed(1)}`;
    
    if (report.findings.length > 0) {
      message += '\n\nFindings:\n' + report.findings.map((f) => `  - ${f}`).join('\n');
    }
    
    if (report.recommendations.length > 0) {
      message += '\n\nRecommendations:\n' + report.recommendations.map((r) => `  - ${r}`).join('\n');
    }
  }
  
  return { passed, message };
}
