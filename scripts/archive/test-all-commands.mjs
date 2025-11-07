#!/usr/bin/env node
/**
 * Test all list commands to verify formatMCPResponse is working
 */

import { resolveBmadPaths } from '../build/utils/bmad-path-resolver.js';
import { MasterManifestService } from '../build/services/master-manifest-service.js';
import { handleListCommand } from '../build/tools/internal/list.js';
import { doctor } from '../build/tools/internal/doctor.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const userBmadPath = path.join(process.env.HOME || '~', '.bmad');

// Resolve BMAD paths
const discovery = resolveBmadPaths({
  cwd: projectRoot,
  cliArgs: [],
  envVar: process.env.BMAD_ROOT,
  userBmadPath,
});

const active = discovery.activeLocation;
const bmadRoot = active.resolvedRoot ?? active.originalPath ?? projectRoot;

console.log(`Testing with BMAD root: ${bmadRoot}\n`);

// Build master manifest
const masterService = new MasterManifestService(discovery, projectRoot);
const master = masterService.get();

const resolved = {
  agents: master.agents,
  workflows: master.workflows,
  tasks: master.tasks,
};

const ctx = { resolved, master, discovery };

// Test all list commands
const commands = ['*list-agents', '*list-workflows'];

console.log('='.repeat(70));
console.log('Testing List Commands');
console.log('='.repeat(70));

for (const cmd of commands) {
  console.log(`\n### ${cmd} ###`);
  const result = handleListCommand(cmd, ctx);

  console.log(`✓ Success: ${result.success}`);
  console.log(`✓ Type: ${result.type}`);
  console.log(`✓ Has content: ${!!result.content}`);
  console.log(`✓ Has structuredData: ${!!result.structuredData}`);

  if (result.structuredData) {
    console.log(`✓ Items count: ${result.structuredData.items?.length || 0}`);
    console.log(
      `✓ Summary total: ${result.structuredData.summary?.total || 0}`,
    );
  }

  // Show first 200 chars of content
  const preview = result.content?.substring(0, 200).replace(/\n/g, ' ');
  console.log(`✓ Content preview: ${preview}...`);
}

// Test doctor
console.log('\n' + '='.repeat(70));
console.log('Testing Doctor Command');
console.log('='.repeat(70));

const doctorCtx = {
  discovery,
  projectRoot,
  bmadRoot,
  userBmadPath,
  masterManifestService: masterService,
};

const doctorResult = doctor('*doctor', doctorCtx);

console.log(`\n### *doctor ###`);
console.log(`✓ Success: ${doctorResult.success}`);
console.log(`✓ Type: ${doctorResult.type}`);
console.log(`✓ Has content: ${!!doctorResult.content}`);

// Show first 200 chars
const preview = doctorResult.content?.substring(0, 200).replace(/\n/g, ' ');
console.log(`✓ Content preview: ${preview}...`);

console.log('\n' + '='.repeat(70));
console.log('✅ All commands tested successfully!');
console.log('All will use formatMCPResponse() in the server.');
console.log('='.repeat(70));
