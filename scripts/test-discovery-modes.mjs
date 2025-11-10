#!/usr/bin/env node
/**
 * Test Discovery Modes
 * Tests the 4 discovery modes: strict, local, user, auto
 *
 * Workflows are extracted from agent XML <menu> items and linked to agents.
 */

import { BMADEngine } from '../build/core/bmad-engine.js';
import { join } from 'path';
import { homedir } from 'os';

const projectRoot = join(process.cwd(), 'tests/fixtures/bmad');
const gitRemote = 'git+https://github.com/mkellerman/BMAD-METHOD#main:bmad';

console.log('🧪 Testing Discovery Modes\n');
console.log(`Project: ${projectRoot}`);
console.log(`User: ${join(homedir(), '.bmad')}`);
console.log(`Git: ${gitRemote}\n`);

async function testMode(mode, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing Mode: ${mode.toUpperCase()} - ${description}`);
  console.log('='.repeat(60));

  const engine = new BMADEngine(projectRoot, [gitRemote], mode);
  await engine.initialize();

  const agentsResult = await engine.listAgents();
  const workflowsResult = await engine.listWorkflows();

  const agents = agentsResult.data || [];
  const workflows = workflowsResult.data || [];

  console.log(`\n📊 Results for ${mode}:`);
  console.log(`  Agents: ${agents.length}`);
  console.log(`  Workflows: ${workflows.length}`);

  if (agents.length > 0) {
    console.log(`\n  Sample agents (first 5):`);
    agents
      .slice(0, 5)
      .forEach((a) =>
        console.log(`    - ${a.name || JSON.stringify(a).substring(0, 50)}`),
      );
  }

  if (workflows.length > 0) {
    console.log(`\n  Sample workflows (first 5):`);
    workflows
      .slice(0, 5)
      .forEach((w) =>
        console.log(`    - ${w.name || JSON.stringify(w).substring(0, 50)}`),
      );
  }
}

async function main() {
  try {
    await testMode('strict', 'Only git remotes from CLI');
    await testMode('local', 'Only project root');
    await testMode('user', 'Only ~/.bmad');
    await testMode('auto', 'All sources with priority');

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ All modes tested successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
