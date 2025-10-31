#!/usr/bin/env node
/**
 * Test script to verify the dynamic tool description generation
 */

import { MasterManifestService } from '../build/services/master-manifest-service.js';
import { resolveBmadPaths } from '../build/utils/bmad-path-resolver.js';
import { buildToolDescription } from '../build/tools/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve(path.dirname(__filename), '..');

// Parse args
function parseArgs(argv) {
  const args = { root: undefined };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') {
      args.root = argv[i + 1];
      i++;
    } else if (!a.startsWith('--')) {
      args.root = a;
    }
  }
  return args;
}

const args = parseArgs(process.argv);

console.log(`Testing tool description generation\n`);

// Resolve BMAD paths
const discovery = resolveBmadPaths({
  cwd: __dirname,
  cliArg: args.root,
  envVar: args.root ? undefined : process.env.BMAD_ROOT,
  userBmadPath: path.join(__dirname, '.bmad'),
});

// Build master manifest
const masterService = new MasterManifestService(discovery);
masterService.generate();
const masterData = masterService.get();

// Prepare agent and workflow data
const agents = masterData.agents
  .filter((a) => a.name)
  .map((a) => ({
    name: a.name,
    description: a.description,
  }));

const workflows = masterData.workflows
  .filter((w) => w.name)
  .map((w) => ({
    name: w.name,
    description: w.description,
  }));

console.log(
  `Found ${agents.length} agents and ${workflows.length} workflows\n`,
);

// Generate tool description
const description = buildToolDescription(agents, workflows);

console.log('=== Generated Tool Description ===\n');
console.log(description);
console.log('\n=== End of Tool Description ===\n');

// Show statistics
console.log('Statistics:');
console.log(`- Total characters: ${description.length}`);
console.log(`- Total lines: ${description.split('\n').length}`);
console.log(`- Agent names included: ${agents.length}`);
console.log(`- Workflow names included: ${workflows.length}`);
