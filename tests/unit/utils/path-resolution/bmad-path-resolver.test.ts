/**
 * Unit tests for bmad-path-resolver
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolveBmadPaths,
  detectManifestDirectory,
} from '../../../../src/utils/bmad-path-resolver.js';
import {
  createTestFixture,
  createBMADStructure,
  type TestFixture,
} from '../../../helpers/test-fixtures.js';
import fs from 'node:fs';
import path from 'node:path';

describe('bmad-path-resolver', () => {
  let fixture: TestFixture;

  beforeEach(() => {
    fixture = createTestFixture();
  });

  afterEach(() => {
    fixture.cleanup();
  });

  describe('detectManifestDirectory', () => {
    it('should detect src/bmad/_cfg structure', () => {
      createBMADStructure(fixture.tmpDir);
      const result = detectManifestDirectory(fixture.tmpDir);

      expect(result).toBeDefined();
      expect(result?.resolvedRoot).toBe(
        path.join(fixture.tmpDir, 'src', 'bmad'),
      );
      expect(result?.manifestDir).toBe(
        path.join(fixture.tmpDir, 'src', 'bmad', '_cfg'),
      );
    });

    it('should detect bmad/_cfg structure', () => {
      const bmadDir = path.join(fixture.tmpDir, 'bmad', '_cfg');
      fs.mkdirSync(bmadDir, { recursive: true });

      const result = detectManifestDirectory(fixture.tmpDir);

      expect(result).toBeDefined();
      expect(result?.resolvedRoot).toBe(path.join(fixture.tmpDir, 'bmad'));
      expect(result?.manifestDir).toBe(bmadDir);
    });

    it('should detect when path is bmad directory itself', () => {
      const bmadDir = path.join(fixture.tmpDir, 'bmad');
      const cfgDir = path.join(bmadDir, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      const result = detectManifestDirectory(bmadDir);

      expect(result).toBeDefined();
      expect(result?.resolvedRoot).toBe(bmadDir);
      expect(result?.manifestDir).toBe(cfgDir);
    });

    it('should detect when path is _cfg directory itself', () => {
      const bmadDir = path.join(fixture.tmpDir, 'bmad');
      const cfgDir = path.join(bmadDir, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      const result = detectManifestDirectory(cfgDir);

      expect(result).toBeDefined();
      expect(result?.resolvedRoot).toBe(bmadDir);
      expect(result?.manifestDir).toBe(cfgDir);
    });

    it('should return undefined for path without bmad folder', () => {
      const emptyDir = path.join(fixture.tmpDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      const result = detectManifestDirectory(emptyDir);

      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent path', () => {
      const nonExistent = path.join(fixture.tmpDir, 'does-not-exist');
      const result = detectManifestDirectory(nonExistent);

      expect(result).toBeUndefined();
    });

    it('should return undefined for path with only _cfg but not in bmad context', () => {
      const randomDir = path.join(fixture.tmpDir, 'random');
      const cfgDir = path.join(randomDir, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      const result = detectManifestDirectory(randomDir);

      expect(result).toBeUndefined();
    });
  });

  describe('resolveBmadPaths', () => {
    it('should prioritize project location over others', () => {
      // Create bmad structure in project root
      const projectBmad = path.join(fixture.tmpDir, 'project', 'bmad', '_cfg');
      fs.mkdirSync(projectBmad, { recursive: true });

      // Create bmad structure in user location
      const userBmad = path.join(fixture.tmpDir, 'user', 'bmad', '_cfg');
      fs.mkdirSync(userBmad, { recursive: true });

      const result = resolveBmadPaths({
        cwd: path.join(fixture.tmpDir, 'project'),
        userBmadPath: path.join(fixture.tmpDir, 'user'),
      });

      expect(result.activeLocation.source).toBe('project');
      expect(result.activeLocation.status).toBe('valid');
    });

    it('should skip invalid BMAD_ROOT and fall back to next priority', () => {
      // Create an invalid env path (file, not directory)
      const invalidEnv = path.join(fixture.tmpDir, 'invalid-file.txt');
      fs.writeFileSync(invalidEnv, 'not a directory');

      // Create valid user location
      const userBmad = path.join(fixture.tmpDir, 'user', 'bmad', '_cfg');
      fs.mkdirSync(userBmad, { recursive: true });

      // Use a non-existent working directory to avoid project detection
      const result = resolveBmadPaths({
        cwd: '/nonexistent/path',
        envVar: invalidEnv,
        userBmadPath: path.join(fixture.tmpDir, 'user'),
      });

      // Should skip the invalid env (file) and use user location
      expect(result.activeLocation.source).toBe('user');
      expect(result.activeLocation.status).toBe('valid');

      // Verify env location is marked as invalid
      const envLocation = result.locations.find((loc) => loc.source === 'env');
      expect(envLocation?.status).toBe('invalid');
    });

    it('should accept directory as valid BMAD_ROOT even without _cfg structure', () => {
      // Create a simple directory without bmad/_cfg structure
      const customBmad = path.join(fixture.tmpDir, 'custom-bmad');
      fs.mkdirSync(customBmad, { recursive: true });

      const result = resolveBmadPaths({
        cwd: '/nonexistent/path',
        envVar: customBmad,
      });

      // Should use the custom directory even without _cfg
      expect(result.activeLocation.source).toBe('env');
      expect(result.activeLocation.status).toBe('valid');
      expect(result.activeLocation.resolvedRoot).toBe(customBmad);
    });

    it('should prioritize CLI arg over env var', () => {
      // Create valid CLI location
      const cliBmad = path.join(fixture.tmpDir, 'cli', 'bmad', '_cfg');
      fs.mkdirSync(cliBmad, { recursive: true });

      // Create valid env location
      const envBmad = path.join(fixture.tmpDir, 'env', 'bmad', '_cfg');
      fs.mkdirSync(envBmad, { recursive: true });

      const result = resolveBmadPaths({
        cwd: '/nonexistent/path',
        cliArgs: [path.join(fixture.tmpDir, 'cli')],
        envVar: path.join(fixture.tmpDir, 'env'),
      });

      expect(result.activeLocation.source).toBe('cli');
      expect(result.activeLocation.status).toBe('valid');
    });

    it('should throw error when no valid BMAD installation found', () => {
      // Use non-existent paths for all locations
      expect(() => {
        resolveBmadPaths({
          cwd: '/nonexistent/path',
          userBmadPath: '/nonexistent/user',
        });
      }).toThrow(/BMAD Installation Not Found/);
    });

    it('should accept directory without bmad/_cfg structure', () => {
      // Create a simple directory without bmad structure
      const simpleDir = path.join(fixture.tmpDir, 'simple');
      fs.mkdirSync(simpleDir, { recursive: true });

      const result = resolveBmadPaths({
        cwd: '/some/other/path',
        envVar: simpleDir,
      });

      // Should accept the simple directory
      expect(result.activeLocation.source).toBe('env');
      expect(result.activeLocation.status).toBe('valid');
      expect(result.activeLocation.resolvedRoot).toBe(simpleDir);
    });

    it('should use user location when project location not found', () => {
      // Create user bmad structure - use .bmad as the user path (typical ~/.bmad pattern)
      const userBmadDir = path.join(fixture.tmpDir, '.bmad');
      const cfgDir = path.join(userBmadDir, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      const result = resolveBmadPaths({
        cwd: '/some/other/path',
        userBmadPath: userBmadDir,
      });

      expect(result.activeLocation.source).toBe('user');
      expect(result.activeLocation.status).toBe('valid');
      // The resolver finds the bmad root directly
      expect(result.activeLocation.resolvedRoot).toBe(userBmadDir);
    });
  });

  describe('strict mode', () => {
    it('should return fallback when strict mode has no CLI args', () => {
      const result = resolveBmadPaths({
        cwd: fixture.tmpDir,
        mode: 'strict',
      });

      expect(result.activeLocation.status).toBe('not-found');
      expect(result.activeLocations).toHaveLength(0);
      expect(result.activeLocation.details).toContain(
        'No BMAD sources configured',
      );
    });

    it('should return fallback when strict mode path does not exist', () => {
      const result = resolveBmadPaths({
        cwd: fixture.tmpDir,
        cliArgs: ['/nonexistent/path'],
        mode: 'strict',
      });

      expect(result.activeLocation.status).toBe('not-found');
      expect(result.activeLocations).toHaveLength(0);
      expect(result.locations[0].status).toBe('missing');
      expect(result.locations[0].details).toBe('Path does not exist');
    });

    it('should return fallback when strict mode path is not a directory', () => {
      const filePath = path.join(fixture.tmpDir, 'file.txt');
      fs.writeFileSync(filePath, 'content');

      const result = resolveBmadPaths({
        cwd: fixture.tmpDir,
        cliArgs: [filePath],
        mode: 'strict',
      });

      expect(result.activeLocation.status).toBe('not-found');
      expect(result.activeLocations).toHaveLength(0);
      expect(result.locations[0].status).toBe('invalid');
      expect(result.locations[0].details).toBe('Path is not a directory');
    });

    it('should return fallback when strict mode path has no BMAD installation', () => {
      const emptyDir = path.join(fixture.tmpDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      const result = resolveBmadPaths({
        cwd: fixture.tmpDir,
        cliArgs: [emptyDir],
        mode: 'strict',
      });

      expect(result.activeLocation.status).toBe('not-found');
      expect(result.activeLocations).toHaveLength(0);
      expect(result.locations[0].status).toBe('invalid');
      expect(result.locations[0].details).toContain(
        'No BMAD installation found',
      );
    });

    it('should succeed when strict mode has valid v6 installation', () => {
      const bmadDir = path.join(fixture.tmpDir, 'bmad');
      const cfgDir = path.join(bmadDir, '_cfg');
      const manifestPath = path.join(cfgDir, 'manifest.yaml');
      fs.mkdirSync(cfgDir, { recursive: true });
      fs.writeFileSync(manifestPath, 'version: 6');

      const result = resolveBmadPaths({
        cwd: '/some/other/path',
        cliArgs: [bmadDir],
        mode: 'strict',
      });

      expect(result.activeLocation.status).toBe('valid');
      expect(result.activeLocation.source).toBe('cli');
      expect(result.activeLocation.version).toBe('v6');
      expect(result.activeLocation.resolvedRoot).toBe(bmadDir);
    });

    it('should succeed when strict mode has valid v4 installation', () => {
      const v4Dir = path.join(fixture.tmpDir, 'v4-bmad');
      const manifestPath = path.join(v4Dir, 'install-manifest.yaml');
      fs.mkdirSync(v4Dir, { recursive: true });
      fs.writeFileSync(manifestPath, 'version: 4');

      const result = resolveBmadPaths({
        cwd: '/some/other/path',
        cliArgs: [v4Dir],
        mode: 'strict',
      });

      expect(result.activeLocation.status).toBe('valid');
      expect(result.activeLocation.source).toBe('cli');
      expect(result.activeLocation.version).toBe('v4');
      expect(result.activeLocation.resolvedRoot).toBe(v4Dir);
    });

    it('should use first valid path when multiple CLI args provided in strict mode', () => {
      const bmadDir1 = path.join(fixture.tmpDir, 'bmad1');
      const cfgDir1 = path.join(bmadDir1, '_cfg');
      const manifestPath1 = path.join(cfgDir1, 'manifest.yaml');
      fs.mkdirSync(cfgDir1, { recursive: true });
      fs.writeFileSync(manifestPath1, 'version: 6');

      const bmadDir2 = path.join(fixture.tmpDir, 'bmad2');
      const cfgDir2 = path.join(bmadDir2, '_cfg');
      const manifestPath2 = path.join(cfgDir2, 'manifest.yaml');
      fs.mkdirSync(cfgDir2, { recursive: true });
      fs.writeFileSync(manifestPath2, 'version: 6');

      const result = resolveBmadPaths({
        cwd: '/some/other/path',
        cliArgs: [bmadDir1, bmadDir2],
        mode: 'strict',
      });

      expect(result.activeLocation.status).toBe('valid');
      expect(result.activeLocation.resolvedRoot).toBe(bmadDir1);
    });

    it('should not use auto-discovery in strict mode', () => {
      // Create valid project bmad structure
      const projectBmad = path.join(fixture.tmpDir, 'bmad', '_cfg');
      fs.mkdirSync(projectBmad, { recursive: true });

      // In strict mode, should return fallback even though project has valid bmad
      const result = resolveBmadPaths({
        cwd: fixture.tmpDir,
        mode: 'strict',
      });

      expect(result.activeLocation.status).toBe('not-found');
      expect(result.activeLocations).toHaveLength(0);
    });

    it('should accept custom installations in strict mode', () => {
      const customDir = path.join(fixture.tmpDir, 'custom-bmad');
      const agentsDir = path.join(customDir, 'agents');
      const workflowsDir = path.join(customDir, 'workflows');
      fs.mkdirSync(agentsDir, { recursive: true });
      fs.mkdirSync(workflowsDir, { recursive: true });

      const result = resolveBmadPaths({
        cwd: '/some/other/path',
        cliArgs: [customDir],
        mode: 'strict',
      });

      expect(result.activeLocation.status).toBe('valid');
      expect(result.activeLocation.source).toBe('cli');
      expect(result.activeLocation.version).toBe('unknown');
      expect(result.activeLocation.resolvedRoot).toBe(customDir);
    });
  });

  describe('auto mode (default)', () => {
    it('should use auto-discovery by default', () => {
      // Create bmad structure in project root
      const projectBmad = path.join(fixture.tmpDir, 'bmad', '_cfg');
      fs.mkdirSync(projectBmad, { recursive: true });

      const result = resolveBmadPaths({
        cwd: fixture.tmpDir,
      });

      expect(result.activeLocation.source).toBe('project');
      expect(result.activeLocation.status).toBe('valid');
    });

    it('should discover recursively in auto mode', () => {
      // Create nested bmad structure
      const nestedBmad = path.join(fixture.tmpDir, 'nested', 'bmad', '_cfg');
      fs.mkdirSync(nestedBmad, { recursive: true });

      const result = resolveBmadPaths({
        cwd: fixture.tmpDir,
      });

      expect(result.activeLocation.status).toBe('valid');
      expect(result.activeLocation.resolvedRoot).toContain('bmad');
    });

    it('should respect mode parameter when set to auto', () => {
      const projectBmad = path.join(fixture.tmpDir, 'bmad', '_cfg');
      fs.mkdirSync(projectBmad, { recursive: true });

      const result = resolveBmadPaths({
        cwd: fixture.tmpDir,
        mode: 'auto',
      });

      expect(result.activeLocation.source).toBe('project');
      expect(result.activeLocation.status).toBe('valid');
    });
  });
});
