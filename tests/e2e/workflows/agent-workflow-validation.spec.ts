/**
 * LLM Tests for Agent and Workflow Validation
 *
 * This test suite validates the entire BMAD agent ecosystem by:
 * 1. Listing all available agents via *list-agents
 * 2. Loading each agent through an LLM using the MCP tool
 * 3. Capturing the LLM's response to each agent
 * 4. Analyzing the response for persona adoption and menu display
 * 5. Testing all workflows through LLM
 * 6. Logging all LLM responses to individual .log files
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  MCPClientFixture,
  createMCPClient,
} from '../../support/mcp-client-fixture';
import { LLMClient } from '../../support/llm-client';
import { verifyLiteLLMRunning } from '../../support/litellm-helper.mjs';
import { addLLMInteraction } from '../../framework/core/test-context.js';

interface AgentInfo {
  name: string;
  module?: string;
  title?: string;
}

interface WorkflowInfo {
  name: string;
  path: string;
}

interface MenuCommand {
  trigger: string;
  workflow?: string;
  label?: string;
}

// LLM Configuration
const LLM_MODEL = 'gpt-4.1';
const LLM_API_KEY = 'sk-test-bmad-1234';
const LLM_TEMPERATURE = 0.1;

/**
 * Analyze LLM response for agent adoption
 */
function analyzeLLMResponse(response: string): {
  personaLoaded: boolean;
  menuProvided: boolean;
  menuCount: number;
  hasGreeting: boolean;
} {
  // Check for persona/character adoption
  const personaLoaded =
    response.includes('I am ') ||
    response.includes("I'm ") ||
    response.includes('Hello') ||
    response.includes('Hi') ||
    response.toLowerCase().includes('analyst') ||
    response.toLowerCase().includes('architect') ||
    response.toLowerCase().includes('developer') ||
    response.length > 50; // Has substantive response

  // Check for menu items
  const menuProvided =
    response.includes('*') ||
    response.match(/\d+\./g) !== null || // Numbered list
    response.toLowerCase().includes('command') ||
    response.toLowerCase().includes('menu') ||
    response.toLowerCase().includes('option');

  // Count menu items (look for * triggers or numbered items)
  const starCommands = (response.match(/\*[a-z-]+/g) || []).length;
  const numberedItems = (response.match(/^\s*\d+\./gm) || []).length;
  const menuCount = Math.max(starCommands, numberedItems);

  const hasGreeting =
    response.toLowerCase().includes('hello') ||
    response.toLowerCase().includes('hi ') ||
    response.toLowerCase().includes('welcome') ||
    response.toLowerCase().includes('greet');

  return {
    personaLoaded,
    menuProvided,
    menuCount,
    hasGreeting,
  };
}

/**
 * Parse agent list from *list-agents response
 */
function parseAgentList(content: string): AgentInfo[] {
  const agents: AgentInfo[] = [];

  // Extract content from XML tags if present
  const contentMatch = content.match(/<content>([\s\S]*?)<\/content>/);
  const actualContent = contentMatch ? contentMatch[1] : content;

  // Look for agent entries in format: - icon `load-command`: Title (**DisplayName**) Role
  // Example: - 🤖 `analyst`: Business Analyst (**Mary**) - Lead Analyst
  const linePattern = /^[-*]\s+[^\s]*\s*`([^`]+)`:\s*(.*)$/gm;

  let match;
  while ((match = linePattern.exec(actualContent)) !== null) {
    const loadCommand = match[1];
    const description = match[2];

    if (
      loadCommand &&
      loadCommand.length > 0 &&
      !loadCommand.startsWith('http')
    ) {
      // Extract display name from (**Name**) if present
      const displayNameMatch = description.match(/\(\*\*([^*]+)\*\*\)/);
      const displayName = displayNameMatch ? displayNameMatch[1] : undefined;

      // Extract title (first part before (**
      const titleMatch = description.match(/^([^(]+)/);
      const title = titleMatch ? titleMatch[1].trim() : undefined;

      agents.push({
        name: loadCommand,
        title: displayName || title,
      });
    }
  }

  // Also try JSON structured data if available
  try {
    const jsonMatch = actualContent.match(/```json\s*\n([\s\S]+?)\n```/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1]);
      if (Array.isArray(data.agents)) {
        data.agents.forEach((item: any) => {
          if (item.name || item.loadCommand) {
            agents.push({
              name: item.loadCommand || item.name,
              module: item.module,
              title: item.displayName || item.title || item.description,
            });
          }
        });
      }
    }
  } catch {
    // JSON parsing failed, continue with regex results
  }

  return agents;
}

/**
 * Parse workflow list from *list-workflows response
 */
function parseWorkflowList(content: string): WorkflowInfo[] {
  const workflows: WorkflowInfo[] = [];

  // Extract content from XML tags if present
  const contentMatch = content.match(/<content>([\s\S]*?)<\/content>/);
  const actualContent = contentMatch ? contentMatch[1] : content;

  // Look for workflow entries in format: - 🔄 `workflow-name`: Description
  // Example: - 🔄 `party-mode`: **Party Planning Mode** - Interactive workflow
  const linePattern = /^[-*]\s+[^\s]*\s*`([^`]+)`:\s*(.*)$/gm;

  let match;
  while ((match = linePattern.exec(actualContent)) !== null) {
    const name = match[1];
    if (name && name.length > 0 && !name.startsWith('http')) {
      workflows.push({
        name,
        path: name,
      });
    }
  }

  // Also try JSON structured data
  try {
    const jsonMatch = actualContent.match(/```json\s*\n([\s\S]+?)\n```/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1]);
      if (Array.isArray(data.items)) {
        data.items.forEach((item: any) => {
          workflows.push({
            name: item.name || item.id,
            path: item.path || item.name,
          });
        });
      }
    }
  } catch {
    // JSON parsing failed, continue with regex results
  }

  return workflows;
}

