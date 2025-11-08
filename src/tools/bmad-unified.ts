/**
 * Unified BMAD Tool Implementation
 *
 * This is the NEW unified tool that replaces:
 * - Individual agent tools (bmm-analyst, bmm-architect, etc.)
 * - bmad-workflow tool
 * - bmad-resources tool
 *
 * Design Philosophy:
 * - Single tool with rich description for LLM routing
 * - Three core operations: list, read, execute
 * - Optional search operation (toggleable via config)
 * - LLM does intelligence, tool does validation and execution
 * - Modular operation handlers in ./operations/
 *
 * @see test-prompts.json for test specification
 */

/**
 * Configuration for BMAD unified tool
 */
export interface BMADToolConfig {
  /** Enable search operation (default: false) */
  enableSearch?: boolean;
}

import { Tool, TextContent } from '@modelcontextprotocol/sdk/types.js';
import type { BMADEngine } from '../core/bmad-engine.js';
import type { AgentMetadata } from '../core/resource-loader.js';
import type { Workflow } from '../types/index.js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import operation handlers
import {
  type ListParams,
  executeListOperation,
  validateListParams,
  getListExamples,
} from './operations/list.js';
import {
  type SearchParams,
  executeSearchOperation,
  validateSearchParams,
  getSearchExamples,
} from './operations/search.js';
import {
  type ReadParams,
  executeReadOperation,
  validateReadParams,
  getReadExamples,
} from './operations/read.js';
import {
  type ExecuteOperationParams,
  executeExecuteOperation,
  validateExecuteParams,
  getExecuteExamples,
} from './operations/execute.js';

/**
 * Parameters for the unified BMAD tool
 */
export interface BMADToolParams {
  /** Operation to perform */
  operation: 'list' | 'search' | 'read' | 'execute' | 'test';

  // List operation params
  /** Query for list operation (agents, workflows, modules, resources) */
  query?: string;
  /** Pattern for resource filtering */
  pattern?: string;

  // Search operation params
  /** Search query string */
  searchQuery?: string;
  /** Search type (agents, workflows, all) */
  searchType?: string;

  // Read operation params
  /** Type for read operation (agent, workflow, resource) */
  type?: string;
  /** Resource URI for read operation */
  uri?: string;

  // Execute operation params
  /** User message/context (for execute operation) */
  message?: string;

  // Test operation params
  /** Test scenario to return */
  testScenario?: string;

  // Common params
  /** Optional module filter (core, bmm, cis) */
  module?: string;
  /** Agent name (for read/execute) */
  agent?: string;
  /** Workflow name (for read/execute) */
  workflow?: string;
}

/**
 * Creates the unified BMAD tool definition
 *
 * This function generates a Tool object with:
 * - Comprehensive description including all agents and workflows
 * - Parameter schema for operations (list/read/execute, optionally search)
 * - Examples to guide LLM routing
 *
 * @param agents - Array of agent metadata from manifests
 * @param workflows - Array of workflow metadata from manifests
 * @param config - Optional configuration (e.g., enable search operation)
 * @returns MCP Tool definition
 */
