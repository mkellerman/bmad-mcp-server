/**
 * Dynamic Agent Loader - Load agents from remote repositories at runtime.
 *
 * This module provides functionality to:
 * - Parse @remote:path format (e.g., @awesome:agents/analyst)
 * - Load agent files from remote repositories
 * - Cache loaded agents for session duration
 * - Return agents in the same format as local agents
 */

import { GitSourceResolver } from './git-source-resolver.js';
import type { RemoteRegistry } from './remote-registry.js';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import type { BMADToolResult, MasterRecord } from '../types/index.js';
import { getAgentInstructions } from '../tools/common/agent-instructions.js';

/**
 * Parsed remote agent reference
 */
export interface RemoteAgentRef {
  remote: string;
  agentPath: string;
  fullRef: string; // e.g., "@awesome:agents/analyst"
  isModule: boolean; // true if path points to a module directory (not a single agent file)
}

/**
 * Cached agent entry
 */
interface CachedAgent {
  ref: string;
  content: BMADToolResult;
  loadedAt: number;
}

/**
 * In-memory cache for loaded remote agents
 */
class AgentCache {
  private cache = new Map<string, CachedAgent>();
  private maxAge = 60 * 60 * 1000; // 1 hour
  private maxSize = 100; // Max 100 cached agents

  set(ref: string, content: BMADToolResult): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].loadedAt - b[1].loadedAt,
      )[0];
      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }

    this.cache.set(ref, {
      ref,
      content,
      loadedAt: Date.now(),
    });
  }

  get(ref: string): BMADToolResult | undefined {
    const entry = this.cache.get(ref);
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.loadedAt > this.maxAge) {
      this.cache.delete(ref);
      return undefined;
    }

    return entry.content;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Singleton cache instance
const agentCache = new AgentCache();

/**
 * Parse remote agent reference from @remote:path format
 *
 * Examples:
 * - "@awesome:agents/analyst" → { remote: "awesome", agentPath: "agents/analyst", isModule: false }
 * - "@awesome:agents/debug-diana-v6" → { remote: "awesome", agentPath: "agents/debug-diana-v6", isModule: true }
 * - "@awesome:agents/debug-diana-v6/agents/debug" → { remote: "awesome", agentPath: "agents/debug-diana-v6/agents/debug", isModule: false }
 *
 * Detection logic for modules:
 * - Path like "agents/module-name" (2 segments) → module directory
 * - Path like "agents/module-name/agents/agent-name" (4+ segments) → specific agent file
 *
 * @param input - Remote agent reference string
 * @returns Parsed reference or null if invalid format
 */
export function parseRemoteAgentRef(input: string): RemoteAgentRef | null {
  // Must start with @
  if (!input.startsWith('@')) {
    return null;
  }

  // Remove @ and split by first :
  const withoutAt = input.slice(1);
  const colonIndex = withoutAt.indexOf(':');

  if (colonIndex === -1) {
    return null;
  }

  const remote = withoutAt.slice(0, colonIndex);
  const agentPath = withoutAt.slice(colonIndex + 1);

  // Validate parts
  if (!remote || !agentPath) {
    return null;
  }

  // Agent path should start with "agents/"
  if (!agentPath.startsWith('agents/')) {
    return null;
  }

  // Determine if this is a module path or a specific agent file
  // Module: agents/debug-diana-v6 (2 segments)
  // Agent file: agents/debug-diana-v6/agents/debug (4+ segments)
  const pathSegments = agentPath.split('/').filter((s) => s.length > 0);
  const isModule = pathSegments.length === 2;

  return {
    remote,
    agentPath,
    fullRef: input,
    isModule,
  };
}

/**
 * Extract YAML frontmatter from agent markdown file
 *
 * @param content - Raw markdown content
 * @returns Parsed metadata object
 */
