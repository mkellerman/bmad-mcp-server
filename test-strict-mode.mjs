#!/usr/bin/env node
import { ResourceLoaderGit } from './build/core/resource-loader.js';

console.log('🧪 Testing STRICT mode with Git remote\n');

// This matches the mcp.json configuration
const loader = new ResourceLoaderGit(
  undefined,
  ['git+https://github.com/mkellerman/BMAD-METHOD#debug-agent-workflow:/bmad'],
  'strict',
);

console.log('📊 Loading Agents...');
const agents = await loader.listAgentsWithMetadata();
console.log(`✅ Loaded ${agents.length} agents`);

console.log('\n📊 Loading Workflows...');
const workflows = await loader.listWorkflowsWithMetadata();
console.log(`✅ Loaded ${workflows.length} workflows`);

console.log('\n📊 Loading Tools...');
const tools = await loader.listToolsWithMetadata();
console.log(`✅ Loaded ${tools.length} tools`);

console.log('\n🎉 Test passed!');
console.log(
  `\n📈 Summary: ${agents.length} agents, ${workflows.length} workflows, ${tools.length} tools`,
);
