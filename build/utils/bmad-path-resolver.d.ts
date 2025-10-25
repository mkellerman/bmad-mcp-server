export type BmadLocationSource = 'project' | 'cli' | 'env' | 'user' | 'package';
export interface BmadLocationInfo {
    source: BmadLocationSource;
    priority: number;
    displayName: string;
    originalPath?: string;
    resolvedRoot?: string;
    manifestDir?: string;
    status: 'valid' | 'missing' | 'not-found' | 'invalid';
    details?: string;
}
export interface BmadPathResolution {
    activeLocation: BmadLocationInfo;
    locations: BmadLocationInfo[];
    packageRoot: string;
    packageBmadPath: string;
    userBmadPath: string;
    projectRoot: string;
}
export interface ResolveBmadPathsOptions {
    cwd: string;
    cliArg?: string;
    envVar?: string;
    packageRoot: string;
    userBmadPath?: string;
}
export interface ManifestInfo {
    resolvedRoot: string;
    manifestDir: string;
}
/**
 * Resolve the active BMAD root by evaluating all known locations in priority order.
 */
export declare function resolveBmadPaths(options: ResolveBmadPathsOptions): BmadPathResolution;
export declare function detectManifestDirectory(candidatePath: string): ManifestInfo | undefined;
//# sourceMappingURL=bmad-path-resolver.d.ts.map