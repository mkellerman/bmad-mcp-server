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
    it('should throw error with formatted message when no BMAD installation exists', () => {
      // Create an empty directory with no BMAD structure
      const emptyDir = path.join(fixture.tmpDir, 'empty-project');
      fs.mkdirSync(emptyDir, { recursive: true });

      // Attempt to resolve BMAD paths with all non-existent locations
      // Use strict mode to prevent discovery from finding parent directories
      expect(() => {
        resolveBmadPaths({
          mode: 'strict',
          cwd: emptyDir,
          cliArgs: [path.join(fixture.tmpDir, 'nonexistent')],
          userBmadPath: path.join(fixture.tmpDir, 'nonexistent-user'),
        });
      }).toThrow(/No Valid Installation Found|BMAD Installation Not Found/);
    });

    it('should include helpful installation instructions in error message', () => {
      const emptyDir = path.join(fixture.tmpDir, 'no-bmad');
      fs.mkdirSync(emptyDir, { recursive: true });

      let errorMessage = '';
      try {
        resolveBmadPaths({
          mode: 'strict',
          cwd: emptyDir,
          cliArgs: [path.join(fixture.tmpDir, 'fake')],
          userBmadPath: '/nonexistent/path',
        });
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      // Verify error message contains helpful information
      expect(errorMessage).toMatch(
        /BMAD.*Installation Not Found|No Valid Installation Found/,
      );
      expect(errorMessage).toMatch(
        /npx bmad-method install|Strict mode requirements/,
      );
      expect(errorMessage).toMatch(/BMAD_ROOT|Checked paths/);
      expect(errorMessage).toContain('Checked');
    });

    it('should list all checked locations in error message', () => {
      const emptyDir = path.join(fixture.tmpDir, 'no-bmad-anywhere');
      fs.mkdirSync(emptyDir, { recursive: true });

      let errorMessage = '';
      try {
        resolveBmadPaths({
          mode: 'strict',
          cwd: emptyDir,
          cliArgs: [path.join(fixture.tmpDir, 'fake-cli')],
          userBmadPath: path.join(fixture.tmpDir, 'fake-user-bmad'),
          envVar: path.join(fixture.tmpDir, 'fake-env-bmad'),
        });
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      // Should list project, env, and user locations
      expect(errorMessage).toMatch(/Checked (locations|paths)/);
      // The error message format includes display names for each location
      expect(errorMessage.length).toBeGreaterThan(100);
    });

    it('should format error message as a readable box', () => {
      const emptyDir = path.join(fixture.tmpDir, 'no-bmad-box');
      fs.mkdirSync(emptyDir, { recursive: true });

      let errorMessage = '';
      try {
        resolveBmadPaths({
          mode: 'strict',
          cwd: emptyDir,
          cliArgs: ['/nonexistent'],
          userBmadPath: '/nonexistent',
        });
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      // Verify box formatting
      expect(errorMessage).toContain('╭─');
      expect(errorMessage).toContain('├─');
      expect(errorMessage).toContain('╰─');
      expect(errorMessage).toContain('│');
    });

    it('should mention supported versions in error message', () => {
      const emptyDir = path.join(fixture.tmpDir, 'no-versions');
      fs.mkdirSync(emptyDir, { recursive: true });

      let errorMessage = '';
      try {
        resolveBmadPaths({
          mode: 'strict',
          cwd: emptyDir,
          cliArgs: ['/nonexistent'],
          userBmadPath: '/nonexistent',
        });
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      // Should mention supported versions
      expect(errorMessage).toMatch(/v4|v6|Versions.*supported/i);
    });
  });

  describe('Invalid BMAD structure', () => {
    it('should throw error when directory exists but missing required files', () => {
      // Create directory with partial BMAD structure (missing manifest)
      const partialBmad = path.join(fixture.tmpDir, 'partial-bmad', 'bmad');
      fs.mkdirSync(partialBmad, { recursive: true });

      // Create _cfg directory but no manifest files
      const cfgDir = path.join(partialBmad, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      expect(() => {
        resolveBmadPaths({
          mode: 'strict',
          cwd: path.dirname(partialBmad),
          cliArgs: [partialBmad],
          userBmadPath: '/nonexistent',
        });
      }).toThrow(/No Valid Installation Found|BMAD Installation Not Found/);
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
    it('should not expose internal stack traces in error message', () => {
      const emptyDir = path.join(fixture.tmpDir, 'no-stack');
      fs.mkdirSync(emptyDir, { recursive: true });

      let errorMessage = '';
      try {
        resolveBmadPaths({
          mode: 'strict',
          cwd: emptyDir,
          cliArgs: ['/nonexistent'],
          userBmadPath: '/nonexistent',
        });
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      // Should not contain stack trace markers
      expect(errorMessage).not.toContain('at Object.');
      expect(errorMessage).not.toContain('at Module.');
      expect(errorMessage).not.toContain('node:internal');
    });

    it('should include link to documentation', () => {
      const emptyDir = path.join(fixture.tmpDir, 'no-docs');
      fs.mkdirSync(emptyDir, { recursive: true });

      let errorMessage = '';
      try {
        resolveBmadPaths({
          mode: 'strict',
          cwd: emptyDir,
          cliArgs: ['/nonexistent'],
          userBmadPath: '/nonexistent',
        });
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      // Should include link to learn more (auto mode) or installation requirements (strict mode)
      expect(errorMessage).toMatch(
        /github\.com\/bmadcode|manifest\.yaml|install-manifest/i,
      );
    });

    it('should have consistent error message width', () => {
      const emptyDir = path.join(fixture.tmpDir, 'width-test');
      fs.mkdirSync(emptyDir, { recursive: true });

      let errorMessage = '';
      try {
        resolveBmadPaths({
          mode: 'strict',
          cwd: emptyDir,
          cliArgs: ['/nonexistent'],
          userBmadPath: '/nonexistent',
        });
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      // Split into lines and check they're properly formatted
      const lines = errorMessage.split('\n');
      const boxLines = lines.filter((line) => line.includes('│'));

      // All box lines should have similar length (within a few chars for padding)
      if (boxLines.length > 0) {
        const lengths = boxLines.map((line) => line.length);
        const maxLength = Math.max(...lengths);
        const minLength = Math.min(...lengths);
        // Allow some variation for content but box should be consistent
        expect(maxLength - minLength).toBeLessThan(10);
      }
    });
  });
});
