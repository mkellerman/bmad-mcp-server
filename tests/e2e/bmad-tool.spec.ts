import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  MCPClientFixture,
  createMCPClient,
} from '../support/mcp-client-fixture';

/**
 * E2E Tests for BMAD MCP Tool
 * Tests the unified BMAD tool functionality
 */
describe('BMAD MCP Tool', () => {
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