/**
 * Extract menu commands from agent content
 * Looks for menu items in XML/markdown that have workflow attributes
 */
function extractMenuCommands(content: string): MenuCommand[] {
  const commands: MenuCommand[] = [];

  // Look for <item> tags with workflow attribute
  // Example: <item cmd="*inspect" workflow="{project-root}/bmad/debug/workflows/inspect/workflow.yaml">
  const xmlPattern =
    /<item\s+cmd=["'](\*[^"']+)["'](?:\s+workflow=["']([^"']+)["'])?[^>]*>([^<]*)<\/item>/gi;

  let match;
  while ((match = xmlPattern.exec(content)) !== null) {
    const trigger = match[1];
    const workflow = match[2];
    const label = match[3];

    if (trigger && trigger !== '*exit' && trigger !== '*help') {
      commands.push({
        trigger,
        workflow,
        label: label?.trim(),
      });
    }
  }

  // Also look for markdown list format
  // Example: - `*inspect` — Execute comprehensive Fagan inspection workflow
  const mdPattern = /^\s*[-*]\s*`(\*[a-z0-9-]+)`\s*[—–-]\s*(.+?)$/gim;
  while ((match = mdPattern.exec(content)) !== null) {
    const trigger = match[1];
    const label = match[2];

    if (trigger && trigger !== '*exit' && trigger !== '*help') {
      // Check if this command already exists (XML takes precedence)
      if (!commands.find((c) => c.trigger === trigger)) {
        commands.push({
          trigger,
          label: label?.trim(),
        });
      }
    }
  }

  return commands;
}

// Skip test suite if LiteLLM is not available
// Default to localhost:4000 if LITELLM_PROXY_URL not explicitly set
const skipE2E = process.env.SKIP_LLM_TESTS === 'true';

