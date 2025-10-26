/**
 * Unit tests for ManifestLoader
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ManifestLoader } from '../../src/utils/manifest-loader.js';
import {
  createTestFixture,
  createBMADStructure,
  createAgentManifest,
  createWorkflowManifest,
  createTaskManifest,
  type TestFixture,
} from '../helpers/test-fixtures.js';
import fs from 'node:fs';
import path from 'node:path';

describe('ManifestLoader', () => {
  let fixture: TestFixture;
  let loader: ManifestLoader;

  beforeEach(() => {
    fixture = createTestFixture();
    createBMADStructure(fixture.tmpDir);
  });

  afterEach(() => {
    fixture.cleanup();
  });

  describe('constructor', () => {
    it('should initialize with src/bmad/_cfg structure', () => {
      createAgentManifest(fixture.tmpDir);
      loader = new ManifestLoader(fixture.tmpDir);
      expect(loader).toBeDefined();
    });

    it('should not throw error if manifest directory not found', () => {
      const emptyDir = path.join(fixture.tmpDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      // Should not throw - will use directory directly and look for _cfg within it
      expect(() => {
        new ManifestLoader(emptyDir);
      }).not.toThrow();
    });

    it('should support legacy bmad/_cfg structure', () => {
      const legacyDir = path.join(fixture.tmpDir, 'legacy');
      const manifestDir = path.join(legacyDir, 'bmad', '_cfg');
      fs.mkdirSync(manifestDir, { recursive: true });

      const manifestPath = path.join(manifestDir, 'agent-manifest.csv');
      fs.writeFileSync(
        manifestPath,
        'name,displayName,title\ntest,Test,Test Agent',
        'utf-8',
      );

      loader = new ManifestLoader(legacyDir);
      expect(loader).toBeDefined();
    });
  });

  describe('loadAgentManifest', () => {
    beforeEach(() => {
      createAgentManifest(fixture.tmpDir);
      loader = new ManifestLoader(fixture.tmpDir);
    });

    it('should load agent manifest successfully', () => {
      const agents = loader.loadAgentManifest();
      expect(agents).toBeDefined();
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeGreaterThan(0);
    });

    it('should parse agent properties correctly', () => {
      const agents = loader.loadAgentManifest();
      const analyst = agents.find((a) => a.name === 'analyst');

      expect(analyst).toBeDefined();
      expect(analyst?.displayName).toBe('Business Analyst');
      expect(analyst?.title).toBe('Requirements Analyst');
      expect(analyst?.role).toBe('analyst');
      expect(analyst?.module).toBe('bmm');
      expect(analyst?.path).toBe('bmm/agents/analyst.md');
    });

    it('should filter out empty rows', () => {
      const manifestPath = path.join(
        fixture.tmpDir,
        'src',
        'bmad',
        '_cfg',
        'agent-manifest.csv',
      );
      const content = `name,displayName,title,icon,role,identity,communicationStyle,principles,module,path
test,Test,Test Agent,,test,,,,bmm,test.md
,,,,,,,,,
another,Another,Another Agent,,another,,,,bmm,another.md`;
      fs.writeFileSync(manifestPath, content, 'utf-8');

      // Create new loader to pick up the updated manifest
      const newLoader = new ManifestLoader(fixture.tmpDir);
      const agents = newLoader.loadAgentManifest();
      expect(agents.length).toBe(2);
    });

    it('should return empty array if manifest file does not exist', () => {
      const emptyLoader = new ManifestLoader(fixture.tmpDir);
      fs.unlinkSync(
        path.join(fixture.tmpDir, 'src', 'bmad', '_cfg', 'agent-manifest.csv'),
      );

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const agents = emptyLoader.loadAgentManifest();

      expect(agents).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Manifest not found'),
      );
      consoleSpy.mockRestore();
    });

    it('should log number of loaded entries', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      loader.loadAgentManifest();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Loaded 3 entries from agent-manifest.csv'),
      );
      consoleSpy.mockRestore();
    });

    it('should handle malformed CSV gracefully', () => {
      const manifestPath = path.join(
        fixture.tmpDir,
        'src',
        'bmad',
        '_cfg',
        'agent-manifest.csv',
      );
      fs.writeFileSync(
        manifestPath,
        'invalid,csv,format\n"unclosed quote',
        'utf-8',
      );

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const agents = loader.loadAgentManifest();

      expect(agents).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('loadWorkflowManifest', () => {
    beforeEach(() => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      loader = new ManifestLoader(fixture.tmpDir);
    });

    it('should load workflow manifest successfully', () => {
      const workflows = loader.loadWorkflowManifest();
      expect(workflows).toBeDefined();
      expect(Array.isArray(workflows)).toBe(true);
      expect(workflows.length).toBeGreaterThan(0);
    });

    it('should parse workflow properties correctly', () => {
      const workflows = loader.loadWorkflowManifest();
      const partyMode = workflows.find((w) => w.name === 'party-mode');

      expect(partyMode).toBeDefined();
      expect(partyMode?.description).toBe('Brainstorming party mode');
      expect(partyMode?.trigger).toBe('*party-mode');
      expect(partyMode?.module).toBe('core');
      expect(partyMode?.path).toBe('core/workflows/party-mode/party-mode.xml');
    });

    it('should return empty array if manifest does not exist', () => {
      fs.unlinkSync(
        path.join(
          fixture.tmpDir,
          'src',
          'bmad',
          '_cfg',
          'workflow-manifest.csv',
        ),
      );

      const workflows = loader.loadWorkflowManifest();
      expect(workflows).toEqual([]);
    });
  });

  describe('loadTaskManifest', () => {
    beforeEach(() => {
      createAgentManifest(fixture.tmpDir);
      createTaskManifest(fixture.tmpDir);
      loader = new ManifestLoader(fixture.tmpDir);
    });

    it('should load task manifest successfully', () => {
      const tasks = loader.loadTaskManifest();
      expect(tasks).toBeDefined();
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should parse task properties correctly', () => {
      const tasks = loader.loadTaskManifest();
      const standup = tasks.find((t) => t.name === 'daily-standup');

      expect(standup).toBeDefined();
      expect(standup?.description).toBe('Daily standup meeting');
      expect(standup?.module).toBe('bmm');
      expect(standup?.path).toBe('bmm/tasks/daily-standup.xml');
    });

    it('should return empty array if manifest does not exist', () => {
      fs.unlinkSync(
        path.join(fixture.tmpDir, 'src', 'bmad', '_cfg', 'task-manifest.csv'),
      );

      const tasks = loader.loadTaskManifest();
      expect(tasks).toEqual([]);
    });
  });

  describe('getAgentByName', () => {
    beforeEach(() => {
      createAgentManifest(fixture.tmpDir);
      loader = new ManifestLoader(fixture.tmpDir);
    });

    it('should find agent by name', () => {
      const agent = loader.getAgentByName('analyst');
      expect(agent).toBeDefined();
      expect(agent?.name).toBe('analyst');
    });

    it('should return undefined for non-existent agent', () => {
      const agent = loader.getAgentByName('nonexistent');
      expect(agent).toBeUndefined();
    });

    it('should be case-sensitive', () => {
      const agent = loader.getAgentByName('ANALYST');
      expect(agent).toBeUndefined();
    });
  });

  describe('getWorkflowByName', () => {
    beforeEach(() => {
      createAgentManifest(fixture.tmpDir);
      createWorkflowManifest(fixture.tmpDir);
      loader = new ManifestLoader(fixture.tmpDir);
    });

    it('should find workflow by name', () => {
      const workflow = loader.getWorkflowByName('party-mode');
      expect(workflow).toBeDefined();
      expect(workflow?.name).toBe('party-mode');
    });

    it('should return undefined for non-existent workflow', () => {
      const workflow = loader.getWorkflowByName('nonexistent');
      expect(workflow).toBeUndefined();
    });
  });
});
