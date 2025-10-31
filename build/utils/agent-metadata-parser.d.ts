/**
 * Agent Metadata Parser
 *
 * Extracts metadata from BMAD agent .md files by parsing the embedded XML (v6) or YAML (v4).
 * Agents contain structured sections with persona information (role, identity, etc.)
 */
export interface AgentMetadata {
    name?: string;
    title?: string;
    icon?: string;
    role?: string;
    identity?: string;
    communicationStyle?: string;
    principles?: string;
}
/**
 * Parse agent metadata from an agent .md file.
 *
 * Supports both v6 (XML) and v4 (YAML) formats.
 * Extracts metadata including:
 * - name, title, icon (from agent tag/section)
 * - role (from persona section)
 * - identity (from persona section)
 * - communicationStyle (from persona section)
 * - principles (from persona/core_principles section)
 *
 * @param filePath - Absolute path to the agent .md file
 * @returns AgentMetadata object with extracted fields, or empty object if parsing fails
 */
export declare function parseAgentMetadata(filePath: string): AgentMetadata;
/**
 * Parse metadata from multiple agent files.
 *
 * @param filePaths - Array of absolute paths to agent .md files
 * @returns Map of filePath -> AgentMetadata
 */
export declare function parseMultipleAgents(filePaths: string[]): Map<string, AgentMetadata>;
//# sourceMappingURL=agent-metadata-parser.d.ts.map