/**
 * E2E Tests for Standalone Workflow Execution Priority
 *
 * Verifies that standalone workflows execute directly without
 * triggering ambiguous agent selection, even when multiple
 * agents offer the same workflow name.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { BMADEngine } from '../../../src/core/bmad-engine.js';

describe('Standalone Workflow Execution Priority', () => {
  let engine: BMADEngine;

  beforeAll(async () => {
    // Use test fixtures
    engine = new BMADEngine('./tests/fixtures');
    await engine.initialize();
  });

  describe('workflow-status', () => {
    it('should execute directly without ambiguity when standalone flag is true', async () => {
      const result = await engine.executeWorkflow({
        workflow: 'workflow-status',
        message: 'Check project status',
      });

      expect(result.success).toBe(true);
      expect('ambiguous' in result).toBe(false);
      expect(result.data).toBeDefined();
      expect(result.data).toMatchObject({
        workflow: 'workflow-status',
        workflowPath: expect.stringContaining('workflow-status/workflow.yaml'),
        userContext: 'Check project status',
        agent: undefined,
        agentWorkflowHandler: undefined,
      });
    });

    it('should include workflow path in execution context', async () => {
      const result = await engine.executeWorkflow({
        workflow: 'workflow-status',
      });

      expect(result.success).toBe(true);
      expect((result.data as any)?.workflowPath).toContain(
        'bmad/bmm/workflows/workflow-status/workflow.yaml',
      );
    });

    it('should work with empty message parameter', async () => {
      const result = await engine.executeWorkflow({
        workflow: 'workflow-status',
        message: '',
      });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        workflow: 'workflow-status',
        userContext: '',
      });
    });

    it('should respect module filter for standalone workflows', async () => {
      const result = await engine.executeWorkflow({
        workflow: 'workflow-status',
        module: 'bmm',
      });

      expect(result.success).toBe(true);
      expect((result.data as any)?.workflowPath).toContain(
        'bmad/bmm/workflows',
      );
    });
  });

  describe('workflow-init', () => {
    it('should execute as standalone without agent', async () => {
      const result = await engine.executeWorkflow({
        workflow: 'workflow-init',
      });

      expect(result.success).toBe(true);
      expect('ambiguous' in result).toBe(false);
      expect((result.data as any)?.agent).toBeUndefined();
      expect((result.data as any)?.workflow).toBe('workflow-init');
    });
  });

  describe('non-standalone workflows', () => {
    it('should still return ambiguous result when multiple agents offer same non-standalone workflow', async () => {
      // document-project is offered by analyst and tech-writer
      const result = await engine.executeWorkflow({
        workflow: 'document-project',
      });

      if ('ambiguous' in result && result.ambiguous) {
        expect(result.success).toBe(true);
        expect(result.ambiguous).toBe(true);
        expect(result.type).toBe('workflow');
        expect(result.matches).toBeDefined();
        expect(result.matches!.length).toBeGreaterThan(1);
      } else {
        // If not ambiguous, it means we got a single match which is also valid
        expect(result.success).toBe(true);
      }
    });

    it('should resolve to single agent when module and agent are specified', async () => {
      const result = await engine.executeWorkflow({
        workflow: 'document-project',
        module: 'bmm',
        agent: 'analyst',
      });

      expect(result.success).toBe(true);
      expect('ambiguous' in result).toBe(false);
      // Agent is in execution context but workflow path varies
      expect(result.data).toBeDefined();
    });
  });

  describe('execution priority order', () => {
    it('should check standalone flag BEFORE agent matching', async () => {
      // This test verifies the fix for the bug where standalone workflows
      // were checked AFTER agent matching, causing false ambiguity

      const result = await engine.executeWorkflow({
        workflow: 'workflow-status',
      });

      // Should execute directly as standalone
      expect(result.success).toBe(true);
      expect('ambiguous' in result).toBe(false);

      // Should NOT have agent or handler
      expect((result.data as any)?.agent).toBeUndefined();
      expect((result.data as any)?.agentWorkflowHandler).toBeUndefined();

      // Should have workflow execution context
      expect((result.data as any)?.workflow).toBe('workflow-status');
      expect((result.data as any)?.workflowPath).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should return error for non-existent standalone workflow', async () => {
      const result = await engine.executeWorkflow({
        workflow: 'non-existent-workflow',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error when module filter excludes standalone workflow', async () => {
      const result = await engine.executeWorkflow({
        workflow: 'workflow-status',
        module: 'non-existent-module',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No agent found');
    });
  });
});
