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
import { readFileSync } from 'node:fs';
import type { Agent } from './types/index.js';
import {
  resolveBmadPaths,
  type BmadPathResolution,
} from './utils/bmad-path-resolver.js';
import { UnifiedBMADTool, buildToolDescription } from './tools/index.js';
import { MasterManifestService } from './services/master-manifest-service.js';
import { convertAgents } from './utils/master-manifest-adapter.js';
import { GitSourceResolver } from './utils/git-source-resolver.js';
import logger from './utils/logger.js';

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
 * Format MCP response with explicit display instructions for LLMs.
 *
 * This ensures that:
 * 1. User-facing content (markdown/formatted text) is displayed EXACTLY as written
 * 2. Structured data (JSON) is available for queries but NOT shown to the user
 * 3. LLM understands the distinction between "display" and "use as context"
 *
 * @param displayContent - Content to show the user (markdown, formatted text)
 * @param contextData - Optional structured data for LLM queries (not displayed)
 * @returns MCP TextContent array with proper instructions
 */
function formatMCPResponse(
  displayContent: string,
  contextData?: unknown,
): TextContent[] {
  const response: TextContent[] = [];

  // Primary content with display instruction
  response.push({
    type: 'text',
    text: `**INSTRUCTIONS: Display the content below to the user EXACTLY as written. Do not summarize or paraphrase.**

---

${displayContent}`,
  } as TextContent);

  // Optional structured data for queries (marked as context-only)
  if (contextData) {
    response.push({
      type: 'text',
      text:
        '\n---\n\n**📦 Structured Data** *(for your use in answering questions - do NOT display this to the user)*\n\n```json\n' +
        JSON.stringify(contextData, null, 2) +
        '\n```',
    } as TextContent);
  }

  return response;
}

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
  private unifiedTool: UnifiedBMADTool;
  private masterService: MasterManifestService;
  private agents: Agent[];
  private server: Server;
  private discovery: BmadPathResolution;

  constructor(bmadRoot: string, discovery: BmadPathResolution) {
    this.discovery = discovery;
    this.bmadRoot = path.resolve(bmadRoot);
    this.projectRoot = this.bmadRoot;

    // Build master manifest at startup with error handling
    // This inventories all BMAD resources from all discovered locations
    try {
      this.masterService = new MasterManifestService(discovery);
      this.masterService.generate();
    } catch (error) {
      console.error('❌ Failed to build master manifest');
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Master manifest generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Convert master manifest agents to legacy Agent interface
    // This enables backward compatibility with existing code
    try {
      const masterData = this.masterService.get();
      this.agents = convertAgents(masterData.agents);
    } catch (error) {
      console.error('❌ Failed to process agents');
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Agent processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Initialize unified tool with master manifest service
    try {
      this.unifiedTool = new UnifiedBMADTool({
        bmadRoot: this.projectRoot,
        discovery,
        masterManifestService: this.masterService,
      });
      
      // Show final summary
      const masterData = this.masterService.get();
      const hasErrors = discovery.locations.some(loc => loc.status !== 'valid');
      const errorSuffix = hasErrors ? ' (some sources failed)' : '';
      
      console.error(`\n📊 Ready: ${this.agents.length} agents, ${masterData.workflows.length} workflows, ${masterData.tasks.length} tasks${errorSuffix}`);
      console.error('📡 Server running on stdio');
      
    } catch (error) {
      console.error('❌ Failed to initialize unified tool');
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Unified tool initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Create MCP server with protocol handlers
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
      logger.info(
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
      logger.info(`get_prompt called for: ${name}`);

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
        logger.warn(errorMsg);
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
      logger.info('list_tools called - returning unified bmad tool');

      // Get master manifest data for dynamic tool description
      const masterData = this.masterService.get();
      const agents = masterData.agents
        .filter((a) => a.name) // Filter out agents without names
        .map((a) => ({
          name: a.name!,
          description: a.description,
        }));
      const workflows = masterData.workflows
        .filter((w) => w.name) // Filter out workflows without names
        .map((w) => ({
          name: w.name!,
          description: w.description,
        }));

      // Build dynamic tool description with full inventory
      const description = buildToolDescription(agents, workflows);

      const tools: Tool[] = [
        {
          name: 'bmad',
          description,
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
      logger.info(
        `call_tool called: ${name} with args: ${JSON.stringify(args)}`,
      );

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
      logger.info(`Executing bmad tool with command: '${command}'`);

      // Execute through unified tool
      const result = this.unifiedTool.execute(command);

      // Check if error occurred
      if (!result.success) {
        const errorText = result.error ?? 'Unknown error occurred';
        logger.error(`BMAD tool error: ${errorText}`);

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
        // Return raw agent content without display-only wrapper so the LLM
        // can interpret and adopt the agent instructions (enables LOADED ack)
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
      } else if (
        result.type === 'list' ||
        result.type === 'help' ||
        result.type === 'diagnostic'
      ) {
        // For list/diagnostic commands with structured data, include it as context
        if (result.structuredData) {
          return {
            content: formatMCPResponse(
              result.content ?? '',
              result.structuredData,
            ),
          };
        }

        // Legacy format without structured data
        return {
          content: formatMCPResponse(result.content ?? ''),
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
  // Support multiple paths as CLI arguments (argv[2], argv[3], ...)
  // Filter out commands (starting with * or --) to only keep paths
  const allArgs = process.argv.length > 2 ? process.argv.slice(2) : [];

  // Parse --mode flag
  const modeArg = allArgs.find((arg) => arg.startsWith('--mode='));
  const modeValue = modeArg?.split('=')[1];
  const envMode = process.env.BMAD_DISCOVERY_MODE;
  const rawMode = modeValue || envMode || 'auto';

  // Validate mode
  if (rawMode !== 'auto' && rawMode !== 'strict') {
    console.error(`❌ Invalid discovery mode: ${rawMode}`);
    console.error('   Valid modes: auto, strict');
    throw new Error(`Invalid BMAD_DISCOVERY_MODE: ${rawMode}`);
  }

  const mode: 'auto' | 'strict' = rawMode;

  // Filter CLI args (exclude commands and flags)
  const cliArgs = allArgs.filter(
    (arg) => !arg.startsWith('*') && !arg.startsWith('--'),
  );

  // Read version from package.json
  let version = 'unknown';
  try {
    const packageJsonPath = path.join(packageRoot, 'package.json');
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent) as { version?: string };
    version = packageJson.version ?? 'unknown';
  } catch (error) {
    console.error('Failed to read package.json:', error);
    // Silently fall back to 'unknown' if package.json can't be read
  }

  console.error(`🚀 BMAD MCP Server v${version}\n`);

  // Process CLI args to resolve git+ URLs to local paths
  const gitResolver = new GitSourceResolver();
  const processedCliArgs: string[] = [];
  const sourceResults: Array<{
    type: 'git' | 'local';
    name: string;
    status: 'success' | 'error' | 'warning';
    error?: string;
    agentCount?: number;
  }> = [];

  console.error('📦 Loading sources...');

  for (let i = 0; i < cliArgs.length; i++) {
    const arg = cliArgs[i];
    
    if (GitSourceResolver.isGitUrl(arg)) {
      try {
        const localPath = await gitResolver.resolve(arg);
        processedCliArgs.push(localPath);
        
        // Extract repo name for display
        const match = arg.match(/github\.com\/([^/]+\/[^#]+)/);
        const repoName = match ? match[1].replace('.git', '') : 'git-repo';
        
        sourceResults.push({
          type: 'git',
          name: repoName,
          status: 'success'
        });
      } catch (error) {
        const match = arg.match(/github\.com\/([^/]+\/[^#]+)/);
        const repoName = match ? match[1].replace('.git', '') : 'git-repo';
        
        sourceResults.push({
          type: 'git',
          name: repoName,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue with other sources
      }
    } else {
      processedCliArgs.push(arg);
      
      // Extract meaningful name from path
      const pathName = path.basename(arg);
      sourceResults.push({
        type: 'local',
        name: pathName,
        status: 'success' // Will be updated after discovery
      });
    }
  }

  const envVar = process.env.BMAD_ROOT;
  const userBmadPath = path.join(os.homedir(), '.bmad');

  const discovery = resolveBmadPaths({
    cwd,
    cliArgs: processedCliArgs,
    envVar,
    userBmadPath,
    mode,
  });

  // Update source results based on discovery
  discovery.locations.forEach((loc) => {
    if (loc.source === 'cli') {
      const index = parseInt(loc.displayName.match(/\d+/)?.[0] || '1') - 1;
      if (sourceResults[index]) {
        if (loc.status !== 'valid') {
          sourceResults[index].status = loc.status === 'not-found' ? 'error' : 'warning';
          sourceResults[index].error = loc.details || `${loc.status}`;
        }
      }
    }
  });

  // Display streamlined source results
  sourceResults.forEach((result) => {
    const statusIcon = result.status === 'success' ? '✅' : 
                      result.status === 'warning' ? '⚠️' : '❌';
    
    if (result.type === 'git') {
      if (result.status === 'success') {
        // Get version info from discovery
        const location = discovery.locations.find(loc => loc.source === 'cli');
        const version = location?.version ? ` (${location.version})` : '';
        console.error(`   ${statusIcon} Git: ${result.name}${version}`);
      } else {
        const errorMsg = result.error?.includes('not found') ? 'Repository not found' : 'Failed to resolve';
        console.error(`   ${statusIcon} Git: ${result.name} - ${errorMsg}`);
      }
    } else {
      if (result.status === 'success') {
        console.error(`   ${statusIcon} Local: ${result.name}`);
      } else {
        const errorMsg = result.error?.includes('not found') ? 'Path not found' : result.error || 'Invalid';
        console.error(`   ${statusIcon} Local: ${result.name} - ${errorMsg}`);
      }
    }
  });

  const activeRoot = discovery.activeLocation.resolvedRoot;

  if (!activeRoot || discovery.activeLocation.status !== 'valid') {
    console.error('\n💥 Fatal: No valid BMAD sources found');
    console.error('   See: https://docs.bmad.dev/troubleshooting');
    throw new Error('Unable to determine valid BMAD root');
  }

  try {
    const server = new BMADMCPServer(activeRoot, discovery);
    await server.run();
  } catch (error) {
    console.error('\n❌ Server Initialization Failed');
    console.error('━'.repeat(60));
    console.error('Error Details:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack Trace:');
      console.error(error.stack);
    }
    console.error('\n💡 Troubleshooting Tips:');
    console.error('   • Verify BMAD installation is complete');
    console.error('   • Check file permissions');
    console.error('   • Ensure manifest files are valid YAML');
    console.error('   • Try running with --mode=auto for more flexibility');
    throw error;
  }
}