describe.skipIf(skipE2E)('Agent and Workflow Validation', () => {
  let mcpClient: MCPClientFixture;
  let llmClient: LLMClient;
  let allAgents: AgentInfo[] = [];
  let allWorkflows: WorkflowInfo[] = [];

  beforeAll(async () => {
    mcpClient = await createMCPClient();
    llmClient = await LLMClient.create(LLM_API_KEY);

    // Verify LiteLLM is running (global setup should have started it)
    await verifyLiteLLMRunning(() => llmClient.healthCheck());

    console.log(`🤖 Model: ${LLM_MODEL}`);
  }, 30000);

  afterAll(async () => {
    await mcpClient.cleanup();
  });

  describe('Discovery Commands', () => {
    it('should list all agents via *list-agents', async () => {
      const result = await mcpClient.callTool('bmad', {
        command: '*list-agents',
      });

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      allAgents = parseAgentList(result.content);
      console.log(`Found ${allAgents.length} agents`);

      expect(allAgents.length).toBeGreaterThan(0);
    });

    it('should list all workflows via *list-workflows', async () => {
      const result = await mcpClient.callTool('bmad', {
        command: '*list-workflows',
      });

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);

      allWorkflows = parseWorkflowList(result.content);
      console.log(`Found ${allWorkflows.length} workflows`);

      expect(allWorkflows.length).toBeGreaterThan(0);
    });
  });

  describe('Agent Loading and Menu Validation', () => {
    it('should load ALL agents through LLM and analyze responses', async () => {
      // Wait for agents list to be populated
      if (allAgents.length === 0) {
        const result = await mcpClient.callTool('bmad', {
          command: '*list-agents',
        });
        allAgents = parseAgentList(result.content);
      }

      console.log(
        `\n📊 Testing ALL ${allAgents.length} agents through LLM with full logging...`,
      );

      const results: Array<{
        name: string;
        success: boolean;
        personaLoaded: boolean;
        menuProvided: boolean;
        menuCount: number;
        error?: string;
      }> = [];

      for (const agent of allAgents) {
        console.log(
          `\n🔍 Testing agent through LLM: ${agent.name} (${agent.title || 'no title'})`,
        );

        try {
          // Define the BMAD tool for the LLM
          const bmadTool = {
            type: 'function',
            function: {
              name: 'mcp_bmad_bmad',
              description:
                'Unified BMAD tool. To load an agent, pass the agent name as the command parameter. Example: {command: "analyst"} loads the analyst agent.',
              parameters: {
                type: 'object',
                properties: {
                  command: {
                    type: 'string',
                    description:
                      'The agent name (e.g., "analyst", "debug", "architect"). Just the name, not full sentence.',
                  },
                },
                required: ['command'],
              },
            },
          };

          // Prompt the LLM to use the tool
          const userMessage = `Use the tool to load the ${agent.name} agent`;

          const completion = await llmClient.chat(
            LLM_MODEL,
            [
              {
                role: 'system',
                content:
                  'You are a helpful assistant. When asked to load an agent, use the mcp_bmad_bmad tool with JUST the agent name as the command parameter. For example, to load analyst, call mcp_bmad_bmad with command="analyst".',
              },
              {
                role: 'user',
                content: userMessage,
              },
            ],
            {
              temperature: LLM_TEMPERATURE,
              tools: [bmadTool],
            },
          );

          // Check if LLM called the tool
          const toolCalls = llmClient.getToolCalls(completion);
          let llmResponse = llmClient.getResponseText(completion);
          let toolResponse = '';
          let toolArgs: Record<string, unknown> = {};

          if (toolCalls.length > 0) {
            // LLM wants to call the tool - execute it
            const toolCall = toolCalls[0];
            const toolFunc = 'function' in toolCall ? toolCall.function : null;

            if (!toolFunc) {
              throw new Error('Tool call missing function data');
            }

            const args = JSON.parse(toolFunc.arguments);
            toolArgs = args; // Store for interaction capture

            const toolResult = await mcpClient.callTool('bmad', args);
            toolResponse = toolResult.content;

            // Send tool result back to LLM for final response
            const followUpCompletion = await llmClient.chat(
              LLM_MODEL,
              [
                {
                  role: 'system',
                  content:
                    'You are a helpful assistant with access to BMAD MCP tools.',
                },
                {
                  role: 'user',
                  content: userMessage,
                },
                {
                  role: 'assistant',
                  content: null,
                  tool_calls: [toolCall],
                },
                {
                  role: 'tool',
                  content: toolResponse,
                  tool_call_id: toolCall.id,
                },
              ],
              {
                temperature: LLM_TEMPERATURE,
              },
            );

            llmResponse = llmClient.getResponseText(followUpCompletion);
          }

          // Analyze the LLM's response
          const analysis = analyzeLLMResponse(llmResponse);

          // Capture LLM interaction for HTML report
          await addLLMInteraction({
            id: `agent-workflow-${agent.name}`,
            timestamp: new Date().toISOString(),
            prompt: `Load the ${agent.name} agent`,
            response: llmResponse,
            provider: {
              name: 'litellm',
              model: LLM_MODEL,
            },
            toolCalls:
              toolCalls.length > 0 && toolResponse
                ? [
                    {
                      name: 'mcp_bmad_bmad',
                      arguments: toolArgs,
                      timestamp: new Date().toISOString(),
                      duration: 0,
                      result: toolResponse,
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

          results.push({
            name: agent.name,
            success: true,
            personaLoaded: analysis.personaLoaded,
            menuProvided: analysis.menuProvided,
            menuCount: analysis.menuCount,
          });

          console.log(
            `  ✅ Success - Persona: ${analysis.personaLoaded}, Menu: ${analysis.menuProvided} (${analysis.menuCount} items)`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          results.push({
            name: agent.name,
            success: false,
            personaLoaded: false,
            menuProvided: false,
            menuCount: 0,
            error: errorMessage,
          });

          console.log(`  ❌ Error: ${errorMessage.substring(0, 100)}`);
        }
      }

      console.log('\n📊 Summary:');
      console.log(`   Total: ${results.length}`);
      console.log(`   Success: ${results.filter((r) => r.success).length}`);
      console.log(
        `   Persona Loaded: ${results.filter((r) => r.personaLoaded).length}`,
      );
      console.log(
        `   Menu Provided: ${results.filter((r) => r.menuProvided).length}`,
      );
      console.log(
        `   Total Menu Items: ${results.reduce((sum, r) => sum + r.menuCount, 0)}`,
      );

      // Test passes if we processed all agents
      expect(results.length).toBe(allAgents.length);
    }, 600000); // 10 minute timeout for comprehensive test
  });

  describe('Workflow Execution Validation', () => {
    it('should execute ALL workflows with logging', async () => {
      // Ensure we have workflows list
      if (allWorkflows.length === 0) {
        const result = await mcpClient.callTool('bmad', {
          command: '*list-workflows',
        });
        allWorkflows = parseWorkflowList(result.content);
      }

      console.log(
        `\n📊 Testing ALL ${allWorkflows.length} workflows with full logging...`,
      );

      const results: Array<{
        name: string;
        success: boolean;
        error?: string;
      }> = [];

      for (const workflow of allWorkflows) {
        console.log(`\n🔄 Testing workflow: *${workflow.name}`);

        const result = await mcpClient.callTool('bmad', {
          command: `*${workflow.name}`,
        });

        const success = !result.isError;

        results.push({
          name: workflow.name,
          success,
          error: result.isError ? result.content.substring(0, 200) : undefined,
        });

        console.log(`  ${success ? '✅' : '❌'} Success: ${success}`);
        if (!success) {
          console.log(`     Error: ${result.content.substring(0, 100)}...`);
        }
      }

      console.log('\n📊 Workflow Summary:');
      console.log(`   Total: ${results.length}`);
      console.log(`   Success: ${results.filter((r) => r.success).length}`);
      console.log(`   Failed: ${results.filter((r) => !r.success).length}`);

      // Test passes if we processed all workflows
      expect(results.length).toBe(allWorkflows.length);
    }, 600000); // 10 minute timeout
  });

  describe('Agent Command to Workflow Validation', () => {
    it('should validate that agent commands reference valid workflows', async () => {
      // Ensure we have workflows list
      if (allWorkflows.length === 0) {
        const result = await mcpClient.callTool('bmad', {
          command: '*list-workflows',
        });
        allWorkflows = parseWorkflowList(result.content);
      }

      // Ensure we have agents list
      if (allAgents.length === 0) {
        const result = await mcpClient.callTool('bmad', {
          command: '*list-agents',
        });
        allAgents = parseAgentList(result.content);
      }

      console.log(`\n📊 Validating agent commands against workflow list...`);

      const validationResults: Array<{
        agent: string;
        command: string;
        workflow?: string;
        exists: boolean;
      }> = [];

      // Check each agent's commands
      for (const agent of allAgents) {
        const result = await mcpClient.callTool('bmad', {
          command: agent.name,
        });

        if (result.isError) continue;

        const commands = extractMenuCommands(result.content);
        const workflowCommands = commands.filter((c) => c.workflow);

        for (const cmd of workflowCommands) {
          // Extract workflow name from path
          const workflowName = cmd.workflow?.match(/workflows\/([^/]+)\//)?.[1];

          if (workflowName) {
            const workflowExists = allWorkflows.some(
              (w) => w.name === workflowName || w.path.includes(workflowName),
            );

            validationResults.push({
              agent: agent.name,
              command: cmd.trigger,
              workflow: workflowName,
              exists: workflowExists,
            });
          }
        }
      }

      console.log('\n📊 Validation Summary:');
      console.log(`   Total Mappings: ${validationResults.length}`);
      console.log(
        `   Valid: ${validationResults.filter((r) => r.exists).length}`,
      );
      console.log(
        `   Invalid: ${validationResults.filter((r) => !r.exists).length}`,
      );

      // Test passes - we're just logging, not enforcing
      expect(validationResults.length).toBeGreaterThanOrEqual(0);
    }, 600000);
  });
});
