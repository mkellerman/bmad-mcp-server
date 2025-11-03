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
export declare function cloneOrPullRemote(url: string, resolver: GitSourceResolver): Promise<string>;
/**
 * Parse agent metadata from .md file
 *
 * Extracts YAML frontmatter from agent markdown file.
 *
 * @param filePath - Path to agent .md file
 * @returns Parsed agent metadata or null if parsing fails
 */
export declare function parseAgentMetadata(filePath: string): {
    name?: string;
    displayName?: string;
    title?: string;
    description?: string;
} | null;
/**
 * Scan a remote repository for BMAD agents
 *
 * Supports two structures:
 * 1. Marketplace/gallery structure:
 *    - modules/<module-name>/ - v4 style BMAD modules
 *    - agents/<module-name>/ - v6 style agent modules
 * 2. Flat structure:
 *    - agents/*.md - Direct agent files
 *
 * @param repoPath - Path to local repository (cloned remote)
 * @param installedAgents - Set of installed agent names for comparison
 * @returns Array of discovered agents
 */
export declare function scanAgents(repoPath: string, installedAgents?: Set<string>): DiscoveredAgent[];
/**
 * Scan a directory for BMAD modules
 *
 * Looks for subdirectories in bmad/ directory with manifest.yaml files.
 *
 * @param repoPath - Path to local repository
 * @param installedModules - Set of installed module names for comparison
 * @returns Array of discovered modules
 */
export declare function scanModules(repoPath: string, installedModules?: Set<string>): DiscoveredModule[];
/**
 * Discover agents from a remote repository
 *
 * @param remoteName - Name of the remote (e.g., 'awesome')
 * @param remoteRegistry - RemoteRegistry instance
 * @param gitResolver - GitSourceResolver instance
 * @param installedAgents - Set of installed agent names
 * @returns Discovery result with agents
 */
export declare function discoverAgents(remoteName: string, remoteRegistry: RemoteRegistry, gitResolver: GitSourceResolver, installedAgents?: Set<string>): Promise<DiscoveryResult>;
/**
 * Discover modules from a remote repository
 *
 * @param remoteName - Name of the remote (e.g., 'awesome')
 * @param remoteRegistry - RemoteRegistry instance
 * @param gitResolver - GitSourceResolver instance
 * @param installedModules - Set of installed module names
 * @returns Discovery result with modules
 */
export declare function discoverModules(remoteName: string, remoteRegistry: RemoteRegistry, gitResolver: GitSourceResolver, installedModules?: Set<string>): Promise<DiscoveryResult>;
/**
 * Format agent discovery results for display
 *
 * @param result - Discovery result
 * @returns Formatted markdown output
 */
export declare function formatAgentList(result: DiscoveryResult): string;
/**
 * Format module discovery results for display
 *
 * @param result - Discovery result
 * @returns Formatted markdown output
 */
export declare function formatModuleList(result: DiscoveryResult): string;
//# sourceMappingURL=remote-discovery.d.ts.map