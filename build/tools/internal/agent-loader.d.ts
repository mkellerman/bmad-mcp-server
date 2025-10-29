import type { Agent, BMADToolResult } from '../../types/index.js';
import { FileReader } from '../../utils/file-reader.js';
export interface LoadAgentOptions {
    agentName: string;
    agents: Agent[];
    fileReader: FileReader;
}
/**
 * Build agent payload by reading the agent markdown and optional customization YAML.
 */
export declare function loadAgent({ agentName, agents, fileReader, }: LoadAgentOptions): BMADToolResult;
//# sourceMappingURL=agent-loader.d.ts.map