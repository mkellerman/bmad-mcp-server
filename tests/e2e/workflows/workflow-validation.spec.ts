/**
 * LLM Workflow Validation Tests
 *
 * Each workflow gets its own test case with structured results:
 * - USER_INPUT: The command sent to load the workflow
 * - TOOL_RESPONSE: Raw MCP tool output
 * - SYSTEM_RESPONSE: LLM's interpreted response
 * - TEST_RESULTS: Validation of workflow loading and structure
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  MCPClientFixture,
  createMCPClient,
} from '../../support/mcp-client-fixture';
import { LLMClient } from '../../support/llm-client';
import { addLLMInteraction } from '../../framework/core/test-context.js';
import fs from 'fs';
import path from 'path';

interface TestResult {
  userInput: string;
  toolResponse: string;
  systemResponse: string;
  testResults: {
    workflowLoaded: boolean;
    hasSteps: boolean;
    stepCount: number;
    hasDescription: boolean;
    success: boolean;
    error?: string;
  };
}

// LLM Configuration
const LLM_MODEL = 'gpt-4.1';
const LLM_API_KEY = 'sk-test-bmad-1234';
const LLM_TEMPERATURE = 0.1;

// Helper to discover all available workflows from the master manifest
async function discoverWorkflows(): Promise<string[]> {
  try {
    // Read the master manifest JSON file directly
    const manifestPath = path.join(process.cwd(), 'master-manifest.json');

    if (!fs.existsSync(manifestPath)) {
      console.warn('Master manifest not found, using fallback workflow list');
      return ['core/brainstorming', 'core/party-mode'];
    }

    const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    // Only include modules that are actually loaded in the test environment
    const loadedModules = ['bmad-core', 'bmb', 'core', 'bmad-test-fixtures'];

    // Extract workflow names using fully qualified names (module/name) for all workflows
    const workflows = manifestData.workflows
      .filter(
        (workflow: any) =>
          workflow.exists &&
          workflow.status === 'verified' &&
          workflow.name &&
          loadedModules.includes(workflow.moduleName),
      ) // Only include loaded modules
      .map((workflow: any) => `${workflow.moduleName}/${workflow.name}`) // Always use module/name format
      .filter((name: string) => name && typeof name === 'string')
      .filter(
        (name: string, index: number, self: string[]) =>
          self.indexOf(name) === index,
      ); // unique only

    return workflows.sort();
  } catch (error) {
    console.error('Failed to discover workflows:', error);
    // Return a minimal set if discovery fails
    return ['core/brainstorming', 'core/party-mode'];
  }
}

// Helper to categorize workflows
function categorizeWorkflow(workflowName: string): string {
  const devWorkflows = ['greenfield', 'brownfield', 'debug', 'dev-story'];
  const writingWorkflows = ['novel', 'screenplay', 'story'];
  const gameWorkflows = ['game-dev', 'game-prototype'];

  if (devWorkflows.some((dw) => workflowName.includes(dw))) {
    return 'Development Workflows';
  }
  if (writingWorkflows.some((ww) => workflowName.includes(ww))) {
    return 'Creative Writing Workflows';
  }
  if (gameWorkflows.some((gw) => workflowName.includes(gw))) {
    return 'Game Development Workflows';
  }
  return 'Core Workflows';
}

// Helper to analyze LLM response for workflow structure
function analyzeLLMResponse(response: string): {
  workflowLoaded: boolean;
  hasSteps: boolean;
  stepCount: number;
  hasDescription: boolean;
} {
  const lowerResponse = response.toLowerCase();

  // Check if workflow was loaded successfully
  // A workflow is considered loaded if it has substantive content (>50 chars)
  // and shows evidence of workflow execution (questions, instructions, or structured content)
  const hasSubstantiveContent = response.length > 50;
  const hasQuestions = response.includes('?');
  const hasNumberedItems = /\d+\./g.test(response);
  const hasBulletPoints = /[-*]\s/g.test(response);
  const hasWorkflowKeywords =
    lowerResponse.includes('workflow') ||
    lowerResponse.includes('step') ||
    lowerResponse.includes('process') ||
    lowerResponse.includes('guide') ||
    lowerResponse.includes('session') ||
    lowerResponse.includes("let's") ||
    lowerResponse.includes('begin') ||
    lowerResponse.includes('start');

  const workflowLoaded =
    hasSubstantiveContent &&
    (hasWorkflowKeywords ||
      (hasQuestions && (hasNumberedItems || hasBulletPoints)));

  // Check if steps are present
  const hasSteps =
    lowerResponse.includes('step') ||
    lowerResponse.includes('phase') ||
    lowerResponse.includes('stage') ||
    hasNumberedItems ||
    hasBulletPoints;

  // Try to count steps mentioned in the response
  const stepMatches = response.match(/step\s+\d+/gi) || [];
  const numberMatches = response.match(/\d+\./g) || [];
  const bulletMatches = response.match(/[-*]\s/g) || [];
  const stepCount = Math.max(
    stepMatches.length,
    numberMatches.length,
    bulletMatches.length,
  );

  // Check if description is present
  const hasDescription =
    lowerResponse.includes('description') ||
    lowerResponse.includes('purpose') ||
    lowerResponse.includes('goal') ||
    lowerResponse.includes('about');

  return {
    workflowLoaded,
    hasSteps,
    stepCount,
    hasDescription,
  };
}

// Main function to load workflow through LLM
async function loadWorkflowThroughLLM(
  workflowName: string,
  llmClient: LLMClient,
  mcpClient: MCPClientFixture,
): Promise<TestResult> {
  const userInput = `#mcp_bmad_bmad *${workflowName}`;

  const result: TestResult = {
    userInput,
    toolResponse: '',
    systemResponse: '',
    testResults: {
      workflowLoaded: false,
      hasSteps: false,
      stepCount: 0,
      hasDescription: false,
      success: false,
    },
  };

  try {
    // Define the BMAD tool for LLM
    const bmadTool = {
      type: 'function',
      function: {
        name: 'mcp_bmad_bmad',
        description:
          'Unified BMAD tool. Use *workflow-name format for workflows.',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description:
                'Workflow command with asterisk prefix (e.g., "*party-mode")',
            },
          },
          required: ['command'],
        },
      },
    };

    // Ask LLM to load the workflow
    const completion = await llmClient.chat(
      LLM_MODEL,
      [
        {
          role: 'system',
          content:
            'You are a helpful assistant. When asked to load a workflow, use the mcp_bmad_bmad tool with the workflow name prefixed with an asterisk.',
        },
        {
          role: 'user',
          content: `Use the tool to load the *${workflowName} workflow`,
        },
      ],
      {
        temperature: LLM_TEMPERATURE,
        tools: [bmadTool],
      },
    );

    // Get tool calls
    const toolCalls = llmClient.getToolCalls(completion);

    if (toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      const toolFunc = 'function' in toolCall ? toolCall.function : null;

      if (toolFunc) {
        const args = JSON.parse(toolFunc.arguments);
        console.log(
          `\ncall_tool called: bmad with args: ${JSON.stringify(args)}`,
        );

        // Execute the MCP tool
        const toolResult = await mcpClient.callTool('bmad', args);
        result.toolResponse = toolResult.content;

        // Send result back to LLM for final response
        const followUp = await llmClient.chat(
          LLM_MODEL,
          [
            {
              role: 'system',
              content: 'You are a helpful assistant.',
            },
            {
              role: 'user',
              content: `Use the tool to load the *${workflowName} workflow`,
            },
            {
              role: 'assistant',
              content: null,
              tool_calls: [toolCall],
            },
            {
              role: 'tool',
              content: toolResult.content,
              tool_call_id: toolCall.id,
            },
          ],
          {
            temperature: LLM_TEMPERATURE,
          },
        );

        result.systemResponse = llmClient.getResponseText(followUp);
      }
    } else {
      result.systemResponse = llmClient.getResponseText(completion);
    }

    // Analyze the response
    const analysis = analyzeLLMResponse(result.systemResponse);
    result.testResults = {
      ...analysis,
      success: analysis.workflowLoaded, // Must have workflow loaded to be successful
    };

    // Capture LLM interaction for HTML report
    await addLLMInteraction({
      id: `workflow-${workflowName}`,
      timestamp: new Date().toISOString(),
      prompt: `Use the tool to load the workflow *${workflowName}`,
      response: result.systemResponse,
      provider: {
        name: 'litellm',
        model: LLM_MODEL,
      },
      toolCalls:
        toolCalls.length > 0
          ? [
              {
                name: 'mcp_bmad_bmad',
                arguments: JSON.parse(
                  ('function' in toolCalls[0]
                    ? toolCalls[0].function.arguments
                    : '{}') as string,
                ),
                timestamp: new Date().toISOString(),
                duration: 0,
                result: result.toolResponse,
              },
            ]
          : [],
      tokenUsage: {
        prompt: completion.usage?.prompt_tokens || 0,
        completion: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0,
      },
      duration: 0,
    });
  } catch (error) {
    result.testResults.error =
      error instanceof Error ? error.message : String(error);
    result.testResults.success = false;
  }

  return result;
}

// Wrapper to run test and add to reporter
async function testWorkflow(
  workflowName: string,
  category: string,
  llmClient: LLMClient,
  mcpClient: MCPClientFixture,
): Promise<void> {
  console.log(`  🔄 should load ${workflowName} workflow\n`);

  const result = await loadWorkflowThroughLLM(
    workflowName,
    llmClient,
    mcpClient,
  );

  // Note: Test results are automatically captured by the vitest reporter
  // The reporter will enrich them with LLM interaction data from addLLMInteraction()

  console.log(`\n📊 Test Result:`);
  console.log(`  USER_INPUT: ${result.userInput}`);
  console.log(
    `  TEST_RESULTS: Loaded=${result.testResults.workflowLoaded}, Steps=${result.testResults.stepCount}, Description=${result.testResults.hasDescription}\n`,
  );

  // Assertions
  expect(result.testResults.success).toBe(true);
  expect(result.testResults.workflowLoaded).toBe(true);
}

// Skip test suite if LiteLLM is not available
// Default to localhost:4000 if LITELLM_PROXY_URL not explicitly set
const skipE2E = process.env.SKIP_LLM_TESTS === 'true';

describe.skipIf(skipE2E)('Workflow Validation with LLM', () => {
  let mcpClient: MCPClientFixture;
  let llmClient: LLMClient;
  let discoveredWorkflows: string[] = [];

  beforeAll(async () => {
    // Initialize MCP client
    mcpClient = await createMCPClient();

    // Initialize LLM client (baseURL, apiKey)
    llmClient = new LLMClient('http://localhost:4000', LLM_API_KEY);

    // Verify LiteLLM is available
    try {
      await llmClient.healthCheck();
      console.log('✅ LiteLLM health check passed\n');
    } catch (error) {
      console.error('❌ LiteLLM health check failed:', error);
      throw error;
    }

    // Discover all workflows
    discoveredWorkflows = await discoverWorkflows();
    console.log(
      `\n📋 Discovered ${discoveredWorkflows.length} workflows from master manifest`,
    );
    console.log(`Workflows: ${discoveredWorkflows.join(', ')}\n`);
  }, 60000);

  afterAll(async () => {
    // Reports are generated automatically by global teardown
    console.log('\n📝 Test results saved to unified report...\n');

    // Cleanup
    if (mcpClient) {
      await mcpClient.cleanup();
    }
  });

  describe('Dynamic Workflow Tests', () => {
    it('should load all discovered workflows', async () => {
      // Group workflows by category
      const workflowsByCategory = new Map<string, string[]>();

      for (const workflow of discoveredWorkflows) {
        const category = categorizeWorkflow(workflow);
        if (!workflowsByCategory.has(category)) {
          workflowsByCategory.set(category, []);
        }
        workflowsByCategory.get(category)!.push(workflow);
      }

      // Test each category
      for (const [category, workflows] of workflowsByCategory.entries()) {
        console.log(`\n📁 ${category} (${workflows.length} workflows)\n`);

        for (const workflow of workflows) {
          await testWorkflow(workflow, category, llmClient, mcpClient);
        }
      }
    }, 300000); // 5 minute timeout for all workflows

    it('should have discovered at least one workflow', () => {
      expect(discoveredWorkflows.length).toBeGreaterThan(0);
    });
  });
});
