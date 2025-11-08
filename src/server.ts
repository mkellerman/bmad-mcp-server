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
import {
  metricsEnabled,
  initMetrics,
  emit,
  correlationId,
  estimateTokens,
  sizeBytes,
  metricsVariant,
} from './utils/metrics.js';
import { BMADEngine } from './core/bmad-engine.js';
import {
  createBMADTool,
  handleBMADTool,
  type BMADToolParams,
} from './tools/index.js';
import type { DiscoveryMode } from './types/index.js';
import {
  shapeEnabled,
  shapeResources,
  shapeTextContent,
  shapeTools,
} from './utils/shaper.js';

export class BMADServerLiteMultiToolGit {
  private server: Server;
  private engine: BMADEngine;
  private initialized = false;

  constructor(
    projectRoot?: string,
    gitRemotes?: string[],
    discoveryMode?: DiscoveryMode,
  ) {
    this.engine = new BMADEngine(projectRoot, gitRemotes, discoveryMode);
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
    const wrap = <_TReq, _TResp>(
      name: string,
      fn: (req: _TReq) => Promise<_TResp>,
    ) => {
      return async (request: _TReq): Promise<_TResp> => {
        const enabled = metricsEnabled();
        const id = enabled ? correlationId() : '';
        const variant = enabled ? metricsVariant() : undefined;
        const t0 = Date.now();
        if (enabled) {
          await emit({ event: 'request_started', id, route: name, variant });
        }
        // Attach correlation id for nested metrics within handler
        try {
          (request as unknown as { _corrId?: string })._corrId = id;
        } catch {
          /* noop */
        }
        try {
          const resp = await fn(request);
          if (enabled) {
            // Attempt lightweight structural metrics
            let payloadSample: unknown = resp;
            let sections = 0;
            let affordances = 0;
            try {
              if (resp && typeof resp === 'object') {
                const top = resp as Record<string, unknown>;
                payloadSample = top;
                sections = Object.keys(top).length;
                // Heuristic: look for affordances arrays
                for (const v of Object.values(top)) {
                  if (Array.isArray(v)) {
                    for (const x of v as unknown[]) {
                      if (
                        x &&
                        typeof x === 'object' &&
                        ('trigger' in x || 'action' in x)
                      ) {
                        affordances += 1;
                      }
                    }
                  }
                }
              }
            } catch {
              /* ignore metric derivation errors */
            }
            const shapedTruncated = (
              request as unknown as { _shapedTruncated?: boolean }
            )._shapedTruncated;
            const shapedRange = (
              request as unknown as { _shapedRange?: boolean }
            )._shapedRange;
            await emit({
              event: 'response_ready',
              id,
              route: name,
              variant,
              shaped: shapeEnabled(),
              shapedTruncated: !!shapedTruncated,
              shapedRange: !!shapedRange,
              durationMs: Date.now() - t0,
              tokenEstimate: estimateTokens(payloadSample),
              sizeBytes: sizeBytes(payloadSample),
              sections,
              affordances,
            });
          }
          return resp;
        } catch (error) {
          if (metricsEnabled()) {
            await emit({
              event: 'response_error',
              id,
              route: name,
              variant,
              durationMs: Date.now() - t0,
              message: error instanceof Error ? error.message : String(error),
            });
          }
          throw error;
        }
      };
    };
    // List resource templates
    this.server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      wrap('ListResourceTemplates', async () => {
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
      }),
    );

    // List available resources
    this.server.setRequestHandler(
      ListResourcesRequestSchema,
      wrap('ListResources', async () => {
        await this.initialize();

        const cachedResources = this.engine.getCachedResources();
        let resources = cachedResources.map((file) => ({
          uri: `bmad://${file.relativePath}`,
          name: file.relativePath,
          description: `BMAD resource: ${file.relativePath}`,
          mimeType: this.getMimeType(file.relativePath),
        }));

        if (shapeEnabled()) {
          resources = shapeResources(resources);
        }

        return { resources };
      }),
    );

