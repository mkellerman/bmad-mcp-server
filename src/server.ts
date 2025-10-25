/**
 * BMAD MCP Server - Main server implementation with unified tool.
 *
 * This server exposes BMAD methodology through the Model Context Protocol,
 * using a single unified 'bmad' tool with instruction-based routing.
 * The LLM processes files according to BMAD methodology instructions.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Tool,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import type { Agent } from './types/index.js';
import { ManifestLoader } from './utils/manifest-loader.js';
import {
  resolveBmadPaths,
  type BmadPathResolution,
} from './utils/bmad-path-resolver.js';
import { UnifiedBMADTool } from './tools/unified-tool.js';

// Compute __dirname - use import.meta.url when available (production)
// Fall back to build directory for test environments
function getDirname(): string {
  try {
    if (import.meta?.url) {
      return path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // Fall through to fallback
  }
  // Fallback for test environments - assume we're in build/
  return path.join(process.cwd(), 'build');
}

const __dirname = getDirname();

/**
 * MCP Server for BMAD methodology with unified tool interface.
 *
 * Exposes a single 'bmad' tool that uses instruction-based routing:
 * - `bmad` → Load bmad-master agent (default)
 * - `bmad <agent-name>` → Load specified agent
 * - `bmad *<workflow-name>` → Execute specified workflow
 *
 * The server acts as a file proxy - no parsing or transformation.
 * LLM processes files using BMAD methodology loaded in context.
 */
