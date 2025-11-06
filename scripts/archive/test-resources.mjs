#!/usr/bin/env node
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

async function testResources() {
  // Create a temp directory with bmad symlink since loader expects projectRoot/bmad structure
  const tempDir = join(tmpdir(), `bmad-test-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });
  const bmadLink = join(tempDir, 'bmad');

  try {
    symlinkSync(testFixturePath, bmadLink);

    console.log(
      `Testing with fixture (via ${tempDir}/bmad -> ${testFixturePath})\n`,
    );

    const loader = new ResourceLoaderGit(tempDir);

    console.log('\n=== Testing MCP Resources ===\n');

    // List workflows
    console.log('📋 Listing workflows...');
    const workflows = await loader.listWorkflows();
    console.log(`Found ${workflows.length} workflows:`);
    workflows.forEach((w) => console.log(`  - ${w}`));
    console.log(`Total: ${workflows.length} workflows\n`);

    // List agents
    console.log('📋 Listing agents...');
    const agents = await loader.listAgents();
    console.log(`Found ${agents.length} agents:\n`);

    const agentWorkflows = new Map(); // Track workflows per agent

    for (const agent of agents) {
      const metadata = await loader.getAgentMetadata(agent);
      console.log(`Agent: ${agent}`);
      console.log(`  Module: ${metadata.module || 'unknown'}`);
      console.log(`  URI: bmad://agent/${metadata.module}/${agent}`);
      console.log(`  Title: ${metadata.title}`);
      if (metadata.persona) {
        console.log(`  Persona: ${metadata.persona.substring(0, 60)}...`);
      }
      if (metadata.workflows && metadata.workflows.length > 0) {
        console.log(`  Workflows (${metadata.workflows.length}):`);
        metadata.workflows.forEach((w) => {
          console.log(
            `    - ${w} → bmad://agent/${metadata.module}/${agent}/workflow/${w}`,
          );
        });
        agentWorkflows.set(agent, metadata.workflows);
      }
    }
    console.log(`\nTotal: ${agents.length} agents\n`);

    // Test loading a workflow
    console.log('🔄 Testing workflow load: party-mode');
    try {
      const workflow = await loader.loadWorkflow('party-mode');
      console.log(
        `✅ Successfully loaded party-mode (${workflow.content.length} chars)`,
      );
    } catch (error) {
      console.error(`❌ Failed to load party-mode:`, error.message);
    }

    // Test loading an agent
    console.log('\n🔄 Testing agent load: analyst');
    try {
      const agent = await loader.loadAgent('analyst');
      console.log(
        `✅ Successfully loaded analyst (${agent.content.length} chars)`,
      );
    } catch (error) {
      console.error(`❌ Failed to load analyst:`, error.message);
    }

    console.log('\n=== Test Complete ===\n');
  } finally {
    // Cleanup temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

testResources().catch(console.error);
