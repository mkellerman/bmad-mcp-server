/**
 * Manifest Cache for BMAD MCP Server
 *
 * Orchestrates manifest generation, loading, and merging across multiple bmad_roots.
 * Uses BMAD-METHOD's ManifestGenerator for generation, implements multi-source
 * deduplication with priority-based resolution.
 *
 * @remarks
 * This is the primary integration point between bmad-mcp-server and BMAD-METHOD's
 * ManifestGenerator. It provides:
 * - Per-root manifest generation
 * - Multi-source manifest loading and merging
 * - Priority-based deduplication (project > user > git)
 * - Caching with staleness detection
 * - Graceful error handling
 */

import * as fse from 'fs-extra';
import { join } from 'node:path';
import { parse as parseCsv } from 'csv-parse/sync';
import type { ResourceLoaderGit, AgentMetadata } from './resource-loader.js';

/**
 * Workflow metadata structure
 */
export interface Workflow {
  name: string;
  description: string;
  module: string;
  path: string;
  trigger?: string;
  standalone: boolean;
}

/**
 * File entry from files-manifest.csv
 */
export interface FileEntry {
  type: string; // File extension (md, yaml, xml, etc.)
  name: string; // Filename without extension
  module: string; // Module name
  path: string; // Relative path from workspace root
  hash: string; // SHA256 hash
}

/**
 * Manifest source with priority
 */
interface ManifestSource {
  root: string; // Absolute path to bmad_root
  priority: number; // Lower = higher priority (1 = highest)
  type: 'project' | 'user' | 'git';
}

/**
 * Cached manifest data
 */
interface CachedManifests {
  agents: AgentMetadata[];
  workflows: Workflow[];
  files: FileEntry[];
  timestamp: number;
}

/**
 * ManifestCache orchestrates manifest generation and merging
 *
 * @remarks
 * Primary responsibilities:
 * 1. Generate manifests per bmad_root using ManifestGenerator
 * 2. Load and cache manifests from disk
 * 3. Merge manifests from multiple sources with priority
 * 4. Deduplicate by name+module, keeping highest priority
 */
export class ManifestCache {
  private resourceLoader: ResourceLoaderGit;
  private cache: Map<string, CachedManifests>;
  private manifestTTL: number;

  /**
   * Create a new ManifestCache
   *
   * @param resourceLoader - ResourceLoaderGit instance for path resolution
   */
  constructor(resourceLoader: ResourceLoaderGit) {
    this.resourceLoader = resourceLoader;
    this.cache = new Map();
    this.manifestTTL = parseInt(process.env.BMAD_MANIFEST_TTL || '300000', 10); // 5 minutes default
  }

  /**
   * Get all agents from all sources, merged with priority
   *
   * @returns Promise resolving to deduplicated agent list
   */
  async getAllAgents(): Promise<AgentMetadata[]> {
    const sources = await this.getSources();
    const allAgents: Array<AgentMetadata & { _priority: number }> = [];

    for (const source of sources) {
      await this.ensureManifests(source.root);
      const manifests = await this.loadManifests(source.root);

      for (const agent of manifests.agents) {
        allAgents.push({ ...agent, _priority: source.priority });
      }
    }

    return this.deduplicateByPriority(
      allAgents,
      (agent) => `${agent.module || 'core'}:${agent.name}`,
    );
  }

  /**
   * Get all workflows from all sources, merged with priority
   *
   * @returns Promise resolving to deduplicated workflow list
   */
  async getAllWorkflows(): Promise<Workflow[]> {
    const sources = await this.getSources();
    const allWorkflows: Array<Workflow & { _priority: number }> = [];

    for (const source of sources) {
      await this.ensureManifests(source.root);
      const manifests = await this.loadManifests(source.root);

      for (const workflow of manifests.workflows) {
        allWorkflows.push({ ...workflow, _priority: source.priority });
      }
    }

    return this.deduplicateByPriority(
      allWorkflows,
      (workflow) => `${workflow.module}:${workflow.name}`,
    );
  }

  /**
   * Get all files from all sources (for integrity checking)
   *
   * @returns Promise resolving to all file entries
   */
  async getAllFiles(): Promise<FileEntry[]> {
    const sources = await this.getSources();
    const allFiles: FileEntry[] = [];

    for (const source of sources) {
      await this.ensureManifests(source.root);
      const manifests = await this.loadManifests(source.root);
      allFiles.push(...manifests.files);
    }

    return allFiles;
  }

