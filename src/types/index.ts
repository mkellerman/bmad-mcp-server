// This file defines TypeScript interfaces and types used throughout the application for type safety.

/**
 * Type definitions for BMAD MCP Server
 */

/**
 * Discovery mode for BMAD path resolution
 * - strict: Only load from git remotes provided as CLI arguments (no local discovery)
 * - local: Only load from project root directory (no user ~/.bmad, no git remotes)
 * - user: Only load from user ~/.bmad directory (no project, no git remotes)
 * - auto: Load from all sources with priority-based resolution (project > user > git)
 */
export type DiscoveryMode = 'strict' | 'local' | 'user' | 'auto';

/**
 * Server configuration options
 *
 * @remarks
 * Controls how the BMAD MCP server discovers and loads BMAD content.
 * Currently focused on path discovery behavior.
 */
export interface ServerConfig {
  /**
   * How the server discovers BMAD installation paths
   *
   * @remarks
   * - 'strict': Only uses git remotes provided as CLI arguments (no local/user discovery)
   * - 'local': Only searches project root directory (no ~/.bmad, no git remotes)
   * - 'user': Only uses ~/.bmad directory (no project, no git remotes)
   * - 'auto': Searches all sources with priority-based resolution (project > user > git) (default)
   *
   * Auto mode provides the best user experience with priority-based merging.
   * Strict mode is useful for isolated testing with specific git sources.
   * Local and user modes are useful for development and debugging specific sources.
   */
  discoveryMode: DiscoveryMode;
}

/**
 * Git URL specification for git+ URLs
 *
 * @remarks
 * Parsed representation of git+ protocol URLs used for remote BMAD content.
 * Supports both HTTPS and SSH protocols with optional subpath targeting.
 *
 * @example
 * ```typescript
 * // git+https://github.com/user/repo.git
 * {
 *   protocol: 'https',
 *   host: 'github.com',
 *   org: 'user',
 *   repo: 'repo',
 *   ref: 'main'
 * }
 *
 * // git+ssh://git@github.com/user/repo.git@v1.0.0/core
 * {
 *   protocol: 'ssh',
 *   host: 'github.com',
 *   org: 'user',
 *   repo: 'repo',
 *   ref: 'v1.0.0',
 *   subpath: 'core'
 * }
 * ```
 */
export interface GitUrlSpec {
  /** Protocol used for Git operations ('https' or 'ssh') */
  protocol: 'https' | 'ssh';

  /** Git server hostname (e.g., 'github.com', 'gitlab.com') */
  host: string;

  /** Organization or user namespace */
  org: string;

  /** Repository name (without .git extension) */
  repo: string;

  /** Git reference: branch name, tag, or commit SHA */
  ref: string;

  /** Optional subpath within the repository to target specific BMAD modules */
  subpath?: string;
}

/**
 * Cache metadata for Git sources
 *
 * @remarks
 * Tracks the state of cloned Git repositories in the local cache.
 * Used to determine when repositories need to be updated or re-cloned.
 * All timestamps are in ISO 8601 format.
 */
export interface GitCacheMetadata {
  /** Original git+ URL that was used to clone this repository */
  sourceUrl: string;

  /** SHA256 hash of the sourceUrl for cache key generation */
  hash: string;

  /** Git reference that was resolved (branch, tag, or commit SHA) */
  ref: string;

  /** Subpath within repository (empty string if targeting repo root) */
  subpath: string;

  /** ISO timestamp of the last successful git pull/fetch operation */
  lastPull: string;

  /** Current commit SHA that the local clone is pointing to */
  currentCommit: string;
}

/**
 * Agent metadata from agent-manifest.csv
 *
 * @remarks
 * Represents an agent entry from the BMAD agent manifest.
 * Contains basic identification and organizational information.
 * Used for agent discovery and module organization.
 */
export interface Agent {
  /** Internal agent identifier (filename without extension) */
  name: string;

  /** Human-readable display name for the agent */
  displayName: string;

  /** Agent title or role description */
  title: string;

  /** Optional icon identifier for UI representation */
  icon?: string;

  /** Primary role or function of the agent */
  role: string;

  /** Optional detailed identity description */
  identity?: string;

