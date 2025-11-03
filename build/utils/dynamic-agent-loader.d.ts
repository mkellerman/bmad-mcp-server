/**
 * Dynamic Agent Loader - Load agents from remote repositories at runtime.
 *
 * This module provides functionality to:
 * - Parse @remote:path format (e.g., @awesome:agents/analyst)
 * - Load agent files from remote repositories
 * - Cache loaded agents for session duration
 * - Return agents in the same format as local agents
 */
import type { RemoteRegistry } from './remote-registry.js';
import type { BMADToolResult, MasterRecord } from '../types/index.js';
/**
 * Parsed remote agent reference
 */
export interface RemoteAgentRef {
    remote: string;
    agentPath: string;
    fullRef: string;
    isModule: boolean;
}
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
export declare function parseRemoteAgentRef(input: string): RemoteAgentRef | null;
/**
 * Extract YAML frontmatter from agent markdown file
 *
 * @param content - Raw markdown content
 * @returns Parsed metadata object
 */
export declare function parseAgentFrontmatter(content: string): Record<string, unknown>;
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
export declare function scanModuleDirectory(modulePath: string, moduleName: string, sourceLocation: string): ScannedModule;
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
export declare function loadRemoteModule(ref: RemoteAgentRef, registry: RemoteRegistry): Promise<{
    result: BMADToolResult;
    scanned?: ScannedModule;
}>;
/**
 * Load an agent from a remote repository
 *
 * @param ref - Parsed remote agent reference
 * @param registry - Remote registry with configured remotes
 * @returns BMADToolResult with agent content or error
 */
export declare function loadRemoteAgent(ref: RemoteAgentRef, registry: RemoteRegistry): Promise<BMADToolResult>;
/**
 * Get cache statistics
 */
export declare function getCacheStats(): {
    size: number;
    maxSize: number;
};
/**
 * Clear the agent cache
 */
export declare function clearCache(): void;
//# sourceMappingURL=dynamic-agent-loader.d.ts.map