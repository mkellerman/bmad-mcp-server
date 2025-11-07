#!/usr/bin/env node
/**
 * Test virtual manifest generation
 * Tests reading bmad://_cfg/agent-manifest.csv and workflow-manifest.csv
 */
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const transport = new StdioClientTransport({
  command: 'node',
  args: [path.join(__dirname, '../build/index.js')],
  env: {
    ...process.env,
    BMAD_ROOT: path.join(__dirname, '../tests/fixtures'),
  },
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

console.log('\n=== Testing Virtual Agent Manifest ===');
try {
  const agentManifest = await client.readResource({
    uri: 'bmad://_cfg/agent-manifest.csv',
  });

  const content = agentManifest.contents[0].text;
  const lines = content.split('\n');

  console.log(`✅ Generated ${lines.length - 1} agent entries`);
  console.log('\nFirst 5 lines:');
  lines.slice(0, 5).forEach((line) => console.log(line));
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
  console.log('\nFirst 5 lines:');
  lines.slice(0, 5).forEach((line) => console.log(line));
} catch (error) {
  console.error('❌ Error:', error.message);
}

console.log('\n=== Testing Tool Manifest (should error) ===');
try {
  await client.readResource({
    uri: 'bmad://_cfg/tool-manifest.csv',
  });
  console.log('❌ Should have thrown error');
} catch (error) {
  console.log('✅ Expected error:', error.message);
}

await client.close();
process.exit(0);
