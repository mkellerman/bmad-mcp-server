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
 * - Three operations: list, read, execute
 * - LLM does intelligence, tool does validation and execution
 * - No search operation (LLM routes from tool description)
 *
 * @see test-prompts.json for test specification
 */

import { Tool, TextContent } from '@modelcontextprotocol/sdk/types.js';
import type { AgentMetadata } from '../resource-loader.js';
import type { Workflow } from '../types/index.js';

/**
 * Parameters for the unified BMAD tool
 */
export interface BMADToolParams {
  /** Operation to perform */
  operation: 'list' | 'read' | 'execute';
  /** Optional module filter (core, bmm, cis) */
  module?: string;
  /** Agent name (for read/execute) */
  agent?: string;
  /** Workflow name (for read/execute) */
  workflow?: string;
  /** Query for list operation (agents, workflows, modules) */
  query?: string;
  /** User message/context (for execute operation) */
  message?: string;
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
          enum: ['list', 'read', 'execute'],
          description:
            'Operation type:\n' +
            '- list: Get available agents/workflows/modules\n' +
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
            "For execute operation: User's message, question, or context. Required when executing agents/workflows.",
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
  parts.push('- `list`: Discover available agents/workflows/modules');
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
 * - list: Returns manifest data
 * - read: Returns agent/workflow definition
 * - execute: Invokes agent or workflow
 *
 * @param params - Tool parameters
 * @param context - Server context with loader, etc.
 * @returns Tool execution result
 */
export async function handleBMADTool(
  params: BMADToolParams,
  context: {
    // TODO: Define context interface with loader, agent executor, etc.
    agents: AgentMetadata[];
    workflows: Workflow[];
  },
): Promise<{ content: TextContent[] }> {
  const { operation } = params;

  switch (operation) {
    case 'list':
      return handleList(params, context);
    case 'read':
      return handleRead(params, context);
    case 'execute':
      return handleExecute(params, context);
  }

  // TypeScript exhaustiveness check
  const _exhaustive: never = operation;
  return _exhaustive; // This line never executes but satisfies TypeScript
}

/**
 * Handles list operation
 * TODO: Implement
 */
function handleList(
  _params: BMADToolParams,
  _context: { agents: AgentMetadata[]; workflows: Workflow[] },
): Promise<{ content: TextContent[] }> {
  // TODO: Implement list logic
  throw new Error('List operation not yet implemented');
}

/**
 * Handles read operation
 * TODO: Implement
 */
function handleRead(
  _params: BMADToolParams,
  _context: { agents: AgentMetadata[]; workflows: Workflow[] },
): Promise<{ content: TextContent[] }> {
  // TODO: Implement read logic
  throw new Error('Read operation not yet implemented');
}

/**
 * Handles execute operation
 * TODO: Implement
 */
function handleExecute(
  _params: BMADToolParams,
  _context: { agents: AgentMetadata[]; workflows: Workflow[] },
): Promise<{ content: TextContent[] }> {
  // TODO: Implement execute logic
  throw new Error('Execute operation not yet implemented');
}
