/**
 * BMAD MCP Server - Lite Multi-Tool with Git Support
 *
 * Tool-per-agent architecture + Git remote sources.
 * Combines the best of both worlds: simple architecture + Git flexibility.
 *
 * @remarks
 * This server implements the Model Context Protocol (MCP) to expose BMAD (Business Methodology Automation and Delivery)
 * agents and workflows as MCP tools. It supports multiple source types:
 * - Project-local BMAD installation
 * - User-global BMAD installation
 * - Git remote repositories (via git+ URLs)
 *
 * The server provides three main MCP tool categories:
 * 1. **Agent Tools**: One tool per BMAD agent (e.g., `bmad-pm`, `bmad-architect`)
 * 2. **Workflow Tool**: Execute BMAD workflows (`bmad-workflow`)
 * 3. **Resources Tool**: Access BMAD files and metadata (`bmad-resources`)
 *
 * @example
 * ```typescript
 * // Basic usage with project-local BMAD
 * const server = new BMADServerLiteMultiToolGit();
 * await server.start();
 *
 * // With custom project root and Git remotes
 * const server = new BMADServerLiteMultiToolGit(
 *   '/path/to/project',
 *   ['git+https://github.com/user/bmad-custom.git']
 * );
 * await server.start();
 * ```
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  TextContent,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ResourceLoaderGit, AgentMetadata } from './resource-loader.js';
import type { Workflow } from './types/index.js';
import {
  SERVER_CONFIG,
  // TOOL_NAMES, // TODO: Re-enable when unified tool is implemented
  // TOOL_DESCRIPTIONS, // TODO: Re-enable when unified tool is implemented
  getAgentInstructions,
  getWorkflowInstructions,
} from './config.js';

export class BMADServerLiteMultiToolGit {
  private server: Server;
  private loader: ResourceLoaderGit;
  private agentMetadata: AgentMetadata[] = [];
  private workflows: Workflow[] = [];
  private cachedResources: Array<{
    uri: string;
    name: string;
    description: string;
    mimeType: string;
  }> = [];
  private initialized = false;

  /**
   * Creates a new BMAD MCP Server instance
   *
   * @param projectRoot - Optional project root directory. If not provided, uses current working directory.
   *                     This is where the server looks for project-local BMAD installations.
   * @param gitRemotes - Optional array of Git remote URLs (git+ protocol) to load additional BMAD content from.
   *                    URLs should be in format: `git+https://github.com/user/repo.git` or `git+ssh://git@github.com/user/repo.git`
   *
   * @remarks
   * The server automatically discovers BMAD content from multiple sources in priority order:
   * 1. Project-local: `{projectRoot}/bmad/` directory
   * 2. User-global: `~/.bmad/` directory
   * 3. Git remotes: Specified git+ URLs (cloned to cache)
   *
   * @example
   * ```typescript
   * // Use current directory as project root
   * const server = new BMADServerLiteMultiToolGit();
   *
   * // Specify custom project root
   * const server = new BMADServerLiteMultiToolGit('/path/to/my/project');
   *
   * // Add Git remote sources
   * const server = new BMADServerLiteMultiToolGit(
   *   undefined,
   *   ['git+https://github.com/company/bmad-extensions.git']
   * );
   * ```
   */
  constructor(projectRoot?: string, gitRemotes?: string[]) {
    this.loader = new ResourceLoaderGit(projectRoot, gitRemotes);
    this.server = new Server(
      {
        name: SERVER_CONFIG.name,
        version: SERVER_CONFIG.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );

    this.setupHandlers();
  }

  /**
   * Pre-load all agents, workflows, and resources into memory
   *
   * @privateRemarks
   * This method performs eager loading of all BMAD content to ensure fast response times
   * for MCP requests. It discovers content from all configured sources and builds
   * in-memory caches for optimal performance.
   *
   * Loading sequence:
   * 1. Load agent metadata from all sources
   * 2. Load workflow names from all sources
   * 3. Build complete file manifest with MIME types
   * 4. Mark server as initialized
   *
   * @throws Will throw if any BMAD source fails to load
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load all agents with metadata
    this.agentMetadata = await this.loader.listAgentsWithMetadata();

    // Load all workflows with metadata
    this.workflows = await this.loader.listWorkflowsWithMetadata();

    // Pre-build resource list - expose ALL files from BMAD sources
    this.cachedResources = [];

    // Get all files from BMAD installation
    const allFiles = await this.loader.listAllFiles();

    for (const file of allFiles) {
      // Determine mime type
      let mimeType = 'text/plain';
      if (file.relativePath.endsWith('.md')) mimeType = 'text/markdown';
      else if (
        file.relativePath.endsWith('.yaml') ||
        file.relativePath.endsWith('.yml')
      )
        mimeType = 'application/x-yaml';
      else if (file.relativePath.endsWith('.json'))
        mimeType = 'application/json';
      else if (file.relativePath.endsWith('.xml')) mimeType = 'application/xml';
      else if (file.relativePath.endsWith('.csv')) mimeType = 'text/csv';

      this.cachedResources.push({
        uri: `bmad://${file.relativePath}`,
        name: file.relativePath,
        description: `BMAD resource: ${file.relativePath} (source: ${file.source})`,
        mimeType,
      });
    }

    this.initialized = true;
  }

  /**
   * Sets up all MCP request handlers for the server
   *
   * @privateRemarks
   * Configures handlers for the three main MCP protocol methods:
   * - `ListResources`: Returns all available BMAD files as MCP resources
   * - `ReadResource`: Loads and returns content of specific BMAD files
   * - `ListTools`: Returns all available BMAD agents and built-in tools
   * - `CallTool`: Executes agent tools, workflows, or resource operations
   *
   * All handlers ensure initialization before processing requests.
   */
  private setupHandlers(): void {
    // List available resources (agent-scoped workflows and agents)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      await this.initialize();
      return { resources: this.cachedResources };
    });

    // Read a specific resource
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const uri = request.params.uri;

        // Parse URI: bmad://path/to/file.ext
        const pathMatch = uri.match(/^bmad:\/\/(.+)$/);
        if (!pathMatch) {
          throw new Error(`Invalid resource URI: ${uri}`);
        }

        const relativePath = pathMatch[1];

        try {
          const content = await this.loader.loadFile(relativePath);

          // Determine mime type
          let mimeType = 'text/plain';
          if (relativePath.endsWith('.md')) mimeType = 'text/markdown';
          else if (
            relativePath.endsWith('.yaml') ||
            relativePath.endsWith('.yml')
          )
            mimeType = 'application/x-yaml';
          else if (relativePath.endsWith('.json'))
            mimeType = 'application/json';
          else if (relativePath.endsWith('.xml')) mimeType = 'application/xml';
          else if (relativePath.endsWith('.csv')) mimeType = 'text/csv';

          return {
            contents: [
              {
                uri,
                mimeType,
                text: content,
              },
            ],
          };
        } catch (error) {
          throw new Error(
            `Resource not found: ${relativePath} (${error instanceof Error ? error.message : String(error)})`,
          );
        }
      },
    );

    // List available tools (dynamically generated from available agents)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Ensure initialized
      await this.initialize();

      const tools: Tool[] = [];

      // ============================================================================
      // TODO: REFACTOR TO UNIFIED BMAD TOOL
      // ============================================================================
      // These individual agent tools are being phased out in favor of a single
      // unified 'bmad' tool that handles all agent/workflow/resource operations.
      //
      // Current architecture: One tool per agent (bmm-analyst, bmm-architect, etc.)
      // New architecture: Single 'bmad' tool with operations: list, read, execute
      //
      // See: src/tools/bmad-unified.ts for new implementation
      // See: test-prompts.json for test specification
      //
      // Keeping old tool registration code commented below for reference.
      // Will be removed once new tool is fully tested and validated.
      // ============================================================================

      // OLD CODE - Create one tool per agent
      // Disabled during refactor to unified tool approach
      // for (const agent of this.agentMetadata) {
      //   const toolName = agent.module
      //     ? `${agent.module}-${agent.name}`
      //     : `bmad-${agent.name}`;
      //   tools.push({ ...agentToolDefinition... });
      // }

      // OLD CODE - Workflow tool
      // tools.push({ name: TOOL_NAMES.workflow, ...workflowToolDefinition... });

      // OLD CODE - Resources tool
      // tools.push({ name: TOOL_NAMES.resources, ...resourcesToolDefinition... });

      // ============================================================================
      // NEW: Unified BMAD Tool (to be implemented)
      // ============================================================================
      // TODO: Import and register unified bmad tool here
      // import { createBMADTool } from './tools/bmad-unified.js';
      // tools.push(createBMADTool(this.agentMetadata, this.workflows));
      // ============================================================================

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, (request) => {
      const toolName = request.params.name;
      // const args = request.params.arguments ?? {}; // TODO: Re-enable when unified tool is implemented

      // ============================================================================
      // TODO: REFACTOR TOOL CALL HANDLER
      // ============================================================================
      // Old handlers for individual agent tools, workflow tool, and resources tool
      // are disabled during migration to unified bmad tool.
      //
      // New handler will route all calls through single bmad tool implementation.
      // ============================================================================

      // Placeholder - will be replaced with unified tool handler
      throw new Error(
        `Tool system disabled during refactor. Tool '${toolName}' not available. ` +
          `See src/tools/bmad-unified.ts for new implementation.`,
      );

      // OLD CODE - Agent tool handler (disabled)
      // if (toolName !== TOOL_NAMES.workflow && toolName !== TOOL_NAMES.resources) {
      //   const agent = this.agentMetadata.find(...);
      //   if (agent) return await this.invokeAgent(agent.name, message);
      // }

      // OLD CODE - Workflow tool handler (disabled)
      // if (toolName === TOOL_NAMES.workflow) {
      //   return await this.executeWorkflow(workflow, context);
      // }

      // OLD CODE - Resources tool handler (disabled)
      // if (toolName === TOOL_NAMES.resources) {
      //   switch (operation) { case 'read': ... case 'list': ... }
      // }
    });
  }

  /**
   * Formats agent metadata into a human-readable description for MCP tool listings
   *
   * @param agent - Agent metadata containing display name, title, description, etc.
   * @returns Formatted description string suitable for MCP tool descriptions
   *
   * @privateRemarks
   * Creates a structured description that includes:
   * - Agent display name and title
   * - Description (if available)
   * - Persona/role information
   * - Available workflow actions (with workflow names for direct invocation)
   *
   * The enhanced workflow section helps LLMs understand:
   * 1. What workflows this agent can guide them through
   * 2. How to invoke workflows directly using bmad-workflow tool
   * 3. When to use the agent vs. when to go straight to a workflow
   *
   * Used by the ListTools handler to provide rich tool descriptions.
   */
  private formatAgentDescription(agent: AgentMetadata): string {
    const parts: string[] = [];

    // Instructions section
    parts.push('**Instructions**:');
    parts.push('');
    parts.push(
      `Use this tool when the user requests the BMAD '${agent.name}' agent.`,
    );
    parts.push(
      'Use this tool if the related task fits this agents duties and responsabilities.',
    );
    parts.push('');

    // Agent Details section
    parts.push('**Agent Details**:');
    parts.push('');
    parts.push(`Agent: ${agent.name}`);
    parts.push(`Module: ${agent.module}`);
    parts.push('');
    parts.push(`Name: ${agent.displayName}`);
    parts.push(`Title: ${agent.title}`);
    parts.push('');

    // Description (if present and different from title)
    if (agent.description && agent.description !== agent.title) {
      parts.push(`Description: ${agent.description}`);
      parts.push('');
    }

    // Available Workflows section
    if (
      agent.workflowMenuItems &&
      agent.workflowMenuItems.length > 0 &&
      agent.workflows &&
      agent.workflows.length > 0
    ) {
      parts.push('**Available Workflows**:');
      parts.push('');

      agent.workflows.forEach((workflow, index) => {
        const description =
          (agent.workflowMenuItems && agent.workflowMenuItems[index]) || '';
        parts.push(`- ${workflow}: ${description}`);
      });

      parts.push('');
      parts.push('**Workflow Invocation**: ');
      parts.push('');
      parts.push('Use bmad-workflow tool to run any workflow directly.');
      parts.push(
        `Example: bmad-workflow({ workflow: "${agent.workflows[0]}" })`,
      );
    }

    return parts.join('\n');
  }

  /**
   * Invokes a BMAD agent by loading its definition and creating an execution context
   *
   * @param agentName - Name of the agent to invoke (without module prefix)
   * @param message - User's message/question for the agent
   * @returns MCP tool response containing the agent execution context
   *
   * @privateRemarks
   * This method:
   * 1. Loads the agent's XML definition from BMAD sources
   * 2. Translates filesystem paths to MCP resource URIs
   * 3. Creates a structured prompt with agent instructions and resource access guide
   * 4. Returns formatted content for the MCP client to execute
   *
   * The agent execution follows BMAD methodology where agents must fully embody
   * their persona and follow activation instructions precisely.
   *
   * @throws Returns error response if agent cannot be found or loaded
   */
  private async invokeAgent(
    agentName: string,
    _message: string,
  ): Promise<{ content: TextContent[] }> {
    try {
      const resource = await this.loader.loadAgent(agentName);
      // const metadata = this.agentMetadata.find((a) => a.name === agentName);

      // Translate filesystem paths to MCP resource URIs
      // Replace {project-root}/bmad/ with bmad://
      let agentContent = resource.content;
      agentContent = agentContent.replace(
        /\{project-root\}\/bmad\//g,
        'bmad://',
      );

      return {
        content: [
          {
            type: 'text',
            text: `${getAgentInstructions()}

---

<instructions>
${agentContent}
</instructions>`,
          },
        ],
      };
    } catch {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Agent not found: ${agentName}

Available agents:
${this.agentMetadata.map((a) => `- ${a.module ? `${a.module}-${a.name}` : `bmad-${a.name}`}`).join('\n')}

Use bmad-resources with operation=agents to see all available agents.`,
          },
        ],
      };
    }
  }

  /**
   * Executes a BMAD workflow by loading its configuration and creating an execution context
   *
   * @param workflowName - Name of the workflow to execute (without module prefix)
   * @param context - Optional context or parameters for the workflow execution
   * @returns MCP tool response containing the workflow execution context
   *
   * @privateRemarks
   * This method:
   * 1. Loads the workflow's XML configuration from BMAD sources
   * 2. Creates a structured prompt with workflow instructions and resource access guide
   * 3. Includes user-provided context if specified
   * 4. Returns formatted content for the MCP client to execute
   *
   * Workflows follow BMAD methodology and must load the workflow execution engine
   * and follow all steps in the workflow configuration precisely.
   *
   * @throws Returns error response if workflow cannot be found or loaded
   */
  private async executeWorkflow(
    workflowName: string,
    context?: string,
  ): Promise<{ content: TextContent[] }> {
    try {
      const resource = await this.loader.loadWorkflow(workflowName);

      return {
        content: [
          {
            type: 'text',
            text: `${getWorkflowInstructions(workflowName, context)}

---

<instructions>
You are executing the BMAD workflow: ${workflowName}
</instructions>

<workflow-config>
${resource.content}
</workflow-config>`,
          },
        ],
      };
    } catch {
      const workflows = await this.loader.listWorkflows();
      return {
        content: [
          {
            type: 'text',
            text: `❌ Workflow not found: ${workflowName}

Available workflows:
${workflows.map((w) => `- ${w}`).join('\n')}

Use bmad-resources with operation=workflows to see all available workflows.`,
          },
        ],
      };
    }
  }

  /**
   * Reads and formats a BMAD resource file for MCP response
   *
   * @param uri - BMAD resource URI in format `bmad://path/to/file.ext`
   * @returns MCP tool response containing the formatted file content
   *
   * @privateRemarks
   * This method:
   * 1. Parses the bmad:// URI to extract the relative file path
   * 2. Loads the file content using the resource loader
   * 3. Determines appropriate syntax highlighting language based on file extension
   * 4. Returns formatted content with proper code block syntax highlighting
   *
   * Used by the bmad-resources tool with operation="read".
   *
   * @throws Returns error response if URI is invalid or file cannot be loaded
   */
  private async readResource(uri: string): Promise<{ content: TextContent[] }> {
    try {
      // Parse URI: bmad://path/to/file.ext
      const pathMatch = uri.match(/^bmad:\/\/(.+)$/);
      if (!pathMatch) {
        throw new Error(
          `Invalid resource URI: ${uri}. Expected format: bmad://path/to/file`,
        );
      }

      const relativePath = pathMatch[1];
      const content = await this.loader.loadFile(relativePath);

      // Determine file extension for syntax highlighting
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

      return {
        content: [
          {
            type: 'text',
            text: `📄 **${uri}**\n\n\`\`\`${lang}\n${content}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to read ${uri}\n\nError: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async listResources(
    pattern?: string,
  ): Promise<{ content: TextContent[] }> {
    try {
      await this.initialize();

      let resources = this.cachedResources;

      // Apply pattern filter if provided (simple glob matching)
      if (pattern) {
        const patternRegex = new RegExp(
          '^' +
            pattern
              .replace(/\*\*/g, '.*')
              .replace(/\*/g, '[^/]*')
              .replace(/\?/g, '.') +
            '$',
        );
        resources = resources.filter((r) => {
          const path = r.uri.replace('bmad://', '');
          return patternRegex.test(path);
        });
      }

      const resourceList = resources.map((r) => `- ${r.uri}`).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `📋 **Available BMAD Resources** (${resources.length} files)\n\n${resourceList}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to list resources\n\nError: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async listModules(): Promise<{ content: TextContent[] }> {
    await this.initialize();

    // Extract unique modules from agents
    const modules = new Set<string>();
    this.agentMetadata.forEach((a) => {
      if (a.module) {
        modules.add(a.module);
      }
    });

    const moduleList = Array.from(modules).sort();

    return {
      content: [
        {
          type: 'text',
          text: `📦 **Loaded BMAD Modules** (${moduleList.length})\n\n${moduleList.map((m) => `- ${m}`).join('\n')}`,
        },
      ],
    };
  }

  private async listAgents(): Promise<{ content: TextContent[] }> {
    await this.initialize();

    const agents = this.agentMetadata;
    const agentList = agents
      .map((a) => {
        const toolName = a.module ? `${a.module}-${a.name}` : `bmad-${a.name}`;
        const title = a.title ? ` (${a.title})` : '';
        const desc = a.description ? `\n  ${a.description}` : '';
        return `**${toolName}** - ${a.displayName}${title}${desc}`;
      })
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `🤖 **Available BMAD Agents** (${agents.length})\n\n${agentList}\n\n**Usage:** Invoke any agent by its tool name with a message parameter.`,
        },
      ],
    };
  }

  private async listWorkflows(): Promise<{ content: TextContent[] }> {
    await this.initialize();

    // Build workflow metadata map for descriptions (from CSV manifest)
    const workflowMetadata = new Map<string, Workflow>();
    this.workflows.forEach((w) => {
      workflowMetadata.set(w.name, w);
    });

    // Group by module → agent → workflows (using agents as source of truth)
    const byModule = new Map<
      string,
      Map<string, Array<{ name: string; description: string }>>
    >();
    const seenWorkflows = new Set<string>();

    for (const agent of this.agentMetadata) {
      if (!agent.workflows || agent.workflows.length === 0) continue;

      const module = agent.module || 'unknown';
      if (!byModule.has(module)) {
        byModule.set(module, new Map());
      }
      const agentMap = byModule.get(module)!;

      const agentKey = `${agent.displayName} (${agent.name})`;
      if (!agentMap.has(agentKey)) {
        agentMap.set(agentKey, []);
      }

      const workflowList = agentMap.get(agentKey)!;

      // Add workflows from agent (with descriptions from menu items)
      for (let i = 0; i < agent.workflows.length; i++) {
        const workflowPath = agent.workflows[i];
        // Extract workflow name from path
        const match = workflowPath.match(/\/workflows\/([^/]+)\//);
        const workflowName = match ? match[1] : workflowPath;

        // Get description from agent's menu items or fallback to CSV metadata
        let description = '';
        if (agent.workflowMenuItems && agent.workflowMenuItems[i]) {
          description = agent.workflowMenuItems[i];
        } else if (workflowMetadata.has(workflowName)) {
          description =
            workflowMetadata.get(workflowName)!.description ||
            'No description available';
        } else {
          description = 'No description available';
        }

        workflowList.push({ name: workflowName, description });
        seenWorkflows.add(workflowName);
      }
    }

    // Add standalone workflows (workflows not associated with any agent)
    const standaloneByModule = new Map<
      string,
      Array<{ name: string; description: string }>
    >();
    for (const workflow of this.workflows) {
      if (!seenWorkflows.has(workflow.name)) {
        const module = workflow.module || 'unknown';
        if (!standaloneByModule.has(module)) {
          standaloneByModule.set(module, []);
        }
        standaloneByModule.get(module)!.push({
          name: workflow.name,
          description: workflow.description || 'No description available',
        });
        seenWorkflows.add(workflow.name);
      }
    }

    // Sort modules (core first, then alphabetically)
    const allModules = new Set([
      ...byModule.keys(),
      ...standaloneByModule.keys(),
    ]);
    const sortedModules = Array.from(allModules).sort((a, b) => {
      if (a === 'core') return -1;
      if (b === 'core') return 1;
      return a.localeCompare(b);
    });

    // Count total workflows
    let totalWorkflows = 0;
    for (const agentMap of byModule.values()) {
      for (const workflows of agentMap.values()) {
        totalWorkflows += workflows.length;
      }
    }
    for (const workflows of standaloneByModule.values()) {
      totalWorkflows += workflows.length;
    }

    // Build output grouped by module → agent → workflows
    const sections: string[] = [];
    sections.push(`# BMAD Workflows (${totalWorkflows})\n`);

    for (const module of sortedModules) {
      const agentMap = byModule.get(module);
      const standaloneWorkflows = standaloneByModule.get(module) || [];
      const totalCount =
        (agentMap ? Array.from(agentMap.values()).flat().length : 0) +
        standaloneWorkflows.length;

      sections.push(`## ${module.toUpperCase()} (${totalCount})\n`);

      // Show agent-scoped workflows first
      if (agentMap) {
        const sortedAgents = Array.from(agentMap.keys()).sort();
        for (const agentKey of sortedAgents) {
          const workflows = agentMap.get(agentKey)!;
          sections.push(`### ${agentKey}\n`);
          workflows.forEach((w) => {
            sections.push(`- **${w.name}**: ${w.description}\n`);
          });
        }
      }

      // Show standalone workflows last
      if (standaloneWorkflows.length > 0) {
        sections.push(`### Standalone Workflows\n`);
        standaloneWorkflows.forEach((w) => {
          sections.push(`- **${w.name}**: ${w.description}\n`);
        });
      }
    }

    sections.push('---\n');
    sections.push('## Workflow Invocation\n');
    sections.push(
      'Use the `bmad-workflow` tool to execute any workflow directly.\n',
    );
    sections.push('**Example:**\n');
    sections.push('```\nbmad-workflow({ workflow: "prd" })\n```');

    const workflowList = sections.join('\n');

    return {
      content: [
        {
          type: 'text',
          text: workflowList,
        },
      ],
    };
  }

  private async searchResources(
    query: string,
    type: string,
  ): Promise<{ content: TextContent[] }> {
    await this.initialize();

    if (!query.trim()) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Search query cannot be empty',
          },
        ],
      };
    }

    const searchQuery = query.toLowerCase();
    const results: string[] = [];

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

        // Simple fuzzy matching: check if all query words are in the searchable text
        const queryWords = searchQuery.split(/\s+/);
        return queryWords.every((word) => searchableText.includes(word));
      });

      if (matchedAgents.length > 0) {
        results.push(`## 🤖 Agents (${matchedAgents.length} matches)\n`);
        matchedAgents.forEach((a) => {
          const toolName = a.module
            ? `${a.module}-${a.name}`
            : `bmad-${a.name}`;
          results.push(
            `**${toolName}** - ${a.displayName}${a.title ? ` (${a.title})` : ''}`,
          );
          if (a.description) {
            results.push(`  ${a.description}`);
          }
        });
      }
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

      if (matchedWorkflows.length > 0) {
        if (results.length > 0) results.push('\n---\n');
        results.push(`## Workflows (${matchedWorkflows.length} matches)\n`);
        matchedWorkflows.forEach((w) => {
          const module = w.module ? `[${w.module}]` : '';
          const description = w.description || 'No description available';
          results.push(`- **${w.name}** ${module}: ${description}\n`);
        });
      }
    }

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `🔍 No results found for "${query}"\n\nTry:\n- Using fewer or different search terms\n- Checking spelling\n- Using bmad-resources with operation=agents or operation=workflows to browse all options`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `🔍 **Search Results for "${query}"**\n\n${results.join('\n')}`,
        },
      ],
    };
  }

  /**
   * Starts the MCP server and begins listening for requests
   *
   * @returns Promise that resolves when the server is fully initialized and ready to accept connections
   *
   * @remarks
   * This method:
   * 1. Establishes the stdio transport connection with the MCP client
   * 2. Pre-loads all BMAD agents, workflows, and resources into memory
   * 3. Sets up all MCP request handlers
   * 4. Logs initialization status to stderr
   *
   * The server will continue running until the process is terminated.
   * All BMAD content is loaded eagerly on startup for optimal performance.
   *
   * @example
   * ```typescript
   * const server = new BMADServerLiteMultiToolGit();
   * await server.start(); // Server is now running and ready
   * ```
   *
   * @throws Will throw if the MCP transport connection fails
   * @throws Will throw if BMAD content loading fails during initialization
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Pre-load all data into memory
    await this.initialize();

    // Log to stderr (stdout is for MCP protocol)
    const gitPaths = this.loader.getResolvedGitPaths();
    console.error('BMAD MCP Server started');
    console.error(
      `Loaded ${this.agentMetadata.length} agents, ${this.workflows.length} workflows, ${this.cachedResources.length} resources`,
    );
    if (gitPaths.size > 0) {
      console.error(`Git remotes resolved: ${gitPaths.size}`);
    }
  }
}
