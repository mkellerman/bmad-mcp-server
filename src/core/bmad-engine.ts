/**
 * BMAD Engine - Core Business Logic (Transport Agnostic)
 *
 * This is the heart of BMAD functionality, extracted from MCP server to be reusable
 * across multiple interfaces (MCP server, CLI tool, HTTP API, etc.).
 *
 * Design Principles:
 * - NO transport layer dependencies (no MCP types)
 * - Pure TypeScript business logic
 * - Returns plain data structures
 * - Used by both MCP server and CLI tool
 *
 * @remarks
 * The engine provides three main operation categories:
 * 1. **List Operations**: Discovery of agents, workflows, modules, resources
 * 2. **Read Operations**: Inspection of agent/workflow definitions (read-only)
 * 3. **Execute Operations**: Running agents and workflows (performs actions)
 */

import { ResourceLoaderGit, AgentMetadata } from '../resource-loader.js';
import type { Workflow } from '../types/index.js';
import { getAgentInstructions, getWorkflowInstructions } from '../config.js';

// ============================================================================
// Core Types (Transport-Agnostic)
// ============================================================================

/**
 * Result of a BMAD operation
 */
export interface BMADResult {
  /** Success status */
  success: boolean;
  /** Result data (structure varies by operation) */
  data?: unknown;
  /** Error message if success=false */
  error?: string;
  /** Human-readable text output */
  text: string;
}

/**
 * Filter for list operations
 */
export interface ListFilter {
  /** Module filter (core, bmm, cis) */
  module?: string;
  /** Pattern filter for resources (glob-style) */
  pattern?: string;
}

/**
 * Parameters for execute operations
 */
export interface ExecuteParams {
  /** Agent name (for agent execution) */
  agent?: string;
  /** Workflow name (for workflow execution) */
  workflow?: string;
  /** User message/context */
  message: string;
  /** Module hint (for disambiguation) */
  module?: string;
}

/**
 * Agent definition result
 */
export interface AgentDefinition {
  name: string;
  displayName: string;
  title: string;
  module?: string;
  description?: string;
  persona?: string;
  capabilities?: string[];
  workflows?: string[];
  content: string; // Full agent markdown content
}

/**
 * Workflow definition result
 */
export interface WorkflowDefinition {
  name: string;
  description: string;
  module: string;
  standalone?: boolean;
  content: string; // Full workflow YAML content
}

// ============================================================================
// BMAD Engine
// ============================================================================

/**
 * Core BMAD engine providing all business logic
 *
 * This class is transport-agnostic and can be used by:
 * - MCP Server (wraps in MCP protocol)
 * - CLI Tool (formats for terminal output)
 * - HTTP API (wraps in REST/GraphQL)
 * - Tests (direct access to business logic)
 */
export class BMADEngine {
  private loader: ResourceLoaderGit;
  private agentMetadata: AgentMetadata[] = [];
  private workflows: Workflow[] = [];
  private cachedResources: Array<{ uri: string; relativePath: string }> = [];
  private initialized = false;

  /**
   * Creates a new BMAD Engine instance
   *
   * @param projectRoot - Optional project root directory
   * @param gitRemotes - Optional array of Git remote URLs
   */
  constructor(projectRoot?: string, gitRemotes?: string[]) {
    this.loader = new ResourceLoaderGit(projectRoot, gitRemotes);
  }

  /**
   * Initialize the engine (loads manifests and caches metadata)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load all agents with metadata
    this.agentMetadata = await this.loader.listAgentsWithMetadata();

    // Load all workflows with metadata
    this.workflows = await this.loader.listWorkflowsWithMetadata();

    // Pre-build resource list
    this.cachedResources = [];
    const allFiles = await this.loader.listAllFiles();
    for (const file of allFiles) {
      this.cachedResources.push({
        uri: `bmad://${file.relativePath}`,
        relativePath: file.relativePath,
      });
    }

    this.initialized = true;
  }

  // ============================================================================
  // LIST OPERATIONS (Discovery)
  // ============================================================================

  /**
   * List all available agents
   */
  async listAgents(filter?: ListFilter): Promise<BMADResult> {
    await this.initialize();

    let agents = this.agentMetadata;

    // Apply module filter if specified
    if (filter?.module) {
      agents = agents.filter((a) => a.module === filter.module);
    }

    const agentList = agents.map((a) => ({
      name: a.name,
      displayName: a.displayName,
      title: a.title,
      module: a.module,
      description: a.description,
      toolName: a.module ? `${a.module}-${a.name}` : `bmad-${a.name}`,
    }));

    const text = this.formatAgentList(agentList);

    return {
      success: true,
      data: agentList,
      text,
    };
  }

