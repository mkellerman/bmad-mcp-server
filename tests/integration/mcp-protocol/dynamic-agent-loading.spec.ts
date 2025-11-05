/**
 * Integration tests for dynamic agent loading
 *
 * Tests agent loading logic using MOCKED git cache (no real git operations).
 * Uses fixtures from tests/fixtures/git-cache/ to simulate cached repositories.
 *
 * These tests can run in parallel without git lock conflicts.
 * For actual git clone/fetch testing, see tests/integration/remote-api/
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClientFixture } from '../../support/mcp-client-fixture.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Dynamic Agent Loading (Mocked Git Cache)', () => {
  let client: MCPClientFixture;

  beforeAll(async () => {
    // Point git cache to our fixture directory
    const fixtureCachePath = path.join(__dirname, '../../fixtures/git-cache');
    console.log('🔍 Using fixture git cache:', fixtureCachePath);

    client = new MCPClientFixture({
      BMAD_GIT_CACHE_DIR: fixtureCachePath,
      BMAD_GIT_AUTO_UPDATE: 'false', // Disable git updates
      BMAD_DEBUG: 'true', // Enable debug logging
    });
    await client.setup();
  }, 30000);

  afterAll(async () => {
    await client.cleanup();
  });

  describe('@remote:agents/name command', () => {
    it('should load agent from mocked cache (no git operation)', async () => {
      const result = await client.callTool('bmad', {
        command: '@awesome:agents/debug-diana-v6/agents/debug',
      });

      expect(result.isError).toBe(false);
      expect(result.content).toContain('BMAD Agent:');
      expect(result.content).toContain('Diana');
      expect(result.content).toContain('Debug Specialist');
      expect(result.content).toContain('**Source:** awesome');
    }, 5000); // Fast - no git operations!

    it('should include agent instructions in loaded remote agent', async () => {
      const result = await client.callTool('bmad', {
        command: '@awesome:agents/debug-diana-v6/agents/debug',
      });

      expect(result.isError).toBe(false);
      // Agent content should be present (instructions are appended by config)
      expect(result.content).toContain('Diana');
      expect(result.content).toContain('Debug Specialist');
    }, 5000); // Fast!

    it('should handle nested agent paths', async () => {
      const result = await client.callTool('bmad', {
        command: '@awesome:agents/debug-diana-v6/agents/debug',
      });

      expect(result.isError).toBe(false);
      expect(result.content).toContain('BMAD Agent:');
      expect(result.content).toContain('Diana');
    }, 5000); // Fast!
  });

  describe('Error handling', () => {
    it('should return error for invalid remote name', async () => {
      const result = await client.callTool('bmad', {
        command: '@nonexistent:agents/test',
      });

      expect(result.isError).toBe(true);
      expect(result.content).toMatch(/Unknown Remote|not registered/i);
    }, 5000); // Fast - no network!

    it('should return error for non-existent agent in fixture', async () => {
      const result = await client.callTool('bmad', {
        command: '@awesome:agents/nonexistent-agent-xyz',
      });

      expect(result.isError).toBe(true);
      expect(result.content).toMatch(/Agent Not Found|not found/i);
    }, 5000); // Fast!

    it('should return error for invalid path format', async () => {
      const result = await client.callTool('bmad', {
        command: '@awesome:workflows/test', // Should be agents/, not workflows/
      });

      expect(result.isError).toBe(true);
      // Should not try to load it at all - parsing should fail
    }, 5000);
  });

  describe('Performance and caching', () => {
    it('should load agents quickly from mocked cache', async () => {
      // First load
      const start1 = Date.now();
      const result1 = await client.callTool('bmad', {
        command: '@awesome:agents/debug-diana-v6/agents/debug',
      });
      const duration1 = Date.now() - start1;

      expect(result1.isError).toBe(false);

      // Second load (agent content caching)
      const start2 = Date.now();
      const result2 = await client.callTool('bmad', {
        command: '@awesome:agents/debug-diana-v6/agents/debug',
      });
      const duration2 = Date.now() - start2;

      expect(result2.isError).toBe(false);
      expect(result2.content).toBe(result1.content);

      // Both should be fast (no git operations)
      console.log(
        `Mocked cache loads: First: ${duration1}ms, Second: ${duration2}ms`,
      );
      expect(duration1).toBeLessThan(5000);
      expect(duration2).toBeLessThan(5000);
    }, 10000);
  });
});
