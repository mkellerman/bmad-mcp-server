/**
 * Unit tests for FileReader - Module-aware file reading
 *
 * FileReader now uses the master manifest for path resolution instead of
 * multi-root validation. These tests verify:
 * - Absolute path reading (direct filesystem access)
 * - Module-aware path resolution (v4 and v6 formats)
 * - Master manifest integration
 * - Error handling for missing files
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileReader, FileReadError } from '../../src/utils/file-reader.js';
import {
  createTestFixture,
  createBMADStructure,
  createAgentFile,
  SAMPLE_AGENT,
  type TestFixture,
} from '../helpers/test-fixtures.js';
import type { MasterManifests, BmadOrigin } from '../../src/types/index.js';
import fs from 'node:fs';
import path from 'node:path';

/** Mock BmadOrigin for testing */
const mockOrigin: BmadOrigin = {
  kind: 'cli',
  displayName: 'CLI Test',
  root: '/test/root',
  manifestDir: '/test/root/_cfg',
  priority: 1,
};

/**
 * Create a minimal mock MasterManifests for testing
 */
function createMockManifest(
  agentFiles: Array<{
    name: string;
    module: string;
    filePath: string;
    absolutePath: string;
  }>,
): MasterManifests {
  return {
    agents: agentFiles.map((file) => ({
      kind: 'agent' as const,
      source: 'manifest' as const,
      origin: mockOrigin,
      moduleName: file.module,
      name: file.name,
      displayName: file.name,
      bmadRelativePath: `bmad/${file.filePath}`,
      moduleRelativePath: file.filePath,
      absolutePath: file.absolutePath,
      exists: true,
      status: 'verified' as const,
    })),
    workflows: [],
    tasks: [],
    modules: [],
  };
}

