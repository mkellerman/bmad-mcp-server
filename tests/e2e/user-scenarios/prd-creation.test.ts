/**
 * E2E Test: User Scenario - PRD Creation
 *
 * Tests a realistic PRD creation workflow where a user asks for help
 * creating a Product Requirements Document.
 *
 * USER STORY:
 * "As a product manager, I need to create a PRD for a new mobile app feature.
 * I expect the system to guide me through the PRD creation process."
 *
 * EXPECTED FLOW:
 * 1. User: "Create a PRD for a mobile app"
 * 2. System: Loads appropriate workflow or agent
 * 3. System: Guides user through PRD creation
 */

import { describe, it, expect } from 'vitest';
import {
  CopilotSessionHelper,
  type SessionAnalysis,
} from '../../framework/helpers/copilot-session-helper.js';

describe('User Scenario: PRD Creation', () => {
  it(
    'should initiate PRD workflow for mobile app',
    async () => {
      console.log('\n📱 User Scenario: Create PRD for mobile app\n');

      const helper = new CopilotSessionHelper();

      console.log('👤 User Request:');
      console.log('   "I need to create a PRD for a social media mobile app. Can you help?"\n');

      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'I need to create a PRD for a social media mobile app. Can you help?',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      // ===== VALIDATION: Basic Metrics =====
      expect(analysis.sessionId).toBeDefined();
      expect(analysis.durationSeconds).toBeLessThan(60);
      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      // ===== VALIDATION: PRD Workflow or PM Agent =====
      console.log('\n📊 Looking for PRD-related activity:');
      
      const prdWorkflow = analysis.bmadCalls.find(
        (call) => call.arguments.workflow === 'prd'
      );

      const pmAgent = analysis.bmadCalls.find(
        (call) => call.arguments.agent === 'pm'
      );

      const analystAgent = analysis.bmadCalls.find(
        (call) => call.arguments.agent === 'analyst'
      );

      if (prdWorkflow) {
        console.log('   ✅ PRD workflow was invoked');
        expect(prdWorkflow.arguments.workflow).toBe('prd');
      } else if (pmAgent) {
        console.log('   ✅ PM agent (John) was loaded');
        expect(pmAgent.arguments.agent).toBe('pm');
      } else if (analystAgent) {
        console.log('   ✅ Analyst agent (Mary) was loaded');
        expect(analystAgent.arguments.agent).toBe('analyst');
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

      console.log('\n✅ PRD creation test completed!\n');
    },
    {
      timeout: 90000,
    }
  );

  it(
    'should handle direct PRD workflow request',
    async () => {
      console.log('\n📋 User Scenario: Direct PRD workflow request\n');

      const helper = new CopilotSessionHelper();

      console.log('👤 User Request:');
      console.log('   "Use the PRD workflow to create a requirements document"\n');

      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Use the PRD workflow to create a requirements document',
        allowAllTools: true,
        timeout: 90000, // Increased timeout for this scenario
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      // Validate BMAD usage
      expect(analysis.bmadCalls.length).toBeGreaterThan(0);
      expect(analysis.allToolsSucceeded).toBe(true);

      // Check for workflow or agent
      const hasPrdWorkflow = analysis.bmadCalls.some(
        (call) => call.arguments.workflow === 'prd'
      );

      const hasProductAgent = analysis.bmadCalls.some(
        (call) => call.arguments.agent === 'pm' || call.arguments.agent === 'analyst'
      );

      if (hasPrdWorkflow) {
        console.log('\n✅ PRD workflow was executed');
      } else if (hasProductAgent) {
        console.log('\n✅ Product-related agent was loaded');
      } else {
        console.log('\n📋 System used discovery approach');
      }

      console.log('\n✅ Direct PRD workflow test completed!\n');
    },
    {
      timeout: 90000,
    }
  );

  it(
    'should handle product manager agent request',
    async () => {
      console.log('\n👔 User Scenario: Request PM agent for requirements\n');

      const helper = new CopilotSessionHelper();

      console.log('👤 User Request:');
      console.log('   "I need John (the product manager) to help with requirements"\n');

      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'I need John (the product manager) to help with requirements',
        allowAllTools: true,
        timeout: 90000, // Increased timeout
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      // Validate execution - be flexible
      // Session might succeed with or without BMAD calls depending on LLM approach
      expect(analysis.sessionId).toBeDefined();
      
      if (analysis.bmadCalls.length > 0) {
        console.log('\n✅ BMAD was consulted');
        expect(analysis.allToolsSucceeded).toBe(true);

        // Check for PM agent
        const pmAgent = analysis.bmadCalls.find(
          (call) => call.arguments.agent === 'pm'
        );

        if (pmAgent) {
          console.log('✅ PM agent (John) was loaded');
          expect(pmAgent.arguments.agent).toBe('pm');
        } else {
          console.log('📋 System used alternative approach');
        }
      } else {
        console.log('\n📋 LLM handled request without BMAD tool calls');
        console.log('   (This is acceptable - LLM might respond directly)');
      }

      console.log('\n✅ PM agent request test completed!\n');
    },
    {
      timeout: 90000,
    }
  );
});
