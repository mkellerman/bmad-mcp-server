#!/usr/bin/env node
/**
 * List available tools from the lite MCP server
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, '../build/lite/index-lite-git.js');

async function listTools() {
  console.error('📡 Starting Lite MCP server...\n');

  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      BMAD_ROOT: process.env.BMAD_ROOT || process.cwd(),
    },
  });

  let responseBuffer = '';
  let requestId = 1;

  // Suppress stderr unless there's an error
  let stderrBuffer = '';
  server.stderr.on('data', (data) => {
    stderrBuffer += data.toString();
  });

  server.stdout.on('data', (data) => {
    responseBuffer += data.toString();
    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);

        if (message.result && message.result.tools) {
          console.log('━'.repeat(80));
          console.log('📋 Available Tools (Agent-based)\n');

          const tools = message.result.tools;

          // Group by module
          const byModule = {};
          for (const tool of tools) {
            const parts = tool.name.split('-');
            const module = parts.length > 1 ? parts[0] : 'other';
            if (!byModule[module]) byModule[module] = [];
            byModule[module].push(tool);
          }

          for (const [module, moduleTools] of Object.entries(byModule).sort()) {
            console.log(
              `\n${module.toUpperCase()} Module (${moduleTools.length} tools):`,
            );
            console.log('─'.repeat(80));

            for (const tool of moduleTools) {
              const lines = tool.description.split('\n');
              const title = lines[0];
              const persona = lines.find((l) => l.startsWith('Persona:'));

              console.log(`\n  🔧 ${tool.name}`);
              console.log(`     ${title}`);
              if (persona) {
                console.log(`     ${persona}`);
              }

              // Show available actions if present
              const actionsStart =
                tool.description.indexOf('Available actions:');
              if (actionsStart > -1) {
                const actionsText = tool.description.substring(actionsStart);
                const actions = actionsText.split('\n').slice(1, 4); // First 3 actions
                if (actions.length > 0) {
                  console.log(
                    `     Actions: ${actions.join(', ').substring(0, 60)}...`,
                  );
                }
              }
            }
          }

          console.log('\n' + '━'.repeat(80));
          console.log(`\nTotal: ${tools.length} tools\n`);
          console.log('Usage:');
          console.log('  npm run lite:cli -- "<tool-name>" "<message>"');
          console.log(
            '  npm run lite:cli -- "bmm-analyst" "Show numbered menu"',
          );
          console.log('');

          server.kill();
          process.exit(0);
        }

        if (message.error) {
          console.error('Error:', message.error.message);
          console.error(stderrBuffer);
          server.kill();
          process.exit(1);
        }
      } catch {
        // Not valid JSON
      }
    }
  });

  // Wait for server ready
  const readyPromise = new Promise((resolve) => {
    const checkReady = (data) => {
      if (data.toString().includes('Lite MCP Server running')) {
        resolve();
      }
    };
    server.stderr.on('data', checkReady);
    setTimeout(resolve, 5000);
  });

  await readyPromise;

  // Initialize
  const initRequest = {
    jsonrpc: '2.0',
    id: requestId++,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'list-tools', version: '1.0.0' },
    },
  };

  server.stdin.write(JSON.stringify(initRequest) + '\n');
  await new Promise((resolve) => setTimeout(resolve, 100));

  // List tools
  const listRequest = {
    jsonrpc: '2.0',
    id: requestId++,
    method: 'tools/list',
    params: {},
  };

  server.stdin.write(JSON.stringify(listRequest) + '\n');

  setTimeout(() => {
    console.error('Timeout');
    console.error(stderrBuffer);
    server.kill();
    process.exit(1);
  }, 10000);
}

listTools().catch(console.error);
