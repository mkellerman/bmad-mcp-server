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
import { parseQualifiedName } from './name-parser.js';
import { parseBmadPath, normalizePath } from './path-parser.js';
import logger from './logger.js';
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
export function findAgentByName(manifest, name) {
    // Parse the name (may include module qualifier)
    const parsed = parseQualifiedName(name);
    logger.info(`🔍 Searching for agent: "${name}"`);
    // Step 1: Filter by name and exists=true
    let candidates = manifest.agents.filter((a) => a.name === parsed.name && a.exists === true);
    logger.info(`   Found ${candidates.length} candidates for name "${parsed.name}"`);
    // Step 2: If module specified, filter by module
    if (parsed.module) {
        candidates = candidates.filter((a) => a.moduleName === parsed.module);
        logger.info(`   After module filter "${parsed.module}": ${candidates.length} candidates`);
    }
    // Step 3: No matches found
    if (candidates.length === 0) {
        logger.warn(`   ❌ No matches found for agent "${name}"`);
        return undefined;
    }
    // Step 4: Sort by priority (ascending - lowest number = highest priority)
    candidates.sort((a, b) => a.origin.priority - b.origin.priority);
    // Step 5: Return highest priority match
    const selected = candidates[0];
    logger.info(`   ✅ Selected: "${selected.name}" from module "${selected.moduleName}" ` +
        `at ${selected.origin.displayName} (${selected.origin.kind}, priority=${selected.origin.priority})`);
    return selected;
}
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
export function findWorkflowByName(manifest, name) {
    // Parse the name (may include module qualifier)
    const parsed = parseQualifiedName(name);
    logger.info(`🔍 Searching for workflow: "${name}"`);
    // Step 1: Filter by name and exists=true
    let candidates = manifest.workflows.filter((w) => w.name === parsed.name && w.exists === true);
    logger.info(`   Found ${candidates.length} candidates for name "${parsed.name}"`);
    // Step 2: If module specified, filter by module
    if (parsed.module) {
        candidates = candidates.filter((w) => w.moduleName === parsed.module);
        logger.info(`   After module filter "${parsed.module}": ${candidates.length} candidates`);
    }
    // Step 3: No matches found
    if (candidates.length === 0) {
        logger.warn(`   ❌ No matches found for workflow "${name}"`);
        return undefined;
    }
    // Step 4: Sort by priority (ascending - lowest number = highest priority)
    candidates.sort((a, b) => a.origin.priority - b.origin.priority);
    // Step 5: Return highest priority match
    const selected = candidates[0];
    logger.info(`   ✅ Selected: "${selected.name}" from module "${selected.moduleName}" ` +
        `at ${selected.origin.displayName} (${selected.origin.kind}, priority=${selected.origin.priority})`);
    return selected;
}
/**
 * Find a task by name with optional module qualifier.
 *
 * Same priority-based resolution as findAgentByName but for tasks.
 *
 * @param manifest - Master manifest containing all resources
 * @param name - Task name (simple or module-qualified)
 * @returns Highest priority matching MasterRecord, or undefined if not found
 */
export function findTaskByName(manifest, name) {
    // Parse the name (may include module qualifier)
    const parsed = parseQualifiedName(name);
    logger.info(`🔍 Searching for task: "${name}"`);
    // Step 1: Filter by name and exists=true
    let candidates = manifest.tasks.filter((t) => t.name === parsed.name && t.exists === true);
    logger.info(`   Found ${candidates.length} candidates for name "${parsed.name}"`);
    // Step 2: If module specified, filter by module
    if (parsed.module) {
        candidates = candidates.filter((t) => t.moduleName === parsed.module);
        logger.info(`   After module filter "${parsed.module}": ${candidates.length} candidates`);
    }
    // Step 3: No matches found
    if (candidates.length === 0) {
        logger.warn(`   ❌ No matches found for task "${name}"`);
        return undefined;
    }
    // Step 4: Sort by priority (ascending - lowest number = highest priority)
    candidates.sort((a, b) => a.origin.priority - b.origin.priority);
    // Step 5: Return highest priority match
    const selected = candidates[0];
    logger.info(`   ✅ Selected: "${selected.name}" from module "${selected.moduleName}" ` +
        `at ${selected.origin.displayName} (${selected.origin.kind}, priority=${selected.origin.priority})`);
    return selected;
}
/**
 * Get all agents from manifest (filtered for existing files).
 *
 * Returns all agents that physically exist, sorted by priority within each name group.
 * Useful for listing available agents.
 *
 * @param manifest - Master manifest containing all resources
 * @returns Array of existing agent records
 */
