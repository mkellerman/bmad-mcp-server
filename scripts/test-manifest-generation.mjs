#!/usr/bin/env node
/**
 * Test what our generateAgentManifest() actually produces
 */
import { BMADEngine } from '../build/core/bmad-engine.js';

const engine = new BMADEngine();
await engine.initialize();

console.log('=== Agent Count ===');
const agents = engine.getAgentMetadata();
console.log(`Total agents loaded: ${agents.length}`);
console.log('\nAgent names:');
agents.forEach((a) => console.log(`  - ${a.name} (${a.module})`));

console.log('\n=== Generated Manifest ===');
const manifest = engine.generateAgentManifest();
const lines = manifest.split('\n');
console.log(`Total lines: ${lines.length}`);
console.log('\nFirst 3 lines:');
lines.slice(0, 3).forEach((line) => console.log(line));
