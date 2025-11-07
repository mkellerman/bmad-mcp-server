#!/usr/bin/env node
import { BMADEngine } from '../build/core/bmad-engine.js';

const engine = new BMADEngine(process.cwd(), [
  'git+https://github.com/mkellerman/BMAD-METHOD.git#debug-agent-workflow:/bmad',
]);

await engine.initialize();

console.log('=== EXECUTING AGENT: pm ===');
const result = await engine.executeAgent({
  agent: 'pm',
  message: 'Help me create a product requirements document',
});

console.log('\n=== RESULT ===');
console.log('Success:', result.success);

console.log('\n=== FULL TEXT OUTPUT ===');
console.log(result.text);
console.log('=== END TEXT ===');
