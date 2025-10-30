// This file defines TypeScript interfaces and types used throughout the application for type safety.

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
export enum ErrorCode {
  TOO_MANY_ARGUMENTS = 'TOO_MANY_ARGUMENTS',
  INVALID_ASTERISK_COUNT = 'INVALID_ASTERISK_COUNT',
  MISSING_WORKFLOW_NAME = 'MISSING_WORKFLOW_NAME',
  MISSING_ASTERISK = 'MISSING_ASTERISK',
  INVALID_CHARACTERS = 'INVALID_CHARACTERS',
  NON_ASCII_CHARACTERS = 'NON_ASCII_CHARACTERS',
  NAME_TOO_SHORT = 'NAME_TOO_SHORT',
  NAME_TOO_LONG = 'NAME_TOO_LONG',
  INVALID_NAME_FORMAT = 'INVALID_NAME_FORMAT',
  UNKNOWN_WORKFLOW = 'UNKNOWN_WORKFLOW',
  CASE_MISMATCH = 'CASE_MISMATCH',
  UNKNOWN_AGENT = 'UNKNOWN_AGENT',
}

export interface ValidationResult {
  valid: boolean;
  errorCode?: ErrorCode | string;
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
  // Agent-specific fields
  agentName?: string;
  displayName?: string;
  // Workflow-specific fields
  name?: string;
  description?: string;
  module?: string;
  path?: string;
  workflowYaml?: string;
  instructions?: string;
  context?: WorkflowContext;
  // List-specific fields
  listType?: string;
  count?: number;
  data?: unknown;
  // Rich structured data for list commands
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
  root: string; // absolute path to bmad root (the 'bmad' folder)
  manifestDir: string; // absolute path to bmad/_cfg
  priority: number;
  version?: 'v4' | 'v6' | 'unknown'; // detected version from finder
}

export interface V6ModuleInfo {
  name: string;
  path: string; // absolute path to module directory
  configPath: string; // absolute path to module/config.yaml
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
  bmadRelativePath: string; // e.g., bmad/bmm/agents/analyst.md
  moduleRelativePath: string; // e.g., bmm/agents/analyst.md
  absolutePath: string;
  exists: boolean; // for csv source this can be false (no-file-found)
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
export type ParsedCommand =
  | { type: 'agent'; name: string }
  | { type: 'workflow'; name: string }
  | { type: 'error'; validation: ValidationResult };

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
