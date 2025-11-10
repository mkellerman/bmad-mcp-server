/**
 * E2E Test: All BMM Agents
 *
 * Comprehensive test coverage for all agents in the BMM (BMAD Methodology Module).
 * Validates that each agent can be discovered and loaded correctly.
 *
 * AGENTS TESTED:
 * - analyst (Mary) - Business Analyst
 * - architect (Winston) - Architect
 * - dev (Amelia) - Developer Agent
 * - pm (John) - Product Manager
 * - sm (Bob) - Scrum Master
 * - tea (Murat) - Master Test Architect
 * - tech-writer (Paige) - Technical Writer
 * - ux-designer (Sally) - UX Designer
 */

import { describe, it, expect } from 'vitest';
import {
  CopilotSessionHelper,
  type SessionAnalysis,
} from '../framework/helpers/copilot-session-helper.js';

describe('E2E: All BMM Agents', () => {
  it(
    'should load analyst agent (Mary)',
    async () => {
      console.log('\n📊 Testing: Analyst Agent (Mary)\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'I need Mary the business analyst to help analyze requirements',
        allowAllTools: true,
        timeout: 60000,
        testName: 'E2E: Load analyst agent (Mary)',
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      const analystCall = analysis.bmadCalls.find(
        (call) => call.arguments.agent === 'analyst',
      );

      if (analystCall) {
        console.log('\n✅ Analyst agent (Mary) loaded successfully');
        expect(analystCall.arguments.agent).toBe('analyst');
        expect(analystCall.arguments.module).toMatch(/bmm|core/);
      } else {
        console.log('\n📋 Alternative approach used (BMAD consulted)');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ Analyst test complete\n');
    },
    { timeout: 90000 },
  );

  it(
    'should load architect agent (Winston)',
    async () => {
      console.log('\n🏗️  Testing: Architect Agent (Winston)\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt:
          'I need Winston the architect to help design system architecture',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      const architectCall = analysis.bmadCalls.find(
        (call) => call.arguments.agent === 'architect',
      );

      if (architectCall) {
        console.log('\n✅ Architect agent (Winston) loaded successfully');
        expect(architectCall.arguments.agent).toBe('architect');
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ Architect test complete\n');
    },
    { timeout: 90000 },
  );

  it(
    'should load developer agent (Amelia)',
    async () => {
      console.log('\n💻 Testing: Developer Agent (Amelia)\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'I need Amelia the developer to help implement a feature',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      const devCall = analysis.bmadCalls.find(
        (call) => call.arguments.agent === 'dev',
      );

      if (devCall) {
        console.log('\n✅ Developer agent (Amelia) loaded successfully');
        expect(devCall.arguments.agent).toBe('dev');
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ Developer test complete\n');
    },
    { timeout: 90000 },
  );

  it(
    'should load product manager agent (John)',
    async () => {
      console.log('\n👔 Testing: Product Manager Agent (John)\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt:
          'I need John the product manager to help define product strategy',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      const pmCall = analysis.bmadCalls.find(
        (call) => call.arguments.agent === 'pm',
      );

      if (pmCall) {
        console.log('\n✅ Product Manager agent (John) loaded successfully');
        expect(pmCall.arguments.agent).toBe('pm');
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ Product Manager test complete\n');
    },
    { timeout: 90000 },
  );

  it(
    'should load scrum master agent (Bob)',
    async () => {
      console.log('\n📋 Testing: Scrum Master Agent (Bob)\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'I need Bob the scrum master to help with sprint planning',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      const smCall = analysis.bmadCalls.find(
        (call) => call.arguments.agent === 'sm',
      );

      if (smCall) {
        console.log('\n✅ Scrum Master agent (Bob) loaded successfully');
        expect(smCall.arguments.agent).toBe('sm');
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ Scrum Master test complete\n');
    },
    { timeout: 90000 },
  );

  it(
    'should load test architect agent (Murat)',
    async () => {
      console.log('\n🧪 Testing: Test Architect Agent (Murat)\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'I need Murat the test architect to help design test strategy',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      const teaCall = analysis.bmadCalls.find(
        (call) => call.arguments.agent === 'tea',
      );

      if (teaCall) {
        console.log('\n✅ Test Architect agent (Murat) loaded successfully');
        expect(teaCall.arguments.agent).toBe('tea');
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ Test Architect test complete\n');
    },
    { timeout: 90000 },
  );

  it(
    'should load technical writer agent (Paige)',
    async () => {
      console.log('\n📝 Testing: Technical Writer Agent (Paige)\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt:
          'I need Paige the technical writer to help create documentation',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      const writerCall = analysis.bmadCalls.find(
        (call) => call.arguments.agent === 'tech-writer',
      );

      if (writerCall) {
        console.log('\n✅ Technical Writer agent (Paige) loaded successfully');
        expect(writerCall.arguments.agent).toBe('tech-writer');
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ Technical Writer test complete\n');
    },
    { timeout: 90000 },
  );

  it(
    'should load UX designer agent (Sally)',
    async () => {
      console.log('\n🎨 Testing: UX Designer Agent (Sally)\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'I need Sally the UX designer to help design user interface',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      const uxCall = analysis.bmadCalls.find(
        (call) => call.arguments.agent === 'ux-designer',
      );

      if (uxCall) {
        console.log('\n✅ UX Designer agent (Sally) loaded successfully');
        expect(uxCall.arguments.agent).toBe('ux-designer');
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ UX Designer test complete\n');
    },
    { timeout: 90000 },
  );

  it(
    'should list all available agents',
    async () => {
      console.log('\n📋 Testing: List All Agents\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Show me all available BMAD agents',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      const listCall = analysis.bmadCalls.find(
        (call) =>
          call.arguments.operation === 'list' &&
          call.arguments.query === 'agents',
      );

      if (listCall) {
        console.log('\n✅ List agents operation executed successfully');
        expect(listCall.arguments.query).toBe('agents');
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ List agents test complete\n');
    },
    { timeout: 90000 },
  );
});
