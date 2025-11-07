#!/usr/bin/env node
import { BMADEngine } from '../build/core/bmad-engine.js';

const engine = new BMADEngine(process.cwd(), [
  'git+https://github.com/mkellerman/BMAD-METHOD.git#debug-agent-workflow:/bmad',
]);

await engine.initialize();

console.log('=== EXECUTING WORKFLOW ===');
const result = await engine.executeWorkflow({
  workflow: 'document-project',
  message: 'Document the bmad-mcp-server project',
});

console.log('\n=== RESULT ===');
console.log('Success:', result.success);
console.log('\n=== DATA ===');
console.log(JSON.stringify(result.data, null, 2));
console.log('\n=== TEXT LENGTH ===');
console.log(result.text.length);
console.log('\n=== CHECKING FOR HANDLER ===');
console.log(
  'Has handler section:',
  result.text.includes('<agent-workflow-handler'),
);
console.log(
  'agentWorkflowHandler in data:',
  !!result.data?.agentWorkflowHandler,
);
console.log(
  'Handler length:',
  (result.data?.agentWorkflowHandler || '').length,
);

console.log('\n=== FULL TEXT OUTPUT ===');
console.log(result.text);
console.log('=== END TEXT ===');
