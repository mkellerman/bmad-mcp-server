import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
export function detectV6(root) {
    const bmadRoot = path.resolve(root);
    const cfgDir = path.join(bmadRoot, '_cfg');
    const manifestPath = path.join(cfgDir, 'manifest.yaml');
    try {
        if (!fs.existsSync(cfgDir) || !fs.statSync(cfgDir).isDirectory())
            return undefined;
        if (!fs.existsSync(manifestPath))
            return undefined;
        const content = fs.readFileSync(manifestPath, 'utf-8');
        const parsed = yaml.load(content);
        const modules = (parsed.modules ?? []).map((m) => ({
            name: m.name,
            version: m.version,
        }));
        return {
            kind: 'v6',
            root: bmadRoot,
            manifestDir: cfgDir,
            manifestPath,
            installationVersion: parsed.installation?.version,
            modules,
        };
    }
    catch {
        return undefined;
    }
}
/**
 * Detect v6 structure by filesystem (no manifest required)
 * Looks for module directories with agents/workflows/tasks folders
 * Also detects flat structures (agents/workflows/tasks at root)
 */
export function detectV6Filesystem(root) {
    const bmadRoot = path.resolve(root);
    try {
        if (!fs.existsSync(bmadRoot))
            return undefined;
        const modules = [];
        // Check if root itself has agents/workflows/tasks (flat structure)
        const rootHasAgents = fs.existsSync(path.join(bmadRoot, 'agents'));
        const rootHasWorkflows = fs.existsSync(path.join(bmadRoot, 'workflows'));
        const rootHasTasks = fs.existsSync(path.join(bmadRoot, 'tasks'));
        if (rootHasAgents || rootHasWorkflows || rootHasTasks) {
            // Flat structure - treat root as a single unnamed module
            modules.push({ name: '' });
        }
        else {
            // Scan for module directories (subdirs with agents/workflows/tasks)
            const entries = fs.readdirSync(bmadRoot, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory())
                    continue;
                if (entry.name.startsWith('_') || entry.name.startsWith('.'))
                    continue;
                const modulePath = path.join(bmadRoot, entry.name);
                const hasAgents = fs.existsSync(path.join(modulePath, 'agents'));
                const hasWorkflows = fs.existsSync(path.join(modulePath, 'workflows'));
                const hasTasks = fs.existsSync(path.join(modulePath, 'tasks'));
                // If it has at least one of these folders, consider it a module
                if (hasAgents || hasWorkflows || hasTasks) {
                    modules.push({ name: entry.name });
                }
            }
        }
        if (modules.length === 0)
            return undefined;
        return {
            kind: 'v6',
            root: bmadRoot,
            manifestDir: path.join(bmadRoot, '_cfg'), // May not exist
            manifestPath: path.join(bmadRoot, '_cfg', 'manifest.yaml'), // May not exist
            installationVersion: undefined,
            modules,
        };
    }
    catch {
        return undefined;
    }
}
export function detectV4(root) {
    const bmadRoot = path.resolve(root);
    const manifestPath = path.join(bmadRoot, 'install-manifest.yaml');
    try {
        if (!fs.existsSync(manifestPath))
            return undefined;
        const content = fs.readFileSync(manifestPath, 'utf-8');
        const parsed = yaml.load(content);
        return {
            kind: 'v4',
            root: bmadRoot,
            manifestPath,
            version: parsed.version,
            expansion_packs: parsed.expansion_packs,
        };
    }
    catch {
        return undefined;
    }
}
export function detectInstalledVersion(candidateRoot) {
    const root = path.resolve(candidateRoot);
    const detectedV6 = detectV6(root);
    if (detectedV6)
        return detectedV6;
    const detectedV4 = detectV4(root);
    if (detectedV4)
        return detectedV4;
    return { kind: 'unknown' };
}
//# sourceMappingURL=version-detector.js.map