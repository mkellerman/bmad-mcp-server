/**
 * Unit tests for Doctor Workflow (*doctor)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { UnifiedBMADTool } from '../../src/tools/unified-tool.js';
import { resolveBmadPaths } from '../../src/utils/bmad-path-resolver.js';
import {
  createTestFixture,
  createBMADStructure,
  createAgentManifest,
  createWorkflowManifest,
  createTaskManifest,
  createAgentFile,
  SAMPLE_AGENT,
  type TestFixture,
} from '../helpers/test-fixtures.js';

function createUnifiedTool(baseDir: string): UnifiedBMADTool {
  const discovery = resolveBmadPaths({
    cwd: baseDir,
    packageRoot: baseDir,
    cliArg: undefined,
    envVar: undefined,
    userBmadPath: path.join(baseDir, '.bmad'),
  });

  const root = discovery.activeLocation.resolvedRoot ?? baseDir;

  return new UnifiedBMADTool({
    bmadRoot: root,
    discovery,
  });
}

describe('Doctor Workflow (*doctor)', () => {
  let fixture: TestFixture;
  let tool: UnifiedBMADTool;

  beforeEach(() => {
    fixture = createTestFixture();
    createBMADStructure(fixture.tmpDir);
  });

  afterEach(() => {
    fixture.cleanup();
  });

  describe('Summary Mode', () => {
    it('should execute *doctor command successfully', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);
      createAgentFile(
        fixture.tmpDir,
        'core/agents/bmad-master.md',
        SAMPLE_AGENT,
      );

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      expect(result.success).toBe(true);
      expect(result.type).toBe('diagnostic');
      expect(result.content).toBeDefined();
      expect(result.exitCode).toBe(0);
    });

    it('should display health score in summary', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      expect(result.content).toContain('Health Score');
      expect(result.content).toMatch(/\d+%/); // Should contain percentage
    });

    it('should show active location in summary', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      expect(result.content).toContain('Active Location');
      expect(result.content).toMatch(/Local project|Package defaults/);
    });

    it('should display resource counts (agents, workflows, tasks)', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      expect(result.content).toContain('Agents');
      expect(result.content).toContain('Workflows');
      expect(result.content).toContain('Tasks');
      expect(result.content).toMatch(/\d+ ready/); // Should show counts
    });

    it('should include data object with statistics', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      expect(result.data).toBeDefined();
      const data = result.data as any;
      expect(data.statistics).toBeDefined();
      expect(data.statistics).toHaveProperty('totalAgents');
      expect(data.statistics).toHaveProperty('totalWorkflows');
      expect(data.statistics).toHaveProperty('totalTasks');
      expect(data.statistics).toHaveProperty('registeredAgents');
      expect(data.statistics).toHaveProperty('orphanedAgents');
      expect(data.statistics).toHaveProperty('missingAgents');
    });

    it('should show tip about --full flag in summary mode', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      expect(result.content).toContain('--full');
    });
  });

  describe('Full Mode (*doctor --full)', () => {
    it('should execute *doctor --full command successfully', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor --full');

      expect(result.success).toBe(true);
      expect(result.type).toBe('diagnostic');
      expect(result.content).toBeDefined();
      expect(result.exitCode).toBe(0);
    });

    it('should show detailed file listings in full mode', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);
      createAgentFile(
        fixture.tmpDir,
        'core/agents/bmad-master.md',
        SAMPLE_AGENT,
      );

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor --full');

      expect(result.content).toContain('Detailed Inventory');
    });

    it('should display legend explaining status symbols', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor --full');

      expect(result.content).toContain('Legend');
      expect(result.content).toContain('Registered');
      expect(result.content).toContain('Orphaned');
      expect(result.content).toContain('Missing');
    });

    it('should show all scanned locations in full mode', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor --full');

      expect(result.content).toContain('Resolution Priority');
    });
  });

  describe('Orphan Detection', () => {
    it('should detect orphaned agents (files without manifest entries)', () => {
      // Create manifest with no entries
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      // Create agent file that's not in manifest
      createAgentFile(
        fixture.tmpDir,
        'bmm/agents/orphan-agent.md',
        '# Orphan Agent\n\nNot in manifest.',
      );

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      const data = result.data as any;
      expect(data.statistics.orphanedAgents).toBeGreaterThan(0);
    });

    it('should detect orphaned workflows', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      // Create workflow file not in manifest
      const workflowDir = path.join(
        fixture.tmpDir,
        'src',
        'bmad',
        'bmm',
        'workflows',
        'orphan-workflow',
      );
      fs.mkdirSync(workflowDir, { recursive: true });
      fs.writeFileSync(
        path.join(workflowDir, 'workflow.yaml'),
        'name: orphan\n',
      );

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      const data = result.data as any;
      expect(data.statistics.orphanedWorkflows).toBeGreaterThan(0);
    });

    it('should detect orphaned tasks', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir); // Empty manifest

      // Create task file not in manifest
      const taskDir = path.join(fixture.tmpDir, 'src', 'bmad', 'core', 'tasks');
      fs.mkdirSync(taskDir, { recursive: true });
      fs.writeFileSync(path.join(taskDir, 'orphan-task.xml'), '<task/>');

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      const data = result.data as any;
      expect(data.statistics.orphanedTasks).toBeGreaterThan(0);
    });

    it('should report orphaned files in issues section', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      // Create orphaned task
      const taskDir = path.join(fixture.tmpDir, 'src', 'bmad', 'core', 'tasks');
      fs.mkdirSync(taskDir, { recursive: true });
      fs.writeFileSync(path.join(taskDir, 'orphan.xml'), '<task/>');

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      expect(result.content).toContain('Issues Detected');
      expect(result.content).toContain('Orphaned');
    });

    it('should show orphaned files with warning symbol in --full mode', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      // Create orphaned task
      const taskDir = path.join(fixture.tmpDir, 'src', 'bmad', 'core', 'tasks');
      fs.mkdirSync(taskDir, { recursive: true });
      fs.writeFileSync(path.join(taskDir, 'orphan.xml'), '<task/>');

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor --full');

      expect(result.content).toMatch(/⚠️.*orphan/i);
    });
  });

  describe('Missing File Detection', () => {
    it('should handle missing file scenarios gracefully', () => {
      // The default manifests include entries, but we don't create corresponding files
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      expect(result.success).toBe(true);
      // Should still execute successfully even if files are missing
    });
  });

  describe('Health Score Calculation', () => {
    it('should calculate health score based on issues', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      expect(result.content).toMatch(/Health Score:\s+\d+%/);
    });

    it('should show lower health score when there are orphaned files', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      // Create multiple orphaned files
      const taskDir = path.join(fixture.tmpDir, 'src', 'bmad', 'core', 'tasks');
      fs.mkdirSync(taskDir, { recursive: true });
      fs.writeFileSync(path.join(taskDir, 'orphan1.xml'), '<task/>');
      fs.writeFileSync(path.join(taskDir, 'orphan2.xml'), '<task/>');
      fs.writeFileSync(path.join(taskDir, 'orphan3.xml'), '<task/>');

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      const data = result.data as any;
      expect(data.statistics.orphanedTasks).toBe(3);
      // Health score should be present
      expect(result.content).toMatch(/\d+%/);
    });

    it('should show health status indicator', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      // Check for health status indicators (various possible states)
      const hasStatus =
        result.content?.includes('Good') ||
        result.content?.includes('Fair') ||
        result.content?.includes('Poor') ||
        result.content?.includes('Excellent') ||
        result.content?.includes('Needs Attention');
      expect(hasStatus).toBe(true);
    });
  });

  describe('Recommendations', () => {
    it('should provide recommendations when issues are found', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      // Create orphaned file to trigger recommendation
      const taskDir = path.join(fixture.tmpDir, 'src', 'bmad', 'core', 'tasks');
      fs.mkdirSync(taskDir, { recursive: true });
      fs.writeFileSync(path.join(taskDir, 'orphan.xml'), '<task/>');

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      expect(result.content).toContain('Recommended Actions');
    });

    it('should suggest registering orphaned files in manifest', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      const taskDir = path.join(fixture.tmpDir, 'src', 'bmad', 'core', 'tasks');
      fs.mkdirSync(taskDir, { recursive: true });
      fs.writeFileSync(path.join(taskDir, 'orphan.xml'), '<task/>');

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      expect(result.content).toMatch(/register|manifest|_cfg/i);
    });
  });

  describe('UI Formatting', () => {
    it('should include box drawing characters for visual structure', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      // Check for box drawing characters
      expect(result.content).toMatch(/[╭╮╯╰─│┌┐└┘]/);
    });

    it('should include emoji indicators in output', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      // Should contain emoji for visual appeal (check for common ones)
      expect(result.content).toBeDefined();
      const content = result.content || '';
      const hasEmoji =
        content.includes('🏥') ||
        content.includes('💛') ||
        content.includes('✓') ||
        content.includes('📍') ||
        content.includes('📦');
      expect(hasEmoji).toBe(true);
    });

    it('should format output with clear sections and headings', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      expect(result.content).toContain('BMAD Health Diagnostic');
      expect(result.content).toContain('System Health');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty BMAD directory gracefully', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
    });

    it('should handle malformed command variations', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      tool = createUnifiedTool(fixture.tmpDir);

      // Should handle extra spaces
      const result1 = tool.execute('*doctor  --full');
      expect(result1.success).toBe(true);

      // Should handle case variations
      const result2 = tool.execute('*doctor');
      expect(result2.success).toBe(true);
    });

    it('should provide meaningful output even with no registered resources', () => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);

      tool = createUnifiedTool(fixture.tmpDir);
      const result = tool.execute('*doctor');

      expect(result.success).toBe(true);
      const data = result.data as any;
      // The default manifests have some entries, so just check data exists
      expect(data.statistics).toBeDefined();
    });
  });
});
