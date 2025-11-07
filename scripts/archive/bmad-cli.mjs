#!/usr/bin/env node
/**
 * BMAD CLI - Direct command-line interface to MCP server
 *
 * This script spawns the actual MCP server and communicates via stdio,
 * giving you PRODUCTION behavior with CLI convenience.
 *
 * Usage:
 *   npm run cli -- "<command>" [bmad_roots...] [--lite]
 *   npm run cli -- "*list-agents"
 *   npm run cli -- "*prd" "git+https://github.com/mkellerman/BMAD-METHOD#main:/src/bmad"
 *   npm run cli -- "architect" --lite
 *   npm run cli -- "bmm-analyst" "Show menu" git+https://... --lite
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = argv.slice(2);

  if (args.length === 0) {
    console.error(
      'Usage: npm run cli -- [--tool=<tool>] [--command=<cmd>] [bmad_roots...] [--lite]',
    );
    console.error('\nExamples:');
    console.error('  Full server (positional):');
    console.error('    npm run cli -- "*list-agents"');
    console.error('    npm run cli -- "*prd"');
    console.error('    npm run cli -- "architect"');
    console.error('\n  Full server (named):');
    console.error('    npm run cli -- --command="*list-agents"');
    console.error('    npm run cli -- --command="*prd"');
    console.error('\n  Lite server (positional):');
    console.error('    npm run cli -- "bmm-analyst" "Show menu" --lite');
    console.error('    npm run cli -- "bmb-bmad-builder" --lite');
    console.error(
      '    npm run cli -- "bmad-discover" "agents" git+https://... --lite',
    );
    console.error('\n  Lite server (named):');
    console.error(
      '    npm run cli -- --tool="bmm-analyst" --command="Show menu" --lite',
    );
    console.error('    npm run cli -- --tool="bmb-bmad-builder" --lite');
    console.error(
      '    npm run cli -- --tool="bmad-discover" --command="agents" /path git+https://... --lite',
    );
    process.exit(1);
  }

  // Check for --lite flag
  const useLite = args.includes('--lite');

  // Extract named parameters
  let toolArg = null;
  let commandArg = null;
  const bmadRoots = [];
  const positionalArgs = [];

  for (const arg of args) {
    if (arg === '--lite') {
      continue;
    } else if (arg.startsWith('--tool=')) {
      toolArg = arg.substring(7);
    } else if (arg.startsWith('--command=')) {
      commandArg = arg.substring(10);
    } else if (!arg.startsWith('--')) {
      positionalArgs.push(arg);
    }
  }

  // If using named params, all positional args are BMAD roots
  if (toolArg !== null || commandArg !== null) {
    bmadRoots.push(...positionalArgs);
  } else {
    // Positional mode: parse based on context
    if (useLite) {
      // Lite: <tool> [<message>] [bmad_roots...]
      toolArg = positionalArgs[0] || '';

      // Second arg is message if it doesn't look like a path
      if (positionalArgs.length > 1) {
        const secondArg = positionalArgs[1];
        if (
          secondArg.startsWith('git+') ||
          secondArg.startsWith('/') ||
          secondArg.startsWith('.')
        ) {
          // It's a path, not a message
          bmadRoots.push(...positionalArgs.slice(1));
        } else {
          // It's a message
          commandArg = secondArg;
          bmadRoots.push(...positionalArgs.slice(2));
        }
      }
    } else {
      // Full mode: <command> [bmad_roots...]
      toolArg = positionalArgs[0] || '';
      bmadRoots.push(...positionalArgs.slice(1));
    }
  }

  const command = toolArg || '';
  const message = commandArg || '';

  // Default BMAD root if none provided (lite mode only)
  if (useLite && bmadRoots.length === 0) {
    bmadRoots.push(
      'git+https://github.com/mkellerman/BMAD-METHOD.git#main:/bmad',
    );
  }

  return { command, message, bmadRoots, useLite };
}

async function main() {
  const { command, message, bmadRoots, useLite } = parseArgs(process.argv);

  // Choose server path based on mode
  const serverPath = useLite
    ? path.join(__dirname, '../build/lite/index-lite-git.js')
    : path.join(__dirname, '../build/index.js');

  const serverMode = useLite ? 'Lite' : 'Full';

  console.error(`🎯 Mode: ${serverMode}`);
  console.error(`🎯 Executing: ${command}`);
  if (useLite && message) {
    console.error(`💬 Message: ${message}`);
  }
  if (bmadRoots.length > 0) {
    console.error(`📁 BMAD Roots: ${bmadRoots.join(', ')}`);
  }
  console.error(`� Starting MCP server...`);
  console.error('━'.repeat(60));

  // For lite mode, pass Git URLs as server args
  // For full mode, pass all args as server args
  const serverArgs = useLite
    ? bmadRoots.filter((r) => r.startsWith('git+'))
    : bmadRoots;

  // Spawn the MCP server as a child process
  const server = spawn('node', [serverPath, ...serverArgs], {
    stdio: ['pipe', 'pipe', 'pipe'], // stdin: pipe, stdout: pipe, stderr: pipe
    env: {
      ...process.env,
      // For lite mode with local paths, set BMAD_ROOT to first non-git path
      ...(useLite && bmadRoots.length > 0 && !bmadRoots[0].startsWith('git+')
        ? { BMAD_ROOT: bmadRoots[0] }
        : {}),
    },
  });

  let responseBuffer = '';
  let requestId = 1;

  // Forward stderr to console for logging
  server.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  // Listen for server output
  server.stdout.on('data', (data) => {
    responseBuffer += data.toString();

    // Try to parse complete JSON-RPC messages
    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);

        // Handle tool response
        if (message.result && message.result.content) {
          console.error('━'.repeat(60));
          console.error('✅ Response received\n');

          // Extract and display content
          const content = message.result.content;
          if (Array.isArray(content)) {
            for (const item of content) {
              if (item.type === 'text') {
                // Strip XML tags for cleaner CLI output
                const text = item.text
                  .replace(/<instructions>[\s\S]*?<\/instructions>/g, '')
                  .replace(/<context>[\s\S]*?<\/context>/g, '')
                  .replace(/<\/?content>/g, '')
                  .trim();
                console.log(text);
              }
            }
          }

          server.kill();
          process.exit(0);
        }

        // Handle errors
        if (message.error) {
          console.error('\n❌ Error:', message.error.message);
          server.kill();
          process.exit(1);
        }
      } catch {
        // Not valid JSON, skip
      }
    }
  });

  // Wait for server to initialize (look for "Server running" in stderr)
  let serverReady = false;
  const readyPromise = new Promise((resolve) => {
    const checkReady = (data) => {
      const output = data.toString();
      const readyMessage = useLite
        ? 'BMAD Lite Multi-Tool MCP Server'
        : 'Server running on stdio';

      if (output.includes(readyMessage)) {
        serverReady = true;
        resolve();
      }
    };
    server.stderr.on('data', checkReady);
    setTimeout(() => {
      if (!serverReady) {
        console.error('\n⚠️  Server initialization timeout');
        resolve();
      }
    }, 5000);
  });

  await readyPromise;

  if (!serverReady) {
    console.error('❌ Server failed to initialize');
    server.kill();
    process.exit(1);
  }

  console.error('📨 Sending MCP initialization...\n');

  // Send MCP initialization sequence
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

  server.stdin.write(JSON.stringify(initRequest) + '\n');

  // Wait a bit for initialization to complete
  await new Promise((resolve) => setTimeout(resolve, 100));

  console.error('📨 Sending command to server...\n');

  // Send JSON-RPC request to call the tool
  // For lite mode: call the agent tool with message
  // For full mode: call bmad tool with command
  const request = useLite
    ? {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'tools/call',
        params: {
          name: command,
          arguments: {
            message: message,
          },
        },
      }
    : {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'tools/call',
        params: {
          name: 'bmad',
          arguments: {
            command: command,
          },
        },
      };

  server.stdin.write(JSON.stringify(request) + '\n');

  // Handle timeout
  setTimeout(() => {
    console.error('\n⏱️  Timeout waiting for response');
    server.kill();
    process.exit(1);
  }, 30000); // 30 second timeout
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
