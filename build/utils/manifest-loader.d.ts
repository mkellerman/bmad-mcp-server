/**
 * Manifest Loader - CSV manifest file parser for BMAD discovery.
 *
 * This module reads CSV manifest files to discover available agents, workflows,
 * and tasks. It does NOT parse the actual agent/workflow files - just reads
 * the manifests for discovery purposes.
 */
import type { Agent, Workflow, Task } from '../types/index.js';
interface SimpleLogger {
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
}
/**
 * Loads and parses BMAD CSV manifest files for resource discovery.
 *
 * Reads manifest files to discover what agents, workflows, and tasks
 * are available. Does not parse or process the actual resource files -
 * that's the LLM's responsibility.
 */
export declare class ManifestLoader {
    private bmadRoot;
    private manifestDir;
    private logger;
    constructor(bmadRoot: string, logger?: SimpleLogger);
    /**
     * Load agent-manifest.csv and return list of agent metadata.
     *
     * @returns List of agent metadata objects
     */
    loadAgentManifest(): Agent[];
    /**
     * Load workflow-manifest.csv and return list of workflow metadata.
     *
     * @returns List of workflow metadata objects
     */
    loadWorkflowManifest(): Workflow[];
    /**
     * Load task-manifest.csv and return list of task metadata.
     *
     * @returns List of task metadata objects
     */
    loadTaskManifest(): Task[];
    /**
     * Internal method to load any CSV manifest file.
     *
     * @param filename Name of manifest file (e.g., "agent-manifest.csv")
     * @returns List of records from CSV, or empty list on error
     */
    private loadManifest;
    /**
     * Get agent metadata by name.
     *
     * @param agentName Agent identifier (e.g., "analyst")
     * @returns Agent metadata object or undefined if not found
     */
    getAgentByName(agentName: string): Agent | undefined;
    /**
     * Get workflow metadata by name.
     *
     * @param workflowName Workflow identifier
     * @returns Workflow metadata object or undefined if not found
     */
    getWorkflowByName(workflowName: string): Workflow | undefined;
}
export {};
//# sourceMappingURL=manifest-loader.d.ts.map