  /**
   * Clear in-memory cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Force regeneration of manifests for a specific root
   *
   * @param bmadRoot - Path to bmad_root to regenerate
   */
  async regenerate(bmadRoot: string): Promise<void> {
    this.cache.delete(bmadRoot);
    await this.generateManifests(bmadRoot);
  }

  /**
   * Set cache TTL
   *
   * @param milliseconds - TTL in milliseconds
   */
  setTTL(milliseconds: number): void {
    this.manifestTTL = milliseconds;
  }

  /**
   * Ensure manifests exist and are fresh for a bmad_root
   *
   * @param bmadRoot - Path to check
   */
  private async ensureManifests(bmadRoot: string): Promise<void> {
    // Check if in-memory cache is fresh
    if (this.isCacheFresh(bmadRoot)) {
      return;
    }

    // Check if disk manifests are fresh
    const manifestPath = join(bmadRoot, '_cfg', 'manifest.yaml');
    if (await this.isManifestFresh(manifestPath)) {
      return;
    }

    // Generate new manifests
    await this.generateManifests(bmadRoot);
  }

  /**
   * Generate manifests for a bmad_root using ManifestGenerator
   *
   * @param bmadRoot - Path to bmad_root
   */
  private async generateManifests(bmadRoot: string): Promise<void> {
    // Import ManifestGenerator dynamically to avoid startup cost
    const { ManifestGenerator } = await import(
      'bmad-method/tools/cli/installers/lib/core/manifest-generator.js'
    );

    const generator = new ManifestGenerator();

    // Detect modules in this root
    const modules = await this.detectModules(bmadRoot);

    // Build complete file list
    const files = await this.walkDirectory(bmadRoot);

    // Generate manifests
    await generator.generateManifests(bmadRoot, modules, files, {
      ides: [],
      preservedModules: [],
    });
  }

  /**
   * Load manifests from disk and cache them
   *
   * @param bmadRoot - Path to bmad_root
   * @returns Cached manifests
   */
  private async loadManifests(bmadRoot: string): Promise<CachedManifests> {
    const cached = this.cache.get(bmadRoot);
    if (cached && this.isCacheFresh(bmadRoot)) {
      return cached;
    }

    const cfgDir = join(bmadRoot, '_cfg');

    const manifests: CachedManifests = {
      agents: await this.loadAgentManifest(cfgDir),
      workflows: await this.loadWorkflowManifest(cfgDir),
      files: await this.loadFilesManifest(cfgDir),
      timestamp: Date.now(),
    };

    this.cache.set(bmadRoot, manifests);
    return manifests;
  }

