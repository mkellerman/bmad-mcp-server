/**
 * Unified Testing Framework - Type Definitions
 *
 * This module defines the comprehensive type system for the BMAD unified testing framework.
 * It supports all test types: unit, integration, E2E, LLM, and agent validation.
 *
 * Key Design Principles:
 * - Single source of truth for all test result data structures
 * - Rich metadata capture for debugging and analysis
 * - Support for LLM-specific concerns (prompts, XML validation, agent logs)
 * - Timeline-based execution tracking
 * - Extensible for future test types
 */

// ============================================================================
// Core Test Metadata
// ============================================================================

/**
 * Test execution status
 */
export type TestStatus = 'passed' | 'failed' | 'skipped' | 'pending' | 'todo';

/**
 * Test type categorization
 */
export type TestType =
  | 'unit' // Fast, isolated unit tests
  | 'integration' // Multi-component integration tests
  | 'e2e' // End-to-end system tests
  | 'llm' // LLM interaction tests
  | 'agent'; // Agent validation tests

/**
 * Log severity levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Test environment information
 */
export interface TestEnvironment {
  /** Node.js version (e.g., "v20.11.0") */
  nodeVersion: string;
  /** Test runner name and version (e.g., "vitest@4.0.6") */
  testRunner: string;
  /** Operating system (e.g., "darwin", "linux", "win32") */
  platform: string;
  /** CPU architecture (e.g., "arm64", "x64") */
  arch: string;
  /** Working directory when tests ran */
  cwd: string;
  /** Environment variables (filtered for security) */
  env: Record<string, string>;
  /** Git branch if available */
  branch?: string;
  /** Git commit SHA if available */
  commit?: string;
}

// ============================================================================
// LLM-Specific Types
// ============================================================================

/**
 * LLM provider configuration
 */
export interface LLMProvider {
  /** Provider name (e.g., "openai", "anthropic", "litellm") */
  name: string;
  /** Model identifier (e.g., "gpt-4.1", "claude-3-opus") */
  model: string;
  /** API endpoint URL */
  endpoint?: string;
  /** Provider-specific configuration */
  config?: Record<string, unknown>;
}

/**
 * Tool invocation during LLM interaction
 */
export interface ToolCall {
  /** Tool name (e.g., "bmad", "file_read", "search") */
  name: string;
  /** Tool input arguments */
  arguments: Record<string, unknown>;
  /** Tool execution result */
  result?: unknown;
  /** Tool error if execution failed */
  error?: string;
  /** Time when tool was called */
  timestamp: string;
  /** Duration of tool execution in milliseconds */
  duration: number;
}

/**
 * Single LLM interaction (request + response)
 */
export interface LLMInteraction {
  /** Unique interaction ID */
  id: string;
  /** When the interaction started */
  timestamp: string;
  /** User/system prompt sent to LLM */
  prompt: string;
  /** System message if used */
  systemMessage?: string;
  /** LLM provider and model used */
  provider: LLMProvider;
  /** Tools called during this interaction */
  toolCalls: ToolCall[];
  /** Final LLM response */
  response: string;
  /** Total duration in milliseconds */
  duration: number;
  /** Token usage statistics */
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  /** Raw request payload (for debugging) */
  rawRequest?: unknown;
  /** Raw response payload (for debugging) */
  rawResponse?: unknown;
}

/**
 * XML tag validation result
 */
export interface XMLTagValidation {
  /** Tag name (e.g., "instructions", "content", "context") */
  tag: string;
  /** Whether tag was found in response */
  found: boolean;
  /** Whether tag is properly closed */
  closed: boolean;
  /** Whether tag content is non-empty */
  hasContent: boolean;
  /** Tag content if extracted */
  content?: string;
  /** Validation errors */
  errors: string[];
}

/**
 * XML structure validation for LLM responses
 */
export interface XMLValidation {
  /** Whether response contains expected XML structure */
  valid: boolean;
  /** Individual tag validations */
  tags: XMLTagValidation[];
  /** Overall validation errors */
  errors: string[];
  /** Whether instructions leaked into content */
  instructionLeakage: boolean;
  /** Raw response that was validated */
  rawResponse: string;
  /** Timestamp of validation */
  timestamp: string;
}

// ============================================================================
// Agent-Specific Types
// ============================================================================

/**
 * Agent log entry
 */
export interface AgentLogEntry {
  /** Log timestamp */
  timestamp: string;
  /** Log severity level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Additional context data */
  context?: Record<string, unknown>;
  /** Source component/module */
  source?: string;
}

/**
 * Agent execution log
 */
