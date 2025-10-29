/**
 * Unified BMAD Tool orchestrator.
 * Thin class delegating to parser, validators, loaders, and tools.
 */
import type { BMADToolResult } from '../../types/index.js';
import type { BmadPathResolution } from '../../utils/bmad-path-resolver.js';
export declare class UnifiedBMADTool {
    private bmadRoot;
    private manifestLoader;
    private fileReader;
    private agents;
    private workflows;
    private discovery;
    private userBmadPath;
    private projectRoot;
    private manifestDir;
    constructor(options: {
        bmadRoot: string;
        discovery: BmadPathResolution;
    });
    execute(command: string): BMADToolResult;
    private resolveAgentAlias;
    private loadAgent;
    private executeWorkflow;
    private formatErrorResponse;
    private buildWorkflowContext;
}
//# sourceMappingURL=orchestrator.d.ts.map