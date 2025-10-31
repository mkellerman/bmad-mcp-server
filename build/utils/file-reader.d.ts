/**
 * File Reader - Module-aware file reading using master manifest.
 *
 * This module provides secure file reading capabilities using the master manifest
 * as the source of truth. It resolves BMAD paths (v4 and v6 formats) to absolute
 * paths by querying the master manifest, then reads the files directly.
 *
 * Security is ensured by only reading files that exist in the master manifest,
 * which is built from validated BMAD installations during discovery.
 */
import type { MasterManifests } from '../types/index.js';
/**
 * Exception raised when file reading fails.
 */
export declare class FileReadError extends Error {
    constructor(message: string);
}
/**
 * Module-aware file reader using master manifest for path resolution.
 *
 * Resolves BMAD paths (with placeholders and module prefixes) to absolute paths
 * using the master manifest, then reads files directly. No path traversal
 * validation is needed since the master manifest only contains validated files.
 */
export declare class FileReader {
    private masterManifest;
    constructor(masterManifest: MasterManifests);
    /**
     * Read file contents using master manifest for path resolution.
     *
     * Supports multiple path formats:
     * - v6: {project-root}/bmad/<module>/<file-path>
     * - v4: .bmad-<module>/<file-path>
     * - Relative: <file-path> (searches all modules by priority)
     * - Absolute: /absolute/path (reads directly if file exists)
     *
     * @param filePath - Path to resolve and read (may contain placeholders)
     * @returns File contents as string
     * @throws FileReadError if file doesn't exist or can't be read
     */
    readFile(filePath: string): string;
    /**
     * Check if file exists using master manifest.
     *
     * @param filePath - Path to check (may contain placeholders)
     * @returns True if file exists in manifest and on filesystem
     */
    fileExists(filePath: string): boolean;
}
//# sourceMappingURL=file-reader.d.ts.map