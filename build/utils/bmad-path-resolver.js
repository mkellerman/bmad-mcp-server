import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findBmadRootsRecursive, sortBmadRoots, } from './bmad-root-finder.js';
const PRIORITY_ORDER = ['project', 'cli', 'env', 'user'];
/**
 * Resolve the active BMAD root by evaluating all known locations in priority order.
 */
export function resolveBmadPaths(options) {
    const userBmadPath = options.userBmadPath ?? path.join(os.homedir(), '.bmad');
    const candidates = [
        ...buildCandidate('project', 'Local project', options.cwd),
        ...buildCandidate('env', 'BMAD_ROOT environment variable', options.envVar),
        ...buildCandidate('user', 'User defaults (~/.bmad)', userBmadPath),
    ];
    // Add all CLI arguments as candidates with priority based on order
    if (options.cliArgs && options.cliArgs.length > 0) {
        options.cliArgs.forEach((cliArg, index) => {
            const cliCandidates = buildCandidate('cli', `CLI argument #${index + 1}`, cliArg);
            // Insert CLI candidates at the beginning (highest priority)
            candidates.splice(index + 1, 0, ...cliCandidates);
        });
    }
    // Prefer locations that have a detected manifest directory (_cfg)
    let activeLocation = candidates
        .filter((location) => location.status === 'valid' && location.manifestDir)
        .sort((a, b) => a.priority - b.priority)[0];
    // Fallback: if none have manifests, prefer explicit inputs (CLI/ENV),
    // otherwise use the first valid directory by default priority.
    if (!activeLocation) {
        const explicit = candidates.find((location) => location.status === 'valid' &&
            (location.source === 'cli' || location.source === 'env'));
        if (explicit) {
            activeLocation = explicit;
        }
        else {
            activeLocation = candidates
                .filter((location) => location.status === 'valid')
                .sort((a, b) => a.priority - b.priority)[0];
        }
    }
    if (!activeLocation) {
        const errorMessage = [
            '╭─────────────────────────────────────────────────────────────╮',
            '│ ⚠️  BMAD Installation Not Found                             │',
            '├─────────────────────────────────────────────────────────────┤',
            '│                                                             │',
            '│ The BMAD MCP server requires a BMAD installation.          │',
            '│ Versions v4, v5, and v6 are supported.                     │',
            '│                                                             │',
            '│ 📦 Install BMAD:                                            │',
            '│    npx bmad-method install                                 │',
            '│                                                             │',
            '│ 🔧 Or specify a custom location:                           │',
            '│    export BMAD_ROOT=/path/to/bmad                          │',
            '│                                                             │',
            '│ 📖 Learn more:                                              │',
            '│    https://github.com/bmadcode/bmad                        │',
            '│                                                             │',
            '│ Checked locations:                                          │',
            ...candidates.map((location) => `│   - ${location.displayName.padEnd(35)} (${location.status.padEnd(10)})│`),
            '│                                                             │',
            '╰─────────────────────────────────────────────────────────────╯',
        ].join('\n');
        throw new Error(errorMessage);
    }
    return {
        activeLocation,
        locations: candidates,
        userBmadPath,
        projectRoot: options.cwd,
    };
}
/**
 * Resolve manifests for an individual candidate path.
 * Returns an array since one path may contain multiple BMAD installations.
 */
function resolveCandidate(candidate) {
    if (!candidate) {
        return [];
    }
    const resolvedPath = path.resolve(candidate);
    if (!fs.existsSync(resolvedPath)) {
        return [
            {
                status: 'missing',
                originalPath: candidate,
            },
        ];
    }
    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
        return [
            {
                status: 'invalid',
                resolvedRoot: resolvedPath,
                originalPath: candidate,
            },
        ];
    }
    // Search for BMAD installations recursively
    const foundRoots = findBmadRootsRecursive(resolvedPath);
    if (foundRoots.length === 0) {
        // No BMAD installations found - return as valid directory but no manifests
        return [
            {
                status: 'valid',
                resolvedRoot: resolvedPath,
                originalPath: candidate,
            },
        ];
    }
    // Sort by depth and version preference
    const sortedRoots = sortBmadRoots(foundRoots);
    // Convert each found root to a location info
    return sortedRoots.map((root) => ({
        status: 'valid',
        resolvedRoot: root.root,
        manifestPath: root.manifestPath,
        manifestDir: root.manifestDir,
        version: root.version,
        originalPath: candidate,
    }));
}
/**
 * Ensure each candidate has consistent metadata values.
 */
