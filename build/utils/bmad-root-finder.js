import fs from 'node:fs';
import path from 'node:path';
/**
 * Check if a directory should be searched for BMAD installations
 * Returns true if the directory name:
 * - Contains 'bmad' (case-insensitive), OR
 * - Exactly matches 'agents', 'workflows', 'tasks', or '_cfg'
 */
function shouldSearchDirectory(dirName) {
    const lowerName = dirName.toLowerCase();
    // Check if contains 'bmad'
    if (lowerName.includes('bmad'))
        return true;
    // Check for exact matches
    const exactMatches = ['agents', 'workflows', 'tasks', '_cfg'];
    return exactMatches.includes(dirName);
}
/**
 * Check if a directory is a v6 BMAD root (contains _cfg/manifest.yaml)
 */
function isV6Root(dirPath) {
    const cfgDir = path.join(dirPath, '_cfg');
    const manifestPath = path.join(cfgDir, 'manifest.yaml');
    try {
        if (fs.existsSync(cfgDir) &&
            fs.statSync(cfgDir).isDirectory() &&
            fs.existsSync(manifestPath) &&
            fs.statSync(manifestPath).isFile()) {
            return {
                version: 'v6',
                root: dirPath,
                manifestPath,
                manifestDir: cfgDir,
                depth: 0, // Will be set by caller
            };
        }
    }
    catch {
        // Ignore permission errors, broken symlinks, etc.
    }
    return null;
}
/**
 * Check if a directory is a v4 BMAD root (contains install-manifest.yaml)
 */
function isV4Root(dirPath) {
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
    }
    catch {
        // Ignore permission errors, broken symlinks, etc.
    }
    return null;
}
/**
 * Check if a directory is a custom BMAD installation (has agents/ or workflows/ but no manifest)
 * Excludes _cfg directories which are v6 configuration folders, not installations
 */
function isCustomRoot(dirPath) {
    try {
        // Skip _cfg directories - they're v6 config folders, not installations
        const dirName = path.basename(dirPath);
        if (dirName === '_cfg')
            return null;
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
    }
    catch {
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
export function findBmadRootsRecursive(startPath, options = {}) {
    const maxDepth = options.maxDepth ?? 3;
    const currentDepth = options.currentDepth ?? 0;
    const results = [];
    try {
        const resolvedPath = path.resolve(startPath);
        // Check if path exists and is a directory
        if (!fs.existsSync(resolvedPath)) {
            return results;
        }
        const stats = fs.statSync(resolvedPath);
        if (!stats.isDirectory()) {
            return results;
        }
        // Check if current directory is a BMAD root
        const v6Root = isV6Root(resolvedPath);
        if (v6Root) {
            v6Root.depth = currentDepth;
            results.push(v6Root);
            // Don't recurse into v6 installations - their subdirs are modules, not nested installations
            return results;
        }
        const v4Root = isV4Root(resolvedPath);
        if (v4Root) {
            v4Root.depth = currentDepth;
            results.push(v4Root);
            // Don't recurse into v4 installations - their subdirs are expansion packs, not nested installations
            return results;
        }
        // Only check for custom if no manifest found (v6/v4 take precedence)
        const customRoot = isCustomRoot(resolvedPath);
        if (customRoot) {
            customRoot.depth = currentDepth;
            results.push(customRoot);
            // Don't recurse into custom installations either
            return results;
        }
        // Stop recursion if we've reached max depth
        if (currentDepth >= maxDepth) {
            return results;
        }
        // Recurse into subdirectories
        // At depth 0-1 (starting point and first level), search ALL subdirectories
        // At deeper levels (2+), only search directories matching our criteria
        const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            // At depth > 1, only search bmad-named, agents, workflows, tasks, or src directories
            if (currentDepth > 1 && !shouldSearchDirectory(entry.name))
                continue;
            // Skip hidden directories unless they match our search criteria
            if (entry.name.startsWith('.') && !shouldSearchDirectory(entry.name))
                continue;
            const childPath = path.join(resolvedPath, entry.name);
            // Recursively search this directory
            const childResults = findBmadRootsRecursive(childPath, {
                maxDepth,
                currentDepth: currentDepth + 1,
            });
            results.push(...childResults);
        }
    }
    catch {
        // Ignore permission errors, broken symlinks, etc.
        // Common in node_modules and system directories
    }
    return results;
}
/**
 * Find BMAD root in or under a given path (convenience wrapper)
 *
 * @param candidatePath - Path to search
 * @returns First found BMAD root, or undefined if none found
 */
export function findBmadRoot(candidatePath) {
    const roots = findBmadRootsRecursive(candidatePath);
    return roots[0]; // Return first match (shallowest by depth)
}
/**
 * Sort found roots by depth (shallowest first) then by version (v6 before v4 before unknown)
 */
export function sortBmadRoots(roots) {
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
//# sourceMappingURL=bmad-root-finder.js.map