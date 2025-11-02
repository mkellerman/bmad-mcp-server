import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

export interface V6RootManifest {
  installation?: { version?: string };
  modules?: Array<string | { name: string; version?: string; shortTitle?: string }>;
}

export interface DetectedV6 {
  kind: 'v6';
  root: string; // absolute path to 'bmad'
  manifestDir: string; // absolute path to 'bmad/_cfg'
  manifestPath: string; // absolute path to manifest.yaml
  installationVersion?: string;
  modules: Array<{ name: string; version?: string }>;
}

export interface DetectedV4 {
  kind: 'v4';
  root: string; // absolute path to root containing install-manifest.yaml
  manifestPath: string; // absolute path to install-manifest.yaml
  version?: string;
  expansion_packs?: string[];
}

export interface DetectedUnknown {
  kind: 'unknown';
}

export type DetectedVersion = DetectedV6 | DetectedV4 | DetectedUnknown;

export function detectV6(root: string): DetectedV6 | undefined {
  const bmadRoot = path.resolve(root);
  const cfgDir = path.join(bmadRoot, '_cfg');
  const manifestPath = path.join(cfgDir, 'manifest.yaml');
  try {
    if (!fs.existsSync(cfgDir) || !fs.statSync(cfgDir).isDirectory())
      return undefined;
    if (!fs.existsSync(manifestPath)) return undefined;
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const parsed = yaml.load(content) as V6RootManifest;
    const modules = (parsed.modules ?? []).map((m) => {
      // Handle both string and object formats dynamically
      if (typeof m === 'string') {
        return { name: m, version: undefined };
      }
      return {
        name: m.name,
        version: m.version,
      };
    });
    return {
      kind: 'v6',
      root: bmadRoot,
      manifestDir: cfgDir,
      manifestPath,
      installationVersion: parsed.installation?.version,
      modules,
    };
  } catch {
    return undefined;
  }
}

/**
 * Detect v6 structure by filesystem (no manifest required)
 * Looks for module directories with agents/workflows/tasks folders
 * Also detects flat structures (agents/workflows/tasks at root)
 */
export function detectV6Filesystem(root: string): DetectedV6 | undefined {
  const bmadRoot = path.resolve(root);
  try {
    if (!fs.existsSync(bmadRoot)) return undefined;

    const modules: Array<{ name: string; version?: string }> = [];

    // Check if root itself has agents/workflows/tasks (flat structure)
    const rootHasAgents = fs.existsSync(path.join(bmadRoot, 'agents'));
    const rootHasWorkflows = fs.existsSync(path.join(bmadRoot, 'workflows'));
    const rootHasTasks = fs.existsSync(path.join(bmadRoot, 'tasks'));

    if (rootHasAgents || rootHasWorkflows || rootHasTasks) {
      // Flat structure - treat root as a single unnamed module
      modules.push({ name: '' });
    } else {
      // Scan for module directories (subdirs with agents/workflows/tasks)
      const entries = fs.readdirSync(bmadRoot, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;

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

    if (modules.length === 0) return undefined;

    return {
      kind: 'v6',
      root: bmadRoot,
      manifestDir: path.join(bmadRoot, '_cfg'), // May not exist
      manifestPath: path.join(bmadRoot, '_cfg', 'manifest.yaml'), // May not exist
      installationVersion: undefined,
      modules,
    };
  } catch {
    return undefined;
  }
}

export function detectV4(root: string): DetectedV4 | undefined {
  const bmadRoot = path.resolve(root);
  const manifestPath = path.join(bmadRoot, 'install-manifest.yaml');
  try {
    if (!fs.existsSync(manifestPath)) return undefined;
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const parsed = yaml.load(content) as {
      version?: string;
      expansion_packs?: string[];
    };
    return {
      kind: 'v4',
      root: bmadRoot,
      manifestPath,
      version: parsed.version,
      expansion_packs: parsed.expansion_packs,
    };
  } catch {
    return undefined;
  }
}

export function detectInstalledVersion(candidateRoot: string): DetectedVersion {
  const root = path.resolve(candidateRoot);
  const detectedV6 = detectV6(root);
  if (detectedV6) return detectedV6;
  const detectedV4 = detectV4(root);
  if (detectedV4) return detectedV4;
  return { kind: 'unknown' };
}
