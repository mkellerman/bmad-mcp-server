/**
 * BMAD MCP Server - Main server implementation with unified tool.
 *
 * This server exposes BMAD methodology through the Model Context Protocol,
 * using a single unified 'bmad' tool with instruction-based routing.
 * The LLM processes files according to BMAD methodology instructions.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { resolveBmadPaths, } from './utils/bmad-path-resolver.js';
import { UnifiedBMADTool, getHelpResult } from './tools/index.js';
import { MasterManifestService } from './services/master-manifest-service.js';
import { convertAgents } from './utils/master-manifest-adapter.js';
import logger from './utils/logger.js';
// Compute __dirname - use import.meta.url when available (production)
// Fall back to build directory for test environments
function getDirname() {
    try {
        if (import.meta?.url) {
            return path.dirname(fileURLToPath(import.meta.url));
        }
    }
    catch {
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
    bmadRoot;
    projectRoot;
    unifiedTool;
    masterService;
    agents;
    server;
    discovery;
    constructor(bmadRoot, discovery) {
        this.discovery = discovery;
        this.bmadRoot = path.resolve(bmadRoot);
        logger.info(`Initializing BMAD MCP Server with root: ${this.bmadRoot}`);
        this.projectRoot = this.bmadRoot;
        logger.info(`Project root: ${this.projectRoot}`);
        // Build master manifest at startup
        // This inventories all BMAD resources from all discovered locations
        logger.info('Building master manifest...');
        this.masterService = new MasterManifestService(discovery);
        this.masterService.generate();
        // Convert master manifest agents to legacy Agent interface
        // This enables backward compatibility with existing code
        const masterData = this.masterService.get();
        this.agents = convertAgents(masterData.agents);
        logger.info(`Loaded ${this.agents.length} agents from master manifest ` +
            `(${masterData.agents.length} total records, ` +
            `${this.agents.length} existing files)`);
        // Initialize unified tool with master manifest service
        this.unifiedTool = new UnifiedBMADTool({
            bmadRoot: this.projectRoot,
            discovery,
            masterManifestService: this.masterService,
        });
        logger.info('BMAD MCP Server initialized successfully');
        // Create MCP server with protocol handlers
        this.server = new Server({
            name: 'bmad-mcp-server',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {},
                prompts: {},
            },
        });
        this.setupHandlers();
    }
    /**
     * Setup MCP server request handlers
     */
    setupHandlers() {
        // List available prompts (BMAD agents)
        this.server.setRequestHandler(ListPromptsRequestSchema, () => {
            logger.info(`list_prompts called - returning ${this.agents.length} agents`);
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
            let agent;
            let agentName;
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
            // Generate help content with available agents and workflows
            const help = getHelpResult();
            const tools = [
                {
                    name: 'bmad',
                    description: help.content ?? 'Unified BMAD tool',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            command: {
                                type: 'string',
                                description: "Command to execute: empty string for default, 'agent-name' or 'module/agent-name' for agents, '*workflow-name' or '*module/workflow-name' for workflows",
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
            logger.info(`call_tool called: ${name} with args: ${JSON.stringify(args)}`);
            if (name !== 'bmad') {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: Unknown tool '${name}'. Only 'bmad' tool is available.`,
                        },
                    ],
                    isError: true,
                };
            }
            const command = args?.command ?? '';
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
                        },
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
                        },
                    ],
                };
            }
            else if (result.type === 'workflow') {
                // Workflow executed successfully
                const responseParts = [];
                responseParts.push(`# Workflow: ${result.name}`);
                responseParts.push(`\n**Description:** ${result.description ?? ''}\n`);
                // Add workflow context (server paths and agent manifest)
                if (result.context) {
                    const context = result.context;
                    responseParts.push('## Workflow Context\n');
                    responseParts.push("**MCP Server Resources (use these, not user's workspace):**\n");
                    responseParts.push(`- MCP Server Root: \`${context.mcpResources}\``);
                    responseParts.push(`- Agent Manifest: \`${context.agentManifestPath}\``);
                    responseParts.push(`- Available Agents: ${context.agentCount}\n`);
                    responseParts.push('**NOTE:** All `{mcp-resources}` references in this workflow point to the MCP server,');
                    responseParts.push("not the user's workspace. Use the Agent Roster data provided below.\n");
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
                        },
                    ],
                };
            }
            else if (result.type === 'list' || result.type === 'help') {
                return {
                    content: [
                        {
                            type: 'text',
                            text: result.content ?? '',
                        },
                    ],
                };
            }
            else {
                // Unknown result type - dump as JSON for debugging
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
        });
    }
    /**
     * Run the MCP server
     */
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('BMAD MCP Server running on stdio');
    }
}
/**
 * Main entry point for BMAD MCP Server
 */
