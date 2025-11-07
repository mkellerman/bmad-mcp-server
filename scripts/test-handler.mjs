#!/usr/bin/env node
import { BMADEngine } from '../build/core/bmad-engine.js';

const engine = new BMADEngine(process.cwd(), [
  'git+https://github.com/mkellerman/BMAD-METHOD.git#debug-agent-workflow:/bmad',
]);

await engine.initialize();

const agents = engine.getAgentMetadata();
console.log('Total agents:', agents.length);
console.log('\nFirst agent keys:', Object.keys(agents[0]));
console.log('\nFirst agent:', JSON.stringify(agents[0], null, 2));

const analyst = agents.find((a) => a.name === 'analyst');

console.log('=== ANALYST METADATA ===');
console.log('ID:', analyst?.id);
console.log('Name:', analyst?.name);
console.log('Role:', analyst?.role);
console.log('Module:', analyst?.module);
console.log('Workflows count:', analyst?.workflows?.length || 0);
console.log('Workflows:', analyst?.workflows);
console.log('\n=== WORKFLOW HANDLER ===');
console.log('Handler present:', !!analyst?.workflowHandlerInstructions);
console.log(
  'Handler length:',
  analyst?.workflowHandlerInstructions?.length || 0,
);

if (analyst?.workflowHandlerInstructions) {
  console.log('\n=== HANDLER CONTENT ===');
  console.log(analyst.workflowHandlerInstructions);
  console.log('\n=== END HANDLER ===');
} else {
  console.log('\n❌ NO HANDLER FOUND');
}
