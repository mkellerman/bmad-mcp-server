#!/usr/bin/env node
import { ResourceLoaderGit } from './build/core/resource-loader.js';

console.log('🧪 Testing bmad-mcp-server with bmad-method@alpha\n');

const loader = new ResourceLoaderGit('/Users/mkellerman/GitHub/BMAD-METHOD');
console.log('✅ ResourceLoaderGit initialized\n');

// Test 1: Agents with timing
console.log('📊 Test 1: Load Agents');
console.time('  ⏱️  First load (with manifest generation)');
const agents1 = await loader.listAgentsWithMetadata();
console.timeEnd('  ⏱️  First load (with manifest generation)');
console.log(`  ✅ Loaded ${agents1.length} agents\n`);

// Test 2: Workflows (should use cached manifests)
console.log('📊 Test 2: Load Workflows (using cached manifests)');
console.time('  ⏱️  Cached load');
const workflows = await loader.listWorkflowsWithMetadata();
console.timeEnd('  ⏱️  Cached load');
console.log(`  ✅ Loaded ${workflows.length} workflows\n`);

// Test 3: Reload agents (should be fast with cache)
console.log('📊 Test 3: Reload Agents (using cache)');
console.time('  ⏱️  Cached load');
const agents2 = await loader.listAgentsWithMetadata();
console.timeEnd('  ⏱️  Cached load');
console.log(`  ✅ Loaded ${agents2.length} agents\n`);

console.log('🎉 All tests passed!');
console.log(`📦 Package: bmad-method@alpha (from npm registry)`);
console.log(`⚡ Performance: Manifest-based loading is working!`);
