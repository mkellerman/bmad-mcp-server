#!/usr/bin/env node
/**
 * Call a tool and display raw output for troubleshooting
 * This is a convenience wrapper around bmad-cli.mjs
 *
 * Usage: node scripts/show-tool-output.mjs <tool-name> [args-json]
 * Example: node scripts/show-tool-output.mjs bmad-resources '{"operation":"agents"}'
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(__dirname, 'bmad-cli.mjs');

const toolName = process.argv[2];
const argsJson = process.argv[3] || '{}';

if (!toolName) {
  console.error('Error: Tool name required');
  console.error(
    'Usage: node scripts/show-tool-output.mjs <tool-name> [args-json]',
  );
  console.error('');
  console.error('Examples:');
  console.error(
    '  node scripts/show-tool-output.mjs bmad-resources \'{"operation":"agents"}\'',
  );
  console.error(
    '  node scripts/show-tool-output.mjs bmm-debug \'{"message":"Hello"}\'',
  );
  process.exit(1);
}

console.log(`Calling tool ${toolName} via bmad-cli...\n`);

const callArgs = `{"name":"${toolName}","arguments":${argsJson}}`;

const child = spawn('node', [cliPath, 'tools/call', callArgs, '--raw'], {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
