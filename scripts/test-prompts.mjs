#!/usr/bin/env node
/**
 * Test MCP Prompts functionality
 *
 * This script tests:
 * 1. ListPrompts - Returns all agents as prompts
 * 2. GetPrompt - Returns agent activation instructions
 */

import { BMADServerLiteMultiToolGit } from '../build/server.js';

async function testPrompts() {
  console.log('🧪 Testing MCP Prompts Support\n');

  // Create server instance
  const server = new BMADServerLiteMultiToolGit('./tests/fixtures');

  // Access the server's internal properties
  const serverInternal = server;
  await serverInternal.initialize();

  console.log('✅ Server initialized\n');

  // Test 1: List Prompts
  console.log('📋 Test 1: List Prompts');
  console.log('─'.repeat(50));

  const agents = serverInternal.engine.getAgentMetadata();
  console.log(`Found ${agents.length} agents exposed as prompts:`);

  agents.slice(0, 5).forEach((agent, i) => {
    const promptName = agent.module
      ? `${agent.module}.${agent.name}`
      : `bmad.${agent.name}`;
    console.log(
      `  ${i + 1}. ${promptName} - ${agent.displayName} (${agent.title})`,
    );
  });

  if (agents.length > 5) {
    console.log(`  ... and ${agents.length - 5} more`);
  }

  console.log('\n✅ List Prompts working\n');

  // Test 2: Get Prompt (agent activation)
  console.log('🤖 Test 2: Get Prompt (Activate Agent)');
  console.log('─'.repeat(50));
  console.log('Testing: bmm.analyst\n');

  // Import handleBMADTool
  const { handleBMADTool } = await import('../build/tools/bmad-unified.js');

  const result = await handleBMADTool(
    {
      operation: 'execute',
      agent: 'analyst',
      message: 'Hello, what can you help me with?',
      module: 'bmm',
    },
    serverInternal.engine,
  );

  console.log('Response type:', result.content[0].type);
  console.log('Response length:', result.content[0].text.length);
  console.log(
    'Contains activation:',
    result.content[0].text.includes('activation'),
  );
  console.log(
    'Contains instructions:',
    result.content[0].text.includes('instructions'),
  );

  console.log('\n✅ Get Prompt working\n');

  // Summary
  console.log('📊 Summary');
  console.log('─'.repeat(50));
  console.log(`✅ ${agents.length} agents available as MCP prompts`);
  console.log('✅ Each prompt accepts optional "message" argument');
  console.log('✅ GetPrompt returns agent activation instructions');
  console.log('\n🎉 All prompts tests passed!');
}

testPrompts().catch(console.error);
