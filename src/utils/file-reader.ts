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
  constructor(message: string) {
    super(message);
    this.name = 'FileReadError';
  }
}

/**
 * Exception raised when path traversal is attempted.
 */
export class PathTraversalError extends FileReadError {
  constructor(message: string) {
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
  private bmadRoot: string;

  constructor(bmadRoot: string) {
    this.bmadRoot = path.resolve(bmadRoot);

    // Validate BMAD root exists
    if (!fs.existsSync(this.bmadRoot)) {
      console.warn(`BMAD root directory not found: ${this.bmadRoot}`);
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
  readFile(filePath: string): string {
    // Resolve the path (handles relative paths, symlinks, .., etc.)
    const resolvedPath = this.resolvePath(filePath);

    // Validate path is within BMAD root
    this.validatePath(resolvedPath);

    // Read file
    try {
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      console.log(`Read ${content.length} bytes from ${resolvedPath}`);
      return content;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        const errorMsg = `File not found: ${filePath}`;
        console.error(errorMsg);
        throw new FileReadError(errorMsg);
      } else if (error.code === 'EACCES') {
        const errorMsg = `Permission denied reading file: ${filePath}`;
        console.error(errorMsg);
        throw new FileReadError(errorMsg);
      } else {
        const errorMsg = `Error reading file ${filePath}: ${error.message}`;
        console.error(errorMsg);
        throw new FileReadError(errorMsg);
      }
    }
  }

  /**
   * Check if file exists within BMAD root.
   *
   * @param filePath Relative or absolute path to file
   * @returns True if file exists and is within BMAD root, false otherwise
   */
  fileExists(filePath: string): boolean {
    try {
      const resolvedPath = this.resolvePath(filePath);
      this.validatePath(resolvedPath);
      return fs.existsSync(resolvedPath);
    } catch {
      return false;
    }
  }

  /**
   * Resolve file path to absolute path.
   * Handles both relative and absolute paths.
   *
   * @param filePath Path to resolve
   * @returns Absolute resolved path
   */
  private resolvePath(filePath: string): string {
    // If path is already absolute, use it
    if (path.isAbsolute(filePath)) {
      return path.resolve(filePath);
    }

    // Otherwise, resolve relative to BMAD root
    return path.resolve(this.bmadRoot, filePath);
  }

  /**
   * Validate that resolved path is within BMAD root.
   * Prevents path traversal attacks.
   *
   * @param resolvedPath Absolute path to validate
   * @throws PathTraversalError if path is outside BMAD root
   */
  private validatePath(resolvedPath: string): void {
    // Check if resolved path starts with BMAD root
    // Use path.relative to check if path escapes root
    const relativePath = path.relative(this.bmadRoot, resolvedPath);

    // If relative path starts with '..' or is absolute, it's outside root
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      const errorMsg =
        `Path traversal detected: ${resolvedPath} is outside BMAD root ${this.bmadRoot}`;
      console.error(errorMsg);
      throw new PathTraversalError(errorMsg);
    }
  }
}
