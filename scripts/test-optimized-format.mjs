#!/usr/bin/env node
import { BMADEngine } from '../build/core/bmad-engine.js';

const engine = new BMADEngine(process.cwd(), [
  'git+https://github.com/mkellerman/BMAD-METHOD.git#debug-agent-workflow:/bmad',
]);

await engine.initialize();

console.log('=== LISTING AGENTS AND THEIR WORKFLOWS ===\n');
const agentList = await engine.listAgents();
console.log('Total agents:', agentList.data.length);

// Find workflows offered by multiple agents
const workflowMap = new Map();
agentList.data.forEach((agent) => {
  agent.workflows?.forEach((workflow) => {
    if (!workflowMap.has(workflow)) {
      workflowMap.set(workflow, []);
    }
    workflowMap.get(workflow).push(agent.name);
  });
});

console.log('\nWorkflows offered by multiple agents:');
const multiAgentWorkflows = [];
for (const [workflow, agents] of workflowMap.entries()) {
  if (agents.length > 1) {
    console.log(`- ${workflow}: ${agents.join(', ')}`);
    multiAgentWorkflows.push(workflow);
  }
}

if (multiAgentWorkflows.length > 0) {
  console.log('\n=== TESTING OPTIMIZED AMBIGUOUS FORMAT ===\n');
  const testWorkflow = multiAgentWorkflows[0];
  console.log(`Testing with: ${testWorkflow}`);

  const result = await engine.executeWorkflow({
    workflow: testWorkflow,
  });

  if (result.ambiguous) {
    console.log('\n✅ Returned ambiguous result as expected\n');
    console.log('=== NEW OPTIMIZED FORMAT ===\n');
    console.log(result.text);
    console.log('\n=== METRICS ===');
    console.log('Text length:', result.text.length, 'chars');
    console.log('Estimated tokens:', Math.round(result.text.length / 4));
    console.log('Matches:', result.matches?.length);
  } else {
    console.log('❌ Expected ambiguous result, got single match');
  }
} else {
  console.log('\n⚠️  No multi-agent workflows found');
}
