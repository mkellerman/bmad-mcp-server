#!/usr/bin/env node
/**
 * BMAD MCP CLI Tester
 * Command-line tool for testing and debugging the BMAD MCP Server
 */

/* eslint-disable no-console */

import { Command } from 'commander';
import {
  listTools,
  listResources,
  readResource,
  listAgents,
  listWorkflows,
  readAgent,
  readWorkflow,
  executeAgent,
  executeWorkflow,
  execJsonRpc,
  createRequest,
  extractBmadContent,
  type JsonRpcExecutorOptions,
} from './utils/jsonrpc-executor.js';

const program = new Command();

// Common options interface
interface GlobalOptions {
  server?: string;
  verbose?: boolean;
  raw?: boolean;
  path?: string | string[];
  mode?: 'strict' | 'local' | 'user' | 'first' | 'auto';
}

/**
 * Format and print JSON output
 */
function printOutput(data: unknown, raw: boolean): void {
  if (raw) {
    console.log(JSON.stringify(data));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Handle errors consistently
 */
function handleError(error: unknown): never {
  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error(`Error: ${String(error)}`);
  }
  process.exit(1);
}

/**
 * Extract executor options from global options
 */
function getExecutorOptions(opts: GlobalOptions): JsonRpcExecutorOptions {
  // Build server command with BMAD sources if specified
  let serverPath = opts.server || 'node build/index.js';

  if (opts.path) {
    // Support single or multiple paths
    // Pass them as command-line arguments (same as mcp.json)
    const paths = Array.isArray(opts.path) ? opts.path : [opts.path];

    // Append paths as arguments to the server command
    // This matches the behavior of mcp.json configuration
    for (const path of paths) {
      serverPath += ` "${path}"`;
    }
  }

  // Add discovery mode (default: first)
  const mode = opts.mode || 'first';
  serverPath += ` --mode=${mode}`;

  return {
    serverPath,
    verbose: opts.verbose,
  };
}

// Configure program
program
  .name('bmad-cli')
  .description('CLI tool for testing and debugging the BMAD MCP Server')
  .version('1.0.0')
  .option('-s, --server <path>', 'Server command path', 'node build/index.js')
  .option(
    '-p, --path <path>',
    'BMAD source path (can be specified multiple times for multi-source)',
    (value: string, previous: string[] | undefined) => {
      return previous ? [...previous, value] : [value];
    },
    undefined,
  )
  .option(
    '-m, --mode <mode>',
    'Discovery mode: strict, local, user, first, or auto',
    'first',
  )
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option('-r, --raw', 'Output raw JSON (no pretty-printing)', false);

// List Tools Command
program
  .command('tools')
  .description('List all MCP tools')
  .action(async () => {
    try {
      const opts = program.opts<GlobalOptions>();
      const response = await listTools(getExecutorOptions(opts));

      if (opts.raw) {
        printOutput(response, true);
      } else {
        interface Tool {
          name: string;
          description?: string;
        }
        const result = response.result as { tools?: Tool[] };
        const tools = result?.tools || [];
        console.log('Available Tools:');
        tools.forEach((tool) => {
          console.log(
            `  ${tool.name}: ${tool.description || 'No description'}`,
          );
        });
      }
    } catch (error) {
      handleError(error);
    }
  });

// List Resources Command
program
  .command('resources')
  .description('List all MCP resources')
  .action(async () => {
    try {
      const opts = program.opts<GlobalOptions>();
      const response = await listResources(getExecutorOptions(opts));

      if (opts.raw) {
        printOutput(response, true);
      } else {
        interface Resource {
          uri: string;
          name: string;
          description?: string;
        }
        const result = response.result as { resources?: Resource[] };
        const resources = result?.resources || [];
        console.log('Available Resources:');
        resources.forEach((resource) => {
          console.log(`  ${resource.uri}`);
          console.log(`    Name: ${resource.name}`);
          if (resource.description) {
            console.log(`    Description: ${resource.description}`);
          }
        });
      }
    } catch (error) {
      handleError(error);
    }
  });

// Read Resource Command
program
  .command('read-resource <uri>')
  .description('Read a specific MCP resource')
  .action(async (uri: string) => {
    try {
      const opts = program.opts<GlobalOptions>();
      const response = await readResource(uri, getExecutorOptions(opts));

      if (opts.raw) {
        printOutput(response, true);
      } else {
        interface ResourceContent {
          text?: string;
        }
        const result = response.result as { contents?: ResourceContent[] };
        const content = result?.contents?.[0]?.text;
        if (content) {
          console.log(content);
        } else {
          console.log('No content available');
        }
      }
    } catch (error) {
      handleError(error);
    }
  });

// List Agents Command
program
  .command('agents')
  .description('List all BMAD agents')
  .option('-m, --module <module>', 'Filter by module (bmm, core, cis)')
  .action(async (options: { module?: string }) => {
    try {
      const opts = program.opts<GlobalOptions>();
      const response = await listAgents(
        options.module,
        getExecutorOptions(opts),
      );

      if (opts.raw) {
        printOutput(response, true);
      } else {
        interface Agent {
          name: string;
          title?: string;
          module?: string;
          description?: string;
        }
        const agents = extractBmadContent(response) as Agent[];
        console.log('Available Agents:');
        agents.forEach((agent) => {
          console.log(
            `  ${agent.name} (${agent.module || 'unknown'}): ${agent.title || 'No title'}`,
          );
          if (agent.description) {
            console.log(`    ${agent.description}`);
          }
        });
      }
    } catch (error) {
      handleError(error);
    }
  });

// List Workflows Command
program
  .command('workflows')
  .description('List all BMAD workflows')
  .option('-m, --module <module>', 'Filter by module (bmm, core, cis)')
  .action(async (options: { module?: string }) => {
    try {
      const opts = program.opts<GlobalOptions>();
      const response = await listWorkflows(
        options.module,
        getExecutorOptions(opts),
      );

      if (opts.raw) {
        printOutput(response, true);
      } else {
        interface Workflow {
          name: string;
          title?: string;
          module?: string;
          description?: string;
        }
        const workflows = extractBmadContent(response) as Workflow[];
        console.log('Available Workflows:');
        workflows.forEach((workflow) => {
          console.log(
            `  ${workflow.name} (${workflow.module || 'unknown'}): ${workflow.title || 'No title'}`,
          );
          if (workflow.description) {
            console.log(`    ${workflow.description}`);
          }
        });
      }
    } catch (error) {
      handleError(error);
    }
  });

// Read Agent Command
program
  .command('read-agent <name>')
  .description('Read details about a specific BMAD agent')
  .option('-m, --module <module>', 'Specify module (bmm, core, cis)')
  .action(async (name: string, options: { module?: string }) => {
    try {
      const opts = program.opts<GlobalOptions>();
      const response = await readAgent(
        name,
        options.module,
        getExecutorOptions(opts),
      );

      if (opts.raw) {
        printOutput(response, true);
      } else {
        const agentData = extractBmadContent(response);
        printOutput(agentData, false);
      }
    } catch (error) {
      handleError(error);
    }
  });

// Read Workflow Command
program
  .command('read-workflow <name>')
  .description('Read details about a specific BMAD workflow')
  .option('-m, --module <module>', 'Specify module (bmm, core, cis)')
  .action(async (name: string, options: { module?: string }) => {
    try {
      const opts = program.opts<GlobalOptions>();
      const response = await readWorkflow(
        name,
        options.module,
        getExecutorOptions(opts),
      );

      if (opts.raw) {
        printOutput(response, true);
      } else {
        const workflowData = extractBmadContent(response);
        printOutput(workflowData, false);
      }
    } catch (error) {
      handleError(error);
    }
  });

// Execute Agent Command
program
  .command('exec-agent <name> <message>')
  .description('Execute a BMAD agent with a message')
  .option('-m, --module <module>', 'Specify module (bmm, core, cis)')
  .action(
    async (name: string, message: string, options: { module?: string }) => {
      try {
        const opts = program.opts<GlobalOptions>();
        const response = await executeAgent(
          name,
          message,
          options.module,
          getExecutorOptions(opts),
        );

        if (opts.raw) {
          printOutput(response, true);
        } else {
          interface TextContent {
            type: string;
            text: string;
          }
          const result = response.result as { content?: TextContent[] };
          const content = result?.content;
          if (content) {
            content.forEach((item) => {
              if (item.type === 'text') {
                console.log(item.text);
              }
            });
          } else {
            console.log('No response from agent');
          }
        }
      } catch (error) {
        handleError(error);
      }
    },
  );

// Execute Workflow Command
program
  .command('exec-workflow <name> <message>')
  .description('Execute a BMAD workflow with a message')
  .option('-m, --module <module>', 'Specify module (bmm, core, cis)')
  .action(
    async (name: string, message: string, options: { module?: string }) => {
      try {
        const opts = program.opts<GlobalOptions>();
        const response = await executeWorkflow(
          name,
          message,
          options.module,
          getExecutorOptions(opts),
        );

        if (opts.raw) {
          printOutput(response, true);
        } else {
          interface TextContent {
            type: string;
            text: string;
          }
          const result = response.result as { content?: TextContent[] };
          const content = result?.content;
          if (content) {
            content.forEach((item) => {
              if (item.type === 'text') {
                console.log(item.text);
              }
            });
          } else {
            console.log('No response from workflow');
          }
        }
      } catch (error) {
        handleError(error);
      }
    },
  );

// Generic Call Command
program
  .command('call <tool> <args>')
  .description('Call any MCP tool with JSON arguments')
  .action(async (tool: string, argsStr: string) => {
    try {
      const opts = program.opts<GlobalOptions>();

      // Parse JSON arguments
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(argsStr) as Record<string, unknown>;
      } catch {
        throw new Error('Arguments must be valid JSON');
      }

      const request = createRequest('tools/call', {
        name: tool,
        arguments: args,
      });

      const response = await execJsonRpc(request, getExecutorOptions(opts));
      printOutput(response, opts.raw || false);
    } catch (error) {
      handleError(error);
    }
  });

// Raw JSON-RPC Command
program
  .command('jsonrpc <method> [params]')
  .description('Send a raw JSON-RPC request')
  .action(async (method: string, paramsStr?: string) => {
    try {
      const opts = program.opts<GlobalOptions>();

      let params: Record<string, unknown> | undefined;
      if (paramsStr) {
        try {
          params = JSON.parse(paramsStr) as Record<string, unknown>;
        } catch {
          throw new Error('Params must be valid JSON');
        }
      }

      const request = createRequest(method, params);
      const response = await execJsonRpc(request, getExecutorOptions(opts));
      printOutput(response, opts.raw || false);
    } catch (error) {
      handleError(error);
    }
  });

// Parse and execute
program.parse();
