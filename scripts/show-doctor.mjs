#!/usr/bin/env node
/**
 * Show BMAD doctor output using the built build/ artifacts.
 *
 * Usage:
 *   node show-doctor.mjs [--full] [--root /path/to/bmad-or-.bmad-core]
 *
 * Notes:
 *   - If --root is omitted, BMAD_ROOT env var is used if set.
 *   - For v6, point to the folder containing bmad/_cfg (e.g., .../bmad)
 *   - For v4, point to the .bmad-core directory
 */

// Parse args early to set BMAD_DEBUG before importing modules
function parseArgs(argv) {
  const args = { root: undefined, reload: false, full: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--reload') {
      args.reload = true;
    } else if (a === '--full') {
      args.full = true;
    } else if (a === '--root') {
      args.root = argv[i + 1];
      i++;
    } else if (!a.startsWith('--')) {
      // positional treated as root
      args.root = a;
    }
  }
  return args;
}

// Set BMAD_DEBUG before importing any modules
const args = parseArgs(process.argv);
if (args.full) {
  process.env.BMAD_DEBUG = '1';
}

import { UnifiedBMADTool } from '../build/tools/index.js';
import { resolveBmadPaths } from '../build/utils/bmad-path-resolver.js';
import { MasterManifestService } from '../build/services/master-manifest-service.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve(path.dirname(__filename), '..');

async function main() {
  console.log('🏥 BMAD Doctor Output\n');
  console.log('='.repeat(70));
  console.log('');

  // Resolve BMAD paths (prefer CLI root, else BMAD_ROOT)
  const discovery = resolveBmadPaths({
    cwd: __dirname,
    cliArg: args.root,
    envVar: args.root ? undefined : process.env.BMAD_ROOT,
    userBmadPath: path.join(__dirname, '.bmad'),
  });

  const root =
    discovery.activeLocation.resolvedRoot ??
    discovery.activeLocation.originalPath ??
    __dirname;

  const masterManifestService = new MasterManifestService(discovery);
  masterManifestService.generate();

  // Silence loader logs for cleaner doctor output in this script
  const origErr = console.error;
  const origWarn = console.warn;
  console.error = () => {};
  console.warn = () => {};
  const tool = new UnifiedBMADTool({
    bmadRoot: root,
    discovery,
    masterManifestService,
  });
  const flags = [args.reload ? '--reload' : ''].filter(Boolean).join(' ');
  const result = await tool.execute(`*doctor${flags ? ' ' + flags : ''}`);
  console.error = origErr;
  console.warn = origWarn;

  if (result.success && result.content) {
    console.log(result.content);
  } else {
    console.error('Error:', result.error || 'Unknown error');
  }

  console.log('');
  console.log('='.repeat(70));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
