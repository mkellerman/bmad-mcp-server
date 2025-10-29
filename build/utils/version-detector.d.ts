export interface V6RootManifest {
    installation?: {
        version?: string;
    };
    modules?: Array<{
        name: string;
        version?: string;
        shortTitle?: string;
    }>;
}
export interface DetectedV6 {
    kind: 'v6';
    root: string;
    manifestDir: string;
    manifestPath: string;
    installationVersion?: string;
    modules: Array<{
        name: string;
        version?: string;
    }>;
}
export interface DetectedV4 {
    kind: 'v4';
    root: string;
    manifestPath: string;
    version?: string;
    expansion_packs?: string[];
}
export interface DetectedUnknown {
    kind: 'unknown';
}
export type DetectedVersion = DetectedV6 | DetectedV4 | DetectedUnknown;
export declare function detectV6(root: string): DetectedV6 | undefined;
/**
 * Detect v6 structure by filesystem (no manifest required)
 * Looks for module directories with agents/workflows/tasks folders
 */
export declare function detectV6Filesystem(root: string): DetectedV6 | undefined;
export declare function detectV4(root: string): DetectedV4 | undefined;
export declare function detectInstalledVersion(candidateRoot: string): DetectedVersion;
//# sourceMappingURL=version-detector.d.ts.map