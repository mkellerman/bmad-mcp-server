export declare function getHelpResult(): {
    content: string;
};
/**
 * Build comprehensive tool description with full agent and workflow inventory.
 * This provides LLMs with complete context about available resources.
 *
 * @param agents - Array of available agents
 * @param workflows - Array of available workflows
 * @returns Formatted tool description string
 */
export declare function buildToolDescription(agents: Array<{
    name: string;
    description?: string;
}>, workflows: Array<{
    name: string;
    description?: string;
}>): string;
//# sourceMappingURL=help.d.ts.map