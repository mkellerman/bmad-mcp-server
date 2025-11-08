/**
 * BMAD MCP Server - Lite Implementation with Git Support
 *
 * Simple resource loader that supports:
 * - Local project files (./bmad)
 * - User home files (~/.bmad)
 * - Git remote sources (git+https://...)
 *
 * No master manifest, no complex caching - just straightforward file loading.
 *
 * @remarks
 * This class implements a multi-source resource loading strategy for BMAD (Business Methodology
 * Automation and Delivery) content. It searches for resources in priority order:
 * 1. **Project-local**: `{projectRoot}/bmad/` directory
 * 2. **User-global**: `~/.bmad/` directory
 * 3. **Git remotes**: Specified git+ URLs (cloned to cache)
 *
 * The loader supports both flat BMAD structures and modular BMAD structures with multiple modules.
 * It automatically detects the structure type and handles path resolution accordingly.
 *
 * @example
 * ```typescript
 * // Load from project and user directories
 * const loader = new ResourceLoaderGit('/path/to/project');
 *
 * // Include Git remotes
 * const loader = new ResourceLoaderGit(
 *   '/path/to/project',
 *   ['git+https://github.com/company/bmad-extensions.git']
 * );
 *
 * // Load an agent
 * const agent = await loader.loadAgent('pm');
 * ```
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { homedir } from 'node:os';
import { load as parseYaml } from 'js-yaml';
import { XMLParser } from 'fast-xml-parser';
import { parse as parseCsv } from 'csv-parse/sync';
import { GitSourceResolver } from '../utils/git-source-resolver.js';
import { ManifestCache } from './manifest-cache.js';
import type { Workflow, DiscoveryMode } from '../types/index.js';

/**
 * Constants for resource loading
 */

/** Maximum length for agent identity strings: 500 characters (increased to show full persona) */
const AGENT_IDENTITY_MAX_LENGTH = 500;

/** Regex patterns for parsing BMAD content */

/** Extract agent XML block from content */
const AGENT_XML_REGEX = /<agent[\s\S]*?<\/agent>/i;

/**
 * XML Parser instance for parsing agent XML content
 * Configured to preserve attributes and handle text nodes properly
 */
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false, // Keep values as strings
  trimValues: true,
  ignoreDeclaration: true,
  ignorePiTags: true,
});

export interface ResourcePaths {
  projectRoot: string;
  userBmad: string;
  gitRemotes?: string[];
}

export interface Resource {
  name: string;
  path: string;
  content: string;
  source: 'project' | 'user' | 'git';
}

export interface AgentMetadata {
  name: string;
  title: string;
  displayName: string;
  role?: string;
  description?: string;
  persona?: string;
  capabilities?: string[];
  menuItems?: string[];
  module?: string; // The module this agent belongs to (e.g., "core", "bmm", "cis")
  workflows?: string[]; // Workflow names extracted from menu items
  workflowPaths?: Record<string, string>; // Map of workflow name to full path
  workflowMenuItems?: string[]; // Menu items that have associated workflows
  workflowHandlerInstructions?: string; // Agent-specific workflow handler instructions
  icon?: string; // Agent icon emoji (e.g., "📊")
  communicationStyle?: string; // How the agent communicates
  principles?: string; // Agent's decision-making philosophy
}

/**
 * Simple resource loader with Git remote support.
 *
 * Search order: project → user → git remotes
 */
export class ResourceLoaderGit {
  private paths: ResourcePaths;
  private gitResolver?: GitSourceResolver;
  private resolvedGitPaths: Map<string, string> = new Map();
  private manifestCache: ManifestCache;
  private discoveryMode: DiscoveryMode;

  /**
   * Creates a new BMAD resource loader with multi-source support
   *
   * @param projectRoot - Optional project root directory. If not provided, uses current working directory.
   *                     This is where the loader looks for project-local BMAD installations.
   * @param gitRemotes - Optional array of Git remote URLs for additional BMAD content.
   *                    URLs should be in format: `git+https://github.com/user/repo.git` or `git+ssh://git@github.com/user/repo.git`
   * @param discoveryMode - Discovery mode for source filtering:
   *                       - 'strict': Only git remotes from CLI (no local/user)
   *                       - 'local': Only project root (no user/git)
   *                       - 'user': Only ~/.bmad (no project/git)
   *                       - 'auto': All sources with priority resolution (default)
   *
   * @remarks
   * The constructor sets up the search paths and initializes Git resolution if remote URLs are provided.
   * Git repositories are cloned lazily on first access to avoid startup delays.
   *
   * @example
   * ```typescript
   * // Basic usage with current directory
   * const loader = new ResourceLoaderGit();
   *
   * // Specify project root
   * const loader = new ResourceLoaderGit('/path/to/my/project');
   *
   * // Add Git remote sources
   * const loader = new ResourceLoaderGit(
   *   undefined,
   *   ['git+https://github.com/company/bmad-custom.git']
   * );
   *
   * // Strict mode - only use git remotes
   * const loader = new ResourceLoaderGit(
   *   undefined,
   *   ['git+https://github.com/company/bmad.git'],
   *   'strict'
   * );
   * ```
   */
  constructor(
    projectRoot?: string,
    gitRemotes?: string[],
    discoveryMode: DiscoveryMode = 'auto',
  ) {
    this.discoveryMode = discoveryMode;
    this.paths = {
      projectRoot: projectRoot || process.cwd(),
      userBmad: join(homedir(), '.bmad'),
      gitRemotes: gitRemotes || [],
    };

    // Initialize Git resolver if we have remote URLs
    if (gitRemotes && gitRemotes.length > 0) {
      this.gitResolver = new GitSourceResolver();
    }

    // Initialize manifest cache
    this.manifestCache = new ManifestCache(this);
  }

  /**
   * Get the discovery mode for this loader
   *
   * @returns The current discovery mode
   */
  getDiscoveryMode(): DiscoveryMode {
    return this.discoveryMode;
  }

