/**
 * Tests for ambiguous response handling
 *
 * Verifies that when multiple agents or workflows match without a module filter,
 * the system returns an ambiguous result with guidance for the LLM.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { BMADEngine } from '../../src/core/bmad-engine.js';
import type {
  AmbiguousAgentResult,
  AmbiguousWorkflowResult,
} from '../../src/core/bmad-engine.js';
import { join } from 'path';

describe('Ambiguous Response Handling', () => {
  let engine: BMADEngine;
  const testFixtures = join(process.cwd(), 'tests/fixtures/bmad');

  beforeAll(async () => {
    // Use local mode for isolated testing
    engine = new BMADEngine(testFixtures, [], 'local');
    await engine.initialize();
  });

  describe('Agent Execution', () => {
    it('should return normal result when module filter is provided', async () => {
      const result = await engine.executeAgent({
        agent: 'debug',
        module: 'bmm',
        message: 'Test message',
      });

      expect(result.success).toBe(true);
      expect('ambiguous' in result).toBe(false);
    });

    it('should return ambiguous result when multiple agents match without module filter', async () => {
      // First verify that 'debug' agent exists in multiple modules
      const agentsResult = await engine.listAgents();
      const agents = (agentsResult.data || []) as Array<{
        name: string;
        module?: string;
      }>;
      const debugAgents = agents.filter((a) => a.name === 'debug');

      if (debugAgents.length > 1) {
        const result = await engine.executeAgent({
          agent: 'debug',
          message: 'Test message',
        });

        expect(result.success).toBe(true);
        expect('ambiguous' in result && result.ambiguous).toBe(true);

        const ambiguousResult = result as AmbiguousAgentResult;
        expect(ambiguousResult.type).toBe('agent');
        expect(ambiguousResult.matches).toBeDefined();
        expect(ambiguousResult.matches.length).toBeGreaterThan(1);

        // Verify match structure
        const match = ambiguousResult.matches[0];
        expect(match.module).toBeDefined();
        expect(match.agentName).toBe('debug');
        expect(match.agentDisplayName).toBeDefined();
        expect(match.agentTitle).toBeDefined();
        expect(match.role).toBeDefined();
        expect(match.description).toBeDefined();
        expect(match.action).toContain('bmad({');
        expect(match.action).toContain('operation: "execute"');
        expect(match.action).toContain('module:');

        // Verify formatted text includes guidance
        expect(ambiguousResult.text).toContain('Ambiguous Request');
        expect(ambiguousResult.text).toContain('Multiple Agents Match');
        expect(ambiguousResult.text).toContain('LLM Decision Guidance');
        expect(ambiguousResult.text).toContain('95% confident');
      }
    });

    it('should return error for non-existent agent', async () => {
      const result = await engine.executeAgent({
        agent: 'non-existent-agent-xyz',
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Workflow Execution', () => {
    it('should return normal result when module filter is provided', async () => {
      const result = await engine.executeWorkflow({
        workflow: 'party-mode',
        module: 'core',
        message: 'Start party mode',
      });

      expect(result.success).toBe(true);
      expect('ambiguous' in result).toBe(false);
    });

    it('should return ambiguous result when multiple workflows match without module filter', async () => {
      // First verify that some workflow exists in multiple modules
      const workflowsResult = await engine.listWorkflows();
      const workflows = (workflowsResult.data || []) as Array<{
        name: string;
        module?: string;
      }>;

      // Count workflow occurrences
      const workflowCounts = new Map<string, number>();
      for (const w of workflows) {
        workflowCounts.set(w.name, (workflowCounts.get(w.name) || 0) + 1);
      }

      // Find a workflow with duplicates
      const duplicateWorkflow = Array.from(workflowCounts.entries()).find(
        ([, count]) => count > 1,
      );

      if (duplicateWorkflow) {
        const [workflowName] = duplicateWorkflow;
        const result = await engine.executeWorkflow({
          workflow: workflowName,
          message: 'Test message',
        });

        expect(result.success).toBe(true);
        expect('ambiguous' in result && result.ambiguous).toBe(true);

        const ambiguousResult = result as AmbiguousWorkflowResult;
        expect(ambiguousResult.type).toBe('workflow');
        expect(ambiguousResult.matches).toBeDefined();
        expect(ambiguousResult.matches.length).toBeGreaterThan(1);

        // Verify match structure
        const match = ambiguousResult.matches[0];
        expect(match.module).toBeDefined();
        expect(match.agentName).toBeDefined();
        expect(match.agentDisplayName).toBeDefined();
        expect(match.agentTitle).toBeDefined();
        expect(match.workflow).toBe(workflowName);
        expect(match.description).toBeDefined();
        expect(match.action).toContain('bmad({');
        expect(match.action).toContain('operation: "execute"');
        expect(match.action).toContain('workflow:');
        expect(match.action).toContain('module:');

        // Verify formatted text includes guidance
        expect(ambiguousResult.text).toContain('Ambiguous Request');
        expect(ambiguousResult.text).toContain('Multiple Workflows Match');
        expect(ambiguousResult.text).toContain('LLM Decision Guidance');
        expect(ambiguousResult.text).toContain('95% confident');
      }
    });

    it('should return error for non-existent workflow', async () => {
      const result = await engine.executeWorkflow({
        workflow: 'non-existent-workflow-xyz',
        message: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Response Format Validation', () => {
    it('should format ambiguous agent response with all required fields', async () => {
      // Find a duplicate agent
      const agentsResult = await engine.listAgents();
      const agents = (agentsResult.data || []) as Array<{
        name: string;
        module?: string;
      }>;
      const agentCounts = new Map<string, number>();
      for (const a of agents) {
        agentCounts.set(a.name, (agentCounts.get(a.name) || 0) + 1);
      }
      const duplicateAgent = Array.from(agentCounts.entries()).find(
        ([, count]) => count > 1,
      );

      if (duplicateAgent) {
        const [agentName] = duplicateAgent;
        const result = (await engine.executeAgent({
          agent: agentName,
          message: 'Test',
        })) as AmbiguousAgentResult;

        if ('ambiguous' in result && result.ambiguous) {
          // Verify each match has the composite key format module:agent
          for (const match of result.matches) {
            expect(match.key).toMatch(/^[\w-]+:[\w-]+$/);
            expect(match.key).toContain(match.module);
            expect(match.key).toContain(match.agentName);
          }
        }
      }
    });

    it('should format ambiguous workflow response with all required fields', async () => {
      // Find a duplicate workflow
      const workflowsResult = await engine.listWorkflows();
      const workflows = (workflowsResult.data || []) as Array<{
        name: string;
        module?: string;
      }>;
      const workflowCounts = new Map<string, number>();
      for (const w of workflows) {
        workflowCounts.set(w.name, (workflowCounts.get(w.name) || 0) + 1);
      }
      const duplicateWorkflow = Array.from(workflowCounts.entries()).find(
        ([, count]) => count > 1,
      );

      if (duplicateWorkflow) {
        const [workflowName] = duplicateWorkflow;
        const result = (await engine.executeWorkflow({
          workflow: workflowName,
          message: 'Test',
        })) as AmbiguousWorkflowResult;

        if ('ambiguous' in result && result.ambiguous) {
          // Verify each match has the composite key format module:agent:workflow
          for (const match of result.matches) {
            expect(match.key).toMatch(/^[\w-]+:[\w-]+:[\w-]+$/);
            expect(match.key).toContain(match.module);
            expect(match.key).toContain(match.agentName);
            expect(match.key).toContain(match.workflow);
          }
        }
      }
    });
  });
});
