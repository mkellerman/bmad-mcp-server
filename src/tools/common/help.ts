export function getHelpResult() {
  const lines: string[] = [];
  lines.push('BMAD unified tool');
  lines.push('');
  lines.push('Commands:');
  lines.push('  - bmad <agent>');
  lines.push('  - bmad *<workflow>');
  lines.push('  - bmad *doctor');
  lines.push('  - bmad *list-agents | *list-workflows | *list-tasks | *list-modules');
  return { content: lines.join('\n') };
}
