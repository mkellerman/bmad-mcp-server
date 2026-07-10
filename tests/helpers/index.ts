/**
 * Test Helpers - Index
 *
 * General test utilities and fixtures.
 *
 * Usage:
 *   import { createTestFixture, MockMCPServer } from '../helpers';
 */

// Test Fixtures and Builders
export {
  createTestFixture,
  createBMADStructure,
  createAgentManifest,
  createWorkflowManifest,
  createTaskManifest,
  createAgentFile,
  createWorkflowFile,
  SAMPLE_AGENT,
  SAMPLE_WORKFLOW,
} from './test-fixtures.js';
export type { TestFixture } from './test-fixtures.js';

// Mock MCP Server
export {
  MockMCPServer,
  createMockServerWithSampling,
  createMockServerWithoutSampling,
  createMockServerWithRankingSupport,
} from './mock-mcp-server.js';
export type {
  MockSamplingConfig,
  SamplingRequest,
} from './mock-mcp-server.js';

// Test Tags and Categorization
export { getTestType, test, it } from './test-tags.js';

// LLM Evaluation (re-export main interface)
export { evaluateTest } from './llm-evaluation/index.js';
export { isCopilotProxyAvailable, ensureCopilotProxy } from './llm-evaluation/copilot-check.js';
