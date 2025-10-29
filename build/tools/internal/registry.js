export function resolveAgentAlias(name, agents) {
    const aliases = { master: 'bmad-master' };
    const canonical = aliases[name];
    if (canonical)
        return canonical;
    for (const agent of agents) {
        const agentName = agent.name;
        const module = agent.module;
        if (agentName.endsWith(`-${name}`) && agentName.startsWith(`${module}-`)) {
            return agentName;
        }
    }
    return name;
}
export function isAgentName(name, agents) {
    const canonical = resolveAgentAlias(name, agents);
    return agents.some((a) => a.name === canonical);
}
export function isWorkflowName(name, workflows) {
    return workflows.some((w) => w.name === name);
}
export function getAgentNames(agents) {
    return agents.map((a) => a.name);
}
export function getWorkflowNames(workflows) {
    return workflows.map((w) => w.name);
}
//# sourceMappingURL=registry.js.map