#!/usr/bin/env node
import { BMADEngine } from '../build/core/bmad-engine.js';

const engine = new BMADEngine(process.cwd(), [
  'git+https://github.com/mkellerman/BMAD-METHOD.git#debug-agent-workflow:/bmad',
]);
await engine.initialize();

const agents = engine.getAgentMetadata();
const debugAgent = agents.find((a) => a.name === 'debug');

console.log('=== DEBUG AGENT ===');
console.log('Name:', debugAgent?.name);
console.log('Module:', debugAgent?.module);
console.log('Workflows:', debugAgent?.workflows);
console.log('Workflow paths:', debugAgent?.workflowPaths);
console.log('\n=== CHECKING FOR debug-quick ===');
console.log(
  'Has "debug-quick":',
  debugAgent?.workflows?.includes('debug-quick'),
);
console.log(
  'Has "quick-debug":',
  debugAgent?.workflows?.includes('quick-debug'),
);

if (debugAgent?.workflowPaths) {
  console.log('\n=== WORKFLOW PATHS ===');
  Object.entries(debugAgent.workflowPaths).forEach(([name, path]) => {
    console.log(`${name}: ${path}`);
  });

  console.log('\n=== CHECKING PATH MATCH ===');
  const match = Object.values(debugAgent.workflowPaths).find((path) =>
    path.includes('/debug-quick/workflow.yaml'),
  );
  console.log('Found path with "debug-quick":', match);
}
