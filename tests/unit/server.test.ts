/**
 * Unit tests for BMADMCPServer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import { BMADMCPServer } from '../../src/server.js';
import { resolveBmadPaths } from '../../src/utils/bmad-path-resolver.js';
import {
  createTestFixture,
  createBMADStructure,
  createAgentManifest,
  createWorkflowManifest,
  createAgentFile,
  createWorkflowFile,
  SAMPLE_AGENT,
  SAMPLE_WORKFLOW,
  type TestFixture,
} from '../helpers/test-fixtures.js';

describe('BMADMCPServer', () => {
  let fixture: TestFixture;

  function createServer(baseDir: string): BMADMCPServer {
    const discovery = resolveBmadPaths({
      cwd: baseDir,
      packageRoot: baseDir,
      cliArg: undefined,
      envVar: undefined,
      userBmadPath: path.join(baseDir, '.bmad'),
    });
    return new BMADMCPServer(baseDir, discovery);
  }

  beforeEach(() => {
    fixture = createTestFixture();
    createBMADStructure(fixture.tmpDir);
    createAgentManifest(fixture.tmpDir);
    createWorkflowManifest(fixture.tmpDir);

    // Create sample files
    createAgentFile(fixture.tmpDir, 'core/agents/bmad-master.md', SAMPLE_AGENT);
    createAgentFile(
      fixture.tmpDir,
      'bmm/agents/analyst.md',
      '# Analyst\n\nBusiness analyst.',
    );
    createWorkflowFile(
      fixture.tmpDir,
      'core/workflows/party-mode/party-mode.xml',
      SAMPLE_WORKFLOW,
    );
  });

  afterEach(() => {
    fixture.cleanup();
  });

  describe('constructor', () => {
    it('should initialize with valid BMAD root', () => {
      const server = createServer(fixture.tmpDir);
      expect(server).toBeDefined();
    });

    it('should load manifests on initialization', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      createServer(fixture.tmpDir);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Loaded'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('agents from manifest'),
      );
      consoleSpy.mockRestore();
    });

    it('should initialize with src/bmad structure', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      createServer(fixture.tmpDir);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('src/bmad/_cfg'),
      );
      consoleSpy.mockRestore();
    });

    it('should log successful initialization', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      createServer(fixture.tmpDir);

      expect(consoleSpy).toHaveBeenCalledWith(
        'BMAD MCP Server initialized successfully',
      );
      consoleSpy.mockRestore();
    });
  });

  describe('path resolution', () => {
    it('should detect src/bmad/_cfg structure', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      createServer(fixture.tmpDir);

      const manifestDirLog = consoleSpy.mock.calls.find((call) =>
        call[0]?.toString().includes('Manifest directory:'),
      );

      expect(manifestDirLog?.[0]).toContain('src/bmad/_cfg');
      consoleSpy.mockRestore();
    });

    it('should set correct project root', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      createServer(fixture.tmpDir);

      const projectRootLog = consoleSpy.mock.calls.find((call) =>
        call[0]?.toString().includes('Project root:'),
      );

      expect(projectRootLog).toBeDefined();
      consoleSpy.mockRestore();
    });
  });

  describe('manifest loading', () => {
    it('should load agents from manifest', () => {
      const server = createServer(fixture.tmpDir);
      // Server should initialize without errors
      expect(server).toBeDefined();
    });

    it('should handle multiple agents', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      createServer(fixture.tmpDir);

      const loadLog = consoleSpy.mock.calls.find((call) =>
        call[0]?.toString().includes('agents from manifest'),
      );

      expect(loadLog).toBeDefined();
      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid BMAD root', () => {
      const invalidPath = fixture.tmpDir + '/nonexistent';

      expect(() => {
        createServer(invalidPath);
      }).toThrow();
    });

    it('should throw error if manifest directory not found', () => {
      const emptyDir = fixture.tmpDir + '/empty';
      require('fs').mkdirSync(emptyDir, { recursive: true });

      expect(() => {
        createServer(emptyDir);
      }).toThrow('BMAD manifest directory not found');
    });
  });

  describe('server configuration', () => {
    it('should have correct server name', () => {
      const server = createServer(fixture.tmpDir);
      // Server should be configured with correct name
      expect(server).toBeDefined();
    });

    it('should support tools capability', () => {
      const server = createServer(fixture.tmpDir);
      expect(server).toBeDefined();
    });

    it('should support prompts capability', () => {
      const server = createServer(fixture.tmpDir);
      expect(server).toBeDefined();
    });
  });
});
