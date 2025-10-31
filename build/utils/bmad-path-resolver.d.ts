import type { DiscoveryMode } from '../types/index.js';
export type BmadLocationSource = 'project' | 'cli' | 'env' | 'user';
export interface BmadLocationInfo {
    source: BmadLocationSource;
    priority: number;
    displayName: string;
    originalPath?: string;
    resolvedRoot?: string;
    manifestDir?: string;
    manifestPath?: string;
    version?: 'v4' | 'v6' | 'unknown';
    status: 'valid' | 'missing' | 'not-found' | 'invalid';
    details?: string;
}
export interface BmadPathResolution {
    activeLocation: BmadLocationInfo;
    activeLocations: BmadLocationInfo[];
    locations: BmadLocationInfo[];
    userBmadPath: string;
    projectRoot: string;
}
export interface ResolveBmadPathsOptions {
    cwd: string;
    cliArgs?: string[];
    envVar?: string;
    userBmadPath?: string;
    mode?: DiscoveryMode;
}
export interface ManifestInfo {
    resolvedRoot: string;
    manifestDir: string;
}
/**
 * Resolve the active BMAD root by evaluating all known locations in priority order.
 * Supports two modes:
 * - auto (default): Recursive search with priority-based resolution
 * - strict: Exact paths only from CLI args, no discovery, fail fast
 */
export declare function resolveBmadPaths(options: ResolveBmadPathsOptions): BmadPathResolution;
export declare function detectManifestDirectory(candidatePath: string): ManifestInfo | undefined;
//# sourceMappingURL=bmad-path-resolver.d.ts.map