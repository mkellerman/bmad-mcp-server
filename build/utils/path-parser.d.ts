/**
 * Path Parser - Parse and normalize BMAD file paths
 *
 * Supports two path formats:
 * - v6: {project-root}/bmad/<module>/<file-path>
 * - v4: .bmad-<module>/<file-path>
 *
 * Extracts module name and file path for master manifest queries.
 */
export interface ParsedBmadPath {
    /**
     * The module name extracted from the path.
     * Examples: 'core', 'debug', '2d-phaser-game-dev'
     */
    module: string | null;
    /**
     * The file path within the module.
     * Examples: 'agents/analyst.md', 'workflows/instrument/workflow.yaml'
     */
    filePath: string;
    /**
     * The original format detected.
     */
    format: 'v6' | 'v4' | 'unknown';
    /**
     * Whether the path contained a placeholder.
     */
    hasPlaceholder: boolean;
}
/**
 * Parse a BMAD file path into its components.
 *
 * Handles:
 * - v6 format: {project-root}/bmad/debug/workflows/instrument/workflow.yaml
 * - v4 format: .bmad-2d-phaser-game-dev/tasks/create-doc.md
 * - Plain relative: tasks/create-doc.md (no module specified)
 *
 * @param path - The file path to parse
 * @returns Parsed components (module, filePath, format)
 */
export declare function parseBmadPath(path: string): ParsedBmadPath;
/**
 * Normalize a file path by removing leading slashes and dots.
 *
 * @param path - The path to normalize
 * @returns Normalized path
 */
export declare function normalizePath(path: string): string;
//# sourceMappingURL=path-parser.d.ts.map