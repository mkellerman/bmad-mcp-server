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

import { pathExists } from 'fs-extra';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { parse as parseCsv } from 'csv-parse/sync';
import type { ResourceLoaderGit, AgentMetadata } from './resource-loader.js';
import type { Tool, Task } from '../types/index.js';

/**
 * Directories to exclude when scanning for BMAD modules
 */
const EXCLUDED_DIRECTORIES = new Set([
  '.git',
  '.github',
  '.vscode',
  '.idea',
  'node_modules',
  'dist',
  'build',
  'out',
  'target',
  'cache',
  '.cache',
  'tmp',
  '.tmp',
  'temp',
  '.temp',
  'logs',
  '.logs',
  'coverage',
  '.nyc_output',
  '__pycache__',
  '.pytest_cache',
  '.tox',
  'venv',
  '.venv',
  'virtualenv',
  '.DS_Store',
]);

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
 * Re-export Tool and Task types from types module
 */
export type { Tool, Task } from '../types/index.js';

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
  tools: Tool[];
  tasks: Task[];
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
  private cacheDir: string;
  private cachedSources: ManifestSource[] | null = null;
  private sourcesPromise: Promise<ManifestSource[]> | null = null;

  /**
   * Create a new ManifestCache
   *
   * @param resourceLoader - ResourceLoaderGit instance for path resolution
   */
  constructor(resourceLoader: ResourceLoaderGit) {
    this.resourceLoader = resourceLoader;
    this.cache = new Map();
    this.manifestTTL = parseInt(process.env.BMAD_MANIFEST_TTL || '300000', 10); // 5 minutes default
    this.cacheDir = join(homedir(), '.bmad', 'cache', 'manifests');
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

      // Enrich agents with workflow information from XML
      const enrichedAgents = await this.enrichAgentsWithWorkflows(
        manifests.agents,
        source.root,
      );

      for (const agent of enrichedAgents) {
        allAgents.push({ ...agent, _priority: source.priority });
      }
    }

    const deduplicated = this.deduplicateByPriority(
      allAgents,
      (agent) => `${agent.module || 'core'}:${agent.name}`,
    );

    // Write merged results to cache for visibility
    await this.writeMergedManifests({ agents: deduplicated });

    return deduplicated;
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

    const deduplicated = this.deduplicateByPriority(
      allWorkflows,
      (workflow) => `${workflow.module}:${workflow.name}`,
    );

    // Write merged results to cache for visibility
    await this.writeMergedManifests({ workflows: deduplicated });

    return deduplicated;
  }

  /**
   * Get all tools from all sources, merged with priority
   *
   * @returns Promise resolving to deduplicated tool list
   */
  async getAllTools(): Promise<Tool[]> {
    const sources = await this.getSources();
    const allTools: Array<Tool & { _priority: number }> = [];

    for (const source of sources) {
      await this.ensureManifests(source.root);
      const manifests = await this.loadManifests(source.root);

      for (const tool of manifests.tools) {
        allTools.push({ ...tool, _priority: source.priority });
      }
    }

    const deduplicated = this.deduplicateByPriority(
      allTools,
      (tool) => `${tool.module}:${tool.name}`,
    );

    // Write merged results to cache for visibility
    await this.writeMergedManifests({ tools: deduplicated });

    return deduplicated;
  }

  /**
   * Get all tasks from all sources, merged with priority
   *
   * @returns Promise resolving to deduplicated task list
   */
  async getAllTasks(): Promise<Task[]> {
    const sources = await this.getSources();
    const allTasks: Array<Task & { _priority: number }> = [];

    for (const source of sources) {
      await this.ensureManifests(source.root);
      const manifests = await this.loadManifests(source.root);

      for (const task of manifests.tasks) {
        allTasks.push({ ...task, _priority: source.priority });
      }
    }

    const deduplicated = this.deduplicateByPriority(
      allTasks,
      (task) => `${task.module}:${task.name}`,
    );

    // Write merged results to cache for visibility
    await this.writeMergedManifests({ tasks: deduplicated });

    return deduplicated;
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
    this.cachedSources = null;
    this.sourcesPromise = null;
  }

  /**
   * Get the count of loaded sources
   *
   * @returns Number of sources (project, user, git remotes)
   */
  async getSourceCount(): Promise<number> {
    const sources = await this.getSources();
    return sources.length;
  }

  /**
   * Get unique module names from all loaded agents and workflows
   *
   * @returns Array of unique module names
   */
  async getModuleNames(): Promise<string[]> {
    const sources = await this.getSources();
    const moduleSet = new Set<string>();

    for (const source of sources) {
      await this.ensureManifests(source.root);
      const modules = await this.detectModules(source.root);

      // Add 'core' if it exists
      const coreExists = await pathExists(join(source.root, 'core'));
      if (coreExists) {
        moduleSet.add('core');
      }

      // Add detected modules
      modules.forEach((m) => moduleSet.add(m));
    }

    return Array.from(moduleSet).sort();
  }

  /**
   * Force regeneration of manifests for a specific root
   *
   * @param bmadRoot - Path to bmad_root to regenerate
```  /**
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
   * @param bmadRoot - Source path
   */
  private async ensureManifests(bmadRoot: string): Promise<void> {
    // Check if in-memory cache is fresh
    if (this.isCacheFresh(bmadRoot)) {
      return;
    }

    // Check if cached disk manifests are fresh
    const cacheDir = this.getCacheDir(bmadRoot);
    const manifestPath = join(cacheDir, '_cfg', 'manifest.yaml');
    if (await this.isManifestFresh(manifestPath)) {
      return;
    }

    // Check if source already has manifests (e.g., test fixtures, pre-built packages)
    // If manifests exist in source, copy them to cache instead of generating
    const sourceManifestPath = join(bmadRoot, '_cfg', 'manifest.yaml');
    if (await pathExists(sourceManifestPath)) {
      await this.copySourceManifestsToCache(bmadRoot);
      return;
    }

    // Generate new manifests to cache
    await this.generateManifests(bmadRoot);
  }

  /**
   * Generate manifests for a bmad_root using our local ManifestGenerator
   *
   * @param bmadRoot - Source path to scan for BMAD files
   */
  private async generateManifests(bmadRoot: string): Promise<void> {
    const { mkdir, symlink, rm } = await import('node:fs/promises');
    const { existsSync } = await import('node:fs');
    const pathModule = await import('node:path');
    const { fileURLToPath, pathToFileURL } = await import('node:url');

    // Import ManifestGenerator from bmad-method package dynamically
    // Resolve the package path and construct the correct generator path
    try {
      const pkgPath = import.meta.resolve('bmad-method');
      const pkgFile = fileURLToPath(pkgPath);
      const pkgRoot = pathModule.dirname(
        pathModule.dirname(pathModule.dirname(pkgFile)),
      ); // up 3 levels from tools/cli/bmad-cli.js
      const generatorPath = pathToFileURL(
        join(pkgRoot, 'tools/cli/installers/lib/core/manifest-generator.js'),
      ).href;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const module = await import(generatorPath);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-type-assertion
      const ManifestGenerator = (module as any).ManifestGenerator;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const generator = new ManifestGenerator();

      // Detect modules in the SOURCE
      const modules = await this.detectModules(bmadRoot);

      // Build complete file list from SOURCE
      const files = await this.walkDirectory(bmadRoot);

      // Get CACHE directory - this is where manifests will be written!
      const cacheDir = this.getCacheDir(bmadRoot);
      await mkdir(cacheDir, { recursive: true });

      // Handle flat module structure: if bmadRoot has agents/ at root level,
      // create a core symlink so ManifestGenerator can scan it properly
      const hasFlatStructure =
        existsSync(join(bmadRoot, 'agents')) ||
        existsSync(join(bmadRoot, 'workflows')) ||
        existsSync(join(bmadRoot, 'tasks'));

      let scanDir = bmadRoot;
      let tempCoreLink: string | null = null;

      if (hasFlatStructure && modules.length === 0) {
        // Create temporary directory with core symlink pointing to bmadRoot
        const { mkdtemp } = await import('node:fs/promises');
        const { tmpdir } = await import('node:os');
        const tempDir = await mkdtemp(join(tmpdir(), 'bmad-scan-'));
        tempCoreLink = join(tempDir, 'core');
        await symlink(bmadRoot, tempCoreLink, 'dir');
        scanDir = tempDir; // Scan temp dir that has core -> bmadRoot symlink
      }

      try {
        // Generate manifests directly to CACHE directory
        // ManifestGenerator will write to {cacheDir}/_cfg/
        // But it will SCAN from scanDir (source or temp with symlink)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await generator.generateManifests(cacheDir, modules, files, {
          ides: [],
          preservedModules: [],
          scanDir, // Scan source (or temp with core symlink)
          bmadRoot, // Original source path for manifest.yaml
        });
      } finally {
        // Cleanup temporary symlink if created
        if (tempCoreLink) {
          const tempDir = join(tempCoreLink, '..');
          await rm(tempDir, { recursive: true, force: true });
        }
      }
    } catch (error) {
      // If ManifestGenerator import or execution fails, log and throw
      console.error(`Failed to generate manifests for ${bmadRoot}:`, error);
      throw error;
    }
  }

  /**
   * Copy pre-existing manifests from source directory to cache
   * Used for test fixtures or pre-built BMAD packages that already have manifests
   *
   * @param bmadRoot - Source path containing _cfg/ directory with manifests
   */
  private async copySourceManifestsToCache(bmadRoot: string): Promise<void> {
    const { mkdir, copyFile } = await import('node:fs/promises');

    const sourceCfgDir = join(bmadRoot, '_cfg');
    const cacheDir = this.getCacheDir(bmadRoot);
    const cacheCfgDir = join(cacheDir, '_cfg');

    // Create cache _cfg directory
    await mkdir(cacheCfgDir, { recursive: true });

    // Copy all manifest files from source to cache
    const manifestFiles = [
      'manifest.yaml',
      'agent-manifest.csv',
      'workflow-manifest.csv',
      'tool-manifest.csv',
      'task-manifest.csv',
      'files-manifest.csv',
    ];

    for (const filename of manifestFiles) {
      const sourcePath = join(sourceCfgDir, filename);
      const cachePath = join(cacheCfgDir, filename);

      if (await pathExists(sourcePath)) {
        await copyFile(sourcePath, cachePath);
      }
    }
  }

  /**
   * Load manifests from disk and cache them
   *
   * @param bmadRoot - Source path (we read from cache, not source!)
   * @returns Cached manifests
   */
  private async loadManifests(bmadRoot: string): Promise<CachedManifests> {
    const cached = this.cache.get(bmadRoot);
    if (cached && this.isCacheFresh(bmadRoot)) {
      return cached;
    }

    // Read from CACHE directory, not source!
    const cacheDir = this.getCacheDir(bmadRoot);
    const cfgDir = join(cacheDir, '_cfg');

    const manifests: CachedManifests = {
      agents: await this.loadAgentManifest(cfgDir),
      workflows: await this.loadWorkflowManifest(cfgDir),
      tools: await this.loadToolsManifest(cfgDir),
      tasks: await this.loadTasksManifest(cfgDir),
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

    if (!(await pathExists(csvPath))) {
      return [];
    }

    const content = await readFile(csvPath, 'utf-8');
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

    if (!(await pathExists(csvPath))) {
      return [];
    }

    const content = await readFile(csvPath, 'utf-8');
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

    if (!(await pathExists(csvPath))) {
      return [];
    }

    const content = await readFile(csvPath, 'utf-8');
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
   * Load and parse tool-manifest.csv
   *
   * @param cfgDir - Path to _cfg directory
   * @returns Array of tools
   */
  private async loadToolsManifest(cfgDir: string): Promise<Tool[]> {
    const csvPath = join(cfgDir, 'tool-manifest.csv');

    if (!(await pathExists(csvPath))) {
      return [];
    }

    const content = await readFile(csvPath, 'utf-8');
    const records: Array<Record<string, string>> = parseCsv(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    return records.map((record) => ({
      name: record.name || '',
      displayName: record.displayName || record.name || '',
      description: record.description || '',
      module: record.module || 'unknown',
      path: record.path || '',
      standalone: record.standalone?.toLowerCase() === 'true',
    }));
  }

  /**
   * Load and parse task-manifest.csv
   *
   * @param cfgDir - Path to _cfg directory
   * @returns Array of tasks
   */
  private async loadTasksManifest(cfgDir: string): Promise<Task[]> {
    const csvPath = join(cfgDir, 'task-manifest.csv');

    if (!(await pathExists(csvPath))) {
      return [];
    }

    const content = await readFile(csvPath, 'utf-8');
    const records: Array<Record<string, string>> = parseCsv(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    return records.map((record) => ({
      name: record.name || '',
      displayName: record.displayName || record.name || '',
      description: record.description || '',
      module: record.module || 'unknown',
      path: record.path || '',
      standalone: record.standalone?.toLowerCase() === 'true',
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
   * Enrich agent metadata with workflow information from XML files
   *
   * @param agents - Agent metadata from manifest
   * @returns Enriched agent metadata with workflow info
   */
  private async enrichAgentsWithWorkflows(
    agents: AgentMetadata[],
    _bmadRoot: string,
  ): Promise<AgentMetadata[]> {
    // Use resource loader to get agent metadata with full XML parsing
    // This will extract workflow information from menu items
    const enrichedAgents = [...agents];

    for (const agent of enrichedAgents) {
      try {
        // Get full metadata which includes workflow extraction
        const fullMetadata = await this.resourceLoader['getAgentMetadata'](
          agent.name,
        );
        if (fullMetadata) {
          // Copy workflow-related fields from full metadata
          agent.workflows = fullMetadata.workflows;
          agent.workflowPaths = fullMetadata.workflowPaths;
          agent.workflowMenuItems = fullMetadata.workflowMenuItems;
          agent.workflowHandlerInstructions =
            fullMetadata.workflowHandlerInstructions;
          agent.menuItems = fullMetadata.menuItems;
          agent.capabilities = fullMetadata.capabilities;
          agent.persona = fullMetadata.persona;
        }
      } catch {
        // Silently skip if agent file can't be loaded
        // This can happen if manifest references an agent that was deleted
      }
    }

    return enrichedAgents;
  }

  /**
   * Get all bmad_root sources with priority order
   *
   * @returns Array of manifest sources
   */
  private async getSources(): Promise<ManifestSource[]> {
    // Return cached sources if available
    if (this.cachedSources !== null) {
      return this.cachedSources;
    }

    // If a sources promise is already in flight, wait for it
    if (this.sourcesPromise !== null) {
      return this.sourcesPromise;
    }

    // Create and cache the promise to prevent parallel execution
    this.sourcesPromise = this.loadSources();
    const sources = await this.sourcesPromise;

    // Cache the result
    this.cachedSources = sources;
    return sources;
  }

  /**
   * Internal method to load sources (called only once)
   */
  private async loadSources(): Promise<ManifestSource[]> {
    const sources: ManifestSource[] = [];
    const discoveryMode = this.resourceLoader.getDiscoveryMode();
    let currentPriority = 1;

    // Priority 1: Git remotes from CLI args (--path) - HIGHEST PRIORITY
    // These are explicit user choices and should override everything
    if (
      discoveryMode === 'auto' ||
      discoveryMode === 'first' ||
      discoveryMode === 'strict'
    ) {
      await this.resourceLoader['resolveGitRemotes']();
      const gitPaths = this.resourceLoader.getResolvedGitPaths();

      for (const [_url, localPath] of gitPaths) {
        const pathInfo = this.resourceLoader['detectPathType'](localPath);
        sources.push({
          root: pathInfo.bmadRoot,
          priority: currentPriority++,
          type: 'git',
        });
      }
    }

    // Priority N: ENV variables (BMAD_ROOT, BMAD_SOURCES)
    // TODO: Add support for BMAD_SOURCES environment variable
    // For now, ENV is handled via projectRoot parameter which gets treated as git remote

    // Priority N+1: Local project bmad
    if (
      discoveryMode === 'auto' ||
      discoveryMode === 'first' ||
      discoveryMode === 'local'
    ) {
      const projectPathInfo = this.resourceLoader['getProjectBmadPath']();
      // Only add if the path actually contains BMAD content (has agents/workflows/modules)
      const hasAgents = await pathExists(
        join(projectPathInfo.bmadRoot, 'agents'),
      );
      const hasWorkflows = await pathExists(
        join(projectPathInfo.bmadRoot, 'workflows'),
      );
      const hasModules =
        (await pathExists(join(projectPathInfo.bmadRoot, 'bmm'))) ||
        (await pathExists(join(projectPathInfo.bmadRoot, 'core')));

      if (hasAgents || hasWorkflows || hasModules) {
        sources.push({
          root: projectPathInfo.bmadRoot,
          priority: currentPriority++,
          type: 'project',
        });
      }
    }

    // Priority N+2: User ~/.bmad - LOWEST PRIORITY
    if (
      discoveryMode === 'auto' ||
      discoveryMode === 'first' ||
      discoveryMode === 'user'
    ) {
      const userBmad = this.resourceLoader.getPaths().userBmad;
      if (await pathExists(userBmad)) {
        sources.push({
          root: userBmad,
          priority: currentPriority++,
          type: 'user',
        });
      }
    }

    // For 'first' mode, filter to only the highest priority source(s)
    if (discoveryMode === 'first' && sources.length > 0) {
      const minPriority = Math.min(...sources.map((s) => s.priority));
      return sources.filter((s) => s.priority === minPriority);
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

    if (!(await pathExists(bmadRoot))) {
      return modules;
    }

    const entries = await readdir(bmadRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'core' || entry.name === '_cfg') continue;
      // Skip excluded directories
      if (EXCLUDED_DIRECTORIES.has(entry.name)) continue;

      const entryPath = join(bmadRoot, entry.name);
      const hasAgents = await pathExists(join(entryPath, 'agents'));
      const hasWorkflows = await pathExists(join(entryPath, 'workflows'));
      const hasTasks = await pathExists(join(entryPath, 'tasks'));

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
      if (!(await pathExists(dir))) {
        return;
      }

      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        // Skip excluded directories
        if (entry.isDirectory()) {
          if (EXCLUDED_DIRECTORIES.has(entry.name)) {
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
      if (!(await pathExists(manifestPath))) {
        return false;
      }

      const stats = await stat(manifestPath);
      const age = Date.now() - stats.mtimeMs;
      return age < this.manifestTTL;
    } catch {
      return false;
    }
  }

  /**
   * Get hash for a source path (for cache directory naming)
   *
   * @param sourcePath - Path to hash
   * @returns SHA256 hash (first 12 characters)
   */
  private getSourceHash(sourcePath: string): string {
    return createHash('sha256')
      .update(sourcePath)
      .digest('hex')
      .substring(0, 12);
  }

  /**
   * Get cache directory for a specific source
   *
   * @param sourcePath - Source bmad_root path
   * @returns Cache directory path for this source
   */
  private getCacheDir(sourcePath: string): string {
    const hash = this.getSourceHash(sourcePath);
    return join(this.cacheDir, hash);
  }

  /**
   * Get merged manifests cache directory
   *
   * @returns Path to merged manifests directory
   */
  private getMergedCacheDir(): string {
    return join(this.cacheDir, 'merged');
  }

  /**
   * Write merged/deduplicated manifests to cache for visibility
   *
   * @param manifests - Partial manifests to write
   */
  private async writeMergedManifests(manifests: {
    agents?: AgentMetadata[];
    workflows?: Workflow[];
    tools?: Tool[];
    tasks?: Task[];
  }): Promise<void> {
    const mergedDir = this.getMergedCacheDir();
    const { mkdir, writeFile } = await import('node:fs/promises');

    try {
      await mkdir(mergedDir, { recursive: true });

      if (manifests.agents) {
        const csvLines = ['name,displayName,title,module,role,description'];
        for (const agent of manifests.agents) {
          csvLines.push(
            `"${agent.name}","${agent.displayName || ''}","${agent.title || ''}","${agent.module || 'core'}","${agent.role || ''}","${agent.description || ''}"`,
          );
        }
        await writeFile(
          join(mergedDir, 'agent-manifest.csv'),
          csvLines.join('\n'),
        );
      }

      if (manifests.workflows) {
        const csvLines = ['name,description,module,path,trigger,standalone'];
        for (const workflow of manifests.workflows) {
          csvLines.push(
            `"${workflow.name}","${workflow.description}","${workflow.module}","${workflow.path}","${workflow.trigger || ''}","${workflow.standalone}"`,
          );
        }
        await writeFile(
          join(mergedDir, 'workflow-manifest.csv'),
          csvLines.join('\n'),
        );
      }

      if (manifests.tools) {
        const csvLines = [
          'name,displayName,description,module,path,standalone',
        ];
        for (const tool of manifests.tools) {
          csvLines.push(
            `"${tool.name}","${tool.displayName}","${tool.description}","${tool.module}","${tool.path}","${tool.standalone}"`,
          );
        }
        await writeFile(
          join(mergedDir, 'tool-manifest.csv'),
          csvLines.join('\n'),
        );
      }

      if (manifests.tasks) {
        const csvLines = [
          'name,displayName,description,module,path,standalone',
        ];
        for (const task of manifests.tasks) {
          csvLines.push(
            `"${task.name}","${task.displayName}","${task.description}","${task.module}","${task.path}","${task.standalone}"`,
          );
        }
        await writeFile(
          join(mergedDir, 'task-manifest.csv'),
          csvLines.join('\n'),
        );
      }
    } catch (error) {
      // Don't fail if we can't write merged manifests - they're just for visibility
      console.warn('Failed to write merged manifests:', error);
    }
  }
}
