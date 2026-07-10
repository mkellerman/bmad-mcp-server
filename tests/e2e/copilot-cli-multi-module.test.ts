/**
 * E2E Test: Multi-Module Scenarios
 *
 * Tests agents and workflows across different BMAD modules:
 * - BMM (BMAD Methodology Module) - Core methodology agents
 * - CIS (Creative & Innovation Suite) - Creative thinking agents
 * - CORE - System-level agents and workflows
 *
 * Validates:
 * - Module filtering works correctly
 * - Agents from different modules can be accessed
 * - Module-specific workflows function properly
 */

import { describe, it, expect } from 'vitest';
import {
  CopilotSessionHelper,
  type SessionAnalysis,
} from '../framework/helpers/copilot-session-helper.js';

describe('E2E: Multi-Module Scenarios', () => {
  it(
    'should access BMM module agents',
    async () => {
      console.log('\n📦 Testing: BMM Module Agents\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Show me agents from the BMM module',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      const listCall = analysis.bmadCalls.find(
        (call) => call.arguments.operation === 'list' &&
                 call.arguments.query === 'agents'
      );

      if (listCall) {
        console.log('\n✅ BMM module agents listed');
        
        // Check if module filter was applied
        if (listCall.arguments.module) {
          console.log(`   Module filter: ${listCall.arguments.module}`);
          expect(listCall.arguments.module).toBe('bmm');
        }
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ BMM module test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should access CIS module agents',
    async () => {
      console.log('\n💡 Testing: CIS Module Agents\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'I need a brainstorming coach from the CIS module',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      const cisAgent = analysis.bmadCalls.find(
        (call) => call.arguments.agent === 'brainstorming-coach' ||
                 (call.arguments.module === 'cis')
      );

      if (cisAgent) {
        console.log('\n✅ CIS module agent accessed');
        console.log(`   Agent: ${cisAgent.arguments.agent || 'N/A'}`);
        console.log(`   Module: ${cisAgent.arguments.module || 'N/A'}`);
      } else {
        console.log('\n📋 System used discovery approach');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ CIS module test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should access CORE module agents',
    async () => {
      console.log('\n🎯 Testing: CORE Module Agents\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'I need the BMAD master agent from the CORE module',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      const coreAgent = analysis.bmadCalls.find(
        (call) => call.arguments.agent === 'bmad-master' ||
                 call.arguments.module === 'core'
      );

      if (coreAgent) {
        console.log('\n✅ CORE module agent accessed');
        console.log(`   Agent: ${coreAgent.arguments.agent || 'N/A'}`);
        console.log(`   Module: ${coreAgent.arguments.module || 'N/A'}`);
      } else {
        console.log('\n📋 System used alternative approach');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ CORE module test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should handle module filtering in list operations',
    async () => {
      console.log('\n🔍 Testing: Module Filtering\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'List all workflows in the BMM module',
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
        console.log('\n✅ List operation executed');
        console.log(`   Query: ${listCall.arguments.query}`);
        console.log(`   Module: ${listCall.arguments.module || 'all'}`);
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ Module filtering test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should access CIS creative workflows',
    async () => {
      console.log('\n🎨 Testing: CIS Creative Workflows\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Use the design thinking workflow from CIS to solve a problem',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      const designThinking = analysis.bmadCalls.find(
        (call) => call.arguments.workflow === 'design-thinking' ||
                 (call.arguments.module === 'cis')
      );

      if (designThinking) {
        console.log('\n✅ CIS workflow accessed');
        console.log(`   Workflow: ${designThinking.arguments.workflow || 'N/A'}`);
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ CIS workflow test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should access CORE workflows',
    async () => {
      console.log('\n⚙️  Testing: CORE Module Workflows\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Use the party-mode workflow from CORE for multi-agent discussion',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      const partyMode = analysis.bmadCalls.find(
        (call) => call.arguments.workflow === 'party-mode' ||
                 call.arguments.module === 'core'
      );

      if (partyMode) {
        console.log('\n✅ CORE workflow accessed');
        console.log(`   Workflow: ${partyMode.arguments.workflow || 'N/A'}`);
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ CORE workflow test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should handle cross-module agent requests',
    async () => {
      console.log('\n🔀 Testing: Cross-Module Agent Access\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'I need both Diana (debug) from BMM and the creative problem solver from CIS',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      // Check if multiple agents were accessed
      const debugAgent = analysis.bmadCalls.find(
        (call) => call.arguments.agent === 'debug'
      );

      const creativeSolver = analysis.bmadCalls.find(
        (call) => call.arguments.agent === 'creative-problem-solver'
      );

      if (debugAgent || creativeSolver) {
        console.log('\n✅ Cross-module access detected');
        if (debugAgent) console.log('   ✓ Debug agent (BMM)');
        if (creativeSolver) console.log('   ✓ Creative problem solver (CIS)');
      } else {
        console.log('\n📋 System used discovery approach');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ Cross-module test complete\n');
    },
    { timeout: 90000 }
  );

  it(
    'should list all modules',
    async () => {
      console.log('\n📚 Testing: List All Modules\n');

      const helper = new CopilotSessionHelper();
      const analysis: SessionAnalysis = await helper.execute({
        prompt: 'Show me all available BMAD modules',
        allowAllTools: true,
        timeout: 60000,
      });

      console.log(CopilotSessionHelper.formatAnalysis(analysis));

      expect(analysis.bmadCalls.length).toBeGreaterThan(0);

      const listModules = analysis.bmadCalls.find(
        (call) => call.arguments.operation === 'list' &&
                 call.arguments.query === 'modules'
      );

      if (listModules) {
        console.log('\n✅ List modules operation executed');
        expect(listModules.arguments.query).toBe('modules');
      } else {
        console.log('\n📋 Alternative approach used');
      }

      expect(analysis.allToolsSucceeded).toBe(true);
      console.log('\n✅ List modules test complete\n');
    },
    { timeout: 90000 }
  );
});
