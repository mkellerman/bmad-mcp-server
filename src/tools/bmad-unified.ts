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
 * - Four operations: list, search, read, execute
 * - LLM does intelligence, tool does validation and execution
 * - Modular operation handlers in ./operations/
 *
 * @see test-prompts.json for test specification
 */

import { Tool, TextContent } from '@modelcontextprotocol/sdk/types.js';
import type { BMADEngine } from '../core/bmad-engine.js';
import type { AgentMetadata } from '../resource-loader.js';
import type { Workflow } from '../types/index.js';

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
  operation: 'list' | 'search' | 'read' | 'execute';

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
 * - Parameter schema for list/read/execute operations
 * - Examples to guide LLM routing
 *
 * @param agents - Array of agent metadata from manifests
 * @param workflows - Array of workflow metadata from manifests
 * @returns MCP Tool definition
 */
export function createBMADTool(
  agents: AgentMetadata[],
  workflows: Workflow[],
): Tool {
  // Build comprehensive tool description
  const description = buildToolDescription(agents, workflows);

  return {
    name: 'bmad',
    description,
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['list', 'search', 'read', 'execute'],
          description:
            'Operation type:\n' +
            '- list: Get available agents/workflows/modules/resources\n' +
            '- search: Find agents/workflows by fuzzy search\n' +
            '- read: Inspect agent or workflow details (read-only)\n' +
            '- execute: Run agent or workflow with user context (action)',
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
 * @returns Formatted tool description
 */
function buildToolDescription(
  agents: AgentMetadata[],
  workflows: Workflow[],
): string {
  const parts: string[] = [];

  // Header
  parts.push(
    'Execute BMAD agents and workflows. Provides access to all BMAD modules.',
  );
  parts.push('');
  parts.push('**Operations:**');
  parts.push('- `list`: Discover available agents/workflows/modules/resources');
  parts.push('- `search`: Find agents/workflows by fuzzy search');
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
  parts.push('**Examples:**');
  parts.push('');
  parts.push('List all agents:');
  parts.push('  { operation: "list", query: "agents" }');
  parts.push('');
  parts.push('Read agent details:');
  parts.push('  { operation: "read", agent: "debug" }');
  parts.push('');
  parts.push('Execute agent:');
  parts.push(
    '  { operation: "execute", agent: "debug", message: "Help me debug this issue" }',
  );
  parts.push('');
  parts.push('Execute workflow:');
  parts.push(
    '  { operation: "execute", workflow: "party-mode", message: "Start with planning team" }',
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
    query:
      (params.query as 'agents' | 'workflows' | 'modules' | 'resources') ||
      'agents',
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
 * Handles execute operation
 */
async function handleExecute(
  params: BMADToolParams,
  engine: BMADEngine,
): Promise<{ content: TextContent[] }> {
  // Map BMADToolParams to ExecuteOperationParams
  const execParams: ExecuteOperationParams = {
    type: params.type as 'agent' | 'workflow',
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
