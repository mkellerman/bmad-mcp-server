/**
 * BMAD MCP Server - Main server implementation with unified tool.
 *
 * This server exposes BMAD methodology through the Model Context Protocol,
 * using a single unified 'bmad' tool with instruction-based routing.
 * The LLM processes files according to BMAD methodology instructions.
 */
import { type BmadPathResolution } from './utils/bmad-path-resolver.js';
import { type RemoteRegistry } from './utils/remote-registry.js';
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
export declare class BMADMCPServer {
    private bmadRoot;
    private projectRoot;
    private unifiedTool;
    private masterService;
    private agents;
    private server;
    private discovery;
    private version;
    private remoteRegistry;
    constructor(bmadRoot: string, discovery: BmadPathResolution, remoteRegistry: RemoteRegistry, version?: string);
    /**
     * Setup MCP server request handlers
     */
    private setupHandlers;
    /**
     * Run the MCP server
     */
    run(): Promise<void>;
}
/**
 * Main entry point for BMAD MCP Server
 */
export declare function main(): Promise<void>;
//# sourceMappingURL=server.d.ts.map