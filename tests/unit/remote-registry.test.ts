import { describe, it, expect } from 'vitest';
import {
  parseRemoteArgs,
  parseRemotePath,
  resolveRemotePath,
  listRemotes,
  isValidRemoteName,
  isValidGitUrl,
  type RemoteRegistry,
} from '../../src/utils/remote-registry.js';

describe('remote-registry', () => {
  describe('isValidRemoteName', () => {
    it('accepts valid names', () => {
      expect(isValidRemoteName('awesome')).toBe(true);
      expect(isValidRemoteName('my-remote')).toBe(true);
      expect(isValidRemoteName('remote123')).toBe(true);
      expect(isValidRemoteName('a')).toBe(true);
    });

    it('rejects invalid names', () => {
      expect(isValidRemoteName('')).toBe(false);
      expect(isValidRemoteName('123remote')).toBe(false); // Must start with letter
      expect(isValidRemoteName('-remote')).toBe(false); // Must start with letter
      expect(isValidRemoteName('Remote')).toBe(false); // Must be lowercase
      expect(isValidRemoteName('my_remote')).toBe(false); // No underscores
      expect(isValidRemoteName('my.remote')).toBe(false); // No dots
    });
  });

  describe('isValidGitUrl', () => {
    it('accepts valid git+https URLs', () => {
      expect(isValidGitUrl('git+https://github.com/org/repo')).toBe(true);
      expect(isValidGitUrl('git+https://github.com/org/repo#main')).toBe(true);
      expect(isValidGitUrl('git+https://github.com/org/repo#main:/path')).toBe(
        true,
      );
    });

    it('rejects invalid URLs', () => {
      expect(isValidGitUrl('')).toBe(false);
      expect(isValidGitUrl('https://github.com/org/repo')).toBe(false); // Missing git+
      expect(isValidGitUrl('git+http://github.com/org/repo')).toBe(false); // http not https
      expect(isValidGitUrl('github.com/org/repo')).toBe(false); // No protocol
    });
  });

  describe('parseRemoteArgs', () => {
    it('includes built-in remotes by default', () => {
      const registry = parseRemoteArgs([]);
      expect(registry.remotes.has('awesome')).toBe(true);
      expect(registry.remotes.get('awesome')).toContain('awesome-bmad-agents');
    });

    it('parses valid --remote arguments', () => {
      const args = [
        '--remote=myremote,git+https://github.com/org/repo#main',
        '--remote=internal,git+https://github.com/acme/agents#v1',
      ];
      const registry = parseRemoteArgs(args);

      expect(registry.remotes.get('myremote')).toBe(
        'git+https://github.com/org/repo#main',
      );
      expect(registry.remotes.get('internal')).toBe(
        'git+https://github.com/acme/agents#v1',
      );
    });

    it('ignores non-remote arguments', () => {
      const args = [
        'git+https://github.com/org/repo',
        '--mode=strict',
        '--remote=valid,git+https://github.com/org/repo',
      ];
      const registry = parseRemoteArgs(args);

      expect(registry.remotes.get('valid')).toBe(
        'git+https://github.com/org/repo',
      );
      expect(registry.remotes.size).toBeGreaterThanOrEqual(2); // built-in + valid
    });

    it('skips malformed arguments', () => {
      const args = [
        '--remote=nocomma',
        '--remote=,git+https://github.com/org/repo', // No name
        '--remote=123invalid,git+https://github.com/org/repo', // Invalid name
        '--remote=valid,https://github.com/org/repo', // Invalid URL
      ];
      const registry = parseRemoteArgs(args);

      expect(registry.remotes.has('nocomma')).toBe(false);
      expect(registry.remotes.has('123invalid')).toBe(false);
      expect(registry.remotes.has('valid')).toBe(false);
    });

    it('allows overriding built-in remotes', () => {
      const args = ['--remote=awesome,git+https://github.com/custom/repo#main'];
      const registry = parseRemoteArgs(args);

      expect(registry.remotes.get('awesome')).toBe(
        'git+https://github.com/custom/repo#main',
      );
    });

    it('handles duplicate remote names (last wins)', () => {
      const args = [
        '--remote=test,git+https://github.com/org/repo1',
        '--remote=test,git+https://github.com/org/repo2',
      ];
      const registry = parseRemoteArgs(args);

      expect(registry.remotes.get('test')).toBe(
        'git+https://github.com/org/repo2',
      );
    });
  });

  describe('parseRemotePath', () => {
    it('parses @remote:path format', () => {
      const result = parseRemotePath('@awesome:agents/debug-diana-v6');
      expect(result.remote).toBe('awesome');
      expect(result.path).toBe('agents/debug-diana-v6');
    });

    it('strips leading slash from path', () => {
      const result = parseRemotePath('@awesome:/agents/debug-diana-v6');
      expect(result.remote).toBe('awesome');
      expect(result.path).toBe('agents/debug-diana-v6');
    });

    it('handles paths with multiple segments', () => {
      const result = parseRemotePath('@awesome:modules/bmad-bmm-v6/agents/dev');
      expect(result.remote).toBe('awesome');
      expect(result.path).toBe('modules/bmad-bmm-v6/agents/dev');
    });

    it('handles paths with colons', () => {
      const result = parseRemotePath('@awesome:path:with:colons');
      expect(result.remote).toBe('awesome');
      expect(result.path).toBe('path:with:colons');
    });

    it('throws on missing @ prefix', () => {
      expect(() => parseRemotePath('awesome:agents/debug')).toThrow(
        'must start with @',
      );
    });

    it('throws on missing colon', () => {
      expect(() => parseRemotePath('@awesome')).toThrow(
        'Invalid remote path format',
      );
      expect(() => parseRemotePath('@awesome/agents')).toThrow(
        'Invalid remote path format',
      );
    });

    it('throws on empty remote name', () => {
      expect(() => parseRemotePath('@:agents/debug')).toThrow(
        'Remote name cannot be empty',
      );
    });

    it('throws on empty path', () => {
      expect(() => parseRemotePath('@awesome:')).toThrow(
        'Path cannot be empty',
      );
      expect(() => parseRemotePath('@awesome:/')).toThrow(
        'Path cannot be empty',
      );
    });
  });

  describe('resolveRemotePath', () => {
    const registry: RemoteRegistry = {
      remotes: new Map([
        [
          'awesome',
          'git+https://github.com/mkellerman/awesome-bmad-agents#main',
        ],
        ['withpath', 'git+https://github.com/org/repo#main:/base'],
      ]),
    };

    it('resolves @remote:path to full URL', () => {
      const result = resolveRemotePath(
        '@awesome:agents/debug-diana-v6',
        registry,
      );
      expect(result).toBe(
        'git+https://github.com/mkellerman/awesome-bmad-agents#main:/agents/debug-diana-v6',
      );
    });

    it('resolves with leading slash in path', () => {
      const result = resolveRemotePath(
        '@awesome:/agents/debug-diana-v6',
        registry,
      );
      expect(result).toBe(
        'git+https://github.com/mkellerman/awesome-bmad-agents#main:/agents/debug-diana-v6',
      );
    });

    it('appends to base URL that already has path', () => {
      const result = resolveRemotePath('@withpath:agents/debug', registry);
      expect(result).toBe(
        'git+https://github.com/org/repo#main:/base/agents/debug',
      );
    });

    it('returns input unchanged if not a remote reference', () => {
      const url = 'git+https://github.com/direct/url#main:/path';
      expect(resolveRemotePath(url, registry)).toBe(url);

      const localPath = './local/path';
      expect(resolveRemotePath(localPath, registry)).toBe(localPath);
    });

    it('throws on unknown remote', () => {
      expect(() =>
        resolveRemotePath('@unknown:agents/debug', registry),
      ).toThrow("Remote '@unknown' not found");
    });

    it('includes available remotes in error message', () => {
      try {
        resolveRemotePath('@unknown:agents/debug', registry);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('@awesome');
        expect((error as Error).message).toContain('@withpath');
      }
    });
  });

  describe('listRemotes', () => {
    it('returns empty array for empty registry', () => {
      const registry: RemoteRegistry = { remotes: new Map() };
      const result = listRemotes(registry);
      expect(result).toEqual([]);
    });

    it('lists all remotes with metadata', () => {
      const registry: RemoteRegistry = {
        remotes: new Map([
          [
            'awesome',
            'git+https://github.com/mkellerman/awesome-bmad-agents#main',
          ],
          ['custom', 'git+https://github.com/org/repo#main'],
        ]),
      };
      const result = listRemotes(registry);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('awesome');
      expect(result[0].isBuiltin).toBe(true);
      expect(result[1].name).toBe('custom');
      expect(result[1].isBuiltin).toBe(false);
    });

    it('sorts built-in remotes first, then alphabetically', () => {
      const registry: RemoteRegistry = {
        remotes: new Map([
          ['zebra', 'git+https://github.com/org/zebra'],
          [
            'awesome',
            'git+https://github.com/mkellerman/awesome-bmad-agents#main',
          ],
          ['alpha', 'git+https://github.com/org/alpha'],
        ]),
      };
      const result = listRemotes(registry);

      expect(result[0].name).toBe('awesome'); // Built-in first
      expect(result[0].isBuiltin).toBe(true);
      expect(result[1].name).toBe('alpha'); // Then alphabetical
      expect(result[2].name).toBe('zebra');
    });
  });
});
