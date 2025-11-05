#!/usr/bin/env node
/**
 * BMAD CLI - Direct command-line interface to MCP server
 *
 * This script spawns the actual MCP server and communicates via stdio,
 * giving you PRODUCTION behavior with CLI convenience.
 *
 * Usage:
 *   npm run cli -- "*list-agents"
 *   npm run cli -- "*prd" "git+https://github.com/mkellerman/BMAD-METHOD#debug-agent-workflow:bmad"
 *   npm run cli -- "architect" --mode=strict
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, '../build/index.js');

function parseArgs(argv) {
  const command = argv[2];
  const serverArgs = argv.slice(3);

  if (!command) {
    console.error('Usage: npm run cli -- "<command>" [args...]');
    console.error('Examples:');
    console.error('  npm run cli -- "*list-agents"');
    console.error('  npm run cli -- "*prd"');
    console.error('  npm run cli -- "architect"');
    console.error(
      '  npm run cli -- "*export-master-manifest" "git+https://github.com/..."',
    );
    process.exit(1);
  }

  return { command, serverArgs };
}

async function main() {
  const { command, serverArgs } = parseArgs(process.argv);

  console.error(`🎯 Executing: ${command}`);
  console.error(`📡 Starting MCP server...`);
  console.error('━'.repeat(60));

  // Spawn the MCP server as a child process
  const server = spawn('node', [serverPath, ...serverArgs], {
    stdio: ['pipe', 'pipe', 'pipe'], // stdin: pipe, stdout: pipe, stderr: pipe
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
      if (data.toString().includes('Server running on stdio')) {
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

  // Send JSON-RPC request to call the bmad tool
  const request = {
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
