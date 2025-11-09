#!/usr/bin/env node
/**
 * Test Workflow Extraction from Agent Menu Items
 *
 * Verifies that workflows are properly extracted from agent XML <menu> items
 * and linked to agents in the metadata.
 */

import { BMADEngine } from '../build/core/bmad-engine.js';
import { join } from 'path';

const projectRoot = join(process.cwd(), 'tests/fixtures/bmad');

console.log('🧪 Testing Workflow Extraction from Agent Menu Items\n');
console.log(`Project: ${projectRoot}\n`);

async function testWorkflowExtraction() {
  const engine = new BMADEngine(projectRoot, undefined, 'local');
  await engine.initialize();

  // Get bmad-master agent metadata
  const agents = engine['agentMetadata'];
  const bmadMaster = agents.find((a) => a.name === 'bmad-master');

  console.log('📊 Agent: bmad-master');
  console.log(
    `  Workflows: ${bmadMaster.workflows ? bmadMaster.workflows.length : 0}`,
  );
  if (bmadMaster.workflows) {
    console.log('  Workflow names:');
    bmadMaster.workflows.forEach((w) => console.log(`    - ${w}`));
  }

  // Get workflow list from engine
  const workflowsResult = await engine.listWorkflows();
  const workflows = workflowsResult.data || [];

  console.log(`\n📋 Total Workflows Linked to Agents: ${workflows.length}`);
  console.log('\n  Sample workflows (first 10):');
  workflows.slice(0, 10).forEach((w, i) => {
    console.log(`    ${i + 1}. ${w.name}`);
    console.log(`       Description: ${w.description.substring(0, 60)}...`);
    console.log(`       Agents: ${w.agents.join(', ')}`);
  });

  // Verify party-mode is in the list
  const partyMode = workflows.find((w) => w.name === 'party-mode');

  console.log('\n✅ Verification:');
  console.log(
    `  • Agent metadata includes workflows: ${bmadMaster.workflows && bmadMaster.workflows.length > 0 ? '✓' : '✗'}`,
  );
  console.log(
    `  • Workflows extracted from menu items: ${workflows.length > 0 ? '✓' : '✗'}`,
  );
  console.log(`  • party-mode workflow found: ${partyMode ? '✓' : '✗'}`);

  if (
    workflows.length > 0 &&
    bmadMaster.workflows &&
    bmadMaster.workflows.length > 0
  ) {
    console.log(
      '\n🎉 Success! Workflows are properly extracted from agent XML menu items.',
    );
  } else {
    console.log('\n❌ Failed! Workflows are not being extracted.');
    process.exit(1);
  }
}

testWorkflowExtraction().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
