#!/usr/bin/env node
/**
 * Display raw list-agents output for troubleshooting
 * This is a convenience wrapper around bmad-cli.mjs
 *
 * Usage: node scripts/show-list-agents.mjs
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(__dirname, 'bmad-cli.mjs');

console.log('Fetching agent list via bmad-cli...\n');

const child = spawn(
  'node',
  [
    cliPath,
    'tools/call',
    '{"name":"bmad-resources","arguments":{"operation":"agents"}}',
  ],
  {
    stdio: 'inherit',
  },
);

child.on('exit', (code) => {
  process.exit(code || 0);
});
