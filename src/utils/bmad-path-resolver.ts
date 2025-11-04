import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findBmadRootsRecursive, sortBmadRoots } from './bmad-root-finder.js';
import type { DiscoveryMode } from '../types/index.js';

export type BmadLocationSource = 'project' | 'cli' | 'env' | 'user';

export interface BmadLocationInfo {
  source: BmadLocationSource;
  priority: number;
  displayName: string;
  originalPath?: string;
  resolvedRoot?: string;
  manifestDir?: string;
  manifestPath?: string;
  version?: 'v4' | 'v6' | 'unknown';
  status: 'valid' | 'missing' | 'not-found' | 'invalid';
  details?: string;
}

export interface BmadPathResolution {
  activeLocation: BmadLocationInfo;
  activeLocations: BmadLocationInfo[]; // All CLI-provided valid locations
  locations: BmadLocationInfo[];
  userBmadPath: string;
  projectRoot: string;
}

export interface ResolveBmadPathsOptions {
  cwd: string;
  cliArgs?: string[];
  envVar?: string;
  userBmadPath?: string;
  mode?: DiscoveryMode;
  rootSearchMaxDepth?: number;
  includeUserBmad?: boolean;
  excludeDirs?: string[];
}

const PRIORITY_ORDER: BmadLocationSource[] = ['project', 'cli', 'env', 'user'];

export interface ManifestInfo {
  resolvedRoot: string;
  manifestDir: string;
}

/**
 * Resolve the active BMAD root by evaluating all known locations in priority order.
 * Supports two modes:
 * - auto (default): Recursive search with priority-based resolution
 * - strict: Exact paths only from CLI args, no discovery, fail fast
 */
export function resolveBmadPaths(
  options: ResolveBmadPathsOptions,
): BmadPathResolution {
  const mode = options.mode ?? 'auto';

  if (mode === 'strict') {
    return resolveStrictPaths(options);
  }

  return resolveAutoPaths(options);
}

/**
 * Strict mode: Use exact paths only, no discovery
 * Only considers CLI arguments, fails if none provided or invalid
 * Note: Empty cliArgs can occur when git sources fail to resolve - this is allowed
 */
function resolveStrictPaths(
  options: ResolveBmadPathsOptions,
): BmadPathResolution {
  const userBmadPath = options.userBmadPath ?? path.join(os.homedir(), '.bmad');

  // Allow empty cliArgs in strict mode (can happen when git sources fail)
  // The server will still start, just with no BMAD installations loaded
  if (!options.cliArgs) {
    options.cliArgs = [];
  }

  // In strict mode, only check CLI arguments - no recursion, no fallbacks
  const candidates: BmadLocationInfo[] = [];

  options.cliArgs.forEach((cliArg, index) => {
    const resolvedPath = path.resolve(cliArg);

    if (!fs.existsSync(resolvedPath)) {
      candidates.push({
        source: 'cli',
        priority: 1,
        displayName: `CLI argument #${index + 1}`,
        originalPath: cliArg,
        status: 'missing',
        details: 'Path does not exist',
      });
      return;
    }

    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
      candidates.push({
        source: 'cli',
        priority: 1,
        displayName: `CLI argument #${index + 1}`,
        originalPath: cliArg,
        resolvedRoot: resolvedPath,
        status: 'invalid',
        details: 'Path is not a directory',
      });
      return;
    }

    // Direct manifest check - no recursive search
    const foundRoots = findBmadRootsRecursive(resolvedPath, { maxDepth: 0 }); // maxDepth=0 for exact match only

    if (foundRoots.length === 0) {
      candidates.push({
        source: 'cli',
        priority: 1,
        displayName: `CLI argument #${index + 1}`,
        originalPath: cliArg,
        resolvedRoot: resolvedPath,
        status: 'invalid',
        details: 'No BMAD installation found at this exact path',
      });
      return;
    }

    // Use the first (should be only) found root
    const root = foundRoots[0];
    candidates.push({
      source: 'cli',
      priority: 1,
      displayName: `CLI argument #${index + 1}`,
      originalPath: cliArg,
      resolvedRoot: root.root,
      manifestPath: root.manifestPath,
      manifestDir: root.manifestDir, // May be undefined for v4 or custom
      version: root.version,
      status: 'valid',
      details: root.manifestDir
        ? `Using manifests from ${root.manifestDir} (${root.version})`
        : root.manifestPath
          ? `Using ${root.version} manifest at ${root.manifestPath}`
          : `Using custom installation (no manifest)`,
    });
  });

  // Find first valid location (v6 with manifestDir, v4 with manifestPath, or custom with resolvedRoot)
  const activeLocation = candidates.find(
    (loc) =>
      loc.status === 'valid' &&
      (loc.manifestDir || loc.manifestPath || loc.version === 'unknown'),
  );

  // If no valid installation found, return a fallback configuration
  // This allows the server to start even when all sources fail
  if (!activeLocation) {
    // Create a fallback location
    const fallbackLocation: BmadLocationInfo = {
      source: 'user',
      priority: 4,
      displayName: 'No installation',
      status: 'not-found',
      details:
        candidates.length > 0
          ? 'All provided paths failed to load'
          : 'No BMAD sources configured',
    };

    return {
      activeLocation: fallbackLocation,
      activeLocations: [],
      locations: candidates.length > 0 ? candidates : [fallbackLocation],
      userBmadPath,
      projectRoot: options.cwd,
    };
  }

  // Collect all valid CLI locations for multi-root support
  const activeLocations = candidates.filter(
    (loc) =>
      loc.status === 'valid' &&
      (loc.manifestDir || loc.manifestPath || loc.version === 'unknown'),
  );

  return {
    activeLocation,
    activeLocations,
    locations: candidates,
    userBmadPath,
    projectRoot: options.cwd,
  };
}

