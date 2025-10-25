/**
 * File Reader - Secure file reading with path validation.
 *
 * This module provides secure file reading capabilities with path traversal
 * protection. It ensures that only files within the BMAD directory tree
 * can be accessed.
 */
import fs from 'node:fs';
import path from 'node:path';
/**
 * Exception raised when file reading fails.
 */
export class FileReadError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FileReadError';
    }
}
/**
 * Exception raised when path traversal is attempted.
 */
export class PathTraversalError extends FileReadError {
    constructor(message) {
        super(message);
        this.name = 'PathTraversalError';
    }
}
/**
 * Secure file reader with path validation.
 *
 * Ensures all file reads are within the allowed BMAD directory tree.
 * Prevents path traversal attacks and unauthorized file access.
 */
export class FileReader {
    primaryRoot;
    roots;
    constructor(bmadRoot) {
        if (Array.isArray(bmadRoot)) {
            const resolved = bmadRoot.map((root) => path.resolve(root));
            this.primaryRoot = resolved[0];
            this.roots = resolved;
        }
        else {
            this.primaryRoot = path.resolve(bmadRoot);
            this.roots = [this.primaryRoot];
        }
        // Validate BMAD roots exist
        for (const root of this.roots) {
            if (!fs.existsSync(root)) {
                console.warn(`BMAD root directory not found: ${root}`);
            }
        }
    }
    /**
     * Read file contents with security validation.
     *
     * @param filePath Relative or absolute path to file
     * @returns File contents as string
     * @throws PathTraversalError if file path is outside BMAD root
     * @throws FileReadError if file doesn't exist or can't be read
     */
    readFile(filePath) {
        const lastErrors = [];
        for (const root of this.roots) {
            try {
                const resolvedPath = this.resolvePath(root, filePath);
                this.validatePath(root, resolvedPath);
                const content = fs.readFileSync(resolvedPath, 'utf-8');
                console.error(`Read ${content.length} bytes from ${resolvedPath}`);
                return content;
            }
            catch (error) {
                if (error instanceof PathTraversalError) {
                    throw error;
                }
                lastErrors.push(error);
            }
        }
        const errorMsg = `File not found across BMAD roots: ${filePath}`;
        console.error(errorMsg);
        if (lastErrors.length > 0) {
            lastErrors.forEach((err) => {
                const message = err instanceof Error ? err.message : String(err);
                console.error('  Cause:', message);
            });
        }
        throw new FileReadError(errorMsg);
    }
    /**
     * Check if file exists within BMAD root.
     *
     * @param filePath Relative or absolute path to file
     * @returns True if file exists and is within BMAD root, false otherwise
     */
    fileExists(filePath) {
        for (const root of this.roots) {
            try {
                const resolvedPath = this.resolvePath(root, filePath);
                this.validatePath(root, resolvedPath);
                if (fs.existsSync(resolvedPath)) {
                    return true;
                }
            }
            catch {
                // Ignore and continue to next root
            }
        }
        return false;
    }
    /**
     * Resolve file path to absolute path.
     * Handles both relative and absolute paths.
     *
     * @param filePath Path to resolve
     * @returns Absolute resolved path
     */
    resolvePath(root, filePath) {
        if (path.isAbsolute(filePath)) {
            return path.resolve(filePath);
        }
        return path.resolve(root, filePath);
    }
    /**
     * Validate that resolved path is within BMAD root.
     * Prevents path traversal attacks.
     *
     * @param resolvedPath Absolute path to validate
     * @throws PathTraversalError if path is outside BMAD root
     */
    validatePath(root, resolvedPath) {
        // Check if resolved path starts with BMAD root
        // Use path.relative to check if path escapes root
        const relativePath = path.relative(root, resolvedPath);
        // If relative path starts with '..' or is absolute, it's outside root
        if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
            const errorMsg = `Path traversal detected: ${resolvedPath} is outside BMAD root ${root}`;
            console.error(errorMsg);
            throw new PathTraversalError(errorMsg);
        }
    }
}
//# sourceMappingURL=file-reader.js.map