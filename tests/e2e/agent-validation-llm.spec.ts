/**
 * E2E Agent Validation Tests with LLM Integration
 *
 * Each agent gets its own test case with structured results:
 * - USER_INPUT: The command sent to load the agent
 * - TOOL_RESPONSE: Raw MCP tool output
 * - SYSTEM_RESPONSE: LLM's interpreted response
 * - TEST_RESULTS: Validation of persona adoption and menu
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  MCPClientFixture,
  createMCPClient,
} from '../support/mcp-client-fixture';
import { LLMClient } from './framework/llm-client';
import { reporter } from './framework/bmad-reporter';
import fs from 'fs';
import path from 'path';

interface TestResult {
  userInput: string;
  toolResponse: string;
  systemResponse: string;
  testResults: {
    personaLoaded: boolean;
    menuProvided: boolean;
    menuItemCount: number;
    hasGreeting: boolean;
    success: boolean;
    error?: string;
  };
}

// LLM Configuration
const LLM_MODEL = 'gpt-4.1';
const LLM_API_KEY = 'sk-test-bmad-1234';
const LLM_TEMPERATURE = 0.1;

// Helper to discover all available agents from the master manifest
async function discoverAgents(): Promise<string[]> {
  try {
    // Read the master manifest JSON file directly
    const manifestPath = path.join(process.cwd(), 'master-manifest.json');

    if (!fs.existsSync(manifestPath)) {
      console.warn('Master manifest not found, using fallback agent list');
      return ['bmad-core/analyst', 'bmad-core/architect', 'bmad-core/dev'];
    }

    const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    // Only include modules that are actually loaded in the test environment
    const loadedModules = ['bmad-core', 'bmb', 'core', 'bmad-test-fixtures'];

    // Extract agent names using fully qualified names (module/name) for all agents
    const agents = manifestData.agents
      .filter(
        (agent: any) =>
          agent.exists &&
          agent.status === 'verified' &&
          agent.name &&
          loadedModules.includes(agent.moduleName),
      ) // Only include loaded modules
      .map((agent: any) => `${agent.moduleName}/${agent.name}`) // Always use module/name format
      .filter((name: string) => name && typeof name === 'string')
      .filter(
        (name: string, index: number, self: string[]) =>
          self.indexOf(name) === index,
      ); // unique only

    return agents.sort();
  } catch (error) {
    console.error('Failed to discover agents:', error);
    // Return a minimal set if discovery fails
    return ['bmad-core/analyst', 'bmad-core/architect', 'bmad-core/dev'];
  }
}

// Helper to categorize agents
function categorizeAgent(agentName: string): string {
  const systemAgents = ['bmad-master', 'bmad-orchestrator', 'bmad-builder'];
  if (systemAgents.some((sa) => agentName.includes(sa))) {
    return 'System Agents';
  }
  return 'Core Agents';
}

// Helper to get friendly name for agent
function getFriendlyName(agentName: string): string {
  const nameMap: Record<string, string> = {
    analyst: 'Mary',
    architect: 'Winston',
    dev: 'James',
    pm: 'John',
    po: 'Sarah',
    qa: 'Quinn',
    sm: 'Bob',
    'ux-expert': 'Sally',
  };

  return nameMap[agentName] || agentName;
}

// Helper to analyze LLM response for persona and menu
function analyzeLLMResponse(response: string): {
  personaLoaded: boolean;
  menuProvided: boolean;
  menuItemCount: number;
  hasGreeting: boolean;
} {
  const lines = response.split('\n');

  // Check for persona adoption
  const personaLoaded = /i'?m\s+\w+|hello|greet|my name is|i am/i.test(
    response,
  );

  // Check for menu/command list
  const menuProvided = /command|can help|assist|available|option/i.test(
    response,
  );

  // Count menu items (numbered lists or bullet points)
  const menuItemCount = lines.filter(
    (line) => /^\s*\d+\./.test(line) || /^\s*[-*]/.test(line),
  ).length;

  // Check for greeting
  const hasGreeting = /hello|hi|greet|welcome/i.test(response);

  return {
    personaLoaded,
    menuProvided,
    menuItemCount,
    hasGreeting,
  };
}

// Helper wrapper to run test and automatically capture results
async function testAgent(
  testName: string,
  suiteName: string,
  agentName: string,
  llmClient: LLMClient,
  mcpClient: MCPClientFixture,
) {
  const startTime = Date.now();
  const result = await loadAgentThroughLLM(agentName, llmClient, mcpClient);
  const duration = Date.now() - startTime;

  // Add to reporter
  reporter.addTest(suiteName, {
    name: testName,
    status: result.testResults.success ? 'passed' : 'failed',
    duration,
    userInput: result.userInput,
    toolResponse: result.toolResponse,
    systemResponse: result.systemResponse,
    testResults: result.testResults,
  });

  // Log structured output
  console.log('\n📊 Test Result:');
  console.log(`  USER_INPUT: ${result.userInput}`);
  console.log(
    `  TEST_RESULTS: Persona=${result.testResults.personaLoaded}, Menu=${result.testResults.menuProvided}, Items=${result.testResults.menuItemCount}`,
  );

  return result;
}

// Helper to load agent through LLM
async function loadAgentThroughLLM(
  agentName: string,
  llmClient: LLMClient,
  mcpClient: MCPClientFixture,
): Promise<TestResult> {
  const userInput = `#mcp_bmad_bmad ${agentName}`;

  const result: TestResult = {
    userInput,
    toolResponse: '',
    systemResponse: '',
    testResults: {
      personaLoaded: false,
      menuProvided: false,
      menuItemCount: 0,
      hasGreeting: false,
      success: false,
    },
  };

  try {
    // Define the BMAD tool for LLM
    const bmadTool = {
      type: 'function',
      function: {
        name: 'mcp_bmad_bmad',
        description: 'Unified BMAD tool. Pass agent name as command parameter.',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Agent name (e.g., "analyst", "debug")',
            },
          },
          required: ['command'],
        },
      },
    };

    // Ask LLM to load the agent
    const completion = await llmClient.chat(
      LLM_MODEL,
      [
        {
          role: 'system',
          content:
            'You are a helpful assistant. When asked to load an agent, use the mcp_bmad_bmad tool with JUST the agent name as the command parameter.',
        },
        {
          role: 'user',
          content: `Use the tool to load the ${agentName} agent`,
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
              content: `Use the tool to load the ${agentName} agent`,
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
      success: true,
    };
  } catch (error) {
    result.testResults.error =
      error instanceof Error ? error.message : String(error);
  }

  return result;
}

describe('Agent Validation with LLM', () => {
  let mcpClient: MCPClientFixture;
  let llmClient: LLMClient;

  beforeAll(async () => {
    mcpClient = await createMCPClient();
    llmClient = new LLMClient('http://localhost:4000', LLM_API_KEY);

    const isHealthy = await llmClient.healthCheck();
    if (!isHealthy) {
      throw new Error('❌ LiteLLM proxy is not running!');
    }
  });

  afterAll(async () => {
    await mcpClient.cleanup();

    // Generate reports
    console.log('\n📝 Generating test reports...');
    reporter.generateReports();
  });

  // Discover agents and generate tests dynamically
  let discoveredAgents: string[] = [];

  beforeAll(async () => {
    console.log('🔍 Discovering available agents...');
    discoveredAgents = await discoverAgents();
    console.log(
      `✅ Found ${discoveredAgents.length} agents:`,
      discoveredAgents.join(', '),
    );
  });

  describe('Dynamic Agent Tests', () => {
    it('should have discovered agents', () => {
      expect(discoveredAgents.length).toBeGreaterThan(0);
    });

    it('should load all discovered agents', async () => {
      // Group agents by category
      const agentsByCategory = new Map<string, string[]>();

      for (const agentName of discoveredAgents) {
        const category = categorizeAgent(agentName);
        if (!agentsByCategory.has(category)) {
          agentsByCategory.set(category, []);
        }
        agentsByCategory.get(category)!.push(agentName);
      }

      // Test each agent
      for (const [category, agents] of agentsByCategory) {
        console.log(`\n📦 Testing ${category} (${agents.length} agents)...`);

        for (const agentName of agents) {
          const friendlyName = getFriendlyName(agentName);
          const testName = `should load ${agentName} agent${friendlyName !== agentName ? ` (${friendlyName})` : ''}`;

          console.log(`  🧪 ${testName}`);

          const result = await testAgent(
            testName,
            category,
            agentName,
            llmClient,
            mcpClient,
          );

          expect(
            result.testResults.success,
            `Failed to load ${agentName}: ${result.testResults.error}`,
          ).toBe(true);
          expect(
            result.testResults.personaLoaded,
            `Persona should be loaded for ${agentName}`,
          ).toBe(true);
        }
      }
    }, 300000); // 5 minutes timeout for all agents
  });
});