/**
 * Auto mode: Original discovery behavior with recursive search
 */
function resolveAutoPaths(
  options: ResolveBmadPathsOptions,
): BmadPathResolution {
  const userBmadPath = options.userBmadPath ?? path.join(os.homedir(), '.bmad');
  const maxDepth = options.rootSearchMaxDepth ?? 3;
  const includeUserBmad = options.includeUserBmad ?? true;
  const excludeDirs = options.excludeDirs;

  const candidates: BmadLocationInfo[] = [
    ...buildCandidate(
      'project',
      'Local project',
      options.cwd,
      maxDepth,
      excludeDirs,
    ),
    ...buildCandidate(
      'env',
      'BMAD_ROOT environment variable',
      options.envVar,
      maxDepth,
      excludeDirs,
    ),
  ];

  // Conditionally add user BMAD path
  if (includeUserBmad) {
    candidates.push(
      ...buildCandidate(
        'user',
        'User defaults (~/.bmad)',
        userBmadPath,
        maxDepth,
        excludeDirs,
      ),
    );
  }

  // Add all CLI arguments as candidates with priority based on order
  if (options.cliArgs && options.cliArgs.length > 0) {
    options.cliArgs.forEach((cliArg, index) => {
      const cliCandidates = buildCandidate(
        'cli',
        `CLI argument #${index + 1}`,
        cliArg,
        maxDepth,
        excludeDirs,
      );
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
    const explicit = candidates.find(
      (location) =>
        location.status === 'valid' &&
        (location.source === 'cli' || location.source === 'env'),
    );
    if (explicit) {
      activeLocation = explicit;
    } else {
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
      ...candidates.map(
        (location) =>
          `│   - ${location.displayName.padEnd(35)} (${location.status.padEnd(10)})│`,
      ),
      '│                                                             │',
      '╰─────────────────────────────────────────────────────────────╯',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Collect all valid CLI locations for multi-root support in auto mode
  const activeLocations = candidates.filter(
    (loc) =>
      loc.status === 'valid' &&
      loc.source === 'cli' &&
      (loc.manifestDir || loc.manifestPath || loc.version === 'unknown'),
  );

  // If no CLI args provided, use the single active location
  if (activeLocations.length === 0) {
    activeLocations.push(activeLocation);
  }

  return {
    activeLocation,
    activeLocations,
    locations: candidates,
    userBmadPath,
    projectRoot: options.cwd,
  };
}

/**
 * Resolve manifests for an individual candidate path.
 * Returns an array since one path may contain multiple BMAD installations.
 */
function resolveCandidate(
  candidate?: string,
  maxDepth?: number,
  excludeDirs?: string[],
): BmadLocationInfo[] {
  if (!candidate) {
    return [];
  }

  const resolvedPath = path.resolve(candidate);
  if (!fs.existsSync(resolvedPath)) {
    return [
      {
        status: 'missing',
        originalPath: candidate,
      } as BmadLocationInfo,
    ];
  }

  const stats = fs.statSync(resolvedPath);
  if (!stats.isDirectory()) {
    return [
      {
        status: 'invalid',
        resolvedRoot: resolvedPath,
        originalPath: candidate,
      } as BmadLocationInfo,
    ];
  }

  // Search for BMAD installations recursively
  const foundRoots = findBmadRootsRecursive(resolvedPath, {
    maxDepth: maxDepth ?? 3,
    excludeDirs,
  });

  if (foundRoots.length === 0) {
    // No BMAD installations found - return as valid directory but no manifests
    return [
      {
        status: 'valid',
        resolvedRoot: resolvedPath,
        originalPath: candidate,
      } as BmadLocationInfo,
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
  })) as BmadLocationInfo[];
}

/**
 * Ensure each candidate has consistent metadata values.
 */
function enrichCandidate(location: BmadLocationInfo): BmadLocationInfo {
  // Normalize original path
  if (location.originalPath) {
    location.originalPath = path.resolve(location.originalPath);
  }

  if (
    location.status === 'valid' &&
    location.resolvedRoot &&
    location.manifestDir
  ) {
    const versionLabel = location.version ? ` (${location.version})` : '';
    location.details = `Using manifests from ${location.manifestDir}${versionLabel}`;
    return location;
  }
  if (location.status === 'valid' && location.resolvedRoot) {
    if (location.version === 'unknown') {
      location.details = 'Custom installation (no manifest)';
    } else {
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
function findManifestDirectory(
  candidateRoot: string,
): ManifestInfo | undefined {
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

export function detectManifestDirectory(
  candidatePath: string,
): ManifestInfo | undefined {
  return findManifestDirectory(path.resolve(candidatePath));
}

function buildCandidate(
  source: BmadLocationSource,
  displayName: string,
  candidatePath?: string,
  maxDepth?: number,
  excludeDirs?: string[],
): BmadLocationInfo[] {
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

  const resolvedLocations = resolveCandidate(
    candidatePath,
    maxDepth,
    excludeDirs,
  );

  // Enrich each location with source metadata
  return resolvedLocations.map((location, index) => {
    // Preserve location properties, override only source metadata
    const enriched = enrichCandidate({
      ...location,
      source,
      priority: PRIORITY_ORDER.indexOf(source) + 1,
      // If multiple installations, append index to display name
      displayName:
        resolvedLocations.length > 1
          ? `${displayName} [${index + 1}]`
          : displayName,
    });
    return enriched;
  });
}
