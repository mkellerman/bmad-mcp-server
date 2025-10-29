import { resolveWorkflowPlaceholders } from './placeholders.js';
import { getAgentInstructions } from './agent-instructions.js';
/**
 * Build agent payload by reading the agent markdown and optional customization YAML.
 */
export function loadAgent({ agentName, agents, fileReader, }) {
    // Find agent in manifest using canonical name
    const agent = agents.find((a) => a.name === agentName);
    if (!agent) {
        // Should not happen after validation, but guard anyway
        return {
            success: false,
            error: `Agent '${agentName}' not found in manifest`,
            exitCode: 2,
        };
    }
    const contentParts = [];
    // Header
    const displayName = agent.displayName || agentName;
    const title = agent.title || 'BMAD Agent';
    contentParts.push(`# BMAD Agent: ${displayName}`);
    contentParts.push(`**Title:** ${title}\n`);
    // Agent markdown file
    const agentPath = agent.path;
    if (agentPath) {
        contentParts.push('## Agent Definition\n');
        contentParts.push(`**File:** \`${agentPath}\`\n`);
        try {
            const agentMdContentRaw = fileReader.readFile(agentPath);
            const agentMdContent = resolveWorkflowPlaceholders(agentMdContentRaw);
            contentParts.push('```markdown');
            contentParts.push(agentMdContent);
            contentParts.push('```\n');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            contentParts.push(`[Error reading agent file: ${errorMessage}]\n`);
        }
    }
    // Customization YAML file (best-effort)
    const module = agent.module ?? 'bmm';
    const customizePath = `_cfg/agents/${module}-${agentName}.customize.yaml`;
    contentParts.push('## Agent Customization\n');
    contentParts.push(`**File:** \`${customizePath}\`\n`);
    try {
        const yamlContentRaw = fileReader.readFile(customizePath);
        const yamlContent = resolveWorkflowPlaceholders(yamlContentRaw);
        contentParts.push('```yaml');
        contentParts.push(yamlContent);
        contentParts.push('```\n');
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        contentParts.push(`[Customization file not found or error: ${errorMessage}]\n`);
    }
    // BMAD Processing Instructions
    contentParts.push(getAgentInstructions());
    return {
        success: true,
        type: 'agent',
        agentName,
        displayName,
        content: contentParts.join('\n'),
        exitCode: 0,
    };
}
//# sourceMappingURL=agent-loader.js.map