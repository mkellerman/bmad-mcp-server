/**
 * MCP Client Fixture for E2E Testing
 * Provides a mock MCP client for testing tools
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MCPToolResult {
  content: string;
  isError: boolean;
}

export class MCPClientFixture {
  private client!: Client;
  private transport!: StdioClientTransport;

  async setup() {
    // Path to the built server
    const serverPath = path.join(__dirname, '../../build/index.js');

    // Create transport
    this.transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env: {
        ...process.env,
        BMAD_ROOT: path.join(__dirname, '../../src/bmad'),
      },
    });

    // Create client
    this.client = new Client(
      {
        name: 'bmad-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      },
    );

    // Connect
    await this.client.connect(this.transport);
  }

  async cleanup() {
    if (this.client) {
      await this.client.close();
    }
  }

  async getServerInfo() {
    const info = await this.client.getServerVersion();
    return info;
  }

  async listTools() {
    const tools = await this.client.listTools();
    return tools;
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    try {
      const result = await this.client.callTool({
        name,
        arguments: args,
      });

      // Extract content from MCP response
      const content =
        Array.isArray(result.content) && result.content[0]?.type === 'text'
          ? (result.content[0] as any).text
          : JSON.stringify(result.content);

      return {
        content,
        isError: (result as any).isError ?? false,
      };
    } catch (error) {
      return {
        content: error instanceof Error ? error.message : String(error),
        isError: true,
      };
    }
  }
}

export async function createMCPClient(): Promise<MCPClientFixture> {
  const client = new MCPClientFixture();
  await client.setup();
  return client;
}
