import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseRemoteArgs,
  resolveRemotePath,
} from '../../src/utils/remote-registry.js';
import type { RemoteRegistry } from '../../src/utils/remote-registry.js';

describe('Remote Registry Integration', () => {
  describe('End-to-End Remote Resolution', () => {
    let registry: RemoteRegistry;

    beforeEach(() => {
      // Simulate real CLI args
      const args = [
        'git+https://github.com/bmad-code-org/BMAD-METHOD#main:/bmad',
        '--remote=awesome,git+https://github.com/mkellerman/awesome-bmad-agents#main',
        '--remote=internal,git+https://github.com/acme/private-agents#v1.0:/agents',
        '--mode=strict',
      ];
      registry = parseRemoteArgs(args);
    });

    it('should parse and register multiple remotes from CLI args', () => {
      expect(registry.remotes.size).toBeGreaterThanOrEqual(2); // awesome + internal (+ built-in)
      expect(registry.remotes.has('awesome')).toBe(true);
      expect(registry.remotes.has('internal')).toBe(true);
    });

    it('should resolve agent path from awesome remote', () => {
      const result = resolveRemotePath(
        '@awesome:agents/debug-diana-v6',
        registry,
      );

      expect(result).toContain('github.com/mkellerman/awesome-bmad-agents');
      expect(result).toContain('#main');
      expect(result).toContain('/agents/debug-diana-v6');
      expect(result).toMatch(/^git\+https:\/\//);
    });

    it('should resolve module path from awesome remote', () => {
      const result = resolveRemotePath(
        '@awesome:modules/bmad-bmm-v6',
        registry,
      );

      expect(result).toContain('github.com/mkellerman/awesome-bmad-agents');
      expect(result).toContain('/modules/bmad-bmm-v6');
    });

    it('should resolve path with leading slash', () => {
      const result = resolveRemotePath(
        '@awesome:/agents/debug-diana-v6',
        registry,
      );

      expect(result).toContain('/agents/debug-diana-v6');
      expect(result).not.toContain('://agents'); // Should not double up on separators
    });

    it('should append to remote that already has base path', () => {
      const result = resolveRemotePath('@internal:custom-agent', registry);

      expect(result).toBe(
        'git+https://github.com/acme/private-agents#v1.0:/agents/custom-agent',
      );
    });

    it('should handle deep paths', () => {
      const result = resolveRemotePath(
        '@awesome:modules/bmad-bmm-v6/agents/analyst',
        registry,
      );

      expect(result).toContain('/modules/bmad-bmm-v6/agents/analyst');
    });

    it('should preserve built-in awesome remote if not overridden', () => {
      const args = ['--remote=custom,git+https://github.com/org/repo#main'];
      const reg = parseRemoteArgs(args);

      expect(reg.remotes.has('awesome')).toBe(true);
      expect(reg.remotes.get('awesome')).toContain('awesome-bmad-agents');
    });

    it('should allow overriding built-in awesome remote', () => {
      const args = [
        '--remote=awesome,git+https://github.com/custom/different-repo#main',
      ];
      const reg = parseRemoteArgs(args);

      expect(reg.remotes.has('awesome')).toBe(true);
      expect(reg.remotes.get('awesome')).toContain('custom/different-repo');
      expect(reg.remotes.get('awesome')).not.toContain('awesome-bmad-agents');
    });

    it('should handle mixed valid and invalid remote args', () => {
      const args = [
        '--remote=valid1,git+https://github.com/org/repo1#main',
        '--remote=invalid', // Missing URL
        '--remote=123bad,git+https://github.com/org/repo2#main', // Invalid name
        '--remote=,git+https://github.com/org/repo3#main', // Empty name
        '--remote=valid2,https://github.com/org/repo4#main', // Invalid protocol
        '--remote=valid3,git+https://github.com/org/repo5#main',
      ];
      const reg = parseRemoteArgs(args);

      expect(reg.remotes.has('valid1')).toBe(true);
      expect(reg.remotes.has('valid3')).toBe(true);
      expect(reg.remotes.has('invalid')).toBe(false);
      expect(reg.remotes.has('123bad')).toBe(false);
      expect(reg.remotes.has('valid2')).toBe(false);
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should support typical awesome-bmad-agents agent loading', () => {
      const args = [
        '--remote=awesome,git+https://github.com/mkellerman/awesome-bmad-agents#main',
      ];
      const registry = parseRemoteArgs(args);

      // Common agent paths
      const debugAgent = resolveRemotePath(
        '@awesome:agents/debug-diana-v6',
        registry,
      );
      expect(debugAgent).toBe(
        'git+https://github.com/mkellerman/awesome-bmad-agents#main:/agents/debug-diana-v6',
      );

      const module = resolveRemotePath(
        '@awesome:modules/bmad-bmm-v6',
        registry,
      );
      expect(module).toBe(
        'git+https://github.com/mkellerman/awesome-bmad-agents#main:/modules/bmad-bmm-v6',
      );
    });

    it('should support enterprise private repository pattern', () => {
      const args = [
        '--remote=corp,git+https://github.com/acme-corp/internal-agents#production:/bmad',
      ];
      const registry = parseRemoteArgs(args);

      const agent = resolveRemotePath(
        '@corp:agents/compliance-checker',
        registry,
      );
      expect(agent).toBe(
        'git+https://github.com/acme-corp/internal-agents#production:/bmad/agents/compliance-checker',
      );
    });

    it('should support multiple remotes in same config', () => {
      const args = [
        '--remote=awesome,git+https://github.com/mkellerman/awesome-bmad-agents#main',
        '--remote=corp,git+https://github.com/acme/agents#main',
        '--remote=team,git+https://github.com/myteam/custom-agents#develop',
      ];
      const registry = parseRemoteArgs(args);

      // awesome is overridden + corp + team = 3 total
      expect(registry.remotes.size).toBe(3);

      const awesome = resolveRemotePath('@awesome:agents/debug', registry);
      expect(awesome).toContain('awesome-bmad-agents');

      const corp = resolveRemotePath('@corp:agents/validator', registry);
      expect(corp).toContain('acme/agents');

      const team = resolveRemotePath('@team:agents/helper', registry);
      expect(team).toContain('myteam/custom-agents');
      expect(team).toContain('#develop');
    });
  });

  describe('Error Handling', () => {
    it('should provide helpful error for unknown remote', () => {
      const args = ['--remote=known,git+https://github.com/org/repo#main'];
      const registry = parseRemoteArgs(args);

      expect(() => {
        resolveRemotePath('@unknown:agents/test', registry);
      }).toThrow(/Remote '@unknown' not found/);

      expect(() => {
        resolveRemotePath('@unknown:agents/test', registry);
      }).toThrow(/@known/); // Should suggest available remotes
    });

    it('should handle malformed remote path syntax', () => {
      const registry = parseRemoteArgs([]);

      // Input without @ should be returned as-is (not a remote reference)
      const notRemote = resolveRemotePath('awesome:agents/test', registry);
      expect(notRemote).toBe('awesome:agents/test'); // Passed through unchanged

      // Input with @ but missing : should throw
      expect(() => {
        resolveRemotePath('@awesome/agents/test', registry);
      }).toThrow(/Invalid remote path format/);
    });
  });

  describe('Compatibility with Git Cache System', () => {
    it('should generate URLs compatible with GitSourceResolver', () => {
      const args = ['--remote=test,git+https://github.com/org/repo#main'];
      const registry = parseRemoteArgs(args);

      const resolved = resolveRemotePath('@test:agents/example', registry);

      // Should be a valid git+https URL
      expect(resolved).toMatch(/^git\+https:\/\//);

      // Should have proper structure for GitSourceResolver
      expect(resolved).toMatch(/github\.com\/[^/]+\/[^#]+#[^:]+:/);
    });

    it('should preserve git ref information', () => {
      const args = [
        '--remote=stable,git+https://github.com/org/repo#v1.0.0',
        '--remote=beta,git+https://github.com/org/repo#beta-branch',
        '--remote=commit,git+https://github.com/org/repo#abc123',
      ];
      const registry = parseRemoteArgs(args);

      const stable = resolveRemotePath('@stable:agents/test', registry);
      expect(stable).toContain('#v1.0.0');

      const beta = resolveRemotePath('@beta:agents/test', registry);
      expect(beta).toContain('#beta-branch');

      const commit = resolveRemotePath('@commit:agents/test', registry);
      expect(commit).toContain('#abc123');
    });
  });
});
