/**
 * Unified BMAD Tool - Instruction-based routing for agents and workflows.
 *
 * This module implements a single `bmad` tool that intelligently routes commands:
 * - `bmad` → Load bmad-master agent (default)
 * - `bmad <agent-name>` → Load specified agent
 * - `bmad *<workflow-name>` → Execute specified workflow
 *
 * The tool uses instruction-based routing where the LLM reads instructions
 * in the tool description to understand how to route commands correctly.
 */
import type { BMADToolResult } from '../types/index.js';
import { type BmadPathResolution } from '../utils/bmad-path-resolver.js';
/**
 * Unified BMAD tool handler with instruction-based routing.
 *
 * Handles all BMAD commands through a single entry point:
 * - Agent loading
 * - Workflow execution
 * - Smart error handling with fuzzy matching
 * - Comprehensive validation
 */
export declare class UnifiedBMADTool {
    private bmadRoot;
    private manifestLoader;
    private fileReader;
    private agents;
    private workflows;
    private discovery;
    private packageBmadPath;
    private userBmadPath;
    private projectRoot;
    private manifestDir;
    constructor(options: {
        bmadRoot: string;
        discovery: BmadPathResolution;
    });
    /**
     * Execute unified BMAD command with intelligent routing.
     *
     * @param command Command string to parse and execute
     * @returns Result object with data or error information
     */
    execute(command: string): BMADToolResult;
    /**
     * Parse command to determine type and extract name.
     */
    private parseCommand;
    /**
     * Check for dangerous characters and non-ASCII.
     */
    private checkSecurity;
    /**
     * Validate agent or workflow name.
     */
    private validateName;
    /**
     * Resolve agent name aliases to canonical names.
     */
    private resolveAgentAlias;
    /**
     * Check if name exists in agent manifest (after alias resolution).
     */
    private isAgentName;
    /**
     * Check if name exists in workflow manifest.
     */
    private isWorkflowName;
    /**
     * Get list of all agent names.
     */
    private getAgentNames;
    /**
     * Get list of all workflow names.
     */
    private getWorkflowNames;
    /**
     * Check if name matches a valid name but with wrong case.
     */
    private checkCaseMismatch;
    /**
     * Find closest matching name using fuzzy matching.
     */
    private findClosestMatch;
    /**
     * Load agent prompt content.
     */
    private loadAgent;
    /**
     * List all available agents from agent manifest.
     */
    private listAgents;
    /**
     * List all available workflows from workflow manifest.
     */
    private listWorkflows;
    /**
     * List all available tasks from task manifest.
     */
    private listTasks;
    /**
     * Render a visual health bar for the diagnostic summary
     */
    private renderHealthBar;
    private discover;
    /**
     * Scan a location for BMAD files and compare with ALL manifests across all locations.
     * A file is only considered orphaned if it exists but is NOT in any manifest anywhere.
     */
    private scanLocation;
    /**
     * Format inventory for display.
     */
    private formatInventory;
    /**
     * Format inventory for full detailed display with borders.
     */
    private formatInventoryFull;
    private init;
    private initHelp;
    private performInitialization;
    private resolveInitTarget;
    private expandHomePath;
    private copyBmadTemplate;
    private buildInitSuccessMessage;
    private getLocationStats;
    private formatLocationPath;
    private formatLocationStatus;
    /**
     * Show help and command reference.
     */
    private help;
    /**
     * Execute workflow by loading its configuration and instructions.
     */
    private executeWorkflow;
    /**
     * Format validation error as response object.
     */
    private formatErrorResponse;
    /**
     * Build workflow execution context with resolved paths and manifest data.
     */
    private buildWorkflowContext;
    /**
     * Dynamically resolve workflow placeholders to clarify MCP resource usage.
     */
    private resolveWorkflowPlaceholders;
    /**
     * Get BMAD processing instructions for agents.
     */
    private getAgentInstructions;
    private formatTooManyArgsError;
    private formatDoubleAsteriskError;
    private formatMissingWorkflowNameError;
    private formatMissingAsteriskError;
    private formatDangerousCharsError;
    private formatNonAsciiError;
    private formatNameTooShortError;
    private formatNameTooLongError;
    private formatInvalidFormatError;
    private formatUnknownAgentError;
    private formatUnknownWorkflowError;
    private formatCaseMismatchError;
    private formatAvailableList;
}
//# sourceMappingURL=unified-tool.d.ts.map