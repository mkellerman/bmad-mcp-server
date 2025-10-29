export function formatDoubleAsteriskError(name: string): string {
  return `Invalid workflow command '**${name}'. Use a single asterisk: '*${name}'.`;
}

export function formatMissingWorkflowNameError(): string {
  return 'Missing workflow name after *. Example: *party-mode';
}

export function formatMissingAsteriskError(name: string): string {
  return `Did you mean '*${name}'? Workflows require an asterisk.`;
}

