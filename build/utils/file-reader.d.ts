/**
 * File Reader - Secure file reading with path validation.
 *
 * This module provides secure file reading capabilities with path traversal
 * protection. It ensures that only files within the BMAD directory tree
 * can be accessed.
 */
/**
 * Exception raised when file reading fails.
 */
export declare class FileReadError extends Error {
    constructor(message: string);
}
/**
 * Exception raised when path traversal is attempted.
 */
export declare class PathTraversalError extends FileReadError {
    constructor(message: string);
}
/**
 * Secure file reader with path validation.
 *
 * Ensures all file reads are within the allowed BMAD directory tree.
 * Prevents path traversal attacks and unauthorized file access.
 */
export declare class FileReader {
    private primaryRoot;
    private roots;
    constructor(bmadRoot: string | string[]);
    /**
     * Read file contents with security validation.
     *
     * @param filePath Relative or absolute path to file
     * @returns File contents as string
     * @throws PathTraversalError if file path is outside BMAD root
     * @throws FileReadError if file doesn't exist or can't be read
     */
    readFile(filePath: string): string;
    /**
     * Check if file exists within BMAD root.
     *
     * @param filePath Relative or absolute path to file
     * @returns True if file exists and is within BMAD root, false otherwise
     */
    fileExists(filePath: string): boolean;
    /**
     * Resolve file path to absolute path.
     * Handles both relative and absolute paths.
     *
     * @param filePath Path to resolve
     * @returns Absolute resolved path
     */
    private resolvePath;
    /**
     * Validate that resolved path is within BMAD root.
     * Prevents path traversal attacks.
     *
     * @param resolvedPath Absolute path to validate
     * @throws PathTraversalError if path is outside BMAD root
     */
    private validatePath;
}
//# sourceMappingURL=file-reader.d.ts.map