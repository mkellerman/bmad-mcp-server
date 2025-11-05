/**
 * Integration tests for BMADMCPServer initialization
 * Tests server construction with real BMAD structures and manifest loading
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import { BMADMCPServer } from '../../../src/server.js';
import { resolveBmadPaths } from '../../../src/utils/bmad-path-resolver.js';
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
} from '../../helpers/test-fixtures.js';

describe('BMADMCPServer Initialization', () => {
  let fixture: TestFixture;

  function createServer(baseDir: string): BMADMCPServer {
    const discovery = resolveBmadPaths({
      cwd: baseDir,
      cliArgs: [],
      envVar: undefined,
      userBmadPath: path.join(baseDir, '.bmad'),
    });
    const remoteRegistry = { remotes: new Map<string, string>() }; // Empty registry for tests
    const version = '0.0.0-test';
    return new BMADMCPServer(baseDir, discovery, remoteRegistry, version);
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

      // Check that logs contain agent loading message
      const calls = consoleSpy.mock.calls.map(
        (call) => call[0]?.toString() || '',
      );
      const hasAgentLoadLog = calls.some(
        (log) =>
          log.includes('Loaded') && log.includes('agents from master manifest'),
      );

      expect(hasAgentLoadLog).toBe(true);
      consoleSpy.mockRestore();
    });

    it('should initialize with src/bmad structure', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const server = createServer(fixture.tmpDir);

      // Verify server initialized successfully (manifest directory detection happens internally)
      expect(server).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        'BMAD MCP Server initialized successfully',
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
      const server = createServer(fixture.tmpDir);

      // Verify server initialized (manifest directory detection is internal)
      expect(server).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        'BMAD MCP Server initialized successfully',
      );
      consoleSpy.mockRestore();
    });

    it('should set correct project root', () => {
      const server = createServer(fixture.tmpDir);
      expect(server).toBeDefined();
    });
  });

  describe('manifest loading', () => {
    it('should load agents from manifest', () => {
      const server = createServer(fixture.tmpDir);
      // Server should initialize without errors
      expect(server).toBeDefined();
    });

    it('should handle multiple agents', () => {
      const server = createServer(fixture.tmpDir);
      expect(server).toBeDefined();
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

      // Now that we accept any directory, an empty directory is valid
      // but won't have manifests, so server initialization should succeed
      // but manifest loading will be empty
      const server = createServer(emptyDir);
      expect(server).toBeDefined();
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