export async function main() {
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
    const mode = rawMode;
    const cliArgs = allArgs.filter((arg) => !arg.startsWith('*') && !arg.startsWith('--'));
    const envVar = process.env.BMAD_ROOT;
    const userBmadPath = path.join(os.homedir(), '.bmad');
    // Read version from package.json
    let version = 'unknown';
    try {
        const packageJsonPath = path.join(packageRoot, 'package.json');
        const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageJsonContent);
        version = packageJson.version ?? 'unknown';
    }
    catch (error) {
        console.error('Failed to read package.json:', error);
        // Silently fall back to 'unknown' if package.json can't be read
    }
    const discovery = resolveBmadPaths({
        cwd,
        cliArgs,
        envVar,
        userBmadPath,
        mode,
    });
    console.error(`BMAD MCP Server v${version}`);
    console.error(`Discovery Mode: ${mode}`);
    console.error('Starting BMAD MCP Server...');
    // Validate locations and show warnings (only for explicitly provided paths)
    // Only warn about CLI args and ENV vars, not defaults (project, user)
    const invalidLocations = discovery.locations.filter((loc) => loc.status !== 'valid' &&
        loc.originalPath !== undefined &&
        (loc.source === 'cli' || loc.source === 'env'));
    if (invalidLocations.length > 0) {
        for (const loc of invalidLocations) {
            if (loc.status === 'not-found') {
                console.error(`⚠️  BMAD path not found: ${loc.originalPath} (${loc.displayName})`);
            }
            else if (loc.status === 'missing') {
                console.error(`⚠️  BMAD path exists but missing required files: ${loc.originalPath} (${loc.displayName})`);
                console.error(`   Expected: _cfg/manifest.yaml (v6) or install-manifest.yaml (v4)`);
            }
            else if (loc.status === 'invalid') {
                console.error(`⚠️  BMAD path is invalid: ${loc.originalPath} (${loc.displayName})`);
                if (loc.details)
                    console.error(`   ${loc.details}`);
            }
        }
    }
    const activeRoot = discovery.activeLocation.resolvedRoot;
    if (!activeRoot || discovery.activeLocation.status !== 'valid') {
        console.error(`\n❌ No valid BMAD installation found!`);
        console.error(`\nTo fix this, ensure your BMAD path contains either:`);
        console.error(`  • v6: A 'bmad/_cfg/manifest.yaml' file`);
        console.error(`  • v4: An 'install-manifest.yaml' file`);
        console.error(`\nTried locations:`);
        discovery.locations.forEach((loc) => {
            console.error(`  ${loc.status === 'valid' ? '✓' : '✗'} ${loc.displayName}: ${loc.originalPath || '(not provided)'}`);
        });
        throw new Error('Unable to determine valid BMAD root');
    }
    console.error(`Active BMAD location (${discovery.activeLocation.displayName}): ${activeRoot}`);
    try {
        const server = new BMADMCPServer(activeRoot, discovery);
        await server.run();
    }
    catch (error) {
        console.error('Server error:', error);
        throw error;
    }
}
//# sourceMappingURL=server.js.map