describe('FileReader', () => {
  let fixture: TestFixture;
  let reader: FileReader;
  let mockManifest: MasterManifests;

  beforeEach(() => {
    fixture = createTestFixture();
    createBMADStructure(fixture.tmpDir);

    mockManifest = {
      agents: [],
      workflows: [],
      tasks: [],
      modules: [],
    };

    reader = new FileReader(mockManifest);
  });

  afterEach(() => {
    fixture.cleanup();
  });

  describe('constructor', () => {
    it('should initialize with MasterManifests', () => {
      const newReader = new FileReader(mockManifest);
      expect(newReader).toBeDefined();
    });
  });

  describe('readFile - absolute paths', () => {
    it('should read file with absolute path (bypasses manifest)', () => {
      const testFile = path.join(fixture.tmpDir, 'src', 'bmad', 'test.txt');
      fs.writeFileSync(testFile, 'Hello World', 'utf-8');

      const content = reader.readFile(testFile);
      expect(content).toBe('Hello World');
    });

    it('should throw FileReadError if absolute path does not exist', () => {
      const nonExistent = path.join(fixture.tmpDir, 'nonexistent.txt');
      expect(() => {
        reader.readFile(nonExistent);
      }).toThrow(FileReadError);
    });

    it('should handle permission errors for absolute paths', () => {
      const testFile = path.join(fixture.tmpDir, 'restricted.txt');
      fs.writeFileSync(testFile, 'Secret', 'utf-8');
      fs.chmodSync(testFile, 0o000);

      try {
        expect(() => {
          reader.readFile(testFile);
        }).toThrow(FileReadError);
      } finally {
        fs.chmodSync(testFile, 0o644);
      }
    });
  });

  describe('readFile - manifest-based paths', () => {
    it('should read file using manifest resolution', () => {
      const testFile = path.join(
        fixture.tmpDir,
        'src',
        'bmad',
        'bmm',
        'agents',
        'test.md',
      );
      createAgentFile(fixture.tmpDir, 'bmm/agents/test.md', SAMPLE_AGENT);

      mockManifest = createMockManifest([
        {
          name: 'test',
          module: 'bmm',
          filePath: 'bmm/agents/test.md',
          absolutePath: testFile,
        },
      ]);

      reader = new FileReader(mockManifest);

      const content = reader.readFile('bmm/agents/test.md');
      expect(content).toContain('Test Agent');
    });

    it('should throw FileReadError if file not in manifest', () => {
      expect(() => {
        reader.readFile('src/bmad/nonexistent.txt');
      }).toThrow(FileReadError);
      expect(() => {
        reader.readFile('src/bmad/nonexistent.txt');
      }).toThrow(/not found in master manifest/);
    });

    it('should resolve v4 format paths (.bmad-module/file)', () => {
      const testFile = path.join(fixture.tmpDir, 'test-agent.md');
      fs.writeFileSync(testFile, 'v4 agent content', 'utf-8');

      mockManifest = createMockManifest([
        {
          name: 'test-agent',
          module: 'core',
          filePath: 'core/agents/test-agent.md',
          absolutePath: testFile,
        },
      ]);

      reader = new FileReader(mockManifest);

      const content = reader.readFile('.bmad-core/agents/test-agent.md');
      expect(content).toBe('v4 agent content');
    });

    it('should resolve v6 format paths ({project-root}/bmad/module/file)', () => {
      const testFile = path.join(fixture.tmpDir, 'test-workflow.yaml');
      fs.writeFileSync(testFile, 'v6 workflow', 'utf-8');

      mockManifest = {
        agents: [],
        workflows: [
          {
            kind: 'workflow' as const,
            source: 'manifest' as const,
            origin: mockOrigin,
            moduleName: 'core',
            name: 'test-wf',
            displayName: 'Test Workflow',
            bmadRelativePath: 'bmad/core/workflows/test-wf/workflow.yaml',
            moduleRelativePath: 'core/workflows/test-wf/workflow.yaml',
            absolutePath: testFile,
            exists: true,
            status: 'verified' as const,
          },
        ],
        tasks: [],
        modules: [],
      };

      reader = new FileReader(mockManifest);

      const content = reader.readFile(
        '{project-root}/bmad/core/workflows/test-wf/workflow.yaml',
      );
      expect(content).toBe('v6 workflow');
    });
  });

  describe('fileExists', () => {
    it('should return true for existing absolute path', () => {
      const testFile = path.join(fixture.tmpDir, 'exists.txt');
      fs.writeFileSync(testFile, 'Exists', 'utf-8');

      expect(reader.fileExists(testFile)).toBe(true);
    });

    it('should return false for non-existent absolute path', () => {
      const nonExistent = path.join(fixture.tmpDir, 'nonexistent.txt');
      expect(reader.fileExists(nonExistent)).toBe(false);
    });

    it('should return true for file in manifest', () => {
      const testFile = path.join(fixture.tmpDir, 'in-manifest.md');
      fs.writeFileSync(testFile, 'Content', 'utf-8');

      mockManifest = createMockManifest([
        {
          name: 'test',
          module: 'core',
          filePath: 'core/agents/test.md',
          absolutePath: testFile,
        },
      ]);

      reader = new FileReader(mockManifest);

      expect(reader.fileExists('core/agents/test.md')).toBe(true);
    });

    it('should return false for file not in manifest', () => {
      expect(reader.fileExists('not/in/manifest.md')).toBe(false);
    });

    it('should return false if manifest entry exists but file does not', () => {
      const nonExistentFile = path.join(fixture.tmpDir, 'deleted.md');

      mockManifest = createMockManifest([
        {
          name: 'deleted',
          module: 'core',
          filePath: 'core/agents/deleted.md',
          absolutePath: nonExistentFile,
        },
      ]);

      reader = new FileReader(mockManifest);

      expect(reader.fileExists('core/agents/deleted.md')).toBe(false);
    });
  });

  describe('module-aware resolution', () => {
    it('should resolve path by querying correct module in manifest', () => {
      const coreFile = path.join(fixture.tmpDir, 'core-analyst.md');
      const bmmFile = path.join(fixture.tmpDir, 'bmm-analyst.md');

      fs.writeFileSync(coreFile, 'core analyst', 'utf-8');
      fs.writeFileSync(bmmFile, 'bmm analyst', 'utf-8');

      mockManifest = createMockManifest([
        {
          name: 'analyst',
          module: 'core',
          filePath: 'core/agents/analyst.md',
          absolutePath: coreFile,
        },
        {
          name: 'analyst',
          module: 'bmm',
          filePath: 'bmm/agents/analyst.md',
          absolutePath: bmmFile,
        },
      ]);

      reader = new FileReader(mockManifest);

      const coreContent = reader.readFile('.bmad-core/agents/analyst.md');
      expect(coreContent).toBe('core analyst');

      const bmmContent = reader.readFile('bmm/agents/analyst.md');
      expect(bmmContent).toBe('bmm analyst');
    });

    it('should use priority-based resolution for ambiguous paths', () => {
      const file1 = path.join(fixture.tmpDir, 'first.md');
      const file2 = path.join(fixture.tmpDir, 'second.md');

      fs.writeFileSync(file1, 'first match', 'utf-8');
      fs.writeFileSync(file2, 'second match', 'utf-8');

      const highPriorityOrigin: BmadOrigin = {
        kind: 'cli',
        displayName: 'CLI',
        root: '/test/root1',
        manifestDir: '/test/root1/_cfg',
        priority: 1,
      };

      const lowPriorityOrigin: BmadOrigin = {
        kind: 'env',
        displayName: 'ENV',
        root: '/test/root2',
        manifestDir: '/test/root2/_cfg',
        priority: 2,
      };

      mockManifest = {
        agents: [
          {
            kind: 'agent' as const,
            source: 'manifest' as const,
            origin: highPriorityOrigin,
            moduleName: 'module1',
            name: 'agent',
            displayName: 'Agent',
            bmadRelativePath: 'bmad/module1/agents/agent.md',
            moduleRelativePath: 'module1/agents/agent.md',
            absolutePath: file1,
            exists: true,
            status: 'verified' as const,
          },
          {
            kind: 'agent' as const,
            source: 'manifest' as const,
            origin: lowPriorityOrigin,
            moduleName: 'module2',
            name: 'agent',
            displayName: 'Agent',
            bmadRelativePath: 'bmad/module2/agents/agent.md',
            moduleRelativePath: 'module2/agents/agent.md',
            absolutePath: file2,
            exists: true,
            status: 'verified' as const,
          },
        ],
        workflows: [],
        tasks: [],
        modules: [],
      };

      reader = new FileReader(mockManifest);

      const content = reader.readFile('agents/agent.md');
      expect(content).toBe('first match');
    });
  });

  describe('security model', () => {
    it('should only read files present in master manifest (non-absolute)', () => {
      const outsideFile = path.join(fixture.tmpDir, 'outside.md');
      fs.writeFileSync(outsideFile, 'outside content', 'utf-8');

      reader = new FileReader(mockManifest);

      expect(() => {
        reader.readFile('outside.md');
      }).toThrow(FileReadError);
    });

    it('should allow absolute paths (bypass manifest for system files)', () => {
      const absoluteFile = path.join(fixture.tmpDir, 'absolute.txt');
      fs.writeFileSync(absoluteFile, 'absolute content', 'utf-8');

      const content = reader.readFile(absoluteFile);
      expect(content).toBe('absolute content');
    });
  });
});
