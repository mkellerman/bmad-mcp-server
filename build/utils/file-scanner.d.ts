/**
 * File Scanner - Discover BMAD assets by scanning the filesystem.
 *
 * Scans directories for agent, workflow, and task files following BMAD conventions.
 * Used by diagnostic tools to detect orphaned files not in manifests.
 */
export interface ScannedFile {
    /** File name without extension */
    name: string;
    /** Full file path relative to bmadRoot */
    path: string;
    /** File type */
    type: 'agent' | 'workflow' | 'task';
    /** Whether file exists in manifest */
    inManifest: boolean;
}
export interface ScanResult {
    /** All discovered agent files */
    agents: ScannedFile[];
    /** All discovered workflow files */
    workflows: ScannedFile[];
    /** All discovered task files */
    tasks: ScannedFile[];
}
/**
 * Scan BMAD directory for agent, workflow, and task files.
 */
export declare class FileScanner {
    private bmadRoot;
    constructor(bmadRoot: string);
    /**
     * Scan for all BMAD assets in the directory.
     */
    scan(): ScanResult;
    /**
     * Scan for agent markdown files.
     * Looks in: bmad/agents/, bmad/bmm/agents/, bmad/core/agents/
     */
    private scanAgents;
    /**
     * Scan for workflow YAML files.
     * Looks in: bmad/workflows/, bmad/bmm/workflows/, bmad/core/workflows/
     */
    private scanWorkflows;
    /**
     * Scan for task XML files.
     * Looks in: bmad/tasks/, bmad/bmm/tasks/, bmad/core/tasks/
     */
    private scanTasks;
    /**
     * Recursively scan directory and call handler for each file.
     */
    private scanDirectory;
    /**
     * Extract agent name from file path.
     * Follows convention: agents/<module>/<agent-name>.md
     */
    private extractAgentName;
    /**
     * Extract workflow name from YAML file.
     * Reads the `name` property from the YAML content.
     */
    private extractWorkflowName;
    /**
     * Extract task name from file path.
     * Follows convention: tasks/<module>/<task-name>.xml
     */
    private extractTaskName;
}
//# sourceMappingURL=file-scanner.d.ts.map