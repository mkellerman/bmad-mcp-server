#!/usr/bin/env node
import { BMADEngine } from '../build/core/bmad-engine.js';

const engine = new BMADEngine(process.cwd(), [
  'git+https://github.com/mkellerman/BMAD-METHOD.git#debug-agent-workflow:/bmad',
]);
await engine.initialize();

const agents = engine.getAgentMetadata();
const agentsWithWorkflows = agents.filter((a) => a.workflows?.length > 0);

console.log('=== AGENTS WITH WORKFLOWS ===');
agentsWithWorkflows.forEach((a) => {
  console.log(`\nAgent: ${a.name} (${a.module})`);
  console.log(`  Workflows: ${a.workflows.join(', ')}`);
  console.log(`  Handler: ${a.workflowHandlerInstructions ? 'YES' : 'NO'}`);
});

console.log('\n\n=== TESTING NON-STANDALONE WORKFLOW ===');
// Use actual workflow name from manifest, not agent menu name
const result = await engine.executeWorkflow({
  workflow: 'debug-quick', // This matches the manifest
  module: 'bmm', // Specify module to avoid ambiguity
  message: 'Debug this issue',
});

console.log('Success:', result.success);
console.log('Agent:', result.data?.agent);
console.log('Has handler:', !!result.data?.agentWorkflowHandler);
console.log(
  '\nPrompt includes agent loading:',
  result.text?.includes('persona is not already loaded'),
);
console.log('\n=== EXECUTION PROMPT ===');
console.log(result.text);
