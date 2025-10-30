import type { BMADToolResult, MasterRecord } from '../../types/index.js';
import fs from 'node:fs';
import { masterRecordToAgent } from '../../utils/master-manifest-adapter.js';

interface ListContext {
  resolved: any;
  master: any;
  discovery: any;
}

export function handleListCommand(
  cmd: string,
  ctx: ListContext,
): BMADToolResult {
  const { resolved, master, discovery } = ctx;
  const lines: string[] = [];

  if (cmd === '*list-agents') {
    // Build structured data
    const agentsByModule = new Map<string, unknown[]>();
    const allAgents: unknown[] = [];

    // Convert MasterRecords to Agents with parsed metadata
    const agentRecords = resolved.agents.filter((x: unknown) => {
      const agent = x as {
        kind?: string;
        name?: string;
        moduleRelativePath?: string;
      };
      return agent.kind === 'agent';
    });

    // Parse metadata from agent files
    const parsedAgents = agentRecords.map((record: MasterRecord) =>
      masterRecordToAgent(record, true),
    );

    for (const agent of parsedAgents) {
      const name = (agent.name || '').toString().toLowerCase();
      const p = (agent.path || '').toString().toLowerCase();

      // Skip README files
      if (name === 'readme' || p.endsWith('/readme.md')) continue;

      const agentData = {
        name: agent.name,
        module: agent.module,
        displayName: agent.displayName || agent.title || agent.name,
        description: agent.title,
        title: agent.title,
        icon: agent.icon,
        role: agent.role,
        source: agent.sourceLocation?.includes('manifest')
          ? 'manifest'
          : 'filesystem',
        path: agent.path,
        commands: [], // Commands not available in Agent interface
      };

      allAgents.push(agentData);
      const moduleList = agentsByModule.get(agent.module) ?? [];
      moduleList.push(agentData);
      agentsByModule.set(agent.module, moduleList);
    }

    // Sort modules for metadata
    const sortedModules = Array.from(agentsByModule.keys()).sort();

    // Sort all agents alphabetically by display name
    const sortedAgents = allAgents.sort((a: any, b: any) => {
      const nameA = (a.displayName || a.name || '').toLowerCase();
      const nameB = (b.displayName || b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Build markdown content
    const markdown: string[] = [];
    markdown.push('# 🤖 BMAD Agents\n');
    markdown.push(
      `**Found ${allAgents.length} agents across ${sortedModules.length} modules**\n`,
    );
    markdown.push('---\n');

    // Simple list format like party-mode
    for (const agentData of sortedAgents) {
      const agent = agentData as {
        name: string;
        module: string;
        displayName?: string;
        description?: string;
        icon?: string;
        role?: string;
        title?: string;
        source: string;
        commands?: string[];
      };

      const icon = agent.icon || '🤖';
      const agentName = agent.name || 'unknown';
      const displayName = agent.displayName || agent.name || 'Unknown';
      const title = agent.title || '';
      const role = agent.role || '';

      // Build line segments safely
      const segments: string[] = [];

      // Format: "- icon [agent-name]: Title (**DisplayName**) Role"
      // Example: "- 🎨 [ux-expert]: UX Expert (**Sally**) User Experience Designer + UI Specialist"

      // Start with icon and agent name
      const prefix = `- ${icon} \`${agentName}\`:`;

      if (title) {
        segments.push(title);
      }

      // Build the description parts
      segments.push(`(**${displayName}**)`);

      if (role) {
        segments.push(role);
      }

      // Join segments with separator and combine with prefix
      const agentLine = `${prefix} ${segments.join(' - ')}`;
      markdown.push(agentLine);
    }

    markdown.push('');
    markdown.push('---\n');
    markdown.push(
      '**Tip:** Load any agent by name, e.g., `bmad analyst` or `bmad ux-expert`',
    );

    // Build summary for structured data
    const byGroup: Record<string, number> = {};
    for (const mod of sortedModules) {
      byGroup[mod] = agentsByModule.get(mod)!.length;
    }

    return {
      success: true,
      type: 'list',
      listType: 'agents',
      count: allAgents.length,
      content: markdown.join('\n'),
      exitCode: 0,
      structuredData: {
        items: allAgents,
        summary: {
          total: allAgents.length,
          byGroup,
          message: `Found ${allAgents.length} agents across ${sortedModules.length} modules`,
        },
        metadata: {
          modules: sortedModules,
          timestamp: new Date().toISOString(),
        },
        followUpSuggestions: [
          'Tell me more about a specific agent',
          'Show me agents in a specific module',
          'What commands does an agent have?',
          'Load an agent to start working',
        ],
      },
    };
  }

  if (cmd === '*list-workflows') {
    // Build structured data
    const workflowsByModule = new Map<string, unknown[]>();
    const allWorkflows: unknown[] = [];

    for (const r of resolved.workflows.filter((x: unknown) => {
      const workflow = x as { kind?: string };
      return workflow.kind === 'workflow';
    })) {
      const workflow = r as {
        name?: string;
        moduleName: string;
        moduleRelativePath?: string;
        description?: string;
        displayName?: string;
        source?: string;
        absolutePath?: string;
        trigger?: string;
      };

      const workflowData = {
        name: workflow.name ?? workflow.moduleRelativePath ?? 'unknown',
        module: workflow.moduleName,
        displayName: workflow.displayName || workflow.name,
        description: workflow.description,
        source: workflow.source === 'manifest' ? 'manifest' : 'filesystem',
        path: workflow.absolutePath || workflow.moduleRelativePath,
        trigger: workflow.trigger,
      };

      allWorkflows.push(workflowData);
      const moduleList = workflowsByModule.get(workflow.moduleName) ?? [];
      moduleList.push(workflowData);
      workflowsByModule.set(workflow.moduleName, moduleList);
    }

    // Sort modules
    const sortedModules = Array.from(workflowsByModule.keys()).sort();

    // Build markdown content
    const markdown: string[] = [];
    markdown.push('# 🔄 BMAD Workflows\n');
    markdown.push(
      `**Summary:** ${allWorkflows.length} workflows available across ${sortedModules.length} modules\n`,
    );
    markdown.push('---\n');

    // Add module breakdown
    markdown.push('## 📦 By Module\n');
    const moduleBreakdown = sortedModules
      .map((mod) => {
        const count = workflowsByModule.get(mod)!.length;
        return `**${mod}** (${count})`;
      })
      .join(' • ');
    markdown.push(`${moduleBreakdown}\n`);
    markdown.push('---\n');

    markdown.push('## 🎯 All Workflows\n');

    // List workflows grouped by module
    for (const mod of sortedModules) {
      const workflows = workflowsByModule.get(mod)!;

      for (const workflowData of workflows) {
        const workflow = workflowData as {
          name: string;
          module: string;
          displayName?: string;
          description?: string;
          source: string;
          trigger?: string;
        };

        const displayName = workflow.displayName || workflow.name;
        const desc = workflow.description || 'BMAD Workflow';

        markdown.push(`### ${mod}/${workflow.name}`);
        markdown.push(`**📋 ${displayName}**  `);
        markdown.push(`${desc}\n`);

        markdown.push('**Quick Actions:**');
        markdown.push(
          `- Execute: \`*${workflow.name}\` or \`*${mod}/${workflow.name}\``,
        );
        if (workflow.trigger) {
          markdown.push(`- Trigger: ${workflow.trigger}`);
        }
        markdown.push('');
      }
    }

    // Add interactive guidance
    markdown.push('---\n');
    markdown.push('## � Natural Language Tips\n');
    markdown.push('You can ask me:');
    markdown.push('- "Execute the party-mode workflow"');
    markdown.push('- "What does dev-story do?"');
    markdown.push('- "Show me workflows in the bmm module"');
    markdown.push('- "Tell me about the plan-project workflow"');

    // Build summary
    const byGroup: Record<string, number> = {};
    for (const mod of sortedModules) {
      byGroup[mod] = workflowsByModule.get(mod)!.length;
    }

    return {
      success: true,
      type: 'list',
      listType: 'workflows',
      count: allWorkflows.length,
      content: markdown.join('\n'),
      exitCode: 0,
      structuredData: {
        items: allWorkflows,
        summary: {
          total: allWorkflows.length,
          byGroup,
          message: `Found ${allWorkflows.length} workflows across ${sortedModules.length} modules`,
        },
        metadata: {
          modules: sortedModules,
          timestamp: new Date().toISOString(),
        },
        followUpSuggestions: [
          'Tell me more about a specific workflow',
          'Show me workflows in a specific module',
          'Execute a workflow',
          'What does a workflow do?',
        ],
      },
    };
  }

  if (cmd === '*list-tasks') {
    // Build structured data
    const tasksByModule = new Map<string, unknown[]>();
    const allTasks: unknown[] = [];

    for (const r of resolved.tasks.filter((x: unknown) => {
      const task = x as { kind?: string };
      return task.kind === 'task';
    })) {
      const task = r as {
        name?: string;
        moduleName: string;
        moduleRelativePath?: string;
        description?: string;
        displayName?: string;
        source?: string;
        absolutePath?: string;
      };

      const taskData = {
        name: task.name ?? task.moduleRelativePath ?? 'unknown',
        module: task.moduleName,
        displayName: task.displayName || task.name,
        description: task.description,
        source: task.source === 'manifest' ? 'manifest' : 'filesystem',
        path: task.absolutePath || task.moduleRelativePath,
      };

      allTasks.push(taskData);
      const moduleList = tasksByModule.get(task.moduleName) ?? [];
      moduleList.push(taskData);
      tasksByModule.set(task.moduleName, moduleList);
    }

    // Sort modules
    const sortedModules = Array.from(tasksByModule.keys()).sort();

    // Build markdown content
    const markdown: string[] = [];
    markdown.push('# ⚙️ BMAD Tasks\n');
    markdown.push(
      `**Summary:** ${allTasks.length} tasks available across ${sortedModules.length} modules\n`,
    );
    markdown.push('---\n');

    // Add module breakdown
    markdown.push('## 📦 By Module\n');
    const moduleBreakdown = sortedModules
      .map((mod) => {
        const count = tasksByModule.get(mod)!.length;
        return `**${mod}** (${count})`;
      })
      .join(' • ');
    markdown.push(`${moduleBreakdown}\n`);
    markdown.push('---\n');

    markdown.push('## 🎯 All Tasks\n');

    // List tasks grouped by module
    for (const mod of sortedModules) {
      const tasks = tasksByModule.get(mod)!;

      for (const taskData of tasks) {
        const task = taskData as {
          name: string;
          module: string;
          displayName?: string;
          description?: string;
          source: string;
        };

        const displayName = task.displayName || task.name;
        const desc = task.description || 'BMAD Task';

        markdown.push(`### ${mod}/${task.name}`);
        markdown.push(`**🔧 ${displayName}**  `);
        markdown.push(`${desc}\n`);

        markdown.push('**Quick Actions:**');
        markdown.push(`- Reference: \`${mod}/${task.name}\``);
        markdown.push('');
      }
    }

    // Add interactive guidance
    markdown.push('---\n');
    markdown.push('## � Natural Language Tips\n');
    markdown.push('You can ask me:');
    markdown.push('- "What does the workflow task do?"');
    markdown.push('- "Show me tasks in the core module"');
    markdown.push('- "Tell me about validate-workflow"');
    markdown.push('- "How do I use the workflow task?"');

    // Build summary
    const byGroup: Record<string, number> = {};
    for (const mod of sortedModules) {
      byGroup[mod] = tasksByModule.get(mod)!.length;
    }

    return {
      success: true,
      type: 'list',
      listType: 'tasks',
      count: allTasks.length,
      content: markdown.join('\n'),
      exitCode: 0,
      structuredData: {
        items: allTasks,
        summary: {
          total: allTasks.length,
          byGroup,
          message: `Found ${allTasks.length} tasks across ${sortedModules.length} modules`,
        },
        metadata: {
          modules: sortedModules,
          timestamp: new Date().toISOString(),
        },
        followUpSuggestions: [
          'Tell me more about a specific task',
          'Show me tasks in a specific module',
          'What does a task do?',
          'How do I use a task?',
        ],
      },
    };
  }

  if (cmd === '*list-modules') {
    const origin = (discovery.activeLocation.source || 'unknown') as string;

    // Build structured data
    interface ModuleCounts {
      agents: number;
      workflows: number;
      tasks: number;
    }

    const byModule = new Map<string, ModuleCounts>();

    for (const r of resolved.agents) {
      const m = byModule.get(r.moduleName) ?? {
        agents: 0,
        workflows: 0,
        tasks: 0,
      };
      m.agents += 1;
      byModule.set(r.moduleName, m);
    }

    for (const r of resolved.workflows) {
      const m = byModule.get(r.moduleName) ?? {
        agents: 0,
        workflows: 0,
        tasks: 0,
      };
      m.workflows += 1;
      byModule.set(r.moduleName, m);
    }

    for (const r of resolved.tasks) {
      const m = byModule.get(r.moduleName) ?? {
        agents: 0,
        workflows: 0,
        tasks: 0,
      };
      m.tasks += 1;
      byModule.set(r.moduleName, m);
    }

    // Sort modules
    const mods = Array.from(byModule.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    // Calculate totals
    const totalAgents = mods.reduce(
      (sum, [, counts]) => sum + counts.agents,
      0,
    );
    const totalWorkflows = mods.reduce(
      (sum, [, counts]) => sum + counts.workflows,
      0,
    );
    const totalTasks = mods.reduce((sum, [, counts]) => sum + counts.tasks, 0);

    // Build markdown content
    const markdown: string[] = [];
    markdown.push('# 📦 BMAD Modules\n');
    markdown.push(
      `**${mods.length} modules** providing **${totalAgents + totalWorkflows + totalTasks} total resources** (${totalAgents} agents • ${totalWorkflows} workflows • ${totalTasks} tasks)\n`,
    );
    markdown.push('---\n');

    // Summary stats
    markdown.push('## 📊 Module Inventory\n');
    markdown.push('| Module | Agents | Workflows | Tasks | **Total** |');
    markdown.push('|--------|--------|-----------|-------|-----------|');

    for (const [mod, counts] of mods) {
      const total = counts.agents + counts.workflows + counts.tasks;
      markdown.push(
        `| **${mod}** | ${counts.agents} 🤖 | ${counts.workflows} 🔄 | ${counts.tasks} ⚙️ | **${total}** |`,
      );
    }

    // Add total row
    markdown.push(
      `| **TOTAL** | **${totalAgents}** | **${totalWorkflows}** | **${totalTasks}** | **${totalAgents + totalWorkflows + totalTasks}** |\n`,
    );
    markdown.push('---\n');

    // Explore Modules section (you can customize descriptions per module)
    markdown.push('## 🔍 Explore Modules\n');
    for (const [mod, counts] of mods) {
      const desc = getModuleDescription(mod); // Helper function for descriptions
      markdown.push(`**${mod}** — ${desc}`);
      const parts: string[] = [];
      if (counts.agents > 0)
        parts.push(`${counts.agents} agent${counts.agents !== 1 ? 's' : ''}`);
      if (counts.workflows > 0)
        parts.push(
          `${counts.workflows} workflow${counts.workflows !== 1 ? 's' : ''}`,
        );
      if (counts.tasks > 0)
        parts.push(`${counts.tasks} task${counts.tasks !== 1 ? 's' : ''}`);
      markdown.push(`- Resources: ${parts.join(', ')}\n`);
    }

    markdown.push('---\n');

    // Add interactive guidance
    markdown.push('## � What You Can Ask\n');
    markdown.push('- "Show me everything in the core module"');
    markdown.push('- "What\'s the difference between core and bmm?"');
    markdown.push('- "List all agents from bmm"');
    markdown.push('- "What resources are in the core module?"');

    // Helper function to get module descriptions
    function getModuleDescription(moduleName: string): string {
      const descriptions: Record<string, string> = {
        core: 'Core BMAD framework and orchestration',
        bmm: 'Business Method Manager',
        'bmad-core': 'Core BMAD framework components',
        custom: 'Custom local resources',
      };
      return descriptions[moduleName] || 'BMAD module';
    }

    // Build structured items
    const moduleItems = mods.map(([moduleName, counts]) => ({
      module: moduleName,
      agents: counts.agents,
      workflows: counts.workflows,
      tasks: counts.tasks,
      total: counts.agents + counts.workflows + counts.tasks,
      origin,
    }));

    return {
      success: true,
      type: 'list',
      listType: 'modules',
      count: mods.length,
      content: markdown.join('\n'),
      exitCode: 0,
      structuredData: {
        items: moduleItems,
        summary: {
          total: mods.length,
          message: `Found ${mods.length} modules with ${totalAgents} agents, ${totalWorkflows} workflows, and ${totalTasks} tasks`,
        },
        metadata: {
          origin,
          totalAgents,
          totalWorkflows,
          totalTasks,
          timestamp: new Date().toISOString(),
        },
        followUpSuggestions: [
          'Show me all resources in a specific module',
          'List agents from a module',
          'Tell me about a module',
          'What workflows are available in a module?',
        ],
      },
    };
  }

  if (
    cmd.startsWith('*export-master-manifest') ||
    cmd.startsWith('*dump-master-manifest')
  ) {
    const parts = cmd.split(' ').filter(Boolean);
    const target = parts[1] || 'master-manifest.json';
    try {
      fs.writeFileSync(target, JSON.stringify(master, null, 2), 'utf-8');
      return {
        success: true,
        type: 'list',
        listType: 'dump',
        content: `Master manifest written to ${target}`,
        exitCode: 0,
      };
    } catch (e: any) {
      return {
        success: false,
        exitCode: 1,
        error: `Failed to write file: ${e?.message || String(e)}`,
      };
    }
  }

  return { success: false, exitCode: 1, error: 'Unknown list command' };
}
