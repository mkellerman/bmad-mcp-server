import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClientFixture } from '../../support/mcp-client-fixture';
import path from 'node:path';

/**
 * Integration Tests for BMAD MCP Tool
 * Tests the unified BMAD tool functionality using test fixtures
 */
describe('BMAD MCP Tool', () => {
  let mcpClient: MCPClientFixture;

  beforeAll(async () => {
    // Create MCP client pointing to test fixtures
    const fixtureRoot = path.resolve(
      process.cwd(),
      'tests/fixtures/bmad-core-v6',
    );
    mcpClient = new MCPClientFixture({ BMAD_ROOT: fixtureRoot });
    await mcpClient.setup();
  });

  afterAll(async () => {
    await mcpClient.cleanup();
  });

  it('should load an agent by qualified name', async () => {
    const result = await mcpClient.callTool('bmad', {
      command: 'core/bmad-master',
    });

    expect(result).toBeDefined();
    expect(result.content).toContain('BMad Master');
    expect(result.content).toContain('Orchestrator');
  });

  it('should return actionable agent content (not display-only wrapper)', async () => {
    const result = await mcpClient.callTool('bmad', {
      command: 'bmb/bmad-builder',
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
