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

import { ResourceLoaderGit, AgentMetadata } from './resource-loader.js';
import type { Workflow, Tool, Task, DiscoveryMode } from '../types/index.js';
import {
  getAgentExecutionPrompt,
  getWorkflowExecutionPrompt,
} from '../config.js';
import { SessionTracker } from './session-tracker.js';

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
 * Workflow match for ambiguous results
 */
export interface WorkflowMatch {
  /** Composite key: module:agent:workflow */
  key: string;
  /** Module name */
  module: string;
  /** Agent name */
  agentName: string;
  /** Agent display name */
  agentDisplayName: string;
  /** Agent title */
  agentTitle: string;
  /** Workflow name */
  workflow: string;
  /** Workflow description */
  description: string;
  /** Example action for retry */
  action: string;
}

/**
 * Agent match for ambiguous results
 */
export interface AgentMatch {
  /** Composite key: module:agent */
  key: string;
  /** Module name */
  module: string;
  /** Agent name */
  agentName: string;
  /** Agent display name */
  agentDisplayName: string;
  /** Agent title */
  agentTitle: string;
  /** Agent role */
  role: string;
  /** Agent description/identity */
  description: string;
  /** Example action for retry */
  action: string;
}

/**
 * Ambiguous workflow result when multiple workflows match
 */
export interface AmbiguousWorkflowResult extends BMADResult {
  success: true;
  /** Indicates this is an ambiguous result requiring user/LLM choice */
  ambiguous: true;
  /** Type discriminator */
  type: 'workflow';
  /** Array of matching workflows */
  matches: WorkflowMatch[];
}

/**
 * Ambiguous agent result when multiple agents match
 */
export interface AmbiguousAgentResult extends BMADResult {
  success: true;
  /** Indicates this is an ambiguous result requiring user/LLM choice */
  ambiguous: true;
  /** Type discriminator */
  type: 'agent';
  /** Array of matching agents */
  matches: AgentMatch[];
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
  /** User message/context (optional - some agents/workflows may work without initial message) */
  message?: string;
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
  private tools: Tool[] = [];
  private tasks: Task[] = [];
  private cachedResources: Array<{ uri: string; relativePath: string }> = [];
  private initialized = false;

  /** Session-based usage tracker for intelligent ranking */
  private sessionTracker: SessionTracker;

