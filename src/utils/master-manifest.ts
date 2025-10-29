import type { BmadOrigin, MasterManifests } from '../types/index.js';
import type { BmadPathResolution } from './bmad-path-resolver.js';
import { inventoryOriginV6 } from './v6-module-inventory.js';
import { inventoryOriginV4 } from './v4-module-inventory.js';
import { detectV6, detectV6Filesystem, detectV4 } from './version-detector.js';

export function originsFromResolution(
  discovery: BmadPathResolution,
): BmadOrigin[] {
  return discovery.locations
    .filter((loc) => loc.status === 'valid' && loc.resolvedRoot)
    .map((loc) => ({
      kind: loc.source,
      displayName: loc.displayName,
      root: loc.resolvedRoot!,
      manifestDir: loc.manifestDir || loc.resolvedRoot!, // v4 doesn't have _cfg dir
      priority: loc.priority,
    }))
    .sort((a, b) => a.priority - b.priority);
}

export function buildMasterManifests(origins: BmadOrigin[]): MasterManifests {
  const master: MasterManifests = {
    agents: [],
    workflows: [],
    tasks: [],
    modules: [],
  };
  for (const origin of origins) {
    // Try v6 with manifest first
    const isV6WithManifest = Boolean(detectV6(origin.root));
    if (isV6WithManifest) {
      const inv = inventoryOriginV6(origin);
      master.modules.push(...inv.modules);
      master.agents.push(...inv.agents);
      master.workflows.push(...inv.workflows);
      master.tasks.push(...inv.tasks);
      continue;
    }

    // Try v4
    const isV4 = Boolean(detectV4(origin.root));
    if (isV4) {
      const inv = inventoryOriginV4(origin);
      master.modules.push(...inv.modules);
      master.agents.push(...inv.agents);
      master.workflows.push(...inv.workflows);
      master.tasks.push(...inv.tasks);
      continue;
    }

    // Try v6 without manifest (filesystem only)
    const isV6Filesystem = Boolean(detectV6Filesystem(origin.root));
    if (isV6Filesystem) {
      const inv = inventoryOriginV6(origin);
      master.modules.push(...inv.modules);
      master.agents.push(...inv.agents);
      master.workflows.push(...inv.workflows);
      master.tasks.push(...inv.tasks);
      continue;
    }

    // Unknown version - ignore
  }
  return master;
}
