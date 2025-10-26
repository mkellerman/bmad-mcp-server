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

  it('should list all available agents', async () => {
    const result = await mcpClient.callTool('bmad', {
      command: '*list-agents',
    });

    expect(result).toBeDefined();
    expect(result.content).toContain('Available BMAD Agents');
    expect(result.content).toContain('bmad-master');
    expect(result.content).toContain('analyst');
    expect(result.content).toContain('tea');
  });

  it('should list all available workflows', async () => {
    const result = await mcpClient.callTool('bmad', {
      command: '*list-workflows',
    });

    expect(result).toBeDefined();
    expect(result.content).toContain('Available BMAD Workflows');
  });

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

  it('should provide help when requested', async () => {
    const result = await mcpClient.callTool('bmad', {
      command: '*help',
    });

    expect(result).toBeDefined();
    expect(result.content).toMatch(/Command Reference/i);
    expect(result.content).toMatch(/Load.*agent/i);
    expect(result.content).toMatch(/Execute.*workflow/i);
  });
});
