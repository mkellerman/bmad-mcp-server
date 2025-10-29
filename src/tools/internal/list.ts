import type { BMADToolResult } from '../../types/index.js';
import fs from 'node:fs';

interface ListContext {
  resolved: any;
  master: any;
  discovery: any;
}

export function handleListCommand(cmd: string, ctx: ListContext): BMADToolResult {
  const { resolved, master, discovery } = ctx;
  const lines: string[] = [];

  if (cmd === '*list-agents') {
    const groups = new Map<string, string[]>();
    for (const r of resolved.agents.filter((x: any) => x.kind === 'agent')) {
      const name = (r.name || '').toString().toLowerCase();
      const p = (r.moduleRelativePath || '').toString().toLowerCase();
      if (name === 'readme' || p.endsWith('/readme.md')) continue;
      const labelName = r.name ?? r.moduleRelativePath;
      const desc: string | undefined = r.description || r.displayName;
      const src = r.source === 'manifest' ? 'manifest' : 'filesystem';
      const base = desc ? `${labelName} — ${desc}` : `${labelName}`;
      const label = `${base} [${src}]`;
      const list = groups.get(r.moduleName) ?? [];
      list.push(label);
      groups.set(r.moduleName, list);
    }
    lines.push('Agents (available)');
    for (const mod of Array.from(groups.keys()).sort()) {
      lines.push(`\n  - module: ${mod}`);
      for (const item of groups.get(mod)!.sort((a, b) => a.localeCompare(b))) {
        lines.push(`      ${item}`);
      }
    }
    return { success: true, type: 'list', listType: 'agents', count: resolved.agents.length, content: lines.join('\n'), exitCode: 0 };
  }

  if (cmd === '*list-workflows') {
    lines.push('Workflows (available)');
    const byModule = new Map<string, string[]>();
    for (const r of resolved.workflows.filter((x: any) => x.kind === 'workflow')) {
      const base = r.name ?? r.moduleRelativePath;
      const src = r.source === 'manifest' ? 'manifest' : 'filesystem';
      const label = `${base} [${src}]`;
      const list = byModule.get(r.moduleName) ?? [];
      list.push(label);
      byModule.set(r.moduleName, list);
    }
    for (const mod of Array.from(byModule.keys()).sort()) {
      lines.push(`Module: ${mod}`);
      for (const item of byModule.get(mod)!.sort((a, b) => a.localeCompare(b))) {
        lines.push(`- ${item}`);
      }
    }
    return { success: true, type: 'list', listType: 'workflows', count: resolved.workflows.length, content: lines.join('\n'), exitCode: 0 };
  }

  if (cmd === '*list-tasks') {
    lines.push('Tasks (available)');
    const byModuleTasks = new Map<string, string[]>();
    for (const r of resolved.tasks.filter((x: any) => x.kind === 'task')) {
      const base = r.name ?? r.moduleRelativePath;
      const src = r.source === 'manifest' ? 'manifest' : 'filesystem';
      const label = `${base} [${src}]`;
      const list = byModuleTasks.get(r.moduleName) ?? [];
      list.push(label);
      byModuleTasks.set(r.moduleName, list);
    }
    for (const mod of Array.from(byModuleTasks.keys()).sort()) {
      lines.push(`Module: ${mod}`);
      for (const item of byModuleTasks.get(mod)!.sort((a, b) => a.localeCompare(b))) {
        lines.push(`- ${item}`);
      }
    }
    return { success: true, type: 'list', listType: 'tasks', count: resolved.tasks.length, content: lines.join('\n'), exitCode: 0 };
  }

  if (cmd === '*list-modules') {
    const origin = (discovery.activeLocation.source || 'unknown') as string;
    const byModule = new Map<string, { agents: number; workflows: number; tasks: number }>();
    for (const r of resolved.agents) {
      const m = byModule.get(r.moduleName) ?? { agents: 0, workflows: 0, tasks: 0 };
      m.agents += 1;
      byModule.set(r.moduleName, m);
    }
    for (const r of resolved.workflows) {
      const m = byModule.get(r.moduleName) ?? { agents: 0, workflows: 0, tasks: 0 };
      m.workflows += 1;
      byModule.set(r.moduleName, m);
    }
    for (const r of resolved.tasks) {
      const m = byModule.get(r.moduleName) ?? { agents: 0, workflows: 0, tasks: 0 };
      m.tasks += 1;
      byModule.set(r.moduleName, m);
    }
    lines.push('Modules (available)');
    lines.push('| Module | Agents | Workflows | Tasks |');
    const mods = Array.from(byModule.entries()).sort(([a], [b]) => a.localeCompare(b));
    for (const [mod, counts] of mods) {
      lines.push(`| ${mod} @ ${origin} | ${counts.agents} | ${counts.workflows} | ${counts.tasks} |`);
    }
    return { success: true, type: 'list', listType: 'modules', count: mods.length, content: lines.join('\n'), exitCode: 0 };
  }

  if (cmd.startsWith('*export-master-manifest') || cmd.startsWith('*dump-master-manifest')) {
    const parts = cmd.split(' ').filter(Boolean);
    const target = parts[1] || 'master-manifest.json';
    try {
      fs.writeFileSync(target, JSON.stringify(master, null, 2), 'utf-8');
      return { success: true, type: 'list', listType: 'dump', content: `Master manifest written to ${target}`, exitCode: 0 };
    } catch (e: any) {
      return { success: false, exitCode: 1, error: `Failed to write file: ${e?.message || String(e)}` };
    }
  }

  return { success: false, exitCode: 1, error: 'Unknown list command' };
}
