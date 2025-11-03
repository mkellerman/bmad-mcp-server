/**
 * Remote Discovery LLM Integration Test
 * Validates that LLM correctly passes full commands including @remote syntax
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  MCPClientFixture,
  createMCPClient,
} from '../support/mcp-client-fixture';
import { LLMClient } from './framework/llm-client';
import { BMADTestReporter } from './framework/bmad-reporter';
import { rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const LLM_MODEL = 'gpt-4.1';
const LLM_TEMPERATURE = 0.1;

describe('Remote Discovery LLM Integration', () => {
  let mcpClient: MCPClientFixture;
  let llmClient: LLMClient;
  let reporter: BMADTestReporter;

  beforeAll(async () => {
    // Clean git cache to avoid concurrent access issues
    const gitCachePath = join(homedir(), '.bmad', 'cache', 'git');
    try {
      await rm(gitCachePath, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }

    mcpClient = await createMCPClient();
    llmClient = new LLMClient();
    reporter = new BMADTestReporter();

    const isHealthy = await llmClient.healthCheck();
    if (!isHealthy) {
      throw new Error('❌ LiteLLM proxy not running!');
    }
  });

  afterAll(async () => {
    await mcpClient.cleanup();
    reporter.generateReports();
  });

  it('should pass complete "*list-agents @awesome" command through LLM', async () => {
    console.log('\n🔍 Testing *list-agents @awesome through LLM...');

    // Get the actual tool definition from the MCP server
    const toolsResponse = await mcpClient.listTools();
    const tools = (toolsResponse as any).tools || [];
    const bmadTool = tools.find((t: any) => t.name === 'bmad');

    expect(bmadTool).toBeDefined();
    console.log(
      'Tool description excerpt:',
      bmadTool!.description.substring(0, 200),
    );

    // Convert to OpenAI tool format
    const openAITool = {
      type: 'function' as const,
      function: {
        name: 'mcp_bmad_bmad',
        description: bmadTool!.description,
        parameters: bmadTool!.inputSchema,
      },
    };

    // Ask LLM to list remote agents
    const completion = await llmClient.chat(
      LLM_MODEL,
      [
        {
          role: 'system',
          content:
            'You are a helpful assistant with access to BMAD tools. When the user asks to list agents from a remote, use the mcp_bmad_bmad tool with the COMPLETE command string including the @remote part.',
        },
        {
          role: 'user',
          content: 'List agents from @awesome',
        },
      ],
      {
        temperature: LLM_TEMPERATURE,
        tools: [openAITool],
      },
    );

    // Get tool calls
    const toolCalls = llmClient.getToolCalls(completion);
    console.log(`Tool calls: ${toolCalls.length}`);

    expect(toolCalls.length).toBeGreaterThan(0);

    const toolCall = toolCalls[0];
    const toolFunc = 'function' in toolCall ? toolCall.function : null;
    expect(toolFunc).toBeDefined();

    const args = JSON.parse(toolFunc!.arguments);
    console.log(`Tool arguments:`, args);

    // CRITICAL: Validate the LLM passed the COMPLETE command
    expect(args.command).toBeDefined();
    expect(args.command).toContain('*list-agents');
    expect(args.command).toContain('@awesome');

    // The command should be exactly "*list-agents @awesome"
    expect(args.command).toBe('*list-agents @awesome');

    console.log('✅ LLM correctly passed full command:', args.command);

    // Execute the tool to verify it works
    const toolResult = await mcpClient.callTool('bmad', args);

    expect(toolResult.isError).toBe(false);
    // Check for the emoji version with display wrapper
    expect(toolResult.content).toContain('# 🌐 Remote Agents: @awesome');
    expect(toolResult.content).toContain('debug-diana-v6/debug');

    console.log('✅ Tool execution successful');

    // Add to test reporter
    reporter.addTest('Remote Discovery LLM Integration', {
      name: 'Complete *list-agents @awesome command pass-through',
      status: 'passed',
      duration: 0,
      userInput: 'List agents from @awesome',
      toolResponse: JSON.stringify(args, null, 2),
      systemResponse: toolResult.content,
      testResults: {
        success: true,
        hasDescription: true,
        hasGreeting: toolResult.content.includes('debug-diana-v6/debug'),
      },
    });
  }, 45000); // 45s timeout for git clone + LLM

  it('should handle "*list-modules @awesome" command correctly', async () => {
    console.log('\n🔍 Testing *list-modules @awesome through LLM...');

    const toolsResponse = await mcpClient.listTools();
    const tools = (toolsResponse as any).tools || [];
    const bmadTool = tools.find((t: any) => t.name === 'bmad');

    const openAITool = {
      type: 'function' as const,
      function: {
        name: 'mcp_bmad_bmad',
        description: bmadTool!.description,
        parameters: bmadTool!.inputSchema,
      },
    };

    const completion = await llmClient.chat(
      LLM_MODEL,
      [
        {
          role: 'system',
          content:
            'You are a helpful assistant. Use the mcp_bmad_bmad tool to execute BMAD commands. Pass the complete command string as provided by the user.',
        },
        {
          role: 'user',
          content: 'List modules from @awesome',
        },
      ],
      {
        temperature: LLM_TEMPERATURE,
        tools: [openAITool],
      },
    );

    const toolCalls = llmClient.getToolCalls(completion);
    expect(toolCalls.length).toBeGreaterThan(0);

    const toolCall = toolCalls[0];
    const toolFunc = 'function' in toolCall ? toolCall.function : null;
    const args = JSON.parse(toolFunc!.arguments);

    console.log(`Tool arguments:`, args);

    // Validate full command
    expect(args.command).toBeDefined();
    expect(args.command).toContain('*list-modules');
    expect(args.command).toContain('@awesome');

    console.log('✅ LLM correctly passed full command:', args.command);

    // Execute the tool
    const toolResult = await mcpClient.callTool('bmad', args);

    expect(toolResult.isError).toBe(false);
    // Check for the emoji version with display wrapper
    expect(toolResult.content).toContain('# 🌐 Remote Modules: @awesome');

    console.log('✅ Tool execution successful');

    // Add to test reporter
    reporter.addTest('Remote Discovery LLM Integration', {
      name: 'Complete *list-modules @awesome command pass-through',
      status: 'passed',
      duration: 0,
      userInput: 'List modules from @awesome',
      toolResponse: JSON.stringify(args, null, 2),
      systemResponse: toolResult.content,
      testResults: {
        success: true,
        hasDescription: true,
      },
    });
  }, 45000);

  it('should validate tool description instructs proper pass-through', async () => {
    // Get the tool definition
    const toolsResponse = await mcpClient.listTools();
    const tools = (toolsResponse as any).tools || [];
    const bmadTool = tools.find((t: any) => t.name === 'bmad');

    expect(bmadTool).toBeDefined();

    // Validate the command parameter description includes pass-through instructions
    const inputSchema = bmadTool!.inputSchema as any;
    const commandDescription = inputSchema.properties.command.description;

    console.log('Command parameter description:', commandDescription);

    // Check for CRITICAL pass-through instructions
    expect(commandDescription).toContain('CRITICAL');
    expect(commandDescription).toContain('ZERO modifications');
    expect(commandDescription).toContain('Do NOT remove @ symbols');
    expect(commandDescription).toContain('do NOT strip remote references');
    expect(commandDescription).toContain('*list-agents @awesome');
    expect(commandDescription).toContain('*list-modules @myorg');

    console.log(
      '✅ Tool description includes CRITICAL pass-through instructions',
    );
  });
});
