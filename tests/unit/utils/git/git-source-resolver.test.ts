/**
 * Unit tests for GitSourceResolver
 */

import { describe, it, expect } from 'vitest';
import { GitSourceResolver } from '../../../../src/utils/git-source-resolver.js';

describe('GitSourceResolver', () => {
  describe('URL parsing', () => {
    it('should parse HTTPS Git URL with branch', () => {
      const resolver = new GitSourceResolver();
      const spec = (resolver as any).parseGitUrl(
        'git+https://github.com/org/repo.git#main',
      );

      expect(spec).toEqual({
        protocol: 'https',
        host: 'github.com',
        org: 'org',
        repo: 'repo',
        ref: 'main',
        subpath: undefined,
      });
    });

    it('should parse HTTPS Git URL without .git extension', () => {
      const resolver = new GitSourceResolver();
      const spec = (resolver as any).parseGitUrl(
        'git+https://github.com/org/repo#develop',
      );

      expect(spec).toEqual({
        protocol: 'https',
        host: 'github.com',
        org: 'org',
        repo: 'repo',
        ref: 'develop',
        subpath: undefined,
      });
    });

    it('should parse Git URL with subpath', () => {
      const resolver = new GitSourceResolver();
      const spec = (resolver as any).parseGitUrl(
        'git+https://github.com/org/repo.git#main:/bmad/core',
      );

      expect(spec).toEqual({
        protocol: 'https',
        host: 'github.com',
        org: 'org',
        repo: 'repo',
        ref: 'main',
        subpath: 'bmad/core',
      });
    });

    it('should parse Git URL with subpath without leading slash', () => {
      const resolver = new GitSourceResolver();
      const spec = (resolver as any).parseGitUrl(
        'git+https://github.com/org/repo.git#v2.0:/packages/bmad',
      );

      expect(spec).toEqual({
        protocol: 'https',
        host: 'github.com',
        org: 'org',
        repo: 'repo',
        ref: 'v2.0',
        subpath: 'packages/bmad',
      });
    });

    it('should parse SSH Git URL', () => {
      const resolver = new GitSourceResolver();
      const spec = (resolver as any).parseGitUrl(
        'git+ssh://git@github.com/org/repo.git#main',
      );

      expect(spec).toEqual({
        protocol: 'ssh',
        host: 'github.com',
        org: 'org',
        repo: 'repo',
        ref: 'main',
        subpath: undefined,
      });
    });

    it('should default to main branch if no ref specified', () => {
      const resolver = new GitSourceResolver();
      const spec = (resolver as any).parseGitUrl(
        'git+https://github.com/org/repo.git',
      );

      expect(spec.ref).toBe('main');
    });

    it('should throw on invalid Git URL', () => {
      const resolver = new GitSourceResolver();

      expect(() => {
        (resolver as any).parseGitUrl('https://github.com/org/repo.git');
      }).toThrow('Invalid git URL');

      expect(() => {
        (resolver as any).parseGitUrl('git+ftp://github.com/org/repo.git');
      }).toThrow('Invalid git URL');
    });
  });

  describe('isGitUrl', () => {
    it('should identify HTTPS Git URLs', () => {
      expect(
        GitSourceResolver.isGitUrl('git+https://github.com/org/repo.git#main'),
      ).toBe(true);
    });

    it('should identify SSH Git URLs', () => {
      expect(
        GitSourceResolver.isGitUrl(
          'git+ssh://git@github.com/org/repo.git#main',
        ),
      ).toBe(true);
    });

    it('should reject non-Git URLs', () => {
      expect(
        GitSourceResolver.isGitUrl('https://github.com/org/repo.git'),
      ).toBe(false);
      expect(GitSourceResolver.isGitUrl('./local/path')).toBe(false);
      expect(GitSourceResolver.isGitUrl('/absolute/path')).toBe(false);
    });
  });

  describe('buildRepoUrl', () => {
    it('should build HTTPS URL', () => {
      const resolver = new GitSourceResolver();
      const url = (resolver as any).buildRepoUrl({
        protocol: 'https',
        host: 'github.com',
        org: 'org',
        repo: 'repo',
        ref: 'main',
      });

      expect(url).toBe('https://github.com/org/repo.git');
    });

    it('should build SSH URL', () => {
      const resolver = new GitSourceResolver();
      const url = (resolver as any).buildRepoUrl({
        protocol: 'ssh',
        host: 'github.com',
        org: 'org',
        repo: 'repo',
        ref: 'main',
      });

      expect(url).toBe('git@github.com:org/repo.git');
    });
  });

  describe('cache key generation', () => {
    it('should generate different cache keys for different branches', () => {
      const resolver = new GitSourceResolver();

      const url1 = 'git+https://github.com/org/repo.git#main';
      const url2 = 'git+https://github.com/org/repo.git#develop';

      const spec1 = (resolver as any).parseGitUrl(url1);
      const spec2 = (resolver as any).parseGitUrl(url2);

      // Cache keys differ because of branch ref
      expect(spec1.ref).not.toBe(spec2.ref);
    });

    it('should parse different subpaths correctly', () => {
      const resolver = new GitSourceResolver();

      const url1 = 'git+https://github.com/org/repo.git#main:/bmad';
      const url2 = 'git+https://github.com/org/repo.git#main:/packages/bmad';

      const spec1 = (resolver as any).parseGitUrl(url1);
      const spec2 = (resolver as any).parseGitUrl(url2);

      // Subpaths are different but cache key is the same (full repo is cached)
      expect(spec1.subpath).not.toBe(spec2.subpath);
    });
  });

  describe('cache validation', () => {
    it('should validate matching cache metadata', () => {
      const resolver = new GitSourceResolver();
      const gitUrl = 'git+https://github.com/org/repo.git#main:/bmad';
      const spec = (resolver as any).parseGitUrl(gitUrl);

      const metadata = {
        sourceUrl: gitUrl,
        hash: 'abc123',
        ref: 'main',
        subpath: 'bmad',
        lastPull: new Date().toISOString(),
        currentCommit: 'def456',
      };

      const isValid = (resolver as any).isValidCache(metadata, gitUrl, spec);
      expect(isValid).toBe(true);
    });

    it('should invalidate cache with different branch', () => {
      const resolver = new GitSourceResolver();
      const gitUrl = 'git+https://github.com/org/repo.git#main:/bmad';
      const spec = (resolver as any).parseGitUrl(gitUrl);

      const metadata = {
        sourceUrl: 'git+https://github.com/org/repo.git#develop:/bmad',
        hash: 'abc123',
        ref: 'develop', // Different branch
        subpath: 'bmad',
        lastPull: new Date().toISOString(),
        currentCommit: 'abc456',
      };

      const isValid = (resolver as any).isValidCache(metadata, gitUrl, spec);
      expect(isValid).toBe(false);
    });

    it('should NOT invalidate cache with different subpath (subpath applied after cache)', () => {
      const resolver = new GitSourceResolver();
      const gitUrl = 'git+https://github.com/org/repo.git#main:/bmad';
      const spec = (resolver as any).parseGitUrl(gitUrl);

      const metadata = {
        sourceUrl: gitUrl,
        hash: 'abc123',
        ref: 'main',
        subpath: 'packages/bmad', // Different subpath
        lastPull: new Date().toISOString(),
        currentCommit: 'def456',
      };

      // Subpath changes don't invalidate cache since we clone the full repo
      const isValid = (resolver as any).isValidCache(metadata, gitUrl, spec);
      expect(isValid).toBe(true); // Changed from false to true
    });

    it('should invalidate cache with null metadata', () => {
      const resolver = new GitSourceResolver();
      const gitUrl = 'git+https://github.com/org/repo.git#main';
      const spec = (resolver as any).parseGitUrl(gitUrl);

      const isValid = (resolver as any).isValidCache(null, gitUrl, spec);
      expect(isValid).toBe(false);
    });
  });
});
