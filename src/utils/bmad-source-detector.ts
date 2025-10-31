/**
 * BMAD Source Detector
 *
 * Detects and analyzes BMAD installations (v4 and v6) from filesystem paths.
 * Supports both legacy dotfolder structure (.bmad-core) and modern modular structure (bmad/).
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export type BmadSourceType = 'v4' | 'v6' | 'unknown';

export interface BmadSourceInfo {
  // Detection results
  isValid: boolean;
  type: BmadSourceType;
  path: string;
  error?: string;

  // Version information
  version?: string;
  versionMajor?: number;
  versionMinor?: number;
  versionPatch?: number;
  versionPrerelease?: string;

  // Manifest paths
  manifestPath?: string;
  agentManifestPath?: string; // v6 only
  workflowManifestPath?: string; // v6 only
  agentDir?: string; // v4 only
  workflowDir?: string; // v4 only

  // Metadata
  modules?: string[]; // v6 only
  expansionPacks?: string[]; // v4 only
  installDate?: string;
  installType?: string; // v4 only
  configuredIdes?: string[]; // v6 only
}

/**
 * Detect BMAD source type and extract metadata from a filesystem path
 */
export function detectBmadSource(sourcePath: string): BmadSourceInfo {
  const resolvedPath = path.resolve(sourcePath);

  // Check if path exists
  if (!fs.existsSync(resolvedPath)) {
    return {
      isValid: false,
      type: 'unknown',
      path: resolvedPath,
      error: `Path does not exist: ${resolvedPath}`,
    };
  }

  // Check if path is a directory
  const stats = fs.statSync(resolvedPath);
  if (!stats.isDirectory()) {
    return {
      isValid: false,
      type: 'unknown',
      path: resolvedPath,
      error: `Path is not a directory: ${resolvedPath}`,
    };
  }

  // Try v6 detection first (bmad/_cfg/manifest.yaml or bmad/_cfg/agent-manifest.csv)
  const v6Result = detectV6Structure(resolvedPath);
  if (v6Result.isValid) {
    return v6Result;
  }

  // If v6 structure was found but invalid, return that error (don't try v4)
  // v6 is indicated by presence of _cfg directory
  const hasCfgDir = fs.existsSync(path.join(resolvedPath, '_cfg'));
  if (hasCfgDir && !v6Result.isValid) {
    return v6Result;
  }

  // Try v4 detection (install-manifest.yaml)
  const v4Result = detectV4Structure(resolvedPath);
  if (v4Result.isValid) {
    return v4Result;
  }

  // No valid BMAD structure found
  return {
    isValid: false,
    type: 'unknown',
    path: resolvedPath,
    error: 'No BMAD manifest found (tried v6 and v4 detection)',
  };
}

/**
 * Detect v6 BMAD structure (bmad/_cfg/manifest.yaml or agent-manifest.csv)
 */