export function parseAgentFrontmatter(
  content: string,
): Record<string, unknown> {
  const lines = content.split('\n');

  // Check for YAML frontmatter delimiters
  if (lines[0]?.trim() !== '---') {
    return {};
  }

  const endIndex = lines.slice(1).findIndex((line) => line.trim() === '---');
  if (endIndex === -1) {
    return {};
  }

  const yamlContent = lines.slice(1, endIndex + 1).join('\n');

  try {
    const parsed = yaml.load(yamlContent);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Scanned module resources
 */
export interface ScannedModule {
  modulePath: string;
  moduleName: string;
  agents: MasterRecord[];
  workflows: MasterRecord[];
  tasks: MasterRecord[];
}

/**
 * Scan a module directory for agents, workflows, and tasks
 *
 * Expected structure:
 * - module/agents/*.md
 * - module/workflows/*​/workflow.yaml
 * - module/tasks/*​/task.yaml
 *
 * @param modulePath - Absolute path to the module directory
 * @param moduleName - Name of the module (e.g., "debug-diana-v6")
 * @param sourceLocation - Source description (e.g., "@awesome:agents/debug-diana-v6")
 * @returns Scanned resources
 */
export function scanModuleDirectory(
  modulePath: string,
  moduleName: string,
  sourceLocation: string,
): ScannedModule {
  const agents: MasterRecord[] = [];
  const workflows: MasterRecord[] = [];
  const tasks: MasterRecord[] = [];

  const remoteName = sourceLocation.split(':')[0].replace('@', '');
  const origin = {
    kind: 'package' as const, // Remote modules treated as package-level
    displayName: `Remote: ${remoteName}/${moduleName}`,
    root: modulePath,
    manifestDir: path.join(modulePath, '_cfg'),
    priority: 999, // Low priority for remote modules
    version: 'v6' as const,
  };

  // Scan agents/ directory
  const agentsDir = path.join(modulePath, 'agents');
  if (existsSync(agentsDir)) {
    const files = readdirSync(agentsDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const agentPath = path.join(agentsDir, file);
        const agentName = path.basename(file, '.md');

        agents.push({
          kind: 'agent',
          source: 'filesystem',
          origin,
          moduleName,
          name: agentName,
          bmadRelativePath: `bmad/${moduleName}/agents/${file}`,
          moduleRelativePath: `agents/${file}`,
          absolutePath: agentPath,
          exists: true,
          status: 'verified',
        });
      }
    }
  }

  // Scan workflows/ directory
  const workflowsDir = path.join(modulePath, 'workflows');
  if (existsSync(workflowsDir)) {
    const subdirs = readdirSync(workflowsDir);
    for (const subdir of subdirs) {
      const subdirPath = path.join(workflowsDir, subdir);
      if (statSync(subdirPath).isDirectory()) {
        const workflowFile = path.join(subdirPath, 'workflow.yaml');
        if (existsSync(workflowFile)) {
          workflows.push({
            kind: 'workflow',
            source: 'filesystem',
            origin,
            moduleName,
            name: subdir,
            bmadRelativePath: `bmad/${moduleName}/workflows/${subdir}/workflow.yaml`,
            moduleRelativePath: `workflows/${subdir}/workflow.yaml`,
            absolutePath: workflowFile,
            exists: true,
            status: 'verified',
          });
        }
      }
    }
  }

  // Scan tasks/ directory
  const tasksDir = path.join(modulePath, 'tasks');
  if (existsSync(tasksDir)) {
    const subdirs = readdirSync(tasksDir);
    for (const subdir of subdirs) {
      const subdirPath = path.join(tasksDir, subdir);
      if (statSync(subdirPath).isDirectory()) {
        const taskFile = path.join(subdirPath, 'task.yaml');
        if (existsSync(taskFile)) {
          tasks.push({
            kind: 'task',
            source: 'filesystem',
            origin,
            moduleName,
            name: subdir,
            bmadRelativePath: `bmad/${moduleName}/tasks/${subdir}/task.yaml`,
            moduleRelativePath: `tasks/${subdir}/task.yaml`,
            absolutePath: taskFile,
            exists: true,
            status: 'verified',
          });
        }
      }
    }
  }

  return {
    modulePath,
    moduleName,
    agents,
    workflows,
    tasks,
  };
}

/**
 * Resolve remote URL from registry
 * @internal
 */
function resolveRemoteUrl(
  remote: string,
  registry: RemoteRegistry,
): { url: string } | { error: BMADToolResult } {
  const url = registry.remotes.get(remote);
  if (!url) {
    return {
      error: {
        success: false,
        error: [
          `❌ Unknown Remote: '${remote}'`,
          ``,
          `The remote '${remote}' is not registered.`,
          ``,
          `💡 Try: *list-remotes to see available remotes`,
        ].join('\n'),
        exitCode: 1,
      },
    };
  }
  return { url };
}

/**
 * Clone or pull remote repository
 * @internal
 */
async function cloneRemoteRepository(
  remote: string,
  remoteUrl: string,
): Promise<{ path: string } | { error: BMADToolResult }> {
  try {
    const gitResolver = new GitSourceResolver();
    const path = await gitResolver.resolve(remoteUrl);
    return { path };
  } catch (error) {
    return {
      error: {
        success: false,
        error: [
          `❌ Failed to Clone Remote Repository`,
          ``,
          `Remote: ${remote}`,
          `URL: ${remoteUrl}`,
          `Error: ${(error as Error).message}`,
          ``,
          `💡 Possible fixes:`,
          `  1. Check your internet connection`,
          `  2. Verify the repository URL is accessible`,
          `  3. Check git credentials if it's a private repository`,
        ].join('\n'),
        exitCode: 2,
      },
    };
  }
}

/**
 * Load an entire module from a remote repository
 *
 * This loads the module as a complete BMAD root, scanning for:
 * - Agents in module/agents/
 * - Workflows in module/workflows/
 * - Tasks in module/tasks/
 *
 * @param ref - Parsed remote module reference
 * @param registry - Remote registry with configured remotes
 * @returns BMADToolResult with scanned resources and instructions
 */
export async function loadRemoteModule(
  ref: RemoteAgentRef,
  registry: RemoteRegistry,
): Promise<{ result: BMADToolResult; scanned?: ScannedModule }> {
  // Check cache first
  const cached = agentCache.get(ref.fullRef);
  if (cached) {
    return { result: cached };
  }

  // Resolve remote URL
  const urlResult = resolveRemoteUrl(ref.remote, registry);
  if ('error' in urlResult) {
    return { result: urlResult.error };
  }
  const remoteUrl = urlResult.url;

  // Clone or pull repository
  const repoResult = await cloneRemoteRepository(ref.remote, remoteUrl);
  if ('error' in repoResult) {
    return { result: repoResult.error };
  }
  const localPath = repoResult.path;

  // Construct module directory path
  const modulePath = path.join(localPath, ref.agentPath);

  // Check if module directory exists
  if (!existsSync(modulePath) || !statSync(modulePath).isDirectory()) {
    return {
      result: {
        success: false,
        error: [
          `❌ Module Not Found: '${ref.agentPath}'`,
          ``,
          `Remote: ${ref.remote}`,
          `Repository: ${remoteUrl}`,
          `Expected path: ${ref.agentPath}`,
          ``,
          `💡 Try: *list-agents @${ref.remote} to see available modules`,
        ].join('\n'),
        exitCode: 3,
      },
    };
  }

  // Scan module directory
  const moduleName = path.basename(ref.agentPath);
  const scanned = scanModuleDirectory(modulePath, moduleName, ref.fullRef);

  // Build result message
  const contentParts: string[] = [];
  contentParts.push(`# BMAD Module Loaded: ${moduleName}`);
  contentParts.push(`**Source:** ${ref.remote} (${remoteUrl})`);
  contentParts.push(`**Path:** ${ref.agentPath}\n`);

  contentParts.push(`## Discovered Resources\n`);
  contentParts.push(`**Agents:** ${scanned.agents.length}`);
  if (scanned.agents.length > 0) {
    scanned.agents.forEach((a) => {
      contentParts.push(`  - ${a.name}`);
    });
  }
  contentParts.push('');

  contentParts.push(`**Workflows:** ${scanned.workflows.length}`);
  if (scanned.workflows.length > 0) {
    scanned.workflows.forEach((w) => {
      contentParts.push(`  - *${w.name}`);
    });
  }
  contentParts.push('');

  contentParts.push(`**Tasks:** ${scanned.tasks.length}`);
  if (scanned.tasks.length > 0) {
    scanned.tasks.forEach((t) => {
      contentParts.push(`  - ${t.name}`);
    });
  }
  contentParts.push('');

  contentParts.push(
    `✅ Module resources have been registered and are now available for use.`,
  );
  contentParts.push('');

  if (scanned.agents.length > 0) {
    contentParts.push(`💡 Load an agent: bmad ${scanned.agents[0].name}`);
  }
  if (scanned.workflows.length > 0) {
    contentParts.push(`💡 Run a workflow: bmad *${scanned.workflows[0].name}`);
  }

  const result: BMADToolResult = {
    success: true,
    type: 'module',
    content: contentParts.join('\n'),
    exitCode: 0,
  };

  // Cache the result
  agentCache.set(ref.fullRef, result);

  return { result, scanned };
}

/**
 * Load an agent from a remote repository
 *
 * @param ref - Parsed remote agent reference
 * @param registry - Remote registry with configured remotes
 * @returns BMADToolResult with agent content or error
 */
export async function loadRemoteAgent(
  ref: RemoteAgentRef,
  registry: RemoteRegistry,
): Promise<BMADToolResult> {
  // Check cache first
  const cached = agentCache.get(ref.fullRef);
  if (cached) {
    return cached;
  }

  // Resolve remote URL
  const urlResult = resolveRemoteUrl(ref.remote, registry);
  if ('error' in urlResult) {
    return urlResult.error;
  }
  const remoteUrl = urlResult.url;

  // Clone or pull repository
  const repoResult = await cloneRemoteRepository(ref.remote, remoteUrl);
  if ('error' in repoResult) {
    return repoResult.error;
  }
  const localPath = repoResult.path;

  // Construct agent file path
  const agentFilePath = path.join(localPath, ref.agentPath + '.md');

  // Check if agent file exists
  if (!existsSync(agentFilePath)) {
    return {
      success: false,
      error: [
        `❌ Agent Not Found: '${ref.agentPath}'`,
        ``,
        `Remote: ${ref.remote}`,
        `Repository: ${remoteUrl}`,
        `Expected path: ${ref.agentPath}.md`,
        ``,
        `💡 Try: *list-agents @${ref.remote} to see available agents`,
      ].join('\n'),
      exitCode: 3,
    };
  }

  // Read agent file
  let agentContent: string;
  try {
    agentContent = readFileSync(agentFilePath, 'utf-8');
  } catch (error) {
    return {
      success: false,
      error: [
        `❌ Failed to Read Agent File`,
        ``,
        `Agent: ${ref.agentPath}`,
        `Path: ${agentFilePath}`,
        `Error: ${(error as Error).message}`,
      ].join('\n'),
      exitCode: 4,
    };
  }

  // Parse metadata from frontmatter
  const metadata = parseAgentFrontmatter(agentContent);
  const agentName = path.basename(ref.agentPath);
  const displayName =
    (metadata.displayName as string) || (metadata.name as string) || agentName;
  const title = (metadata.title as string) || 'BMAD Agent';

  // Build result
  const contentParts: string[] = [];
  contentParts.push(`# BMAD Agent: ${displayName}`);
  contentParts.push(`**Title:** ${title}`);
  contentParts.push(`**Source:** ${ref.remote} (${remoteUrl})\n`);
  contentParts.push(agentContent);
  contentParts.push('');
  contentParts.push(getAgentInstructions());

  const result: BMADToolResult = {
    success: true,
    type: 'agent',
    agentName,
    displayName,
    content: contentParts.join('\n'),
    exitCode: 0,
  };

  // Cache the result
  agentCache.set(ref.fullRef, result);

  return result;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: agentCache.size(),
    maxSize: 100,
  };
}

/**
 * Clear the agent cache
 */
export function clearCache(): void {
  agentCache.clear();
}
