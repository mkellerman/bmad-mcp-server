#!/usr/bin/env node
/**
 * Show sample output from enhanced list-workflows command
 */

import { BMADServerLiteMultiToolGit } from '../build/server.js';

// Create and initialize the server with a Git remote
const gitRemote =
  'git+https://github.com/mkellerman/BMAD-METHOD.git#debug-agent-workflow';
const server = new BMADServerLiteMultiToolGit(undefined, [gitRemote]);

console.log('Initializing server with Git remote...');
await server.initialize();

console.log('\n=== MARKDOWN OUTPUT ===\n');
const result = await server.listWorkflows();
console.log(result.content[0].text);

if (result.structuredData) {
  console.log('\n=== STRUCTURED DATA SUMMARY ===\n');
  console.log('Total workflows:', result.structuredData.summary.total);
  console.log(
    'Modules:',
    Object.keys(result.structuredData.summary.byGroup).join(', '),
  );
  console.log(
    'First 3 workflows:',
    result.structuredData.items
      .slice(0, 3)
      .map((w) => w.name)
      .join(', '),
  );
}
