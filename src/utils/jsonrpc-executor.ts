#!/usr/bin/env node
/**
 * JSON-RPC Executor Utility
 * Provides functions to execute JSON-RPC requests via stdio to MCP servers
 */

import { spawn } from 'child_process';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  id?: number | string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface JsonRpcExecutorOptions {
  serverPath?: string;
  timeout?: number;
  verbose?: boolean;
}

/**
 * Execute a JSON-RPC request against an MCP server via stdio
 */
export async function execJsonRpc(
  request: JsonRpcRequest,
  options: JsonRpcExecutorOptions = {},
): Promise<JsonRpcResponse> {
  const {
    serverPath = 'node build/index.js',
    timeout = 60000, // Increased to 60s for git cloning
    verbose = false,
  } = options;

  return new Promise((resolve, reject) => {
    // Parse command and arguments, handling quoted strings
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < serverPath.length; i++) {
      const char = serverPath[i];

      if (char === '"' && (i === 0 || serverPath[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    const [command, ...args] = parts;

    if (verbose) {
      console.error(`[DEBUG] Starting server: ${command} ${args.join(' ')}`);
      console.error(`[DEBUG] Request: ${JSON.stringify(request)}`);
    }

    const serverProcess = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      // Use shell: false to avoid deprecation warning
      // Our argument parsing above handles quoted strings
      shell: false,
    });

    let stdoutData = '';
    let stderrData = '';
    let serverReady = false;

    // Collect stderr and watch for server ready message
    serverProcess.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderrData += text;

      if (verbose) {
        console.error(`[SERVER STDERR] ${text.trimEnd()}`);
      }

      // Check for sources loaded message (this comes after server started and indicates loading is complete)
      // Match both "module" and "modules" to handle singular/plural
      if (
        text.includes('Loaded:') &&
        (text.includes('module') ||
          text.includes('agents') ||
          text.includes('workflows'))
      ) {
        if (!serverReady) {
          serverReady = true;

          if (verbose) {
            console.error(
              '[DEBUG] Server ready (sources loaded), sending request',
            );
          }

          // Send request now that server is ready
          try {
            const requestStr = JSON.stringify(request) + '\n';
            serverProcess.stdin.write(requestStr);
            serverProcess.stdin.end();
          } catch (error) {
            clearTimeout(timeoutId);
            serverProcess.kill('SIGTERM');
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            reject(new Error(`Failed to send request: ${errorMsg}`));
          }
        }
      }
    });

    // Collect stdout data
    serverProcess.stdout.on('data', (chunk: Buffer) => {
      stdoutData += chunk.toString();

      // Try to parse and resolve as soon as we get valid JSON
      // This allows us to exit early for fast responses
      try {
        const response = JSON.parse(stdoutData) as JsonRpcResponse;
        if (
          response.jsonrpc === '2.0' &&
          (response.result !== undefined || response.error !== undefined)
        ) {
          clearTimeout(timeoutId);

          if (verbose) {
            console.error('[DEBUG] Received complete response, killing server');
          }

          // Kill the server process since we got our response
          serverProcess.kill('SIGTERM');

          // Resolve immediately
          resolve(response);
        }
      } catch {
        // Not valid JSON yet, keep collecting
      }
    });

    // Handle process errors
    serverProcess.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to start server: ${error.message}`));
    });

    // Handle process exit
    serverProcess.on('exit', (code, _signal) => {
      clearTimeout(timeoutId);

      if (code !== 0 && code !== null) {
        if (verbose) {
          console.error(`[DEBUG] Server exited with code ${code}`);
          console.error(`[DEBUG] Stderr: ${stderrData}`);
        }

        // Try to parse response even on non-zero exit
        if (stdoutData.trim()) {
          try {
            const response = JSON.parse(stdoutData) as JsonRpcResponse;
            resolve(response);
            return;
          } catch {
            reject(
              new Error(
                `Server exited with code ${code}. Output: ${stdoutData}`,
              ),
            );
            return;
          }
        }

        reject(
          new Error(
            `Server exited with code ${code}. Stderr: ${stderrData || 'none'}`,
          ),
        );
        return;
      }

      // Parse the response
      if (!stdoutData.trim()) {
        reject(new Error('Server produced no output'));
        return;
      }

      try {
        const response = JSON.parse(stdoutData) as JsonRpcResponse;
        resolve(response);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        reject(
          new Error(
            `Failed to parse JSON response: ${errorMsg}. Output: ${stdoutData}`,
          ),
        );
      }
    });

    // Set timeout
    const timeoutId = setTimeout(() => {
      if (verbose) {
        console.error('[DEBUG] Request timeout, killing server process');
      }
      serverProcess.kill('SIGTERM');

      // Force kill if it doesn't exit gracefully
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
      }, 1000);

      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Create a JSON-RPC request object
 */
export function createRequest(
  method: string,
  params?: Record<string, unknown>,
  id: number | string = 1,
): JsonRpcRequest {
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    method,
    id,
  };

  if (params) {
    request.params = params;
  }

  return request;
}

/**
 * Call the bmad tool with specific operation and arguments
 */
export async function callBmadTool(
  operation: string,
  args: Record<string, unknown>,
  options: JsonRpcExecutorOptions = {},
): Promise<JsonRpcResponse> {
  const request = createRequest('tools/call', {
    name: 'bmad',
    arguments: { operation, ...args },
  });

  return execJsonRpc(request, options);
}

/**
 * List all MCP tools
 */
export async function listTools(
  options: JsonRpcExecutorOptions = {},
): Promise<JsonRpcResponse> {
  return execJsonRpc(createRequest('tools/list'), options);
}

/**
 * List all MCP resources
 */
export async function listResources(
  options: JsonRpcExecutorOptions = {},
): Promise<JsonRpcResponse> {
  return execJsonRpc(createRequest('resources/list'), options);
}

/**
 * Read an MCP resource
 */
export async function readResource(
  uri: string,
  options: JsonRpcExecutorOptions = {},
): Promise<JsonRpcResponse> {
  return execJsonRpc(createRequest('resources/read', { uri }), options);
}

/**
 * List BMAD agents
 */
export async function listAgents(
  module?: string,
  options: JsonRpcExecutorOptions = {},
): Promise<JsonRpcResponse> {
  const args: Record<string, unknown> = { query: 'agents' };
  if (module) {
    args.module = module;
  }
  return callBmadTool('list', args, options);
}

/**
 * List BMAD workflows
 */
export async function listWorkflows(
  module?: string,
  options: JsonRpcExecutorOptions = {},
): Promise<JsonRpcResponse> {
  const args: Record<string, unknown> = { query: 'workflows' };
  if (module) {
    args.module = module;
  }
  return callBmadTool('list', args, options);
}

/**
 * Read BMAD agent details
 */
export async function readAgent(
  agent: string,
  module?: string,
  options: JsonRpcExecutorOptions = {},
): Promise<JsonRpcResponse> {
  const args: Record<string, unknown> = {
    type: 'agent',
    agent,
  };
  if (module) {
    args.module = module;
  }
  return callBmadTool('read', args, options);
}

/**
 * Read BMAD workflow details
 */
export async function readWorkflow(
  workflow: string,
  module?: string,
  options: JsonRpcExecutorOptions = {},
): Promise<JsonRpcResponse> {
  const args: Record<string, unknown> = {
    type: 'workflow',
    workflow,
  };
  if (module) {
    args.module = module;
  }
  return callBmadTool('read', args, options);
}

/**
 * Execute a BMAD agent
 */
export async function executeAgent(
  agent: string,
  message: string,
  module?: string,
  options: JsonRpcExecutorOptions = {},
): Promise<JsonRpcResponse> {
  const args: Record<string, unknown> = {
    agent,
    message,
  };
  if (module) {
    args.module = module;
  }
  return callBmadTool('execute', args, options);
}

/**
 * Execute a BMAD workflow
 */
export async function executeWorkflow(
  workflow: string,
  message: string,
  module?: string,
  options: JsonRpcExecutorOptions = {},
): Promise<JsonRpcResponse> {
  const args: Record<string, unknown> = {
    workflow,
    message,
  };
  if (module) {
    args.module = module;
  }
  return callBmadTool('execute', args, options);
}

/**
 * Extract content from a bmad tool response
 */
export function extractBmadContent(response: JsonRpcResponse): unknown {
  if (response.error) {
    throw new Error(`BMAD Error: ${response.error.message}`);
  }

  const result = response.result as
    | { content?: Array<{ text?: string }> }
    | undefined;
  const first = result?.content?.[0];
  const text = first?.text;
  if (!first) {
    throw new Error('BMAD response missing content array');
  }
  if (!text || text.trim() === '') {
    // Gracefully return empty marker instead of throwing to improve UX
    return { success: false, error: 'Empty content', raw: first };
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
