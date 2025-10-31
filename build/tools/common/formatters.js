export function formatDoubleAsteriskError(name) {
    return `Invalid workflow command '**${name}'. Use a single asterisk: '*${name}'.`;
}
export function formatMissingWorkflowNameError() {
    return 'Missing workflow name after *. Example: *party-mode';
}
export function formatMissingAsteriskError(name) {
    return `Did you mean '*${name}'? Workflows require an asterisk.`;
}
//# sourceMappingURL=formatters.js.map