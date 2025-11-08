#!/usr/bin/env node
import { BMADEngine } from '../build/core/bmad-engine.js';

// Use test fixtures which have multiple agents offering same workflows
const engine = new BMADEngine('./tests/fixtures');

await engine.initialize();

console.log('=== TESTING OPTIMIZED AMBIGUOUS WORKFLOW FORMAT ===\n');

// Test with a workflow that we know has multiple agents in fixtures
const result = await engine.executeWorkflow({
  workflow: 'brainstorm-project',
});

console.log('Result type:', result.ambiguous ? 'AMBIGUOUS' : 'SINGLE');

if (result.ambiguous) {
  console.log('✅ Returned ambiguous result as expected\n');
  console.log('=== OPTIMIZED FORMAT OUTPUT ===\n');
  console.log(result.text);
  console.log('\n=== TOKEN EFFICIENCY METRICS ===');
  console.log('Text length:', result.text.length, 'chars');
  console.log('Estimated tokens:', Math.round(result.text.length / 4));
  console.log('Agent options:', result.matches?.length);

  // Calculate old format estimate
  const oldFormatEstimate = result.matches.length * 280;
  const newFormatActual = Math.round(result.text.length / 4);
  const savings = oldFormatEstimate - newFormatActual;
  const savingsPercent = Math.round((savings / oldFormatEstimate) * 100);

  console.log('\n=== COMPARISON ===');
  console.log('Old format (estimated):', oldFormatEstimate, 'tokens');
  console.log('New format (actual):', newFormatActual, 'tokens');
  console.log('Token savings:', savings, `(${savingsPercent}%)`);
} else {
  console.log('Got single match - testing with different workflow...');

  // Try another workflow
  const result2 = await engine.executeWorkflow({
    workflow: 'prd',
  });

  if (result2.ambiguous) {
    console.log('\n✅ Found ambiguous result with "prd" workflow\n');
    console.log(result2.text);
  } else {
    console.log('No ambiguous workflows found in fixtures');
  }
}
