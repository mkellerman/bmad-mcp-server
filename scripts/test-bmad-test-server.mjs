#!/usr/bin/env node
/**
 * Test virtual manifest generation using bmad-test MCP server configuration
 * This uses the local build with Git remotes from .vscode/mcp.json
 */
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use same config as bmad-test from .vscode/mcp.json
const transport = new StdioClientTransport({
  command: 'node',
  args: [
    path.join(__dirname, '../build/index.js'),
    'git+https://github.com/mkellerman/BMAD-METHOD#debug-agent-workflow:/bmad/core',
    'git+https://github.com/mkellerman/BMAD-METHOD#debug-agent-workflow:/bmad/bmm',
  ],
});

const client = new Client(
  {
    name: 'test-client',
    version: '1.0.0',
  },
  {
    capabilities: {},
  },
);

await client.connect(transport);

console.log('\n=== Testing Virtual Agent Manifest (bmad-test config) ===');
try {
  const agentManifest = await client.readResource({
    uri: 'bmad://_cfg/agent-manifest.csv',
  });

  const content = agentManifest.contents[0].text;
  const lines = content.split('\n');

  console.log(`✅ Generated ${lines.length - 1} agent entries`);
  console.log('\nFirst 5 lines:');
  lines.slice(0, 5).forEach((line) => console.log(line));

  // Check for CIS agents (should NOT be present if virtual generation is working)
  const hasCIS =
    content.includes('"brainstorming-coach"') ||
    content.includes('"creative-problem-solver"') ||
    content.includes('"design-thinking-coach"');

  if (hasCIS) {
    console.log(
      '\n❌ PROBLEM: CSV contains CIS agents - this is from a physical file!',
    );
  } else {
    console.log(
      '\n✅ SUCCESS: No CIS agents found - virtual generation is working!',
    );
  }

  // Count actual entries
  const agents = lines.slice(1).filter((l) => l.trim()).length;
  console.log(`\nActual agent count: ${agents}`);
} catch (error) {
  console.error('❌ Error:', error.message);
}

console.log('\n=== Testing Virtual Workflow Manifest ===');
try {
  const workflowManifest = await client.readResource({
    uri: 'bmad://_cfg/workflow-manifest.csv',
  });

  const content = workflowManifest.contents[0].text;
  const lines = content.split('\n');

  console.log(`✅ Generated ${lines.length - 1} workflow entries`);
  console.log('\nFirst 3 lines:');
  lines.slice(0, 3).forEach((line) => console.log(line));
} catch (error) {
  console.error('❌ Error:', error.message);
}

await client.close();
process.exit(0);
