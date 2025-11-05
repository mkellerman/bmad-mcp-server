/**
 * Test Context - Store rich test data for reporting
 *
 * This module provides a global context where tests can attach rich metadata
 * like LLM interactions, agent logs, XML validations, etc.
 * The reporter will pick up this data during test execution.
 *
 * Data is persisted to disk immediately to avoid scope/timing issues.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  LLMInteraction,
  AgentLog,
  XMLValidation,
  AgentMetadata,
  ChatConversation,
  ChatMessage,
  ChatRole,
  ToolCall,
  LLMProvider,
} from './types.js';

interface TestContext {
  llmInteractions?: LLMInteraction[];
  chatConversation?: ChatConversation;
  agentLogs?: AgentLog[];
  xmlValidation?: XMLValidation;
  agent?: AgentMetadata;
  validations?: Array<{
    check: string;
    passed: boolean;
    message?: string;
  }>;
  steps?: Array<{
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
  }>;
  expectedBehavior?: string;
  actualBehavior?: string;
  scenario?: string;
  components?: string[];
  dependencies?: string[];
  [key: string]: unknown;
}

const CONTEXT_DIR = 'test-results/.contexts';

/**
 * Current test tracking
 */
let currentTestKey: string | null = null;

export function setCurrentTest(testName: string): void {
  currentTestKey = testName;
}

/**
 * Get context file path for a test
 */
function getContextPath(testName: string): string {
  const safeName = testName.replace(/[^a-z0-9-]/gi, '_');
  return path.join(CONTEXT_DIR, `${safeName}.json`);
}

/**
 * Load context from disk
 */