  /** Communication style preferences or patterns */
  communicationStyle?: string;

  /** Core principles or behavioral guidelines */
  principles?: string;

  /** BMAD module this agent belongs to (e.g., 'core', 'bmm', 'cis') */
  module: string;

  /** Relative path to the agent file within its module */
  path: string;

  /** Root directory of the BMAD source containing this agent */
  sourceRoot?: string;

  /** Specific location identifier within the source */
  sourceLocation?: string;
}

/**
 * Workflow metadata from workflow-manifest.csv
 *
 * @remarks
 * Represents a workflow entry from the BMAD workflow manifest.
 * Workflows are executable processes that coordinate multiple agents.
 * Used for workflow discovery and execution planning.
 */
export interface Workflow {
  /** Internal workflow identifier (directory name) */
  name: string;

  /** Human-readable description of what the workflow does */
  description: string;

  /** Optional trigger condition or event that starts this workflow */
  trigger?: string;

  /** BMAD module this workflow belongs to */
  module: string;

  /** Relative path to the workflow directory within its module */
  path: string;

  /** Whether this workflow can be executed independently (not scoped to an agent) */
  standalone?: boolean;

  /** Root directory of the BMAD source containing this workflow */
  sourceRoot?: string;

  /** Specific location identifier within the source */
  sourceLocation?: string;
}

/**
 * Tool metadata from tool-manifest.csv
 *
 * @remarks
 * Represents a tool entry from the BMAD tool manifest.
 * Tools are reusable utilities that can be called independently or within workflows.
 * Used for tool discovery and execution.
 */
export interface Tool {
  /** Internal tool identifier */
  name: string;

  /** Human-readable display name for the tool */
  displayName: string;

  /** Human-readable description of what the tool does */
  description: string;

  /** BMAD module this tool belongs to */
  module: string;

  /** Relative path to the tool definition file */
  path: string;

  /** Whether this tool can be executed independently (not scoped to a workflow) */
  standalone: boolean;

  /** Root directory of the BMAD source containing this tool */
  sourceRoot?: string;

  /** Specific location identifier within the source */
  sourceLocation?: string;
}

/**
 * Task metadata from task-manifest.csv
 *
 * @remarks
 * Represents a task entry from the BMAD task manifest.
 * Tasks are individual units of work within workflows.
 * Used for task discovery and workflow composition.
 */
export interface Task {
  /** Internal task identifier */
  name: string;

  /** Human-readable display name for the task */
  displayName: string;

  /** Human-readable description of the task's purpose */
  description: string;

  /** BMAD module this task belongs to */
  module: string;

  /** Relative path to the task definition file */
  path: string;

  /** Whether this task can be executed independently (not scoped to a workflow) */
  standalone: boolean;

  /** Root directory of the BMAD source containing this task */
  sourceRoot?: string;

  /** Specific location identifier within the source */
  sourceLocation?: string;
}

/**
 * Result of input validation
 *
 * @remarks
 * Error codes for BMAD input validation failures.
 * Used by CLI tools and MCP handlers to provide specific error feedback.
 */
export enum ErrorCode {
  /** Too many arguments provided for the command */
  TOO_MANY_ARGUMENTS = 'TOO_MANY_ARGUMENTS',

  /** Invalid number of asterisks in workflow reference */
  INVALID_ASTERISK_COUNT = 'INVALID_ASTERISK_COUNT',

  /** Workflow name is required but missing */
  MISSING_WORKFLOW_NAME = 'MISSING_WORKFLOW_NAME',

  /** Required asterisk (*) is missing from workflow reference */
  MISSING_ASTERISK = 'MISSING_ASTERISK',

  /** Invalid characters found in input */
  INVALID_CHARACTERS = 'INVALID_CHARACTERS',

  /** Non-ASCII characters detected */
  NON_ASCII_CHARACTERS = 'NON_ASCII_CHARACTERS',

  /** Name is too short (minimum length not met) */
  NAME_TOO_SHORT = 'NAME_TOO_SHORT',

  /** Name is too long (maximum length exceeded) */
  NAME_TOO_LONG = 'NAME_TOO_LONG',

  /** Name format does not match expected pattern */
  INVALID_NAME_FORMAT = 'INVALID_NAME_FORMAT',

