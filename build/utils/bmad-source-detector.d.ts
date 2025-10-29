/**
 * BMAD Source Detector
 *
 * Detects and analyzes BMAD installations (v4 and v6) from filesystem paths.
 * Supports both legacy dotfolder structure (.bmad-core) and modern modular structure (bmad/).
 */
export type BmadSourceType = 'v4' | 'v6' | 'unknown';
export interface BmadSourceInfo {
    isValid: boolean;
    type: BmadSourceType;
    path: string;
    error?: string;
    version?: string;
    versionMajor?: number;
    versionMinor?: number;
    versionPatch?: number;
    versionPrerelease?: string;
    manifestPath?: string;
    agentManifestPath?: string;
    workflowManifestPath?: string;
    agentDir?: string;
    workflowDir?: string;
    modules?: string[];
    expansionPacks?: string[];
    installDate?: string;
    installType?: string;
    configuredIdes?: string[];
}
/**
 * Detect BMAD source type and extract metadata from a filesystem path
 */
export declare function detectBmadSource(sourcePath: string): BmadSourceInfo;
//# sourceMappingURL=bmad-source-detector.d.ts.map