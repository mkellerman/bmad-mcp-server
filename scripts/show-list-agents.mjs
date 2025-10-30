#!/usr/bin/env node
/**
 * Show BMAD *list-agents output using the built build/ artifacts.
 *
 * Usage:
 *   node show-list-agents.mjs [--root /path/to/bmad]
 */

import { resolveBmadPaths } from '../build/utils/bmad-path-resolver.js';
import { MasterManifestService } from '../build/services/master-manifest-service.js';
import { handleListCommand } from '../build/tools/internal/list.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const projectRoot = path.resolve(__dirname, '..');
const userBmadPath = path.join(process.env.HOME || '~', '.bmad');

// Resolve BMAD paths
const discovery = resolveBmadPaths({
  cwd: projectRoot,
  cliArgs: args.root ? [args.root] : [],
  envVar: process.env.BMAD_ROOT,
  userBmadPath,
});

const active = discovery.activeLocation;
const bmadRoot = active.resolvedRoot ?? active.originalPath ?? projectRoot;

console.log(`Using BMAD root: ${bmadRoot}\n`);

// Build master manifest
const masterService = new MasterManifestService(discovery, projectRoot);
const master = masterService.get();

console.log(`Loaded ${master.agents.length} agents\n`);

// Execute list command
const resolved = {
  agents: master.agents,
  workflows: master.workflows,
  tasks: master.tasks,
};

const result = handleListCommand('*list-agents', {
  resolved,
  master,
  discovery,
});

if (result.success) {
  console.log('=== MARKDOWN OUTPUT ===\n');
  console.log(result.content);
  console.log('\n');

  if (result.structuredData) {
    console.log('=== STRUCTURED DATA ===\n');
    console.log(JSON.stringify(result.structuredData, null, 2));
  }
} else {
  console.error('Error:', result.error);
  process.exit(1);
}
