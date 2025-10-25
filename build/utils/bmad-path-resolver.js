import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const PRIORITY_ORDER = [
    'project',
    'cli',
    'env',
    'user',
    'package',
];
/**
 * Resolve the active BMAD root by evaluating all known locations in priority order.
 */
export function resolveBmadPaths(options) {
    const packageBmadCandidates = [
        path.join(options.packageRoot, 'build', 'bmad'),
        path.join(options.packageRoot, 'src', 'bmad'),
        path.join(options.packageRoot, 'bmad'),
    ];
    const packageBmadPath = packageBmadCandidates.find((candidate) => fs.existsSync(candidate)) ??
        packageBmadCandidates[0];
    const userBmadPath = options.userBmadPath ?? path.join(os.homedir(), '.bmad');
    const candidates = [
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
        throw new Error('BMAD manifest directory not found. Checked locations:\n' +
            candidates
                .map((location) => `- ${location.displayName}: ${location.originalPath ?? '<none>'} (${location.status})`)
                .join('\n'));
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
function resolveCandidate(candidate) {
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
    const manifest = findManifestDirectory(resolvedPath);
    if (!manifest) {
        return {
            status: 'invalid',
            resolvedRoot: resolvedPath,
        };
    }
    return {
        status: 'valid',
        resolvedRoot: manifest.resolvedRoot,
        manifestDir: manifest.manifestDir,
    };
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
        return location;
    }
    if (location.status === 'invalid' && location.resolvedRoot) {
        location.details = `No _cfg manifests found under ${location.resolvedRoot}`;
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
    const directCfg = path.join(candidateRoot, '_cfg');
    if (fs.existsSync(directCfg) && fs.statSync(directCfg).isDirectory()) {
        return {
            resolvedRoot: candidateRoot,
            manifestDir: directCfg,
        };
    }
    const nestedCfg = path.join(candidateRoot, 'bmad', '_cfg');
    if (fs.existsSync(nestedCfg) && fs.statSync(nestedCfg).isDirectory()) {
        return {
            resolvedRoot: candidateRoot,
            manifestDir: nestedCfg,
        };
    }
    const srcCfg = path.join(candidateRoot, 'src', 'bmad', '_cfg');
    if (fs.existsSync(srcCfg) && fs.statSync(srcCfg).isDirectory()) {
        return {
            resolvedRoot: path.join(candidateRoot, 'src', 'bmad'),
            manifestDir: srcCfg,
        };
    }
    if (path.basename(candidateRoot) === '_cfg') {
        const parent = path.dirname(candidateRoot);
        return {
            resolvedRoot: parent,
            manifestDir: candidateRoot,
        };
    }
    if (path.basename(candidateRoot) === 'bmad') {
        const innerCfg = path.join(candidateRoot, '_cfg');
        if (fs.existsSync(innerCfg) && fs.statSync(innerCfg).isDirectory()) {
            return {
                resolvedRoot: candidateRoot,
                manifestDir: innerCfg,
            };
        }
    }
    return undefined;
}
export function detectManifestDirectory(candidatePath) {
    return findManifestDirectory(path.resolve(candidatePath));
}
function buildCandidate(source, displayName, candidatePath) {
    const base = {
        source,
        priority: PRIORITY_ORDER.indexOf(source) + 1,
        displayName,
        originalPath: candidatePath,
        status: 'not-found',
    };
    const resolved = resolveCandidate(candidatePath);
    return enrichCandidate({ ...base, ...resolved });
}
//# sourceMappingURL=bmad-path-resolver.js.map