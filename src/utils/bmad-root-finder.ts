import fs from 'node:fs';
import path from 'node:path';
import { logger } from './logger.js';

/**
 * Represents a discovered BMAD installation root
 */
export interface FoundBmadRoot {
  version: 'v4' | 'v6' | 'unknown';
  root: string; // Absolute path to BMAD root directory
  manifestPath?: string; // Absolute path to the manifest file (optional for custom)
  manifestDir?: string; // For v6: absolute path to _cfg directory
  depth: number; // How many levels deep from search start
  isCustom?: boolean; // True if this is a custom installation (no manifest)
}

interface SearchOptions {
  maxDepth?: number; // Maximum depth to search (default: 3)
  currentDepth?: number; // Internal: current recursion depth
  excludeDirs?: string[]; // Directories to exclude from search
}

/**
 * Check if a directory should be searched for BMAD installations
 * Returns true if the directory name:
 * - Contains 'bmad' (case-insensitive), OR
 * - Exactly matches 'agents', 'workflows', 'tasks', or '_cfg'
 * - Is NOT in the exclude list
 */
function shouldSearchDirectory(
  dirName: string,
  excludeDirs?: string[],
): boolean {
  const lowerName = dirName.toLowerCase();

  // Check exclude list first
  if (excludeDirs && excludeDirs.includes(dirName)) {
    return false;
  }

  // Check if contains 'bmad'
  if (lowerName.includes('bmad')) return true;

  // Check for exact matches
  const exactMatches = ['agents', 'workflows', 'tasks', '_cfg'];
  return exactMatches.includes(dirName);
}

/**
 * Check if a directory is a v6 BMAD root (contains _cfg/manifest.yaml)
 */
function isV6Root(dirPath: string): FoundBmadRoot | null {
  const cfgDir = path.join(dirPath, '_cfg');
  const manifestPath = path.join(cfgDir, 'manifest.yaml');

  try {
    if (
      fs.existsSync(cfgDir) &&
      fs.statSync(cfgDir).isDirectory() &&
      fs.existsSync(manifestPath) &&
      fs.statSync(manifestPath).isFile()
    ) {
      return {
        version: 'v6',
        root: dirPath,
        manifestPath,
        manifestDir: cfgDir,
        depth: 0, // Will be set by caller
      };
    }

    // Log what we checked
    if (fs.existsSync(cfgDir)) {
      logger.debug(
        `    [v6 check] _cfg exists but no manifest.yaml in ${dirPath}`,
      );
    }
  } catch {
    // Ignore permission errors, broken symlinks, etc.
  }

  return null;
}

/**
 * Check if a directory is a v4 BMAD root (contains install-manifest.yaml)
 */
function isV4Root(dirPath: string): FoundBmadRoot | null {
  const manifestPath = path.join(dirPath, 'install-manifest.yaml');

  try {
    if (fs.existsSync(manifestPath) && fs.statSync(manifestPath).isFile()) {
      return {
        version: 'v4',
        root: dirPath,
        manifestPath,
        depth: 0, // Will be set by caller
      };
    }
  } catch {
    // Ignore permission errors, broken symlinks, etc.
  }

  return null;
}

/**
 * Check if a directory is a custom BMAD installation (has agents/ or workflows/ but no manifest)
 * Excludes _cfg directories which are v6 configuration folders, not installations
 */
