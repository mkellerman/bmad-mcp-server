import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  buildMasterManifests,
  originsFromResolution,
} from '../../src/utils/master-manifest.js';
import { resolveBmadPaths } from '../../src/utils/bmad-path-resolver.js';
import type { MasterManifests } from '../../src/types/index.js';

describe('Master Manifest Snapshot Test', () => {
  let generatedManifest: MasterManifests;
  let expectedManifest: MasterManifests;
  const bmadSamplePath = path.resolve(process.cwd(), '.bmad');
  const expectedManifestPath = path.join(
    bmadSamplePath,
    'master-manifest.json',
  );

  beforeAll(() => {
    // Generate manifest from .bmad samples
    const resolution = resolveBmadPaths({
      cwd: process.cwd(),
      cliArgs: [bmadSamplePath],
    });
    const origins = originsFromResolution(resolution);
    generatedManifest = buildMasterManifests(origins);

    // Load expected manifest
    const expectedContent = fs.readFileSync(expectedManifestPath, 'utf-8');
    expectedManifest = JSON.parse(expectedContent);
  });

  it('should match expected agent count', () => {
    expect(generatedManifest.agents.length).toBe(
      expectedManifest.agents.length,
    );
  });

  it('should match expected workflow count', () => {
    expect(generatedManifest.workflows.length).toBe(
      expectedManifest.workflows.length,
    );
  });

  it('should match expected task count', () => {
    expect(generatedManifest.tasks.length).toBe(expectedManifest.tasks.length);
  });

  it('should detect all expected installation origins', () => {
    const generatedOrigins = new Set(
      generatedManifest.agents.map((a: any) => a.origin.root),
    );
    const expectedOrigins = new Set(
      expectedManifest.agents.map((a: any) => a.origin.root),
    );

    // Convert to sorted arrays for better error messages
    const generatedArray = Array.from(generatedOrigins).sort();
    const expectedArray = Array.from(expectedOrigins).sort();

    expect(generatedArray).toEqual(expectedArray);
  });

  it('should correctly detect v4, v6, and custom (unknown) installations', () => {
    const generatedVersions = generatedManifest.agents
      .map((a: any) => ({
        root: a.origin.root,
        version: a.origin.version,
      }))
      .filter(
        (item: any, index: number, self: any[]) =>
          index === self.findIndex((t: any) => t.root === item.root),
      )
      .sort((a: any, b: any) => a.root.localeCompare(b.root));

    const expectedVersions = expectedManifest.agents
      .map((a: any) => ({
        root: a.origin.root,
        version: a.origin.version,
      }))
      .filter(
        (item: any, index: number, self: any[]) =>
          index === self.findIndex((t: any) => t.root === item.root),
      )
      .sort((a: any, b: any) => a.root.localeCompare(b.root));

    expect(generatedVersions).toEqual(expectedVersions);
  });

  it('should include all expected agent names', () => {
    const generatedAgentNames = new Set(
      generatedManifest.agents.map((a: any) => a.name),
    );
    const expectedAgentNames = new Set(
      expectedManifest.agents.map((a: any) => a.name),
    );

    const missing = Array.from(expectedAgentNames).filter(
      (name) => !generatedAgentNames.has(name),
    );
    const extra = Array.from(generatedAgentNames).filter(
      (name) => !expectedAgentNames.has(name),
    );

    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
  });

  it('should include custom debug agent from flat structure', () => {
    const debugAgent = generatedManifest.agents.find(
      (a: any) => a.name === 'debug',
    );
    expect(debugAgent).toBeDefined();
    expect((debugAgent as any)?.origin.version).toBe('v6'); // Custom has _cfg/manifest.yaml so it's v6
    expect((debugAgent as any)?.origin.root).toContain('custom');
    expect((debugAgent as any)?.moduleName).toBe('debug'); // Module name is 'debug'
    expect((debugAgent as any)?.status).toBe('not-in-manifest'); // Filesystem-based discovery
  });

  it('should include workflows from custom debug installation', () => {
    const debugWorkflows = generatedManifest.workflows.filter((w: any) =>
      w.origin.root.includes('custom'),
    );
    expect(debugWorkflows.length).toBeGreaterThan(0);
    expect(debugWorkflows.length).toBe(
      expectedManifest.workflows.filter((w: any) =>
        w.origin.root.includes('custom'),
      ).length,
    );
  });

  it('should match expected v4 installation structure', () => {
    const v4Agents = generatedManifest.agents.filter(
      (a: any) => a.origin.version === 'v4',
    );
    const expectedV4Agents = expectedManifest.agents.filter(
      (a: any) => a.origin.version === 'v4',
    );

    expect(v4Agents.length).toBe(expectedV4Agents.length);
    expect(v4Agents.length).toBeGreaterThan(0); // Ensure we have v4 samples
  });

  it('should match expected v6 installation structure', () => {
    const v6Agents = generatedManifest.agents.filter(
      (a: any) => a.origin.version === 'v6',
    );
    const expectedV6Agents = expectedManifest.agents.filter(
      (a: any) => a.origin.version === 'v6',
    );

    expect(v6Agents.length).toBe(expectedV6Agents.length);
    expect(v6Agents.length).toBeGreaterThan(0); // Ensure we have v6 samples
  });

  it('should validate agent paths match expected existence', () => {
    // Both generated and expected may have agents declared in manifests but not found on disk
    const generatedMissing = generatedManifest.agents.filter(
      (a: any) => !a.exists,
    );
    const expectedMissing = expectedManifest.agents.filter(
      (a: any) => !a.exists,
    );

    // The count of missing agents should match
    expect(generatedMissing.length).toBe(expectedMissing.length);

    // The missing agent names should match
    const generatedMissingNames = new Set(
      generatedMissing.map((a: any) => a.name),
    );
    const expectedMissingNames = new Set(
      expectedMissing.map((a: any) => a.name),
    );

    expect(generatedMissingNames).toEqual(expectedMissingNames);
  });

  describe('Snapshot validation guidance', () => {
    it('should provide clear instructions when manifest changes', () => {
      // This test will fail if the generated manifest differs from expected
      // When sample files change, regenerate the snapshot with:
      // npm run bmad -- "*export-master-manifest" ./.bmad

      const summary = {
        generated: {
          agents: generatedManifest.agents.length,
          workflows: generatedManifest.workflows.length,
          tasks: generatedManifest.tasks.length,
          installations: new Set(
            generatedManifest.agents.map((a: any) => a.origin.root),
          ).size,
        },
        expected: {
          agents: expectedManifest.agents.length,
          workflows: expectedManifest.workflows.length,
          tasks: expectedManifest.tasks.length,
          installations: new Set(
            expectedManifest.agents.map((a: any) => a.origin.root),
          ).size,
        },
      };

      if (
        summary.generated.agents !== summary.expected.agents ||
        summary.generated.workflows !== summary.expected.workflows ||
        summary.generated.tasks !== summary.expected.tasks
      ) {
        console.log('\n📊 Manifest comparison:');
        console.log('Generated:', summary.generated);
        console.log('Expected:', summary.expected);
        console.log(
          '\n💡 To update the snapshot, run: npm run bmad -- "*export-master-manifest" ./.bmad\n',
        );
      }

      expect(summary.generated).toEqual(summary.expected);
    });
  });
});
