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
      version: loc.version, // Pass through detected version
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
    try {
      // Use pre-detected version if available, otherwise detect
      const version = origin.version || detectVersion(origin.root);

      if (version === 'v6') {
        const inv = inventoryOriginV6(origin);
        master.modules.push(...inv.modules);
        master.agents.push(...inv.agents);
        master.workflows.push(...inv.workflows);
        master.tasks.push(...inv.tasks);
        continue;
      }

      if (version === 'v4') {
        const inv = inventoryOriginV4(origin);
        master.modules.push(...inv.modules);
        master.agents.push(...inv.agents);
        master.workflows.push(...inv.workflows);
        master.tasks.push(...inv.tasks);
        continue;
      }

      if (version === 'unknown') {
        // Custom installation - try both v6 and v4 patterns
        // Try v6 filesystem scan first (more flexible)
        try {
          const inv = inventoryOriginV6(origin);
          if (
            inv.agents.length > 0 ||
            inv.workflows.length > 0 ||
            inv.tasks.length > 0
          ) {
            master.modules.push(...inv.modules);
            master.agents.push(...inv.agents);
            master.workflows.push(...inv.workflows);
            master.tasks.push(...inv.tasks);
            continue;
          }
        } catch {
          // v6 failed, try v4
        }

        // Try v4 pattern
        try {
          const inv = inventoryOriginV4(origin);
          master.modules.push(...inv.modules);
          master.agents.push(...inv.agents);
          master.workflows.push(...inv.workflows);
          master.tasks.push(...inv.tasks);
        } catch {
          // Both failed - skip this origin silently
        }
      }
    } catch {
      // Continue processing other origins silently
    }
  }

  return master;
}

/**
 * Detect version for origins without pre-detected version
 */
function detectVersion(root: string): 'v6' | 'v4' | 'unknown' {
  if (detectV6(root)) return 'v6';
  if (detectV4(root)) return 'v4';
  if (detectV6Filesystem(root)) return 'v6';
  return 'unknown';
}
