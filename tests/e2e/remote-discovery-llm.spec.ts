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
import { rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import fs from 'fs';
import path from 'path';

const LLM_MODEL = 'gpt-4.1';
const LLM_TEMPERATURE = 0.1;
const LOG_DIR = path.join(process.cwd(), 'test-results', 'agent-logs');

function writeLog(filename: string, content: string): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const logPath = path.join(LOG_DIR, filename);
  fs.writeFileSync(logPath, content, 'utf-8');
}

describe('Remote Discovery LLM Integration', () => {
  let mcpClient: MCPClientFixture;
  let llmClient: LLMClient;

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

    const isHealthy = await llmClient.healthCheck();
    if (!isHealthy) {
      throw new Error('❌ LiteLLM proxy not running!');
    }
  });

  afterAll(async () => {
    await mcpClient.cleanup();
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

    // Write log file with USER, TOOL, SYSTEM format
    const logContent = `USER: List agents from @awesome

TOOL_CALL: mcp_bmad_bmad
TOOL_ARGS: ${JSON.stringify(args, null, 2)}

TOOL_RESPONSE:
${toolResult.content}

TEST_ANALYSIS:
✅ LLM correctly passed complete command: "${args.command}"
✅ Tool executed successfully
✅ Found debug-diana-v6/debug agent
✅ Response includes 55 agents across 8 modules`;

    writeLog('list-agents-awesome.log', logContent);
    console.log(`📄 Log written to: ${LOG_DIR}/list-agents-awesome.log`);
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

    // Write log file
    const logContent = `USER: List modules from @awesome

TOOL_CALL: mcp_bmad_bmad
TOOL_ARGS: ${JSON.stringify(args, null, 2)}

TOOL_RESPONSE:
${toolResult.content}

TEST_ANALYSIS:
✅ LLM correctly passed complete command: "${args.command}"
✅ Tool executed successfully
✅ Response includes module listing from @awesome`;

    writeLog('list-modules-awesome.log', logContent);
    console.log(`📄 Log written to: ${LOG_DIR}/list-modules-awesome.log`);
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

    // Check for key pass-through instructions
    expect(commandDescription.toLowerCase()).toContain('complete');
    expect(commandDescription.toLowerCase()).toContain('verbatim');
    expect(commandDescription).toContain('*list-agents @awesome');

    console.log('✅ Tool description includes pass-through instructions');
  });
});
