/**
 * Remote Manifest Cache
 *
 * Builds and caches agent/workflow manifests for remote repositories.
 * This allows fast fuzzy searching without rescanning the filesystem.
 *
 * Cache Strategy:
 * - Build manifest once when remote is cloned/pulled
 * - Store as JSON alongside git cache
 * - Invalidate when git commit changes
 * - Use for fast fuzzy searches
 */

import {
  existsSync,
  readFileSync,
  statSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
} from 'node:fs';
import path from 'node:path';
import { buildMasterManifests } from './master-manifest.js';
import { masterRecordToAgent } from './master-manifest-adapter.js';
import type { BmadOrigin } from '../types/index.js';
import logger from './logger.js';

/**
 * Cached agent metadata
 */
export interface CachedAgent {
  name: string;
  displayName?: string;
  title?: string;
  description?: string;
  path: string;
  moduleName: string;
}

/**
 * Cached workflow metadata
 */
export interface CachedWorkflow {
  name: string;
  displayName?: string;
  description?: string;
  path: string;
  moduleName: string;
}

/**
 * Remote manifest containing all discovered resources
 */
export interface RemoteManifest {
  version: string; // Manifest format version
  gitCommit: string; // Git commit SHA when manifest was built
  buildTime: string; // ISO timestamp
  repoPath: string; // Path to cached repository
  agents: CachedAgent[];
  workflows: CachedWorkflow[];
}

/**
 * Build a manifest from a remote repository
 *
 * Scans the repository structure and builds a complete manifest
 * of all agents and workflows using the master manifest system.
 *
 * @param repoPath - Absolute path to cached repository
 * @param gitCommit - Current git commit SHA
 * @returns Built manifest
 */
export function buildRemoteManifest(
  repoPath: string,
  gitCommit: string,
): RemoteManifest {
  logger.debug(`Building manifest for ${repoPath} (commit: ${gitCommit})`);

  const origins: BmadOrigin[] = [];
  let priority = 1;

  // Check repository structure (marketplace vs flat)
  const agentsDir = path.join(repoPath, 'agents');
  let isMarketplace = false;

  if (existsSync(agentsDir) && statSync(agentsDir).isDirectory()) {
    const agentEntries = readdirSync(agentsDir, { withFileTypes: true });
    const hasSubdirs = agentEntries.some(
      (e) => e.isDirectory() && !e.name.startsWith('.'),
    );
    const hasAgentFiles = agentEntries.some(
      (e) =>
        e.isFile() &&
        e.name.endsWith('.md') &&
        e.name.toLowerCase() !== 'readme.md',
    );

    isMarketplace = hasSubdirs && !hasAgentFiles;
  }

  if (isMarketplace) {
    // Marketplace structure: scan modules/* and agents/* subdirectories
    const modulesDir = path.join(repoPath, 'modules');
    if (existsSync(modulesDir) && statSync(modulesDir).isDirectory()) {
      const moduleEntries = readdirSync(modulesDir, { withFileTypes: true });
      for (const entry of moduleEntries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const modulePath = path.join(modulesDir, entry.name);
          origins.push({
            kind: 'cli' as const,
            root: modulePath,
            version: 'unknown',
            displayName: `modules/${entry.name}`,
            manifestDir: path.join(modulePath, '_cfg'),
            priority: priority++,
          });
        }
      }
    }

    // Scan agents/* subdirectories
    const agentEntries = readdirSync(agentsDir, { withFileTypes: true });
    for (const entry of agentEntries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const modulePath = path.join(agentsDir, entry.name);
        origins.push({
          kind: 'cli' as const,
          root: modulePath,
          version: 'unknown',
          displayName: `agents/${entry.name}`,
          manifestDir: path.join(modulePath, '_cfg'),
          priority: priority++,
        });
      }
    }
  } else {
    // Flat structure: treat repo root as single BMAD installation
    origins.push({
      kind: 'cli' as const,
      root: repoPath,
      version: 'unknown',
      displayName: path.basename(repoPath),
      manifestDir: path.join(repoPath, '_cfg'),
      priority: 1,
    });
  }

  // Build master manifests from all discovered module roots
  const masterData = buildMasterManifests(origins);

  // Convert to cached format with module names
  const agents: CachedAgent[] = masterData.agents
    .filter((record) => record.exists)
    .map((record) => {
      const agentData = masterRecordToAgent(record, true);
      const moduleName = extractModuleName(record.absolutePath, repoPath);
      return {
        name: agentData.name,
        displayName: agentData.displayName,
        title: agentData.title,
        description: agentData.title,
        path: record.absolutePath,
        moduleName,
      };
    })
    .filter((agent) => agent.name);

  const workflows: CachedWorkflow[] = masterData.workflows
    .filter((record) => record.exists)
    .map((record) => {
      const moduleName = extractModuleName(record.absolutePath, repoPath);
      return {
        name: path.basename(record.absolutePath, '.yaml'),
        path: record.absolutePath,
        moduleName,
      };
    });

  return {
    version: '1.0',
    gitCommit,
    buildTime: new Date().toISOString(),
    repoPath,
    agents: agents.sort((a, b) => a.name.localeCompare(b.name)),
    workflows: workflows.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/**
 * Extract module name from agent/workflow path
 *
 * Examples:
 * - /cache/awesome-bmad-agents/agents/debug-diana-v6/agents/debug.md → debug-diana-v6
 * - /cache/awesome-bmad-agents/modules/core/agents/analyst.md → core
 * - /cache/simple-repo/agents/test.md → simple-repo
 *
 * @param absolutePath - Absolute path to agent/workflow file
 * @param repoPath - Repository root path
 * @returns Module name
 */
function extractModuleName(absolutePath: string, repoPath: string): string {
  const relativePath = path.relative(repoPath, absolutePath);
  const parts = relativePath.split(path.sep);

  // Marketplace structure: agents/MODULE/... or modules/MODULE/...
  if (parts.length >= 2 && (parts[0] === 'agents' || parts[0] === 'modules')) {
    return parts[1];
  }

  // Flat structure: use repo name
  return path.basename(repoPath);
}

/**
 * Get manifest cache file path for a repository
 *
 * @param repoPath - Path to cached repository
 * @returns Path to manifest JSON file
 */
function getManifestPath(repoPath: string): string {
  return path.join(repoPath, '.bmad-manifest.json');
}

/**
 * Load cached manifest for a repository
 *
 * @param repoPath - Path to cached repository
 * @returns Cached manifest or null if not found/invalid
 */
export function loadManifest(repoPath: string): RemoteManifest | null {
  const manifestPath = getManifestPath(repoPath);

  if (!existsSync(manifestPath)) {
    logger.debug(`No cached manifest found at ${manifestPath}`);
    return null;
  }

  try {
    const content = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content) as RemoteManifest;

    // Validate manifest format
    if (!manifest.version || !manifest.agents || !manifest.workflows) {
      logger.warn(`Invalid manifest format at ${manifestPath}`);
      return null;
    }

    logger.debug(
      `Loaded manifest: ${manifest.agents.length} agents, ${manifest.workflows.length} workflows`,
    );
    return manifest;
  } catch (error) {
    logger.error(`Failed to load manifest from ${manifestPath}:`, error);
    return null;
  }
}

