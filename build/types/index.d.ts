/**
 * Type definitions for BMAD MCP Server
 */
/**
 * Agent metadata from agent-manifest.csv
 */
export interface Agent {
    name: string;
    displayName: string;
    title: string;
    icon?: string;
    role: string;
    identity?: string;
    communicationStyle?: string;
    principles?: string;
    module: string;
    path: string;
    sourceRoot?: string;
    sourceLocation?: string;
}
/**
 * Workflow metadata from workflow-manifest.csv
 */
export interface Workflow {
    name: string;
    description: string;
    trigger?: string;
    module: string;
    path: string;
    sourceRoot?: string;
    sourceLocation?: string;
}
/**
 * Task metadata from task-manifest.csv
 */
export interface Task {
    name: string;
    description: string;
    module: string;
    path?: string;
    sourceRoot?: string;
    sourceLocation?: string;
}
/**
 * Result of input validation
 */
export interface ValidationResult {
    valid: boolean;
    errorCode?: string;
    errorMessage?: string;
    suggestions?: string[];
    exitCode: number;
}
/**
 * BMAD tool execution result
 */
export interface BMADToolResult {
    success: boolean;
    type?: 'agent' | 'workflow' | 'list' | 'help' | 'diagnostic' | 'init';
    content?: string;
    error?: string;
    errorCode?: string;
    suggestions?: string[];
    exitCode: number;
    agentName?: string;
    displayName?: string;
    name?: string;
    description?: string;
    module?: string;
    path?: string;
    workflowYaml?: string;
    instructions?: string;
    context?: WorkflowContext;
    listType?: string;
    count?: number;
    data?: unknown;
}
/**
 * Workflow execution context with resolved paths and manifest data
 */
export interface WorkflowContext {
    bmadServerRoot: string;
    projectRoot: string;
    mcpResources: string;
    agentManifestPath: string;
    agentManifestData: Agent[];
    agentCount: number;
}
/**
 * Command parsing result
 */
export type ParsedCommand = {
    type: 'agent';
    name: string;
} | {
    type: 'workflow';
    name: string;
} | {
    type: 'error';
    validation: ValidationResult;
};
export interface User {
    id: string;
    username: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Prompt {
    id: string;
    contextId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Response<T> {
    success: boolean;
    data?: T;
    error?: string;
}
//# sourceMappingURL=index.d.ts.map