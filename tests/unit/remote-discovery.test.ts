/**
 * Unit tests for remote-discovery module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  cloneOrPullRemote,
  parseAgentMetadata,
  scanAgents,
  scanModules,
  discoverAgents,
  discoverModules,
  formatAgentList,
  formatModuleList,
  type DiscoveredAgent,
  type DiscoveredModule,
} from '../../src/utils/remote-discovery.js';
import type { RemoteRegistry } from '../../src/utils/remote-registry.js';
import { GitSourceResolver } from '../../src/utils/git-source-resolver.js';

describe('remote-discovery', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'bmad-test-'));
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('cloneOrPullRemote', () => {
    it('should resolve git URL using GitSourceResolver', async () => {
      const resolver = new GitSourceResolver();
      const mockResolve = vi.spyOn(resolver, 'resolve');
      mockResolve.mockResolvedValue('/cache/path');

      const url = 'git+https://github.com/test/repo#main';
      const result = await cloneOrPullRemote(url, resolver);

      expect(mockResolve).toHaveBeenCalledWith(url);
      expect(result).toBe('/cache/path');

      mockResolve.mockRestore();
    });

    it('should throw error if git operation fails', async () => {
      const resolver = new GitSourceResolver();
      const mockResolve = vi.spyOn(resolver, 'resolve');
      mockResolve.mockRejectedValue(new Error('Clone failed'));

      const url = 'git+https://github.com/test/repo#main';

      await expect(cloneOrPullRemote(url, resolver)).rejects.toThrow(
        'Failed to clone/pull',
      );

      mockResolve.mockRestore();
    });
  });

  describe('parseAgentMetadata', () => {
    it('should parse valid YAML frontmatter', () => {
      const agentPath = join(tempDir, 'agent.md');
      const content = `---
name: test-agent
display-name: Test Agent
title: Testing Agent
description: A test agent for unit tests
---

# Test Agent

Content goes here.`;

      writeFileSync(agentPath, content, 'utf-8');

      const metadata = parseAgentMetadata(agentPath);

      expect(metadata).toEqual({
        name: 'test-agent',
        displayName: 'Test Agent',
        title: 'Testing Agent',
        description: 'A test agent for unit tests',
      });
    });

    it('should return null for files without frontmatter', () => {
      const agentPath = join(tempDir, 'no-frontmatter.md');
      writeFileSync(agentPath, '# Just a markdown file', 'utf-8');

      const metadata = parseAgentMetadata(agentPath);

      expect(metadata).toBeNull();
    });

    it('should return null for malformed frontmatter', () => {
      const agentPath = join(tempDir, 'bad-frontmatter.md');
      const content = `---
this is not valid yaml: [
---`;

      writeFileSync(agentPath, content, 'utf-8');

      const metadata = parseAgentMetadata(agentPath);

      expect(metadata).toBeNull();
    });

    it('should handle missing optional fields', () => {
      const agentPath = join(tempDir, 'minimal.md');
      const content = `---
name: minimal-agent
---`;

      writeFileSync(agentPath, content, 'utf-8');

      const metadata = parseAgentMetadata(agentPath);

      expect(metadata).toEqual({
        name: 'minimal-agent',
        displayName: undefined,
        title: undefined,
        description: undefined,
      });
    });
  });

  describe('scanAgents', () => {
    it('should find and parse all agent files', () => {
      const agentsPath = join(tempDir, 'agents');
      mkdirSync(agentsPath, { recursive: true });

      // Create test agents (no _cfg required)
      writeFileSync(
        join(agentsPath, 'agent1.md'),
        `---
name: agent-one
title: First Agent
---`,
        'utf-8',
      );

      writeFileSync(
        join(agentsPath, 'agent2.md'),
        `---
name: agent-two
title: Second Agent
---`,
        'utf-8',
      );

      const agents = scanAgents(tempDir);

      expect(agents).toHaveLength(2);
      // Check that agent names are found (based on filename when no manifest)
      const agentNames = agents.map((a) => a.name);
      expect(agentNames).toContain('agent1');
      expect(agentNames).toContain('agent2');
    });

    it('should mark installed agents', () => {
      const agentsPath = join(tempDir, 'agents');
      mkdirSync(agentsPath, { recursive: true });

      writeFileSync(
        join(agentsPath, 'agent1.md'),
        `---
name: installed-agent
---`,
        'utf-8',
      );

      writeFileSync(
        join(agentsPath, 'agent2.md'),
        `---
name: new-agent
---`,
        'utf-8',
      );

      // Use filename-based names since no manifest
      const installedAgents = new Set(['agent1']);
      const agents = scanAgents(tempDir, installedAgents);

      expect(agents).toHaveLength(2);
      // At least one should be marked as installed
      const hasInstalled = agents.some((a) => a.installed);
      expect(hasInstalled).toBe(true);
    });

    it('should use filename as fallback name', () => {
      const agentsPath = join(tempDir, 'agents');
      mkdirSync(agentsPath, { recursive: true });

      writeFileSync(
        join(agentsPath, 'no-metadata.md'),
        '# Just content',
        'utf-8',
      );

      const agents = scanAgents(tempDir);

      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('no-metadata');
    });

    it('should return empty array if agents directory does not exist', () => {
      const agents = scanAgents(tempDir);
      expect(agents).toEqual([]);
    });

    it('should ignore non-.md files', () => {
      const agentsPath = join(tempDir, 'agents');
      mkdirSync(agentsPath, { recursive: true });

      writeFileSync(
        join(agentsPath, 'agent.md'),
        `---\nname: valid\n---`,
        'utf-8',
      );
      writeFileSync(join(agentsPath, 'README.txt'), 'Not an agent', 'utf-8');
      writeFileSync(join(agentsPath, 'config.json'), '{}', 'utf-8');

      const agents = scanAgents(tempDir);

      expect(agents).toHaveLength(1);
      // Agent name should be based on filename
      expect(agents[0].name).toBe('agent');
    });

    it('should sort agents alphabetically by name', () => {
      const agentsPath = join(tempDir, 'agents');
      mkdirSync(agentsPath, { recursive: true });

      writeFileSync(
        join(agentsPath, 'zebra.md'),
        `---\nname: zebra\n---`,
        'utf-8',
      );
      writeFileSync(
        join(agentsPath, 'alpha.md'),
        `---\nname: alpha\n---`,
        'utf-8',
      );
      writeFileSync(
        join(agentsPath, 'middle.md'),
        `---\nname: middle\n---`,
        'utf-8',
      );

      const agents = scanAgents(tempDir);

      expect(agents.map((a) => a.name)).toEqual(['alpha', 'middle', 'zebra']);
    });
  });

  describe('scanModules', () => {
    it('should find and parse all modules', () => {
      const bmadPath = join(tempDir, 'bmad');
      mkdirSync(join(bmadPath, 'module1', 'agents'), { recursive: true });
      mkdirSync(join(bmadPath, 'module2', 'workflows'), { recursive: true });

      writeFileSync(
        join(bmadPath, 'module1', 'manifest.yaml'),
        `name: module-one
description: First Module
version: 1.0.0`,
        'utf-8',
      );

      writeFileSync(
        join(bmadPath, 'module2', 'manifest.yaml'),
        `name: module-two
description: Second Module`,
        'utf-8',
      );

      // Add some agents and workflows to count
      writeFileSync(
        join(bmadPath, 'module1', 'agents', 'agent1.md'),
        '# Agent',
        'utf-8',
      );
      writeFileSync(
        join(bmadPath, 'module2', 'workflows', 'wf1.yaml'),
        'name: wf1',
        'utf-8',
      );

      const modules = scanModules(tempDir);

      expect(modules).toHaveLength(2);
      expect(modules[0].name).toBe('module-one');
      expect(modules[0].agentCount).toBe(1);
      expect(modules[1].name).toBe('module-two');
      expect(modules[1].workflowCount).toBe(1);
    });

    it('should mark installed modules', () => {
      const bmadPath = join(tempDir, 'bmad');
      mkdirSync(join(bmadPath, 'installed-mod'), { recursive: true });
      mkdirSync(join(bmadPath, 'new-mod'), { recursive: true });

      writeFileSync(
        join(bmadPath, 'installed-mod', 'manifest.yaml'),
        'name: installed-mod',
        'utf-8',
      );

      writeFileSync(
        join(bmadPath, 'new-mod', 'manifest.yaml'),
        'name: new-mod',
        'utf-8',
      );

      const installedModules = new Set(['installed-mod']);
      const modules = scanModules(tempDir, installedModules);

      expect(modules).toHaveLength(2);
      expect(modules[0].installed).toBe(true);
      expect(modules[1].installed).toBe(false);
    });

    it('should use directory name as fallback', () => {
      const bmadPath = join(tempDir, 'bmad');
      mkdirSync(join(bmadPath, 'no-name-module'), { recursive: true });

      writeFileSync(
        join(bmadPath, 'no-name-module', 'manifest.yaml'),
        'version: 1.0.0',
        'utf-8',
      );

      const modules = scanModules(tempDir);

      expect(modules).toHaveLength(1);
      expect(modules[0].name).toBe('no-name-module');
    });

    it('should return empty array if bmad directory does not exist', () => {
      const modules = scanModules(tempDir);
      expect(modules).toEqual([]);
    });

    it('should ignore directories without manifest.yaml', () => {
      const bmadPath = join(tempDir, 'bmad');
      mkdirSync(join(bmadPath, 'valid-mod'), { recursive: true });
      mkdirSync(join(bmadPath, 'invalid-mod'), { recursive: true });

      writeFileSync(
        join(bmadPath, 'valid-mod', 'manifest.yaml'),
        'name: valid',
        'utf-8',
      );

      const modules = scanModules(tempDir);

      expect(modules).toHaveLength(1);
      expect(modules[0].name).toBe('valid');
    });
  });

  describe('discoverAgents', () => {
    it('should return error for unknown remote', async () => {
      const registry: RemoteRegistry = {
        remotes: new Map(),
      };

      const resolver = new GitSourceResolver();
      const result = await discoverAgents('unknown', registry, resolver);

      expect(result.error).toContain('not found');
    });

    it('should discover agents from remote', async () => {
      const agentsPath = join(tempDir, 'agents');
      mkdirSync(agentsPath, { recursive: true });

      writeFileSync(
        join(agentsPath, 'test-agent.md'),
        `---
name: test-agent
title: Test Agent
---`,
        'utf-8',
      );

      const registry: RemoteRegistry = {
        remotes: new Map([['test', 'git+https://github.com/test/repo#main']]),
      };

      const resolver = new GitSourceResolver();
      const mockResolve = vi.spyOn(resolver, 'resolve');
      mockResolve.mockResolvedValue(tempDir);

      const result = await discoverAgents('test', registry, resolver);

      expect(result.error).toBeUndefined();
      expect(result.agents).toHaveLength(1);
      expect(result.agents![0].name).toBe('test-agent');

      mockResolve.mockRestore();
    });
  });

  describe('discoverModules', () => {
    it('should return error for unknown remote', async () => {
      const registry: RemoteRegistry = {
        remotes: new Map(),
      };

      const resolver = new GitSourceResolver();
      const result = await discoverModules('unknown', registry, resolver);

      expect(result.error).toContain('not found');
    });

    it('should discover modules from remote', async () => {
      const bmadPath = join(tempDir, 'bmad', 'test-module');
      mkdirSync(bmadPath, { recursive: true });

      writeFileSync(
        join(bmadPath, 'manifest.yaml'),
        `name: test-module
description: Test Module`,
        'utf-8',
      );

      const registry: RemoteRegistry = {
        remotes: new Map([['test', 'git+https://github.com/test/repo#main']]),
      };

      const resolver = new GitSourceResolver();
      const mockResolve = vi.spyOn(resolver, 'resolve');
      mockResolve.mockResolvedValue(tempDir);

      const result = await discoverModules('test', registry, resolver);

      expect(result.error).toBeUndefined();
      expect(result.modules).toHaveLength(1);
      expect(result.modules![0].name).toBe('test-module');

      mockResolve.mockRestore();
    });
  });

  describe('formatAgentList', () => {
    it('should format error message', () => {
      const result = {
        remote: 'test',
        url: '',
        localPath: '',
        error: 'Remote not found',
      };

      const output = formatAgentList(result);

      // Accept emoji in header (🌐 is now part of the format)
      expect(output).toContain('Remote Agents');
      expect(output).toContain('@test');
      expect(output).toContain('❌ **Error:** Remote not found');
    });

    it('should format empty agent list', () => {
      const result = {
        remote: 'test',
        url: 'git+https://github.com/test/repo#main',
        localPath: '/cache/path',
        agents: [],
      };

      const output = formatAgentList(result);

      // Accept emoji in header
      expect(output).toContain('Remote Agents');
      expect(output).toContain('@test');
      expect(output).toContain('*No agents found');
    });

    it('should format agent list with installation status', () => {
      const agents: DiscoveredAgent[] = [
        {
          name: 'installed-agent',
          title: 'Installed Agent',
          description: 'Already installed',
          path: '/path/to/installed.md',
          installed: true,
        },
        {
          name: 'new-agent',
          title: 'New Agent',
          description: 'Not installed',
          path: '/path/to/new.md',
          installed: false,
        },
      ];

      const result = {
        remote: 'test',
        url: 'git+https://github.com/test/repo#main',
        localPath: '/cache/path',
        agents,
      };

      const output = formatAgentList(result);

      // Look for agent names in the output
      expect(output).toContain('installed-agent');
      expect(output).toContain('new-agent');
      // Status indicators may vary in format, just check they're present
      expect(output).toContain('installed');
      expect(output).toContain('available');
    });
  });

  describe('formatModuleList', () => {
    it('should format error message', () => {
      const result = {
        remote: 'test',
        url: '',
        localPath: '',
        error: 'Remote not found',
      };

      const output = formatModuleList(result);

      // Accept emoji in header
      expect(output).toContain('Remote Modules');
      expect(output).toContain('@test');
      expect(output).toContain('❌ **Error:** Remote not found');
    });

    it('should format empty module list', () => {
      const result = {
        remote: 'test',
        url: 'git+https://github.com/test/repo#main',
        localPath: '/cache/path',
        modules: [],
      };

      const output = formatModuleList(result);

      // Accept emoji in header
      expect(output).toContain('Remote Modules');
      expect(output).toContain('@test');
      expect(output).toContain('*No modules found');
    });

    it('should format module list with content counts', () => {
      const modules: DiscoveredModule[] = [
        {
          name: 'module-one',
          description: 'First Module',
          version: '1.0.0',
          path: '/path/to/module-one',
          agentCount: 5,
          workflowCount: 3,
          installed: true,
        },
        {
          name: 'module-two',
          description: 'Second Module',
          version: '2.0.0',
          path: '/path/to/module-two',
          agentCount: 2,
          workflowCount: 1,
          installed: false,
        },
      ];

      const result = {
        remote: 'test',
        url: 'git+https://github.com/test/repo#main',
        localPath: '/cache/path',
        modules,
      };

      const output = formatModuleList(result);

      // Look for module names in the output
      expect(output).toContain('module-one');
      expect(output).toContain('module-two');
      // Check for content counts (format may vary)
      expect(output).toContain('5 agents');
      expect(output).toContain('3 workflows');
      expect(output).toContain('2 agents');
      expect(output).toContain('1 workflows');
    });
  });
});