/**
 * Save manifest to cache
 *
 * @param manifest - Manifest to save
 */
export function saveManifest(manifest: RemoteManifest): void {
  const manifestPath = getManifestPath(manifest.repoPath);

  try {
    // Ensure directory exists
    const dir = path.dirname(manifestPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Write manifest with pretty formatting
    const content = JSON.stringify(manifest, null, 2);
    writeFileSync(manifestPath, content, 'utf-8');

    logger.debug(
      `Saved manifest to ${manifestPath} (${manifest.agents.length} agents, ${manifest.workflows.length} workflows)`,
    );
  } catch (error) {
    logger.error(`Failed to save manifest to ${manifestPath}:`, error);
    throw error;
  }
}

/**
 * Get or build manifest for a repository
 *
 * Loads cached manifest if valid (matching git commit),
 * otherwise builds a new one and caches it.
 *
 * @param repoPath - Path to cached repository
 * @param gitCommit - Current git commit SHA
 * @returns Manifest (from cache or freshly built)
 */
export function getOrBuildManifest(
  repoPath: string,
  gitCommit: string,
): RemoteManifest {
  // Try loading cached manifest
  const cached = loadManifest(repoPath);

  if (cached && cached.gitCommit === gitCommit) {
    logger.debug(
      `Using cached manifest for ${path.basename(repoPath)} (commit match)`,
    );
    return cached;
  }

  if (cached) {
    logger.debug(
      `Cached manifest outdated (commit ${cached.gitCommit} → ${gitCommit}), rebuilding...`,
    );
  }

  // Build new manifest
  const manifest = buildRemoteManifest(repoPath, gitCommit);
  saveManifest(manifest);

  return manifest;
}

/**
 * Invalidate cached manifest for a repository
 *
 * @param repoPath - Path to cached repository
 */
export function invalidateManifest(repoPath: string): void {
  const manifestPath = getManifestPath(repoPath);

  if (existsSync(manifestPath)) {
    try {
      // Delete manifest file
      unlinkSync(manifestPath);
      logger.debug(`Invalidated manifest at ${manifestPath}`);
    } catch (error) {
      logger.error(`Failed to invalidate manifest at ${manifestPath}:`, error);
    }
  }
}
