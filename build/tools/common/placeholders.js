export function resolveWorkflowPlaceholders(input, vars) {
    return input.replace(/\{\{([^}]+)\}\}/g, (_, k) => vars[k] ?? '');
}
//# sourceMappingURL=placeholders.js.map