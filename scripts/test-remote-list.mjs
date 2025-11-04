#!/usr/bin/env node
/**
 * Test remote agent listing
 */

import { UnifiedBMADTool } from '../build/tools/common/orchestrator.js';
import { resolveBmadPaths } from '../build/utils/bmad-path-resolver.js';
import { MasterManifestService } from '../build/services/master-manifest-service.js';
import { parseRemoteArgs } from '../build/utils/remote-registry.js';
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
  envVar: process.env.BMAD_ROOT || userBmadPath,
  userBmadPath,
});

const masterService = new MasterManifestService(discovery, projectRoot);

// Load remotes from .bmad-remotes.json
const registry = parseRemoteArgs([]);

const active = discovery.activeLocation;
const bmadRoot = active.resolvedRoot ?? active.originalPath ?? projectRoot;

const tool = new UnifiedBMADTool({
  bmadRoot,
  discovery,
  masterManifestService: masterService,
  remoteRegistry: registry,
});

const result = await tool.execute('*list-agents @awesome');

if (result.success) {
  console.log(result.content);
} else {
  console.error('Error:', result.error);
  process.exit(1);
}