  /** Referenced workflow does not exist */
  UNKNOWN_WORKFLOW = 'UNKNOWN_WORKFLOW',

  /** Case mismatch between input and known names */
  CASE_MISMATCH = 'CASE_MISMATCH',

  /** Referenced agent does not exist */
  UNKNOWN_AGENT = 'UNKNOWN_AGENT',
}

/**
 * Validation result with detailed error information and suggestions
 *
 * @remarks
 * Comprehensive validation result used by CLI commands and MCP handlers.
 * Provides both error details and helpful suggestions for fixing issues.
 */
export interface ValidationResult {
  /** Whether the input passed validation */
  valid: boolean;

  /** Specific error code if validation failed */
  errorCode?: ErrorCode | string;

  /** Human-readable error message */
  errorMessage?: string;

  /** Suggested corrections or alternatives */
  suggestions?: string[];

  /** Exit code for CLI usage (0 = success, non-zero = error) */
  exitCode: number;

  /** Whether the input is ambiguous and requires clarification */
  requiresDisambiguation?: boolean;

  /** Available options when disambiguation is required */
  disambiguationOptions?: Array<{
    /** Display text for the option */
    display: string;

    /** Actual value to use */
    value: string;

    /** Optional description of what this option does */
    description?: string;
  }>;
}

/**
 * BMAD tool execution result
 *
 * @remarks
 * Comprehensive result structure for BMAD tool operations.
 * Supports different operation types with type-specific result fields.
 * Used by MCP tool handlers to return structured responses.
 */
export interface BMADToolResult {
  /** Whether the operation completed successfully */
  success: boolean;

  /** Type of operation that was performed */
  type?:
    | 'agent' // Agent invocation
    | 'workflow' // Workflow execution
    | 'list' // List/directory operations
    | 'help' // Help/documentation requests
    | 'diagnostic' // System diagnostics
    | 'init' // Initialization operations
    | 'module'; // Module-specific operations

  /** Main content result (for successful operations) */
  content?: string;

  /** Error message (for failed operations) */
  error?: string;

  /** Specific error code for programmatic handling */
  errorCode?: string;

  /** Suggested corrections or next steps */
  suggestions?: string[];

  /** Exit code for CLI compatibility (0 = success) */
  exitCode: number;

  // Agent-specific result fields
  /** Name of the invoked agent */
  agentName?: string;

  /** Display name of the invoked agent */
  displayName?: string;

  // Workflow-specific result fields
  /** Name of the executed workflow */
  name?: string;

  /** Description of the executed workflow */
  description?: string;

  /** Module containing the workflow */
  module?: string;

  /** Path to the workflow definition */
  path?: string;

  /** Raw workflow YAML content */
  workflowYaml?: string;

  /** Execution instructions for the workflow */
  instructions?: string;

  /** Resolved workflow execution context */
  context?: WorkflowContext;

  // List-specific result fields
  /** Type of list operation performed */
  listType?: string;

  /** Number of items in the result */
  count?: number;

  /** Raw data for list operations */
  data?: unknown;

  // Rich structured data for list commands
  /** Structured result data with metadata */
  structuredData?: {
    /** Array of result items */
    items: unknown[];

    /** Summary statistics */
    summary: {
      /** Total number of items */
      total: number;

      /** Optional grouping statistics */
      byGroup?: Record<string, number>;

      /** Optional summary message */
      message?: string;
    };

    /** Additional metadata */
    metadata?: Record<string, unknown>;

    /** Suggested follow-up actions */
    followUpSuggestions?: string[];
  };
}

/**
 * Workflow execution context with resolved paths and manifest data
 *
 * @remarks
 * Comprehensive context object passed to workflow executions.
 * Contains resolved paths, manifest data, and placeholder values for template resolution.
 * Used by workflow engines to understand the execution environment and resolve placeholders.
 */
export interface WorkflowContext {
  // Legacy fields (kept for backward compatibility)
  /** Root directory of the BMAD server installation */
  bmadServerRoot: string;

  /** User's project directory (current working directory) */
  projectRoot: string;

  /** Path to MCP resources directory */
  mcpResources: string;

