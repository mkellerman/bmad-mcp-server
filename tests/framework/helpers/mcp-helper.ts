/**
 * MCP Helper
 *
 * Utilities for testing Model Context Protocol (MCP) servers and clients.
 * Simplifies MCP communication, request/response validation, and metadata capture.
 *
 * Usage:
 * ```ts
 * import { MCPHelper } from './mcp-helper.js';
 *
 * const mcp = new MCPHelper({
 *   serverPath: './build/index.js',
 *   env: { BMAD_ROOT: '/path/to/bmad' },
 * });
 *
 * await mcp.connect();
 * const result = await mcp.callTool('bmad', { command: 'analyst' });
 * await mcp.disconnect();
 * ```
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type {
  ListToolsResult,
  GetPromptResult,
  ServerCapabilities,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP configuration
 */
export interface MCPConfig {
  /** Path to the server script (e.g., './build/index.js') */
  serverPath: string;
  /** Server command (defaults to 'node') */
  command?: string;
  /** Additional server arguments */
  args?: string[];
  /** Environment variables for server */
  env?: Record<string, string>;
  /** Client name */
  clientName?: string;
  /** Client version */
  clientVersion?: string;
  /** Client capabilities */
  capabilities?: ServerCapabilities;
}

/**
 * MCP tool call result with metadata
 */
export interface MCPToolResult {
  /** Tool call result content */
  content: string;
  /** Whether the call resulted in an error */
  isError: boolean;
  /** Duration of the call in milliseconds */
  duration: number;
  /** Timestamp when call was made */
  timestamp: string;
  /** Raw MCP response */
  raw: any;
}

/**
 * MCP interaction for test reporting
 */
export interface MCPInteraction {
  /** Unique interaction ID */
  id: string;
  /** Timestamp */
  timestamp: string;
  /** Type of interaction */
  type: 'tool_call' | 'list_tools' | 'get_prompt' | 'server_info';
  /** Tool name (for tool calls) */
  toolName?: string;
  /** Tool arguments (for tool calls) */
  toolArgs?: Record<string, unknown>;
  /** Response content */
  response: unknown;
  /** Duration in milliseconds */
  duration: number;
  /** Whether the interaction errored */
  isError: boolean;
  /** Error message if errored */
  error?: string;
}

/**
 * MCP Helper class
 */
export class MCPHelper {
  private config: Required<MCPConfig>;
  private client?: Client;
  private transport?: StdioClientTransport;
  private interactions: MCPInteraction[] = [];
  private connected = false;

  constructor(config: MCPConfig) {
    this.config = {
      command: 'node',
      args: [],
      env: {},
      clientName: 'bmad-test-client',
      clientVersion: '1.0.0',
      capabilities: {},
      ...config,
    };
  }