export function getAllAgents(manifest) {
    return manifest.agents.filter((a) => a.exists === true);
}
/**
 * Get all workflows from manifest (filtered for existing files).
 *
 * Returns all workflows that physically exist, sorted by priority within each name group.
 * Useful for listing available workflows.
 *
 * @param manifest - Master manifest containing all resources
 * @returns Array of existing workflow records
 */
export function getAllWorkflows(manifest) {
    return manifest.workflows.filter((w) => w.exists === true);
}
/**
 * Get all tasks from manifest (filtered for existing files).
 *
 * Returns all tasks that physically exist, sorted by priority within each name group.
 * Useful for listing available tasks.
 *
 * @param manifest - Master manifest containing all resources
 * @returns Array of existing task records
 */
export function getAllTasks(manifest) {
    return manifest.tasks.filter((t) => t.exists === true);
}
/**
 * Get unique agent names from manifest.
 *
 * Returns a deduplicated list of agent names (without module qualifiers).
 * Useful for validation and fuzzy matching.
 *
 * @param manifest - Master manifest containing all resources
 * @returns Array of unique agent names
 */
export function getUniqueAgentNames(manifest) {
    const agents = getAllAgents(manifest);
    const names = agents.map((a) => a.name || '').filter((n) => n !== '');
    return Array.from(new Set(names));
}
/**
 * Get unique workflow names from manifest.
 *
 * Returns a deduplicated list of workflow names (without module qualifiers).
 * Useful for validation and fuzzy matching.
 *
 * @param manifest - Master manifest containing all resources
 * @returns Array of unique workflow names
 */
export function getUniqueWorkflowNames(manifest) {
    const workflows = getAllWorkflows(manifest);
    const names = workflows.map((w) => w.name || '').filter((n) => n !== '');
    return Array.from(new Set(names));
}
/**
 * Get unique task names from manifest.
 *
 * Returns a deduplicated list of task names (without module qualifiers).
 * Useful for validation and fuzzy matching.
 *
 * @param manifest - Master manifest containing all resources
 * @returns Array of unique task names
 */
export function getUniqueTaskNames(manifest) {
    const tasks = getAllTasks(manifest);
    const names = tasks.map((t) => t.name || '').filter((n) => n !== '');
    return Array.from(new Set(names));
}
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
export function resolveFilePath(manifest, requestedPath) {
    // Parse the path to extract module and file path
    const parsed = parseBmadPath(requestedPath);
    logger.info(`🔍 Resolving file path: "${requestedPath}"`);
    logger.info(`   Parsed: module="${parsed.module ?? 'ANY'}", filePath="${parsed.filePath}", format=${parsed.format}`);
    // Collect all records from all resource types (agents, workflows, tasks)
    const allRecords = [
        ...manifest.agents,
        ...manifest.workflows,
        ...manifest.tasks,
    ];
    // Step 1: Filter by file path match and exists=true
    let candidates = allRecords.filter((record) => {
        if (!record.exists)
            return false;
        // Check if the record's path ends with the requested file path
        // This handles both moduleRelativePath and bmadRelativePath
        const recordPath = record.moduleRelativePath || record.bmadRelativePath || '';
        const normalized = normalizePath(parsed.filePath);
        return recordPath.endsWith(normalized) || recordPath === parsed.filePath;
    });
    logger.info(`   Found ${candidates.length} candidates matching file path`);
    // Step 2: If module specified, filter by module
    if (parsed.module) {
        candidates = candidates.filter((r) => r.moduleName === parsed.module);
        logger.info(`   After module filter "${parsed.module}": ${candidates.length} candidates`);
    }
    // Step 3: No matches found
    if (candidates.length === 0) {
        logger.warn(`   ❌ No matches found for path "${requestedPath}"`);
        return undefined;
    }
    // Step 4: Sort by priority (ascending - lowest number = highest priority)
    candidates.sort((a, b) => a.origin.priority - b.origin.priority);
    // Step 5: Return absolute path of highest priority match
    const selected = candidates[0];
    logger.info(`   ✅ Selected: "${selected.absolutePath}" from module "${selected.moduleName}" ` +
        `at ${selected.origin.displayName} (priority=${selected.origin.priority})`);
    return selected.absolutePath;
}
//# sourceMappingURL=master-manifest-query.js.map