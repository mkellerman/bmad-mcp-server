/**
 * Utility for dynamic placeholder resolution inside loaded content.
 */
/**
 * Dynamically resolve workflow placeholders to clarify MCP resource usage.
 * Replaces {project-root} with {mcp-resources} inside content blocks.
 */
export function resolveWorkflowPlaceholders(content) {
    return content.replace(/{project-root}/g, '{mcp-resources}');
}
//# sourceMappingURL=placeholders.js.map