  /**
   * Connect to MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error('Already connected to MCP server');
    }

    const startTime = Date.now();

    try {
      // Create transport
      const env: Record<string, string> = {};
      // Copy process.env, filtering out undefined values
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) {
          env[key] = value;
        }
      }
      // Add config env vars
      Object.assign(env, this.config.env);

      this.transport = new StdioClientTransport({
        command: this.config.command,
        args: [this.config.serverPath, ...this.config.args],
        env,
      });

      // Create client
      this.client = new Client(
        {
          name: this.config.clientName,
          version: this.config.clientVersion,
        },
        {
          capabilities: this.config.capabilities,
        },
      );

      // Connect
      await this.client.connect(this.transport);
      this.connected = true;

      // Record interaction
      this.recordInteraction({
        type: 'server_info',
        response: { connected: true },
        duration: Date.now() - startTime,
        isError: false,
      });
    } catch (error) {
      this.recordInteraction({
        type: 'server_info',
        response: null,
        duration: Date.now() - startTime,
        isError: true,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected || !this.client) {
      return;
    }

    await this.client.close();
    this.connected = false;
    this.client = undefined;
    this.transport = undefined;
  }

  /**
   * Call an MCP tool
   *
   * @param name - Tool name
   * @param args - Tool arguments
   * @returns Tool result with metadata
   */
  async callTool(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<MCPToolResult> {
    this.ensureConnected();

    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const result = await this.client!.callTool({
        name,
        arguments: args,
      });

      const duration = Date.now() - startTime;

      // Extract content
      const content = this.extractContent(result);
      const isError = (result as any).isError ?? false;

      // Record interaction
      this.recordInteraction({
        type: 'tool_call',
        toolName: name,
        toolArgs: args,
        response: result,
        duration,
        isError,
      });

      return {
        content,
        isError,
        duration,
        timestamp,
        raw: result,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Record failed interaction
      this.recordInteraction({
        type: 'tool_call',
        toolName: name,
        toolArgs: args,
        response: null,
        duration,
        isError: true,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<ListToolsResult> {
    this.ensureConnected();

    const startTime = Date.now();

    try {
      const result = await this.client!.listTools();
      const duration = Date.now() - startTime;

      this.recordInteraction({
        type: 'list_tools',
        response: result,
        duration,
        isError: false,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordInteraction({
        type: 'list_tools',
        response: null,
        duration,
        isError: true,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Get a prompt
   *
   * @param name - Prompt name
   * @param args - Prompt arguments
   */
  async getPrompt(
    name: string,
    args?: Record<string, string>,
  ): Promise<GetPromptResult> {
    this.ensureConnected();

    const startTime = Date.now();

    try {
      const result = await this.client!.getPrompt({
        name,
        arguments: args,
      });
      const duration = Date.now() - startTime;

      this.recordInteraction({
        type: 'get_prompt',
        toolName: name,
        toolArgs: args,
        response: result,
        duration,
        isError: false,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordInteraction({
        type: 'get_prompt',
        toolName: name,
        toolArgs: args,
        response: null,
        duration,
        isError: true,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Get server version info
   */
  async getServerInfo(): Promise<{ name: string; version: string }> {
    this.ensureConnected();

    const info = await this.client!.getServerVersion();
    if (!info) {
      throw new Error('Failed to get server version');
    }
    return { name: info.name, version: info.version };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get all recorded interactions
   */
  getInteractions(): MCPInteraction[] {
    return [...this.interactions];
  }

  /**
   * Get the last interaction
   */
  getLastInteraction(): MCPInteraction | undefined {
    return this.interactions[this.interactions.length - 1];
  }

  /**
   * Clear interaction history
   */
  clearInteractions(): void {
    this.interactions = [];
  }

  /**
   * Get total duration of all interactions
   */
  getTotalDuration(): number {
    return this.interactions.reduce((sum, i) => sum + i.duration, 0);
  }

  /**
   * Get count of errors
   */
  getErrorCount(): number {
    return this.interactions.filter((i) => i.isError).length;
  }

  /**
   * Extract text content from MCP result
   */
  private extractContent(result: any): string {
    if (Array.isArray(result.content)) {
      const textContent = result.content.find((c: any) => c.type === 'text');
      if (textContent && 'text' in textContent) {
        return textContent.text;
      }
    }
    return JSON.stringify(result.content);
  }

  /**
   * Ensure client is connected
   */
  private ensureConnected(): void {
    if (!this.connected || !this.client) {
      throw new Error('MCP client is not connected. Call connect() first.');
    }
  }

  /**
   * Record an interaction
   */
  private recordInteraction(
    interaction: Omit<MCPInteraction, 'id' | 'timestamp'>,
  ): void {
    this.interactions.push({
      id: `interaction-${this.interactions.length + 1}`,
      timestamp: new Date().toISOString(),
      ...interaction,
    });
  }
}

/**
 * Create an MCP helper and auto-connect
 *
 * @param config - MCP configuration
 * @returns Connected MCP helper
 */
export async function createMCPHelper(config: MCPConfig): Promise<MCPHelper> {
  const helper = new MCPHelper(config);
  await helper.connect();
  return helper;
}

/**
 * Execute a function with an MCP helper, auto-connecting and disconnecting
 *
 * @param config - MCP configuration
 * @param fn - Function to execute with the helper
 * @returns Result of the function
 */
export async function withMCPHelper<T>(
  config: MCPConfig,
  // eslint-disable-next-line no-unused-vars
  fn: (_helper: MCPHelper) => Promise<T>,
): Promise<T> {
  const helper = new MCPHelper(config);
  try {
    await helper.connect();
    return await fn(helper);
  } finally {
    await helper.disconnect();
  }
}

/**
 * Validate MCP tool result
 *
 * @param result - Tool result to validate
 * @param expectations - Validation expectations
 * @returns Validation result
 */
export function validateMCPResult(
  result: MCPToolResult,
  expectations: {
    shouldError?: boolean;
    contentContains?: string | string[];
    contentMatches?: RegExp;
    maxDuration?: number;
  } = {},
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check error state
  if (expectations.shouldError !== undefined) {
    if (result.isError !== expectations.shouldError) {
      errors.push(
        `Expected ${expectations.shouldError ? 'error' : 'success'} but got ${result.isError ? 'error' : 'success'}`,
      );
    }
  }

  // Check content contains
  if (expectations.contentContains) {
    const patterns = Array.isArray(expectations.contentContains)
      ? expectations.contentContains
      : [expectations.contentContains];

    for (const pattern of patterns) {
      if (!result.content.includes(pattern)) {
        errors.push(`Expected content to contain "${pattern}"`);
      }
    }
  }

  // Check content matches regex
  if (expectations.contentMatches) {
    if (!expectations.contentMatches.test(result.content)) {
      errors.push(
        `Expected content to match pattern ${expectations.contentMatches}`,
      );
    }
  }

  // Check duration
  if (
    expectations.maxDuration !== undefined &&
    result.duration > expectations.maxDuration
  ) {
    errors.push(
      `Expected duration <= ${expectations.maxDuration}ms but got ${result.duration}ms`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