  /**
   * List all available workflows
   */
  async listWorkflows(filter?: ListFilter): Promise<BMADResult> {
    await this.initialize();

    let workflows = this.workflows;

    // Apply module filter if specified
    if (filter?.module) {
      workflows = workflows.filter((w) => w.module === filter.module);
    }

    const workflowList = workflows.map((w) => ({
      name: w.name,
      description: w.description,
      module: w.module,
      standalone: w.standalone,
    }));

    const text = this.formatWorkflowList(workflowList);

    return {
      success: true,
      data: workflowList,
      text,
    };
  }

  /**
   * List all loaded modules
   */
  async listModules(): Promise<BMADResult> {
    await this.initialize();

    // Extract unique modules from agents
    const modules = new Set<string>();
    this.agentMetadata.forEach((a) => {
      if (a.module) {
        modules.add(a.module);
      }
    });

    const moduleList = Array.from(modules).sort();

    const text = `📦 Loaded BMAD Modules (${moduleList.length})\n\n${moduleList.map((m) => `- ${m}`).join('\n')}`;

    return {
      success: true,
      data: moduleList,
      text,
    };
  }

  /**
   * List all available resources (files)
   */
  async listResources(filter?: ListFilter): Promise<BMADResult> {
    await this.initialize();

    let resources = this.cachedResources;

    // Apply pattern filter if provided (simple glob matching)
    if (filter?.pattern) {
      const patternRegex = new RegExp(
        '^' +
          filter.pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '.') +
          '$',
      );
      resources = resources.filter((r) => patternRegex.test(r.relativePath));
    }

    const resourceList = resources.map((r) => r.uri);

    const text = `📋 Available BMAD Resources (${resources.length} files)\n\n${resourceList.map((r) => `- ${r}`).join('\n')}`;

