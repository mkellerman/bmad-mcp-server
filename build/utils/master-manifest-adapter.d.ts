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
import type { MasterRecord, Agent, Workflow, Task } from '../types/index.js';
/**
 * Filter master records to only include files that physically exist.
 *
 * This is our primary filtering strategy - we cannot serve files that don't exist,
 * so we filter by the `exists` boolean field on each record.
 *
 * @param records - Array of MasterRecord entries from master manifest
 * @returns Filtered array containing only records where exists === true
 */
export declare function filterExisting(records: MasterRecord[]): MasterRecord[];
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
export declare function masterRecordToAgent(record: MasterRecord, parseMetadata?: boolean): Agent;
/**
 * Convert a MasterRecord (workflow) to legacy Workflow interface.
 *
 * The Workflow interface is used for workflow metadata and execution.
 * This adapter maps MasterRecord fields to the expected Workflow structure.
 *
 * @param record - MasterRecord entry for a workflow
 * @returns Workflow interface compatible with legacy code
 */
export declare function masterRecordToWorkflow(record: MasterRecord): Workflow;
/**
 * Convert a MasterRecord (task) to legacy Task interface.
 *
 * The Task interface is used for task metadata and references.
 * This adapter maps MasterRecord fields to the expected Task structure.
 *
 * @param record - MasterRecord entry for a task
 * @returns Task interface compatible with legacy code
 */
export declare function masterRecordToTask(record: MasterRecord): Task;
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
export declare function convertAgents(records: MasterRecord[], parseMetadata?: boolean): Agent[];
/**
 * Batch convert multiple workflow records to Workflow interfaces.
 *
 * Convenience function for converting arrays of MasterRecords.
 * Automatically filters for existing files before conversion.
 *
 * @param records - Array of MasterRecord entries (workflows)
 * @returns Array of Workflow interfaces
 */
export declare function convertWorkflows(records: MasterRecord[]): Workflow[];
/**
 * Batch convert multiple task records to Task interfaces.
 *
 * Convenience function for converting arrays of MasterRecords.
 * Automatically filters for existing files before conversion.
 *
 * @param records - Array of MasterRecord entries (tasks)
 * @returns Array of Task interfaces
 */
export declare function convertTasks(records: MasterRecord[]): Task[];
//# sourceMappingURL=master-manifest-adapter.d.ts.map