async function loadContext(testName: string): Promise<TestContext> {
  try {
    const contextPath = getContextPath(testName);
    const data = await fs.readFile(contextPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/**
 * Save context to disk
 */
async function saveContext(
  testName: string,
  context: TestContext,
): Promise<void> {
  await fs.mkdir(CONTEXT_DIR, { recursive: true });
  const contextPath = getContextPath(testName);
  await fs.writeFile(contextPath, JSON.stringify(context, null, 2), 'utf-8');
}

/**
 * Get current test context (loads from disk)
 */
export async function getTestContext(): Promise<TestContext> {
  if (!currentTestKey) {
    currentTestKey = 'current-test';
  }
  return await loadContext(currentTestKey);
}

/**
 * Get all test contexts from disk (for reporter)
 */
export async function getAllTestContexts(): Promise<Map<string, TestContext>> {
  const contexts = new Map<string, TestContext>();

  try {
    await fs.mkdir(CONTEXT_DIR, { recursive: true });
    const files = await fs.readdir(CONTEXT_DIR);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const testName = file.replace('.json', '').replace(/_/g, ' ');
        const context = await loadContext(testName);

        // Store with multiple key variations for better matching
        contexts.set(testName, context);
        // Underscore version
        contexts.set(file.replace('.json', ''), context);
        // Normalized version (collapse multiple spaces, trim)
        const normalized = testName.replace(/\s+/g, ' ').trim();
        contexts.set(normalized, context);

        // Also create a normalized key from the original test name
        // This handles cases where special chars were replaced
        const fileBaseName = file.replace('.json', '');
        // Try to match by creating a "safe" version of potential test names
        contexts.set(fileBaseName.replace(/_+/g, ' ').trim(), context);
      }
    }
  } catch {
    // Directory doesn't exist yet
  }

  return contexts;
}

/**
 * Clear all test contexts
 */
export async function clearTestContexts(): Promise<void> {
  try {
    await fs.rm(CONTEXT_DIR, { recursive: true, force: true });
  } catch {
    // Ignore errors
  }
}

/**
 * Add LLM interaction to current test
 */
export async function addLLMInteraction(
  interaction: LLMInteraction,
): Promise<void> {
  // Use interaction ID as the test key if currentTestKey is not set
  const testKey = currentTestKey || interaction.id || 'current-test';

  const context = await loadContext(testKey);
  if (!context.llmInteractions) {
    context.llmInteractions = [];
  }
  context.llmInteractions.push(interaction);
  await saveContext(testKey, context);

  // Also save with a metadata key for easier matching
  if (interaction.id && interaction.id !== testKey) {
    const idContext = await loadContext(interaction.id);
    if (!idContext.llmInteractions) {
      idContext.llmInteractions = [];
    }
    idContext.llmInteractions.push(interaction);
    await saveContext(interaction.id, idContext);
  }
}

/**
 * Add agent log to current test
 */
export async function addAgentLog(log: AgentLog): Promise<void> {
  if (!currentTestKey) return;

  const context = await loadContext(currentTestKey);
  if (!context.agentLogs) {
    context.agentLogs = [];
  }
  context.agentLogs.push(log);
  await saveContext(currentTestKey, context);
}

/**
 * Set XML validation for current test
 */
export async function setXMLValidation(
  validation: XMLValidation,
): Promise<void> {
  if (!currentTestKey) return;

  const context = await loadContext(currentTestKey);
  context.xmlValidation = validation;
  await saveContext(currentTestKey, context);
}

/**
 * Set agent metadata for current test
 */
export async function setAgentMetadata(agent: AgentMetadata): Promise<void> {
  if (!currentTestKey) return;

  const context = await loadContext(currentTestKey);
  context.agent = agent;
  await saveContext(currentTestKey, context);
}

/**
 * Add validation check to current test
 */
export async function addValidation(
  check: string,
  passed: boolean,
  message?: string,
): Promise<void> {
  if (!currentTestKey) return;

  const context = await loadContext(currentTestKey);
  if (!context.validations) {
    context.validations = [];
  }
  context.validations.push({ check, passed, message });
  await saveContext(currentTestKey, context);
}

/**
 * Add E2E step to current test
 */
export async function addStep(
  name: string,
  status: 'passed' | 'failed' | 'skipped',
  duration: number,
  error?: string,
): Promise<void> {
  if (!currentTestKey) return;

  const context = await loadContext(currentTestKey);
  if (!context.steps) {
    context.steps = [];
  }
  context.steps.push({ name, status, duration, error });
  await saveContext(currentTestKey, context);
}

/**
 * Set test behavior expectations
 */
export async function setBehavior(
  expected: string,
  actual: string,
): Promise<void> {
  if (!currentTestKey) return;

  const context = await loadContext(currentTestKey);
  context.expectedBehavior = expected;
  context.actualBehavior = actual;
  await saveContext(currentTestKey, context);
}

/**
 * Set E2E scenario
 */
export async function setScenario(scenario: string): Promise<void> {
  if (!currentTestKey) return;

  const context = await loadContext(currentTestKey);
  context.scenario = scenario;
  await saveContext(currentTestKey, context);
}

/**
 * Set integration test components
 */
export async function setComponents(components: string[]): Promise<void> {
  if (!currentTestKey) return;

  const context = await loadContext(currentTestKey);
  context.components = components;
  await saveContext(currentTestKey, context);
}

/**
 * Set custom metadata
 */
export async function setCustomMetadata(
  key: string,
  value: unknown,
): Promise<void> {
  if (!currentTestKey) return;

  const context = await loadContext(currentTestKey);
  context[key] = value;
  await saveContext(currentTestKey, context);
}

// ============================================================================
// Chat Conversation Capture (for LLM tests)
// ============================================================================

/**
 * Start a new chat conversation for the current test
 */
export async function startChatConversation(
  conversationId: string,
  provider: LLMProvider,
): Promise<void> {
  if (!currentTestKey) return;

  const context = await loadContext(currentTestKey);
  context.chatConversation = {
    id: conversationId,
    messages: [],
    provider,
    startTime: new Date().toISOString(),
    endTime: '', // Will be set when finalized
    duration: 0,
  };
  await saveContext(currentTestKey, context);
}

/**
 * Add a chat message to the current conversation
 */
export async function addChatMessage(
  role: ChatRole,
  content: string | null,
  options?: {
    toolCalls?: ToolCall[];
    toolCallId?: string;
  },
): Promise<void> {
  if (!currentTestKey) return;

  const context = await loadContext(currentTestKey);
  if (!context.chatConversation) {
    throw new Error(
      'No chat conversation started. Call startChatConversation first.',
    );
  }

  const message: ChatMessage = {
    role,
    content,
    timestamp: new Date().toISOString(),
  };

  if (options?.toolCalls) {
    message.toolCalls = options.toolCalls;
  }
  if (options?.toolCallId) {
    message.toolCallId = options.toolCallId;
  }

  context.chatConversation.messages.push(message);
  await saveContext(currentTestKey, context);
}

/**
 * Finalize the chat conversation (calculate duration, tokens, etc.)
 */
export async function finalizeChatConversation(totalTokens?: {
  prompt: number;
  completion: number;
  total: number;
}): Promise<void> {
  if (!currentTestKey) return;

  const context = await loadContext(currentTestKey);
  if (!context.chatConversation) {
    return;
  }

  const endTime = new Date();
  const startTime = new Date(context.chatConversation.startTime);
  context.chatConversation.endTime = endTime.toISOString();
  context.chatConversation.duration = endTime.getTime() - startTime.getTime();

  if (totalTokens) {
    context.chatConversation.totalTokens = totalTokens;
  }

  await saveContext(currentTestKey, context);
}
