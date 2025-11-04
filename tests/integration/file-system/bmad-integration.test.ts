/**
 * Integration tests for BMAD MCP Server
 * Tests the full workflow from command to response
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import { BMADMCPServer } from '../../../src/server.js';
import { UnifiedBMADTool } from '../../../src/tools/index.js';
import { resolveBmadPaths } from '../../../src/utils/bmad-path-resolver.js';
import { MasterManifestService } from '../../../src/services/master-manifest-service.js';
import {
  createTestFixture,
  createBMADStructure,
  createAgentManifest,
  createWorkflowManifest,
  createTaskManifest,
  createAgentFile,
  createWorkflowFile,
  SAMPLE_AGENT,
  SAMPLE_WORKFLOW,
  type TestFixture,
} from '../helpers/test-fixtures.js';

describe('BMAD MCP Server Integration', () => {
  let fixture: TestFixture;
  let server: BMADMCPServer;
  let tool: UnifiedBMADTool;

  beforeEach(() => {
    fixture = createTestFixture();
    createBMADStructure(fixture.tmpDir);
    createAgentManifest(fixture.tmpDir);
    createWorkflowManifest(fixture.tmpDir);
    createTaskManifest(fixture.tmpDir);

    // Create comprehensive test data
    createAgentFile(fixture.tmpDir, 'core/agents/bmad-master.md', SAMPLE_AGENT);
    createAgentFile(
      fixture.tmpDir,
      'bmm/agents/analyst.md',
      '# Business Analyst\n\nRequirements expert.',
    );
    createAgentFile(
      fixture.tmpDir,
      'bmm/agents/dev.md',
      '# Developer\n\nCode expert.',
    );
    createWorkflowFile(
      fixture.tmpDir,
      'core/workflows/party-mode/party-mode.xml',
      SAMPLE_WORKFLOW,
    );
    createWorkflowFile(
      fixture.tmpDir,
      'core/workflows/party-mode/instructions.md',
      "# Party Mode Instructions\n\nLet's party!",
    );
    createWorkflowFile(
      fixture.tmpDir,
      'bmm/workflows/1-analysis/analysis.xml',
      SAMPLE_WORKFLOW,
    );
    createWorkflowFile(
      fixture.tmpDir,
      'bmm/workflows/1-analysis/instructions.md',
      '# Analysis Instructions\n\nAnalyze the requirements.',
    );

    const discovery = resolveBmadPaths({
      cwd: fixture.tmpDir,
      cliArgs: [],
      envVar: undefined,
      userBmadPath: path.join(fixture.tmpDir, '.bmad'),
    });

    server = new BMADMCPServer(fixture.tmpDir, discovery);

    const root = discovery.activeLocation.resolvedRoot ?? fixture.tmpDir;

    // Create and populate master manifest service for integration tests
    const masterManifestService = new MasterManifestService(discovery);
    masterManifestService.generate();

    tool = new UnifiedBMADTool({
      bmadRoot: root,
      discovery,
      masterManifestService,
    });
  });

  afterEach(() => {
    fixture.cleanup();
  });

  describe('End-to-end agent loading', () => {
    it('should load agent and return complete data', async () => {
      const result = await tool.execute('analyst');

      expect(result.success).toBe(true);
      expect(result.type).toBe('agent');
      expect(result.agentName).toBe('analyst');
      expect(result.displayName).toBe('Business Analyst');
      expect(result.content).toContain('Requirements expert');
    });

    it('should load default agent on empty command', async () => {
      const result = await tool.execute('');

      expect(result.success).toBe(true);
      expect(result.agentName).toBe('bmad-master');
    });

    it('should handle sequential agent loads', async () => {
      const result1 = await tool.execute('analyst');
      expect(result1.success).toBe(true);

      const result2 = await tool.execute('dev');
      expect(result2.success).toBe(true);

      const result3 = await tool.execute('bmad-master');
      expect(result3.success).toBe(true);
    });
  });

  describe('End-to-end workflow execution', () => {
    it('should execute workflow and return complete data', async () => {
      const result = await tool.execute('*party-mode');

      expect(result.success).toBe(true);
      expect(result.type).toBe('workflow');
      expect(result.name).toBe('party-mode');
      expect(result.workflowYaml).toBeDefined();
      expect(result.instructions).toBeDefined();
    });

    it('should execute multiple workflows', async () => {
      const result1 = await tool.execute('*party-mode');
      expect(result1.success).toBe(true);

      const result2 = await tool.execute('*analysis');
      expect(result2.success).toBe(true);
    });

    it('should include workflow context', async () => {
      const result = await tool.execute('*party-mode');

      expect(result.context).toBeDefined();
      expect(result.context?.bmadServerRoot).toBeDefined();
      expect(result.context?.agentManifestPath).toBeDefined();
      expect(result.context?.agentCount).toBeGreaterThan(0);
    });
  });

  // Discovery commands removed; integration tests omitted

  describe('Error handling integration', () => {
    it('should handle invalid agent gracefully', async () => {
      const result = await tool.execute('invalid-agent');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('UNKNOWN_AGENT');
      expect(result.error).toBeDefined();
    });

    it('should handle invalid workflow gracefully', async () => {
      const result = await tool.execute('*invalid-workflow');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('UNKNOWN_WORKFLOW');
    });

    it('should provide helpful suggestions', async () => {
      const result = await tool.execute('analyt'); // Typo

      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.length).toBeGreaterThan(0);
    });

    it('should reject dangerous commands', async () => {
      const result = await tool.execute('agent; rm -rf /');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_CHARACTERS');
    });
  });

  describe('Server and tool integration', () => {
    it('should maintain consistency between server and tool', () => {
      expect(server).toBeDefined();
      expect(tool).toBeDefined();
    });

    it('should handle concurrent operations', async () => {
      const promises = [
        tool.execute('analyst'),
        tool.execute('dev'),
        tool.execute('*party-mode'),
      ];

      const results = await Promise.all(promises);

      expect(results.every((r) => r !== undefined)).toBe(true);
      expect(results.filter((r) => r.success).length).toBeGreaterThan(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('should support workflow -> agent -> workflow sequence', async () => {
      const workflow1 = await tool.execute('*party-mode');
      expect(workflow1.success).toBe(true);

      const agent = await tool.execute('analyst');
      expect(agent.success).toBe(true);

      const workflow2 = await tool.execute('*analysis');
      expect(workflow2.success).toBe(true);
    });

    // Discovery removed; no pre-exec listing

    it('should handle error recovery', async () => {
      const error = await tool.execute('invalid');
      expect(error.success).toBe(false);

      const success = await tool.execute('analyst');
      expect(success.success).toBe(true);
    });
  });
});
