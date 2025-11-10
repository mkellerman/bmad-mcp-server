#!/usr/bin/env node
/**
 * Test Ambiguous Response Handling
 *
 * Tests the new ambiguous response feature for agents and workflows
 * when multiple matches are found without module filter.
 */

import { BMADEngine } from '../build/core/bmad-engine.js';
import { join } from 'path';

const projectRoot = join(process.cwd(), 'tests/fixtures/bmad');
const gitRemote = 'git+https://github.com/mkellerman/BMAD-METHOD#main:bmad';

async function testAmbiguousResponses() {
  console.log('🧪 Testing Ambiguous Response Handling\n');

  const engine = new BMADEngine(projectRoot, [gitRemote], 'auto');
  await engine.initialize();

  // Test 1: Workflow with module filter (should NOT be ambiguous)
  console.log('═'.repeat(60));
  console.log('Test 1: Workflow with module filter');
  console.log('═'.repeat(60));

  const test1 = await engine.executeWorkflow({
    workflow: 'party-mode',
    module: 'core',
    message: 'Start party mode',
  });

  console.log('Has ambiguous flag:', 'ambiguous' in test1 && test1.ambiguous);
  console.log('Success:', test1.success);
  console.log();

  // Test 2: Agent without module filter (check if ambiguous exists)
  console.log('═'.repeat(60));
  console.log('Test 2: Check for duplicate agents');
  console.log('═'.repeat(60));

  // First, list all agents to find duplicates
  const agentsResult = await engine.listAgents();
  const agents = agentsResult.data || [];
  const agentCounts = new Map();

  for (const agent of agents) {
    const count = agentCounts.get(agent.name) || 0;
    agentCounts.set(agent.name, count + 1);
  }

  const duplicateAgents = Array.from(agentCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name);

  console.log(
    'Duplicate agent names:',
    duplicateAgents.length > 0 ? duplicateAgents.join(', ') : 'none found',
  );

  if (duplicateAgents.length > 0) {
    const testAgent = duplicateAgents[0];
    console.log(`\nTesting ambiguous agent: ${testAgent}`);

    const test2 = await engine.executeAgent({
      agent: testAgent,
      message: 'Test message',
    });

    if ('ambiguous' in test2 && test2.ambiguous) {
      console.log('✅ Ambiguous response detected!');
      console.log('Matches found:', test2.matches?.length || 0);
      console.log('\nFormatted output:');
      console.log(test2.text);
    } else {
      console.log('❌ No ambiguity detected (might be only one instance)');
    }
  }
  console.log();

  // Test 3: Check for duplicate workflows
  console.log('═'.repeat(60));
  console.log('Test 3: Check for duplicate workflows');
  console.log('═'.repeat(60));

  const workflowsResult = await engine.listWorkflows();
  const workflows = workflowsResult.data || [];
  const workflowCounts = new Map();

  for (const workflow of workflows) {
    const count = workflowCounts.get(workflow.name) || 0;
    workflowCounts.set(workflow.name, count + 1);
  }

  const duplicateWorkflows = Array.from(workflowCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name);

  console.log(
    'Duplicate workflow names:',
    duplicateWorkflows.length > 0
      ? duplicateWorkflows.join(', ')
      : 'none found',
  );

  if (duplicateWorkflows.length > 0) {
    const testWorkflow = duplicateWorkflows[0];
    console.log(`\nTesting ambiguous workflow: ${testWorkflow}`);

    const test3 = await engine.executeWorkflow({
      workflow: testWorkflow,
      message: 'Test message',
    });

    if ('ambiguous' in test3 && test3.ambiguous) {
      console.log('✅ Ambiguous response detected!');
      console.log('Matches found:', test3.matches?.length || 0);
      console.log('\nFormatted output:');
      console.log(test3.text);
    } else {
      console.log('❌ No ambiguity detected (using module:name deduplication)');
    }
  }
  console.log();

  console.log('═'.repeat(60));
  console.log('✅ Ambiguous response tests complete!');
  console.log('═'.repeat(60));
}

testAmbiguousResponses().catch(console.error);
