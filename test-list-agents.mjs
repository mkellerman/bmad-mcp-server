import { BMADEngine } from './build/core/bmad-engine.js';

const engine = new BMADEngine(undefined, [
  'git+https://github.com/mkellerman/BMAD-METHOD#debug-agent-workflow:/bmad/core',
  'git+https://github.com/mkellerman/BMAD-METHOD#debug-agent-workflow:/bmad/bmm',
]);

await engine.initialize();

const result = await engine.listAgents();
console.log('\n=== List Agents Result ===');
console.log(JSON.stringify(result.data, null, 2));
