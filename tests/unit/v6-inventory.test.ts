import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';

import { inventoryOriginV6 } from '../../src/utils/v6-module-inventory.js';
import { detectV6 } from '../../src/utils/version-detector.js';
import { buildMasterManifests } from '../../src/utils/master-manifest.js';
import { resolveAvailableCatalog } from '../../src/utils/availability-resolver.js';
import type { BmadOrigin } from '../../src/types/index.js';

function sampleV6Root(): string {
  const root = path.resolve(
    process.cwd(),
    '.bmad',
    '6.0.0-alpha.0',
    'bmad',
  );
  if (!fs.existsSync(root))
    throw new Error(`Sample v6 root not found at ${root}`);
  return root;
}

function makeOrigin(): BmadOrigin {
  const root = sampleV6Root();
  return {
    kind: 'project',
    displayName: 'Sample v6',
    root,
    manifestDir: path.join(root, '_cfg'),
    priority: 1,
  };
}

describe('v6 module inventory', () => {
  it('detects v6 modules from root manifest', () => {
    const v6 = detectV6(sampleV6Root());
    expect(v6).toBeDefined();
    expect(v6?.kind).toBe('v6');
    const names = (v6?.modules ?? []).map((m) => m.name).sort();
    // Expect core modules present
    expect(names).toContain('core');
    expect(names).toContain('bmb');
    expect(names).toContain('bmm');
    expect(names).toContain('cis');
  });

  it('builds per-origin inventory with CSV, FS, and status flags', () => {
    const origin = makeOrigin();
    const inv = inventoryOriginV6(origin);

    // Modules must include core/bmb/bmm/cis
    const moduleNames = inv.modules.map((m) => m.name).sort();
    expect(moduleNames).toEqual(['bmb', 'bmm', 'cis', 'core'].sort());

    // bmb and bmm should have valid config.yaml
    const bmb = inv.modules.find((m) => m.name === 'bmb');
    const bmm = inv.modules.find((m) => m.name === 'bmm');
    expect(bmb?.configValid).toBe(true);
    expect(bmm?.configValid).toBe(true);

    // There should be CSV records for known entries and they should point inside bmad root
    const analyst = inv.agents.find(
      (r) =>
        r.kind === 'agent' && r.moduleName === 'bmm' && r.name === 'analyst',
    );
    expect(analyst).toBeDefined();
    expect(analyst?.absolutePath.startsWith(origin.root)).toBe(true);

    // Verify status flags are being set correctly
    // Items from manifest should have 'verified' or 'no-file-found' status
    // Items only on filesystem should have 'not-in-manifest' status
    const hasVerified =
      inv.agents.some((r) => r.status === 'verified') ||
      inv.workflows.some((r) => r.status === 'verified') ||
      inv.tasks.some((r) => r.status === 'verified');
    // The sample data should have at least some 'verified' items (manifest + filesystem)
    expect(hasVerified).toBe(true);

    // Verify no duplicates: each unique agent/workflow/task should appear only once
    const agentKeys = inv.agents.map((a) => `${a.moduleName}:${a.name}`);
    const uniqueAgents = new Set(agentKeys);
    expect(agentKeys.length).toBe(uniqueAgents.size);
  });
});

describe('master manifest aggregation and availability resolver', () => {
  it('aggregates deduplicated master manifests and resolves availability', () => {
    const origin = makeOrigin();
    const master = buildMasterManifests([origin]);

    // Master should include manifest records (with filesystem orphans only)
    const all = [...master.agents, ...master.workflows, ...master.tasks];
    const hasManifest = all.some((r) => r.source === 'manifest');
    expect(hasManifest).toBe(true);

    // Filesystem entries should only exist for orphans (not in manifest)
    const filesystemEntries = all.filter((r) => r.source === 'filesystem');
    filesystemEntries.forEach((entry) => {
      expect(entry.status).toBe('orphan-file');
    });

    // Resolve availability with default preferences
    const catalog = resolveAvailableCatalog(master, {
      scope: 'active-only',
      activeRoot: origin.root,
    });

    // Ensure a known agent exists and appears only once
    const agentAnalyst = catalog.agents.filter(
      (r) => r.kind === 'agent' && r.name === 'analyst',
    );
    expect(agentAnalyst.length).toBe(1);

    // Since we deduplicate at inventory stage, manifest entries should be the source
    if (agentAnalyst[0]) {
      expect(agentAnalyst[0].source).toBe('manifest');
    }
  });
});