  /** Path to the agent manifest CSV file */
  agentManifestPath: string;

  /** Parsed agent manifest data */
  agentManifestData: Agent[];

  /** Total number of available agents */
  agentCount: number;

  // Enhanced context for placeholder resolution
  /** Placeholder values for template substitution in workflow files */
  placeholders: {
    /** User's project directory (current working directory) */
    project_root: string;

    /** BMAD installation root directory (git cache or local install) */
    bmad_root: string;

    /** Current workflow's module directory */
    module_root: string;

    /** Path to the module's config.yaml file */
    config_source: string;

    /** Absolute path to the workflow installation directory */
    installed_path: string;

    /** Default output directory for generated files */
    output_folder: string;
  };

  // Module and origin information
  /** Information about the module containing this workflow */
  moduleInfo?: {
    /** Module name (e.g., 'bmm', 'cis', 'core') */
    name: string;

    /** Module version string */
    version?: string;

    /** BMAD framework version */
    bmadVersion?: string;
  };

  /** Information about where this workflow originated from */
  originInfo?: {
    /** Source type that provided this workflow */
    kind: BmadOriginSource;

    /** Human-readable source description */
    displayName: string;

    /** Priority for resolution (higher = preferred) */
    priority: number;
  };

  // Workflow-specific information (added by workflow executor)
  /** Information about the specific workflow being executed */
  workflowInfo?: {
    /** Workflow name (directory name) */
    name: string;

    /** Module containing the workflow */
    module: string;

    /** Absolute path to the workflow.yaml file */
    path: string;

    /** Directory containing all workflow files */
    directory: string;
  };
}

/**
 * Minimal bootstrap data for workflow execution.
 *
 * @remarks
 * Returns only the workflow.yaml configuration.
 * The agent's workflow handler will instruct the LLM to load workflow.xml
 * and other files via bmad-resources tool.
 */
export type WorkflowBootstrap = string;

/**
 * Context provided to LLM for workflow execution.
 *
 * @remarks
 * Minimal injection approach:
 * 1. Agent's workflow handler instructions (tells LLM what to do)
 * 2. workflow.yaml configuration (raw YAML)
 *
 * The agent's workflow handler will guide the LLM to load additional
 * files (workflow.xml, instructions.md, etc.) as needed.
 */
export interface WorkflowExecutionContext {
  /** Workflow name */
  workflow: string;

  /** User's message/request (optional) */
  userContext?: string;

  /** Raw workflow.yaml content (the configuration) */
  workflowConfig: string;

  /** Agent executing this workflow (optional) */
  agent?: string;

  /** Agent-specific workflow handler instructions (optional) */
  agentWorkflowHandler?: string;
}

/**
 * BMAD v6 Master Manifest Types
 *
 * @remarks
 * Type definitions for BMAD v6's master manifest system.
 * Supports multiple origin sources with priority-based resolution.
 */
export type BmadOriginSource = 'project' | 'cli' | 'env' | 'user' | 'package';

/**
 * Represents a BMAD installation origin with metadata
 *
 * @remarks
 * Describes where a BMAD installation was found and its characteristics.
 * Used for priority-based resolution when multiple BMAD sources exist.
 */
export interface BmadOrigin {
  /** Type of source that provided this BMAD installation */
  kind: BmadOriginSource;

  /** Human-readable name for this origin */
  displayName: string;

  /** Absolute path to the BMAD root directory (containing the 'bmad' folder) */
  root: string;

  /** Absolute path to the BMAD manifest directory (bmad/_cfg) */
  manifestDir: string;

  /** Resolution priority (higher numbers = higher priority) */
  priority: number;

  /** Detected BMAD version from the installation */
  version?: 'v4' | 'v6' | 'unknown';
}

/**
 * Information about a BMAD v6 module
 *
 * @remarks
 * Represents a module within a BMAD v6 installation.
 * Contains validation status and configuration information.
 */
export interface V6ModuleInfo {
  /** Module name (e.g., 'bmm', 'cis', 'core') */
  name: string;

  /** Absolute path to the module directory */
  path: string;

  /** Absolute path to the module's config.yaml file */
  configPath: string;

  /** Whether the module configuration is valid */
  configValid: boolean;

