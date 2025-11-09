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
const result = await client.listTools();

console.log('\nAll tools:');
result.tools.slice(0, 20).forEach((t) => {
  console.log(`  ${t.name}`);
  if (t.description) {
    console.log(`    ${t.description}`);
  }
});

console.log(`\nTotal tools: ${result.tools.length}`);

await client.close();
process.exit(0);
