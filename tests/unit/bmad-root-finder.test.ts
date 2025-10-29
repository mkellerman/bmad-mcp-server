/**
 * Unit tests for bmad-root-finder
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  findBmadRootsRecursive,
  findBmadRoot,
  sortBmadRoots,
  type FoundBmadRoot,
} from '../../src/utils/bmad-root-finder.js';
import {
  createTestFixture,
  type TestFixture,
} from '../helpers/test-fixtures.js';
import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

describe('bmad-root-finder', () => {
  let fixture: TestFixture;

  beforeEach(() => {
    fixture = createTestFixture();
  });

  afterEach(() => {
    fixture.cleanup();
  });

  describe('findBmadRootsRecursive', () => {
    it('should find v6 installation with _cfg/manifest.yaml', () => {
      const bmadDir = path.join(fixture.tmpDir, 'bmad');
      const cfgDir = path.join(bmadDir, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      const manifestPath = path.join(cfgDir, 'manifest.yaml');
      const manifestContent = yaml.dump({
        installation: { version: '6.0.0' },
        modules: [{ name: 'core', version: '1.0.0' }],
      });
      fs.writeFileSync(manifestPath, manifestContent);

      const results = findBmadRootsRecursive(fixture.tmpDir);

      expect(results).toHaveLength(1);
      expect(results[0].version).toBe('v6');
      expect(results[0].root).toBe(bmadDir);
      expect(results[0].manifestPath).toBe(manifestPath);
      expect(results[0].manifestDir).toBe(cfgDir);
      expect(results[0].depth).toBe(1);
    });

    it('should find v4 installation with install-manifest.yaml', () => {
      const bmadDir = path.join(fixture.tmpDir, '.bmad');
      fs.mkdirSync(bmadDir, { recursive: true });

      const manifestPath = path.join(bmadDir, 'install-manifest.yaml');
      const manifestContent = yaml.dump({
        version: '4.0.0',
        expansion_packs: ['core'],
      });
      fs.writeFileSync(manifestPath, manifestContent);

      const results = findBmadRootsRecursive(fixture.tmpDir);

      expect(results).toHaveLength(1);
      expect(results[0].version).toBe('v4');
      expect(results[0].root).toBe(bmadDir);
      expect(results[0].manifestPath).toBe(manifestPath);
      expect(results[0].manifestDir).toBeUndefined();
      expect(results[0].depth).toBe(1);
    });

    it('should find both v4 and v6 in same directory tree', () => {
      // Create v6 installation
      const v6Dir = path.join(fixture.tmpDir, 'bmad');
      const v6CfgDir = path.join(v6Dir, '_cfg');
      fs.mkdirSync(v6CfgDir, { recursive: true });
      fs.writeFileSync(
        path.join(v6CfgDir, 'manifest.yaml'),
        yaml.dump({ installation: { version: '6.0.0' } }),
      );

      // Create v4 installation
      const v4Dir = path.join(fixture.tmpDir, '.bmad-legacy');
      fs.mkdirSync(v4Dir, { recursive: true });
      fs.writeFileSync(
        path.join(v4Dir, 'install-manifest.yaml'),
        yaml.dump({ version: '4.0.0' }),
      );

      const results = findBmadRootsRecursive(fixture.tmpDir);

      expect(results).toHaveLength(2);
      const versions = results.map((r) => r.version).sort();
      expect(versions).toEqual(['v4', 'v6']);
    });

    it('should not recurse into v6 installations (modules are not nested installations)', () => {
      // Create bmad installation
      const bmadDir = path.join(fixture.tmpDir, 'bmad');
      const cfgDir = path.join(bmadDir, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });
      fs.writeFileSync(
        path.join(cfgDir, 'manifest.yaml'),
        yaml.dump({ installation: { version: '6.0.0' } }),
      );

      // Create a nested structure at depth 2 with agents folder
      // bmad/lib/agents should NOT be found because we don't recurse into v6 installations
      const libDir = path.join(bmadDir, 'lib');
      const libAgents = path.join(libDir, 'agents');
      fs.mkdirSync(libAgents, { recursive: true });
      fs.writeFileSync(path.join(libAgents, 'test.md'), 'test');

      const results = findBmadRootsRecursive(fixture.tmpDir);

      // Should only find bmad (v6), not the nested lib directory
      expect(results).toHaveLength(1);
      expect(results[0].root).toBe(bmadDir);
      expect(results[0].version).toBe('v6');
    });

    it('should search nested bmad folders up to maxDepth', () => {
      // Create nested structure: bmad/custom-bmad/agent-bmad
      const level1 = path.join(fixture.tmpDir, 'bmad');
      const level2 = path.join(level1, 'custom-bmad');
      const level3 = path.join(level2, 'agent-bmad');

      fs.mkdirSync(level3, { recursive: true });

      // Add v6 manifest at level 3
      const cfg3 = path.join(level3, '_cfg');
      fs.mkdirSync(cfg3, { recursive: true });
      fs.writeFileSync(
        path.join(cfg3, 'manifest.yaml'),
        yaml.dump({ installation: { version: '6.0.0-level3' } }),
      );

      const results = findBmadRootsRecursive(fixture.tmpDir, { maxDepth: 3 });

      expect(results).toHaveLength(1);
      expect(results[0].root).toBe(level3);
      expect(results[0].depth).toBe(3);
    });

    it('should respect maxDepth limit', () => {
      // Create nested structure beyond maxDepth
      const level1 = path.join(fixture.tmpDir, 'bmad');
      const level2 = path.join(level1, 'bmad-test');
      const level3 = path.join(level2, 'bmad-core');
      const level4 = path.join(level3, 'bmad-deep');

      fs.mkdirSync(level4, { recursive: true });

      // Add manifest at level 4 (should not be found with maxDepth=3)
      const cfg4 = path.join(level4, '_cfg');
      fs.mkdirSync(cfg4, { recursive: true });
      fs.writeFileSync(
        path.join(cfg4, 'manifest.yaml'),
        yaml.dump({ installation: { version: '6.0.0' } }),
      );

      const results = findBmadRootsRecursive(fixture.tmpDir, { maxDepth: 3 });

      expect(results).toHaveLength(0);
    });

    it('should prioritize v6 over v4 when both manifests exist', () => {
      const bmadDir = path.join(fixture.tmpDir, 'bmad');
      const cfgDir = path.join(bmadDir, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      // Add both v6 and v4 manifests (unusual but possible during migration)
      fs.writeFileSync(
        path.join(cfgDir, 'manifest.yaml'),
        yaml.dump({ installation: { version: '6.0.0' } }),
      );
      fs.writeFileSync(
        path.join(bmadDir, 'install-manifest.yaml'),
        yaml.dump({ version: '4.0.0' }),
      );

      const results = findBmadRootsRecursive(fixture.tmpDir);

      // Should only find v6 (takes precedence and stops recursion)
      expect(results).toHaveLength(1);
      expect(results[0].version).toBe('v6');
      expect(results[0].root).toBe(bmadDir);
    });

    it('should return empty array for non-existent path', () => {
      const nonExistent = path.join(fixture.tmpDir, 'does-not-exist');
      const results = findBmadRootsRecursive(nonExistent);

      expect(results).toEqual([]);
    });

    it('should return empty array for file path', () => {
      const filePath = path.join(fixture.tmpDir, 'test.txt');
      fs.writeFileSync(filePath, 'test');

      const results = findBmadRootsRecursive(filePath);

      expect(results).toEqual([]);
    });

    it('should skip hidden directories without "bmad" in name', () => {
      // Create hidden dir without bmad in name
      const hiddenDir = path.join(fixture.tmpDir, '.hidden');
      const hiddenCfg = path.join(hiddenDir, '_cfg');
      fs.mkdirSync(hiddenCfg, { recursive: true });
      fs.writeFileSync(
        path.join(hiddenCfg, 'manifest.yaml'),
        yaml.dump({ installation: { version: '6.0.0' } }),
      );

      const results = findBmadRootsRecursive(fixture.tmpDir);

      expect(results).toHaveLength(0);
    });

    it('should find installations in hidden bmad directories', () => {
      const bmadDir = path.join(fixture.tmpDir, '.bmad-core');
      const cfgDir = path.join(bmadDir, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });
      fs.writeFileSync(
        path.join(cfgDir, 'manifest.yaml'),
        yaml.dump({ installation: { version: '6.0.0' } }),
      );

      const results = findBmadRootsRecursive(fixture.tmpDir);

      expect(results).toHaveLength(1);
      expect(results[0].root).toBe(bmadDir);
    });

    it('should detect custom installations with agents folder', () => {
      const customDir = path.join(fixture.tmpDir, 'custom-bmad');
      const agentsDir = path.join(customDir, 'agents');
      fs.mkdirSync(agentsDir, { recursive: true });
      fs.writeFileSync(path.join(agentsDir, 'my-agent.md'), 'test');

      const results = findBmadRootsRecursive(fixture.tmpDir);

      expect(results).toHaveLength(1);
      expect(results[0].version).toBe('unknown');
      expect(results[0].root).toBe(customDir);
      expect(results[0].isCustom).toBe(true);
      expect(results[0].manifestPath).toBeUndefined();
    });

    it('should detect custom installations with workflows folder', () => {
      const customDir = path.join(fixture.tmpDir, 'my-bmad-workflows');
      const workflowsDir = path.join(customDir, 'workflows');
      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.writeFileSync(path.join(workflowsDir, 'my-workflow.md'), 'test');

      const results = findBmadRootsRecursive(fixture.tmpDir);

      expect(results).toHaveLength(1);
      expect(results[0].version).toBe('unknown');
      expect(results[0].isCustom).toBe(true);
    });

    it('should prefer manifest-based over custom when both exist', () => {
      const bmadDir = path.join(fixture.tmpDir, 'bmad');
      fs.mkdirSync(bmadDir, { recursive: true });

      // Add both manifest and agents folder
      const cfgDir = path.join(bmadDir, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });
      fs.writeFileSync(
        path.join(cfgDir, 'manifest.yaml'),
        yaml.dump({ installation: { version: '6.0.0' } }),
      );

      const agentsDir = path.join(bmadDir, 'agents');
      fs.mkdirSync(agentsDir, { recursive: true });

      const results = findBmadRootsRecursive(fixture.tmpDir);

      // Should only find v6, not custom (manifest takes precedence)
      expect(results).toHaveLength(1);
      expect(results[0].version).toBe('v6');
      expect(results[0].isCustom).toBeUndefined();
    });

    it('should not recurse into custom installations', () => {
      // Create nested structure
      const level1 = path.join(fixture.tmpDir, 'bmad-custom');
      const level2 = path.join(level1, 'nested-bmad');

      fs.mkdirSync(path.join(level1, 'agents'), { recursive: true });
      fs.mkdirSync(path.join(level2, 'workflows'), { recursive: true });

      const results = findBmadRootsRecursive(fixture.tmpDir);

      // Should only find level1 (stops recursing once installation is found)
      expect(results).toHaveLength(1);
      expect(results[0].version).toBe('unknown');
      expect(results[0].isCustom).toBe(true);
      expect(results[0].root).toBe(level1);
    });
  });

  describe('findBmadRoot', () => {
    it('should return first (shallowest) installation', () => {
      // Create two installations at different depths
      const shallow = path.join(fixture.tmpDir, 'bmad');
      const deep = path.join(shallow, 'nested-bmad');

      fs.mkdirSync(path.join(shallow, '_cfg'), { recursive: true });
      fs.writeFileSync(
        path.join(shallow, '_cfg', 'manifest.yaml'),
        yaml.dump({ installation: { version: '6.0.0' } }),
      );

      fs.mkdirSync(path.join(deep, '_cfg'), { recursive: true });
      fs.writeFileSync(
        path.join(deep, '_cfg', 'manifest.yaml'),
        yaml.dump({ installation: { version: '6.1.0' } }),
      );

      const result = findBmadRoot(fixture.tmpDir);

      expect(result).toBeDefined();
      expect(result?.root).toBe(shallow);
      expect(result?.depth).toBe(1);
    });

    it('should return undefined when no installation found', () => {
      const result = findBmadRoot(fixture.tmpDir);
      expect(result).toBeUndefined();
    });
  });

  describe('sortBmadRoots', () => {
    it('should sort by depth (shallowest first)', () => {
      const roots: FoundBmadRoot[] = [
        {
          version: 'v6',
          root: '/deep/bmad',
          manifestPath: '/deep/bmad/_cfg/manifest.yaml',
          manifestDir: '/deep/bmad/_cfg',
          depth: 3,
        },
        {
          version: 'v6',
          root: '/shallow/bmad',
          manifestPath: '/shallow/bmad/_cfg/manifest.yaml',
          manifestDir: '/shallow/bmad/_cfg',
          depth: 1,
        },
      ];

      const sorted = sortBmadRoots(roots);

      expect(sorted[0].depth).toBe(1);
      expect(sorted[1].depth).toBe(3);
    });

    it('should prefer v6 over v4 at same depth', () => {
      const roots: FoundBmadRoot[] = [
        {
          version: 'v4',
          root: '/bmad-v4',
          manifestPath: '/bmad-v4/install-manifest.yaml',
          depth: 1,
        },
        {
          version: 'v6',
          root: '/bmad-v6',
          manifestPath: '/bmad-v6/_cfg/manifest.yaml',
          manifestDir: '/bmad-v6/_cfg',
          depth: 1,
        },
      ];

      const sorted = sortBmadRoots(roots);

      expect(sorted[0].version).toBe('v6');
      expect(sorted[1].version).toBe('v4');
    });

    it('should prefer manifest-based over custom (unknown)', () => {
      const roots: FoundBmadRoot[] = [
        {
          version: 'unknown',
          root: '/custom-bmad',
          depth: 1,
          isCustom: true,
        },
        {
          version: 'v4',
          root: '/bmad-v4',
          manifestPath: '/bmad-v4/install-manifest.yaml',
          depth: 1,
        },
        {
          version: 'v6',
          root: '/bmad-v6',
          manifestPath: '/bmad-v6/_cfg/manifest.yaml',
          manifestDir: '/bmad-v6/_cfg',
          depth: 1,
        },
      ];

      const sorted = sortBmadRoots(roots);

      expect(sorted[0].version).toBe('v6');
      expect(sorted[1].version).toBe('v4');
      expect(sorted[2].version).toBe('unknown');
    });

    it('should sort alphabetically when depth and version are equal', () => {
      const roots: FoundBmadRoot[] = [
        {
          version: 'v6',
          root: '/zebra/bmad',
          manifestPath: '/zebra/bmad/_cfg/manifest.yaml',
          manifestDir: '/zebra/bmad/_cfg',
          depth: 1,
        },
        {
          version: 'v6',
          root: '/alpha/bmad',
          manifestPath: '/alpha/bmad/_cfg/manifest.yaml',
          manifestDir: '/alpha/bmad/_cfg',
          depth: 1,
        },
      ];

      const sorted = sortBmadRoots(roots);

      expect(sorted[0].root).toBe('/alpha/bmad');
      expect(sorted[1].root).toBe('/zebra/bmad');
    });
  });
});