function detectV6Structure(sourcePath: string): BmadSourceInfo {
  const cfgDir = path.join(sourcePath, '_cfg');
  const manifestPath = path.join(cfgDir, 'manifest.yaml');
  const agentManifestPath = path.join(cfgDir, 'agent-manifest.csv');
  const workflowManifestPath = path.join(cfgDir, 'workflow-manifest.csv');

  // Check if _cfg directory exists
  const hasCfgDir = fs.existsSync(cfgDir);
  if (!hasCfgDir) {
    return {
      isValid: false,
      type: 'unknown',
      path: sourcePath,
      error: '_cfg directory not found',
    };
  }

  // Try to load manifest.yaml
  let manifestData: any = null;
  let manifestError: string | undefined;
  if (fs.existsSync(manifestPath)) {
    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      manifestData = yaml.load(content) as any;
    } catch (error) {
      manifestError = `Failed to parse manifest.yaml: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  // Check if agent-manifest.csv exists (alternative v6 indicator)
  const hasAgentManifest = fs.existsSync(agentManifestPath);

  // Must have either manifest.yaml or agent-manifest.csv to be v6
  if (!manifestData && !hasAgentManifest) {
    return {
      isValid: false,
      type: 'unknown',
      path: sourcePath,
      error:
        manifestError ||
        'No v6 manifest found (manifest.yaml or agent-manifest.csv)',
    };
  }

  // If we have a manifest error but also have agent-manifest.csv, return the error
  if (manifestError && !hasAgentManifest) {
    return {
      isValid: false,
      type: 'unknown',
      path: sourcePath,
      error: manifestError,
    };
  }

  // Extract version information
  let version: string | undefined;
  let versionParts:
    | { major: number; minor: number; patch: number; prerelease?: string }
    | undefined;

  if (manifestData?.installation?.version) {
    version = manifestData.installation.version;
    if (version) {
      versionParts = parseVersion(version);
    }
  }

  // Validate version exists if we have manifest.yaml
  if (manifestData && !version) {
    return {
      isValid: false,
      type: 'unknown',
      path: sourcePath,
      error: 'Missing version field in manifest',
    };
  }

  // Extract modules
  const modules: string[] = [];
  if (manifestData?.modules && Array.isArray(manifestData.modules)) {
    for (const module of manifestData.modules) {
      if (module.name) {
        modules.push(module.name);
      }
    }
  }

  // Extract configured IDEs
  const configuredIdes: string[] = [];
  if (manifestData?.ides && Array.isArray(manifestData.ides)) {
    configuredIdes.push(...manifestData.ides);
  }

  return {
    isValid: true,
    type: 'v6',
    path: sourcePath,
    version,
    versionMajor: versionParts?.major,
    versionMinor: versionParts?.minor,
    versionPatch: versionParts?.patch,
    versionPrerelease: versionParts?.prerelease,
    manifestPath,
    agentManifestPath: hasAgentManifest ? agentManifestPath : undefined,
    workflowManifestPath: fs.existsSync(workflowManifestPath)
      ? workflowManifestPath
      : undefined,
    modules: modules.length > 0 ? modules : undefined,
    installDate: manifestData?.installation?.installDate,
    configuredIdes: configuredIdes.length > 0 ? configuredIdes : undefined,
  };
}

/**
 * Detect v4 BMAD structure (install-manifest.yaml in dotfolder)
 */
function detectV4Structure(sourcePath: string): BmadSourceInfo {
  // Support passing .bmad or .bmad-core directly, or their parent directory.
  // Also support legacy layouts where files are directly in the given directory.
  let coreDir: string | undefined;
  const base = path.basename(sourcePath);

  // Direct .bmad or .bmad-core folder
  if (
    (base === '.bmad' || base === '.bmad-core') &&
    fs.statSync(sourcePath).isDirectory()
  ) {
    coreDir = sourcePath;
  } else if (
    fs.existsSync(path.join(sourcePath, '.bmad')) &&
    fs.statSync(path.join(sourcePath, '.bmad')).isDirectory()
  ) {
    coreDir = path.join(sourcePath, '.bmad');
  } else if (
    fs.existsSync(path.join(sourcePath, '.bmad-core')) &&
    fs.statSync(path.join(sourcePath, '.bmad-core')).isDirectory()
  ) {
    coreDir = path.join(sourcePath, '.bmad-core');
  } else {
    // Fallback: treat the provided directory as the core dir if it contains v4 files
    const hasInstall = fs.existsSync(
      path.join(sourcePath, 'install-manifest.yaml'),
    );
    const hasCoreConfig = fs.existsSync(
      path.join(sourcePath, 'core-config.yaml'),
    );
    if (hasInstall || hasCoreConfig) {
      coreDir = sourcePath;
    }
  }

  if (!coreDir) {
    return {
      isValid: false,
      type: 'unknown',
      path: sourcePath,
      error:
        'No v4 markers found (.bmad/, .bmad-core/, core-config.yaml, or install-manifest.yaml)',
    };
  }

  const coreConfigPath = path.join(coreDir, 'core-config.yaml');
  const manifestPath = path.join(coreDir, 'install-manifest.yaml');

  // Load core-config first (preferred for version confirmation)
  let coreConfig: any | undefined;
  if (fs.existsSync(coreConfigPath)) {
    try {
      const content = fs.readFileSync(coreConfigPath, 'utf-8');
      coreConfig = yaml.load(content) as any;
    } catch (error) {
      // Non-fatal: continue and fall back to install-manifest.yaml for version
    }
  }

  // Load install-manifest for expansion packs and fallback version
  let manifestData: any | undefined;
  if (fs.existsSync(manifestPath)) {
    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      manifestData = yaml.load(content) as any;
    } catch (error) {
      return {
        isValid: false,
        type: 'unknown',
        path: coreDir,
        error: `Failed to parse install-manifest.yaml: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  // Confirm installation: at least core-config.yaml OR install-manifest.yaml must exist
  if (!coreConfig && !manifestData) {
    return {
      isValid: false,
      type: 'unknown',
      path: coreDir,
      error: 'Neither core-config.yaml nor install-manifest.yaml found',
    };
  }

  // Version: prefer core-config.yaml, fall back to install-manifest.yaml
  const version =
    (coreConfig?.version as string) ?? (manifestData?.version as string);
  if (!version) {
    return {
      isValid: false,
      type: 'unknown',
      path: coreDir,
      error: 'Missing version in core-config.yaml or install-manifest.yaml',
    };
  }

  const versionParts = parseVersion(version);

  // Extract expansion packs from install-manifest.yaml when present
  let expansionPacks: string[] | undefined;
  if (
    manifestData?.expansion_packs !== undefined &&
    Array.isArray(manifestData.expansion_packs)
  ) {
    expansionPacks = manifestData.expansion_packs;
  }

  // Determine agent and workflow directories inside the dotfolder
  const agentDir = path.join(coreDir, 'agents');
  const workflowDir = path.join(coreDir, 'workflows');

  return {
    isValid: true,
    type: 'v4',
    path: coreDir,
    version,
    versionMajor: versionParts?.major,
    versionMinor: versionParts?.minor,
    versionPatch: versionParts?.patch,
    versionPrerelease: versionParts?.prerelease,
    manifestPath: fs.existsSync(manifestPath) ? manifestPath : undefined,
    agentDir: fs.existsSync(agentDir) ? agentDir : undefined,
    workflowDir: fs.existsSync(workflowDir) ? workflowDir : undefined,
    expansionPacks,
    installDate: manifestData?.installed_at,
    installType: manifestData?.install_type,
  };
}

/**
 * Parse semantic version string (e.g., "6.0.0-alpha.0" or "4.44.1")
 */
function parseVersion(
  version: string,
):
  | { major: number; minor: number; patch: number; prerelease?: string }
  | undefined {
  // Match semantic version pattern: major.minor.patch[-prerelease]
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) {
    return undefined;
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
  };
}