    return {
      success: true,
      data: resourceList,
      text,
    };
  }

  // ============================================================================
  // READ OPERATIONS (Inspection - Read-Only)
  // ============================================================================

  /**
   * Read agent definition and details
   */
  async readAgent(agentName: string, module?: string): Promise<BMADResult> {
    await this.initialize();

    try {
      // Find agent metadata
      let agent = this.agentMetadata.find((a) => a.name === agentName);

      // If module specified, filter by module
      if (module && agent && agent.module !== module) {
        agent = undefined;
      }

      if (!agent) {
        return {
          success: false,
          error: `Agent not found: ${agentName}`,
          text: this.formatAgentNotFound(agentName),
        };
      }

      // Load full agent content
      const resource = await this.loader.loadAgent(agentName);

      const agentDef: AgentDefinition = {
        name: agent.name,
        displayName: agent.displayName,
        title: agent.title,
        module: agent.module,
        description: agent.description,
        persona: agent.persona,
        capabilities: agent.capabilities,
        workflows: agent.workflows || [],
        content: resource.content,
      };

      const text = this.formatAgentDefinition(agentDef);

      return {
        success: true,
        data: agentDef,
        text,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        text: `❌ Failed to read agent: ${agentName}\n\nError: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Read workflow definition and details
   */
  async readWorkflow(
    workflowName: string,
    module?: string,
  ): Promise<BMADResult> {
    await this.initialize();

    try {
      // Find workflow metadata
      let workflow = this.workflows.find((w) => w.name === workflowName);

      // If module specified, filter by module
      if (module && workflow && workflow.module !== module) {
        workflow = undefined;
      }

      if (!workflow) {
        return {
          success: false,
          error: `Workflow not found: ${workflowName}`,
          text: this.formatWorkflowNotFound(workflowName),
        };
      }

      // Load full workflow content
      const resource = await this.loader.loadWorkflow(workflowName);

      const workflowDef: WorkflowDefinition = {
        name: workflow.name,
        description: workflow.description,
        module: workflow.module,
        standalone: workflow.standalone,
        content: resource.content,
      };

      const text = this.formatWorkflowDefinition(workflowDef);

      return {
        success: true,
        data: workflowDef,
        text,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        text: `❌ Failed to read workflow: ${workflowName}\n\nError: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Read resource file content
   */
  async readResource(uriOrPath: string): Promise<BMADResult> {
    try {
      // Parse URI if it's bmad:// format
      let relativePath = uriOrPath;
      if (uriOrPath.startsWith('bmad://')) {
        relativePath = uriOrPath.replace('bmad://', '');
      }

      const content = await this.loader.loadFile(relativePath);

      // Determine file extension for formatting
      const ext = relativePath.split('.').pop()?.toLowerCase() || 'txt';
      const langMap: Record<string, string> = {
        md: 'markdown',
        yaml: 'yaml',
        yml: 'yaml',
        json: 'json',
        xml: 'xml',
        csv: 'csv',
        ts: 'typescript',
        js: 'javascript',
      };
      const lang = langMap[ext] || 'text';

      const text = `📄 **bmad://${relativePath}**\n\n\`\`\`${lang}\n${content}\n\`\`\``;

      return {
        success: true,
        data: { path: relativePath, content },
        text,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        text: `❌ Failed to read resource: ${uriOrPath}\n\nError: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // ============================================================================
  // EXECUTE OPERATIONS (Actions - May Modify State)
  // ============================================================================

  /**
   * Execute an agent with user message
   */
  async executeAgent(params: ExecuteParams): Promise<BMADResult> {
    if (!params.agent) {
      return {
        success: false,
        error: 'Agent name is required',
        text: '❌ Agent name is required for execution',
      };
    }

    await this.initialize();

    try {
      const resource = await this.loader.loadAgent(params.agent);

      // Translate filesystem paths to MCP resource URIs
      let agentContent = resource.content;
      agentContent = agentContent.replace(
        /\{project-root\}\/bmad\//g,
        'bmad://',
      );

      const executionContext = {
        agent: params.agent,
        message: params.message,
        instructions: getAgentInstructions(),
        agentContent,
      };

      const text = `${executionContext.instructions}

---

<instructions>
${agentContent}
</instructions>`;

      return {
        success: true,
        data: executionContext,
        text,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        text: this.formatAgentNotFound(params.agent),
      };
    }
  }

  /**
   * Execute a workflow with user context
   */
  async executeWorkflow(params: ExecuteParams): Promise<BMADResult> {
    if (!params.workflow) {
      return {
        success: false,
        error: 'Workflow name is required',
        text: '❌ Workflow name is required for execution',
      };
    }

    await this.initialize();

    try {
      const resource = await this.loader.loadWorkflow(params.workflow);

      const executionContext = {
        workflow: params.workflow,
        context: params.message,
        instructions: getWorkflowInstructions(params.workflow, params.message),
        workflowConfig: resource.content,
      };

      const text = `${executionContext.instructions}

---

<instructions>
You are executing the BMAD workflow: ${params.workflow}
</instructions>

<workflow-config>
${resource.content}
</workflow-config>`;

      return {
        success: true,
        data: executionContext,
        text,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        text: this.formatWorkflowNotFound(params.workflow),
      };
    }
  }

  // ============================================================================
  // SEARCH OPERATIONS
  // ============================================================================

  /**
   * Search agents and workflows by query
   */
  async search(
    query: string,
    type: 'agents' | 'workflows' | 'all' = 'all',
  ): Promise<BMADResult> {
    await this.initialize();

    if (!query.trim()) {
      return {
        success: false,
        error: 'Search query cannot be empty',
        text: '❌ Search query cannot be empty',
      };
    }

    const searchQuery = query.toLowerCase();
    const results: {
      agents?: Array<{
        name: string;
        displayName: string;
        module?: string;
      }>;
      workflows?: Array<{ name: string; description: string; module: string }>;
    } = {};

    // Search agents
    if (type === 'agents' || type === 'all') {
      const matchedAgents = this.agentMetadata.filter((a) => {
        const searchableText = [
          a.name,
          a.displayName,
          a.title,
          a.description,
          a.module,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const queryWords = searchQuery.split(/\s+/);
        return queryWords.every((word) => searchableText.includes(word));
      });

      results.agents = matchedAgents.map((a) => ({
        name: a.name,
        displayName: a.displayName,
        module: a.module,
      }));
    }

    // Search workflows
    if (type === 'workflows' || type === 'all') {
      const matchedWorkflows = this.workflows.filter(
        (w) =>
          w.name.toLowerCase().includes(searchQuery) ||
          (w.description &&
            w.description.toLowerCase().includes(searchQuery)) ||
          (w.module && w.module.toLowerCase().includes(searchQuery)),
      );

      results.workflows = matchedWorkflows.map((w) => ({
        name: w.name,
        description: w.description,
        module: w.module,
      }));
    }

    const text = this.formatSearchResults(results, query);

    return {
      success: true,
      data: results,
      text,
    };
  }

  // ============================================================================
  // FORMATTING HELPERS (Private)
  // ============================================================================

  private formatAgentList(
    agents: Array<{
      name: string;
      displayName: string;
      title: string;
      module?: string;
      toolName: string;
    }>,
  ): string {
    const lines = [`🤖 Available BMAD Agents (${agents.length})\n`];

    agents.forEach((a) => {
      lines.push(`**${a.toolName}** - ${a.displayName} (${a.title})`);
    });

    return lines.join('\n');
  }

  private formatWorkflowList(
    workflows: Array<{
      name: string;
      description: string;
      module: string;
    }>,
  ): string {
    const lines = [`⚙️  Available BMAD Workflows (${workflows.length})\n`];

    workflows.forEach((w) => {
      lines.push(`**${w.name}**: ${w.description}`);
    });

    return lines.join('\n');
  }

  private formatAgentDefinition(agent: AgentDefinition): string {
    const lines = [
      `🤖 **${agent.displayName}** (${agent.title})`,
      '',
      `**Agent:** ${agent.name}`,
      `**Module:** ${agent.module || 'core'}`,
    ];

    if (agent.description) {
      lines.push('', `**Description:** ${agent.description}`);
    }

    if (agent.persona) {
      lines.push('', `**Persona:** ${agent.persona}`);
    }

    if (agent.workflows && agent.workflows.length > 0) {
      lines.push('', '**Available Workflows:**');
      agent.workflows.forEach((w) => lines.push(`- ${w}`));
    }

    return lines.join('\n');
  }

  private formatWorkflowDefinition(workflow: WorkflowDefinition): string {
    const lines = [
      `⚙️  **${workflow.name}**`,
      '',
      `**Description:** ${workflow.description}`,
      `**Module:** ${workflow.module}`,
    ];

    if (workflow.standalone) {
      lines.push(`**Type:** Standalone workflow`);
    }

    return lines.join('\n');
  }

  private formatAgentNotFound(agentName: string): string {
    const availableAgents = this.agentMetadata
      .map((a) => `- ${a.module ? `${a.module}-${a.name}` : `bmad-${a.name}`}`)
      .join('\n');

    return `❌ Agent not found: ${agentName}\n\nAvailable agents:\n${availableAgents}`;
  }

  private formatWorkflowNotFound(workflowName: string): string {
    const availableWorkflows = this.workflows
      .map((w) => `- ${w.name}`)
      .join('\n');

    return `❌ Workflow not found: ${workflowName}\n\nAvailable workflows:\n${availableWorkflows}`;
  }

  private formatSearchResults(
    results: {
      agents?: Array<{ name: string; displayName: string; module?: string }>;
      workflows?: Array<{ name: string; description: string; module: string }>;
    },
    query: string,
  ): string {
    const lines = [`🔍 Search Results for: "${query}"\n`];

    if (results.agents && results.agents.length > 0) {
      lines.push(`## 🤖 Agents (${results.agents.length} matches)\n`);
      results.agents.forEach((a) => {
        const modulePart = a.module ? `${a.module}-` : 'bmad-';
        lines.push(`- **${modulePart}${a.name}** (${a.displayName})`);
      });
      lines.push('');
    }

    if (results.workflows && results.workflows.length > 0) {
      lines.push(`## ⚙️  Workflows (${results.workflows.length} matches)\n`);
      results.workflows.forEach((w) => {
        lines.push(`- **${w.name}**: ${w.description}`);
      });
    }

    if (
      (!results.agents || results.agents.length === 0) &&
      (!results.workflows || results.workflows.length === 0)
    ) {
      lines.push('No results found.');
    }

    return lines.join('\n');
  }
}
