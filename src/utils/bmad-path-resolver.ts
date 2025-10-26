import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type BmadLocationSource = 'project' | 'cli' | 'env' | 'user' | 'package';

export interface BmadLocationInfo {
  source: BmadLocationSource;
  priority: number;
  displayName: string;
  originalPath?: string;
  resolvedRoot?: string;
  manifestDir?: string;
  status: 'valid' | 'missing' | 'not-found' | 'invalid';
  details?: string;
}

export interface BmadPathResolution {
  activeLocation: BmadLocationInfo;
  locations: BmadLocationInfo[];
  packageRoot: string;
  packageBmadPath: string;
  userBmadPath: string;
  projectRoot: string;
}

export interface ResolveBmadPathsOptions {
  cwd: string;
  cliArg?: string;
  envVar?: string;
  packageRoot: string;
  userBmadPath?: string;
}

const PRIORITY_ORDER: BmadLocationSource[] = [
  'project',
  'cli',
  'env',
  'user',
  'package',
];

export interface ManifestInfo {
  resolvedRoot: string;
  manifestDir: string;
}

/**
 * Resolve the active BMAD root by evaluating all known locations in priority order.
 */
export function resolveBmadPaths(
  options: ResolveBmadPathsOptions,
): BmadPathResolution {
  const packageBmadCandidates = [
    path.join(options.packageRoot, 'build', 'bmad'),
    path.join(options.packageRoot, 'src', 'bmad'),
    path.join(options.packageRoot, 'bmad'),
  ];
  const packageBmadPath =
    packageBmadCandidates.find((candidate) => fs.existsSync(candidate)) ??
    options.packageRoot; // Fallback to package root itself if no bmad subfolder found
  const userBmadPath = options.userBmadPath ?? path.join(os.homedir(), '.bmad');

  const candidates: BmadLocationInfo[] = [
    buildCandidate('project', 'Local project', options.cwd),
    buildCandidate('cli', 'Command argument', options.cliArg),
    buildCandidate('env', 'BMAD_ROOT environment variable', options.envVar),
    buildCandidate('user', 'User defaults (~/.bmad)', userBmadPath),
    buildCandidate('package', 'Package defaults', packageBmadPath),
  ];

  const activeLocation = candidates
    .filter((location) => location.status === 'valid')
    .sort((a, b) => a.priority - b.priority)[0];

  if (!activeLocation) {
    throw new Error(
      'BMAD manifest directory not found. Checked locations:\n' +
        candidates
          .map(
            (location) =>
              `- ${location.displayName}: ${location.originalPath ?? '<none>'} (${location.status})`,
          )
          .join('\n'),
    );
  }

  return {
    activeLocation,
    locations: candidates,
    packageRoot: options.packageRoot,
    packageBmadPath,
    userBmadPath,
    projectRoot: options.cwd,
  };
}

/**
 * Resolve manifests for an individual candidate path.
 */
function resolveCandidate(candidate?: string): Partial<BmadLocationInfo> {
  if (!candidate) {
    return {
      status: 'not-found',
    };
  }

  const resolvedPath = path.resolve(candidate);
  if (!fs.existsSync(resolvedPath)) {
    return {
      status: 'missing',
      originalPath: candidate,
    };
  }

  const stats = fs.statSync(resolvedPath);
  if (!stats.isDirectory()) {
    return {
      status: 'invalid',
      resolvedRoot: resolvedPath,
      originalPath: candidate,
    };
  }

  // Directory exists - determine the manifest directory and BMAD root
  const manifest = findManifestDirectory(resolvedPath);

  return {
    status: 'valid',
    resolvedRoot: manifest?.resolvedRoot ?? resolvedPath,
    manifestDir: manifest?.manifestDir,
    originalPath: candidate,
  };
}

/**
 * Ensure each candidate has consistent metadata values.
 */
function enrichCandidate(location: BmadLocationInfo): BmadLocationInfo {
  // Normalize original path
  if (location.originalPath) {
    location.originalPath = path.resolve(location.originalPath);
  }

  if (location.status === 'valid' && location.resolvedRoot) {
    if (location.manifestDir) {
      location.details = `Using manifests from ${location.manifestDir}`;
    } else {
      location.details = 'Using directory directly (no _cfg found)';
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
): BmadLocationInfo {
  const base: BmadLocationInfo = {
    source,
    priority: PRIORITY_ORDER.indexOf(source) + 1,
    displayName,
    originalPath: candidatePath,
    status: 'not-found',
  };

  const resolved = resolveCandidate(candidatePath);
  return enrichCandidate({ ...base, ...resolved });
}
