import { test, expect } from '../support/fixtures';

/**
 * E2E Tests for MCP Server Health
 * Validates server is running and responsive
 */
test.describe('MCP Server Health', () => {
  test('should respond to health check', async ({ mcpClient }) => {
    const info = await mcpClient.getServerInfo();

    expect(info).toBeDefined();
    expect(info.name).toBe('bmad-mcp-server');
    expect(info.version).toBeDefined();
  });

  test('should list all available tools', async ({ mcpClient }) => {
    const tools = await mcpClient.listTools();

    expect(tools).toBeDefined();
    expect(tools.tools).toBeInstanceOf(Array);
    expect(tools.tools.length).toBeGreaterThan(0);

    // Verify BMAD tool is available
    const bmadTool = tools.tools.find((t: any) => t.name === 'bmad');
    expect(bmadTool).toBeDefined();
    expect(bmadTool.description).toContain('BMAD');
  });

  test('should have proper MCP protocol version', async ({ mcpClient }) => {
    const info = await mcpClient.getServerInfo();

    expect(info.protocolVersion).toBeDefined();
    expect(info.protocolVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