  /**
   * Check if a source type should be included based on discovery mode
   *
   * @param source - The source type to check
   * @returns true if this source should be scanned
   */
  private shouldIncludeSource(source: Resource['source']): boolean {
    switch (this.discoveryMode) {
      case 'strict':
        // Only git remotes provided via CLI
        return source === 'git';
      case 'local':
        // Only project root
        return source === 'project';
      case 'user':
        // Only ~/.bmad
        return source === 'user';
      case 'auto':
      default:
        // All sources
        return true;
    }
  }

  /**
   * Get the BMAD root path for project-local scanning
   * Uses smart detection to handle:
   * - projectRoot IS the bmad root (contains modules)
   * - projectRoot IS a specific module
   * - projectRoot contains a 'bmad' subdirectory
   */
  private getProjectBmadPath(): { bmadRoot: string; module?: string } {
    return this.detectPathType(this.paths.projectRoot);
  }

  /**
   * Detect if a path is a BMAD root (has modules) or a specific module
   * Returns: { bmadRoot: string, module?: string }
   */
  private detectPathType(localPath: string): {
    bmadRoot: string;
    module?: string;
  } {
    // First check if there's a 'bmad' subdirectory (common in Git repos)
    const bmadSubdir = join(localPath, 'bmad');
    if (existsSync(bmadSubdir)) {
      // Recursively check the bmad subdirectory
      return this.detectPathType(bmadSubdir);
    }

    // Check if this path has an 'agents' subdirectory (it's a module or flat structure)
    const agentsPath = join(localPath, 'agents');
    if (existsSync(agentsPath)) {
      // This is either a flat BMAD root or a specific module
      // Check if parent has other module directories
      const parentDir = dirname(localPath);
      const currentDirName = basename(localPath);

      // Check if siblings exist that look like modules
      if (existsSync(parentDir)) {
        try {
          const siblings = readdirSync(parentDir, { withFileTypes: true })
            .filter((d) => d.isDirectory() && d.name !== currentDirName)
            .map((d) => d.name);

          // If siblings have 'agents' directories, parent is likely BMAD root
          const hasModuleSiblings = siblings.some((sibling) =>
            existsSync(join(parentDir, sibling, 'agents')),
          );

          if (hasModuleSiblings) {
            // This is a specific module, parent is BMAD root
            return {
              bmadRoot: parentDir,
              module: currentDirName,
            };
          }
        } catch {
          // Ignore errors
        }
      }

      // This is a flat BMAD root or standalone module
      return { bmadRoot: localPath };
    }

    // Check if this path has module subdirectories (it's a BMAD root)
    try {
      const subdirs = readdirSync(localPath, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      const hasModules = subdirs.some((subdir) =>
        existsSync(join(localPath, subdir, 'agents')),
      );

      if (hasModules) {
        // This is a BMAD root with modules
        return { bmadRoot: localPath };
      }
    } catch {
      // Ignore errors
    }

    // Default: treat as BMAD root
    return { bmadRoot: localPath };
  }

  /**
   * Recursively walk a directory and collect all files
   *
   * @param dir - Directory to walk
   * @param baseDir - Base directory for relative path calculation
   * @param source - Source type (project, user, git)
   * @param allFiles - Array to collect file information
   * @param seenPaths - Set to track seen relative paths for deduplication
   *
   * @remarks
   * This method recursively walks a directory structure, collecting all files while:
   * - Skipping node_modules, .git, cache directories, and hidden files
   * - Deduplicating by relative path (first source wins)
   * - Handling read errors gracefully
   */
  private walkDir(
    dir: string,
    baseDir: string,
    source: Resource['source'],
    allFiles: Array<{
      relativePath: string;
      fullPath: string;
      source: Resource['source'];
    }>,
    seenPaths: Set<string>,
  ): void {
    if (!existsSync(dir)) return;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativePath = fullPath.replace(baseDir + '/', '');

        // Skip node_modules, .git, cache directories, and hidden files
        if (
          relativePath.includes('node_modules') ||
          relativePath.includes('.git') ||
          relativePath.includes('/cache/') ||
          relativePath.startsWith('cache/') ||
          relativePath.startsWith('.')
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          this.walkDir(fullPath, baseDir, source, allFiles, seenPaths);
        } else {
          // Only add if we haven't seen this relative path (priority order)
          if (!seenPaths.has(relativePath)) {
            allFiles.push({ relativePath, fullPath, source });
            seenPaths.add(relativePath);
          }
        }
      }
    } catch {
      // Ignore errors reading directories
    }
  }

  /**
   * Resolve Git remote URLs to local cached paths (lazy, one-time)
   */
  private async resolveGitRemotes(): Promise<void> {
    if (!this.gitResolver || !this.paths.gitRemotes) return;

    for (const gitUrl of this.paths.gitRemotes) {
      // Skip if already resolved
      if (this.resolvedGitPaths.has(gitUrl)) continue;

      try {
        const localPath = await this.gitResolver.resolve(gitUrl);
        this.resolvedGitPaths.set(gitUrl, localPath);
      } catch (error) {
        console.error(`Failed to resolve Git remote: ${gitUrl}`, error);
      }
    }
  }

  /**
   * Load an agent by name from available BMAD sources
   *
   * @param name - Agent name (without .md extension)
   * @returns Promise resolving to the agent resource with content and metadata
   *
   * @remarks
   * Searches for agents in priority order: project → user → git remotes.
   * Supports both flat (bmad/agents/*.md) and modular (bmad/{module}/agents/*.md) structures.
   * Uses smart path detection to handle both BMAD roots and specific modules.
   *
   * The search process:
   * 1. Resolves Git remotes (lazy, cached after first call)
   * 2. Builds candidate paths for all sources and structures
   * 3. Returns the first existing file found
   *
   * @throws Will throw if no agent with the given name is found in any source
   *
   * @example
   * ```typescript
   * const agent = await loader.loadAgent('pm');
   * console.log(agent.content); // Agent definition XML
   * console.log(agent.source); // 'project', 'user', or 'git'
   * ```
   */
  async loadAgent(name: string): Promise<Resource> {
    // Resolve Git remotes first (lazy, cached after first call)
    await this.resolveGitRemotes();

    const candidates: Array<{ path: string; source: Resource['source'] }> = [];

    // Project - using smart path detection (if mode allows)
    if (this.shouldIncludeSource('project')) {
      const projectPathInfo = this.getProjectBmadPath();
      const projectBmad = projectPathInfo.bmadRoot;

      if (projectPathInfo.module) {
        // Specific module - only check this module
        candidates.push({
          path: join(
            projectBmad,
            projectPathInfo.module,
            'agents',
            `${name}.md`,
          ),
          source: 'project',
        });
      } else {
        // BMAD root - check flat structure
        candidates.push({
          path: join(projectBmad, 'agents', `${name}.md`),
          source: 'project',
        });

        // BMAD root - check modular structure (all modules)
        if (existsSync(projectBmad)) {
          try {
            const modules = readdirSync(projectBmad, { withFileTypes: true })
              .filter((dirent) => dirent.isDirectory())
              .map((dirent) => dirent.name);

            for (const module of modules) {
              candidates.push({
                path: join(projectBmad, module, 'agents', `${name}.md`),
                source: 'project',
              });
            }
          } catch {
            // Ignore module scanning errors
          }
        }
      }
    }

    // User - flat structure (if mode allows)
    if (this.shouldIncludeSource('user')) {
      candidates.push({
        path: join(this.paths.userBmad, 'agents', `${name}.md`),
        source: 'user',
      });
    }

    // Git remotes - use smart path detection (if mode allows)
    if (this.shouldIncludeSource('git')) {
      for (const localPath of this.resolvedGitPaths.values()) {
        const pathInfo = this.detectPathType(localPath);

        if (pathInfo.module) {
          // Specific module was requested - only search this module
          candidates.push({
            path: join(localPath, 'agents', `${name}.md`),
            source: 'git',
          });
        } else {
          // BMAD root - search flat and all modules
          // Flat structure
          candidates.push({
            path: join(pathInfo.bmadRoot, 'agents', `${name}.md`),
            source: 'git',
          });

          // Modular structure
          try {
            const modules = readdirSync(pathInfo.bmadRoot, {
              withFileTypes: true,
            })
              .filter((dirent) => dirent.isDirectory())
              .map((dirent) => dirent.name);

            for (const module of modules) {
              candidates.push({
                path: join(pathInfo.bmadRoot, module, 'agents', `${name}.md`),
                source: 'git',
              });
            }
          } catch {
            // Ignore module scanning errors
          }
        }
      }
    }

    for (const candidate of candidates) {
      if (existsSync(candidate.path)) {
        return {
          name,
          path: candidate.path,
          content: readFileSync(candidate.path, 'utf-8'),
          source: candidate.source,
        };
      }
    }

    throw new Error(`Agent not found: ${name}`);
  }

  /**
   * Load a workflow by name from available BMAD sources
   *
   * @param name - Workflow name (directory name under workflows/)
   * @returns Promise resolving to the workflow resource with YAML content
   *
   * @remarks
   * Searches for workflows in priority order: project → user → git remotes.
   * Workflows are stored as `workflow.yaml` files in `{name}/` directories.
   * Supports both flat and modular BMAD structures.
   *
   * The search process:
   * 1. Resolves Git remotes (lazy, cached after first call)
   * 2. Builds candidate paths for `workflows/{name}/workflow.yaml`
   * 3. Returns the first existing workflow found
   *
   * @throws Will throw if no workflow with the given name is found in any source
   *
   * @example
   * ```typescript
   * const workflow = await loader.loadWorkflow('prd');
   * console.log(workflow.content); // Workflow YAML definition
   * console.log(workflow.path); // Path to workflow.yaml file
   * ```
   */
  async loadWorkflow(name: string): Promise<Resource> {
    // Resolve Git remotes first
    await this.resolveGitRemotes();

    const candidates: Array<{ path: string; source: Resource['source'] }> = [];

    // Project - using smart path detection
    const projectPathInfo = this.getProjectBmadPath();
    const projectBmad = projectPathInfo.bmadRoot;

    if (projectPathInfo.module) {
      // Specific module - only check this module
      candidates.push({
        path: join(
          projectBmad,
          projectPathInfo.module,
          'workflows',
          name,
          'workflow.yaml',
        ),
        source: 'project',
      });
    } else {
      // BMAD root - check flat structure
      candidates.push({
        path: join(projectBmad, 'workflows', name, 'workflow.yaml'),
        source: 'project',
      });

      // BMAD root - check modular structure
      if (existsSync(projectBmad)) {
        try {
          const modules = readdirSync(projectBmad, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);

          for (const module of modules) {
            candidates.push({
              path: join(
                projectBmad,
                module,
                'workflows',
                name,
                'workflow.yaml',
              ),
              source: 'project',
            });
          }
        } catch {
          // Ignore errors
        }
      }
    }

    // User
    candidates.push({
      path: join(this.paths.userBmad, 'workflows', name, 'workflow.yaml'),
      source: 'user',
    });

    // Git remotes - flat and modular
    for (const localPath of this.resolvedGitPaths.values()) {
      const pathInfo = this.detectPathType(localPath);

      if (pathInfo.module) {
        // Specific module - only check this module
        candidates.push({
          path: join(localPath, 'workflows', name, 'workflow.yaml'),
          source: 'git',
        });
      } else {
        // BMAD root - check flat and all modules
        // Flat
        candidates.push({
          path: join(pathInfo.bmadRoot, 'workflows', name, 'workflow.yaml'),
          source: 'git',
        });

        // Modular
        try {
          const modules = readdirSync(pathInfo.bmadRoot, {
            withFileTypes: true,
          })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);

          for (const module of modules) {
            candidates.push({
              path: join(
                pathInfo.bmadRoot,
                module,
                'workflows',
                name,
                'workflow.yaml',
              ),
              source: 'git',
            });
          }
        } catch {
          // Ignore errors
        }
      }
    }

    for (const candidate of candidates) {
      if (existsSync(candidate.path)) {
        return {
          name,
          path: candidate.path,
          content: readFileSync(candidate.path, 'utf-8'),
          source: candidate.source,
        };
      }
    }

    throw new Error(`Workflow not found: ${name}`);
  }

  /**
   * Load the minimal files needed to bootstrap workflow execution.
   *
   * @param workflowName - Name of the workflow to bootstrap
   * @returns Promise resolving to workflow configuration (raw YAML)
   *
   * @remarks
   * Returns ONLY the workflow.yaml as a raw blob.
   * Does NOT load workflow.xml - the agent's workflow handler will instruct the LLM to load it.
   *
   * This minimal approach lets the agent's workflow handler instructions control
   * exactly what gets loaded and when.
   *
   * @example
   * ```typescript
   * const config = await loader.loadWorkflowBootstrap('prd');
   * console.log(config); // Raw YAML from workflows/prd/workflow.yaml
   * ```
   */
  async loadWorkflowBootstrap(workflowName: string): Promise<string> {
    // Load workflow.yaml (raw YAML blob)
    const workflowResource = await this.loadWorkflow(workflowName);
    return workflowResource.content;
  }

  /**
   * List all available agents from all BMAD sources
   *
   * @returns Promise resolving to array of agent names (without .md extension)
   *
   * @remarks
   * Scans all sources (project, user, git remotes) for agent files.
   * Supports both flat and modular BMAD structures with smart path detection.
   * Returns deduplicated list of agent names found across all sources.
   *
   * Agent files are identified by:
   * - Being in an `agents/` directory
   * - Having `.md` extension
   * - Following the naming pattern `{name}.md`
   *
   * @example
   * ```typescript
   * const agents = await loader.listAgents();
   * console.log(agents); // ['pm', 'architect', 'developer', ...]
   * ```
   */
  async listAgents(): Promise<string[]> {
    // Resolve Git remotes first
    await this.resolveGitRemotes();

    const agents = new Set<string>();

    // Helper to filter out non-agent files
    const isAgentFile = (filename: string): boolean => {
      if (!filename.endsWith('.md')) return false;
      const name = basename(filename, '.md').toLowerCase();
      return name !== 'readme';
    };

    // Scan project using smart path detection (if mode allows)
    if (this.shouldIncludeSource('project')) {
      const projectPathInfo = this.getProjectBmadPath();
      const projectBmad = projectPathInfo.bmadRoot;

      if (existsSync(projectBmad)) {
        // If a specific module was detected, only scan that module
        if (projectPathInfo.module) {
          const moduleAgents = join(
            projectBmad,
            projectPathInfo.module,
            'agents',
          );
          if (existsSync(moduleAgents)) {
            readdirSync(moduleAgents)
              .filter(isAgentFile)
              .forEach((f) => agents.add(basename(f, '.md')));
          }
        } else {
          // Flat structure: bmad/agents/*.md
          const flatAgents = join(projectBmad, 'agents');
          if (existsSync(flatAgents)) {
            readdirSync(flatAgents)
              .filter(isAgentFile)
              .forEach((f) => agents.add(basename(f, '.md')));
          }

          // Modular structure: bmad/{module}/agents/*.md
          try {
            const modules = readdirSync(projectBmad, { withFileTypes: true })
              .filter((dirent) => dirent.isDirectory())
              .map((dirent) => dirent.name);

            for (const module of modules) {
              const moduleAgents = join(projectBmad, module, 'agents');
              if (existsSync(moduleAgents)) {
                readdirSync(moduleAgents)
                  .filter(isAgentFile)
                  .forEach((f) => agents.add(basename(f, '.md')));
              }
            }
          } catch {
            // Ignore errors scanning modules
          }
        }
      }
    }

    // Scan user - flat structure only (if mode allows)
    if (this.shouldIncludeSource('user')) {
      const userAgents = join(this.paths.userBmad, 'agents');
      if (existsSync(userAgents)) {
        readdirSync(userAgents)
          .filter(isAgentFile)
          .forEach((f) => agents.add(basename(f, '.md')));
      }
    }

    // Scan Git remotes - use smart path detection (if mode allows)
    if (this.shouldIncludeSource('git')) {
      for (const localPath of this.resolvedGitPaths.values()) {
        const pathInfo = this.detectPathType(localPath);

        if (pathInfo.module) {
          // Specific module was requested
          const moduleAgents = join(localPath, 'agents');
          if (existsSync(moduleAgents)) {
            readdirSync(moduleAgents)
              .filter(isAgentFile)
              .forEach((f) => agents.add(basename(f, '.md')));
          }
        } else {
          // BMAD root - scan flat and modular
          // Flat structure
          const flatAgents = join(pathInfo.bmadRoot, 'agents');
          if (existsSync(flatAgents)) {
            readdirSync(flatAgents)
              .filter(isAgentFile)
              .forEach((f) => agents.add(basename(f, '.md')));
          }

          // Modular structure
          try {
            const modules = readdirSync(pathInfo.bmadRoot, {
              withFileTypes: true,
            })
              .filter((dirent) => dirent.isDirectory())
              .map((dirent) => dirent.name);

            for (const module of modules) {
              const moduleAgents = join(pathInfo.bmadRoot, module, 'agents');
              if (existsSync(moduleAgents)) {
                readdirSync(moduleAgents)
                  .filter(isAgentFile)
                  .forEach((f) => agents.add(basename(f, '.md')));
              }
            }
          } catch {
            // Ignore errors scanning modules
          }
        }
      }
    }

    return Array.from(agents).sort();
  }

  /**
   * List all available workflows from all BMAD sources
   *
   * @returns Promise resolving to array of workflow names
   *
   * @remarks
   * Scans all sources (project, user, git remotes) for workflow directories.
   * Workflows are identified by having a `workflow.yaml` file in their directory.
   * Supports both flat and modular BMAD structures.
   *
   * Returns deduplicated list of workflow names found across all sources.
   *
   * @example
   * ```typescript
   * const workflows = await loader.listWorkflows();
   * console.log(workflows); // ['prd', 'architecture', 'debug-inspect', ...]
   * ```
   */
  async listWorkflows(): Promise<string[]> {
    // Resolve Git remotes first
    await this.resolveGitRemotes();

    const workflows = new Set<string>();

    // Scan project using smart path detection (if mode allows)
    if (this.shouldIncludeSource('project')) {
      const projectPathInfo = this.getProjectBmadPath();
      const projectBmad = projectPathInfo.bmadRoot;

      if (projectPathInfo.module) {
        // Specific module - only scan this module
        const moduleWorkflows = join(
          projectBmad,
          projectPathInfo.module,
          'workflows',
        );
        if (existsSync(moduleWorkflows)) {
          readdirSync(moduleWorkflows).forEach((name) => {
            const workflowPath = join(moduleWorkflows, name, 'workflow.yaml');
            if (existsSync(workflowPath)) {
              workflows.add(name);
            }
          });
        }
      } else {
        // BMAD root - scan flat structure
        const flatWorkflows = join(projectBmad, 'workflows');
        if (existsSync(flatWorkflows)) {
          readdirSync(flatWorkflows).forEach((name) => {
            const workflowPath = join(flatWorkflows, name, 'workflow.yaml');
            if (existsSync(workflowPath)) {
              workflows.add(name);
            }
          });
        }

        // BMAD root - scan modular structure
        if (existsSync(projectBmad)) {
          try {
            const modules = readdirSync(projectBmad, { withFileTypes: true })
              .filter((dirent) => dirent.isDirectory())
              .map((dirent) => dirent.name);

            for (const module of modules) {
              const moduleWorkflows = join(projectBmad, module, 'workflows');
              if (existsSync(moduleWorkflows)) {
                readdirSync(moduleWorkflows).forEach((name) => {
                  const workflowPath = join(
                    moduleWorkflows,
                    name,
                    'workflow.yaml',
                  );
                  if (existsSync(workflowPath)) {
                    workflows.add(name);
                  }
                });
              }
            }
          } catch {
            // Ignore errors
          }
        }
      }
    }

    // Scan user (if mode allows)
    if (this.shouldIncludeSource('user')) {
      const userWorkflows = join(this.paths.userBmad, 'workflows');
      if (existsSync(userWorkflows)) {
        readdirSync(userWorkflows).forEach((name) => {
          const workflowPath = join(userWorkflows, name, 'workflow.yaml');
          if (existsSync(workflowPath)) {
            workflows.add(name);
          }
        });
      }
    }

    // Scan Git remotes - flat and modular (if mode allows)
    if (this.shouldIncludeSource('git')) {
      for (const localPath of this.resolvedGitPaths.values()) {
        const pathInfo = this.detectPathType(localPath);

        if (pathInfo.module) {
          // Specific module
          const gitWorkflows = join(localPath, 'workflows');
          if (existsSync(gitWorkflows)) {
            readdirSync(gitWorkflows).forEach((name) => {
              const workflowPath = join(gitWorkflows, name, 'workflow.yaml');
              if (existsSync(workflowPath)) {
                workflows.add(name);
              }
            });
          }
        } else {
          // BMAD root - scan flat and all modules
          // Flat
          const gitWorkflowsFlat = join(pathInfo.bmadRoot, 'workflows');
          if (existsSync(gitWorkflowsFlat)) {
            readdirSync(gitWorkflowsFlat).forEach((name) => {
              const workflowPath = join(
                gitWorkflowsFlat,
                name,
                'workflow.yaml',
              );
              if (existsSync(workflowPath)) {
                workflows.add(name);
              }
            });
          }

          // Modular
          try {
            const modules = readdirSync(pathInfo.bmadRoot, {
              withFileTypes: true,
            })
              .filter((dirent) => dirent.isDirectory())
              .map((dirent) => dirent.name);

            for (const module of modules) {
              const moduleWorkflows = join(
                pathInfo.bmadRoot,
                module,
                'workflows',
              );
              if (existsSync(moduleWorkflows)) {
                readdirSync(moduleWorkflows).forEach((name) => {
                  const workflowPath = join(
                    moduleWorkflows,
                    name,
                    'workflow.yaml',
                  );
                  if (existsSync(workflowPath)) {
                    workflows.add(name);
                  }
                });
              }
            }
          } catch {
            // Ignore errors
          }
        }
      }
    }

    return Array.from(workflows).sort();
  }

  /**
   * Extract comprehensive metadata from an agent file
   *
   * @param name - Agent name (without .md extension)
   * @returns Promise resolving to agent metadata or null if agent not found
   *
   * @remarks
   * Parses agent files to extract rich metadata including:
   * - Basic info (name, title, display name)
   * - Module association (from file path)
   * - YAML frontmatter (description, title)
   * - XML metadata (persona, capabilities, workflows)
   *
   * The parsing process:
   * 1. Load the agent file using `loadAgent()`
   * 2. Extract module from file path structure
   * 3. Parse YAML frontmatter for basic metadata
   * 4. Parse XML `<agent>` tag for detailed metadata
   * 5. Extract persona, capabilities, and workflow menu items
   *
   * @example
   * ```typescript
   * const metadata = await loader.getAgentMetadata('pm');
   * if (metadata) {
   *   console.log(metadata.title); // "Product Manager"
   *   console.log(metadata.capabilities); // ['Requirements', 'Planning', ...]
   *   console.log(metadata.module); // 'bmm' or undefined
   * }
   * ```
   */
  async getAgentMetadata(name: string): Promise<AgentMetadata | null> {
    try {
      const resource = await this.loadAgent(name);
      const content = resource.content;

      const metadata: AgentMetadata = {
        name,
        title: name,
        displayName: name,
      };

      // Detect module from file path
      // Paths look like: /path/to/bmad/{module}/agents/{name}.md
      const pathParts = resource.path.split('/');
      const agentsIndex = pathParts.lastIndexOf('agents');
      if (agentsIndex > 0) {
        const potentialModule = pathParts[agentsIndex - 1];
        // Only set if it looks like a module (not "bmad" itself)
        if (potentialModule !== 'bmad' && potentialModule !== '.bmad') {
          metadata.module = potentialModule;
        }
      }

      // Extract from YAML frontmatter first
      const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (yamlMatch) {
        try {
          // Parse YAML frontmatter using js-yaml library
          // YAML parser returns untyped objects - disable type checking for this section
          /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
          const frontmatter = parseYaml(yamlMatch[1]) as any;

          if (frontmatter && typeof frontmatter === 'object') {
            if (
              frontmatter.description &&
              typeof frontmatter.description === 'string'
            ) {
              metadata.description = frontmatter.description;
            }
            if (frontmatter.title && typeof frontmatter.title === 'string') {
              metadata.title = frontmatter.title;
            }
          }
          /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
        } catch {
          // Failed to parse YAML frontmatter, skip it
        }
      }

      // Extract XML section
      const xmlMatch = content.match(AGENT_XML_REGEX);
      if (!xmlMatch) {
        return metadata; // No XML, return basic metadata
      }

      const xmlContent = xmlMatch[0];

      // Parse XML using fast-xml-parser
      // XML parser returns untyped objects - disable type checking for this section
      /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
      let parsed: any;
      try {
        parsed = xmlParser.parse(xmlContent);
      } catch {
        // If XML parsing fails, return basic metadata
        return metadata;
      }

      const agent = parsed.agent;
      if (!agent) {
        return metadata;
      }

      // Extract agent attributes (name, title, icon)
      if (agent['@_name']) {
        metadata.displayName = agent['@_name'];
      }
      if (agent['@_title']) {
        metadata.title = agent['@_title'];
      }
      if (agent['@_icon']) {
        metadata.icon = agent['@_icon'];
      }

      // Extract persona (combine role and identity, plus communication_style and principles)
      if (agent.persona) {
        const parts: string[] = [];

        // Extract role as separate field
        if (agent.persona.role) {
          const roleText =
            typeof agent.persona.role === 'string'
              ? agent.persona.role
              : agent.persona.role['#text'] || '';
          const role = String(roleText).trim().replace(/\s+/g, ' ');
          metadata.role = role;
          parts.push(role);
        }

        // Extract identity as description
        if (agent.persona.identity) {
          const identityText =
            typeof agent.persona.identity === 'string'
              ? agent.persona.identity
              : agent.persona.identity['#text'] || '';
          const identity = String(identityText).trim().replace(/\s+/g, ' ');
          metadata.description = identity; // Use full identity as description
          parts.push(identity.substring(0, AGENT_IDENTITY_MAX_LENGTH));
        }

        // Extract communication_style
        if (agent.persona.communication_style) {
          const styleText =
            typeof agent.persona.communication_style === 'string'
              ? agent.persona.communication_style
              : agent.persona.communication_style['#text'] || '';
          metadata.communicationStyle = String(styleText)
            .trim()
            .replace(/\s+/g, ' ');
        }

        // Extract principles
        if (agent.persona.principles) {
          const principlesText =
            typeof agent.persona.principles === 'string'
              ? agent.persona.principles
              : agent.persona.principles['#text'] || '';
          metadata.principles = String(principlesText)
            .trim()
            .replace(/\s+/g, ' ');
        }

        if (parts.length > 0) {
          metadata.persona = parts.join(' - ');
        }
      }

      // Extract capabilities
      if (agent.capabilities?.capability) {
        const capabilities: string[] = [];
        const caps = Array.isArray(agent.capabilities.capability)
          ? agent.capabilities.capability
          : [agent.capabilities.capability];

        for (const cap of caps) {
          const text =
            typeof cap === 'string' ? cap : cap['#text'] || cap || '';
          const trimmed = String(text).trim().replace(/\s+/g, ' ');
          if (trimmed) {
            capabilities.push(trimmed);
          }
        }

        if (capabilities.length > 0) {
          metadata.capabilities = capabilities.slice(0, 5);
        }
      }

      // Extract menu items and workflows
      if (agent.menu?.item) {
        const menuItems: string[] = [];
        const workflows: string[] = [];
        const workflowPaths: Record<string, string> = {};
        const workflowMenuItems: string[] = [];

        const items = Array.isArray(agent.menu.item)
          ? agent.menu.item
          : [agent.menu.item];

        for (const item of items) {
          // Get item text
          const text =
            typeof item === 'string' ? item : item['#text'] || item || '';
          const trimmedText = String(text).trim().replace(/\s+/g, ' ');

          if (trimmedText) {
            menuItems.push(trimmedText);

            // Extract workflow attribute if present
            const workflowPath = item['@_workflow'];
            if (workflowPath) {
              // Extract workflow name from path like "{project-root}/bmad/bmm/workflows/debug/inspect/workflow.yaml"
              // Pattern: .../workflows/{...path...}/workflow.yaml
              // Capture everything between last '/workflows/' and '/workflow.yaml'
              const nameMatch = String(workflowPath).match(
                /\/workflows\/(.+)\/workflow\.yaml$/,
              );
              if (nameMatch) {
                // Take the last segment as the workflow name (e.g., "debug/inspect" -> "inspect")
                const fullPath = nameMatch[1];
                const workflowName = fullPath.split('/').pop() || fullPath;
                workflows.push(workflowName);
                workflowPaths[workflowName] = String(workflowPath); // Store full path
                workflowMenuItems.push(trimmedText); // Track menu items with workflows
              }
            }
          }
        }

        if (menuItems.length > 0) {
          metadata.menuItems = menuItems.slice(0, 8);
        }
        if (workflows.length > 0) {
          metadata.workflows = Array.from(new Set(workflows)); // Deduplicate
          metadata.workflowPaths = workflowPaths; // Store workflow paths map
          metadata.workflowMenuItems = workflowMenuItems; // Store menu items with workflows
        }
      }

      // Extract workflow handler instructions from menu-handlers section (inside activation)
      /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
      if (agent.activation?.['menu-handlers']?.handlers?.handler) {
        const handlers = Array.isArray(
          agent.activation['menu-handlers'].handlers.handler,
        )
          ? agent.activation['menu-handlers'].handlers.handler
          : [agent.activation['menu-handlers'].handlers.handler];

        // Find the workflow handler
        const workflowHandler = handlers.find(
          (h: any) => h['@_type'] === 'workflow',
        );

        if (workflowHandler) {
          // Extract the handler instructions as raw text
          // Preserve formatting - don't collapse whitespace
          const handlerText =
            typeof workflowHandler === 'string'
              ? workflowHandler
              : workflowHandler['#text'] || '';
          if (handlerText) {
            metadata.workflowHandlerInstructions = String(handlerText).trim();
          }
        }
      }
      /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

      return metadata;
    } catch {
      return null;
    }
  }

  /**
   * Get comprehensive metadata for all available agents
   *
   * @returns Promise resolving to array of agent metadata objects
   *
   * @remarks
   * This is a convenience method that:
   * 1. Lists all available agent names using `listAgents()`
   * 2. Calls `getAgentMetadata()` for each agent
   * 3. Filters out any agents that fail metadata extraction
   * 4. Returns complete metadata for all successfully parsed agents
   *
   * Used by the MCP server to build tool listings and agent information.
   *
   * @example
   * ```typescript
   * const agents = await loader.listAgentsWithMetadata();
   * agents.forEach(agent => {
   *   console.log(`${agent.displayName}: ${agent.title}`);
   *   if (agent.capabilities) {
   *     console.log(`  Capabilities: ${agent.capabilities.join(', ')}`);
   *   }
   * });
   * ```
   */
  async listAgentsWithMetadata(): Promise<AgentMetadata[]> {
    // Try manifest-based loading first (unless explicitly disabled)
    if (process.env.BMAD_USE_MANIFESTS !== 'false') {
      try {
        return await this.manifestCache.getAllAgents();
      } catch (error) {
        console.warn(
          'Manifest cache failed, falling back to runtime scan:',
          error,
        );
      }
    }

    // Fallback: runtime scanning
    return await this.scanAgentsRuntime();
  }

  /**
   * Fallback method: scans agents at runtime (slower, original behavior)
   * @private
   */
  private async scanAgentsRuntime(): Promise<AgentMetadata[]> {
    const agentNames = await this.listAgents();
    const metadata: AgentMetadata[] = [];

    for (const name of agentNames) {
      const meta = await this.getAgentMetadata(name);
      if (meta) {
        metadata.push(meta);
      }
    }

    return metadata;
  }

  /**
   * List all available workflows with full metadata from workflow-manifest.csv
   *
   * @returns Promise resolving to array of Workflow metadata objects
   *
   * @remarks
   * Loads workflow metadata from the workflow-manifest.csv file which contains:
   * - name: Workflow identifier
   * - description: Human-readable description of what the workflow does
   * - module: BMAD module the workflow belongs to
   * - path: Relative path to workflow directory
   * - standalone: Whether workflow can be executed independently
   *
   * @example
   * ```typescript
   * const workflows = await loader.listWorkflowsWithMetadata();
   * workflows.forEach(w => {
   *   console.log(`${w.name}: ${w.description} (${w.module})`);
   * });
   * ```
   */
  async listWorkflowsWithMetadata(): Promise<Workflow[]> {
    // Try manifest-based loading first (unless explicitly disabled)
    if (process.env.BMAD_USE_MANIFESTS !== 'false') {
      try {
        return await this.manifestCache.getAllWorkflows();
      } catch (error) {
        console.warn(
          'Manifest cache failed, falling back to runtime scan:',
          error,
        );
      }
    }

    // Fallback: runtime scanning
    return await this.scanWorkflowsRuntime();
  }

  /**
   * Fallback method: scans workflows at runtime (slower, original behavior)
   * @private
   */
  private async scanWorkflowsRuntime(): Promise<Workflow[]> {
    try {
      // Load workflow-manifest.csv
      const manifestContent = await this.loadFile('_cfg/workflow-manifest.csv');

      // Parse CSV using csv-parse library - returns array of objects with column headers as keys
      const records: Array<Record<string, string>> = parseCsv(manifestContent, {
        columns: true, // Use first row as headers
        skip_empty_lines: true,
        trim: true,
        relaxColumnCount: true, // Handle rows with different column counts
      });

      // Map parsed records to Workflow objects
      const workflows: Workflow[] = records.map((record) => ({
        name: record.name || '',
        description: record.description || '',
        module: record.module || 'unknown',
        path: record.path || '',
        ...(record.trigger && { trigger: record.trigger }),
        standalone: record.standalone?.toLowerCase() === 'true',
      }));

      return workflows;
    } catch {
      // If manifest doesn't exist, fall back to name-only list
      const workflowNames = await this.listWorkflows();
      return workflowNames.map((name) => ({
        name,
        description: '',
        module: 'unknown',
        path: '',
        standalone: true,
      }));
    }
  }

  /**
   * List all available tools with full metadata from tool-manifest.csv
   *
   * @returns Promise resolving to array of Tool metadata objects
   *
   * @remarks
   * Loads tool metadata from the tool-manifest.csv file which contains:
   * - name: Tool identifier
   * - displayName: Human-readable display name
   * - description: Description of what the tool does
   * - module: BMAD module the tool belongs to
   * - path: Relative path to tool definition file
   * - standalone: Whether tool can be executed independently
   */
  async listToolsWithMetadata(): Promise<import('../types/index.js').Tool[]> {
    // Try manifest-based loading first (unless explicitly disabled)
    if (process.env.BMAD_USE_MANIFESTS !== 'false') {
      try {
        return await this.manifestCache.getAllTools();
      } catch (error) {
        console.warn(
          'Manifest cache failed for tools, falling back to empty list:',
          error,
        );
      }
    }

    // Fallback: return empty array (tools are optional)
    return [];
  }

  /**
   * List all available tasks with full metadata from task-manifest.csv
   *
   * @returns Promise resolving to array of Task metadata objects
   *
   * @remarks
   * Loads task metadata from the task-manifest.csv file which contains:
   * - name: Task identifier
   * - displayName: Human-readable display name
   * - description: Description of what the task does
   * - module: BMAD module the task belongs to
   * - path: Relative path to task definition file
   * - standalone: Whether task can be executed independently
   */
  async listTasksWithMetadata(): Promise<import('../types/index.js').Task[]> {
    // Try manifest-based loading first (unless explicitly disabled)
    if (process.env.BMAD_USE_MANIFESTS !== 'false') {
      try {
        return await this.manifestCache.getAllTasks();
      } catch (error) {
        console.warn(
          'Manifest cache failed for tasks, falling back to empty list:',
          error,
        );
      }
    }

    // Fallback: return empty array (tasks are optional)
    return [];
  }

  /**
   * List all files from all BMAD sources for MCP resource exposure
   *
   * @returns Promise resolving to array of file objects with relative paths
   *
   * @remarks
   * Recursively walks all BMAD source directories and collects all files.
   * Returns files with their relative paths from the BMAD root for MCP resource URIs.
   *
   * Excludes:
   * - node_modules directories
   * - .git directories
   * - cache/ directories
   * - Hidden files (starting with .)
   *
   * Deduplicates by relative path, so if the same file exists in multiple sources,
   * only the first one found (by priority order) is included.
   *
   * Used by the MCP server to expose all BMAD files as resources.
   */
  async listAllFiles(): Promise<
    Array<{
      relativePath: string;
      fullPath: string;
      source: Resource['source'];
    }>
  > {
    await this.resolveGitRemotes();

    const allFiles: Array<{
      relativePath: string;
      fullPath: string;
      source: Resource['source'];
    }> = [];
    const seenPaths = new Set<string>(); // Deduplicate by relative path

    // Walk project using smart path detection (if mode allows)
    if (this.shouldIncludeSource('project')) {
      const projectPathInfo = this.getProjectBmadPath();
      const projectBmad = projectPathInfo.bmadRoot;
      if (existsSync(projectBmad)) {
        this.walkDir(projectBmad, projectBmad, 'project', allFiles, seenPaths);
      }
    }

    // Walk user ~/.bmad/ (if mode allows)
    if (this.shouldIncludeSource('user')) {
      if (existsSync(this.paths.userBmad)) {
        this.walkDir(
          this.paths.userBmad,
          this.paths.userBmad,
          'user',
          allFiles,
          seenPaths,
        );
      }
    }

    // Walk git remotes (if mode allows)
    if (this.shouldIncludeSource('git')) {
      for (const localPath of this.resolvedGitPaths.values()) {
        const pathInfo = this.detectPathType(localPath);
        this.walkDir(
          pathInfo.bmadRoot,
          pathInfo.bmadRoot,
          'git',
          allFiles,
          seenPaths,
        );
      }
    }

    return allFiles;
  }

  /**
   * Load a file by relative path from BMAD root
   *
   * @param relativePath - Path relative to BMAD root (e.g., 'core/config.yaml')
   * @returns Promise resolving to file content as UTF-8 string
   *
   * @remarks
   * Searches for files in priority order: project → user → git remotes.
   * Used by the MCP ReadResource handler to serve file content.
   *
   * The relative path should not include the 'bmad/' prefix - it's added automatically.
   *
   * @throws Will throw if the file is not found in any BMAD source
   *
   * @example
   * ```typescript
   * const content = await loader.loadFile('core/config.yaml');
   * console.log(content); // YAML configuration content
   * ```
   */
  async loadFile(relativePath: string): Promise<string> {
    await this.resolveGitRemotes();

    const candidates: string[] = [];

    // Project using smart path detection
    const projectPathInfo = this.getProjectBmadPath();
    candidates.push(join(projectPathInfo.bmadRoot, relativePath));

    // User
    candidates.push(join(this.paths.userBmad, relativePath));

    // Git remotes
    for (const localPath of this.resolvedGitPaths.values()) {
      const pathInfo = this.detectPathType(localPath);
      candidates.push(join(pathInfo.bmadRoot, relativePath));
    }

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return readFileSync(candidate, 'utf-8');
      }
    }

    throw new Error(`File not found: ${relativePath}`);
  }

  /**
   * Get configured resource paths for debugging and inspection
   *
   * @returns Copy of the internal paths configuration
   *
   * @remarks
   * Returns the paths used for BMAD content discovery:
   * - projectRoot: Base directory for project-local BMAD
   * - userBmad: User-global BMAD directory (~/.bmad)
   * - gitRemotes: Array of Git remote URLs (if configured)
   *
   * @example
   * ```typescript
   * const paths = loader.getPaths();
   * console.log('Project BMAD:', join(paths.projectRoot, 'bmad'));
   * console.log('User BMAD:', paths.userBmad);
   * ```
   */
  getPaths(): ResourcePaths {
    return { ...this.paths };
  }

  /**
   * Get resolved Git remote paths for debugging
   *
   * @returns Map of Git URLs to their resolved local cache paths
   *
   * @remarks
   * Returns the mapping of Git remote URLs to their local clone/cache directories.
   * Git repositories are cloned lazily on first access and cached for performance.
   *
   * @example
   * ```typescript
   * const gitPaths = loader.getResolvedGitPaths();
   * for (const [url, path] of gitPaths) {
   *   console.log(`${url} -> ${path}`);
   * }
   * ```
   */
  getResolvedGitPaths(): Map<string, string> {
    return new Map(this.resolvedGitPaths);
  }
}
