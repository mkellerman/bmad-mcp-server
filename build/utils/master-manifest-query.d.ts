/**
 * Master Manifest Query Functions
 *
 * Provides priority-based querying of the master manifest to find agents,
 * workflows, and tasks. Implements the core selection algorithm:
 *
 * 1. Filter by name and exists=true
 * 2. Optional: Filter by module qualifier
 * 3. Sort by priority (ascending - lowest number wins)
 * 4. Return first match (highest priority)
 *
 * This enables project files to override user files to override package files.
 */
import type { MasterManifests, MasterRecord } from '../types/index.js';
/**
 * Find an agent by name with optional module qualifier.
 *
 * Implements priority-based resolution:
 * - Filters to agents with matching name and exists=true
 * - If module specified, further filters by module
 * - Sorts remaining candidates by priority
 * - Returns highest priority match
 *
 * @param manifest - Master manifest containing all resources
 * @param name - Agent name (simple or module-qualified like "bmm/architect")
 * @returns Highest priority matching MasterRecord, or undefined if not found
 *
 * @example
 * // Find by simple name (searches all modules)
 * findAgentByName(manifest, "architect")
 *
 * @example
 * // Find by module-qualified name (searches specific module)
 * findAgentByName(manifest, "bmm/architect")
 */
export declare function findAgentByName(manifest: MasterManifests, name: string): MasterRecord | undefined;
/**
 * Find a workflow by name with optional module qualifier.
 *
 * Same priority-based resolution as findAgentByName but for workflows.
 *
 * @param manifest - Master manifest containing all resources
 * @param name - Workflow name (simple or module-qualified like "core/party-mode")
 * @returns Highest priority matching MasterRecord, or undefined if not found
 *
 * @example
 * findWorkflowByName(manifest, "party-mode")
 * findWorkflowByName(manifest, "core/brainstorming")
 */
export declare function findWorkflowByName(manifest: MasterManifests, name: string): MasterRecord | undefined;
/**
 * Find a task by name with optional module qualifier.
 *
 * Same priority-based resolution as findAgentByName but for tasks.
 *
 * @param manifest - Master manifest containing all resources
 * @param name - Task name (simple or module-qualified)
 * @returns Highest priority matching MasterRecord, or undefined if not found
 */
export declare function findTaskByName(manifest: MasterManifests, name: string): MasterRecord | undefined;
/**
 * Get all agents from manifest (filtered for existing files).
 *
 * Returns all agents that physically exist, sorted by priority within each name group.
 * Useful for listing available agents.
 *
 * @param manifest - Master manifest containing all resources
 * @returns Array of existing agent records
 */
export declare function getAllAgents(manifest: MasterManifests): MasterRecord[];
/**
 * Get all workflows from manifest (filtered for existing files).
 *
 * Returns all workflows that physically exist, sorted by priority within each name group.
 * Useful for listing available workflows.
 *
 * @param manifest - Master manifest containing all resources
 * @returns Array of existing workflow records
 */
export declare function getAllWorkflows(manifest: MasterManifests): MasterRecord[];
/**
 * Get all tasks from manifest (filtered for existing files).
 *
 * Returns all tasks that physically exist, sorted by priority within each name group.
 * Useful for listing available tasks.
 *
 * @param manifest - Master manifest containing all resources
 * @returns Array of existing task records
 */
export declare function getAllTasks(manifest: MasterManifests): MasterRecord[];
/**
 * Get unique agent names from manifest.
 *
 * Returns a deduplicated list of agent names (without module qualifiers).
 * Useful for validation and fuzzy matching.
 *
 * @param manifest - Master manifest containing all resources
 * @returns Array of unique agent names
 */
export declare function getUniqueAgentNames(manifest: MasterManifests): string[];
/**
 * Get unique workflow names from manifest.
 *
 * Returns a deduplicated list of workflow names (without module qualifiers).
 * Useful for validation and fuzzy matching.
 *
 * @param manifest - Master manifest containing all resources
 * @returns Array of unique workflow names
 */
export declare function getUniqueWorkflowNames(manifest: MasterManifests): string[];
/**
 * Get unique task names from manifest.
 *
 * Returns a deduplicated list of task names (without module qualifiers).
 * Useful for validation and fuzzy matching.
 *
 * @param manifest - Master manifest containing all resources
 * @returns Array of unique task names
 */
export declare function getUniqueTaskNames(manifest: MasterManifests): string[];
/**
 * Resolve a file path to an absolute path using the master manifest.
 *
 * Handles multiple path formats:
 * - v6 format: {project-root}/bmad/<module>/<file-path>
 * - v4 format: .bmad-<module>/<file-path>
 * - Relative: <file-path> (searches all modules by priority)
 *
 * Resolution algorithm:
 * 1. Parse path to extract module (if specified) and file path
 * 2. Query master manifest for records matching module and file path
 * 3. Sort by priority, return first match's absolute path
 *
 * @param manifest - Master manifest containing all resources
 * @param requestedPath - The path to resolve (may contain placeholders)
 * @returns Absolute file path, or undefined if not found
 *
 * @example
 * // v6 format with placeholder
 * resolveFilePath(manifest, "{project-root}/bmad/debug/workflows/instrument/workflow.yaml")
 * // → "/path/to/custom/bmad/debug/workflows/instrument/workflow.yaml"
 *
 * @example
 * // v4 format
 * resolveFilePath(manifest, ".bmad-core/tasks/create-doc.md")
 * // → "/path/to/4.44.1/.bmad-core/tasks/create-doc.md"
 *
 * @example
 * // Relative path (searches all modules)
 * resolveFilePath(manifest, "tasks/create-doc.md")
 * // → First match by priority
 */
export declare function resolveFilePath(manifest: MasterManifests, requestedPath: string): string | undefined;
//# sourceMappingURL=master-manifest-query.d.ts.map