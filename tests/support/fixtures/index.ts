import { test as base } from '@playwright/test';
import { MCPServerClient } from './mcp-server-client';

/**
 * Extended test fixtures for BMAD MCP Server testing
 * Provides auto-cleanup and reusable test infrastructure
 */
type TestFixtures = {
  mcpClient: MCPServerClient;
};

export const test = base.extend<TestFixtures>({
  mcpClient: async ({}, use) => {
    const client = new MCPServerClient(
      process.env.MCP_SERVER_URL || 'http://localhost:3000'
    );
    await client.connect();
    await use(client);
    await client.cleanup();
  },
});

export { expect } from '@playwright/test';
