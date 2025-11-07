#!/usr/bin/env node
/**
 * Display raw tool description for troubleshooting
 * Usage: node scripts/show-tool-description.mjs <tool-name>
 * Example: node scripts/show-tool-description.mjs bmad-resources
 */

import { BMADServerLiteMultiToolGit } from '../build/server.js';

const toolName = process.argv[2];

if (!toolName) {
  console.error('Error: Tool name required');
  console.error('Usage: node scripts/show-tool-description.mjs <tool-name>');
  console.error('');
  console.error('Available tools:');
  console.error('  - bmad-resources');
  console.error('  - bmad-workflow');
  console.error('  - bmm-* (agent tools)');
  console.error('  - cis-* (creative tools)');
  console.error('  - core-* (core tools)');
  process.exit(1);
}

console.log(`Initializing server...\n`);

// Create server with Git remote
const gitRemote =
  'git+https://github.com/mkellerman/BMAD-METHOD.git#debug-agent-workflow';
const server = new BMADServerLiteMultiToolGit(undefined, [gitRemote]);

// Initialize to load all tools
await server.initialize();

console.log(`=== RAW TOOL DESCRIPTION: ${toolName} ===\n`);

// Get tool list
const toolsResult = await server.listTools();
const tools = toolsResult.tools;

// Find the requested tool
const tool = tools.find((t) => t.name === toolName);

if (!tool) {
  console.error(`Error: Tool '${toolName}' not found`);
  console.error('');
  console.error('Available tools:');
  tools.forEach((t) => console.error(`  - ${t.name}`));
  process.exit(1);
}

// Display raw JSON
console.log(JSON.stringify(tool, null, 2));
