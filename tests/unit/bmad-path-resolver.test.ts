/**
 * Unit tests for bmad-path-resolver
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolveBmadPaths,
  detectManifestDirectory,
} from '../../src/utils/bmad-path-resolver.js';
import {
  createTestFixture,
  createBMADStructure,
  type TestFixture,
} from '../helpers/test-fixtures.js';
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

      // Create bmad structure in package location
      const packageBmad = path.join(fixture.tmpDir, 'package', 'bmad', '_cfg');
      fs.mkdirSync(packageBmad, { recursive: true });

      const result = resolveBmadPaths({
        cwd: path.join(fixture.tmpDir, 'project'),
        packageRoot: path.join(fixture.tmpDir, 'package'),
      });

      expect(result.activeLocation.source).toBe('project');
      expect(result.activeLocation.status).toBe('valid');
    });

    it('should skip invalid BMAD_ROOT and fall back to next priority', () => {
      // Create an invalid env path (file, not directory)
      const invalidEnv = path.join(fixture.tmpDir, 'invalid-file.txt');
      fs.writeFileSync(invalidEnv, 'not a directory');

      // Create valid package location
      const packageBmad = path.join(fixture.tmpDir, 'package', 'bmad', '_cfg');
      fs.mkdirSync(packageBmad, { recursive: true });

      // Use a non-existent working directory to avoid project detection
      const result = resolveBmadPaths({
        cwd: '/nonexistent/path',
        envVar: invalidEnv,
        packageRoot: path.join(fixture.tmpDir, 'package'),
      });

      // Should skip the invalid env (file) and use package
      expect(result.activeLocation.source).toBe('package');
      expect(result.activeLocation.status).toBe('valid');

      // Verify env location is marked as invalid
      const envLocation = result.locations.find((loc) => loc.source === 'env');
      expect(envLocation?.status).toBe('invalid');
    });

    it('should accept directory as valid BMAD_ROOT even without _cfg structure', () => {
      // Create a simple directory without bmad/_cfg structure
      const customBmad = path.join(fixture.tmpDir, 'custom-bmad');
      fs.mkdirSync(customBmad, { recursive: true });

      // Create valid package location as fallback
      const packageBmad = path.join(fixture.tmpDir, 'package', 'bmad', '_cfg');
      fs.mkdirSync(packageBmad, { recursive: true });

      const result = resolveBmadPaths({
        cwd: '/nonexistent/path',
        envVar: customBmad,
        packageRoot: path.join(fixture.tmpDir, 'package'),
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
        cliArg: path.join(fixture.tmpDir, 'cli'),
        envVar: path.join(fixture.tmpDir, 'env'),
        packageRoot: fixture.tmpDir,
      });

      expect(result.activeLocation.source).toBe('cli');
      expect(result.activeLocation.status).toBe('valid');
    });

    it('should not throw error when directory exists but has no bmad structure', () => {
      const emptyDir = path.join(fixture.tmpDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      const result = resolveBmadPaths({
        cwd: '/nonexistent/path',
        packageRoot: emptyDir,
      });

      // Should use the package location (even if it's just an empty directory)
      expect(result.activeLocation.source).toBe('package');
      expect(result.activeLocation.status).toBe('valid');
    });

    it('should accept directory without bmad/_cfg structure', () => {
      // Create a simple directory without bmad structure
      const simpleDir = path.join(fixture.tmpDir, 'simple');
      fs.mkdirSync(simpleDir, { recursive: true });

      const result = resolveBmadPaths({
        cwd: '/some/other/path',
        envVar: simpleDir,
        packageRoot: fixture.tmpDir,
      });

      // Should accept the simple directory
      expect(result.activeLocation.source).toBe('env');
      expect(result.activeLocation.status).toBe('valid');
      expect(result.activeLocation.resolvedRoot).toBe(simpleDir);
    });

    it('should handle src/bmad structure in package root', () => {
      createBMADStructure(fixture.tmpDir);

      const result = resolveBmadPaths({
        cwd: '/some/other/path',
        packageRoot: fixture.tmpDir,
      });

      expect(result.activeLocation.source).toBe('package');
      expect(result.activeLocation.status).toBe('valid');
      expect(result.activeLocation.resolvedRoot).toBe(
        path.join(fixture.tmpDir, 'src', 'bmad'),
      );
    });
  });
});
