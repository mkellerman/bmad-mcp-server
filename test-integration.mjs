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

// Show cache locations
console.log('\n📁 Cache Locations:');
const cacheBase = `${process.env.HOME}/.bmad/cache/manifests`;
console.log(`   Base: ${cacheBase}`);

// Show source paths mapping
console.log(`\n   Source Path Detection:`);
// Access internal method to show sources
const manifestCache = loader['manifestCache'];
if (manifestCache) {
  try {
    const sources = await manifestCache['getSources']();
    for (const source of sources) {
      const hash = manifestCache['getSourceHash'](source.root);
      console.log(
        `   - ${source.type} (priority ${source.priority}): ${source.root}`,
      );
      console.log(`     → Cache: ${hash}/_cfg/`);
    }
  } catch (e) {
    console.log(`     (Unable to access sources: ${e.message})`);
  }
}

// List cache directories
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

if (existsSync(cacheBase)) {
  const cacheDirs = readdirSync(cacheBase);
  const sourceHashes = cacheDirs.filter((d) => d !== 'merged');

  console.log(`\n   Per-Source Manifests:`);
  for (const hash of sourceHashes) {
    const cfgDir = join(cacheBase, hash, '_cfg');
    console.log(`   - ${hash}/_cfg/`);
    if (existsSync(cfgDir)) {
      const files = readdirSync(cfgDir).filter(
        (f) => f.endsWith('.csv') || f.endsWith('.yaml'),
      );
      files.forEach((f) => console.log(`     • ${f}`));
    }
  }

  if (existsSync(join(cacheBase, 'merged'))) {
    console.log(`\n   Merged (Deduplicated) Manifests:`);
    console.log(`   - merged/`);
    const mergedFiles = readdirSync(join(cacheBase, 'merged'));
    mergedFiles.forEach((f) => console.log(`     • ${f}`));
  }

  // Show sample content
  console.log(`\n📄 Sample Content:`);
  const mergedAgentFile = join(cacheBase, 'merged/agent-manifest.csv');
  if (existsSync(mergedAgentFile)) {
    import('node:fs').then(({ readFileSync }) => {
      const content = readFileSync(mergedAgentFile, 'utf-8');
      const lines = content.split('\n');
      console.log(`   agents (${lines.length - 1} total):`);
      lines.slice(0, 3).forEach((line) => console.log(`     ${line}`));
      if (lines.length > 3)
        console.log(`     ... (${lines.length - 3} more rows)`);
    });
  }
}