export function createBMADTool(
  agents: AgentMetadata[],
  workflows: Workflow[],
  config?: BMADToolConfig,
): Tool {
  const enableSearch = config?.enableSearch ?? false;

  // Build comprehensive tool description
  const description = buildToolDescription(agents, workflows, enableSearch);

  // Build operation enum based on config
  const operations = enableSearch
    ? ['list', 'search', 'read', 'execute', 'test']
    : ['list', 'read', 'execute', 'test'];

  // Build operation description
  const operationDesc = enableSearch
    ? 'Operation type:\n' +
      '- list: Get available agents/workflows/modules\n' +
      '- search: Find agents/workflows by fuzzy search\n' +
      '- read: Inspect agent or workflow details (read-only)\n' +
      '- execute: Run agent or workflow with user context (action)\n' +
      '- test: Return hardcoded test response for development'
    : 'Operation type:\n' +
      '- list: Get available agents/workflows/modules\n' +
      '- read: Inspect agent or workflow details (read-only)\n' +
      '- execute: Run agent or workflow with user context (action)\n' +
      '- test: Return hardcoded test response for development';

  return {
    name: 'bmad',
    description,
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: operations,
          description: operationDesc,
        },
        module: {
          type: 'string',
          enum: ['core', 'bmm', 'cis'],
          description:
            'Optional module filter. Use to narrow scope or resolve name collisions.',
        },
        agent: {
          type: 'string',
          description:
            'Agent name (e.g., "analyst", "architect", "debug"). Required for read/execute operations with agents.',
        },
        workflow: {
          type: 'string',
          description:
            'Workflow name (e.g., "prd", "party-mode", "architecture"). Required for read/execute operations with workflows.',
        },
        query: {
          type: 'string',
          description:
            'For list operation: "agents", "workflows", "modules". Optionally filtered by module parameter.',
        },
        message: {
          type: 'string',
          description:
            "For execute operation: User's message, question, or context. Optional - some agents/workflows may work without an initial message.",
        },
        testScenario: {
          type: 'string',
          description:
            'For test operation: Scenario to test (e.g., "new-response-v1", "workflow-response"). Returns hardcoded response for development/testing.',
        },
      },
      required: ['operation'],
    },
  };
}

/**
 * Builds comprehensive tool description with all agents and workflows
 *
 * Description format:
 * - Overview of BMAD and operations
 * - Complete agent list (grouped by module) with personas
 * - Complete workflow list with descriptions
 * - Usage examples for common patterns
 *
 * @param agents - Agent metadata
 * @param workflows - Workflow metadata
 * @param enableSearch - Whether to include search operation
 * @returns Formatted tool description
 */
function buildToolDescription(
  agents: AgentMetadata[],
  workflows: Workflow[],
  enableSearch: boolean,
): string {
  const parts: string[] = [];

  // Header
  parts.push(
    'Execute BMAD agents and workflows. Provides access to all BMAD modules.',
  );
  parts.push('');
  parts.push('**Operations:**');
  parts.push('- `list`: Discover available agents/workflows/modules/resources');
  if (enableSearch) {
    parts.push('- `search`: Find agents/workflows by fuzzy search');
  }
  parts.push(
    '- `read`: Inspect agent or workflow details (read-only, no execution)',
  );
  parts.push(
    '- `execute`: Run agent or workflow with user context (performs actions)',
  );
  parts.push('');

  // Agents section (grouped by module)
  parts.push('**Available Agents:**');
  parts.push('');

  const agentsByModule = groupByModule(agents);
  for (const [moduleName, moduleAgents] of Object.entries(agentsByModule)) {
    parts.push(`${moduleName.toUpperCase()} Module:`);
    for (const agent of moduleAgents) {
      const line =
        `  - ${agent.name}` +
        (agent.displayName ? ` (${agent.displayName})` : '') +
        (agent.title ? `: ${agent.title}` : '');
      parts.push(line);
    }
    parts.push('');
  }

  // Workflows section
  parts.push('**Available Workflows:**');
  parts.push('');

  const workflowsByModule = groupWorkflowsByModule(workflows);
  for (const [moduleName, moduleWorkflows] of Object.entries(
    workflowsByModule,
  )) {
    parts.push(`${moduleName.toUpperCase()} Module:`);
    for (const workflow of moduleWorkflows) {
      const line =
        `  - ${workflow.name}` +
        (workflow.description ? `: ${workflow.description}` : '');
      parts.push(line);
    }
    parts.push('');
  }

  // Usage examples
  parts.push('**Usage Guide:**');
  parts.push('');
  parts.push('**When to use each operation:**');
  parts.push(
    '- `list` - User asks "what agents/workflows are available?" or wants to browse options',
  );
  if (enableSearch) {
    parts.push(
      '- `search` - User asks "find agents related to X" or wants fuzzy search',
    );
  }
  parts.push(
    '- `read` - User asks "what does the analyst do?" or wants agent/workflow details',
  );
  parts.push(
    '- `execute` - User wants to actually run an agent or workflow to accomplish a task',
  );
  parts.push('');
  parts.push(
    '**Important:** Use agent/workflow names WITHOUT module prefix (e.g., "analyst" not "bmm-analyst")',
  );
  parts.push('');
  parts.push('**Examples:**');
  parts.push('');
  parts.push('Discovery - List all agents:');
  parts.push('  { operation: "list", query: "agents" }');
  parts.push('');
  parts.push('Discovery - List agents in specific module:');
  parts.push('  { operation: "list", query: "agents", module: "bmm" }');
  parts.push('');
  parts.push('Capability Query - See what an agent can do:');
  parts.push('  { operation: "read", agent: "analyst" }');
  parts.push('');
  parts.push('Direct Intent - Execute agent to accomplish task:');
  parts.push(
    '  { operation: "execute", agent: "analyst", message: "Help me brainstorm a mobile app" }',
  );
  parts.push('');
  parts.push('Explicit Routing - User specifies which agent:');
  parts.push(
    '  { operation: "execute", agent: "architect", message: "Design a scalable architecture" }',
  );
  parts.push('');
  parts.push('Execute workflow:');
  parts.push(
    '  { operation: "execute", workflow: "prd", message: "Create PRD for e-commerce platform" }',
  );
  parts.push('');
  if (enableSearch) {
    parts.push('Search for agents:');
    parts.push('  { operation: "search", query: "debug" }');
    parts.push('');
  }
  parts.push('Disambiguate with module (if name collision):');
  parts.push(
    '  { operation: "execute", agent: "debug", module: "bmm", message: "Fix this bug" }',
  );

  return parts.join('\n');
}

