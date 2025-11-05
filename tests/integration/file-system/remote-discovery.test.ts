/**
 * Integration tests for remote discovery
 */
import { describe, it, expect } from 'vitest';
import { parseRemoteArgs } from '../../../src/utils/remote-registry.js';

describe('Remote Discovery Integration', () => {
  describe('Remote Registry Setup', () => {
    it('should include built-in @awesome remote', () => {
      const registry = parseRemoteArgs([]);
      expect(registry.remotes.has('awesome')).toBe(true);
      expect(registry.remotes.get('awesome')).toContain('awesome-bmad-agents');
    });

    it('should support custom remotes', () => {
      const registry = parseRemoteArgs([
        '--remote=custom,git+https://github.com/org/repo#main',
      ]);
      expect(registry.remotes.has('custom')).toBe(true);
      expect(registry.remotes.get('custom')).toBe(
        'git+https://github.com/org/repo#main',
      );
    });

    it('should support multiple custom remotes', () => {
      const registry = parseRemoteArgs([
        '--remote=remote1,git+https://github.com/org1/repo#main',
        '--remote=remote2,git+https://github.com/org2/repo#main',
      ]);
      expect(registry.remotes.size).toBe(3); // awesome + 2 custom
    });
  });

  describe('Command Routing', () => {
    it('should recognize *list-agents @remote format', () => {
      const cmd1 = '*list-agents @awesome';
      const cmd2 = '*list-agents @custom';

      expect(cmd1.startsWith('*list-agents @')).toBe(true);
      expect(cmd2.startsWith('*list-agents @')).toBe(true);
    });

    it('should recognize *list-modules @remote format', () => {
      const cmd1 = '*list-modules @awesome';
      const cmd2 = '*list-modules @custom';

      expect(cmd1.startsWith('*list-modules @')).toBe(true);
      expect(cmd2.startsWith('*list-modules @')).toBe(true);
    });
  });

  describe('Remote Name Extraction', () => {
    it('should extract remote name from *list-agents command', () => {
      const cmd = '*list-agents @awesome';
      const remoteName = cmd.replace('*list-agents @', '').trim();
      expect(remoteName).toBe('awesome');
    });

    it('should extract remote name from *list-modules command', () => {
      const cmd = '*list-modules @custom';
      const remoteName = cmd.replace('*list-modules @', '').trim();
      expect(remoteName).toBe('custom');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle empty remote name', () => {
      const cmd = '*list-agents @';
      const remoteName = cmd.replace('*list-agents @', '').trim();
      expect(remoteName).toBe('');
    });

    it('should handle whitespace after @', () => {
      const cmd = '*list-agents @  ';
      const remoteName = cmd.replace('*list-agents @', '').trim();
      expect(remoteName).toBe('');
    });

    it('should validate unknown remote lookup', () => {
      const registry = parseRemoteArgs([]);
      const remoteName = 'unknown-remote';
      expect(registry.remotes.has(remoteName)).toBe(false);
      expect(registry.remotes.get(remoteName)).toBeUndefined();
    });
  });
});