    // Read a specific resource
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      wrap('ReadResource', async (request) => {
        await this.initialize();

        const uri = (request as { params: { uri: string } }).params.uri;
        const pathMatch = uri.match(/^bmad:\/\/(.+)$/);

        if (!pathMatch) {
          throw new Error(`Invalid resource URI: ${uri}`);
        }

        let relativePath: string = pathMatch[1];
        let rangeStart: number | undefined;
        let rangeEnd: number | undefined;
        const hashIdx = relativePath.indexOf('#');
        if (hashIdx !== -1) {
          const base = relativePath.slice(0, hashIdx);
          const frag = relativePath.slice(hashIdx + 1);
          relativePath = base;
          const m = frag.match(/^lines=(\d+)-(\d+)$/);
          if (m) {
            rangeStart = parseInt(m[1], 10);
            rangeEnd = parseInt(m[2], 10);
          }
        }

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

        if (relativePath === '_cfg/tool-manifest.csv') {
          const content = this.engine.generateToolManifest();
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

        if (relativePath === '_cfg/task-manifest.csv') {
          const content = this.engine.generateTaskManifest();
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

        // Default: Load file from filesystem
        try {
          let content = await this.engine.getLoader().loadFile(relativePath);
          const mimeType = this.getMimeType(relativePath);

          if (
            typeof content === 'string' &&
            typeof rangeStart === 'number' &&
            typeof rangeEnd === 'number' &&
            rangeStart > 0 &&
            rangeEnd >= rangeStart &&
            mimeType.startsWith('text/')
          ) {
            const allLines = content.split(/\r?\n/);
            const total = allLines.length;
            const startIdx = Math.max(1, rangeStart);
            const endIdx = Math.min(total, rangeEnd);
            const excerpt = allLines.slice(startIdx - 1, endIdx).join('\n');
            const header = `[Excerpt lines ${startIdx}-${endIdx} of ${total}]\n`;
            content = header + excerpt;
            try {
              (request as unknown as { _shapedRange?: boolean })._shapedRange =
                true;
            } catch {}
          }

          if (
            shapeEnabled() &&
            typeof content === 'string' &&
            mimeType.startsWith('text/')
          ) {
            const shaped = shapeTextContent(content);
            content = shaped.text;
            try {
              (
                request as unknown as { _shapedTruncated?: boolean }
              )._shapedTruncated = !!shaped.truncated;
            } catch {}
          }

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
      }),
    );

    // List available tools
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      wrap('ListTools', async () => {
        await this.initialize();

        let tools: Tool[] = [];

        tools.push(
          createBMADTool(
            this.engine.getAgentMetadata(),
            this.engine.getWorkflowMetadata(),
          ),
        );

        if (shapeEnabled()) {
          tools = shapeTools(tools) as Tool[];
        }

        return { tools };
      }),
    );

    // Handle tool calls
    this.server.setRequestHandler(
      CallToolRequestSchema,
      wrap('CallTool', async (request) => {
        const toolName = (
          request as { params: { name: string; arguments?: unknown } }
        ).params.name;
        const args =
          (request as { params: { name: string; arguments?: unknown } }).params
            .arguments ?? {};

        // Emit tool_invoked with correlation id
        if (metricsEnabled()) {
          const id =
            (request as unknown as { _corrId?: string })._corrId ||
            correlationId();
          await emit({
            event: 'tool_invoked',
            id,
            route: 'CallTool',
            variant: metricsVariant(),
            toolName,
            hasArgs:
              typeof args === 'object' &&
              args !== null &&
              Object.keys(args as Record<string, unknown>).length > 0,
          });
        }

        if (toolName === 'bmad') {
          return await handleBMADTool(
            args as unknown as BMADToolParams,
            this.engine,
          );
        }

        throw new Error(
          `Unknown tool: ${toolName}. Only 'bmad' tool is available.`,
        );
      }),
    );

    // List available prompts (agents)
    this.server.setRequestHandler(
      ListPromptsRequestSchema,
      wrap('ListPrompts', async () => {
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

        if (shapeEnabled()) {
          // Limit prompts list to max list size to keep UI concise
          const limit = Number(process.env.BMAD_SHAPE_MAX_LIST || 20);
          return {
            prompts: prompts.slice(0, Math.max(1, Math.min(200, limit))),
          };
        }
        return { prompts };
      }),
    );

    // Get a specific prompt (agent activation)
    this.server.setRequestHandler(
      GetPromptRequestSchema,
      wrap('GetPrompt', async (request) => {
        await this.initialize();

        const promptName = (
          request as {
            params: { name: string; arguments?: { message?: unknown } };
          }
        ).params.name;
        const args =
          (
            request as {
              params: { name: string; arguments?: { message?: unknown } };
            }
          ).params.arguments ?? {};

        // Extract agent name from prompt name (e.g., "bmm.analyst" -> "analyst")
        const parts = promptName.split('.');
        const agentName =
          parts.length > 1 ? parts.slice(1).join('.') : parts[0];
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
      }),
    );

    // Provide completions for prompts and resources
    this.server.setRequestHandler(
      CompleteRequestSchema,
      wrap('Complete', async (request) => {
        await this.initialize();

        const { ref, argument } = (
          request as {
            params: { ref: { type: string }; argument: { value: string } };
          }
        ).params;

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
      }),
    );
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
    await initMetrics();

    const sourceCount = await this.engine.getLoader().getSourceCount();
    const moduleNames = await this.engine.getLoader().getModuleNames();
    const agentCount = this.engine.getAgentMetadata().length;
    const workflowCount = this.engine.getWorkflowMetadata().length;
    const resourceCount = this.engine.getCachedResources().length;

    console.error('BMAD MCP Server started');
    console.error(
      `Loaded: ${sourceCount} source${sourceCount !== 1 ? 's' : ''}, ${resourceCount} resources`,
    );
    console.error(
      `Loaded: ${moduleNames.length} module${moduleNames.length !== 1 ? 's' : ''}, ${agentCount} agents, ${workflowCount} workflows`,
    );
  }
}
