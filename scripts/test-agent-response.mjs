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

// Test calling bmm-architect agent
console.log('\n=== Testing bmm-architect agent ===');
const result = await client.callTool({
  name: 'bmm-architect',
  arguments: { message: 'What is your name and what are your duties?' },
});

console.log('\n--- Agent Response ---');
console.log(result.content[0].text);

console.log('\n\n--- Checking for menu items ---');
const text = result.content[0].text;
const hasWorkflows = text.includes('workflow') || text.includes('Workflow');
const hasMenu =
  text.includes('*') || text.includes('menu') || text.includes('Menu');
const hasNumberedList = text.match(/\d+\./);

console.log('Contains "workflow":', hasWorkflows);
console.log('Contains menu markers:', hasMenu);
console.log('Has numbered list:', !!hasNumberedList);

// Count potential menu items
const starCommands = text.match(/\*[a-z-]+/g) || [];
const numberedItems = text.match(/^\s*\d+\./gm) || [];
console.log(
  'Star commands found:',
  starCommands.length,
  starCommands.slice(0, 5),
);
console.log('Numbered items found:', numberedItems.length);

await client.close();
process.exit(0);
