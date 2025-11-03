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
/**
 * Parsed Git URL specification
 */
export interface GitUrlSpec {
    protocol: 'https' | 'ssh';
    host: string;
    org: string;
    repo: string;
    ref: string;
    subpath?: string;
}
/**
 * Cache metadata stored with each cached repository
 */
export interface CacheMetadata {
    sourceUrl: string;
    hash: string;
    ref: string;
    subpath: string;
    lastPull: string;
    currentCommit: string;
}
/**
 * Git Source Resolver
 *
 * Resolves git+ URLs to local filesystem paths by:
 * 1. Checking cache validity (same URL, branch, subpath)
 * 2. Updating existing cache (git pull)
 * 3. Cloning fresh if cache missing or invalid
 */
export declare class GitSourceResolver {
    private cacheDir;
    private autoUpdate;
    constructor(cacheDir?: string, autoUpdate?: boolean);
    /**
     * Helper: Check if path exists
     */
    private pathExists;
    /**
     * Helper: Recursively remove directory
     */
    private removeDirectory;
    /**
     * Helper: Ensure directory exists
     */
    private ensureDirectory;
    /**
     * Resolve a git+ URL to a local filesystem path
     *
     * @param gitUrl - URL in format: git+https://github.com/org/repo.git#branch:/subpath
     * @returns Absolute path to the resolved location
     */
    resolve(gitUrl: string): Promise<string>;
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
    private parseGitUrl;
    /**
     * Validate cache against current URL and spec
     */
    private isValidCache;
    /**
     * Update existing cached repository to latest
     */
    private updateRepository;
    /**
     * Clone fresh repository to cache
     */
    private cloneRepository;
    /**
     * Load cache metadata from .bmad-cache.json
     */
    private loadMetadata;
    /**
     * Save cache metadata to .bmad-cache.json
     */
    private saveMetadata;
    /**
     * Build full repository URL from spec
     */
    private buildRepoUrl;
    /**
     * Execute git command with proper error handling
     */
    private execGit;
    /**
     * Check if a string is a git+ URL
     */
    static isGitUrl(url: string): boolean;
    /**
     * Clear all cached repositories
     */
    clearCache(): Promise<void>;
    /**
     * List all cached repositories
     */
    listCache(): Promise<Array<{
        path: string;
        metadata: CacheMetadata | null;
    }>>;
}
//# sourceMappingURL=git-source-resolver.d.ts.map