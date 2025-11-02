/**
 * Type definitions for BMAD MCP Server
 */
/**
 * Discovery mode for BMAD path resolution
 * - auto: Recursive search with priority-based resolution (default)
 * - strict: Exact paths only, no discovery, fail fast
 */
export type DiscoveryMode = 'auto' | 'strict';
/**
 * Server configuration options
 */
export interface ServerConfig {
    discoveryMode: DiscoveryMode;
}
/**
 * Git URL specification for git+ URLs
 */
export interface GitUrlSpec {
    protocol: 'https' | 'ssh';
    host: string;
    org: string;
    repo: string;
    ref: string;
    subpath?: string;
}
/**
 * Cache metadata for Git sources
 */
export interface GitCacheMetadata {
    sourceUrl: string;
    hash: string;
    ref: string;
    subpath: string;
    lastPull: string;
    currentCommit: string;
}
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
export declare enum ErrorCode {
    TOO_MANY_ARGUMENTS = "TOO_MANY_ARGUMENTS",
    INVALID_ASTERISK_COUNT = "INVALID_ASTERISK_COUNT",
    MISSING_WORKFLOW_NAME = "MISSING_WORKFLOW_NAME",
    MISSING_ASTERISK = "MISSING_ASTERISK",
    INVALID_CHARACTERS = "INVALID_CHARACTERS",
    NON_ASCII_CHARACTERS = "NON_ASCII_CHARACTERS",
    NAME_TOO_SHORT = "NAME_TOO_SHORT",
    NAME_TOO_LONG = "NAME_TOO_LONG",
    INVALID_NAME_FORMAT = "INVALID_NAME_FORMAT",
    UNKNOWN_WORKFLOW = "UNKNOWN_WORKFLOW",
    CASE_MISMATCH = "CASE_MISMATCH",
    UNKNOWN_AGENT = "UNKNOWN_AGENT"
}
export interface ValidationResult {
    valid: boolean;
    errorCode?: ErrorCode | string;
    errorMessage?: string;
    suggestions?: string[];
    exitCode: number;
    requiresDisambiguation?: boolean;
    disambiguationOptions?: Array<{
        display: string;
        value: string;
        description?: string;
    }>;
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
    structuredData?: {
        items: unknown[];
        summary: {
            total: number;
            byGroup?: Record<string, number>;
            message?: string;
        };
        metadata?: Record<string, unknown>;
        followUpSuggestions?: string[];
    };
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
 * BMAD v6 Master Manifest Types
 */
export type BmadOriginSource = 'project' | 'cli' | 'env' | 'user' | 'package';
export interface BmadOrigin {
    kind: BmadOriginSource;
    displayName: string;
    root: string;
    manifestDir: string;
    priority: number;
    version?: 'v4' | 'v6' | 'unknown';
}
export interface V6ModuleInfo {
    name: string;
    path: string;
    configPath: string;
    configValid: boolean;
    errors: string[];
    moduleVersion?: string;
    bmadVersion?: string;
    origin: BmadOrigin;
}
export type MasterKind = 'agent' | 'workflow' | 'task';
export interface MasterRecordBase {
    kind: MasterKind;
    source: 'manifest' | 'filesystem';
    origin: BmadOrigin;
    moduleName: string;
    moduleVersion?: string;
    bmadVersion?: string;
    name?: string;
    displayName?: string;
    description?: string;
    bmadRelativePath: string;
    moduleRelativePath: string;
    absolutePath: string;
    exists: boolean;
    status: 'verified' | 'not-in-manifest' | 'no-file-found';
}
export type MasterRecord = MasterRecordBase;
export interface MasterManifests {
    agents: MasterRecord[];
    workflows: MasterRecord[];
    tasks: MasterRecord[];
    modules: V6ModuleInfo[];
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