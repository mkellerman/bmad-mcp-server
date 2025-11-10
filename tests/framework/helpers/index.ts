/**
 * Test Framework Utilities - Index
 *
 * Single entry point for all E2E test framework helpers.
 * Consolidates imports for better developer experience.
 *
 * Usage:
 *   import { CopilotSessionHelper, MCPHelper } from '../framework/helpers';
 */

// Core E2E Testing Infrastructure
export { CopilotSessionHelper } from './copilot-session-helper.js';
export type {
  SessionEvent,
  ToolCall,
  ToolExecution,
  SessionAnalysis,
  CopilotExecuteOptions,
} from './copilot-session-helper.js';

export { MCPHelper, validateMCPResult } from './mcp-helper.js';
export type {
  MCPConfig,
  MCPToolResult,
  MCPInteraction,
} from './mcp-helper.js';

// Metrics and Tracking
export {
  ToolCallTracker,
  calculateEfficiencyScore,
  getEfficiencyRating,
  formatMetrics,
} from './tool-call-tracker.js';
export type {
  ToolCallMetrics,
} from './tool-call-tracker.js';

// Behavior Quality Assessment
export {
  BehaviorQualityChecker,
  assertQualityMeetsStandard,
} from './behavior-quality.js';
export type {
  QualityDimensions,
  ToolCallQuality,
  BehaviorCriteria,
  BehaviorQualityReport,
} from './behavior-quality.js';

// Quality Metrics Collection and Dashboard
export {
  QualityMetricsCollector,
  exportQualityDashboard,
} from './quality-metrics-collector.js';
export type {
  QualityMetricRecord,
  QualityStatistics,
} from './quality-metrics-collector.js';

// Quality Regression Detection
export {
  QualityRegressionDetector,
  assertNoRegressions,
} from './quality-regression-detector.js';
export type {
  BaselineMetric,
  RegressionResult,
  RegressionReport,
} from './quality-regression-detector.js';

// Performance Tracking
export {
  PerformanceTracker,
  measurePerformance,
} from './performance-tracker.js';
export type {
  PerformanceMetric,
  PerformanceStatistics,
  PerformanceBaseline,
} from './performance-tracker.js';

// Test Building and Validation
export { TestBuilder } from './test-builder.js';
export {
  validateXML,
  checkInstructionLeakage,
  extractTagContent,
  extractAllTags,
  hasValidXMLStructure,
  stripXMLTags,
  assertValidXML,
} from './xml-validator.js';

export {
  AgentLogger,
  createAgentLogger,
  formatAgentLog,
  formatAgentLogs,
} from './agent-logger.js';
export type {
  AgentActionType,
  AgentAction,
  AgentExecutionContext,
  AgentLoggerConfig,
} from './agent-logger.js';

