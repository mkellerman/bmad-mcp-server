/**
 * Tool Calling Smoke Test
 *
 * Quick smoke tests to verify basic BMAD tool calling functionality.
 * These are lightweight tests that run quickly to validate core mechanics.
 *
 * MIGRATION NOTE:
 * Migrated from copilot-proxy (LLMHelper) to Copilot CLI (CopilotSessionHelper).
 * Simplified from complex conversation loops to straightforward session analysis.
 * The comprehensive tool calling coverage is in other E2E test files.
 */

import { describe, it, expect } from 'vitest';
import { CopilotSessionHelper } from '../framework/helpers/copilot-session-helper.js';

describe('E2E: Tool Calling Smoke Test', () => {
  it('should successfully call BMAD tool to list agents', async () => {
    console.log('\n' + '═'.repeat(80));
    console.log('🧪 Smoke Test: BMAD Tool Calling - List Agents');
    console.log('═'.repeat(80));

    const helper = new CopilotSessionHelper();
    console.log(`   ✅ Server ID: ${helper.getServerID()}`);

    const userMessage = 'List all available BMAD agents';

    console.log('\n💬 User Request:');
    console.log(`   "${userMessage}"`);

    console.log('\n🤖 Executing via Copilot CLI...');
    const analysis = await helper.execute({
      prompt: userMessage,
      allowAllTools: true,
      timeout: 60000,
    });

    console.log('\n📊 Results:');
    console.log(`   Session ID: ${analysis.sessionId}`);
    console.log(`   Duration: ${analysis.durationSeconds.toFixed(2)}s`);
    console.log(`   Tool calls: ${analysis.toolCalls.length}`);
    console.log(`   BMAD calls: ${analysis.bmadCalls.length}`);

    if (analysis.bmadCalls.length > 0) {
      console.log('\n🎯 BMAD Call Details:');
      analysis.bmadCalls.forEach((call, idx) => {
        console.log(`   ${idx + 1}. Operation: ${call.arguments.operation}, Query: ${call.arguments.query}`);
      });
    }

    // Assertions
    expect(analysis.bmadCalls.length).toBeGreaterThan(0);
    console.log('\n   ✅ BMAD tool was called');

    // Verify list operation was used
    const listOperation = analysis.bmadCalls.some(call => 
      call.arguments.operation === 'list' && 
      (call.arguments.query === 'agents' || call.arguments.query?.toString().includes('agent'))
    );
    expect(listOperation).toBe(true);
    console.log('   ✅ List operation executed correctly');

    // Verify at least one tool succeeded
    expect(analysis.validationChecks.atLeastOneSuccess).toBe(true);
    console.log('   ✅ Tool execution successful');

    console.log('\n✅ Smoke Test Passed!\n');
  }, 90000);

  it('should successfully call BMAD tool to list workflows', async () => {
    console.log('\n' + '═'.repeat(80));
    console.log('🧪 Smoke Test: BMAD Tool Calling - List Workflows');
    console.log('═'.repeat(80));

    const helper = new CopilotSessionHelper();
    console.log(`   ✅ Server ID: ${helper.getServerID()}`);

    const userMessage = 'Show me all BMAD workflows';

    console.log('\n💬 User Request:');
    console.log(`   "${userMessage}"`);

    console.log('\n🤖 Executing via Copilot CLI...');
    const analysis = await helper.execute({
      prompt: userMessage,
      allowAllTools: true,
      timeout: 60000,
    });

    console.log('\n📊 Results:');
    console.log(`   Session ID: ${analysis.sessionId}`);
    console.log(`   Duration: ${analysis.durationSeconds.toFixed(2)}s`);
    console.log(`   Tool calls: ${analysis.toolCalls.length}`);
    console.log(`   BMAD calls: ${analysis.bmadCalls.length}`);

    if (analysis.bmadCalls.length > 0) {
      console.log('\n🎯 BMAD Call Details:');
      analysis.bmadCalls.forEach((call, idx) => {
        console.log(`   ${idx + 1}. Operation: ${call.arguments.operation}, Query: ${call.arguments.query}`);
      });
    }

    // Assertions
    expect(analysis.bmadCalls.length).toBeGreaterThan(0);
    console.log('\n   ✅ BMAD tool was called');

    // Verify workflows query was used
    const workflowQuery = analysis.bmadCalls.some(call => 
      call.arguments.operation === 'list' && 
      (call.arguments.query === 'workflows' || call.arguments.query?.toString().includes('workflow'))
    );
    expect(workflowQuery).toBe(true);
    console.log('   ✅ Workflow query executed correctly');

    // Verify at least one tool succeeded
    expect(analysis.validationChecks.atLeastOneSuccess).toBe(true);
    console.log('   ✅ Tool execution successful');

    console.log('\n✅ Smoke Test Passed!\n');
  }, 90000);

  it('should successfully execute a BMAD agent', async () => {
    console.log('\n' + '═'.repeat(80));
    console.log('🧪 Smoke Test: BMAD Tool Calling - Execute Agent');
    console.log('═'.repeat(80));

    const helper = new CopilotSessionHelper();
    console.log(`   ✅ Server ID: ${helper.getServerID()}`);

    const userMessage = 'Execute the debug agent to help me';

    console.log('\n💬 User Request:');
    console.log(`   "${userMessage}"`);

    console.log('\n🤖 Executing via Copilot CLI...');
    const analysis = await helper.execute({
      prompt: userMessage,
      allowAllTools: true,
      timeout: 60000,
    });

    console.log('\n📊 Results:');
    console.log(`   Session ID: ${analysis.sessionId}`);
    console.log(`   Duration: ${analysis.durationSeconds.toFixed(2)}s`);
    console.log(`   Tool calls: ${analysis.toolCalls.length}`);
    console.log(`   BMAD calls: ${analysis.bmadCalls.length}`);

    if (analysis.bmadCalls.length > 0) {
      console.log('\n🎯 BMAD Call Details:');
      analysis.bmadCalls.forEach((call, idx) => {
        console.log(`   ${idx + 1}. Operation: ${call.arguments.operation}, Agent: ${call.arguments.agent}`);
      });
    }

    // Assertions
    expect(analysis.bmadCalls.length).toBeGreaterThan(0);
    console.log('\n   ✅ BMAD tool was called');

    // Verify execute operation was attempted (flexible - LLM might do read first)
    const agentOperation = analysis.bmadCalls.some(call => 
      (call.arguments.operation === 'execute' || call.arguments.operation === 'read') &&
      call.arguments.agent === 'debug'
    );
    expect(agentOperation).toBe(true);
    console.log('   ✅ Agent operation executed');

    // Verify at least one tool succeeded
    expect(analysis.validationChecks.atLeastOneSuccess).toBe(true);
    console.log('   ✅ Tool execution successful');

    console.log('\n✅ Smoke Test Passed!\n');
  }, 90000);
});