  /** List of validation errors (empty if configValid is true) */
  errors: string[];

  /** Module version from config.yaml */
  moduleVersion?: string;

  /** BMAD framework version from config.yaml */
  bmadVersion?: string;

  /** Origin information for this module */
  origin: BmadOrigin;
}

/**
 * Type of BMAD master record
 */
export type MasterKind = 'agent' | 'workflow' | 'task';

/**
 * Base interface for BMAD master manifest records
 *
 * @remarks
 * Common fields shared by all BMAD master records (agents, workflows, tasks).
 * Used for unified handling of different BMAD components in the master manifest.
 */
export interface MasterRecordBase {
  /** Type of BMAD component this record represents */
  kind: MasterKind;

  /** How this record was discovered ('manifest' from CSV, 'filesystem' from scanning) */
  source: 'manifest' | 'filesystem';

  /** Origin information for where this component came from */
  origin: BmadOrigin;

  /** Name of the module containing this component */
  moduleName: string;

  /** Version of the module */
  moduleVersion?: string;

  /** Version of the BMAD framework */
  bmadVersion?: string;

  /** Internal identifier for the component */
  name?: string;

  /** Human-readable display name */
  displayName?: string;

  /** Description of what this component does */
  description?: string;

  /** Path relative to BMAD root (e.g., 'bmad/bmm/agents/analyst.md') */
  bmadRelativePath: string;

  /** Path relative to module root (e.g., 'bmm/agents/analyst.md') */
  moduleRelativePath: string;

  /** Absolute filesystem path to the component */
  absolutePath: string;

  /** Whether the file actually exists on disk */
  exists: boolean;

  /** Verification status of this record */
  status: 'verified' | 'not-in-manifest' | 'no-file-found';
}

/**
 * Complete master record with all fields
 *
 * @remarks
 * Type alias for the complete master record interface.
 * Currently identical to MasterRecordBase but may diverge in the future.
 */
export type MasterRecord = MasterRecordBase;

/**
 * Collection of all BMAD master manifests
 *
 * @remarks
 * Contains all discovered BMAD components organized by type.
 * Used by the master manifest system for unified component discovery.
 */
export interface MasterManifests {
  /** All discovered agents across all origins */
  agents: MasterRecord[];

  /** All discovered workflows across all origins */
  workflows: MasterRecord[];

  /** All discovered tasks across all origins */
  tasks: MasterRecord[];

  /** Information about all discovered modules */
  modules: V6ModuleInfo[];
}

/**
 * Command parsing result
 *
 * @remarks
 * Result of parsing a BMAD command string.
 * Can be a successfully parsed agent/workflow command or a validation error.
 */
export type ParsedCommand =
  | { type: 'agent'; name: string } // Successfully parsed agent command
  | { type: 'workflow'; name: string } // Successfully parsed workflow command
  | { type: 'error'; validation: ValidationResult }; // Parsing failed with validation details

/**
 * User account information
 *
 * @remarks
 * Basic user profile data for BMAD user management.
 * Used in multi-user BMAD installations.
 */
export interface User {
  /** Unique user identifier */
  id: string;

  /** Username for login and display */
  username: string;

  /** User's email address */
  email: string;

  /** Account creation timestamp */
  createdAt: Date;

  /** Last account update timestamp */
  updatedAt: Date;
}

/**
 * Stored prompt or conversation context
 *
 * @remarks
 * Represents a saved prompt or conversation context.
 * Used for prompt management and conversation history.
 */
export interface Prompt {
  /** Unique prompt identifier */
  id: string;

  /** Context identifier this prompt belongs to */
  contextId: string;

  /** The actual prompt content */
  content: string;

  /** When this prompt was created */
  createdAt: Date;

  /** When this prompt was last updated */
  updatedAt: Date;
}

/**
 * Generic API response wrapper
 *
 * @remarks
 * Standard response format for API operations.
 * Provides consistent error handling and success indication.
 *
 * @template T - The type of data returned on success
 */
export interface Response<T> {
  /** Whether the operation was successful */
  success: boolean;

  /** Response data (present only when success is true) */
  data?: T;

  /** Error message (present only when success is false) */
  error?: string;
}
