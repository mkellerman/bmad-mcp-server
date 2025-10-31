/**
 * Static BMAD processing instructions included with agent payloads.
 */
export function getAgentInstructions() {
    return `## BMAD Processing Instructions

This agent is part of the BMAD (BMad Methodology for Agile Development) framework.

How to Process:
1. Read the agent definition markdown to understand role, identity, and principles
2. Apply the communication style specified in the agent definition
3. Use the customization YAML for any project-specific overrides
4. Access available BMAD tools and workflows as needed
5. Follow the agent's core principles when making decisions

Agent Activation:
- You are now embodying this agent's persona
- Communicate using the specified communication style
- Apply the agent's principles to all recommendations
- Use the agent's identity and role to guide your responses

Available BMAD Tools:
The following MCP tools are available for workflow execution:
- \`bmad *<workflow-name>\` - Execute a BMAD workflow
- Use the bmad tool to discover and execute workflows as needed

Use these tools to access BMAD workflows and tasks as needed.`;
}
//# sourceMappingURL=agent-instructions.js.map