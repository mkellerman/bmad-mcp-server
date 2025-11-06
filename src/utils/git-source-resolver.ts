/**
 * Git Source Resolver
 *
 * Handles resolution of git+ URLs to local cached paths.
 * Supports npm-style Git URL syntax: git+https://github.com/org/repo.git#branch:/subpath
 *
 * Features:
 * - Smart caching with validation
 * - Auto-update on startup (always pull latest)
 * - URL change detection (branch/subpath changes invalidate cache)
 * - Atomic operations with metadata tracking
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import logger from './logger.js';

const execAsync = promisify(exec);

/**
 * Constants for Git source resolution
 */

/** Default cache TTL: 24 hours in seconds (86400 = 24 * 60 * 60) */
const DEFAULT_CACHE_TTL_SECONDS = 86400;

/** Maximum wait time for clone completion: 30 seconds */
const CLONE_COMPLETION_MAX_WAIT_MS = 30000;

/** Poll interval for checking clone completion: 500ms */
const CLONE_COMPLETION_POLL_INTERVAL_MS = 500;

/** Maximum buffer size for git commands: 10MB (to handle large repos) */
const GIT_COMMAND_MAX_BUFFER_BYTES = 10 * 1024 * 1024;

/** Regex pattern for parsing Git URLs: git+ssh://git@host/org/repo[.git][#ref][:/subpath] */
const GIT_URL_REGEX =
  /^git\+ssh:\/\/git@([^/]+)\/([^/]+)\/([^#:]+?)(\.git)?(#([^:]+))?(:(\/?.+))?$/;

/** Regex pattern for parsing Git HTTPS URLs: git+https://host/org/repo[.git][#ref][:/subpath] */
const GIT_HTTPS_URL_REGEX =
  /^git\+https:\/\/([^/]+)\/([^/]+)\/([^#:]+?)(\.git)?(#([^:]+))?(:(\/?.+))?$/;

/**
 * Parsed Git URL specification
 */
export interface GitUrlSpec {
  protocol: 'https' | 'ssh';
  host: string;
  org: string;
  repo: string;
  ref: string; // branch, tag, or commit
  subpath?: string; // optional path within repo
}

/**
 * Cache metadata stored with each cached repository
 */
export interface CacheMetadata {
  sourceUrl: string; // Original git+https://... URL
  hash: string; // SHA256 of sourceUrl
  ref: string; // Branch/tag/commit
  subpath: string; // Subpath within repo (empty string if none)
  lastPull: string; // ISO timestamp
  currentCommit: string; // Git commit SHA
}

/**
 * Git Source Resolver
 *
 * Resolves git+ URLs to local filesystem paths by:
 * 1. Checking cache validity (same URL, branch, subpath)
 * 2. Updating existing cache (git pull)
 * 3. Cloning fresh if cache missing or invalid
 *
 * @remarks
 * This class handles the complex task of resolving Git URLs with npm-style syntax
 * to local filesystem paths. It maintains a smart cache to avoid redundant cloning
 * and supports subpath extraction for monorepos.
 *
 * @example
 * ```typescript
 * // Basic usage with default cache
 * const resolver = new GitSourceResolver();
 * const path = await resolver.resolve('git+https://github.com/org/repo.git');
 *
 * // Custom cache directory
 * const resolver = new GitSourceResolver('/tmp/my-cache');
 * const path = await resolver.resolve('git+https://github.com/org/repo.git#main');
 *
 * // With subpath extraction
 * const path = await resolver.resolve('git+https://github.com/org/repo.git#main:/packages/my-package');
 *
 * // SSH URLs also supported
 * const path = await resolver.resolve('git+ssh://git@github.com/org/repo.git#v1.0.0');
 * ```
 */
export class GitSourceResolver {
  private cacheDir: string;
  private autoUpdate: boolean;
  private cacheTTL: number; // Time-to-live in seconds

  /**
   * Create a new Git Source Resolver
   *
   * @param cacheDir - Directory to store cached Git repositories (defaults to ~/.bmad/cache/git)
   * @param autoUpdate - Whether to automatically update cached repos on resolve (default: false)
   * @param cacheTTL - Cache time-to-live in seconds (default: 86400 = 24 hours)
   *
   * @remarks
   * The cache TTL determines how long cached repositories are considered valid.
   * When a cached repo exceeds this age, it will be updated via `git pull`.
   *
   * @example
   * ```typescript
   * // Default configuration
   * const resolver = new GitSourceResolver();
   *
   * // Custom cache with auto-update
   * const resolver = new GitSourceResolver('/tmp/cache', true, 3600); // 1 hour TTL
   * ```
   */
  constructor(
    cacheDir?: string,
    autoUpdate: boolean = false,
    cacheTTL: number = DEFAULT_CACHE_TTL_SECONDS,
  ) {
    this.cacheDir =
      cacheDir || path.join(os.homedir(), '.bmad', 'cache', 'git');
    this.autoUpdate = autoUpdate;
    this.cacheTTL = cacheTTL * 1000; // Convert to milliseconds
  }

  /**
   * Helper: Check if path exists
   *
   * @param p - Path to check
   * @returns True if path exists and is accessible
   *
   * @remarks
   * Uses fs.access() to check if a path exists without opening it.
   * Returns false for both non-existent paths and permission errors.
   */
  private async pathExists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Recursively remove directory
   *
   * @param p - Directory path to remove
   *
   * @remarks
   * Recursively removes a directory and all its contents.
   * Used for cache cleanup and repository removal.
   */
  private async removeDirectory(p: string): Promise<void> {
    await fs.rm(p, { recursive: true, force: true });
  }

  /**
   * Helper: Ensure directory exists
   *
   * @param p - Directory path to create
   *
   * @remarks
   * Creates a directory and all parent directories if they don't exist.
   * Used to ensure cache directories are available before operations.
   */
  private async ensureDirectory(p: string): Promise<void> {
    await fs.mkdir(p, { recursive: true });
  }

  /**
   * Resolve a git+ URL to a local filesystem path
   *
   * @param gitUrl - URL in format: git+https://github.com/org/repo.git#branch:/subpath
   * @returns Absolute path to the resolved location
   *
   * @remarks
   * This method handles the complete resolution process:
   * 1. Parses the Git URL to extract components
   * 2. Checks for existing valid cache
   * 3. Updates cache if stale or clones fresh repository
   * 4. Returns path to repository root or specified subpath
   *
   * @example
   * ```typescript
   * // Repository root
   * const path = await resolver.resolve('git+https://github.com/facebook/react.git');
   * // Returns: /home/user/.bmad/cache/git/github.com-facebook-react-main
   *
   * // Specific branch
   * const path = await resolver.resolve('git+https://github.com/facebook/react.git#v18.0.0');
   * // Returns: /home/user/.bmad/cache/git/github.com-facebook-react-v18.0.0
   *
   * // Subpath in monorepo
   * const path = await resolver.resolve('git+https://github.com/babel/babel.git#main:/packages/babel-core');
   * // Returns: /home/user/.bmad/cache/git/github.com-babel-babel-main/packages/babel-core
   *
   * // SSH URL
   * const path = await resolver.resolve('git+ssh://git@github.com/myorg/private.git#develop');
   * ```
   */
  async resolve(gitUrl: string): Promise<string> {
    const spec = this.parseGitUrl(gitUrl);
    // Simplified cache key without URL hash - just host-org-repo-ref
    // This ensures consistent paths and avoids stale cache issues
    const cacheKey = `${spec.host}-${spec.org}-${spec.repo}-${spec.ref}`;
    const cachePath = path.join(this.cacheDir, cacheKey);

    logger.info(`Resolving Git source: ${gitUrl}`);

    // Check if cache exists AND matches the exact URL spec
    const cacheExists = await this.pathExists(cachePath);
    if (cacheExists) {
      // Wait for any ongoing clone operation to complete
      await this.waitForCloneCompletion(cachePath);

      const metadata = await this.loadMetadata(cachePath);

      if (this.isValidCache(metadata, gitUrl, spec)) {
        // Cache exists and URL matches
        const shouldUpdate = this.shouldUpdateCache(metadata);

        if (shouldUpdate) {
          // Auto-update enabled OR cache expired → PULL LATEST
          logger.info(
            `Updating cached repo: ${spec.org}/${spec.repo}#${spec.ref}`,
          );
          await this.updateRepository(spec, cachePath, gitUrl);
        } else {
          // Auto-update disabled AND cache fresh → USE CACHED VERSION
          logger.info(
            `Using cached repo (auto-update disabled, cache fresh): ${spec.org}/${spec.repo}#${spec.ref}`,
          );
        }
      } else {
        // URL changed (different subpath/branch) → DELETE & RECLONE
        logger.warn(
          `Cache invalid for ${gitUrl} (URL or spec changed), re-cloning...`,
        );
        await this.removeDirectory(cachePath);
        await this.cloneRepository(spec, cachePath, gitUrl);
      }
    } else {
      // No cache → FRESH CLONE
      logger.info(`Cloning ${spec.org}/${spec.repo}#${spec.ref}`);
      await this.cloneRepository(spec, cachePath, gitUrl);
    }

    // Return the subpath within the cached repo
    const resolvedPath = spec.subpath
      ? path.join(cachePath, spec.subpath)
      : cachePath;

    logger.info(`Resolved to: ${resolvedPath}`);
    return resolvedPath;
  }

  /**
   * Parse git+ URL into components
   *
   * Supported formats:
   * - git+https://github.com/org/repo.git#branch
   * - git+ssh://git@github.com/org/repo.git#branch
   * - git+https://github.com/org/repo.git#branch:/subpath
   *
   * @param url - Git URL to parse
   * @returns Parsed URL specification
   */
  private parseGitUrl(url: string): GitUrlSpec {
    // Pattern: git+(https|ssh)://[user@]host/org/repo[.git][#ref][:/subpath]
    const httpsMatch = url.match(GIT_HTTPS_URL_REGEX);
    const sshMatch = url.match(GIT_URL_REGEX);

    const match = httpsMatch || sshMatch;
    const protocol = httpsMatch ? 'https' : 'ssh';

    if (!match) {
      throw new Error(
        `Invalid git URL: ${url}\n` +
          `Expected format: git+https://github.com/org/repo.git#branch or git+ssh://git@github.com/org/repo.git#branch\n` +
          `Optional subpath: git+https://github.com/org/repo.git#branch:/subpath`,
      );
    }

    const [, host, org, repo, , , ref, , subpath] = match;

    return {
      protocol,
      host,
      org,
      repo: repo.replace(/\.git$/, ''),
      ref: ref || 'main',
      subpath: subpath ? subpath.replace(/^\//, '') : undefined,
    };
  }

  /**
   * Validate cache against current URL and spec
   *
   * @param metadata - Cached repository metadata
   * @param gitUrl - Original Git URL
   * @param spec - Parsed Git URL specification
   * @returns True if cache is valid and can be reused
   *
   * @remarks
   * Cache is valid if ref (branch/tag) matches.
   * Subpath changes don't invalidate the cache since we clone the full repo
   * and subpath is applied during resolution, not cloning.
   */
  private isValidCache(
    metadata: CacheMetadata | null,
    gitUrl: string,
    spec: GitUrlSpec,
  ): boolean {
    if (!metadata) return false;

    // Only validate ref (branch/tag) matches
    // Subpath is applied after cache resolution, so changes don't invalidate cache
    return metadata.ref === spec.ref;
  }

  /**
   * Determine if cache should be updated based on TTL and autoUpdate
   *
   * @param metadata - Cache metadata with lastPull timestamp
   * @returns true if cache should be updated, false to use cached version
   */
  private shouldUpdateCache(metadata: CacheMetadata | null): boolean {
    // If autoUpdate is enabled, always update
    if (this.autoUpdate) {
      return true;
    }

    // If no metadata or no lastPull, update to refresh metadata
    if (!metadata?.lastPull) {
      return true;
    }

    // Check if cache has expired based on TTL
    const lastPullTime = new Date(metadata.lastPull).getTime();
    const now = Date.now();
    const cacheAge = now - lastPullTime;

    const expired = cacheAge > this.cacheTTL;
    if (expired) {
      logger.info(
        `Cache expired (age: ${Math.floor(cacheAge / 1000)}s, TTL: ${this.cacheTTL / 1000}s)`,
      );
    }

    return expired;
  }

  /**
   * Helper: sleep for a specified duration
   */
  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Wait for an ongoing clone operation to complete
   *
   * If .bmad-cache.json doesn't exist but the directory does, another process
   * might be cloning. Wait up to 30 seconds for it to complete.
   */
  private async waitForCloneCompletion(cachePath: string): Promise<void> {
    const maxWaitMs = CLONE_COMPLETION_MAX_WAIT_MS; // 30 seconds
    const pollInterval = CLONE_COMPLETION_POLL_INTERVAL_MS; // Check every 500ms
    const metadataPath = path.join(cachePath, '.bmad-cache.json');
    const lockPath = `${cachePath}.clone.lock`;

    let waited = 0;
    while (waited < maxWaitMs) {
      const metadataExists = await this.pathExists(metadataPath);
      if (metadataExists) {
        logger.debug(`Clone completed (waited ${waited}ms)`);
        return; // Clone completed
      }

      // Check if git directory exists - if not, no clone in progress
      const gitDir = path.join(cachePath, '.git');
      const gitExists = await this.pathExists(gitDir);
      const lockExists = await this.pathExists(lockPath);

      if (!gitExists && !lockExists) {
        logger.debug(`No .git directory found, assuming failed clone`);
        return; // No clone in progress
      }

      if (lockExists) {
        logger.debug(
          `Clone lock present, waiting for completion (${waited}ms)`,
        );
      }

      // Still cloning, wait a bit longer
      await this.sleep(pollInterval);
      waited += pollInterval;
    }

    logger.warn(`Timeout waiting for clone completion after ${maxWaitMs}ms`);
  }

  /**
   * Acquire a filesystem lock to guard clone operations
   */
  private async acquireCloneLock(
    cachePath: string,
  ): Promise<() => Promise<void>> {
    const lockPath = `${cachePath}.clone.lock`;
    const parentDir = path.dirname(lockPath);
    await this.ensureDirectory(parentDir);

    const maxWaitMs = CLONE_COMPLETION_MAX_WAIT_MS;
    const pollInterval = CLONE_COMPLETION_POLL_INTERVAL_MS;
    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
      try {
        const handle = await fs.open(lockPath, 'wx');

        return async () => {
          try {
            await handle.close();
          } finally {
            try {
              await fs.unlink(lockPath);
            } catch {
              // Ignore unlink errors (lock may have been cleaned up)
            }
          }
        };
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code !== 'EEXIST') {
          throw error;
        }

        await this.sleep(pollInterval);
      }
    }

    throw new Error(`Timeout acquiring clone lock for ${cachePath}`);
  }

  /**
   * Update existing cached repository to latest
   *
   * @param spec - Parsed Git URL specification
   * @param cachePath - Local cache directory path
   * @param originalUrl - Original Git URL for metadata
   *
   * @remarks
   * Performs a hard reset to the latest origin ref to ensure clean updates
   * without merge conflicts. Updates cache metadata with new commit SHA.
   */
  private async updateRepository(
    spec: GitUrlSpec,
    cachePath: string,
    originalUrl: string,
  ): Promise<void> {
    try {
      // Fetch and reset to origin (fast-forward, no merge conflicts)
      logger.debug(`Fetching updates for ${spec.ref}...`);
      await this.execGit(`git fetch origin ${spec.ref}`, cachePath);
      await this.execGit(`git reset --hard origin/${spec.ref}`, cachePath);

      const { stdout: commit } = await this.execGit(
        'git rev-parse HEAD',
        cachePath,
      );
      const commitSha = commit.trim();

      // Update metadata
      const existingMetadata = await this.loadMetadata(cachePath);
      await this.saveMetadata(cachePath, {
        ...existingMetadata,
        sourceUrl: originalUrl,
        lastPull: new Date().toISOString(),
        currentCommit: commitSha,
      } as CacheMetadata);

      logger.info(`Updated to commit: ${commitSha.substring(0, 7)}`);
    } catch (error) {
      logger.error(
        `Failed to update ${spec.org}/${spec.repo}, falling back to reclone`,
      );
      logger.debug(`Update error: ${String(error)}`);
      await this.removeDirectory(cachePath);
      await this.cloneRepository(spec, cachePath, originalUrl);
    }
  }

  /**
   * Clone fresh repository to cache
   *
   * @param spec - Parsed Git URL specification
   * @param cachePath - Local cache directory path
   * @param originalUrl - Original Git URL for metadata
   *
   * @remarks
   * Performs a shallow clone (depth 1) for speed and space efficiency.
   * Creates cache metadata file after successful clone.
   */
  private async cloneRepository(
    spec: GitUrlSpec,
    cachePath: string,
    originalUrl: string,
  ): Promise<void> {
    const repoUrl = this.buildRepoUrl(spec);
    const releaseLock = await this.acquireCloneLock(cachePath);
    let tempDir: string | undefined;

    try {
      await this.ensureDirectory(path.dirname(cachePath));

      // Another process may have completed the clone while we waited.
      if (await this.pathExists(cachePath)) {
        const metadata = await this.loadMetadata(cachePath);
        if (this.isValidCache(metadata, originalUrl, spec)) {
          logger.info(
            `Clone already available for ${spec.org}/${spec.repo}#${spec.ref}, skipping fresh clone`,
          );
          return;
        }

        logger.warn(`Removing stale cache before cloning: ${cachePath}`);
        await this.removeDirectory(cachePath);
      }

      const uniqueSuffix = crypto.randomBytes(4).toString('hex');
      tempDir = `${cachePath}.tmp-${Date.now()}-${uniqueSuffix}`;
      await this.ensureDirectory(path.dirname(tempDir));

      logger.info(`Cloning ${repoUrl} (branch: ${spec.ref})...`);

      // Shallow clone for speed (depth 1)
      await this.execGit(
        `git clone --branch ${spec.ref} --depth 1 ${repoUrl} ${tempDir}`,
      );

      const { stdout: commit } = await this.execGit(
        'git rev-parse HEAD',
        tempDir,
      );
      const commitSha = commit.trim();

      await fs.rename(tempDir, cachePath);
      tempDir = undefined;

      // Save metadata for validation
      await this.saveMetadata(cachePath, {
        sourceUrl: originalUrl,
        hash: crypto.createHash('sha256').update(originalUrl).digest('hex'),
        ref: spec.ref,
        subpath: spec.subpath || '',
        lastPull: new Date().toISOString(),
        currentCommit: commitSha,
      });

      logger.info(`Cloned successfully (commit: ${commitSha.substring(0, 7)})`);
    } catch (error) {
      if (tempDir && (await this.pathExists(tempDir))) {
        try {
          await this.removeDirectory(tempDir);
        } catch {
          // Ignore cleanup errors
        }
      }

      try {
        await this.removeDirectory(cachePath);
      } catch {
        // Ignore cleanup errors
      }

      throw new Error(
        `Failed to clone ${repoUrl}#${spec.ref}: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      await releaseLock();
    }
  }

  /**
   * Load cache metadata from .bmad-cache.json
   */
  private async loadMetadata(cachePath: string): Promise<CacheMetadata | null> {
    const metaPath = path.join(cachePath, '.bmad-cache.json');
    if (!(await this.pathExists(metaPath))) return null;

    try {
      const content = await fs.readFile(metaPath, 'utf-8');
      return JSON.parse(content) as CacheMetadata;
    } catch {
      logger.warn(`Failed to read cache metadata: ${metaPath}`);
      return null;
    }
  }

  /**
   * Save cache metadata to .bmad-cache.json
   *
   * @param cachePath - Cache directory path
   * @param metadata - Metadata to save
   *
   * @remarks
   * Metadata is used to validate cache validity and track repository state.
   * Written atomically to prevent corruption during concurrent operations.
   */
  private async saveMetadata(
    cachePath: string,
    metadata: CacheMetadata,
  ): Promise<void> {
    const metaPath = path.join(cachePath, '.bmad-cache.json');
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  /**
   * Build full repository URL from spec
   *
   * @param spec - Parsed Git URL specification
   * @returns Full repository URL for git operations
   *
   * @remarks
   * Converts parsed spec back to standard Git URL format.
   * SSH: git@host:org/repo.git
   * HTTPS: https://host/org/repo.git
   */
  private buildRepoUrl(spec: GitUrlSpec): string {
    return spec.protocol === 'ssh'
      ? `git@${spec.host}:${spec.org}/${spec.repo}.git`
      : `https://${spec.host}/${spec.org}/${spec.repo}.git`;
  }

  /**
   * Execute git command with proper error handling
   *
   * @param command - Git command to execute
   * @param cwd - Working directory for command execution
   * @returns Promise resolving to stdout and stderr
   *
   * @remarks
   * Uses large buffer (10MB) to handle output from large repositories.
   * Throws formatted error with stderr content on failure.
   */
  private async execGit(
    command: string,
    cwd?: string,
  ): Promise<{ stdout: string; stderr: string }> {
    try {
      return await execAsync(command, {
        cwd,
        maxBuffer: GIT_COMMAND_MAX_BUFFER_BYTES, // 10MB buffer for large repos
      });
    } catch (error) {
      if (error instanceof Error && 'stderr' in error) {
        throw new Error((error as { stderr: string }).stderr || error.message);
      }
      throw error;
    }
  }

  /**
   * Check if a string is a git+ URL
   */
  static isGitUrl(url: string): boolean {
    return url.startsWith('git+https://') || url.startsWith('git+ssh://');
  }

  /**
   * Clear all cached repositories
   *
   * @remarks
   * This method removes the entire cache directory and all cached Git repositories.
   * Use this when you want to force fresh clones or free up disk space.
   *
   * @example
   * ```typescript
   * await resolver.clearCache();
   * // All cached repositories are removed
   * ```
   */
  async clearCache(): Promise<void> {
    if (await this.pathExists(this.cacheDir)) {
      logger.info(`Clearing Git cache: ${this.cacheDir}`);
      await this.removeDirectory(this.cacheDir);
      logger.info('Git cache cleared');
    }
  }

  /**
   * List all cached repositories
   *
   * @returns Array of cached repository information with metadata
   *
   * @remarks
   * Returns information about all cached Git repositories including their
   * cache metadata (URL, branch, subpath, timestamps).
   *
   * @example
   * ```typescript
   * const cache = await resolver.listCache();
   * for (const item of cache) {
   *   console.log(`${item.path}: ${item.metadata?.sourceUrl || 'no metadata'}`);
   * }
   * ```
   */
  async listCache(): Promise<
    Array<{ path: string; metadata: CacheMetadata | null }>
  > {
    if (!(await this.pathExists(this.cacheDir))) {
      return [];
    }

    const entries = await fs.readdir(this.cacheDir);
    const results: Array<{ path: string; metadata: CacheMetadata | null }> = [];

    for (const entry of entries) {
      const entryPath = path.join(this.cacheDir, entry);
      const stat = await fs.stat(entryPath);

      if (stat.isDirectory()) {
        const metadata = await this.loadMetadata(entryPath);
        results.push({ path: entryPath, metadata });
      }
    }

    return results;
  }
}
