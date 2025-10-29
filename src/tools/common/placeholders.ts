export function resolveWorkflowPlaceholders(
  input: string,
  vars: Record<string, string>,
): string {
  return input.replace(/\{\{([^}]+)\}\}/g, (_, k: string) => vars[k] ?? '');
}
