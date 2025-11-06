#!/usr/bin/env node
/**
 * Display raw list-resources output for troubleshooting
 * Usage: node scripts/show-list-resources.mjs [pattern]
 * Example: node scripts/show-list-resources.mjs "core/workflows/*.yaml"
 */

import { BMADServerLiteMultiToolGit } from '../build/server.js';

const pattern = process.argv[2];

console.log('Initializing server...\n');

// Create server with Git remote
const gitRemote =
  'git+https://github.com/mkellerman/BMAD-METHOD.git#debug-agent-workflow';
const server = new BMADServerLiteMultiToolGit(undefined, [gitRemote]);

// Initialize to load all tools
await server.initialize();

const args = pattern ? { operation: 'list', pattern } : { operation: 'list' };

console.log(
  `=== CALLING: bmad-resources (operation: list${pattern ? `, pattern: ${pattern}` : ''}) ===\n`,
);

try {
  const result = await server.callTool('bmad-resources', args);

  console.log('=== RAW OUTPUT (JSON) ===\n');
  console.log(JSON.stringify(result, null, 2));

  // Also show content in human-readable format
  if (result.content && Array.isArray(result.content)) {
    console.log('\n=== CONTENT (MARKDOWN) ===\n');
    result.content.forEach((item) => {
      if (item.type === 'text') {
        console.log(item.text);
      }
    });
  }

  // Show structured data if available
  if (result.structuredData) {
    console.log('\n=== STRUCTURED DATA ===\n');
    console.log(JSON.stringify(result.structuredData, null, 2));
  }
} catch (error) {
  console.error('=== ERROR ===');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}
