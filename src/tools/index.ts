/**
 * BMAD MCP Tools
 *
 * This directory contains the unified BMAD tool implementation and its modular operations.
 *
 * ## Architecture
 *
 * ```
 * tools/
 * ├── bmad-unified.ts          # MCP tool definition and handler
 * ├── operations/              # Modular operation handlers
 * │   ├── list.ts             # List agents/workflows/modules/resources
 * │   ├── search.ts           # Fuzzy search across agents and workflows
 * │   ├── read.ts             # Read agent/workflow/resource definitions
 * │   ├── execute.ts          # Execute agents and workflows
 * │   └── index.ts            # Re-exports all operations
 * └── index.ts                # This file - exports tool for MCP server
 * ```
 *
 * ## Design Principles
 *
 * 1. **Modular Operations**: Each operation (list, search, read, execute) is in its own file
 * 2. **Transport Agnostic**: Operations use BMADEngine, not MCP-specific types
 * 3. **Validation**: Each operation validates its own parameters
 * 4. **Examples**: Each operation provides usage examples for error messages
 * 5. **Testable**: Operations can be tested independently
 *
 * ## Usage
 *
 * ### In MCP Server
 *
 * ```typescript
 * import { createBMADTool, handleBMADTool } from './tools/index.js';
 *
 * // Register tool
 * const tool = createBMADTool(agents, workflows);
 * server.setRequestHandler(ListToolsRequestSchema, async () => ({
 *   tools: [tool]
 * }));
 *
 * // Handle tool calls
 * server.setRequestHandler(CallToolRequestSchema, async (request) => {
 *   if (request.params.name === 'bmad') {
 *     return await handleBMADTool(request.params.arguments, engine);
 *   }
 * });
 * ```
 *
 * ### In Tests
 *
 * ```typescript
 * import { executeListOperation, validateListParams } from './tools/operations/index.js';
 *
 * // Test validation
 * const error = validateListParams({ query: 'invalid' });
 * expect(error).toBeDefined();
 *
 * // Test execution
 * const result = await executeListOperation(engine, { query: 'agents' });
 * expect(result.success).toBe(true);
 * ```
 *
 * ## Operations
 *
 * ### List
 * - **Purpose**: Discovery of agents, workflows, modules, resources
 * - **Read-only**: Yes
 * - **Parameters**: query (agents/workflows/modules/resources), module filter, pattern
 *
 * ### Search
 * - **Purpose**: Fuzzy search across agents and workflows
 * - **Read-only**: Yes
 * - **Parameters**: query string, type (agents/workflows/all), module filter
 *
 * ### Read
 * - **Purpose**: Inspect agent/workflow/resource definitions
 * - **Read-only**: Yes
 * - **Parameters**: type (agent/workflow/resource), agent/workflow/uri, module hint
 *
 * ### Execute
 * - **Purpose**: Run agents and workflows with user context
 * - **Read-only**: No (may create files, modify workspace)
 * - **Parameters**: type (agent/workflow), agent/workflow name, message, module hint
 */

export {
  createBMADTool,
  handleBMADTool,
  type BMADToolParams,
} from './bmad-unified.js';

// Re-export operations for testing and advanced usage
export * from './operations/index.js';