function enrichCandidate(location) {
    // Normalize original path
    if (location.originalPath) {
        location.originalPath = path.resolve(location.originalPath);
    }
    if (location.status === 'valid' &&
        location.resolvedRoot &&
        location.manifestDir) {
        const versionLabel = location.version ? ` (${location.version})` : '';
        location.details = `Using manifests from ${location.manifestDir}${versionLabel}`;
        return location;
    }
    if (location.status === 'valid' && location.resolvedRoot) {
        if (location.version === 'unknown') {
            location.details = 'Custom installation (no manifest)';
        }
        else {
            location.details = 'Using directory directly (no manifests found)';
        }
        return location;
    }
    if (location.status === 'invalid' && location.resolvedRoot) {
        location.details = 'Path exists but is not a directory';
    }
    if (location.status === 'missing') {
        location.details = 'Directory does not exist';
    }
    if (location.status === 'not-found') {
        location.details = 'Not configured';
    }
    return location;
}
/**
 * Locate the manifest directory for a candidate root.
 */
function findManifestDirectory(candidateRoot) {
    if (!fs.existsSync(candidateRoot)) {
        return undefined;
    }
    const stats = fs.statSync(candidateRoot);
    if (!stats.isDirectory()) {
        return undefined;
    }
    // Special case: if the path itself is named '_cfg', verify parent is 'bmad'
    if (path.basename(candidateRoot) === '_cfg') {
        const parent = path.dirname(candidateRoot);
        if (path.basename(parent) === 'bmad') {
            return {
                resolvedRoot: parent,
                manifestDir: candidateRoot,
            };
        }
        // _cfg exists but parent is not 'bmad', invalid structure
        return undefined;
    }
    // Special case: if the path itself is named 'bmad', look for _cfg inside it
    if (path.basename(candidateRoot) === 'bmad') {
        const innerCfg = path.join(candidateRoot, '_cfg');
        if (fs.existsSync(innerCfg) && fs.statSync(innerCfg).isDirectory()) {
            return {
                resolvedRoot: candidateRoot,
                manifestDir: innerCfg,
            };
        }
    }
    // Check if this is a bmad root directory (contains _cfg directly)
    const directCfg = path.join(candidateRoot, '_cfg');
    if (fs.existsSync(directCfg) && fs.statSync(directCfg).isDirectory()) {
        // Verify this is actually a bmad folder by checking if parent structure makes sense
        // or if we're already in a folder named 'bmad'
        if (path.basename(candidateRoot) === 'bmad') {
            return {
                resolvedRoot: candidateRoot,
                manifestDir: directCfg,
            };
        }
    }
    // Check for bmad/_cfg nested structure (standard case)
    const nestedCfg = path.join(candidateRoot, 'bmad', '_cfg');
    if (fs.existsSync(nestedCfg) && fs.statSync(nestedCfg).isDirectory()) {
        return {
            resolvedRoot: path.join(candidateRoot, 'bmad'),
            manifestDir: nestedCfg,
        };
    }
    // Check for src/bmad/_cfg nested structure (development case)
    const srcCfg = path.join(candidateRoot, 'src', 'bmad', '_cfg');
    if (fs.existsSync(srcCfg) && fs.statSync(srcCfg).isDirectory()) {
        return {
            resolvedRoot: path.join(candidateRoot, 'src', 'bmad'),
            manifestDir: srcCfg,
        };
    }
    // No valid bmad structure found
    return undefined;
}
export function detectManifestDirectory(candidatePath) {
    return findManifestDirectory(path.resolve(candidatePath));
}
function buildCandidate(source, displayName, candidatePath) {
    if (!candidatePath) {
        return [
            enrichCandidate({
                source,
                priority: PRIORITY_ORDER.indexOf(source) + 1,
                displayName,
                originalPath: candidatePath,
                status: 'not-found',
            }),
        ];
    }
    const resolvedLocations = resolveCandidate(candidatePath);
    // Enrich each location with source metadata
    return resolvedLocations.map((location, index) => {
        // Preserve location properties, override only source metadata
        const enriched = enrichCandidate({
            ...location,
            source,
            priority: PRIORITY_ORDER.indexOf(source) + 1,
            // If multiple installations, append index to display name
            displayName: resolvedLocations.length > 1
                ? `${displayName} [${index + 1}]`
                : displayName,
        });
        return enriched;
    });
}
//# sourceMappingURL=bmad-path-resolver.js.map