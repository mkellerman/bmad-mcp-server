export function getHelpResult() {
    const lines = [];
    lines.push('# 🎯 BMAD Tool — Quick Reference\n');
    lines.push('The BMAD tool helps you load AI agents and execute workflows.\n');
    lines.push('---\n');
    // Load an Agent
    lines.push('## 🤖 Load an Agent\n');
    lines.push('**Format:** `bmad <agent-name>` or `bmad <module>/<agent-name>`\n');
    lines.push('**Examples:**');
    lines.push('- `bmad bmad-master` — Load the orchestration agent (default)');
    lines.push('- `bmad analyst` — Load the Business Analyst');
    lines.push('- `bmad core/architect` — Load architect from core module (module-qualified)\n');
    lines.push('**Not sure which agent?** Try: `*list-agents`\n');
    lines.push('---\n');
    // Execute a Workflow
    lines.push('## 🔄 Execute a Workflow\n');
    lines.push('**Format:** `bmad *<workflow-name>` or `bmad *<module>/<workflow-name>`\n');
    lines.push('**Examples:**');
    lines.push('- `*party-mode` — Activate collaborative multi-agent workflow');
    lines.push('- `*dev-story` — Generate user stories and acceptance criteria');
    lines.push('- `*bmm/plan-project` — Run UX planning workflow from bmm module\n');
    lines.push('**Not sure which workflow?** Try: `*list-workflows`\n');
    lines.push('---\n');
    // Diagnostic & Discovery Commands
    lines.push('## 🔧 Diagnostic & Discovery Commands\n');
    lines.push('| Command | Description |');
    lines.push('|---------|-------------|');
    lines.push('| `*doctor` | System health check (paths, versions, inventory) |');
    lines.push('| `*list-agents` | Browse all available agents |');
    lines.push('| `*list-workflows` | Browse all available workflows |');
    lines.push('| `*help` | Show this help guide |\n');
    lines.push('**Pro Tip:** Add `--full` to `*doctor` for detailed debug output\n');
    lines.push('---\n');
    // Need More Help
    lines.push('## 🆘 Need More Help?\n');
    lines.push('- **Discovery Mode Issues:** Check `BMAD_DISCOVERY_MODE` (auto | strict)');
    lines.push('- **Path Not Found:** Set `BMAD_ROOT` environment variable');
    lines.push('- **Installation:** Run `npx bmad-method install`\n');
    lines.push('---\n');
    // Quick Start
    lines.push('## 💡 Quick Start\n');
    lines.push('1. Check your installation: `*doctor`');
    lines.push('2. Browse available agents: `*list-agents`');
    lines.push('3. Load an agent: `bmad analyst`');
    lines.push('4. Or jump into a workflow: `*party-mode`');
    return { content: lines.join('\n') };
}
//# sourceMappingURL=help.js.map