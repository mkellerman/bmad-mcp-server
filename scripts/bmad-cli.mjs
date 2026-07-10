#!/usr/bin/env node
/**
 * BMAD CLI - Direct MCP Server Communication Tool
 *
 * Spawns the actual MCP server and communicates via JSON-RPC over stdio.
 * This gives you PRODUCTION behavior with CLI convenience.
 *
 * Usage:
 *   node scripts/bmad-cli.mjs <method> [params-json]
 *
 * Examples:
 *   # List all tools
 *   node scripts/bmad-cli.mjs tools/list
 *
 *   # Call bmad tool to list agents
 *   node scripts/bmad-cli.mjs tools/call '{"name":"bmad","arguments":{"operation":"list","query":"agents"}}'
 *
 *   # Call bmad tool to execute workflow
 *   node scripts/bmad-cli.mjs tools/call '{"name":"bmad","arguments":{"operation":"execute","workflow":"prd","message":"Create PRD"}}'
 *
 *   # List resources
 *   node scripts/bmad-cli.mjs resources/list
 *
 *   # Read a resource
 *   node scripts/bmad-cli.mjs resources/read '{"uri":"bmad://core/config.yaml"}'
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = argv.slice(2);

  if (args.length === 0) {
    console.error('BMAD CLI - Direct MCP Server Communication');
    console.error('');
    console.error(
      'Usage: node scripts/bmad-cli.mjs <method> [params-json] [options]',
    );
    console.error('');
    console.error('Methods:');
    console.error('  tools/list              - List all available tools');
    console.error('  tools/call              - Call a specific tool');
    console.error('  resources/list          - List all available resources');
    console.error('  resources/read          - Read a specific resource');
    console.error('');
    console.error('Options:');
    console.error('  --raw                   - Show raw JSON-RPC messages');
    console.error(
      '  --git=<url>             - Use Git remote (default: BMAD-METHOD debug branch)',
    );
    console.error('');
    console.error('Examples:');
    console.error('  # List all tools');
    console.error('  node scripts/bmad-cli.mjs tools/list');
    console.error('');
    console.error('  # Call bmad tool to list agents');
    console.error(
      '  node scripts/bmad-cli.mjs tools/call \'{"name":"bmad","arguments":{"operation":"list","query":"agents"}}\'',
    );
    console.error('');
    console.error('  # Call bmad tool to execute workflow');
    console.error(
      '  node scripts/bmad-cli.mjs tools/call \'{"name":"bmad","arguments":{"operation":"execute","workflow":"prd"}}\'',
    );
    console.error('');
    console.error('  # List all resources');
    console.error('  node scripts/bmad-cli.mjs resources/list');
    console.error('');
    console.error('  # Read a specific resource');
    console.error(
      '  node scripts/bmad-cli.mjs resources/read \'{"uri":"bmad://core/config.yaml"}\'',
    );
    process.exit(1);
  }

  const method = args[0];
  let params = {};
  let showRaw = false;
  let gitRemote =
    'git+https://github.com/mkellerman/BMAD-METHOD.git#debug-agent-workflow:/bmad';

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--raw') {
      showRaw = true;
    } else if (arg.startsWith('--git=')) {
      gitRemote = arg.substring(6);
    } else if (!arg.startsWith('--')) {
      try {
        params = JSON.parse(arg);
      } catch (error) {
        console.error('Error: Invalid JSON for parameters');
        console.error(error.message);
        process.exit(1);
      }
    }
  }

  return { method, params, showRaw, gitRemote };
}

async function main() {
  const { method, params, showRaw, gitRemote } = parseArgs(process.argv);

  const serverPath = path.join(__dirname, '../build/index.js');

  console.error('━'.repeat(60));
  console.error('🚀 BMAD MCP Server CLI');
  console.error('━'.repeat(60));
  console.error(`📡 Method: ${method}`);
  if (Object.keys(params).length > 0) {
    console.error(`📋 Params: ${JSON.stringify(params, null, 2)}`);
  }
  console.error(`🔗 Git Remote: ${gitRemote}`);
  console.error(`🎨 Raw Mode: ${showRaw ? 'ON' : 'OFF'}`);
  console.error('━'.repeat(60));
  console.error('');

  // Spawn the MCP server
  const server = spawn('node', [serverPath, gitRemote], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env,
  });

  let responseBuffer = '';
  let requestId = 1;
  let methodCallId = -1; // Track the ID of our actual method call

  // Forward stderr for logging
  server.stderr.on('data', (data) => {
    if (showRaw) {
      process.stderr.write('[STDERR] ' + data.toString());
    } else {
      process.stderr.write(data);
    }
  });

  // Listen for server output
  server.stdout.on('data', (data) => {
    responseBuffer += data.toString();

    // Try to parse complete JSON-RPC messages
    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);

        if (showRaw) {
          console.error('━'.repeat(60));
          console.error('📨 RAW JSON-RPC MESSAGE:');
          console.error(JSON.stringify(message, null, 2));
          console.error('━'.repeat(60));
        }

        // Handle response - only process if it's for our method call, not initialization
        if (message.result !== undefined && message.id === methodCallId) {
          console.error('✅ Response received\n');

          if (showRaw) {
            console.log(JSON.stringify(message.result, null, 2));
          } else {
            // Pretty print based on method
            if (method === 'tools/list' && message.result.tools) {
              console.log(`Found ${message.result.tools.length} tools:\n`);
              message.result.tools.forEach((tool, idx) => {
                console.log(`${idx + 1}. ${tool.name}`);
                console.log(`   ${tool.description.split('\n')[0]}`);
              });
            } else if (
              method === 'resources/list' &&
              message.result.resources
            ) {
              console.log(
                `Found ${message.result.resources.length} resources:\n`,
              );
              message.result.resources.slice(0, 20).forEach((res, idx) => {
                console.log(`${idx + 1}. ${res.uri}`);
              });
              if (message.result.resources.length > 20) {
                console.log(
                  `... and ${message.result.resources.length - 20} more`,
                );
              }
            } else if (method === 'tools/call' && message.result.content) {
              for (const item of message.result.content) {
                if (item.type === 'text') {
                  console.log(item.text);
                }
              }
            } else {
              console.log(JSON.stringify(message.result, null, 2));
            }
          }

          server.kill();
          process.exit(0);
        }

        // Handle errors
        if (message.error) {
          console.error('\n❌ Error:', message.error.message);
          if (message.error.data) {
            console.error(
              'Details:',
              JSON.stringify(message.error.data, null, 2),
            );
          }
          server.kill();
          process.exit(1);
        }
      } catch {
        // Not valid JSON, skip
      }
    }
  });

  // Wait for server to initialize
  let serverReady = false;
  const readyPromise = new Promise((resolve) => {
    const checkReady = (data) => {
      const output = data.toString();
      if (output.includes('BMAD') && output.includes('MCP Server')) {
        serverReady = true;
        resolve();
      }
    };
    server.stderr.on('data', checkReady);
    setTimeout(() => {
      if (!serverReady) {
        console.error(
          '⚠️  Server initialization timeout (continuing anyway...)',
        );
        serverReady = true;
      }
      resolve();
    }, 3000);
  });

  await readyPromise;

  console.error('📨 Initializing MCP protocol...\n');

  // Send MCP initialization
  const initRequest = {
    jsonrpc: '2.0',
    id: requestId++,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'bmad-cli',
        version: '1.0.0',
      },
    },
  };

  if (showRaw) {
    console.error('📤 SENDING:');
    console.error(JSON.stringify(initRequest, null, 2));
  }

  server.stdin.write(JSON.stringify(initRequest) + '\n');

  // Wait for init to complete
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.error(`📨 Calling method: ${method}...\n`);

  // Send the actual request
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method: method,
    params: params,
  };

  // Track this request ID so we only process its response
  methodCallId = request.id;

  if (showRaw) {
    console.error('📤 SENDING:');
    console.error(JSON.stringify(request, null, 2));
  }

  server.stdin.write(JSON.stringify(request) + '\n');

  // Timeout handler
  setTimeout(() => {
    console.error('\n⏱️  Timeout waiting for response (30s)');
    server.kill();
    process.exit(1);
  }, 30000);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
