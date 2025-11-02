import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  MCPClientFixture,
  createMCPClient,
} from '../support/mcp-client-fixture';

/**
 * E2E Tests for BMAD MCP Tool
 * Tests the unified BMAD tool functionality
 *
 * SKIP REASON: This test suite loads BMAD from multiple sources (local .bmad,
 * git caches, etc.), resulting in duplicate agent names across modules. The
 * test expects single agents but gets disambiguation prompts, which is correct
 * behavior for production but makes tests environment-dependent.
 *
 * TODO: Create isolated E2E environment with single BMAD source, or update
 * tests to use qualified agent names (e.g., "bmm/analyst").
 */
describe.skip('BMAD MCP Tool', () => {
  let mcpClient: MCPClientFixture;

  beforeAll(async () => {
    mcpClient = await createMCPClient();
  });

  afterAll(async () => {
    await mcpClient.cleanup();
  });

  // Discovery commands removed; skip listing tests

  it('should load an agent by name', async () => {
    const result = await mcpClient.callTool('bmad', {
      command: 'analyst',
    });

    expect(result).toBeDefined();
    expect(result.content).toContain('Mary');
    expect(result.content).toContain('Business Analyst');
  });

  it('should return actionable agent content (not display-only wrapper)', async () => {
    const result = await mcpClient.callTool('bmad', {
      command: 'analyst',
    });

    expect(result).toBeDefined();
    // Ensure the server did not wrap agent content with a display-only instruction
    expect(result.content).not.toContain(
      'INSTRUCTIONS: Display the content below to the user EXACTLY as written.',
    );
  });

  it('should handle invalid agent name gracefully', async () => {
    const result = await mcpClient.callTool('bmad', {
      command: 'nonexistent-agent',
    });

    expect(result).toBeDefined();
    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/not found|Agent.*not available/i);
  });

  // Help command removed; skip
});
