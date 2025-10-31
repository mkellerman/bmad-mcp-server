#!/usr/bin/env node
/**
 * Show sample output from enhanced list-workflows command
 */

import { resolveBmadPaths } from '../build/utils/bmad-path-resolver.js';
import { MasterManifestService } from '../build/services/master-manifest-service.js';
import { handleListCommand } from '../build/tools/internal/list.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const userBmadPath = path.join(process.env.HOME || '~', '.bmad');

const discovery = resolveBmadPaths({
  cwd: projectRoot,
  cliArgs: [],
  envVar: process.env.BMAD_ROOT,
  userBmadPath,
});

const masterService = new MasterManifestService(discovery, projectRoot);
const master = masterService.get();

const ctx = {
  resolved: {
    agents: master.agents,
    workflows: master.workflows,
    tasks: master.tasks,
  },
  master,
  discovery,
};

const result = handleListCommand('*list-workflows', ctx);

console.log('=== MARKDOWN OUTPUT ===\n');
console.log(result.content);

if (result.structuredData) {
  console.log('\n=== STRUCTURED DATA SUMMARY ===\n');
  console.log('Total workflows:', result.structuredData.summary.total);
  console.log(
    'Modules:',
    Object.keys(result.structuredData.summary.byGroup).join(', '),
  );
  console.log(
    'First 3 workflows:',
    result.structuredData.items
      .slice(0, 3)
      .map((w) => w.name)
      .join(', '),
  );
}