  /**
   * Creates a new BMAD Engine instance
   *
   * @param projectRoot - Optional project root directory
   * @param gitRemotes - Optional array of Git remote URLs
   * @param discoveryMode - Discovery mode for source filtering (strict/local/user/auto)
   */
  constructor(
    projectRoot?: string,
    gitRemotes?: string[],
    discoveryMode?: DiscoveryMode,
  ) {
    this.loader = new ResourceLoaderGit(projectRoot, gitRemotes, discoveryMode);
    this.sessionTracker = new SessionTracker();
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

    // Load all tools with metadata
    this.tools = await this.loader.listToolsWithMetadata();

    // Load all tasks with metadata
    this.tasks = await this.loader.listTasksWithMetadata();

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
  // RANKING HELPERS (Session-based Intelligence)
  // ============================================================================

  /**
   * Rank items by usage patterns, manifest priority, and module boost
   *
   * @param items Array of items to rank (agents, workflows, or matches)
   * @param keyExtractor Function to extract composite key from item (e.g., "core:debug")
   * @returns Ranked array (highest score first)
   */
  private rankByUsage<T>(items: T[], keyExtractor: (item: T) => string): T[] {
    return items
      .map((item, index) => ({
        item,
        score: this.sessionTracker.calculateScore(
          keyExtractor(item),
          index, // Manifest position
          items.length,
        ),
      }))
      .sort((a, b) => b.score - a.score) // Descending order
      .map((ranked) => ranked.item);
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

    // Rank agents by usage patterns
    const rankedAgents = this.rankByUsage(
      agents,
      (a) => `${a.module}:${a.name}`,
    );

    const agentList = rankedAgents.map((a) => ({
      name: a.name,
      module: a.module,
      displayName: a.displayName,
      title: a.title,
      role: a.role,
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
   * List all available workflows by extracting them from agent menu items.
   *
   * Only workflows linked to agents appear in this list.
   * Workflows not linked to agents can still be executed via direct bmad:// URI.
   */
  async listWorkflows(filter?: ListFilter): Promise<BMADResult> {
    await this.initialize();

    // Build workflow list from agent metadata
    const workflowMap = new Map<
      string,
      {
        name: string;
        description: string;
        module?: string;
        agents: string[];
        standalone: boolean;
      }
    >();

    // Scan all agents for their workflow menu items
    for (const agent of this.agentMetadata) {
      if (!agent.workflows || agent.workflows.length === 0) continue;

      // Apply module filter if specified
      if (filter?.module && agent.module !== filter.module) continue;

      // Process each workflow this agent offers
      for (let i = 0; i < agent.workflows.length; i++) {
        const workflowName = agent.workflows[i];
        const menuItemDesc = agent.workflowMenuItems?.[i] || workflowName;
        // Use module:name as the unique key for deduplication
        const workflowKey = `${agent.module || 'core'}:${workflowName}`;

        if (!workflowMap.has(workflowKey)) {
          workflowMap.set(workflowKey, {
            name: workflowName,
            description: menuItemDesc,
            module: agent.module,
            agents: [agent.name],
            standalone: true, // Can be executed directly via bmad tool
          });
        } else {
          // Workflow offered by multiple agents
          workflowMap.get(workflowKey)!.agents.push(agent.name);
        }
      }
    }

    // Convert to array and rank by usage
    const workflows = Array.from(workflowMap.values());
    const rankedWorkflows = this.rankByUsage(
      workflows,
      (w) => `${w.module || 'core'}:${w.name}`,
    );

    const text = this.formatWorkflowList(rankedWorkflows);

    return {
      success: true,
      data: rankedWorkflows,
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

      // Handle virtual manifest generation for _cfg/*.csv files
      let content: string;

      if (relativePath === '_cfg/agent-manifest.csv') {
        content = this.generateAgentManifest();
      } else if (relativePath === '_cfg/workflow-manifest.csv') {
        content = this.generateWorkflowManifest();
      } else if (relativePath === '_cfg/tool-manifest.csv') {
        content = this.generateToolManifest();
      } else if (relativePath === '_cfg/task-manifest.csv') {
        content = this.generateTaskManifest();
      } else {
        // Default: Load file from filesystem
        content = await this.loader.loadFile(relativePath);
      }

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
  async executeAgent(
    params: ExecuteParams,
  ): Promise<BMADResult | AmbiguousAgentResult> {
    if (!params.agent) {
      return {
        success: false,
        error: 'Agent name is required',
        text: '❌ Agent name is required for execution',
      };
    }

    await this.initialize();

    try {
      // Find all agents matching the name
      const matchingAgents = this.agentMetadata.filter(
        (a) => a.name === params.agent,
      );

      // Filter by module if specified
      const filteredAgents = params.module
        ? matchingAgents.filter((a) => a.module === params.module)
        : matchingAgents;

      // Check for ambiguity: multiple matches without module filter
      if (!params.module && filteredAgents.length > 1) {
        // Build matches array
        const matches: AgentMatch[] = filteredAgents.map((agent) => {
          const module = agent.module || 'core';
          const key = `${module}:${agent.name}`;

          return {
            key,
            module,
            agentName: agent.name,
            agentDisplayName: agent.displayName,
            agentTitle: agent.title,
            role: agent.role || 'Agent',
            description:
              agent.description || agent.persona || 'No description available',
            action: `bmad({ operation: "execute", agent: "${agent.name}", module: "${module}" })`,
          };
        });

        // Rank matches by usage patterns
        const rankedMatches = this.rankByUsage(matches, (m) => m.key);

        // Return ambiguous result
        return {
          success: true,
          ambiguous: true,
          type: 'agent',
          matches: rankedMatches,
          text: this.formatAmbiguousAgentResponse(rankedMatches),
        };
      }

      // Single match or module-filtered result
      const selectedAgent = filteredAgents[0];

      if (!selectedAgent) {
        return {
          success: false,
          error: `Agent not found: ${params.agent}${params.module ? ` in module: ${params.module}` : ''}`,
          text: this.formatAgentNotFound(params.agent),
        };
      }

      // Build minimal execution context (NO agent content loading!)
      const executionContext = {
        agent: params.agent,
        userContext: params.message,
      };

      // Track agent usage for ranking
      const module = selectedAgent.module || 'core';
      this.sessionTracker.recordUsage(`${module}:${params.agent}`);

      // Build the prompt with just agent name and instructions
      const text = getAgentExecutionPrompt(executionContext);

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
   * Execute a workflow using agent-specific workflow handler instructions.
   *
   * Injects ONLY:
   * 1. Agent's workflow handler instructions (tells LLM what to do)
   * 2. workflow.yaml (raw configuration)
   *
   * The agent's workflow handler will instruct the LLM to load workflow.xml
   * and any other files needed.
   */
  async executeWorkflow(
    params: ExecuteParams,
  ): Promise<BMADResult | AmbiguousWorkflowResult> {
    if (!params.workflow) {
      return {
        success: false,
        error: 'Workflow name is required',
        text: '❌ Workflow name is required for execution',
      };
    }

    await this.initialize();

    try {
      // PRIORITY 1: Check if this is a standalone workflow FIRST
      // Standalone workflows execute directly without agent selection
      const standaloneWorkflow = this.workflows.find(
        (w) =>
          w.name === params.workflow &&
          w.standalone &&
          (!params.module || w.module === params.module),
      );

      if (standaloneWorkflow) {
        // Execute standalone workflow without agent
        const workflowPath = `{project-root}/bmad/${standaloneWorkflow.module}/workflows/${params.workflow}/workflow.yaml`;

        const executionContext = {
          workflow: params.workflow,
          workflowPath,
          userContext: params.message,
          agent: undefined,
          agentWorkflowHandler: undefined,
        };

        // Track workflow usage for ranking
        this.sessionTracker.recordUsage(
          `${standaloneWorkflow.module}:${params.workflow}`,
        );

        const text = getWorkflowExecutionPrompt(executionContext);

        return {
          success: true,
          data: executionContext,
          text,
        };
      }

      // PRIORITY 2: Find all agents that offer this workflow
      const matchingAgents = this.agentMetadata.filter((a) =>
        a.workflows?.includes(params.workflow!),
      );

      // Filter by module if specified
      const filteredAgents = params.module
        ? matchingAgents.filter((a) => a.module === params.module)
        : matchingAgents;

      // Check for ambiguity: multiple matches without module filter
      if (!params.module && filteredAgents.length > 1) {
        // Build matches array
        const matches: WorkflowMatch[] = filteredAgents.map((agent) => {
          const module = agent.module || 'core';
          const key = `${module}:${agent.name}:${params.workflow}`;
          const workflowIndex = agent.workflows!.indexOf(params.workflow!);
          const description =
            agent.workflowMenuItems?.[workflowIndex] || params.workflow!;

          return {
            key,
            module,
            agentName: agent.name,
            agentDisplayName: agent.displayName,
            agentTitle: agent.title,
            workflow: params.workflow!,
            description,
            action: `bmad({ operation: "execute", workflow: "${params.workflow}", module: "${module}" })`,
          };
        });

        // Rank matches by usage patterns
        const rankedMatches = this.rankByUsage(matches, (m) => m.key);

        // Return ambiguous result
        return {
          success: true,
          ambiguous: true,
          type: 'workflow',
          matches: rankedMatches,
          text: this.formatAmbiguousWorkflowResponse(rankedMatches),
        };
      }

      // Single match or module-filtered result
      let agentForWorkflow: AgentMetadata | undefined;

      if (params.agent) {
        // User specified which agent to use
        agentForWorkflow = this.agentMetadata.find(
          (a) => a.name === params.agent,
        );
      } else {
        // Use first filtered match
        agentForWorkflow = filteredAgents[0];
      }

      if (!agentForWorkflow) {
        return {
          success: false,
          error: `No agent found offering workflow: ${params.workflow}${params.module ? ` in module: ${params.module}` : ''}`,
          text: this.formatWorkflowNotFound(params.workflow),
        };
      }

      // Get workflow path from agent metadata
      const workflowPath =
        agentForWorkflow?.workflowPaths?.[params.workflow] ||
        `{project-root}/bmad/workflows/${params.workflow}/workflow.yaml`;

      // Build minimal execution context (NO workflow.yaml loading!)
      const executionContext = {
        workflow: params.workflow,
        workflowPath,
        userContext: params.message,
        agent: agentForWorkflow?.name,
        agentWorkflowHandler: agentForWorkflow?.workflowHandlerInstructions,
      };

      // Track workflow and agent usage for ranking
      const module = agentForWorkflow?.module || 'core';
      this.sessionTracker.recordUsage(`${module}:${params.workflow}`);
      if (agentForWorkflow) {
        this.sessionTracker.recordUsage(`${module}:${agentForWorkflow.name}`);
      }

      // Build the prompt with just agent metadata and handler
      const text = getWorkflowExecutionPrompt(executionContext);

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

  /**
   * Format ambiguous workflow response when multiple workflows match
   * Optimized for LLM comprehension and token efficiency
   */
  private formatAmbiguousWorkflowResponse(matches: WorkflowMatch[]): string {
    const workflowName = matches[0].workflow;
    const module = matches[0].module;

    const lines = [
      `**Multiple Agent Options Available**`,
      '',
      `intent: "Workflow '${workflowName}' offered by ${matches.length} agents in module '${module}'"`,
      `action_required: "Select agent perspective"`,
      '',
      '**Options** (ranked by relevance):',
    ];

    matches.forEach((match, index) => {
      const star = index === 0 ? '⭐ ' : '';
      const roleKeyword = match.agentTitle.split(' ')[0];
      lines.push(
        `${index + 1}. ${star}${match.agentName} (${match.agentDisplayName}) - ${roleKeyword} perspective`,
      );
      lines.push(`   • "${match.description}"`);
      lines.push(
        `   • Retry: bmad({ operation: "execute", workflow: "${workflowName}", module: "${module}", agent: "${match.agentName}" })`,
      );
      lines.push('');
    });

    lines.push('**Decision Heuristics:**');
    lines.push(
      '- Context with "analyze|review|business" → analyst (confidence: high)',
    );
    lines.push(
      '- Context with "design|architecture|technical" → architect (confidence: high)',
    );
    lines.push(
      '- Context with "implement|code|develop" → dev (confidence: high)',
    );
    lines.push('- Context with "test|quality|qa" → tea (confidence: high)');
    lines.push(
      '- Context with "plan|manage|coordinate" → pm/sm (confidence: medium)',
    );
    lines.push(
      '- No strong signal → Select ⭐ option or offer numbered menu to user',
    );
    lines.push('');
    lines.push('**Metrics:**');
    lines.push(`- options: ${matches.length}`);
    lines.push(
      `- token_estimate: ${Math.round(matches.length * 80)} (vs ${Math.round(matches.length * 280)} full load)`,
    );
    lines.push('- estimated_comprehension_cost: low');

    return lines.join('\n');
  }

  /**
   * Format ambiguous agent response when multiple agents match
   * Optimized for LLM comprehension and token efficiency
   */
  private formatAmbiguousAgentResponse(matches: AgentMatch[]): string {
    const lines = [
      `**Multiple Agent Matches**`,
      '',
      `intent: "Found ${matches.length} agents matching your request"`,
      `action_required: "Select most relevant agent"`,
      '',
      '**Agents** (ranked by relevance):',
    ];

    matches.forEach((match, index) => {
      const star = index === 0 ? '⭐ ' : '';
      const roleKeyword = match.agentTitle.split(' ')[0];
      lines.push(
        `${index + 1}. ${star}${match.agentName} (${match.agentDisplayName}) - ${roleKeyword}`,
      );
      lines.push(`   • Role: ${match.role}`);
      lines.push(`   • Module: ${match.module}`);
      lines.push(
        `   • Execute: bmad({ operation: "execute", agent: "${match.agentName}", module: "${match.module}", message: "your request" })`,
      );
      lines.push('');
    });

    lines.push('**Decision Heuristics:**');
    lines.push(
      '- Task involves requirements/business logic → analyst/pm (confidence: high)',
    );
    lines.push(
      '- Task involves system design/architecture → architect (confidence: high)',
    );
    lines.push(
      '- Task involves implementation/coding → dev (confidence: high)',
    );
    lines.push('- Task involves testing/quality → tea (confidence: high)');
    lines.push(
      '- Task involves debugging/investigation → debug (confidence: high)',
    );
    lines.push(
      '- No strong signal → Select ⭐ option or offer numbered menu to user',
    );
    lines.push('');
    lines.push('**Metrics:**');
    lines.push(`- matches: ${matches.length}`);
    lines.push('- estimated_comprehension_cost: low');

    return lines.join('\n');
  }

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
      module?: string;
      agents?: string[];
      standalone?: boolean;
    }>,
  ): string {
    const lines = [`⚙️  Available BMAD Workflows (${workflows.length})\n`];

    workflows.forEach((w) => {
      const agentInfo =
        w.agents && w.agents.length > 0 ? ` (via ${w.agents.join(', ')})` : '';
      lines.push(`**${w.name}**${agentInfo}: ${w.description}`);
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

    // Include full agent content (instructions/template)
    if (agent.content) {
      lines.push('', '---', '', agent.content);
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

  // ============================================================================
  // PUBLIC GETTERS (For MCP Server and other consumers)
  // ============================================================================

  /**
   * Get agent metadata (requires initialization)
   */
  getAgentMetadata(): AgentMetadata[] {
    return this.agentMetadata;
  }

  /**
   * Get workflow metadata (requires initialization)
   */
  getWorkflowMetadata(): Workflow[] {
    return this.workflows;
  }

  /**
   * Get cached resources (requires initialization)
   */
  getCachedResources(): Array<{ uri: string; relativePath: string }> {
    return this.cachedResources;
  }

  /**
   * Get the underlying ResourceLoaderGit instance
   */
  getLoader(): ResourceLoaderGit {
    return this.loader;
  }

  // ============================================================================
  // VIRTUAL MANIFEST GENERATION
  // ============================================================================

  /**
   * Generate virtual agent-manifest.csv from loaded agent metadata
   *
   * @returns CSV-formatted string matching BMAD agent-manifest.csv schema
   *
   * @remarks
   * Maps AgentMetadata fields to CSV columns:
   * - name, displayName, title, role, module: direct mapping
   * - identity: mapped from persona field
   * - icon, communicationStyle, principles: extracted from agent XML
   * - path: constructed from module/agents/{name}.md
   */
  generateAgentManifest(): string {
    const rows: string[] = [];

    // CSV header matching BMAD schema
    rows.push(
      'name,displayName,title,icon,role,identity,communicationStyle,principles,module,path',
    );

    // Generate row for each agent
    for (const agent of this.agentMetadata) {
      // Get raw values first
      const nameRaw = agent.name || '';
      const moduleRaw = agent.module || 'core';

      // Escape for CSV
      const name = this.escapeCsvField(nameRaw);
      const displayName = this.escapeCsvField(agent.displayName || '');
      const title = this.escapeCsvField(agent.title || '');
      const icon = this.escapeCsvField(agent.icon || '');
      const role = this.escapeCsvField(agent.role || '');
      const identity = this.escapeCsvField(agent.persona || ''); // persona maps to identity
      const communicationStyle = this.escapeCsvField(
        agent.communicationStyle || '',
      );
      const principles = this.escapeCsvField(agent.principles || '');
      const module = this.escapeCsvField(moduleRaw);
      const path = this.escapeCsvField(
        `bmad/${moduleRaw}/agents/${nameRaw}.md`,
      );

      rows.push(
        `${name},${displayName},${title},${icon},${role},${identity},${communicationStyle},${principles},${module},${path}`,
      );
    }

    return rows.join('\n');
  }

  /**
   * Generate virtual workflow-manifest.csv from loaded workflow metadata
   *
   * @returns CSV-formatted string matching BMAD workflow-manifest.csv schema
   *
   * @remarks
   * Maps Workflow fields to CSV columns:
   * - name, description, module, path, standalone: direct mapping
   */
  generateWorkflowManifest(): string {
    const rows: string[] = [];

    // CSV header matching BMAD schema
    rows.push('name,description,module,path,standalone');

    // Generate row for each workflow
    for (const workflow of this.workflows) {
      const name = this.escapeCsvField(workflow.name || '');
      const description = this.escapeCsvField(workflow.description || '');
      const module = this.escapeCsvField(workflow.module || 'core');
      const path = this.escapeCsvField(workflow.path || '');
      const standalone = this.escapeCsvField(
        workflow.standalone ? 'true' : 'false',
      );

      rows.push(`${name},${description},${module},${path},${standalone}`);
    }

    return rows.join('\n');
  }

  /**
   * Generate virtual tool-manifest.csv from loaded tool metadata
   *
   * @returns CSV-formatted string matching BMAD tool-manifest.csv schema
   *
   * @remarks
   * Maps Tool fields to CSV columns:
   * - name, displayName, description, module, path, standalone: direct mapping
   */
  generateToolManifest(): string {
    const rows: string[] = [];

    // CSV header matching BMAD schema
    rows.push('name,displayName,description,module,path,standalone');

    // Generate row for each tool
    for (const tool of this.tools) {
      const name = this.escapeCsvField(tool.name || '');
      const displayName = this.escapeCsvField(tool.displayName || '');
      const description = this.escapeCsvField(tool.description || '');
      const module = this.escapeCsvField(tool.module || 'core');
      const path = this.escapeCsvField(tool.path || '');
      const standalone = this.escapeCsvField(
        tool.standalone ? 'true' : 'false',
      );

      rows.push(
        `${name},${displayName},${description},${module},${path},${standalone}`,
      );
    }

    return rows.join('\n');
  }

  /**
   * Generate virtual task-manifest.csv from loaded task metadata
   *
   * @returns CSV-formatted string matching BMAD task-manifest.csv schema
   *
   * @remarks
   * Maps Task fields to CSV columns:
   * - name, displayName, description, module, path, standalone: direct mapping
   */
  generateTaskManifest(): string {
    const rows: string[] = [];

    // CSV header matching BMAD schema
    rows.push('name,displayName,description,module,path,standalone');

    // Generate row for each task
    for (const task of this.tasks) {
      const name = this.escapeCsvField(task.name || '');
      const displayName = this.escapeCsvField(task.displayName || '');
      const description = this.escapeCsvField(task.description || '');
      const module = this.escapeCsvField(task.module || 'core');
      const path = this.escapeCsvField(task.path || '');
      const standalone = this.escapeCsvField(
        task.standalone ? 'true' : 'false',
      );

      rows.push(
        `${name},${displayName},${description},${module},${path},${standalone}`,
      );
    }

    return rows.join('\n');
  }

  /**
   * Escape a field for CSV output
   * Wraps in quotes if contains comma, quote, or newline
   */
  private escapeCsvField(value: string): string {
    if (!value) return '""';

    // Check if needs quoting (contains special characters)
    const needsQuoting =
      value.includes(',') ||
      value.includes('"') ||
      value.includes('\n') ||
      value.includes('\r');

    if (needsQuoting) {
      // Escape quotes by doubling them
      const escaped = value.replace(/"/g, '""');
      return `"${escaped}"`;
    }

    // Wrap in quotes for consistency with BMAD manifests (all fields quoted)
    return `"${value}"`;
  }
}
