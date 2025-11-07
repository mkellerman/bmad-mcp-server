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

// Test bmad-resources with operation='workflows'
console.log('\n=== Testing bmad-resources with operation=workflows ===');
const workflowsResult = await client.callTool({
  name: 'bmad-resources',
  arguments: { operation: 'workflows' },
});

console.log('Result (first 1500 chars):');
console.log(workflowsResult.content[0].text.substring(0, 1500));

await client.close();
process.exit(0);
