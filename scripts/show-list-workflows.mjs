#!/usr/bin/env node
/**
 * Display raw list-workflows output for troubleshooting
 * This is a convenience wrapper around bmad-cli.mjs
 *
 * Usage: node scripts/show-list-workflows.mjs
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(__dirname, 'bmad-cli.mjs');

console.log('Fetching workflow list via bmad-cli...\n');

const child = spawn(
  'node',
  [
    cliPath,
    'tools/call',
    '{"name":"bmad-resources","arguments":{"operation":"workflows"}}',
  ],
  {
    stdio: 'inherit',
  },
);

child.on('exit', (code) => {
  process.exit(code || 0);
});
