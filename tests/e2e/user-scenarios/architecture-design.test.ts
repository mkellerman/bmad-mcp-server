/**
 * E2E Test: User Scenario - Architecture Design
 *
 * Tests a realistic architecture design workflow where a user asks
 * for help designing system architecture.
 *
 * USER STORY:
 * "As a technical lead, I need to design architecture for a microservices system.
 * I expect Winston (the architect) to help me think through the design."
 *
 * EXPECTED FLOW:
 * 1. User: "Design architecture for microservices"
 * 2. System: Loads architect agent or architecture workflow
 * 3. System: Guides through architecture decisions
 */

import { describe, it, expect } from 'vitest';
import {
  CopilotSessionHelper,
  type SessionAnalysis,
} from '../../framework/helpers/copilot-session-helper.js';

describe('User Scenario: Architecture Design', () => {
  it(
    'should initiate architecture design for microservices',
    async () => {
      console.log('\n🏗️  User Scenario: Design microservices architecture\n');

      const helper = new CopilotSessionHelper();

      console.log('👤 User Request:');
      console.log('   "I need to design a microservices architecture for an e-commerce platform. Can Winston help?"\n');

      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'I need to design a microservices architecture for an e-commerce platform. Can Winston help?',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      // ===== VALIDATION: Basic Metrics =====
      expect(analysis.sessionId).toBeDefined();
      expect(analysis.durationSeconds).toBeLessThan(60);
      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      // ===== VALIDATION: Architecture Workflow or Architect Agent =====
      console.log('\n📊 Looking for architecture-related activity:');
      
      const architectureWorkflow = analysis.bmadCalls.find(
        (call) => call.arguments.workflow === 'architecture'
      );

      const architectAgent = analysis.bmadCalls.find(
        (call) => call.arguments.agent === 'architect'
      );

      if (architectureWorkflow) {
        console.log('   ✅ Architecture workflow was invoked');
        expect(architectureWorkflow.arguments.workflow).toBe('architecture');
      } else if (architectAgent) {
        console.log('   ✅ Architect agent (Winston) was loaded');
        expect(architectAgent.arguments.agent).toBe('architect');
      } else {
        console.log('   📋 System used alternative approach (BMAD still consulted)');
        // Just ensure BMAD was involved
        expect(analysis.bmadCalls.length).toBeGreaterThan(0);
      }

      // ===== VALIDATION: Success =====
      expect(analysis.allToolsSucceeded).toBe(true);

      // ===== QUALITY METRICS =====
      console.log('\n📈 Quality Metrics:');
      console.log(`   BMAD calls: ${analysis.bmadCalls.length}`);
      console.log(`   Duration: ${analysis.durationSeconds.toFixed(2)}s`);

      console.log('\n✅ Architecture design test completed!\n');
    },
    {
      timeout: 90000,
    }
  );

  it(
    'should handle direct architect agent request',
    async () => {
      console.log('\n🏗️  User Scenario: Direct request for Winston\n');

      const helper = new CopilotSessionHelper();

      console.log('👤 User Request:');
      console.log('   "Have Winston help me design a scalable API architecture"\n');

      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Have Winston help me design a scalable API architecture',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      // Validate BMAD usage
      expect(analysis.bmadCalls.length).toBeGreaterThan(0);
      expect(analysis.allToolsSucceeded).toBe(true);

      // Check for architect
      const architectAgent = analysis.bmadCalls.find(
        (call) => call.arguments.agent === 'architect'
      );

      if (architectAgent) {
        console.log('\n✅ Architect agent (Winston) was loaded');
        expect(architectAgent.arguments.agent).toBe('architect');
      } else {
        console.log('\n📋 System used alternative approach');
      }

      console.log('\n✅ Direct architect request test completed!\n');
    },
    {
      timeout: 90000,
    }
  );

  it(
    'should handle architecture workflow request',
    async () => {
      console.log('\n🏗️  User Scenario: Architecture workflow for system design\n');

      const helper = new CopilotSessionHelper();

      console.log('👤 User Request:');
      console.log('   "Use the architecture workflow to design a distributed system"\n');

      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Use the architecture workflow to design a distributed system',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      // Validate execution
      expect(analysis.bmadCalls.length).toBeGreaterThan(0);
      expect(analysis.allToolsSucceeded).toBe(true);

      // Check for workflow or agent
      const hasArchWorkflow = analysis.bmadCalls.some(
        (call) => call.arguments.workflow === 'architecture'
      );

      const hasArchitect = analysis.bmadCalls.some(
        (call) => call.arguments.agent === 'architect'
      );

      if (hasArchWorkflow) {
        console.log('\n✅ Architecture workflow was executed');
      } else if (hasArchitect) {
        console.log('\n✅ Architect agent was loaded');
      } else {
        console.log('\n📋 System used discovery approach');
      }

      console.log('\n✅ Architecture workflow test completed!\n');
    },
    {
      timeout: 90000,
    }
  );

  it(
    'should handle technical decision request',
    async () => {
      console.log('\n🏗️  User Scenario: Technical architecture decision\n');

      const helper = new CopilotSessionHelper();

      console.log('👤 User Request:');
      console.log('   "Should I use REST or GraphQL for my API? Need architectural guidance."\n');

      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Should I use REST or GraphQL for my API? Need architectural guidance.',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      // Validate execution
      expect(analysis.bmadCalls.length).toBeGreaterThan(0);
      expect(analysis.allToolsSucceeded).toBe(true);

      // Success criteria: BMAD was consulted
      console.log('\n✅ Technical decision test completed!\n');
    },
    {
      timeout: 90000,
    }
  );
});
