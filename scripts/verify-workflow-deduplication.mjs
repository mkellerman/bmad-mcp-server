#!/usr/bin/env node
import { BMADEngine } from '../build/core/bmad-engine.js';
import { join } from 'path';

const projectRoot = join(process.cwd(), 'tests/fixtures/bmad');
const gitRemote = 'git+https://github.com/mkellerman/BMAD-METHOD#main:bmad';

async function testWorkflowDeduplication() {
  console.log('Testing workflow deduplication with module:name keys\n');

  const modes = ['local', 'user', 'auto'];

  for (const mode of modes) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Mode: ${mode.toUpperCase()}`);
    console.log('='.repeat(60));

    const gitRemotes = mode === 'strict' || mode === 'auto' ? [gitRemote] : [];
    const engine = new BMADEngine(projectRoot, gitRemotes, mode);
    const result = await engine.listWorkflows();
    const workflows = result.data || [];

    // Debug: Check agents
    const agents = await engine.listAgents();
    const agentsData = agents.data || [];
    console.log(`Total agents: ${agentsData.length}`);

    // Sample agent workflows
    const agentsWithWorkflows = agentsData.filter(
      (a) => a.workflows && a.workflows.length > 0,
    );
    console.log(`Agents with workflows: ${agentsWithWorkflows.length}`);
    if (agentsWithWorkflows.length > 0) {
      const sample = agentsWithWorkflows[0];
      console.log(
        `Sample: ${sample.name} has ${sample.workflows?.length || 0} workflows`,
      );
    }

    console.log(`Total workflows: ${workflows.length}\n`);

    // Check for party-mode workflows
    const partyModeWorkflows = workflows.filter((w) => w.name === 'party-mode');
    console.log(`party-mode workflows found: ${partyModeWorkflows.length}`);
    partyModeWorkflows.forEach((w) => {
      console.log(
        `  - Module: ${w.module || 'core'}, Agents: ${w.agents.join(', ')}`,
      );
    });

    // Check for custom-workflow
    const customWorkflows = workflows.filter(
      (w) => w.name === 'custom-workflow',
    );
    console.log(`\ncustom-workflow workflows found: ${customWorkflows.length}`);
    customWorkflows.forEach((w) => {
      console.log(
        `  - Module: ${w.module || 'core'}, Agents: ${w.agents.join(', ')}`,
      );
    });
  }
}

testWorkflowDeduplication().catch(console.error);
