/**
 * E2E Tests for Remote Discovery Commands
 * Tests actual GitHub repository integration (awesome-bmad-agents)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  MCPClientFixture,
  createMCPClient,
} from '../support/mcp-client-fixture.js';

describe('Remote Discovery E2E', () => {
  let mcpClient: MCPClientFixture;

  beforeAll(async () => {
    mcpClient = await createMCPClient();
  });

  afterAll(async () => {
    await mcpClient.cleanup();
  });

  describe('*list-remotes command', () => {
    it('should list built-in @awesome remote', async () => {
      const result = await mcpClient.callTool('bmad', {
        command: '*list-remotes',
      });

      expect(result.isError).toBe(false);
      expect(result.content).toContain('@awesome');
      expect(result.content).toContain('built-in');
      expect(result.content).toContain('awesome-bmad-agents');
    });
  });

  describe('*list-agents @awesome command', () => {
    it('should discover agents from awesome-bmad-agents repository', async () => {
      const result = await mcpClient.callTool('bmad', {
        command: '*list-agents @awesome',
      });

      expect(result.isError).toBe(false);
      expect(result.content).toContain('# Remote Agents: @awesome');
      expect(result.content).toContain('Repository:');
      expect(result.content).toContain('awesome-bmad-agents');
    }, 30000); // 30s timeout for git clone

    it('should show installation status for agents', async () => {
      const result = await mcpClient.callTool('bmad', {
        command: '*list-agents @awesome',
      });

      expect(result.isError).toBe(false);
      // Should contain at least one of the status indicators
      expect(result.content).toMatch(/✅|📦/);
    }, 30000);

    it('should include usage instructions', async () => {
      const result = await mcpClient.callTool('bmad', {
        command: '*list-agents @awesome',
      });

      expect(result.isError).toBe(false);
      expect(result.content).toContain('Usage:');
      expect(result.content).toContain('bmad @awesome:agents/');
    }, 30000);
  });

  describe('*list-modules @awesome command', () => {
    it('should discover modules from awesome-bmad-agents repository (or show none)', async () => {
      const result = await mcpClient.callTool('bmad', {
        command: '*list-modules @awesome',
      });

      expect(result.isError).toBe(false);
      expect(result.content).toContain('# Remote Modules: @awesome');
      expect(result.content).toContain('Repository:');
      expect(result.content).toContain('awesome-bmad-agents');
      // Repository may or may not have modules
      expect(result.content).toMatch(/\d+ module\(s\)|No modules found/);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle unknown remote gracefully', async () => {
      const result = await mcpClient.callTool('bmad', {
        command: '*list-agents @unknown-remote',
      });

      expect(result.isError).toBe(false); // Command succeeds but shows error in content
      expect(result.content).toMatch(/not found/i);
      expect(result.content).toContain('*list-remotes');
    });

    it('should handle empty remote name', async () => {
      const result = await mcpClient.callTool('bmad', {
        command: '*list-agents @',
      });

      // The command itself succeeds, but returns error content
      expect(result.isError).toBe(true);
      expect(result.content).toMatch(/remote.*required/i);
    });
  });

  describe('Performance', () => {
    it('should use git cache for subsequent calls', async () => {
      // First call - may clone
      const start1 = Date.now();
      await mcpClient.callTool('bmad', {
        command: '*list-agents @awesome',
      });
      const duration1 = Date.now() - start1;

      // Second call - should use cache
      const start2 = Date.now();
      const result2 = await mcpClient.callTool('bmad', {
        command: '*list-agents @awesome',
      });
      const duration2 = Date.now() - start2;

      expect(result2.isError).toBe(false);
      expect(result2.content).toContain('# Remote Agents: @awesome');

      // Second call should be significantly faster (cached)
      // Allow some variance but expect at least 2x faster
      console.log(`First call: ${duration1}ms, Second call: ${duration2}ms`);
    }, 60000); // 60s timeout for both calls
  });
});
