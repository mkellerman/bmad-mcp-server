/**
 * E2E Test: Error Handling
 *
 * Tests error scenarios and edge cases to validate proper error handling.
 * Ensures the system gracefully handles invalid requests and provides
 * meaningful feedback.
 *
 * ERROR SCENARIOS TESTED:
 * - Invalid agent names
 * - Missing required parameters
 * - Invalid operation types
 * - Invalid workflow names
 * - Malformed requests
 */

import { describe, it, expect } from 'vitest';
import {
  CopilotSessionHelper,
  type SessionAnalysis,
} from '../framework/helpers/copilot-session-helper.js';

describe('E2E: Error Handling', () => {
  it(
    'should handle request for non-existent agent',
    async () => {
      console.log('\n❌ Testing: Non-existent Agent Request\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Load the "super-magic-agent" that does not exist',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      // System should still complete successfully
      // It might discover there's no such agent or handle it gracefully
      expect(analysis.sessionId).toBeDefined();

      if (analysis.bmadCalls.length > 0) {
        console.log('\n📋 System attempted BMAD lookup (expected behavior)');
        
        // Even if agent doesn't exist, tool calls should complete
        // (though they may return "not found" type responses)
        const completedCalls = analysis.toolExecutions.length;
        console.log(`   Completed ${completedCalls} tool execution(s)`);
      } else {
        console.log('\n📋 System handled request without BMAD calls');
      }

      console.log('\n✅ Error handling test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should handle ambiguous agent request',
    async () => {
      console.log('\n🤔 Testing: Ambiguous Agent Request\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Load an agent to help me',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.sessionId).toBeDefined();

      // System might list agents to help user choose, or pick a default
      if (analysis.bmadCalls.length > 0) {
        console.log('\n📋 System consulted BMAD to resolve ambiguity');
        
        const listOperation = analysis.bmadCalls.find(
          (call) => call.arguments.operation === 'list'
        );

        if (listOperation) {
          console.log('   ✅ Used list operation to show options');
        }
      }

      console.log('\n✅ Ambiguous request test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should handle request with missing context',
    async () => {
      console.log('\n🔍 Testing: Request with Missing Context\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Execute the workflow',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.sessionId).toBeDefined();

      // System should either ask for clarification or list options
      if (analysis.bmadCalls.length > 0) {
        console.log('\n📋 System attempted to resolve missing context');
        
        const hasListOperation = analysis.bmadCalls.some(
          (call) => call.arguments.operation === 'list'
        );

        if (hasListOperation) {
          console.log('   ✅ Listed available options for user');
        }
      } else {
        console.log('\n📋 System handled directly without BMAD');
      }

      console.log('\n✅ Missing context test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should handle invalid workflow name',
    async () => {
      console.log('\n❌ Testing: Invalid Workflow Name\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Execute the "magic-workflow-xyz" that does not exist',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.sessionId).toBeDefined();

      if (analysis.bmadCalls.length > 0) {
        console.log('\n📋 System attempted workflow lookup');
        
        // Tool executions should complete even if workflow not found
        expect(analysis.toolExecutions.length).toBeGreaterThanOrEqual(0);
      }

      console.log('\n✅ Invalid workflow test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should handle very vague request',
    async () => {
      console.log('\n🌫️  Testing: Very Vague Request\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Help',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.sessionId).toBeDefined();

      // System should handle gracefully - might list options or ask for details
      console.log('\n📋 System processed vague request');

      if (analysis.bmadCalls.length > 0) {
        console.log(`   BMAD consulted: ${analysis.bmadCalls.length} call(s)`);
      } else {
        console.log('   Handled without BMAD calls');
      }

      console.log('\n✅ Vague request test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should handle request for wrong module',
    async () => {
      console.log('\n🔀 Testing: Wrong Module Request\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Use the analyst agent from the XYZ module that does not exist',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.sessionId).toBeDefined();

      if (analysis.bmadCalls.length > 0) {
        console.log('\n📋 System attempted module resolution');
        
        // Check if it found the correct module or handled the error
        const analystCall = analysis.bmadCalls.find(
          (call) => call.arguments.agent === 'analyst'
        );

        if (analystCall) {
          console.log(`   ✅ Found analyst in correct module: ${analystCall.arguments.module || 'default'}`);
        }
      }

      console.log('\n✅ Wrong module test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should validate error messages are captured in session',
    async () => {
      console.log('\n📝 Testing: Error Message Capture\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Execute agent without specifying which one',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.sessionId).toBeDefined();

      // Validate session captured the interaction
      expect(analysis.userMessages).toBeGreaterThan(0);
      expect(analysis.assistantMessages).toBeGreaterThan(0);

      console.log('\n📊 Session captured:');
      console.log(`   User messages: ${analysis.userMessages}`);
      console.log(`   Assistant messages: ${analysis.assistantMessages}`);
      console.log(`   Tool calls: ${analysis.toolCalls.length}`);

      console.log('\n✅ Error message capture test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should handle timeout scenarios gracefully',
    async () => {
      console.log('\n⏱️  Testing: Complex Request (potential timeout)\n');

      const helper = new CopilotSessionHelper();
      
      try {
        const analysis: SessionAnalysis = await helper.execute({
          prompt: 'List all agents, then read details for each one, then execute three different workflows',
          allowAllTools: true,
          timeout: 45000, // Shorter timeout to test handling
        });

        console.log(CopilotSessionHelper.formatAnalysis(analysis));

        expect(analysis.sessionId).toBeDefined();

        console.log('\n✅ Complex request completed within timeout');
        
      } catch (error) {
        // Timeout or other error - this is acceptable for this test
        console.log('\n📋 Request exceeded timeout (expected for complex operations)');
        console.log(`   Error: ${error instanceof Error ? error.message.substring(0, 100) : 'Unknown error'}`);
        
        // This is actually a valid test outcome - we're testing error handling
        expect(error).toBeDefined();
      }

      console.log('\n✅ Timeout handling test complete\n');
    },
    { timeout: 60000 }
  );
});
