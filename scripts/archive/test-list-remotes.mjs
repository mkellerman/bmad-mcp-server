#!/usr/bin/env node

/**
 * Test script for *list-remotes command
 * This simulates calling the MCP server with the *list-remotes command
 */

import { main } from '../build/server.js';

// Override process.argv to simulate MCP command
process.argv = [
  process.argv[0], // node
  process.argv[1], // script path
  'git+https://github.com/bmad-code-org/BMAD-METHOD#main:/bmad',
  '--remote=awesome,git+https://github.com/mkellerman/awesome-bmad-agents#main',
  '--remote=test,git+https://github.com/test/test-repo#main',
  '--mode=strict',
];

// Mock stdin to provide the *list-remotes command
import { Readable } from 'stream';
const mockStdin = new Readable({
  read() {
    // Send a simple list-remotes command via MCP protocol
    const request = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'bmad',
        arguments: {
          command: '*list-remotes',
        },
      },
    });
    this.push(request + '\n');
    this.push(null); // End stream
  },
});

// @ts-ignore - Override stdin for testing
process.stdin = mockStdin;

// Run the server
console.error('🧪 Testing *list-remotes command...\n');
main().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
