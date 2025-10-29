export function getHelpResult(bmadRoot, agents, workflows) {
    const contentParts = [
        '# BMAD MCP Server - Command Reference\n',
        '## Available Commands\n',
        '### Load Agents',
        'Load and interact with BMAD agents:',
        '- `bmad ""` or `bmad` (empty) → Load bmad-master (default agent)',
        '- `bmad <agent-name>` → Load specific agent',
        '- Examples:',
        '  - `bmad analyst` → Load Mary (Business Analyst)',
        '  - `bmad dev` → Load Olivia (Senior Developer)',
        '  - `bmad tea` → Load Murat (Master Test Architect)\n',
        '### Execute Workflows',
        'Run BMAD workflows (prefix with `*`):',
        '- `bmad *<workflow-name>` → Execute workflow',
        '- Examples:',
        '  - `bmad *party-mode` → Start group discussion with all agents',
        '  - `bmad *framework` → Initialize test framework\n',
        '## Agent vs Workflow',
        '- **Agents** provide personas and interactive menus (no `*` prefix)',
        '- **Workflows** execute automated tasks (use `*` prefix)\n',
        '## MCP Resources',
        `All resources are loaded from: \`${bmadRoot}\``,
        `- Agents: ${agents.length} available`,
        `- Workflows: ${workflows.length} available\n`,
    ];
    return { success: true, type: 'help', content: contentParts.join('\n'), exitCode: 0 };
}
//# sourceMappingURL=help.js.map