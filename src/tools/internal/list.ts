import type { BMADToolResult } from '../../types/index.js';
import fs from 'node:fs';

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

    for (const r of resolved.agents.filter((x: unknown) => {
      const agent = x as {
        kind?: string;
        name?: string;
        moduleRelativePath?: string;
      };
      return agent.kind === 'agent';
    })) {
      const agent = r as {
        name?: string;
        moduleName: string;
        moduleRelativePath?: string;
        description?: string;
        displayName?: string;
        title?: string;
        icon?: string;
        role?: string;
        source?: string;
        absolutePath?: string;
        commands?: string[];
      };

      const name = (agent.name || '').toString().toLowerCase();
      const p = (agent.moduleRelativePath || '').toString().toLowerCase();

      // Skip README files
      if (name === 'readme' || p.endsWith('/readme.md')) continue;

      const agentData = {
        name: agent.name ?? agent.moduleRelativePath ?? 'unknown',
        module: agent.moduleName,
        displayName: agent.displayName || agent.title || agent.name,
        description: agent.description,
        title: agent.title,
        icon: agent.icon,
        role: agent.role,
        source: agent.source === 'manifest' ? 'manifest' : 'filesystem',
        path: agent.absolutePath || agent.moduleRelativePath,
        commands: agent.commands || [],
      };

      allAgents.push(agentData);
      const moduleList = agentsByModule.get(agent.moduleName) ?? [];
      moduleList.push(agentData);
      agentsByModule.set(agent.moduleName, moduleList);
    }

    // Sort modules and agents within each module
    const sortedModules = Array.from(agentsByModule.keys()).sort();

    // Build markdown content
    const markdown: string[] = [];
    markdown.push('# 📊 BMAD Agents\n');
    markdown.push(
      `Found **${allAgents.length} agents** across **${sortedModules.length} modules**\n`,
    );

    // Add module breakdown
    markdown.push('## Modules\n');
    for (const mod of sortedModules) {
      const agents = agentsByModule.get(mod)!;
      markdown.push(
        `- **${mod}**: ${agents.length} agent${agents.length !== 1 ? 's' : ''}`,
      );
    }
    markdown.push('\n## Agents by Module\n');

    // List agents grouped by module
    for (const mod of sortedModules) {
      const agents = agentsByModule.get(mod)!;
      markdown.push(`### ${mod}\n`);

      for (const agentData of agents) {
        const agent = agentData as {
          name: string;
          displayName?: string;
          description?: string;
          icon?: string;
          role?: string;
          source: string;
          commands?: string[];
        };

        const icon = agent.icon || '🤖';
        const displayName = agent.displayName || agent.name;
        const desc = agent.description || agent.role || '';

        markdown.push(`#### ${icon} ${displayName}`);
        markdown.push(`- **Name**: \`${agent.name}\``);
        if (desc) markdown.push(`- **Role**: ${desc}`);
        markdown.push(`- **Source**: ${agent.source}`);

        if (agent.commands && agent.commands.length > 0) {
          markdown.push(`- **Commands**: ${agent.commands.length} available`);
        }
        markdown.push('');
      }
    }

    // Add interactive guidance
    markdown.push('\n---\n');
    markdown.push('## 💡 What You Can Ask\n');
    markdown.push('- "Tell me more about the [agent-name] agent"');
    markdown.push('- "Show me agents in the [module] module"');
    markdown.push('- "What commands does [agent-name] have?"');
    markdown.push('- "Load the [agent-name] agent"');

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
      `Found **${allWorkflows.length} workflows** across **${sortedModules.length} modules**\n`,
    );

    // Add module breakdown
    markdown.push('## Modules\n');
    for (const mod of sortedModules) {
      const workflows = workflowsByModule.get(mod)!;
      markdown.push(
        `- **${mod}**: ${workflows.length} workflow${workflows.length !== 1 ? 's' : ''}`,
      );
    }
    markdown.push('\n## Workflows by Module\n');

    // List workflows grouped by module
    for (const mod of sortedModules) {
      const workflows = workflowsByModule.get(mod)!;
      markdown.push(`### ${mod}\n`);

      for (const workflowData of workflows) {
        const workflow = workflowData as {
          name: string;
          displayName?: string;
          description?: string;
          source: string;
          trigger?: string;
        };

        const displayName = workflow.displayName || workflow.name;
        const desc = workflow.description || '';

        markdown.push(`#### 📋 ${displayName}`);
        markdown.push(`- **Name**: \`${workflow.name}\``);
        if (desc) markdown.push(`- **Description**: ${desc}`);
        if (workflow.trigger)
          markdown.push(`- **Trigger**: ${workflow.trigger}`);
        markdown.push(`- **Source**: ${workflow.source}`);
        markdown.push('');
      }
    }

    // Add interactive guidance
    markdown.push('\n---\n');
    markdown.push('## 💡 What You Can Ask\n');
    markdown.push('- "Tell me more about the [workflow-name] workflow"');
    markdown.push('- "Show me workflows in the [module] module"');
    markdown.push('- "Execute the [workflow-name] workflow"');
    markdown.push('- "What does [workflow-name] do?"');

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
      `Found **${allTasks.length} tasks** across **${sortedModules.length} modules**\n`,
    );

    // Add module breakdown
    markdown.push('## Modules\n');
    for (const mod of sortedModules) {
      const tasks = tasksByModule.get(mod)!;
      markdown.push(
        `- **${mod}**: ${tasks.length} task${tasks.length !== 1 ? 's' : ''}`,
      );
    }
    markdown.push('\n## Tasks by Module\n');

    // List tasks grouped by module
    for (const mod of sortedModules) {
      const tasks = tasksByModule.get(mod)!;
      markdown.push(`### ${mod}\n`);

      for (const taskData of tasks) {
        const task = taskData as {
          name: string;
          displayName?: string;
          description?: string;
          source: string;
        };

        const displayName = task.displayName || task.name;
        const desc = task.description || '';

        markdown.push(`#### 🔧 ${displayName}`);
        markdown.push(`- **Name**: \`${task.name}\``);
        if (desc) markdown.push(`- **Description**: ${desc}`);
        markdown.push(`- **Source**: ${task.source}`);
        markdown.push('');
      }
    }

    // Add interactive guidance
    markdown.push('\n---\n');
    markdown.push('## 💡 What You Can Ask\n');
    markdown.push('- "Tell me more about the [task-name] task"');
    markdown.push('- "Show me tasks in the [module] module"');
    markdown.push('- "What does [task-name] do?"');
    markdown.push('- "How do I use [task-name]?"');

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

    // Build markdown content
    const markdown: string[] = [];
    markdown.push('# 📦 BMAD Modules\n');
    markdown.push(`Found **${mods.length} modules** with resources\n`);

    // Summary stats
    const totalAgents = mods.reduce(
      (sum, [, counts]) => sum + counts.agents,
      0,
    );
    const totalWorkflows = mods.reduce(
      (sum, [, counts]) => sum + counts.workflows,
      0,
    );
    const totalTasks = mods.reduce((sum, [, counts]) => sum + counts.tasks, 0);

    markdown.push('## Summary\n');
    markdown.push(`- **Total Agents**: ${totalAgents}`);
    markdown.push(`- **Total Workflows**: ${totalWorkflows}`);
    markdown.push(`- **Total Tasks**: ${totalTasks}`);
    markdown.push(`- **Origin**: ${origin}\n`);

    // Module table
    markdown.push('## Modules Overview\n');
    markdown.push('| Module | Agents | Workflows | Tasks | Total |');
    markdown.push('|--------|--------|-----------|-------|-------|');

    for (const [mod, counts] of mods) {
      const total = counts.agents + counts.workflows + counts.tasks;
      markdown.push(
        `| **${mod}** | ${counts.agents} | ${counts.workflows} | ${counts.tasks} | **${total}** |`,
      );
    }

    // Add interactive guidance
    markdown.push('\n---\n');
    markdown.push('## 💡 What You Can Ask\n');
    markdown.push('- "Show me all agents in the [module] module"');
    markdown.push('- "List workflows from [module]"');
    markdown.push('- "What resources are in [module]?"');
    markdown.push('- "Tell me about the [module] module"');

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
