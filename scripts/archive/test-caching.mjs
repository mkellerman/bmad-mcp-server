#!/usr/bin/env node

/**
 * Test that caching works - initialization happens once at startup,
 * not on every request
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const serverPath = join(projectRoot, 'build/lite/index-lite-git.js');
const bmadRoots = [
  'git+https://github.com/mkellerman/BMAD-METHOD.git#main:/bmad',
];

console.log('🧪 Testing initialization caching...\n');

const serverProcess = spawn('node', [serverPath, ...bmadRoots], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env },
});

let initCount = 0;

serverProcess.stderr.on('data', (data) => {
  const output = data.toString();

  // Count initialization messages
  if (output.includes('Loaded') && output.includes('agents')) {
    initCount++;
    console.log(`✅ Initialization #${initCount}: ${output.trim()}`);
  }

  // Track other operations
  if (output.includes('Resolving')) {
    console.log(`📦 ${output.trim()}`);
  }
});

serverProcess.stdout.on('data', (data) => {
  const lines = data
    .toString()
    .split('\n')
    .filter((l) => l.trim());

  for (const line of lines) {
    try {
      const msg = JSON.parse(line);

      if (msg.id === 0 && msg.result) {
        console.log('✅ Server responded to initialize');

        // Send initialized notification
        setTimeout(() => {
          serverProcess.stdin.write(
            JSON.stringify({
              jsonrpc: '2.0',
              method: 'notifications/initialized',
            }) + '\n',
          );

          console.log('\n📨 Sending test requests...\n');

          // Send multiple requests to test caching
          setTimeout(() => {
            serverProcess.stdin.write(
              JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'resources/list',
              }) + '\n',
            );
          }, 100);

          setTimeout(() => {
            serverProcess.stdin.write(
              JSON.stringify({
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/list',
              }) + '\n',
            );
          }, 200);

          setTimeout(() => {
            serverProcess.stdin.write(
              JSON.stringify({
                jsonrpc: '2.0',
                id: 3,
                method: 'tools/call',
                params: {
                  name: 'bmad-discover',
                  arguments: { type: 'agents' },
                },
              }) + '\n',
            );
          }, 300);

          // Check results
          setTimeout(() => {
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📊 Test Results:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`Initialization count: ${initCount}`);

            if (initCount === 1) {
              console.log('\n✅ SUCCESS: Cache initialized once at startup');
              console.log('   Subsequent requests served from memory\n');
            } else {
              console.log(
                `\n❌ FAILED: Expected 1 initialization, got ${initCount}\n`,
              );
              serverProcess.kill();
              process.exit(1);
            }

            serverProcess.kill();
            process.exit(0);
          }, 1000);
        }, 100);
      }
    } catch {
      // Not JSON, ignore
    }
  }
});

// Initialize the connection
setTimeout(() => {
  serverProcess.stdin.write(
    JSON.stringify({
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-caching', version: '1.0.0' },
      },
    }) + '\n',
  );
}, 100);

serverProcess.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  serverProcess.kill();
  process.exit(0);
});
