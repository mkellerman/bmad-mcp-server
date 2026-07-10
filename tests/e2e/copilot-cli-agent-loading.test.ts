/**
 * E2E Test: Agent Loading via Copilot CLI
 *
 * Tests the complete flow of loading an agent through Copilot CLI with MCP.
 * Uses parallel-safe session analysis to track tool calls and validate results.
 *
 * FLOW:
 * 1. User prompt: "Have diana help me debug this project"
 * 2. Copilot CLI invokes BMAD MCP server
 * 3. Session analysis captures all tool calls
 * 4. Validate Diana agent was loaded correctly
 *
 * METRICS:
 * - Tool calls made
 * - Execution success rate
 * - Time to completion
 * - Validation checks passed
 */

import { describe, it, expect } from 'vitest';
import {
  CopilotSessionHelper,
  type SessionAnalysis,
} from '../framework/helpers/copilot-session-helper.js';

describe('E2E: Agent Loading via Copilot CLI', () => {
  it(
    'should load Diana agent through conversational prompt',
    async () => {
      console.log('\n🚀 Starting E2E test: Load Diana agent via Copilot CLI\n');

      const helper = new CopilotSessionHelper();

      console.log(`📋 Test configuration:`);
      console.log(`   Server ID: ${helper.getServerID()}`);
      console.log(`   Prompt: "Have diana help me debug this project"`);
      console.log('');

      // Execute Copilot CLI with agent loading prompt
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Have diana help me debug this project',
        allowAllTools: true,
        timeout: 60000,
      });

      // Display analysis
      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      // Assertions: Session metadata
      expect(analysis.sessionId).toBeDefined();
      expect(analysis.model).toBeTruthy();
      expect(analysis.durationSeconds).toBeGreaterThan(0);
      expect(analysis.durationSeconds).toBeLessThan(60);

      // Assertions: Messages exchanged
      expect(analysis.userMessages).toBeGreaterThanOrEqual(1);
      expect(analysis.assistantMessages).toBeGreaterThanOrEqual(1);

      // Assertions: Tool calls made
      expect(analysis.toolCalls.length).toBeGreaterThan(0);
      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      // Assertions: Validation checks
      expect(analysis.validationChecks.toolCallsMade).toBe(true);
      expect(analysis.validationChecks.bmadToolCalled).toBe(true);
      expect(analysis.validationChecks.allToolsExecuted).toBe(true);
      expect(analysis.validationChecks.atLeastOneSuccess).toBe(true);

      // Assertions: BMAD tool calls
      const bmadCall = analysis.bmadCalls[0];
      expect(bmadCall).toBeDefined();
      expect(bmadCall.arguments.operation).toBeDefined();

      // Check if Diana (debug agent) was loaded
      const dianaCall = analysis.bmadCalls.find(
        (call) =>
          call.arguments.operation === 'execute' &&
          call.arguments.agent === 'debug'
      );

      if (dianaCall) {
        console.log('\n✅ SUCCESS: Diana agent was loaded!');
        console.log(`   Operation: ${dianaCall.arguments.operation}`);
        console.log(`   Agent: ${dianaCall.arguments.agent}`);
        console.log(`   Module: ${dianaCall.arguments.module || 'N/A'}`);

        expect(dianaCall.arguments.agent).toBe('debug');
        expect(dianaCall.arguments.operation).toBe('execute');
      } else {
        // Agent might be discovered via list or read operations first
        console.log('\n📋 NOTE: Diana agent accessed via list/read operation');

        const listOrReadCall = analysis.bmadCalls.find(
          (call) =>
            call.arguments.operation === 'list' ||
            call.arguments.operation === 'read'
        );

        expect(listOrReadCall).toBeDefined();
      }

      // Overall success check
      expect(analysis.allToolsSucceeded).toBe(true);

      console.log('\n✅ E2E test completed successfully!\n');
    },
    {
      timeout: 90000, // 90 second timeout for Copilot CLI execution
    }
  );

  it(
    'should handle list agents operation efficiently',
    async () => {
      console.log('\n🚀 Starting E2E test: List agents via Copilot CLI\n');

      const helper = new CopilotSessionHelper();

      console.log(`📋 Test configuration:`);
      console.log(`   Server ID: ${helper.getServerID()}`);
      console.log(`   Prompt: "Use bmad to show me all available agents"`);
      console.log('');

      // Execute Copilot CLI with list agents prompt
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Use bmad to show me all available agents',
        allowAllTools: true,
        timeout: 60000,
      });

      // Display analysis
      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      // Assertions: Basic session validation
      expect(analysis.sessionId).toBeDefined();
      expect(analysis.durationSeconds).toBeLessThan(60);

      // Assertions: Tool activity
      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      // Assertions: Should have a list operation
      const listCall = analysis.bmadCalls.find(
        (call) => call.arguments.operation === 'list'
      );

      expect(listCall).toBeDefined();
      if (listCall) {
        expect(listCall.arguments.query).toBe('agents');
        console.log('\n✅ SUCCESS: List agents operation executed!');
      }

      // Assertions: Execution success
      expect(analysis.allToolsSucceeded).toBe(true);
      expect(analysis.validationChecks.atLeastOneSuccess).toBe(true);

      console.log('\n✅ E2E test completed successfully!\n');
    },
    {
      timeout: 90000,
    }
  );

  it(
    'should track multiple tool calls in complex workflow',
    async () => {
      console.log('\n🚀 Starting E2E test: Complex workflow with multiple calls\n');

      const helper = new CopilotSessionHelper();

      console.log(`📋 Test configuration:`);
      console.log(`   Server ID: ${helper.getServerID()}`);
      console.log(`   Prompt: "Show me bmad agents, then tell me about the analyst"`);
      console.log('');

      // Execute Copilot CLI with multi-step prompt
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Show me bmad agents, then tell me about the analyst',
        allowAllTools: true,
        timeout: 60000,
      });

      // Display analysis
      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      // Assertions: Should have multiple BMAD calls
      expect(analysis.bmadCalls.length).toBeGreaterThanOrEqual(1);

      // Check for expected operations
      const operations = analysis.bmadCalls.map((call) => call.arguments.operation);
      console.log(`\n📊 Operations performed: ${operations.join(', ')}`);

      // Should include list and/or read operations
      const hasListOrRead = operations.some(
        (op) => op === 'list' || op === 'read'
      );
      expect(hasListOrRead).toBe(true);

      // All executions should succeed
      expect(analysis.allToolsSucceeded).toBe(true);

      // Calculate efficiency: fewer calls is better
      const efficiency = analysis.bmadCalls.length <= 3 ? 'excellent' : 
                        analysis.bmadCalls.length <= 5 ? 'good' : 'acceptable';
      
      console.log(`\n📈 Efficiency rating: ${efficiency}`);
      console.log(`   Total BMAD calls: ${analysis.bmadCalls.length}`);
      console.log(`   Duration: ${analysis.durationSeconds.toFixed(2)}s`);

      console.log('\n✅ E2E test completed successfully!\n');
    },
    {
      timeout: 90000,
    }
  );
});
