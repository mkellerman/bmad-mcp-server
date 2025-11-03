/**
 * Represents a discovered BMAD installation root
 */
export interface FoundBmadRoot {
    version: 'v4' | 'v6' | 'unknown';
    root: string;
    manifestPath?: string;
    manifestDir?: string;
    depth: number;
    isCustom?: boolean;
}
interface SearchOptions {
    maxDepth?: number;
    currentDepth?: number;
    excludeDirs?: string[];
}
/**
 * Recursively search for BMAD installations in subdirectories
 *
 * Rules:
 * - Search DOWN only (subdirectories, not parents)
 * - Maximum depth: 3 levels (configurable)
 * - Only search directories with 'bmad' in the name
 * - Return ALL found installations (v4 and v6 separately)
 * - Each installation becomes a separate candidate
 *
 * @param startPath - Absolute path to start searching from
 * @param options - Search configuration
 * @returns Array of all found BMAD roots
 */
export declare function findBmadRootsRecursive(startPath: string, options?: SearchOptions): FoundBmadRoot[];
/**
 * Find BMAD root in or under a given path (convenience wrapper)
 *
 * @param candidatePath - Path to search
 * @returns First found BMAD root, or undefined if none found
 */
export declare function findBmadRoot(candidatePath: string): FoundBmadRoot | undefined;
/**
 * Sort found roots by depth (shallowest first) then by version (v6 before v4 before unknown)
 */
export declare function sortBmadRoots(roots: FoundBmadRoot[]): FoundBmadRoot[];
export {};
//# sourceMappingURL=bmad-root-finder.d.ts.map