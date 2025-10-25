import { test, expect } from '../support/fixtures';

/**
 * E2E Tests for BMAD MCP Tool
 * Tests the unified BMAD tool functionality
 */
test.describe('BMAD MCP Tool', () => {
  test('should list all available agents', async ({ mcpClient }) => {
    const result = await mcpClient.callTool('bmad', {
      command: '*list-agents',
    });

    expect(result).toBeDefined();
    expect(result.content).toContain('Available BMAD Agents');
    expect(result.content).toContain('bmad-master');
    expect(result.content).toContain('analyst');
    expect(result.content).toContain('tea');
  });

  test('should list all available workflows', async ({ mcpClient }) => {
    const result = await mcpClient.callTool('bmad', {
      command: '*list-workflows',
    });

    expect(result).toBeDefined();
    expect(result.content).toContain('Available BMAD Workflows');
  });

  test('should load an agent by name', async ({ mcpClient }) => {
    const result = await mcpClient.callTool('bmad', {
      command: 'analyst',
    });

    expect(result).toBeDefined();
    expect(result.content).toContain('Mary');
    expect(result.content).toContain('Business Analyst');
  });

  test('should handle invalid agent name gracefully', async ({ mcpClient }) => {
    const result = await mcpClient.callTool('bmad', {
      command: 'nonexistent-agent',
    });

    expect(result).toBeDefined();
    expect(result.isError).toBe(true);
    expect(result.content).toContain('not found');
  });

  test('should provide help when requested', async ({ mcpClient }) => {
    const result = await mcpClient.callTool('bmad', {
      command: '*help',
    });

    expect(result).toBeDefined();
    expect(result.content).toContain('BMAD Command Reference');
    expect(result.content).toContain('Load agent');
    expect(result.content).toContain('Execute workflow');
  });
});
