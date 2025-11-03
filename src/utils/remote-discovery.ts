/**
 * Remote Discovery - Discover and list agents/modules from remote repositories.
 *
 * This module provides functionality to:
 * - Clone or pull remote BMAD repositories using git cache
 * - Scan for available agents and modules
 * - Parse agent/module metadata
 * - Format discovery results for display
 */

import { GitSourceResolver } from './git-source-resolver.js';
import { RemoteRegistry } from './remote-registry.js';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

/**
 * Metadata for a discovered agent
 */
export interface DiscoveredAgent {
  name: string;
  displayName?: string;
  title?: string;
  description?: string;
  path: string;
  installed: boolean;
}

/**
 * Metadata for a discovered module
 */
export interface DiscoveredModule {
  name: string;
  description?: string;
  version?: string;
  path: string;
  agentCount: number;
  workflowCount: number;
  installed: boolean;
}

/**
 * Result of a remote discovery operation
 */
export interface DiscoveryResult {
  remote: string;
  url: string;
  localPath: string;
  agents?: DiscoveredAgent[];
  modules?: DiscoveredModule[];
  error?: string;
}

/**
 * Clone or pull a remote repository to local cache
 *
 * @param url - Git URL to clone/pull
 * @param resolver - GitSourceResolver instance for cache management
 * @returns Local path to the cached repository
 * @throws Error if git operation fails
 */