export interface AgentLog {
  /** Unique log ID */
  id: string;
  /** Agent name (e.g., "bmad-master", "analyst") */
  agentName: string;
  /** When logging started */
  startTime: string;
  /** When logging ended */
  endTime?: string;
  /** Log entries */
  entries: AgentLogEntry[];
  /** Path to log file if persisted */
  logFilePath?: string;
}

/**
 * Agent validation metadata
 */
export interface AgentMetadata {
  /** Agent name */
  name: string;
  /** Agent module (e.g., "core", "game-dev") */
  module: string;
  /** Agent file path */
  filePath: string;
  /** Agent version if specified */
  version?: string;
  /** Whether agent file exists */
  exists: boolean;
  /** Whether agent follows BMAD format */
  validFormat: boolean;
  /** Format validation errors */
  formatErrors: string[];
}

// ============================================================================
// Test Result Types
// ============================================================================

/**
 * Base test result interface - foundation for all test types
 */
export interface BaseTestResult {
  /** Unique test ID (generated or from test framework) */
  id: string;
  /** Test name/title */
  name: string;
  /** Full test path (file path + describe blocks + test name) */
  fullName: string;
  /** Test file path */
  filePath: string;
  /** Test type category */
  type: TestType;
  /** Test execution status */
  status: TestStatus;
  /** Test start timestamp (ISO 8601) */
  startTime: string;
  /** Test end timestamp (ISO 8601) */
  endTime?: string;
  /** Test duration in milliseconds */
  duration: number;
  /** Error details if test failed */
  error?: {
    message: string;
    stack?: string;
    expected?: unknown;
    actual?: unknown;
    diff?: string;
  };
  /** Test tags/labels for filtering */
  tags: string[];
  /** Custom metadata */
  metadata: Record<string, unknown>;
}

/**
 * Unit test result
 */
export interface UnitTestResult extends BaseTestResult {
  type: 'unit';
  /** Code coverage data if collected */
  coverage?: {
    lines: { total: number; covered: number; pct: number };
    statements: { total: number; covered: number; pct: number };
    functions: { total: number; covered: number; pct: number };
    branches: { total: number; covered: number; pct: number };
  };
}

/**
 * Integration test result
 */
export interface IntegrationTestResult extends BaseTestResult {
  type: 'integration';
  /** Components/services involved in test */
  components: string[];
  /** External dependencies used */
  dependencies?: string[];
}

/**
 * E2E test result
 */
export interface E2ETestResult extends BaseTestResult {
  type: 'e2e';
  /** Scenario being tested */
  scenario: string;
  /** Steps executed in the test */
  steps: Array<{
    name: string;
    status: TestStatus;
    duration: number;
    error?: string;
  }>;
  /** Screenshots captured during test */
  screenshots?: Array<{
    name: string;
    path: string;
    timestamp: string;
  }>;
}

/**
 * LLM test result - enriched with LLM interactions
 */
export interface LLMTestResult extends BaseTestResult {
  type: 'llm';
  /** LLM interactions during test */
  llmInteractions: LLMInteraction[];
  /** XML validation results */
  xmlValidation?: XMLValidation;
  /** Agent logs if agent was involved */
  agentLogs?: AgentLog[];
  /** Expected behavior description */
  expectedBehavior?: string;
  /** Actual behavior observed */
  actualBehavior?: string;
}

/**
 * Agent validation test result
 */
export interface AgentTestResult extends BaseTestResult {
  type: 'agent';
  /** Agent being validated */
  agent: AgentMetadata;
  /** Validation checks performed */
  validations: Array<{
    check: string;
    passed: boolean;
    message?: string;
  }>;
  /** Agent execution logs */
  agentLogs?: AgentLog[];
}

/**
 * Union type for all test results
 */
export type TestResult =
  | UnitTestResult
  | IntegrationTestResult
  | E2ETestResult
  | LLMTestResult
  | AgentTestResult;

// ============================================================================
// Test Suite & Report Types
// ============================================================================

/**
 * Test suite (collection of tests)
 */
export interface TestSuite {
  /** Unique suite ID */
  id: string;
  /** Suite name (typically file name or describe block) */
  name: string;
  /** Suite file path */
  filePath: string;
  /** Suite type (derived from tests) */
  type: TestType;
  /** Suite start time */
  startTime: string;
  /** Suite end time */
  endTime?: string;
  /** Total suite duration */
  duration: number;
  /** All tests in this suite */
  tests: TestResult[];
  /** Suite-level setup/teardown errors */
  setupErrors?: string[];
  /** Child suites (nested describe blocks) */
  suites: TestSuite[];
  /** Suite tags */
  tags: string[];
}

/**
 * Test run summary statistics
 */
