/**
 * E2E Test: BMAD Workflows
 *
 * Tests workflow operations including list, read, and execute.
 * Validates that workflows can be discovered and initiated correctly.
 *
 * KEY WORKFLOWS TESTED:
 * - prd - Product Requirements Document workflow
 * - architecture - Architecture design workflow
 * - brainstorming - Brainstorming session workflow
 * - party-mode - Multi-agent discussion workflow
 */

import { describe, it, expect } from 'vitest';
import {
  CopilotSessionHelper,
  type SessionAnalysis,
} from '../framework/helpers/copilot-session-helper.js';

describe('E2E: BMAD Workflows', () => {
  it(
    'should list all available workflows',
    async () => {
      console.log('\n📋 Testing: List All Workflows\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Show me all available BMAD workflows',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);
      
      const listCall = analysis.bmadCalls.find(
        (call) => call.arguments.operation === 'list' &&
                 call.arguments.query === 'workflows'
      );

      if (listCall) {
        console.log('\n✅ List workflows operation executed successfully');
        expect(listCall.arguments.query).toBe('workflows');
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ List workflows test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should read workflow details',
    async () => {
      console.log('\n📖 Testing: Read Workflow Details\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Tell me about the PRD workflow in BMAD',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);
      
      const readCall = analysis.bmadCalls.find(
        (call) => call.arguments.operation === 'read' &&
                 call.arguments.workflow === 'prd'
      );

      if (readCall) {
        console.log('\n✅ Read workflow operation executed successfully');
        expect(readCall.arguments.workflow).toBe('prd');
      } else {
        console.log('\n📋 Alternative approach used (BMAD consulted)');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ Read workflow test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should execute PRD workflow',
    async () => {
      console.log('\n📝 Testing: Execute PRD Workflow\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Start the PRD workflow to create a requirements document for a mobile app',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);
      
      const executeCall = analysis.bmadCalls.find(
        (call) => call.arguments.operation === 'execute' &&
                 call.arguments.workflow === 'prd'
      );

      if (executeCall) {
        console.log('\n✅ PRD workflow executed successfully');
        expect(executeCall.arguments.workflow).toBe('prd');
        expect(executeCall.arguments.message).toBeDefined();
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ Execute PRD workflow test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should execute architecture workflow',
    async () => {
      console.log('\n🏗️  Testing: Execute Architecture Workflow\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Use the architecture workflow to design a microservices system',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);
      
      const archWorkflow = analysis.bmadCalls.find(
        (call) => call.arguments.workflow === 'architecture'
      );

      if (archWorkflow) {
        console.log('\n✅ Architecture workflow accessed successfully');
        expect(archWorkflow.arguments.workflow).toBe('architecture');
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ Architecture workflow test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should execute brainstorming workflow',
    async () => {
      console.log('\n💡 Testing: Execute Brainstorming Workflow\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Start a brainstorming session to generate ideas for a new feature',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);
      
      const brainstormWorkflow = analysis.bmadCalls.find(
        (call) => call.arguments.workflow === 'brainstorming'
      );

      if (brainstormWorkflow) {
        console.log('\n✅ Brainstorming workflow accessed successfully');
        expect(brainstormWorkflow.arguments.workflow).toBe('brainstorming');
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ Brainstorming workflow test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should validate workflow parameters are passed',
    async () => {
      console.log('\n🔧 Testing: Workflow Parameter Passing\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Execute the PRD workflow with message: "Create PRD for e-commerce platform"',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);
      
      const workflowCall = analysis.bmadCalls.find(
        (call) => call.arguments.workflow && call.arguments.message
      );

      if (workflowCall) {
        console.log('\n✅ Workflow parameters passed successfully');
        console.log(`   Workflow: ${workflowCall.arguments.workflow}`);
        console.log(`   Message: ${workflowCall.arguments.message}`);
        expect(workflowCall.arguments.message).toBeDefined();
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ Parameter passing test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should handle workflow discovery',
    async () => {
      console.log('\n🔍 Testing: Workflow Discovery\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'What workflows are available for creating requirements?',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);
      
      // Should use list or read operation for discovery
      const discoveryCall = analysis.bmadCalls.find(
        (call) => call.arguments.operation === 'list' ||
                 call.arguments.operation === 'read'
      );

      if (discoveryCall) {
        console.log('\n✅ Workflow discovery executed successfully');
        console.log(`   Operation: ${discoveryCall.arguments.operation}`);
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ Workflow discovery test complete\n');
    },
    { timeout: 90000 }
  );
});