function isCustomRoot(dirPath: string): FoundBmadRoot | null {
  try {
    // Skip _cfg directories - they're v6 config folders, not installations
    const dirName = path.basename(dirPath);
    if (dirName === '_cfg') return null;

    const hasAgents = fs.existsSync(path.join(dirPath, 'agents'));
    const hasWorkflows = fs.existsSync(path.join(dirPath, 'workflows'));

    if (hasAgents || hasWorkflows) {
      return {
        version: 'unknown',
        root: dirPath,
        depth: 0, // Will be set by caller
        isCustom: true,
      };
    }
  } catch {
    // Ignore permission errors, broken symlinks, etc.
  }

  return null;
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
export function findBmadRootsRecursive(
  startPath: string,
  options: SearchOptions = {},
): FoundBmadRoot[] {
  const maxDepth = options.maxDepth ?? 3;
  const currentDepth = options.currentDepth ?? 0;
  const excludeDirs = options.excludeDirs ?? [
    '.git',
    'git',
    'node_modules',
    'cache',
    'build',
    'dist',
    'bin',
  ];
  const results: FoundBmadRoot[] = [];

  try {
    const resolvedPath = path.resolve(startPath);

    // Only log at depth 0 (initial search) or when checking directories
    const indent = '  '.repeat(currentDepth);
    if (currentDepth === 0) {
      logger.debug(`[bmad-finder] Starting search from: ${resolvedPath}`);
      logger.debug(`[bmad-finder] Max depth: ${maxDepth}`);
    }

    // Check if path exists and is a directory
    if (!fs.existsSync(resolvedPath)) {
      logger.debug(
        `${indent}[bmad-finder] Path does not exist: ${resolvedPath}`,
      );
      return results;
    }

    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
      logger.debug(`${indent}[bmad-finder] Not a directory: ${resolvedPath}`);
      return results;
    }

    logger.debug(`${indent}[bmad-finder] Checking: ${resolvedPath}`);

    // Check if current directory is a BMAD root
    const v6Root = isV6Root(resolvedPath);
    if (v6Root) {
      logger.debug(
        `${indent}[bmad-finder] ✓ Found v6 installation at ${resolvedPath}`,
      );
      logger.debug(
        `${indent}[bmad-finder]   - Manifest: ${v6Root.manifestPath}`,
      );
      v6Root.depth = currentDepth;
      results.push(v6Root);
      // Don't recurse into v6 installations - their subdirs are modules, not nested installations
      return results;
    }

    const v4Root = isV4Root(resolvedPath);
    if (v4Root) {
      logger.debug(
        `${indent}[bmad-finder] ✓ Found v4 installation at ${resolvedPath}`,
      );
      logger.debug(
        `${indent}[bmad-finder]   - Manifest: ${v4Root.manifestPath}`,
      );
      v4Root.depth = currentDepth;
      results.push(v4Root);
      // Don't recurse into v4 installations - their subdirs are expansion packs, not nested installations
      return results;
    }

    // Only check for custom if no manifest found (v6/v4 take precedence)
    const customRoot = isCustomRoot(resolvedPath);
    if (customRoot) {
      logger.debug(
        `${indent}[bmad-finder] ✓ Found custom installation at ${resolvedPath}`,
      );
      logger.debug(`${indent}[bmad-finder]   - No manifest (custom)`);
      customRoot.depth = currentDepth;
      results.push(customRoot);
      // Don't recurse into custom installations either
      return results;
    }

    // Stop recursion if we've reached max depth
    if (currentDepth >= maxDepth) {
      logger.debug(
        `${indent}[bmad-finder] Max depth reached at ${resolvedPath}`,
      );
      return results;
    }

    // Recurse into subdirectories
    // At depth 0-1 (starting point and first level), search ALL subdirectories
    // At deeper levels (2+), only search directories matching our criteria
    const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });

    const dirCount = entries.filter((e) => e.isDirectory()).length;
    logger.debug(
      `${indent}[bmad-finder] Scanning ${dirCount} subdirectories in ${path.basename(resolvedPath)}`,
    );

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      // At depth > 1, only search bmad-named, agents, workflows, tasks, or src directories
      if (currentDepth > 1 && !shouldSearchDirectory(entry.name, excludeDirs)) {
        logger.debug(
          `${indent}[bmad-finder] Skipping ${entry.name} (filtered by name)`,
        );
        continue;
      }

      // Skip hidden directories unless they match our search criteria
      if (
        entry.name.startsWith('.') &&
        !shouldSearchDirectory(entry.name, excludeDirs)
      ) {
        logger.debug(`${indent}[bmad-finder] Skipping ${entry.name} (hidden)`);
        continue;
      }

      const childPath = path.join(resolvedPath, entry.name);

      // Recursively search this directory
      const childResults = findBmadRootsRecursive(childPath, {
        maxDepth,
        currentDepth: currentDepth + 1,
        excludeDirs,
      });

      results.push(...childResults);
    }
  } catch (error) {
    // Ignore permission errors, broken symlinks, etc.
    // Common in node_modules and system directories
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.debug(`[bmad-finder] Error accessing ${startPath}: ${errorMsg}`);
  }

  if (currentDepth === 0) {
    logger.debug(
      `[bmad-finder] Search complete. Found ${results.length} installation(s)`,
    );
    results.forEach((root, i) => {
      logger.debug(
        `[bmad-finder]   ${i + 1}. ${root.version} at ${root.root} (depth: ${root.depth})`,
      );
    });
  }

  return results;
}

/**
 * Find BMAD root in or under a given path (convenience wrapper)
 *
 * @param candidatePath - Path to search
 * @returns First found BMAD root, or undefined if none found
 */
export function findBmadRoot(candidatePath: string): FoundBmadRoot | undefined {
  const roots = findBmadRootsRecursive(candidatePath);
  return roots[0]; // Return first match (shallowest by depth)
}

/**
 * Sort found roots by depth (shallowest first) then by version (v6 before v4 before unknown)
 */
export function sortBmadRoots(roots: FoundBmadRoot[]): FoundBmadRoot[] {
  return roots.sort((a, b) => {
    // First by depth (shallower = higher priority)
    if (a.depth !== b.depth) {
      return a.depth - b.depth;
    }
    // Then prefer manifest-based over custom (v6 > v4 > unknown)
    if (a.version !== b.version) {
      const versionPriority = { v6: 0, v4: 1, unknown: 2 };
      return versionPriority[a.version] - versionPriority[b.version];
    }
    // Finally by path (alphabetically)
    return a.root.localeCompare(b.root);
  });
}
