import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  MCPClientFixture,
  createMCPClient,
} from '../../support/mcp-client-fixture';

/**
 * E2E Tests for MCP Server Health
 * Validates server is running and responsive
 */
describe('MCP Server Health', () => {
  let mcpClient: MCPClientFixture;

  beforeAll(async () => {
    mcpClient = await createMCPClient();
  });

  afterAll(async () => {
    await mcpClient.cleanup();
  });

  it('should respond to health check', async () => {
    const info = await mcpClient.getServerInfo();

    expect(info).toBeDefined();
    expect(info.name).toBe('bmad-mcp-server');
    expect(info.version).toBeDefined();
  });

  it('should list all available tools', async () => {
    const tools = await mcpClient.listTools();

    expect(tools).toBeDefined();
    expect(tools.tools).toBeInstanceOf(Array);
    expect(tools.tools.length).toBeGreaterThan(0);

    // Verify BMAD tool is available
    const bmadTool = tools.tools.find((t: any) => t.name === 'bmad');
    expect(bmadTool).toBeDefined();
    expect(bmadTool.description).toContain('BMAD');
  });

  it('should have proper server information', async () => {
    const info = await mcpClient.getServerInfo();

    expect(info).toBeDefined();
    expect(info.name).toBe('bmad-mcp-server');
    expect(info.version).toBeDefined();
  });
});