/**
 * Groups agents by module for organized display
 */
function groupByModule(
  agents: AgentMetadata[],
): Record<string, AgentMetadata[]> {
  const grouped: Record<string, AgentMetadata[]> = {};

  for (const agent of agents) {
    const module = agent.module || 'core';
    if (!grouped[module]) {
      grouped[module] = [];
    }
    grouped[module].push(agent);
  }

  return grouped;
}

/**
 * Groups workflows by module for organized display
 */
function groupWorkflowsByModule(
  workflows: Workflow[],
): Record<string, Workflow[]> {
  const grouped: Record<string, Workflow[]> = {};

  for (const workflow of workflows) {
    const module = workflow.module || 'core';
    if (!grouped[module]) {
      grouped[module] = [];
    }
    grouped[module].push(workflow);
  }

  return grouped;
}

/**
 * Handles execution of the unified BMAD tool
 *
 * Routes operation to appropriate handler:
 * - list: Returns manifest data (agents/workflows/modules/resources)
 * - search: Performs fuzzy search across agents and workflows
 * - read: Returns agent/workflow/resource definition
 * - execute: Invokes agent or workflow
 *
 * @param params - Tool parameters
 * @param engine - BMAD Engine instance
 * @returns Tool execution result
 */
export async function handleBMADTool(
  params: BMADToolParams,
  engine: BMADEngine,
): Promise<{ content: TextContent[] }> {
  const { operation } = params;

  switch (operation) {
    case 'list':
      return await handleList(params, engine);
    case 'search':
      return await handleSearch(params, engine);
    case 'read':
      return await handleRead(params, engine);
    case 'execute':
      return await handleExecute(params, engine);
    case 'test':
      return handleTest(params);
    default:
      return {
        content: [
          {
            type: 'text',
            text: `❌ Invalid operation: ${String(operation)}`,
          },
        ],
      };
  }
}

/**
 * Handles list operation
 */
async function handleList(
  params: BMADToolParams,
  engine: BMADEngine,
): Promise<{ content: TextContent[] }> {
  // Map BMADToolParams to ListParams
  const listParams: ListParams = {
    query: (params.query || 'agents') as
      | 'agents'
      | 'workflows'
      | 'modules'
      | 'resources',
    module: params.module,
    pattern: params.pattern,
  };

  // Validate params
  const validationError = validateListParams(listParams);
  if (validationError) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Validation Error: ${validationError}\n\nExamples:\n${getListExamples().join('\n')}`,
        },
      ],
    };
  }

  // Execute operation
  const result = await executeListOperation(engine, listParams);

  // Return JSON data for discovery operations
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result.data, null, 2),
      },
    ],
  };
}

/**
 * Handles search operation
 */
async function handleSearch(
  params: BMADToolParams,
  engine: BMADEngine,
): Promise<{ content: TextContent[] }> {
  // Map BMADToolParams to SearchParams
  const searchParams: SearchParams = {
    query: params.searchQuery || '',
    type: params.searchType as 'agents' | 'workflows' | 'all',
    module: params.module,
  };

  // Validate params
  const validationError = validateSearchParams(searchParams);
  if (validationError) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Validation Error: ${validationError}\n\nExamples:\n${getSearchExamples().join('\n')}`,
        },
      ],
    };
  }

  // Execute operation
  const result = await executeSearchOperation(engine, searchParams);

  // Return JSON data for discovery operations
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result.data, null, 2),
      },
    ],
  };
}

