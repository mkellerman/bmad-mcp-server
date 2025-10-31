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
import { parseAgentMetadata } from './agent-metadata-parser.js';
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
 * If the agent file exists and the manifest doesn't have rich metadata (role, icon),
 * the file will be parsed to extract this information from the XML/YAML section.
 *
 * @param record - MasterRecord entry for an agent
 * @param parseMetadata - Whether to parse the agent file for metadata when needed (default: true)
 * @returns Agent interface compatible with legacy code
 */
export function masterRecordToAgent(record, parseMetadata = true) {
    // Only parse agent file if we don't already have description/role from manifest
    // and the file exists
    let parsedMetadata = {};
    const needsParsing = parseMetadata &&
        record.exists &&
        record.absolutePath &&
        !record.description; // If manifest has description, skip parsing
    if (needsParsing) {
        parsedMetadata = parseAgentMetadata(record.absolutePath);
    }
    return {
        // Primary identification
        name: record.name || '',
        displayName: parsedMetadata.name || record.displayName || record.name || '',
        title: parsedMetadata.title || record.description || '',
        // Module and location info
        module: record.moduleName,
        path: record.absolutePath,
        // Origin tracking (for debugging/logging)
        sourceRoot: record.origin.root,
        sourceLocation: record.origin.displayName,
        // Rich metadata from parsed agent file (only if needed)
        role: parsedMetadata.role || '',
        icon: parsedMetadata.icon,
        identity: parsedMetadata.identity,
        communicationStyle: parsedMetadata.communicationStyle,
        principles: parsedMetadata.principles,
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
 * @param parseMetadata - Whether to parse agent files for metadata (default: true)
 * @returns Array of Agent interfaces
 */
export function convertAgents(records, parseMetadata = true) {
    const existingRecords = filterExisting(records);
    return existingRecords.map((record) => masterRecordToAgent(record, parseMetadata));
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