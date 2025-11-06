/**
 * Basic tests for the Lite implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ResourceLoaderGit } from '../../src/resource-loader.js';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

describe('ResourceLoader (Lite)', () => {
  let testDir: string;
  let loader: ResourceLoaderGit;

  beforeEach(() => {
    // Create temp directory for testing
    testDir = join(tmpdir(), `bmad-lite-test-${Date.now()}`);
    mkdirSync(join(testDir, 'bmad', 'agents'), { recursive: true });
    mkdirSync(join(testDir, 'bmad', 'workflows', 'test-workflow'), {
      recursive: true,
    });

    // Create test files
    writeFileSync(
      join(testDir, 'bmad', 'agents', 'test-agent.md'),
      '# Test Agent\nThis is a test agent',
    );
    writeFileSync(
      join(testDir, 'bmad', 'workflows', 'test-workflow', 'workflow.yaml'),
      'name: test-workflow\ndescription: Test workflow',
    );

    loader = new ResourceLoaderGit(testDir);
  });

  afterEach(() => {
    // Cleanup
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should load an agent', async () => {
    const resource = await loader.loadAgent('test-agent');
    expect(resource.name).toBe('test-agent');
    expect(resource.content).toContain('Test Agent');
    expect(resource.source).toBe('project');
  });

  it('should load a workflow', async () => {
    const resource = await loader.loadWorkflow('test-workflow');
    expect(resource.name).toBe('test-workflow');
    expect(resource.content).toContain('test-workflow');
    expect(resource.source).toBe('project');
  });

  it('should list agents', async () => {
    const agents = await loader.listAgents();
    expect(agents).toContain('test-agent');
  });

  it('should list workflows', async () => {
    const workflows = await loader.listWorkflows();
    expect(workflows).toContain('test-workflow');
  });

  it('should throw when agent not found', async () => {
    await expect(loader.loadAgent('nonexistent')).rejects.toThrow(
      'Agent not found: nonexistent',
    );
  });

  it('should throw when workflow not found', async () => {
    await expect(loader.loadWorkflow('nonexistent')).rejects.toThrow(
      'Workflow not found: nonexistent',
    );
  });
});
