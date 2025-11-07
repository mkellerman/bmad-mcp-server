import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simple LLM client
async function callLLM(messages) {
  const response = await fetch('http://localhost:4001/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4.1',
      messages,
      temperature: 0.1,
    }),
  });
  const data = await response.json();
  return data.choices[0].message.content;
}

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

// Simulate the test: Load agent via tool, then ask LLM to respond
console.log('\n=== Step 1: Load bmm-architect agent ===');
const toolResult = await client.callTool({
  name: 'bmm-architect',
  arguments: { message: 'What is your name and what are your duties?' },
});

const agentContent = toolResult.content[0].text;
console.log('Agent content length:', agentContent.length);
console.log('Has menu items:', agentContent.includes('<menu>'));

// Now pass this to LLM and get its response
console.log('\n=== Step 2: LLM processes agent content and responds ===');
const llmResponse = await callLLM([
  {
    role: 'system',
    content: agentContent, // Use agent content as system context
  },
  {
    role: 'user',
    content: 'What is your name and what are your duties?',
  },
]);
console.log('\n--- LLM Response ---');
console.log(llmResponse);

console.log('\n--- Menu Analysis ---');
const starCommands = llmResponse.match(/\*[a-z-]+/g) || [];
const numberedItems = llmResponse.match(/^\s*\d+\./gm) || [];
console.log(
  'Star commands in LLM response:',
  starCommands.length,
  starCommands,
);
console.log('Numbered items in LLM response:', numberedItems.length);
console.log('Contains "menu":', llmResponse.toLowerCase().includes('menu'));

await client.close();
process.exit(0);
