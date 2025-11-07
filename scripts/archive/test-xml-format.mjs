#!/usr/bin/env node
/**
 * Test the new XML-based formatting by simulating an MCP call
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// MCP request for list-agents
const mcpRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'bmad',
    arguments: {
      command: '*list-agents',
    },
  },
};

console.log('Testing XML format with *list-agents command...\n');

const server = spawn('node', [path.join(projectRoot, 'build/index.js')], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    BMAD_ROOT: path.join(projectRoot, 'tests/fixtures/bmad-core-v6'),
  },
});

let stdout = '';
let stderr = '';

server.stdout.on('data', (data) => {
  stdout += data.toString();
});

server.stderr.on('data', (data) => {
  stderr += data.toString();
});

// Send the MCP request
server.stdin.write(JSON.stringify(mcpRequest) + '\n');
server.stdin.end();

setTimeout(() => {
  server.kill();

  // Parse the response (skip initialization logs)
  const lines = stdout.split('\n');
  const jsonLine = lines.find((line) => {
    try {
      const obj = JSON.parse(line);
      return obj.result && obj.result.content;
    } catch {
      return false;
    }
  });

  if (jsonLine) {
    const response = JSON.parse(jsonLine);
    const content = response.result.content;

    console.log('=== MCP Response Content ===\n');
    content.forEach((item, idx) => {
      console.log(`--- Content Item ${idx + 1} (type: ${item.type}) ---`);
      console.log(item.text);
      console.log('');
    });

    // Check for XML tags
    const hasInstructionsTag = content.some((item) =>
      item.text?.includes('<instructions>'),
    );
    const hasContentTag = content.some((item) =>
      item.text?.includes('<content>'),
    );

    console.log('\n=== Validation ===');
    console.log(
      `✓ Has <instructions> tag: ${hasInstructionsTag ? '✅' : '❌'}`,
    );
    console.log(`✓ Has <content> tag: ${hasContentTag ? '✅' : '❌'}`);
    console.log(
      `✓ No old INSTRUCTIONS wrapper: ${!content.some((item) => item.text?.includes('**INSTRUCTIONS:')) ? '✅' : '❌'}`,
    );
  } else {
    console.error('Failed to parse MCP response');
    console.log('STDOUT:', stdout);
    console.log('STDERR:', stderr);
  }
}, 3000);