export interface TestSummary {
  /** Total number of tests */
  total: number;
  /** Number of passed tests */
  passed: number;
  /** Number of failed tests */
  failed: number;
  /** Number of skipped tests */
  skipped: number;
  /** Number of pending tests */
  pending: number;
  /** Number of todo tests */
  todo: number;
  /** Total test duration */
  duration: number;
  /** Start time of test run */
  startTime: string;
  /** End time of test run */
  endTime: string;
  /** Success rate percentage */
  successRate: number;
  /** Breakdown by test type */
  byType: Record<TestType, Omit<TestSummary, 'byType'>>;
}

/**
 * Complete test report
 */
export interface TestReport {
  /** Report version for schema evolution */
  version: string;
  /** Report generation timestamp */
  timestamp: string;
  /** Test environment information */
  environment: TestEnvironment;
  /** Summary statistics */
  summary: TestSummary;
  /** All test suites */
  suites: TestSuite[];
  /** All individual tests (flattened for searching) */
  tests: TestResult[];
  /** Report metadata */
  metadata: {
    /** Reporter name and version */
    reporter: string;
    /** Report format (json, html) */
    format: 'json' | 'html';
    /** Custom metadata */
    custom?: Record<string, unknown>;
  };
}

// ============================================================================
// Prompt Testing Types
// ============================================================================

/**
 * Interactive prompt test configuration
 */
export interface PromptTestConfig {
  /** User prompt to test */
  prompt: string;
  /** LLM provider to use */
  provider?: LLMProvider;
  /** Tools available to LLM */
  tools?: string[];
  /** System message override */
  systemMessage?: string;
  /** Whether to validate XML structure */
  validateXML?: boolean;
  /** Whether to save results */
  saveResults?: boolean;
  /** Output format */
  format?: 'json' | 'text' | 'xml';
}

/**
 * Prompt test result
 */
export interface PromptTestResult {
  /** Test configuration used */
  config: PromptTestConfig;
  /** LLM interaction */
  interaction: LLMInteraction;
  /** XML validation if requested */
  xmlValidation?: XMLValidation;
  /** Agent logs if agent was invoked */
  agentLogs?: AgentLog[];
  /** Execution timestamp */
  timestamp: string;
  /** Total execution duration */
  duration: number;
  /** Saved file path if saveResults was true */
  savedPath?: string;
}

// ============================================================================
// Reporter Configuration
// ============================================================================

/**
 * Unified reporter configuration
 */
export interface ReporterConfig {
  /** Output directory for reports */
  outputDir: string;
  /** HTML report filename */
  htmlFilename: string;
  /** JSON report filename */
  jsonFilename: string;
  /** Whether to generate HTML report */
  generateHTML: boolean;
  /** Whether to generate JSON report */
  generateJSON: boolean;
  /** Whether to open HTML report in browser */
  openReport: boolean;
  /** Whether to include agent logs in report */
  includeAgentLogs: boolean;
  /** Whether to include XML validation details */
  includeXMLValidation: boolean;
  /** Whether to include raw LLM payloads */
  includeRawPayloads: boolean;
  /** Custom report metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Helper Type Guards
// ============================================================================

/**
 * Type guard to check if test result is LLM test
 */
export function isLLMTest(test: TestResult): test is LLMTestResult {
  return test.type === 'llm';
}

/**
 * Type guard to check if test result is Agent test
 */
export function isAgentTest(test: TestResult): test is AgentTestResult {
  return test.type === 'agent';
}

/**
 * Type guard to check if test result is E2E test
 */
export function isE2ETest(test: TestResult): test is E2ETestResult {
  return test.type === 'e2e';
}

/**
 * Type guard to check if test result is Unit test
 */
export function isUnitTest(test: TestResult): test is UnitTestResult {
  return test.type === 'unit';
}

/**
 * Type guard to check if test result is Integration test
 */
export function isIntegrationTest(
  test: TestResult,
): test is IntegrationTestResult {
  return test.type === 'integration';
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Partial test result for incremental building
 */
export type PartialTestResult = Partial<TestResult> &
  Pick<TestResult, 'id' | 'name' | 'type'>;

/**
 * Test filter criteria
 */
export interface TestFilter {
  /** Filter by test type */
  type?: TestType | TestType[];
  /** Filter by status */
  status?: TestStatus | TestStatus[];
  /** Filter by tags */
  tags?: string[];
  /** Filter by file path pattern */
  filePattern?: RegExp;
  /** Filter by test name pattern */
  namePattern?: RegExp;
  /** Custom filter function */
  // eslint-disable-next-line no-unused-vars
  custom?: (_test: TestResult) => boolean;
}

/**
 * Test sort criteria
 */
export interface TestSort {
  /** Field to sort by */
  field: 'name' | 'duration' | 'status' | 'type' | 'startTime';
  /** Sort order */
  order: 'asc' | 'desc';
}
