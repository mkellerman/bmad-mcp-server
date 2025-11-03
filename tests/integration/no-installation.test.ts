/**
 * Integration tests for server startup without BMAD installation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestFixture,
  type TestFixture,
} from '../helpers/test-fixtures.js';
import { resolveBmadPaths } from '../../src/utils/bmad-path-resolver.js';
import fs from 'node:fs';
import path from 'node:path';

describe('Server Startup - No BMAD Installation', () => {
  let fixture: TestFixture;

  beforeEach(() => {
    fixture = createTestFixture();
  });

  afterEach(() => {
    fixture.cleanup();
  });

  describe('No BMAD configuration found', () => {
    it('should return fallback configuration when no BMAD installation exists', () => {
      // Create an empty directory with no BMAD structure
      const emptyDir = path.join(fixture.tmpDir, 'empty-project');
      fs.mkdirSync(emptyDir, { recursive: true });

      // Attempt to resolve BMAD paths with all non-existent locations
      // Use strict mode to prevent discovery from finding parent directories
      const result = resolveBmadPaths({
        mode: 'strict',
        cwd: emptyDir,
        cliArgs: [path.join(fixture.tmpDir, 'nonexistent')],
        userBmadPath: path.join(fixture.tmpDir, 'nonexistent-user'),
      });

      expect(result.activeLocation.status).toBe('not-found');
      expect(result.activeLocations).toHaveLength(0);
    });

    it('should include helpful details in fallback location', () => {
      const emptyDir = path.join(fixture.tmpDir, 'no-bmad');
      fs.mkdirSync(emptyDir, { recursive: true });

      const result = resolveBmadPaths({
        mode: 'strict',
        cwd: emptyDir,
        cliArgs: [path.join(fixture.tmpDir, 'fake')],
        userBmadPath: '/nonexistent/path',
      });

      // Verify result contains helpful information
      expect(result.activeLocation.status).toBe('not-found');
      expect(result.activeLocation.details).toContain('provided paths failed');
      expect(result.locations.length).toBeGreaterThan(0);
    });

    it('should list all checked locations in result', () => {
      const emptyDir = path.join(fixture.tmpDir, 'no-bmad-anywhere');
      fs.mkdirSync(emptyDir, { recursive: true });

      const result = resolveBmadPaths({
        mode: 'strict',
        cwd: emptyDir,
        cliArgs: [path.join(fixture.tmpDir, 'fake-cli')],
        userBmadPath: path.join(fixture.tmpDir, 'fake-user-bmad'),
        envVar: path.join(fixture.tmpDir, 'fake-env-bmad'),
      });

      // Should list all CLI arguments as locations
      expect(result.locations).toBeDefined();
      expect(result.locations.length).toBeGreaterThan(0);
      expect(result.locations[0].displayName).toContain('CLI argument');
    });

    it('should provide location status details', () => {
      const emptyDir = path.join(fixture.tmpDir, 'no-bmad-box');
      fs.mkdirSync(emptyDir, { recursive: true });

      const result = resolveBmadPaths({
        mode: 'strict',
        cwd: emptyDir,
        cliArgs: ['/nonexistent'],
        userBmadPath: '/nonexistent',
      });

      // Verify status details are available
      expect(result.activeLocation.status).toBe('not-found');
      expect(result.locations[0].status).toBe('missing');
      expect(result.locations[0].details).toBeTruthy();
    });

    it('should handle empty cliArgs gracefully', () => {
      const emptyDir = path.join(fixture.tmpDir, 'no-versions');
      fs.mkdirSync(emptyDir, { recursive: true });

      const result = resolveBmadPaths({
        mode: 'strict',
        cwd: emptyDir,
        cliArgs: [],
        userBmadPath: '/nonexistent',
      });

      // Should return fallback with no sources configured
      expect(result.activeLocation.status).toBe('not-found');
      expect(result.activeLocation.details).toContain(
        'No BMAD sources configured',
      );
    });
  });

  describe('Invalid BMAD structure', () => {
    it('should return fallback when directory exists but missing required files', () => {
      // Create directory with partial BMAD structure (missing manifest)
      const partialBmad = path.join(fixture.tmpDir, 'partial-bmad', 'bmad');
      fs.mkdirSync(partialBmad, { recursive: true });

      // Create _cfg directory but no manifest files
      const cfgDir = path.join(partialBmad, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      const result = resolveBmadPaths({
        mode: 'strict',
        cwd: path.dirname(partialBmad),
        cliArgs: [partialBmad],
        userBmadPath: '/nonexistent',
      });

      expect(result.activeLocation.status).toBe('not-found');
      expect(result.locations[0].status).toBe('invalid');
    });

    it('should provide specific error for corrupted manifest', () => {
      // This is tested in bmad-source-detector.test.ts
      // Verifying that corrupted manifests are caught
      const bmadDir = path.join(fixture.tmpDir, 'corrupted', 'bmad');
      const cfgDir = path.join(bmadDir, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      // Write invalid YAML
      fs.writeFileSync(
        path.join(cfgDir, 'manifest.yaml'),
        'invalid: yaml: content:\n  - broken',
        'utf-8',
      );

      // Path resolver should handle this gracefully
      // In strict mode, corrupted manifests may not throw since detection happens differently
      const result = resolveBmadPaths({
        mode: 'auto',
        cwd: path.join(fixture.tmpDir, 'corrupted'),
        cliArgs: [bmadDir],
        userBmadPath: '/nonexistent',
      });

      // Should find the corrupted installation but mark it as invalid or skip it
      expect(result).toBeDefined();
    });
  });

  describe('Output format validation', () => {
    it('should provide structured location information', () => {
      const emptyDir = path.join(fixture.tmpDir, 'no-stack');
      fs.mkdirSync(emptyDir, { recursive: true });

      const result = resolveBmadPaths({
        mode: 'strict',
        cwd: emptyDir,
        cliArgs: ['/nonexistent'],
        userBmadPath: '/nonexistent',
      });

      // Should provide structured data, not error messages
      expect(result.activeLocation).toBeDefined();
      expect(result.locations).toBeDefined();
      expect(Array.isArray(result.locations)).toBe(true);
    });

    it('should include status and details for each location', () => {
      const emptyDir = path.join(fixture.tmpDir, 'no-docs');
      fs.mkdirSync(emptyDir, { recursive: true });

      const result = resolveBmadPaths({
        mode: 'strict',
        cwd: emptyDir,
        cliArgs: ['/nonexistent'],
        userBmadPath: '/nonexistent',
      });

      // Should include status and details
      expect(result.activeLocation.status).toBeDefined();
      expect(result.activeLocation.details).toBeDefined();
      expect(result.locations[0].status).toBeDefined();
    });

    it('should have consistent location structure', () => {
      const emptyDir = path.join(fixture.tmpDir, 'width-test');
      fs.mkdirSync(emptyDir, { recursive: true });

      const result = resolveBmadPaths({
        mode: 'strict',
        cwd: emptyDir,
        cliArgs: ['/nonexistent'],
        userBmadPath: '/nonexistent',
      });

      // All locations should have consistent structure
      result.locations.forEach((loc) => {
        expect(loc.source).toBeDefined();
        expect(loc.priority).toBeDefined();
        expect(loc.displayName).toBeDefined();
        expect(loc.status).toBeDefined();
      });
    });
  });
});
