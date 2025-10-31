/**
 * Multi-Source BMAD Loader
 *
 * Loads agents and workflows from multiple BMAD installations (v6 and v4)
 * with conflict detection and first-source-wins resolution.
 */
export interface MultiSourceConfig {
    sources: string[];
    includeInvalid?: boolean;
}
export interface SourceMetadata {
    path: string;
    type: 'v4' | 'v6' | 'unknown';
    version?: string;
    priority: number;
    isValid: boolean;
    error?: string;
    modules?: string[];
    expansionPacks?: string[];
}
export interface AgentSource {
    name: string;
    displayName?: string;
    description?: string;
    module?: string;
    path: string;
    content?: string;
    source: SourceMetadata;
}
export interface WorkflowSource {
    name: string;
    displayName?: string;
    description?: string;
    module?: string;
    path: string;
    workflowXml?: string;
    instructions?: string;
    source: SourceMetadata;
}
export interface ConflictInfo {
    name: string;
    type: 'agent' | 'workflow';
    winningSource: SourceMetadata;
    conflictingSources: SourceMetadata[];
}
export interface ConflictReport {
    agents: ConflictInfo[];
    workflows: ConflictInfo[];
}
/**
 * Multi-source BMAD loader with conflict detection
 */
export declare class MultiSourceLoader {
    private sources;
    private agentConflicts;
    private workflowConflicts;
    private includeInvalid;
    constructor(config: MultiSourceConfig);
    private initializeSources;
    /**
     * Get the number of valid sources
     */
    getSourceCount(): number;
    /**
     * Get detailed information about all sources
     */
    getSourceInfo(): SourceMetadata[];
    /**
     * Load agents from all sources with conflict detection
     */
    loadAgents(): AgentSource[];
    /**
     * Load workflows from all sources with conflict detection
     */
    loadWorkflows(): WorkflowSource[];
    /**
     * Get conflict report
     */
    getConflicts(): ConflictReport;
    /**
     * Load agents from a specific source
     */
    private loadAgentsFromSource;
    /**
     * Load workflows from a specific source
     */
    private loadWorkflowsFromSource;
    /**
     * Load agents from v6 structure
     */
    private loadV6Agents;
    /**
     * Load agents from v4 structure
     */
    private loadV4Agents;
    /**
     * Load workflows from v6 structure
     */
    private loadV6Workflows;
    /**
     * Load workflows from v4 structure
     */
    private loadV4Workflows;
    /**
     * Track a conflict when duplicate name is found
     */
    private trackConflict;
    /**
     * Find the winning source for a given name (first occurrence)
     */
    private findWinningSource;
}
//# sourceMappingURL=multi-source-loader.d.ts.map