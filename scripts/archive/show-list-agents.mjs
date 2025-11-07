#!/usr/bin/env node
/**
 * Show sample output from list-agents command
 */

import { BMADServerLiteMultiToolGit } from '../build/server.js';

// Create server with a Git remote
const gitRemote =
  'git+https://github.com/mkellerman/BMAD-METHOD.git#debug-agent-workflow';
const server = new BMADServerLiteMultiToolGit(undefined, [gitRemote]);

console.log('Initializing server with Git remote...');

// Call listAgents which will trigger initialization
const result = await server.listAgents();

console.log('\n=== MARKDOWN OUTPUT ===\n');
console.log(result.content[0].text);
