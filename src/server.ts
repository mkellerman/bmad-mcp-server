/**
 * BMAD MCP Server - Unified Tool Architecture
 *
 * Single 'bmad' tool powered by BMADEngine core.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  CompleteRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SERVER_CONFIG } from './config.js';
import { BMADEngine } from './core/bmad-engine.js';
import {
  createBMADTool,
  handleBMADTool,
  type BMADToolParams,
} from './tools/index.js';

export class BMADServerLiteMultiToolGit {
  private server: Server;
  private engine: BMADEngine;
  private initialized = false;

  constructor(projectRoot?: string, gitRemotes?: string[]) {
    this.engine = new BMADEngine(projectRoot, gitRemotes);
    this.server = new Server(
      {
        name: SERVER_CONFIG.name,
        version: SERVER_CONFIG.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {
            subscribe: false,
            listChanged: false,
          },
          resourceTemplates: {
            listChanged: false,
          },
          prompts: {},
          completions: {},
        },
      },
    );

    this.setupHandlers();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.engine.initialize();
    this.initialized = true;
  }

  private setupHandlers(): void {
    // List resource templates
    this.server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      async () => {
        await this.initialize();

        return {
          resourceTemplates: [
            {
              uriTemplate: 'bmad://{module}/agents/{agent}.md',
              name: 'Agent Source',
              description: 'Agent markdown source file',
              mimeType: 'text/markdown',
            },
            {
              uriTemplate: 'bmad://{module}/workflows/{workflow}/workflow.yaml',
              name: 'Workflow Definition',
              description: 'Workflow YAML configuration',
              mimeType: 'application/x-yaml',
            },
            {
              uriTemplate:
                'bmad://{module}/workflows/{workflow}/instructions.md',
              name: 'Workflow Instructions',
              description: 'Workflow instruction template',
              mimeType: 'text/markdown',
            },
            {
              uriTemplate: 'bmad://{module}/workflows/{workflow}/template.md',
              name: 'Workflow Template',
              description: 'Workflow output template',
              mimeType: 'text/markdown',
            },
            {
              uriTemplate: 'bmad://{module}/knowledge/{category}/{file}',
              name: 'Knowledge Base',
              description: 'Knowledge base articles and references',
              mimeType: 'text/markdown',
            },
            {
              uriTemplate: 'bmad://_cfg/agents/{agent}.customize.yaml',
              name: 'Agent Customization',
              description: 'Agent customization configuration',
              mimeType: 'application/x-yaml',
            },
            {
              uriTemplate: 'bmad://core/config.yaml',
              name: 'Core Configuration',
              description: 'BMAD core configuration file',
              mimeType: 'application/x-yaml',
            },
          ],
        };
      },
    );

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      await this.initialize();

      const cachedResources = this.engine.getCachedResources();
      const resources = cachedResources.map((file) => ({
        uri: `bmad://${file.relativePath}`,
        name: file.relativePath,
        description: `BMAD resource: ${file.relativePath}`,
        mimeType: this.getMimeType(file.relativePath),
      }));

      return { resources };
    });

    // Read a specific resource
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        await this.initialize();

        const uri = request.params.uri;
        const pathMatch = uri.match(/^bmad:\/\/(.+)$/);

        if (!pathMatch) {
          throw new Error(`Invalid resource URI: ${uri}`);
        }

        const relativePath = pathMatch[1];

        // Handle virtual manifest generation for _cfg/*.csv files
        if (relativePath === '_cfg/agent-manifest.csv') {
          const content = this.engine.generateAgentManifest();
          return {
            contents: [
              {
                uri,
                mimeType: 'text/csv',
                text: content,
              },
            ],
          };
        }

        if (relativePath === '_cfg/workflow-manifest.csv') {
          const content = this.engine.generateWorkflowManifest();
          return {
            contents: [
              {
                uri,
                mimeType: 'text/csv',
                text: content,
              },
            ],
          };
        }

        // TODO: Tool and Task manifests not yet implemented
        if (relativePath === '_cfg/tool-manifest.csv') {
          throw new Error(
            'Tool manifest generation not yet implemented - coming soon! This will provide virtual tool metadata from loaded BMAD modules.',
          );
        }

        if (relativePath === '_cfg/task-manifest.csv') {
          throw new Error(
            'Task manifest generation not yet implemented - coming soon! This will provide virtual task metadata from loaded BMAD modules.',
          );
        }

        // Default: Load file from filesystem
        try {
          const content = await this.engine.getLoader().loadFile(relativePath);
          const mimeType = this.getMimeType(relativePath);

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

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      await this.initialize();

      const tools: Tool[] = [];

      tools.push(
        createBMADTool(
          this.engine.getAgentMetadata(),
          this.engine.getWorkflowMetadata(),
        ),
      );

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const args = request.params.arguments ?? {};

      if (toolName === 'bmad') {
        return await handleBMADTool(
          args as unknown as BMADToolParams,
          this.engine,
        );
      }

      throw new Error(
        `Unknown tool: ${toolName}. Only 'bmad' tool is available.`,
      );
    });

    // List available prompts (agents)
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      await this.initialize();

      const agents = this.engine.getAgentMetadata();
      const prompts = agents.map((agent) => {
        const promptName = agent.module
          ? `${agent.module}.${agent.name}`
          : `bmad.${agent.name}`;

        return {
          name: promptName,
          description: `Activate ${agent.displayName} (${agent.title}) - ${agent.description}`,
          arguments: [
            {
              name: 'message',
              description:
                'Initial message or question for the agent (optional)',
              required: false,
            },
          ],
        };
      });

      return { prompts };
    });

    // Get a specific prompt (agent activation)
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      await this.initialize();

      const promptName = request.params.name;
      const args = request.params.arguments ?? {};

      // Extract agent name from prompt name (e.g., "bmm.analyst" -> "analyst")
      const parts = promptName.split('.');
      const agentName = parts.length > 1 ? parts.slice(1).join('.') : parts[0];
      const module = parts.length > 1 ? parts[0] : undefined;

      // Use the execute operation to get agent activation instructions
      const result = await handleBMADTool(
        {
          operation: 'execute',
          agent: agentName,
          message: args.message as string | undefined,
          module,
        },
        this.engine,
      );

      return {
        description: `Activate ${promptName} agent`,
        messages: result.content.map((c) => ({
          role: 'user' as const,
          content: c,
        })),
      };
    });

    // Provide completions for prompts and resources
    this.server.setRequestHandler(CompleteRequestSchema, async (request) => {
      await this.initialize();

      const { ref, argument } = request.params;

      // Complete prompt names (agents)
      if (ref.type === 'ref/prompt') {
        const agents = this.engine.getAgentMetadata();
        const partialValue = argument.value.toLowerCase();

        const matches = agents
          .filter((agent) => {
            const promptName = agent.module
              ? `${agent.module}.${agent.name}`
              : `bmad.${agent.name}`;
            return promptName.toLowerCase().includes(partialValue);
          })
          .map((agent) => {
            const promptName = agent.module
              ? `${agent.module}.${agent.name}`
              : `bmad.${agent.name}`;
            return promptName;
          })
          .slice(0, 20); // Limit to 20 results

        return {
          completion: {
            values: matches,
            total: matches.length,
            hasMore: false,
          },
        };
      }

      // Complete resource URIs
      if (ref.type === 'ref/resource') {
        const resources = this.engine.getCachedResources();
        const partialValue = argument.value.toLowerCase();

        // If completing a template URI, provide template-based suggestions
        if (partialValue.includes('{') || partialValue.includes('}')) {
          // Template completion - suggest parameter values
          return {
            completion: {
              values: [],
              total: 0,
              hasMore: false,
            },
          };
        }

        // Match against actual resource paths
        const matches = resources
          .filter((resource) => {
            const uri = `bmad://${resource.relativePath}`;
            return uri.toLowerCase().includes(partialValue);
          })
          .map((resource) => `bmad://${resource.relativePath}`)
          .slice(0, 20);

        return {
          completion: {
            values: matches,
            total: matches.length,
            hasMore: resources.length > matches.length,
          },
        };
      }

      // No completions available for other types
      return {
        completion: {
          values: [],
          total: 0,
          hasMore: false,
        },
      };
    });
  }

  private getMimeType(relativePath: string): string {
    if (relativePath.endsWith('.md')) return 'text/markdown';
    if (relativePath.endsWith('.yaml') || relativePath.endsWith('.yml'))
      return 'application/x-yaml';
    if (relativePath.endsWith('.json')) return 'application/json';
    if (relativePath.endsWith('.xml')) return 'application/xml';
    if (relativePath.endsWith('.csv')) return 'text/csv';
    return 'text/plain';
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    await this.initialize();

    const gitPaths = this.engine.getLoader().getResolvedGitPaths();
    const agentCount = this.engine.getAgentMetadata().length;
    const workflowCount = this.engine.getWorkflowMetadata().length;
    const resourceCount = this.engine.getCachedResources().length;

    console.error('BMAD MCP Server started');
    console.error(
      `Loaded ${agentCount} agents, ${workflowCount} workflows, ${resourceCount} resources`,
    );
    if (gitPaths.size > 0) {
      console.error(`Git remotes resolved: ${gitPaths.size}`);
    }
  }
}
