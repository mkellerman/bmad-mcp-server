/**
 * Unit tests for MCP Helper
 *
 * Note: These are lightweight integration tests that actually connect to the MCP server.
 * They skip gracefully if the server is not available.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  MCPHelper,
  createMCPHelper,
  withMCPHelper,
  validateMCPResult,
} from '../framework/helpers/mcp-helper.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPath = path.join(__dirname, '../../build/index.js');
const bmadSamplePath = path.join(__dirname, '../../.bmad/6.0.0-alpha.0/bmad');

let serverAvailable = false;

beforeAll(async () => {
  // Quick check if server can start
  try {
    const helper = new MCPHelper({
      serverPath,
      env: { BMAD_ROOT: bmadSamplePath },
    });
    await helper.connect();
    await helper.disconnect();
    serverAvailable = true;
  } catch {
    serverAvailable = false;
    console.log('⚠️  MCP server not available, skipping tests');
  }
});

describe('MCPHelper', () => {
  describe('constructor', () => {
    it('should create instance with required config', () => {
      const helper = new MCPHelper({
        serverPath: './build/index.js',
      });

      expect(helper).toBeInstanceOf(MCPHelper);
      expect(helper.isConnected()).toBe(false);
    });

    it('should use default values for optional config', () => {
      const helper = new MCPHelper({
        serverPath: './build/index.js',
      });

      expect(helper).toBeDefined();
    });

    it('should accept custom config options', () => {
      const helper = new MCPHelper({
        serverPath: './build/index.js',
        command: 'node',
        args: ['--verbose'],
        env: { DEBUG: '1' },
        clientName: 'test-client',
        clientVersion: '2.0.0',
      });

      expect(helper).toBeDefined();
    });
  });

  describe('connect and disconnect', () => {
    it('should connect to MCP server', async () => {
      if (!serverAvailable) return;

      const helper = new MCPHelper({
        serverPath,
        env: { BMAD_ROOT: bmadSamplePath },
      });

      await helper.connect();

      expect(helper.isConnected()).toBe(true);

      await helper.disconnect();
      expect(helper.isConnected()).toBe(false);
    });

    it('should record connection interaction', async () => {
      if (!serverAvailable) return;

      const helper = new MCPHelper({
        serverPath,
        env: { BMAD_ROOT: bmadSamplePath },
      });

      await helper.connect();

      const interactions = helper.getInteractions();
      expect(interactions.length).toBeGreaterThan(0);
      expect(interactions[0].type).toBe('server_info');

      await helper.disconnect();
    });

    it('should throw if trying to connect when already connected', async () => {
      if (!serverAvailable) return;

      const helper = new MCPHelper({
        serverPath,
        env: { BMAD_ROOT: bmadSamplePath },
      });

      await helper.connect();

      await expect(helper.connect()).rejects.toThrow('Already connected');

      await helper.disconnect();
    });
  });

  describe('callTool', () => {
    it('should call MCP tool and return result', async () => {
      if (!serverAvailable) return;

      const helper = new MCPHelper({
        serverPath,
        env: { BMAD_ROOT: bmadSamplePath },
      });

      await helper.connect();
      const result = await helper.callTool('bmad', { command: '*list-agents' });

      expect(result.content).toBeTruthy();
      expect(result.isError).toBe(false);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeTruthy();

      await helper.disconnect();
    });

    it('should record tool call interaction', async () => {
      if (!serverAvailable) return;

      const helper = new MCPHelper({
        serverPath,
        env: { BMAD_ROOT: bmadSamplePath },
      });

      await helper.connect();
      await helper.callTool('bmad', { command: '*list-agents' });

      const interactions = helper.getInteractions();
      const toolInteraction = interactions.find((i) => i.type === 'tool_call');
      expect(toolInteraction).toBeDefined();
      expect(toolInteraction?.toolName).toBe('bmad');

      await helper.disconnect();
    });

    it('should throw if not connected', async () => {
      const helper = new MCPHelper({
        serverPath,
      });

      await expect(helper.callTool('bmad', {})).rejects.toThrow(
        'not connected',
      );
    });
  });

  describe('listTools', () => {
    it('should list available tools', async () => {
      if (!serverAvailable) return;

      const helper = new MCPHelper({
        serverPath,
        env: { BMAD_ROOT: bmadSamplePath },
      });

      await helper.connect();
      const result = await helper.listTools();

      expect(result.tools).toBeDefined();
      expect(Array.isArray(result.tools)).toBe(true);

      await helper.disconnect();
    });
  });

  describe('getServerInfo', () => {
    it('should get server version info', async () => {
      if (!serverAvailable) return;

      const helper = new MCPHelper({
        serverPath,
        env: { BMAD_ROOT: bmadSamplePath },
      });

      await helper.connect();
      const info = await helper.getServerInfo();

      expect(info.name).toBeTruthy();
      expect(info.version).toBeTruthy();

      await helper.disconnect();
    });
  });

  describe('interaction tracking', () => {
    it('should track all interactions', async () => {
      if (!serverAvailable) return;

      const helper = new MCPHelper({
        serverPath,
        env: { BMAD_ROOT: bmadSamplePath },
      });

      await helper.connect();
      await helper.callTool('bmad', { command: '*list-agents' });

      const interactions = helper.getInteractions();
      expect(interactions.length).toBeGreaterThanOrEqual(2); // connect + tool call

      await helper.disconnect();
    });

    it('should get last interaction', async () => {
      if (!serverAvailable) return;

      const helper = new MCPHelper({
        serverPath,
        env: { BMAD_ROOT: bmadSamplePath },
      });

      await helper.connect();
      await helper.callTool('bmad', { command: '*list-agents' });

      const last = helper.getLastInteraction();
      expect(last?.type).toBe('tool_call');

      await helper.disconnect();
    });

    it('should clear interactions', async () => {
      if (!serverAvailable) return;

      const helper = new MCPHelper({
        serverPath,
        env: { BMAD_ROOT: bmadSamplePath },
      });

      await helper.connect();

      helper.clearInteractions();
      expect(helper.getInteractions()).toHaveLength(0);

      await helper.disconnect();
    });

    it('should calculate total duration', async () => {
      if (!serverAvailable) return;

      const helper = new MCPHelper({
        serverPath,
        env: { BMAD_ROOT: bmadSamplePath },
      });

      await helper.connect();
      await helper.callTool('bmad', { command: '*list-agents' });

      const totalDuration = helper.getTotalDuration();
      expect(totalDuration).toBeGreaterThanOrEqual(0);

      await helper.disconnect();
    });
  });

  describe('helper functions', () => {
    it('createMCPHelper should create and connect', async () => {
      if (!serverAvailable) return;

      const helper = await createMCPHelper({
        serverPath,
        env: { BMAD_ROOT: bmadSamplePath },
      });

      expect(helper.isConnected()).toBe(true);

      await helper.disconnect();
    });

    it('withMCPHelper should auto-connect and disconnect', async () => {
      if (!serverAvailable) return;

      const result = await withMCPHelper(
        {
          serverPath,
          env: { BMAD_ROOT: bmadSamplePath },
        },
        async (h) => {
          expect(h.isConnected()).toBe(true);
          return await h.callTool('bmad', { command: '*list-agents' });
        },
      );

      expect(result.content).toBeTruthy();
    });
  });

  describe('validateMCPResult', () => {
    it('should validate successful result', () => {
      const result = {
        content: 'Success',
        isError: false,
        duration: 100,
        timestamp: new Date().toISOString(),
        raw: {},
      };

      const validation = validateMCPResult(result, {
        shouldError: false,
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate error state', () => {
      const result = {
        content: 'Error occurred',
        isError: true,
        duration: 50,
        timestamp: new Date().toISOString(),
        raw: {},
      };

      const validation = validateMCPResult(result, {
        shouldError: true,
      });

      expect(validation.valid).toBe(true);
    });

    it('should validate content contains string', () => {
      const result = {
        content: 'Hello world from BMAD',
        isError: false,
        duration: 100,
        timestamp: new Date().toISOString(),
        raw: {},
      };

      const validation = validateMCPResult(result, {
        contentContains: 'BMAD',
      });

      expect(validation.valid).toBe(true);
    });

    it('should validate content contains multiple strings', () => {
      const result = {
        content: 'The analyst agent helps analyze requirements',
        isError: false,
        duration: 100,
        timestamp: new Date().toISOString(),
        raw: {},
      };

      const validation = validateMCPResult(result, {
        contentContains: ['analyst', 'requirements'],
      });

      expect(validation.valid).toBe(true);
    });

    it('should fail if content does not contain expected string', () => {
      const result = {
        content: 'Hello world',
        isError: false,
        duration: 100,
        timestamp: new Date().toISOString(),
        raw: {},
      };

      const validation = validateMCPResult(result, {
        contentContains: 'BMAD',
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Expected content to contain "BMAD"');
    });

    it('should validate content matches regex', () => {
      const result = {
        content: 'Version 2.1.0',
        isError: false,
        duration: 100,
        timestamp: new Date().toISOString(),
        raw: {},
      };

      const validation = validateMCPResult(result, {
        contentMatches: /\d+\.\d+\.\d+/,
      });

      expect(validation.valid).toBe(true);
    });

    it('should validate max duration', () => {
      const result = {
        content: 'Fast response',
        isError: false,
        duration: 50,
        timestamp: new Date().toISOString(),
        raw: {},
      };

      const validation = validateMCPResult(result, {
        maxDuration: 100,
      });

      expect(validation.valid).toBe(true);
    });

    it('should fail if duration exceeds max', () => {
      const result = {
        content: 'Slow response',
        isError: false,
        duration: 200,
        timestamp: new Date().toISOString(),
        raw: {},
      };

      const validation = validateMCPResult(result, {
        maxDuration: 100,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('duration');
    });

    it('should validate multiple expectations', () => {
      const result = {
        content: 'BMAD analyst agent',
        isError: false,
        duration: 50,
        timestamp: new Date().toISOString(),
        raw: {},
      };

      const validation = validateMCPResult(result, {
        shouldError: false,
        contentContains: ['BMAD', 'analyst'],
        contentMatches: /agent/,
        maxDuration: 100,
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});