  /**
   * Load and parse agent-manifest.csv
   *
   * @param cfgDir - Path to _cfg directory
   * @returns Array of agent metadata
   */
  private async loadAgentManifest(cfgDir: string): Promise<AgentMetadata[]> {
    const csvPath = join(cfgDir, 'agent-manifest.csv');

    if (!(await fse.pathExists(csvPath))) {
      return [];
    }

    const content = await fse.readFile(csvPath, 'utf-8');
    const records: Array<Record<string, string>> = parseCsv(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    return records.map((record) => ({
      name: record.name || '',
      displayName: record.displayName || record.name || '',
      title: record.title || record.name || '',
      icon: record.icon,
      role: record.role,
      description: record.identity, // identity maps to description
      communicationStyle: record.communicationStyle,
      principles: record.principles,
      module: record.module,
    }));
  }

  /**
   * Load and parse workflow-manifest.csv
   *
   * @param cfgDir - Path to _cfg directory
   * @returns Array of workflows
   */
  private async loadWorkflowManifest(cfgDir: string): Promise<Workflow[]> {
    const csvPath = join(cfgDir, 'workflow-manifest.csv');

    if (!(await fse.pathExists(csvPath))) {
      return [];
    }

    const content = await fse.readFile(csvPath, 'utf-8');
    const records: Array<Record<string, string>> = parseCsv(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    return records.map((record) => ({
      name: record.name || '',
      description: record.description || '',
      module: record.module || 'unknown',
      path: record.path || '',
      ...(record.trigger && { trigger: record.trigger }),
      standalone: record.standalone?.toLowerCase() === 'true',
    }));
  }

  /**
   * Load and parse files-manifest.csv
   *
   * @param cfgDir - Path to _cfg directory
   * @returns Array of file entries
   */
  private async loadFilesManifest(cfgDir: string): Promise<FileEntry[]> {
    const csvPath = join(cfgDir, 'files-manifest.csv');

    if (!(await fse.pathExists(csvPath))) {
      return [];
    }

    const content = await fse.readFile(csvPath, 'utf-8');
    const records: Array<Record<string, string>> = parseCsv(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    return records.map((record) => ({
      type: record.type || '',
      name: record.name || '',
      module: record.module || '',
      path: record.path || '',
      hash: record.hash || '',
    }));
  }

  /**
   * Deduplicate items by key, keeping highest priority (lowest number)
   *
   * @param items - Items with _priority field
   * @param keyFn - Function to extract unique key from item
   * @returns Deduplicated items (without _priority field)
   */
  private deduplicateByPriority<T>(
    items: Array<T & { _priority: number }>,
    keyFn: (item: T) => string,
  ): T[] {
    const map = new Map<string, T & { _priority: number }>();

    for (const item of items) {
      const key = keyFn(item);
      const existing = map.get(key);

      // Keep item with lower priority number (higher priority)
      if (!existing || item._priority < existing._priority) {
        map.set(key, item);
      }
    }

    // Remove internal _priority field
    return Array.from(map.values()).map(({ _priority, ...item }) => item as T);
  }

  /**
   * Get all bmad_root sources with priority order
   *
   * @returns Array of manifest sources
   */
  private async getSources(): Promise<ManifestSource[]> {
    const sources: ManifestSource[] = [];

    // Project bmad (highest priority)
    const projectPathInfo = this.resourceLoader['getProjectBmadPath']();
    sources.push({
      root: projectPathInfo.bmadRoot,
      priority: 1,
      type: 'project',
    });

    // User bmad
    const userBmad = this.resourceLoader.getPaths().userBmad;
    if (await fse.pathExists(userBmad)) {
      sources.push({
        root: userBmad,
        priority: 2,
        type: 'user',
      });
    }

    // Git remotes (lowest priority)
    const gitPaths = this.resourceLoader.getResolvedGitPaths();
    let gitPriority = 3;
    for (const [_url, localPath] of gitPaths) {
      const pathInfo = this.resourceLoader['detectPathType'](localPath);
      sources.push({
        root: pathInfo.bmadRoot,
        priority: gitPriority++,
        type: 'git',
      });
    }

    return sources;
  }

  /**
   * Auto-detect modules in a bmad_root
   *
   * @param bmadRoot - Path to bmad_root
   * @returns Array of module names
   */
  private async detectModules(bmadRoot: string): Promise<string[]> {
    const modules: string[] = [];

    if (!(await fse.pathExists(bmadRoot))) {
      return modules;
    }

    const entries = await fse.readdir(bmadRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'core' || entry.name === '_cfg') continue;

      const entryPath = join(bmadRoot, entry.name);
      const hasAgents = await fse.pathExists(join(entryPath, 'agents'));
      const hasWorkflows = await fse.pathExists(join(entryPath, 'workflows'));
      const hasTasks = await fse.pathExists(join(entryPath, 'tasks'));

      if (hasAgents || hasWorkflows || hasTasks) {
        modules.push(entry.name);
      }
    }

    return modules;
  }

  /**
   * Recursively walk directory and collect all file paths
   *
   * @param bmadRoot - Root directory to walk
   * @returns Array of absolute file paths
   */
  private async walkDirectory(bmadRoot: string): Promise<string[]> {
    const files: string[] = [];

    const walk = async (dir: string): Promise<void> => {
      if (!(await fse.pathExists(dir))) {
        return;
      }

      const entries = await fse.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        // Skip excluded directories
        if (entry.isDirectory()) {
          if (['node_modules', '.git', 'cache'].includes(entry.name)) {
            continue;
          }
          await walk(fullPath);
        } else {
          // Skip hidden files
          if (!entry.name.startsWith('.')) {
            files.push(fullPath);
          }
        }
      }
    };

    await walk(bmadRoot);
    return files;
  }

  /**
   * Check if cached manifests are still fresh
   *
   * @param bmadRoot - Path to bmad_root
   * @returns true if cache is fresh
   */
  private isCacheFresh(bmadRoot: string): boolean {
    const cached = this.cache.get(bmadRoot);
    if (!cached) return false;

    const age = Date.now() - cached.timestamp;
    return age < this.manifestTTL;
  }

  /**
   * Check if manifest file is fresh (within TTL)
   *
   * @param manifestPath - Path to manifest.yaml
   * @returns true if manifest is fresh
   */
  private async isManifestFresh(manifestPath: string): Promise<boolean> {
    try {
      if (!(await fse.pathExists(manifestPath))) {
        return false;
      }

      const stats = await fse.stat(manifestPath);
      const age = Date.now() - stats.mtimeMs;
      return age < this.manifestTTL;
    } catch {
      return false;
    }
  }
}