/**
 * Handles read operation
 */
async function handleRead(
  params: BMADToolParams,
  engine: BMADEngine,
): Promise<{ content: TextContent[] }> {
  // Map BMADToolParams to ReadParams
  const readParams: ReadParams = {
    type: params.type as 'agent' | 'workflow' | 'resource',
    agent: params.agent,
    workflow: params.workflow,
    uri: params.uri,
    module: params.module,
  };

  // Validate params
  const validationError = validateReadParams(readParams);
  if (validationError) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Validation Error: ${validationError}\n\nExamples:\n${getReadExamples().join('\n')}`,
        },
      ],
    };
  }

  // Execute operation
  const result = await executeReadOperation(engine, readParams);
  // Always return some text (even on failure) so downstream parsers don't choke on undefined
  const payloadText = result.success
    ? JSON.stringify(result.data, null, 2)
    : JSON.stringify(
        {
          success: false,
          error: result.error || 'Unknown read error',
          remediation:
            'Verify the agent/workflow exists and (if needed) supply module. Example: {"operation":"read","type":"agent","agent":"analyst"}',
        },
        null,
        2,
      );
  return {
    content: [
      {
        type: 'text',
        text: payloadText,
      },
    ],
  };
}

/**
 * Handles execute operation
 */
async function handleExecute(
  params: BMADToolParams,
  engine: BMADEngine,
): Promise<{ content: TextContent[] }> {
  // Infer type from parameters
  let type: 'agent' | 'workflow';
  if (params.agent) {
    type = 'agent';
  } else if (params.workflow) {
    type = 'workflow';
  } else {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Validation Error: Must specify either 'agent' or 'workflow' parameter\n\nExamples:\n${getExecuteExamples().join('\n')}`,
        },
      ],
    };
  }

  // Map BMADToolParams to ExecuteOperationParams
  const execParams: ExecuteOperationParams = {
    type,
    agent: params.agent,
    workflow: params.workflow,
    message: params.message || '',
    module: params.module,
  };

  // Validate params
  const validationError = validateExecuteParams(execParams);
  if (validationError) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Validation Error: ${validationError}\n\nExamples:\n${getExecuteExamples().join('\n')}`,
        },
      ],
    };
  }

  // Execute operation
  const result = await executeExecuteOperation(engine, execParams);

  return {
    content: [
      {
        type: 'text',
        text: result.text,
      },
    ],
  };
}

/**
 * Handles test operation - returns hardcoded responses for development/testing
 */
function handleTest(params: BMADToolParams): { content: TextContent[] } {
  const scenario = params.testScenario || 'new-response-v1';

  // Construct path to test response file (in source tree, not build/)
  // __dirname points to build/tools/, so go up to project root then into tests/
  const projectRoot = join(__dirname, '..', '..');
  const responsePath = join(
    projectRoot,
    'tests',
    'fixtures',
    'test-responses',
    `${scenario}.txt`,
  );

  try {
    // Check if file exists
    if (!existsSync(responsePath)) {
      return {
        content: [
          {
            type: 'text',
            text: `Test scenario "${scenario}" not found.\n\nLooking for: ${responsePath}\n\nTo add a new test scenario, create:\ntests/fixtures/test-responses/${scenario}.txt`,
          },
        ],
      };
    }

    // Read and return file contents
    const response = readFileSync(responsePath, 'utf-8');

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error loading test scenario "${scenario}":\n${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}
