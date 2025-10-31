#!/usr/bin/env node
/**
 * Test script to show how agent responses are formatted with display instructions
 */

import { resolveBmadPaths } from '../build/utils/bmad-path-resolver.js';
import { MasterManifestService } from '../build/services/master-manifest-service.js';
import { UnifiedBMADTool } from '../build/tools/index.js';
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

console.log(`Using BMAD root: ${bmadRoot}\n`);

// Build master manifest
const masterService = new MasterManifestService(discovery, projectRoot);

// Create unified tool
const tool = new UnifiedBMADTool({
  bmadRoot: projectRoot,
  discovery,
  masterManifestService: masterService,
});

// Test loading an agent
console.log('=== Testing Agent Load: analyst ===\n');
const result = tool.execute('analyst');

if (result.success) {
  console.log('SUCCESS! Result type:', result.type);
  console.log('\n--- CONTENT (first 500 chars) ---');
  console.log(result.content?.substring(0, 500) + '...\n');

  console.log('This content would be wrapped with:');
  console.log(
    '**INSTRUCTIONS: Display the content below to the user EXACTLY as written.**\n',
  );
  console.log(
    'The LLM sees this instruction and knows to show the markdown exactly as-is.',
  );
} else {
  console.error('Error:', result.error);
}
