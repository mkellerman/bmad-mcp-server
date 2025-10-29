/**
 * Master Manifest Adapters
 *
 * Converts MasterRecord entries from the master manifest into legacy
 * Agent/Workflow/Task interfaces for backward compatibility with existing code.
 *
 * These adapters enable a clean separation between:
 * - Master manifest (new inventory system)
 * - Legacy interfaces (existing tool code)
 */
import logger from './logger.js';
/**
 * Filter master records to only include files that physically exist.
 *
 * This is our primary filtering strategy - we cannot serve files that don't exist,
 * so we filter by the `exists` boolean field on each record.
 *
 * @param records - Array of MasterRecord entries from master manifest
 * @returns Filtered array containing only records where exists === true
 */
export function filterExisting(records) {
    const existingRecords = records.filter((r) => r.exists === true);
    logger.info(`Filtered ${records.length} records to ${existingRecords.length} existing files`);
    return existingRecords;
}
/**
 * Convert a MasterRecord (agent) to legacy Agent interface.
 *
 * The Agent interface is used throughout the codebase for agent metadata.
 * This adapter extracts the relevant fields from MasterRecord and maps them
 * to the expected Agent structure.
 *
 * @param record - MasterRecord entry for an agent
 * @returns Agent interface compatible with legacy code
 */
export function masterRecordToAgent(record) {
    return {
        // Primary identification
        name: record.name || '',
        displayName: record.displayName || record.name || '',
        title: record.description || '',
        // Module and location info
        module: record.moduleName,
        path: record.absolutePath,
        // Origin tracking (for debugging/logging)
        sourceRoot: record.origin.root,
        sourceLocation: record.origin.displayName,
        // Legacy fields (not in MasterRecord but required by interface)
        role: '', // Not tracked in master manifest
        icon: undefined,
        identity: undefined,
        communicationStyle: undefined,
        principles: undefined,
    };
}
/**
 * Convert a MasterRecord (workflow) to legacy Workflow interface.
 *
 * The Workflow interface is used for workflow metadata and execution.
 * This adapter maps MasterRecord fields to the expected Workflow structure.
 *
 * @param record - MasterRecord entry for a workflow
 * @returns Workflow interface compatible with legacy code
 */
export function masterRecordToWorkflow(record) {
    return {
        // Primary identification
        name: record.name || '',
        description: record.description || '',
        trigger: record.name || '', // Trigger defaults to name
        // Module and location info
        module: record.moduleName,
        path: record.absolutePath,
        // Origin tracking (for debugging/logging)
        sourceRoot: record.origin.root,
        sourceLocation: record.origin.displayName,
    };
}
/**
 * Convert a MasterRecord (task) to legacy Task interface.
 *
 * The Task interface is used for task metadata and references.
 * This adapter maps MasterRecord fields to the expected Task structure.
 *
 * @param record - MasterRecord entry for a task
 * @returns Task interface compatible with legacy code
 */
export function masterRecordToTask(record) {
    return {
        // Primary identification
        name: record.name || '',
        description: record.description || '',
        // Module and location info
        module: record.moduleName,
        path: record.absolutePath,
        // Origin tracking (for debugging/logging)
        sourceRoot: record.origin.root,
        sourceLocation: record.origin.displayName,
    };
}
/**
 * Batch convert multiple agent records to Agent interfaces.
 *
 * Convenience function for converting arrays of MasterRecords.
 * Automatically filters for existing files before conversion.
 *
 * @param records - Array of MasterRecord entries (agents)
 * @returns Array of Agent interfaces
 */
export function convertAgents(records) {
    const existingRecords = filterExisting(records);
    return existingRecords.map(masterRecordToAgent);
}
/**
 * Batch convert multiple workflow records to Workflow interfaces.
 *
 * Convenience function for converting arrays of MasterRecords.
 * Automatically filters for existing files before conversion.
 *
 * @param records - Array of MasterRecord entries (workflows)
 * @returns Array of Workflow interfaces
 */
export function convertWorkflows(records) {
    const existingRecords = filterExisting(records);
    return existingRecords.map(masterRecordToWorkflow);
}
/**
 * Batch convert multiple task records to Task interfaces.
 *
 * Convenience function for converting arrays of MasterRecords.
 * Automatically filters for existing files before conversion.
 *
 * @param records - Array of MasterRecord entries (tasks)
 * @returns Array of Task interfaces
 */
export function convertTasks(records) {
    const existingRecords = filterExisting(records);
    return existingRecords.map(masterRecordToTask);
}
//# sourceMappingURL=master-manifest-adapter.js.map