/**
 * Unified BMAD Tool orchestrator.
 * Thin class delegating to parser, validators, loaders, and tools.
 */
import type { BMADToolResult } from '../../types/index.js';
import type { BmadPathResolution } from '../../utils/bmad-path-resolver.js';
import { MasterManifestService } from '../../services/master-manifest-service.js';
/**
 * Unified BMAD Tool - Main orchestrator for agent and workflow loading.
 *
 * Uses master manifest for resource discovery and FileReader for file loading.
 * Delegates actual loading to specialized loaders (agent-loader, workflow-executor).
 */
export declare class UnifiedBMADTool {
    private bmadRoot;
    private fileReader;
    private agents;
    private workflows;
    private discovery;
    private userBmadPath;
    private projectRoot;
    private masterService;
    constructor(options: {
        bmadRoot: string;
        discovery: BmadPathResolution;
        masterManifestService: MasterManifestService;
    });
    execute(command: string): BMADToolResult;
    /**
     * Handle list commands (*list-agents, *list-workflows, *list-tasks).
     *
     * Queries master manifest and formats results for display.
     *
     * @param cmd - List command string
     * @returns Formatted list result
     */
    private handleListCommand;
    /**
     * Resolve agent name aliases (e.g., "master" → "bmad-master").
     *
     * Note: Alias resolution is currently handled in registry/validators.
     * This method is kept for future extensibility.
     *
     * @param name - Agent name to resolve
     * @returns Canonical agent name
     */
    private resolveAgentAlias;
    /**
     * Load an agent and return its content.
     *
     * Delegates to agent-loader which handles:
     * - Finding agent in manifest
     * - Reading agent markdown file
     * - Reading customization YAML (if exists)
     * - Formatting response
     *
     * @param agentName - Name of agent to load
     * @returns BMADToolResult with agent content
     */
    private loadAgent;
    /**
     * Execute a workflow and return its definition.
     *
     * Delegates to workflow-executor which handles:
     * - Finding workflow in manifest
     * - Reading workflow YAML
     * - Reading workflow instructions (if exists)
     * - Building workflow context
     * - Formatting response
     *
     * @param workflowName - Name of workflow to execute
     * @returns BMADToolResult with workflow content
     */
    private executeWorkflow;
    private formatErrorResponse;
    private buildWorkflowContext;
}
//# sourceMappingURL=orchestrator.d.ts.map