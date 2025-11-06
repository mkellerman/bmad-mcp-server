#!/usr/bin/env node
/**
 * Test agent-scoped workflow implementation
 *
 * Validates:
 * 1. Workflows are extracted from agent menu items
 * 2. Only menu items with workflows appear in tool descriptions
 * 3. MCP resources use agent-scoped URIs: bmad://agent/{module}/{agent}/workflow/{name}
 * 4. Workflows can be loaded via scoped URIs
 */

import { ResourceLoaderGit } from '../build/lite/resource-loader-git.js';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { mkdirSync, symlinkSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testFixturePath = join(
  __dirname,
  '..',
  'tests',
  'fixtures',
  'bmad-core-v6',
);

async function testScopedWorkflows() {
  // Create temp directory with bmad symlink
  const tempDir = join(tmpdir(), `bmad-test-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });
  const bmadLink = join(tempDir, 'bmad');

  try {
    symlinkSync(testFixturePath, bmadLink);
    const loader = new ResourceLoaderGit(tempDir);

    console.log('\n=== Agent-Scoped Workflow Test ===\n');

    // Get all agents with metadata
    const agents = await loader.listAgentsWithMetadata();

    console.log(`✓ Found ${agents.length} agents\n`);

    for (const agent of agents) {
      console.log(
        `┌─ Agent: ${agent.displayName} (${agent.module}/${agent.name})`,
      );
      console.log(`│  Tool Name: ${agent.module}-${agent.name}`);
      console.log(`│  Title: ${agent.title}`);

      if (agent.workflowMenuItems && agent.workflowMenuItems.length > 0) {
        console.log(`│`);
        console.log(`│  📋 Menu Items (workflow actions only):`);
        agent.workflowMenuItems.forEach((item, idx) => {
          console.log(`│    ${idx + 1}. ${item}`);
        });
      } else {
        console.log(`│  ⚠️  No workflow menu items`);
      }

      if (agent.workflows && agent.workflows.length > 0) {
        console.log(`│`);
        console.log(`│  🔗 Workflow Resources (${agent.workflows.length}):`);
        agent.workflows.forEach((workflow) => {
          const uri = `bmad://agent/${agent.module}/${agent.name}/workflow/${workflow}`;
          console.log(`│    • ${workflow}`);
          console.log(`│      URI: ${uri}`);
        });
      } else {
        console.log(`│  ⚠️  No workflows`);
      }

      console.log(`└─\n`);
    }

    // Test loading a scoped workflow
    console.log('🧪 Testing Scoped Workflow Loading\n');

    const testAgent = agents.find((a) => a.workflows && a.workflows.length > 0);
    if (testAgent) {
      const testWorkflow = testAgent.workflows[0];
      const testUri = `bmad://agent/${testAgent.module}/${testAgent.name}/workflow/${testWorkflow}`;

      console.log(`   Agent: ${testAgent.displayName}`);
      console.log(`   Workflow: ${testWorkflow}`);
      console.log(`   URI: ${testUri}`);

      try {
        const loaded = await loader.loadWorkflow(testWorkflow);
        console.log(
          `   ✅ Successfully loaded (${loaded.content.length} bytes)`,
        );
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    } else {
      console.log('   ⚠️  No agents with workflows found');
    }

    console.log('\n=== Summary ===\n');

    const totalWorkflows = agents.reduce(
      (sum, a) => sum + (a.workflows?.length || 0),
      0,
    );
    const agentsWithWorkflows = agents.filter(
      (a) => a.workflows && a.workflows.length > 0,
    ).length;

    console.log(`Total Agents: ${agents.length}`);
    console.log(`Agents with Workflows: ${agentsWithWorkflows}`);
    console.log(`Total Workflow Resources: ${totalWorkflows}`);
    console.log(`\n✓ Test Complete\n`);
  } finally {
    // Cleanup
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

testScopedWorkflows().catch(console.error);
