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
 * Git Source Resolver
 *
 * Resolves git+ URLs to local filesystem paths by:
 * 1. Checking cache validity (same URL, branch, subpath)
 * 2. Updating existing cache (git pull)
 * 3. Cloning fresh if cache missing or invalid
 */
export class GitSourceResolver {
    cacheDir;
    constructor(cacheDir) {
        this.cacheDir =
            cacheDir || path.join(os.homedir(), '.bmad', 'cache', 'git');
    }
    /**
     * Helper: Check if path exists
     */
    async pathExists(p) {
        try {
            await fs.access(p);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Helper: Recursively remove directory
     */
    async removeDirectory(p) {
        await fs.rm(p, { recursive: true, force: true });
    }
    /**
     * Helper: Ensure directory exists
     */
    async ensureDirectory(p) {
        await fs.mkdir(p, { recursive: true });
    }
    /**
     * Resolve a git+ URL to a local filesystem path
     *
     * @param gitUrl - URL in format: git+https://github.com/org/repo.git#branch:/subpath
     * @returns Absolute path to the resolved location
     */
    async resolve(gitUrl) {
        const spec = this.parseGitUrl(gitUrl);
        const urlHash = crypto
            .createHash('sha256')
            .update(gitUrl)
            .digest('hex')
            .substring(0, 16);
        const cacheKey = `${spec.host}-${spec.org}-${spec.repo}-${spec.ref}-${urlHash}`;
        const cachePath = path.join(this.cacheDir, cacheKey);
        logger.info(`Resolving Git source: ${gitUrl}`);
        // Check if cache exists AND matches the exact URL spec
        const cacheExists = await this.pathExists(cachePath);
        if (cacheExists) {
            const metadata = await this.loadMetadata(cachePath);
            if (this.isValidCache(metadata, gitUrl, spec)) {
                // Cache exists and URL matches → PULL LATEST
                logger.info(`Updating cached repo: ${spec.org}/${spec.repo}#${spec.ref}`);
                await this.updateRepository(spec, cachePath, gitUrl);
            }
            else {
                // URL changed (different subpath/branch) → DELETE & RECLONE
                logger.warn(`Cache invalid for ${gitUrl} (URL or spec changed), re-cloning...`);
                await this.removeDirectory(cachePath);
                await this.cloneRepository(spec, cachePath, gitUrl);
            }
        }
        else {
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
    parseGitUrl(url) {
        // Pattern: git+(https|ssh)://[user@]host/org/repo[.git][#ref][:/subpath]
        const httpsMatch = url.match(/^git\+https:\/\/([^/]+)\/([^/]+)\/([^#:]+?)(\.git)?(#([^:]+))?(:(\/?.+))?$/);
        const sshMatch = url.match(/^git\+ssh:\/\/git@([^/]+)\/([^/]+)\/([^#:]+?)(\.git)?(#([^:]+))?(:(\/?.+))?$/);
        const match = httpsMatch || sshMatch;
        const protocol = httpsMatch ? 'https' : 'ssh';
        if (!match) {
            throw new Error(`Invalid git URL: ${url}\n` +
                `Expected format: git+https://github.com/org/repo.git#branch or git+ssh://git@github.com/org/repo.git#branch\n` +
                `Optional subpath: git+https://github.com/org/repo.git#branch:/subpath`);
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
     */
    isValidCache(metadata, gitUrl, spec) {
        if (!metadata)
            return false;
        // Validate: same URL hash, branch, and subpath
        return (metadata.sourceUrl === gitUrl &&
            metadata.ref === spec.ref &&
            metadata.subpath === (spec.subpath || ''));
    }
    /**
     * Update existing cached repository to latest
     */
    async updateRepository(spec, cachePath, originalUrl) {
        try {
            // Fetch and reset to origin (fast-forward, no merge conflicts)
            logger.debug(`Fetching updates for ${spec.ref}...`);
            await this.execGit(`git fetch origin ${spec.ref}`, cachePath);
            await this.execGit(`git reset --hard origin/${spec.ref}`, cachePath);
            const { stdout: commit } = await this.execGit('git rev-parse HEAD', cachePath);
            const commitSha = commit.trim();
            // Update metadata
            const existingMetadata = await this.loadMetadata(cachePath);
            await this.saveMetadata(cachePath, {
                ...existingMetadata,
                sourceUrl: originalUrl,
                lastPull: new Date().toISOString(),
                currentCommit: commitSha,
            });
            logger.info(`Updated to commit: ${commitSha.substring(0, 7)}`);
        }
        catch (error) {
            logger.error(`Failed to update ${spec.org}/${spec.repo}, falling back to reclone`);
            logger.debug(`Update error: ${String(error)}`);
            await this.removeDirectory(cachePath);
            await this.cloneRepository(spec, cachePath, originalUrl);
        }
    }
    /**
     * Clone fresh repository to cache
     */
    async cloneRepository(spec, cachePath, originalUrl) {
        await this.ensureDirectory(cachePath);
        const repoUrl = this.buildRepoUrl(spec);
        logger.info(`Cloning ${repoUrl} (branch: ${spec.ref})...`);
        try {
            // Shallow clone for speed (depth 1)
            await this.execGit(`git clone --branch ${spec.ref} --depth 1 ${repoUrl} ${cachePath}`);
            const { stdout: commit } = await this.execGit('git rev-parse HEAD', cachePath);
            const commitSha = commit.trim();
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
        }
        catch (error) {
            // Clean up failed clone
            await this.removeDirectory(cachePath);
            throw new Error(`Failed to clone ${repoUrl}#${spec.ref}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Load cache metadata from .bmad-cache.json
     */
    async loadMetadata(cachePath) {
        const metaPath = path.join(cachePath, '.bmad-cache.json');
        if (!(await this.pathExists(metaPath)))
            return null;
        try {
            const content = await fs.readFile(metaPath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            logger.warn(`Failed to read cache metadata: ${metaPath}`);
            return null;
        }
    }
    /**
     * Save cache metadata to .bmad-cache.json
     */
    async saveMetadata(cachePath, metadata) {
        const metaPath = path.join(cachePath, '.bmad-cache.json');
        await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
    }
    /**
     * Build full repository URL from spec
     */
    buildRepoUrl(spec) {
        return spec.protocol === 'ssh'
            ? `git@${spec.host}:${spec.org}/${spec.repo}.git`
            : `https://${spec.host}/${spec.org}/${spec.repo}.git`;
    }
    /**
     * Execute git command with proper error handling
     */
    async execGit(command, cwd) {
        try {
            return await execAsync(command, {
                cwd,
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large repos
            });
        }
        catch (error) {
            if (error instanceof Error && 'stderr' in error) {
                throw new Error(error.stderr || error.message);
            }
            throw error;
        }
    }
    /**
     * Check if a string is a git+ URL
     */
    static isGitUrl(url) {
        return url.startsWith('git+https://') || url.startsWith('git+ssh://');
    }
    /**
     * Clear all cached repositories
     */
    async clearCache() {
        if (await this.pathExists(this.cacheDir)) {
            logger.info(`Clearing Git cache: ${this.cacheDir}`);
            await this.removeDirectory(this.cacheDir);
            logger.info('Git cache cleared');
        }
    }
    /**
     * List all cached repositories
     */
    async listCache() {
        if (!(await this.pathExists(this.cacheDir))) {
            return [];
        }
        const entries = await fs.readdir(this.cacheDir);
        const results = [];
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
//# sourceMappingURL=git-source-resolver.js.map