export async function cloneOrPullRemote(
  url: string,
  resolver: GitSourceResolver,
): Promise<string> {
  try {
    return await resolver.resolve(url);
  } catch (error) {
    throw new Error(
      `Failed to clone/pull ${url}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Parse agent metadata from .md file
 *
 * Extracts YAML frontmatter from agent markdown file.
 *
 * @param filePath - Path to agent .md file
 * @returns Parsed agent metadata or null if parsing fails
 */
export function parseAgentMetadata(filePath: string): {
  name?: string;
  displayName?: string;
  title?: string;
  description?: string;
} | null {
  try {
    const content = readFileSync(filePath, 'utf-8');

    // Extract YAML frontmatter (between --- markers)
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return null;
    }

    const yamlContent = frontmatterMatch[1];
    const metadata = yaml.load(yamlContent) as Record<string, unknown>;

    return {
      name: typeof metadata.name === 'string' ? metadata.name : undefined,
      displayName:
        typeof metadata['display-name'] === 'string'
          ? metadata['display-name']
          : undefined,
      title: typeof metadata.title === 'string' ? metadata.title : undefined,
      description:
        typeof metadata.description === 'string'
          ? metadata.description
          : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Scan a directory for BMAD agents
 *
 * Looks for .md files in agents/ directory and parses their metadata.
 *
 * @param repoPath - Path to local repository
 * @param installedAgents - Set of installed agent names for comparison
 * @returns Array of discovered agents
 */
export function scanAgents(
  repoPath: string,
  installedAgents: Set<string> = new Set(),
): DiscoveredAgent[] {
  const agentsPath = path.join(repoPath, 'agents');

  if (!existsSync(agentsPath)) {
    return [];
  }

  const agents: DiscoveredAgent[] = [];

  try {
    const entries = readdirSync(agentsPath);

    for (const entry of entries) {
      const fullPath = path.join(agentsPath, entry);
      const stat = statSync(fullPath);

      // Only process .md files
      if (stat.isFile() && entry.endsWith('.md')) {
        const metadata = parseAgentMetadata(fullPath);

        // Use filename (without .md) as fallback name
        const fileName = entry.replace(/\.md$/, '');
        const agentName = metadata?.name || fileName;

        agents.push({
          name: agentName,
          displayName: metadata?.displayName,
          title: metadata?.title,
          description: metadata?.description,
          path: fullPath,
          installed: installedAgents.has(agentName),
        });
      }
    }
  } catch {
    // Return empty array if scan fails
    return [];
  }

  return agents.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Parse module manifest from manifest.yaml
 *
 * @param manifestPath - Path to module manifest.yaml file
 * @returns Parsed manifest data or null if parsing fails
 */
function parseModuleManifest(manifestPath: string): {
  name?: string;
  description?: string;
  version?: string;
} | null {
  try {
    const content = readFileSync(manifestPath, 'utf-8');
    const manifest = yaml.load(content) as Record<string, unknown>;

    return {
      name: typeof manifest.name === 'string' ? manifest.name : undefined,
      description:
        typeof manifest.description === 'string'
          ? manifest.description
          : undefined,
      version:
        typeof manifest.version === 'string' ? manifest.version : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Count items in a directory
 *
 * @param dirPath - Directory path to scan
 * @param extension - File extension to filter by (e.g., '.md')
 * @returns Count of matching files
 */
function countFiles(dirPath: string, extension: string): number {
  if (!existsSync(dirPath)) {
    return 0;
  }

  try {
    const entries = readdirSync(dirPath);
    return entries.filter((entry) => {
      const fullPath = path.join(dirPath, entry);
      const stat = statSync(fullPath);
      return stat.isFile() && entry.endsWith(extension);
    }).length;
  } catch {
    return 0;
  }
}

/**
 * Scan a directory for BMAD modules
 *
 * Looks for subdirectories in bmad/ directory with manifest.yaml files.
 *
 * @param repoPath - Path to local repository
 * @param installedModules - Set of installed module names for comparison
 * @returns Array of discovered modules
 */
export function scanModules(
  repoPath: string,
  installedModules: Set<string> = new Set(),
): DiscoveredModule[] {
  const bmadPath = path.join(repoPath, 'bmad');

  if (!existsSync(bmadPath)) {
    return [];
  }

  const modules: DiscoveredModule[] = [];

  try {
    const entries = readdirSync(bmadPath);

    for (const entry of entries) {
      const modulePath = path.join(bmadPath, entry);
      const stat = statSync(modulePath);

      // Only process directories
      if (stat.isDirectory()) {
        const manifestPath = path.join(modulePath, 'manifest.yaml');

        if (existsSync(manifestPath)) {
          const metadata = parseModuleManifest(manifestPath);

          // Use directory name as fallback
          const moduleName = metadata?.name || entry;

          // Count agents and workflows
          const agentCount = countFiles(path.join(modulePath, 'agents'), '.md');
          const workflowCount = countFiles(
            path.join(modulePath, 'workflows'),
            '.yaml',
          );

          modules.push({
            name: moduleName,
            description: metadata?.description,
            version: metadata?.version,
            path: modulePath,
            agentCount,
            workflowCount,
            installed: installedModules.has(moduleName),
          });
        }
      }
    }
  } catch {
    // Return empty array if scan fails
    return [];
  }

  return modules.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Discover agents from a remote repository
 *
 * @param remoteName - Name of the remote (e.g., 'awesome')
 * @param remoteRegistry - RemoteRegistry instance
 * @param gitResolver - GitSourceResolver instance
 * @param installedAgents - Set of installed agent names
 * @returns Discovery result with agents
 */
export async function discoverAgents(
  remoteName: string,
  remoteRegistry: RemoteRegistry,
  gitResolver: GitSourceResolver,
  installedAgents: Set<string> = new Set(),
): Promise<DiscoveryResult> {
  try {
    // Resolve remote to URL
    const url = remoteRegistry.remotes.get(remoteName);
    if (!url) {
      return {
        remote: remoteName,
        url: '',
        localPath: '',
        error: `Remote '${remoteName}' not found. Use *list-remotes to see available remotes.`,
      };
    }

    // Clone or pull repository
    const localPath = await cloneOrPullRemote(url, gitResolver);

    // Scan for agents
    const agents = scanAgents(localPath, installedAgents);

    return {
      remote: remoteName,
      url,
      localPath,
      agents,
    };
  } catch (error) {
    return {
      remote: remoteName,
      url: remoteRegistry.remotes.get(remoteName) || '',
      localPath: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Discover modules from a remote repository
 *
 * @param remoteName - Name of the remote (e.g., 'awesome')
 * @param remoteRegistry - RemoteRegistry instance
 * @param gitResolver - GitSourceResolver instance
 * @param installedModules - Set of installed module names
 * @returns Discovery result with modules
 */
export async function discoverModules(
  remoteName: string,
  remoteRegistry: RemoteRegistry,
  gitResolver: GitSourceResolver,
  installedModules: Set<string> = new Set(),
): Promise<DiscoveryResult> {
  try {
    // Resolve remote to URL
    const url = remoteRegistry.remotes.get(remoteName);
    if (!url) {
      return {
        remote: remoteName,
        url: '',
        localPath: '',
        error: `Remote '${remoteName}' not found. Use *list-remotes to see available remotes.`,
      };
    }

    // Clone or pull repository
    const localPath = await cloneOrPullRemote(url, gitResolver);

    // Scan for modules
    const modules = scanModules(localPath, installedModules);

    return {
      remote: remoteName,
      url,
      localPath,
      modules,
    };
  } catch (error) {
    return {
      remote: remoteName,
      url: remoteRegistry.remotes.get(remoteName) || '',
      localPath: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Format agent discovery results for display
 *
 * @param result - Discovery result
 * @returns Formatted markdown output
 */
export function formatAgentList(result: DiscoveryResult): string {
  const lines: string[] = [];

  lines.push(`# Remote Agents: @${result.remote}\n`);

  if (result.error) {
    lines.push(`❌ **Error:** ${result.error}\n`);
    return lines.join('\n');
  }

  lines.push(`**Repository:** ${result.url}`);
  lines.push(`**Local Cache:** \`${result.localPath}\`\n`);

  const agents = result.agents || [];

  if (agents.length === 0) {
    lines.push('*No agents found in this repository.*\n');
    return lines.join('\n');
  }

  lines.push(`**Found ${agents.length} agent(s):**\n`);

  for (const agent of agents) {
    const statusIcon = agent.installed ? '✅' : '📦';
    const status = agent.installed ? 'Installed' : 'Available';

    lines.push(`### ${statusIcon} ${agent.name}`);

    if (agent.displayName) {
      lines.push(`**Display Name:** ${agent.displayName}`);
    }

    if (agent.title) {
      lines.push(`**Title:** ${agent.title}`);
    }

    if (agent.description) {
      lines.push(`**Description:** ${agent.description}`);
    }

    lines.push(`**Status:** ${status}`);
    lines.push(`**Path:** \`${agent.path}\`\n`);
  }

  lines.push('\n**Usage:**');
  lines.push(`\`\`\`
bmad @${result.remote}:agents/{agent-name}
\`\`\`\n`);

  return lines.join('\n');
}

/**
 * Format module discovery results for display
 *
 * @param result - Discovery result
 * @returns Formatted markdown output
 */
export function formatModuleList(result: DiscoveryResult): string {
  const lines: string[] = [];

  lines.push(`# Remote Modules: @${result.remote}\n`);

  if (result.error) {
    lines.push(`❌ **Error:** ${result.error}\n`);
    return lines.join('\n');
  }

  lines.push(`**Repository:** ${result.url}`);
  lines.push(`**Local Cache:** \`${result.localPath}\`\n`);

  const modules = result.modules || [];

  if (modules.length === 0) {
    lines.push('*No modules found in this repository.*\n');
    return lines.join('\n');
  }

  lines.push(`**Found ${modules.length} module(s):**\n`);

  for (const mod of modules) {
    const statusIcon = mod.installed ? '✅' : '📦';
    const status = mod.installed ? 'Installed' : 'Available';

    lines.push(`### ${statusIcon} ${mod.name}`);

    if (mod.version) {
      lines.push(`**Version:** ${mod.version}`);
    }

    if (mod.description) {
      lines.push(`**Description:** ${mod.description}`);
    }

    lines.push(
      `**Content:** ${mod.agentCount} agents, ${mod.workflowCount} workflows`,
    );
    lines.push(`**Status:** ${status}`);
    lines.push(`**Path:** \`${mod.path}\`\n`);
  }

  lines.push('\n**Usage:**');
  lines.push(`\`\`\`
bmad @${result.remote}:agents/{agent-name}
bmad @${result.remote}:*{workflow-name}
\`\`\`\n`);

  return lines.join('\n');
}
