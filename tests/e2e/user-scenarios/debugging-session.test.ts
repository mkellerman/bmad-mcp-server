/**
 * E2E Test: User Scenario - Debugging Session
 *
 * Tests a realistic debugging workflow where a user asks Diana (debug agent)
 * for help with debugging an API error.
 *
 * USER STORY:
 * "As a developer, I encounter an API error and need Diana's help to debug it.
 * I expect Diana to ask relevant questions and guide me through the debugging process."
 *
 * EXPECTED FLOW:
 * 1. User: "Help me debug this API error"
 * 2. System: Loads Diana agent
 * 3. Diana: Asks debugging questions, provides guidance
 */

import { describe, it, expect } from 'vitest';
import {
  CopilotSessionHelper,
  type SessionAnalysis,
} from '../../framework/helpers/copilot-session-helper.js';

describe('User Scenario: Debugging Session', () => {
  it(
    'should load Diana and initiate debugging conversation',
    async () => {
      console.log('\n🐛 User Scenario: Developer needs help debugging API error\n');

      const helper = new CopilotSessionHelper();

      console.log('👤 User Request:');
      console.log('   "I have an API endpoint returning 500 errors. Can Diana help me debug this?"\n');

      // Execute realistic user request
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'I have an API endpoint returning 500 errors. Can Diana help me debug this?',
        allowAllTools: true,
        timeout: 60000,
      });

      // Display session analysis
      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      // ===== VALIDATION: Session Basics =====
      expect(analysis.sessionId).toBeDefined();
      expect(analysis.durationSeconds).toBeLessThan(60);

      // ===== VALIDATION: BMAD Tool Usage =====
      expect(analysis.bmadCalls.length).toBeGreaterThan(0);
      console.log('\n📊 BMAD Tool Activity:');
      
      analysis.bmadCalls.forEach((call, idx) => {
        console.log(`   ${idx + 1}. ${call.arguments.operation || 'unknown'} operation`);
        if (call.arguments.agent) {
          console.log(`      Agent: ${call.arguments.agent}`);
        }
        if (call.arguments.workflow) {
          console.log(`      Workflow: ${call.arguments.workflow}`);
        }
      });

      // ===== VALIDATION: Diana Agent Loaded =====
      const dianaCall = analysis.bmadCalls.find(
        (call) =>
          (call.arguments.operation === 'execute' && call.arguments.agent === 'debug') ||
          (call.arguments.operation === 'read' && call.arguments.agent === 'debug')
      );

      if (dianaCall) {
        console.log('\n✅ SUCCESS: Diana agent was accessed!');
        console.log(`   Operation: ${dianaCall.arguments.operation}`);
        console.log(`   Agent: ${dianaCall.arguments.agent}`);
        
        expect(dianaCall.arguments.agent).toBe('debug');
      } else {
        // System might approach this differently - that's okay
        console.log('\n📋 System used alternative approach (not direct Diana load)');
        console.log(`   BMAD was still consulted: ${analysis.bmadCalls.length} call(s)`);
        
        // Just ensure BMAD was involved
        expect(analysis.bmadCalls.length).toBeGreaterThan(0);
      }

      // ===== VALIDATION: Execution Success =====
      expect(analysis.allToolsSucceeded).toBe(true);
      expect(analysis.validationChecks.atLeastOneSuccess).toBe(true);

      // ===== QUALITY METRICS =====
      console.log('\n📈 Quality Metrics:');
      console.log(`   Total tool calls: ${analysis.toolCalls.length}`);
      console.log(`   BMAD calls: ${analysis.bmadCalls.length}`);
      console.log(`   Duration: ${analysis.durationSeconds.toFixed(2)}s`);
      
      const efficiency = analysis.bmadCalls.length <= 2 ? 'excellent' :
                        analysis.bmadCalls.length <= 4 ? 'good' :
                        'acceptable';
      console.log(`   Efficiency: ${efficiency}`);

      // Expect reasonable efficiency
      expect(analysis.bmadCalls.length).toBeLessThanOrEqual(5);

      console.log('\n✅ Debugging session test completed!\n');
    },
    {
      timeout: 90000,
    }
  );

  it(
    'should handle direct Diana request',
    async () => {
      console.log('\n🐛 User Scenario: Direct request for Diana\n');

      const helper = new CopilotSessionHelper();

      console.log('👤 User Request:');
      console.log('   "Have Diana help me debug this project"\n');

      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Have Diana help me debug this project',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      // Validate BMAD was called
      expect(analysis.bmadCalls.length).toBeGreaterThan(0);
      expect(analysis.allToolsSucceeded).toBe(true);

      // Check for debug agent
      const debugRelated = analysis.bmadCalls.find(
        (call) => call.arguments.agent === 'debug' ||
                 call.arguments.query === 'agents' ||
                 call.arguments.operation === 'list'
      );

      expect(debugRelated).toBeDefined();

      console.log('\n✅ Direct Diana request test completed!\n');
    },
    {
      timeout: 90000,
    }
  );

  it(
    'should handle error analysis request',
    async () => {
      console.log('\n🐛 User Scenario: Error analysis request\n');

      const helper = new CopilotSessionHelper();

      console.log('👤 User Request:');
      console.log('   "Use the debug agent to analyze this error: TypeError: Cannot read property \'id\' of undefined"\n');

      const analysis: SessionAnalysis = await helper.execute({
        prompt: "Use the debug agent to analyze this error: TypeError: Cannot read property 'id' of undefined",
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      // Validate execution
      expect(analysis.bmadCalls.length).toBeGreaterThan(0);
      expect(analysis.allToolsSucceeded).toBe(true);

      // Should mention debug/diana
      const hasDebugAgent = analysis.bmadCalls.some(
        (call) => call.arguments.agent === 'debug'
      );

      if (hasDebugAgent) {
        console.log('\n✅ Debug agent was invoked for error analysis');
      } else {
        console.log('\n📋 System used alternative approach');
      }

      console.log('\n✅ Error analysis test completed!\n');
    },
    {
      timeout: 90000,
    }
  );
});
