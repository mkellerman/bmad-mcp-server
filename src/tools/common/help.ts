export function getHelpResult() {
  const lines: string[] = [];
  lines.push('# 🎯 BMAD Tool — Quick Reference\n');
  lines.push('The BMAD tool helps you load AI agents and execute workflows.\n');
  lines.push('---\n');

  // Load an Agent
  lines.push('## 🤖 Load an Agent\n');
  lines.push(
    '**Format:** `bmad <agent-name>` or `bmad <module>/<agent-name>`\n',
  );
  lines.push('**Examples:**');
  lines.push('- `bmad bmad-master` — Load the orchestration agent (default)');
  lines.push('- `bmad analyst` — Load the Business Analyst');
  lines.push(
    '- `bmad core/architect` — Load architect from core module (module-qualified)\n',
  );
  lines.push('**Not sure which agent?** Try: `*list-agents`\n');
  lines.push('---\n');

  // Execute a Workflow
  lines.push('## 🔄 Execute a Workflow\n');
  lines.push(
    '**Format:** `bmad *<workflow-name>` or `bmad *<module>/<workflow-name>`\n',
  );
  lines.push('**Examples:**');
  lines.push('- `*party-mode` — Activate collaborative multi-agent workflow');
  lines.push('- `*dev-story` — Generate user stories and acceptance criteria');
  lines.push(
    '- `*bmm/plan-project` — Run UX planning workflow from bmm module\n',
  );
  lines.push('**Not sure which workflow?** Try: `*list-workflows`\n');
  lines.push('---\n');

  // Diagnostic & Discovery Commands
  lines.push('## 🔧 Diagnostic & Discovery Commands\n');
  lines.push('| Command | Description |');
  lines.push('|---------|-------------|');
  lines.push(
    '| `*doctor` | System health check (paths, versions, inventory) |',
  );
  lines.push('| `*list-agents` | Browse all available agents |');
  lines.push('| `*list-workflows` | Browse all available workflows |');
  lines.push('| `*help` | Show this help guide |\n');
  lines.push(
    '**Pro Tip:** Add `--full` to `*doctor` for detailed debug output\n',
  );
  lines.push('---\n');

  // Need More Help
  lines.push('## 🆘 Need More Help?\n');
  lines.push(
    '- **Discovery Mode Issues:** Check `BMAD_DISCOVERY_MODE` (auto | strict)',
  );
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

/**
 * Build comprehensive tool description with full agent and workflow inventory.
 * This provides LLMs with complete context about available resources.
 *
 * @param agents - Array of available agents
 * @param workflows - Array of available workflows
 * @returns Formatted tool description string
 */
export function buildToolDescription(
  agents: Array<{ name: string; description?: string }>,
  workflows: Array<{ name: string; description?: string }>,
): string {
  const lines: string[] = [];

  // Deduplicate agents and workflows by name (keep first occurrence)
  const uniqueAgents = Array.from(
    new Map(agents.map((a) => [a.name, a])).values(),
  );
  const uniqueWorkflows = Array.from(
    new Map(workflows.map((w) => [w.name, w])).values(),
  );

  // Sort alphabetically for consistency
  uniqueAgents.sort((a, b) => a.name.localeCompare(b.name));
  uniqueWorkflows.sort((a, b) => a.name.localeCompare(b.name));

  lines.push('Unified BMAD tool with instruction-based routing.\n');
  lines.push('**Command Patterns:**\n');

  // Pattern 1: Default agent
  lines.push('1. Load default agent (bmad-master):');
  lines.push('   - Input: "" (empty string)');
  lines.push('   - Example: bmad\n');

  // Pattern 2: Load specific agent
  lines.push('2. Load specific agent:');
  lines.push('   - Input: "<agent-name>"');
  lines.push(`   - Example: "analyst", "debug", "architect"`);
  lines.push(
    `   - Available agents (${uniqueAgents.length}): ${uniqueAgents.map((a) => a.name).join(', ')}\n`,
  );

  // Pattern 3: Execute workflow
  lines.push('3. Execute workflow:');
  lines.push('   - Input: "*<workflow-name>" (note the asterisk prefix)');
  lines.push(`   - Example: "*party-mode", "*dev-story", "*debug-quick"`);
  lines.push(
    `   - Available workflows (${uniqueWorkflows.length}): ${uniqueWorkflows.map((w) => w.name).join(', ')}\n`,
  );

  // Pattern 4: Discovery commands
  lines.push('4. Discovery commands (built-in):');
  lines.push('   - Input: "*list-agents" → Show all available BMAD agents');
  lines.push('   - Input: "*list-workflows" → Show all available workflows');
  lines.push('   - Input: "*doctor" → System diagnostics and health check');
  lines.push('   - Input: "*init" → Initialize BMAD system configuration\n');

  // Naming rules
  lines.push('**Naming Rules:**');
  lines.push(
    '- Agent names: lowercase letters and hyphens only (e.g., "analyst", "bmad-master")',
  );
  lines.push(
    '- Workflow names: lowercase letters, numbers, and hyphens (e.g., "party-mode", "dev-story")',
  );
  lines.push('- Names must be 2-50 characters');
  lines.push('- Case-sensitive matching\n');

  // Important notes
  lines.push('**Important:**');
  lines.push(
    '- To execute a workflow, you MUST prefix the name with an asterisk (*)',
  );
  lines.push(
    '- Without the asterisk, the tool will try to load an agent with that name',
  );
  lines.push('- Use only ONE argument at a time');
  lines.push('- Discovery commands are built-in and work independently\n');

  // Examples
  lines.push('**Examples:**');
  lines.push('- bmad → Load bmad-master (default orchestrator)');
  lines.push('- bmad analyst → Load Mary the Business Analyst');
  lines.push('- bmad debug → Load Diana the Debug Specialist');
  lines.push('- bmad *party-mode → Execute party-mode workflow');
  lines.push('- bmad *debug-quick → Execute quick debug workflow');
  lines.push('- bmad *list-agents → See all available agents');
  lines.push('- bmad *list-workflows → See all workflows you can run');
  lines.push('- bmad *doctor → Run system diagnostics\n');

  // Error handling
  lines.push('**Error Handling:**');
  lines.push('The tool provides helpful suggestions if you:');
  lines.push('- Misspell an agent or workflow name (fuzzy matching)');
  lines.push('- Forget the asterisk for a workflow');
  lines.push('- Use invalid characters or formatting');

  return lines.join('\n');
}
