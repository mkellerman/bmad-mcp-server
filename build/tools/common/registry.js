export function resolveAgentAlias(name) {
    return name;
}
export function isAgentName(name, agents) {
    return agents.some((a) => a.name === name);
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