export class BMADMCPServer {
  private bmadRoot: string;
  private projectRoot: string;
  private manifestLoader: ManifestLoader;
  private unifiedTool: UnifiedBMADTool;
  private agents: Agent[];
  private server: Server;
  private discovery: BmadPathResolution;
  constructor(bmadRoot: string, discovery: BmadPathResolution) {
    this.discovery = discovery;
    this.bmadRoot = path.resolve(bmadRoot);
    console.log(`Initializing BMAD MCP Server with root: ${this.bmadRoot}`);

    const manifestDir = discovery.activeLocation.manifestDir;
    if (!manifestDir) {
      throw new Error('Active BMAD location missing manifest directory');
    }

    this.projectRoot = this.bmadRoot;
    console.log(`Project root: ${this.projectRoot}`);
    console.log(`Manifest directory: ${manifestDir}`);

    // Initialize components
    this.manifestLoader = new ManifestLoader(this.projectRoot);
    this.unifiedTool = new UnifiedBMADTool({
      bmadRoot: this.projectRoot,
      discovery,
    });

    // Load manifests for prompts
    this.agents = this.manifestLoader.loadAgentManifest();

    console.log(`Loaded ${this.agents.length} agents from manifest`);
    console.log('BMAD MCP Server initialized successfully');

    // Create MCP server
    this.server = new Server(
      {
        name: 'bmad-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      },
    );

    this.setupHandlers();
  }

  /**
   * Setup MCP server request handlers
   */
  private setupHandlers(): void {
    // List available prompts (BMAD agents)
    this.server.setRequestHandler(ListPromptsRequestSchema, () => {
      console.log(
        `list_prompts called - returning ${this.agents.length} agents`,
      );

      return {
        prompts: this.agents.map((agent) => {
          // Use agent name as prompt name (with bmad- prefix if not present)
          let promptName = agent.name || '';
          if (!promptName.startsWith('bmad-')) {
            promptName = `bmad-${promptName}`;
          }

          // Create description from agent metadata
          const displayName = agent.displayName || agent.name;
          const title = agent.title || 'BMAD Agent';
          const description = `${displayName} - ${title}`;

          return {
            name: promptName,
            description,
          };
        }),
      };
    });

    // Get a specific prompt (BMAD agent)
    this.server.setRequestHandler(GetPromptRequestSchema, (request) => {
      const name = request.params.name;
      console.log(`get_prompt called for: ${name}`);

      // Normalize agent name (handle both "analyst" and "bmad-analyst")
      const agentNameStripped = name.replace('bmad-', '');

      // Find agent in manifest - try both with and without prefix
      let agent: Agent | undefined;
      let agentName: string | undefined;
      for (const a of this.agents) {
        const manifestName = a.name;
        if (manifestName === agentNameStripped || manifestName === name) {
          agent = a;
          agentName = manifestName;
          break;
        }
      }

      if (!agent || !agentName) {
        // Agent not found
        const errorMsg = `Agent '${name}' not found. Available agents: ${this.agents.map((a) => a.name).join(', ')}`;
        console.warn(errorMsg);
        return {
          description: 'Error: Agent not found',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: errorMsg,
              },
            },
          ],
        };
      }

      // Use unified tool to load agent
      const result = this.unifiedTool.execute(agentName);

      if (!result.success) {
        return {
          description: 'Error loading agent',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: result.error ?? 'Unknown error',
              },
            },
          ],
        };
      }

      return {
        description: `BMAD Agent: ${result.displayName} - ${agent.title ?? ''}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: result.content ?? '',
            },
          },
        ],
      };
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      console.log('list_tools called - returning unified bmad tool');

      const tools: Tool[] = [
        {
          name: 'bmad',
          description: `Unified BMAD tool with instruction-based routing.

**Command Patterns:**

1. Load default agent (bmad-master):
   - Input: "" (empty string)
   - Example: bmad

2. Load specific agent:
   - Input: "<agent-name>"
   - Example: "analyst" loads the Business Analyst agent
   - Example: "architect" loads the Architect agent
   - Available agents: analyst, architect, dev, pm, sm, tea, ux-expert, bmad-master, game-architect, game-designer, game-dev

3. Execute workflow:
   - Input: "*<workflow-name>" (note the asterisk prefix)
   - Example: "*party-mode" executes the party-mode workflow
   - Example: "*brainstorm-project" executes brainstorming workflow
   - The asterisk (*) is REQUIRED for workflows

4. Discovery commands (built-in):
   - Input: "*list-agents" → Show all available BMAD agents
   - Input: "*list-workflows" → Show all available workflows
   - Input: "*list-tasks" → Show all available tasks
   - Input: "*help" → Show command reference and usage guide

**Naming Rules:**
- Agent names: lowercase letters and hyphens only (e.g., "analyst", "bmad-master")
- Workflow names: lowercase letters, numbers, and hyphens (e.g., "party-mode", "dev-story")
- Names must be 2-50 characters
- Case-sensitive matching

**Important:**
- To execute a workflow, you MUST prefix the name with an asterisk (*)
- Without the asterisk, the tool will try to load an agent with that name
- Use only ONE argument at a time
- Discovery commands are built-in and work independently

**Examples:**
- bmad → Load bmad-master (default orchestrator)
- bmad analyst → Load Mary the Business Analyst
- bmad *party-mode → Execute party-mode workflow
- bmad *list-agents → See all available agents
- bmad *list-workflows → See all workflows you can run
- bmad *help → Show complete command reference

**Error Handling:**
The tool provides helpful suggestions if you:
- Misspell an agent or workflow name (fuzzy matching)
- Forget the asterisk for a workflow
- Use invalid characters or formatting`,
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description:
                  "Command to execute: empty string for default, 'agent-name' for agents, '*workflow-name' for workflows",
              },
            },
            required: ['command'],
          },
        },
      ];

      return { tools };
    });

    // Call a tool
    this.server.setRequestHandler(CallToolRequestSchema, (request) => {
      const { name, arguments: args } = request.params;
      console.log(`call_tool called: ${name} with args:`, args);

      if (name !== 'bmad') {
        return {
          content: [
            {
              type: 'text',
              text: `Error: Unknown tool '${name}'. Only 'bmad' tool is available.`,
            } as TextContent,
          ],
          isError: true,
        };
      }

      const command = (args?.command as string) ?? '';
      console.log(`Executing bmad tool with command: '${command}'`);

      // Execute through unified tool
      const result = this.unifiedTool.execute(command);

      // Check if error occurred
      if (!result.success) {
        const errorText = result.error ?? 'Unknown error occurred';
        console.error(`BMAD tool error: ${errorText}`);

        return {
          content: [
            {
              type: 'text',
              text: errorText,
            } as TextContent,
          ],
          isError: true,
        };
      }

      // Success - format response based on type
      if (result.type === 'agent') {
        return {
          content: [
            {
              type: 'text',
              text: result.content ?? '',
            } as TextContent,
          ],
        };
      } else if (result.type === 'workflow') {
        // Workflow executed successfully
        const responseParts: string[] = [];
        responseParts.push(`# Workflow: ${result.name}`);
        responseParts.push(`\n**Description:** ${result.description ?? ''}\n`);

        // Add workflow context (server paths and agent manifest)
        if (result.context) {
          const context = result.context;
          responseParts.push('## Workflow Context\n');
          responseParts.push(
            "**MCP Server Resources (use these, not user's workspace):**\n",
          );
          responseParts.push(`- MCP Server Root: \`${context.mcpResources}\``);
          responseParts.push(
            `- Agent Manifest: \`${context.agentManifestPath}\``,
          );
          responseParts.push(`- Available Agents: ${context.agentCount}\n`);
          responseParts.push(
            '**NOTE:** All `{mcp-resources}` references in this workflow point to the MCP server,',
          );
          responseParts.push(
            "not the user's workspace. Use the Agent Roster data provided below.\n",
          );

          // Include agent manifest data inline
          const agentData = context.agentManifestData;
          if (agentData && agentData.length > 0) {
            responseParts.push('**Agent Roster (MCP Server Data):**\n');
            responseParts.push('```json');
            responseParts.push(JSON.stringify(agentData, null, 2));
            responseParts.push('```\n');
          }
        }

        // Add workflow YAML
        if (result.workflowYaml) {
          responseParts.push('## Workflow Configuration\n');
          responseParts.push(`**File:** \`${result.path}\`\n`);
          responseParts.push('```yaml');
          responseParts.push(result.workflowYaml);
          responseParts.push('```\n');
        }

        // Add instructions if available
        if (result.instructions) {
          responseParts.push('## Workflow Instructions\n');
          responseParts.push('```markdown');
          responseParts.push(result.instructions);
          responseParts.push('```\n');
        }

        // Add execution guidance
        responseParts.push(`## Execution Instructions

Process this workflow according to BMAD workflow execution methodology:

1. **Read the complete workflow.yaml configuration**
2. **IMPORTANT - MCP Resource Resolution:**
   - All \`{mcp-resources}\` placeholders refer to the MCP server installation
   - DO NOT search the user's workspace for manifest files or agent data
   - USE the Agent Roster JSON provided in the Workflow Context section above
   - The MCP server has already resolved all paths and loaded all necessary data
3. **Resolve variables:** Replace any \`{{variables}}\` with user input or defaults
4. **Follow instructions:** Execute steps in exact order as defined
5. **Generate content:** Process \`<template-output>\` sections as needed
6. **Request input:** Use \`<elicit-required>\` sections to gather additional user input

**CRITICAL:** The Agent Roster JSON in the Workflow Context contains all agent metadata 
from the MCP server. Use this data directly - do not attempt to read files from the 
user's workspace.

Begin workflow execution now.`);

        return {
          content: [
            {
              type: 'text',
              text: responseParts.join('\n'),
            } as TextContent,
          ],
        };
      } else if (result.type === 'list' || result.type === 'help') {
        return {
          content: [
            {
              type: 'text',
              text: result.content ?? '',
            } as TextContent,
          ],
        };
      } else {
        // Unknown result type - dump as JSON for debugging
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            } as TextContent,
          ],
        };
      }
    });
  }

  /**
   * Run the MCP server
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('BMAD MCP Server running on stdio');
  }
}

/**
 * Main entry point for BMAD MCP Server
 */
export async function main(): Promise<void> {
  const packageRoot = path.resolve(__dirname, '..');
  const cwd = process.cwd();
  const cliArg = process.argv.length > 2 ? process.argv[2] : undefined;
  const envVar = process.env.BMAD_ROOT;
  const userBmadPath = path.join(os.homedir(), '.bmad');

  const discovery = resolveBmadPaths({
    cwd,
    cliArg,
    envVar,
    packageRoot,
    userBmadPath,
  });

  const activeRoot = discovery.activeLocation.resolvedRoot;

  if (!activeRoot) {
    throw new Error('Unable to determine active BMAD root');
  }

  console.error('Starting BMAD MCP Server...');
  console.error(
    `Active BMAD location (${discovery.activeLocation.displayName}): ${activeRoot}`,
  );

  try {
    const server = new BMADMCPServer(activeRoot, discovery);
    await server.run();
  } catch (error) {
    console.error('Server error:', error);
    throw error;
  }
}
