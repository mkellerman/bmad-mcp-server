import path from 'node:path';
import { resolveBmadPaths } from '../utils/bmad-path-resolver.js';
import { detectV6 } from '../utils/version-detector.js';
export function doctor(command, ctx) {
    const parts = command.split(' ').slice(1);
    const reload = parts.includes('--reload');
    const pathArg = parts.find((p) => p && !p.startsWith('--'));
    const localDiscovery = pathArg
        ? resolveBmadPaths({
            cwd: ctx.projectRoot,
            cliArg: pathArg,
            envVar: undefined,
            userBmadPath: ctx.userBmadPath,
        })
        : ctx.discovery;
    // Use master manifest service for v6 inventory
    const service = ctx.masterManifestService;
    const master = service ? (reload ? service.reload() : service.get()) : null;
    const active = localDiscovery.activeLocation;
    const root = active.resolvedRoot ?? active.originalPath ?? ctx.bmadRoot;
    const v6Root = path.basename(root) === 'bmad' ? root : path.join(root, 'bmad');
    const relPath = path.relative(ctx.projectRoot, v6Root) || '.';
    const lines = [];
    lines.push('╭─────────────────────────────────────────────────────────────╮');
    lines.push('│          🏥 BMAD Health Diagnostic                          │');
    lines.push('╰─────────────────────────────────────────────────────────────╯');
    lines.push('');
    lines.push('┌─ Active Configuration ─────────────────────────────────────┐');
    const activeSource = ctx.discovery.activeLocation.source;
    const v6info = detectV6(v6Root);
    lines.push(`│  Type: v6  ${v6info?.installationVersion ? `(v${v6info.installationVersion})` : ''}`);
    lines.push(`│  Origin: ${activeSource}`);
    lines.push(`│  Path: ${relPath}`);
    lines.push('└────────────────────────────────────────────────────────────┘');
    lines.push('');
    if (master) {
        const totalAgents = master.agents.length;
        const totalWorkflows = master.workflows.length;
        const totalTasks = master.tasks.length;
        const orphanAgents = master.agents.filter((r) => r.status === 'orphan-file').length;
        const orphanWorkflows = master.workflows.filter((r) => r.status === 'orphan-file').length;
        const orphanTasks = master.tasks.filter((r) => r.status === 'orphan-file').length;
        const missingAgents = master.agents.filter((r) => r.status === 'missing').length;
        const missingWorkflows = master.workflows.filter((r) => r.status === 'missing').length;
        const missingTasks = master.tasks.filter((r) => r.status === 'missing').length;
        const fmt = (ok, orphan, missing) => `ok: ${ok} | orphan: ${orphan} | missing: ${missing}`;
        const okAgents = totalAgents - orphanAgents - missingAgents;
        const okWorkflows = totalWorkflows - orphanWorkflows - missingWorkflows;
        const okTasks = totalTasks - orphanTasks - missingTasks;
        // Inventory Summary
        lines.push('┌─ Inventory Summary (All Origins) ──────────────────────────┐');
        lines.push(`│  Agents    → ${fmt(okAgents, orphanAgents, missingAgents)}`);
        lines.push(`│  Workflows → ${fmt(okWorkflows, orphanWorkflows, missingWorkflows)}`);
        lines.push(`│  Tasks     → ${fmt(okTasks, orphanTasks, missingTasks)}`);
        lines.push('└────────────────────────────────────────────────────────────┘');
        lines.push('');
        // Issues Snapshot
        const topN = 8;
        const orphans = [...master.agents, ...master.workflows, ...master.tasks].filter((r) => r.status === 'orphan-file');
        const missings = [...master.agents, ...master.workflows, ...master.tasks].filter((r) => r.status === 'missing');
        if (orphans.length || missings.length) {
            lines.push('┌─ Issues Snapshot ──────────────────────────────────────────┐');
            if (orphans.length) {
                lines.push(`│  Orphan files: ${orphans.length}`);
                for (const r of orphans.slice(0, topN)) {
                    lines.push(`│    • ${r.kind} — ${r.moduleName}/${r.moduleRelativePath}`);
                }
                if (orphans.length > topN)
                    lines.push(`│    • ...and ${orphans.length - topN} more`);
            }
            if (missings.length) {
                lines.push(`│  Missing files (in manifest): ${missings.length}`);
                for (const r of missings.slice(0, topN)) {
                    lines.push(`│    • ${r.kind} — ${r.moduleName}/${r.moduleRelativePath}`);
                }
                if (missings.length > topN)
                    lines.push(`│    • ...and ${missings.length - topN} more`);
            }
            lines.push('└────────────────────────────────────────────────────────────┘');
            lines.push('');
        }
    }
    else {
        lines.push('⚠️  Master manifest service is not available.');
    }
    lines.push('Tip: Use *list-agents, *list-workflows, *list-tasks, *list-modules for detailed listings');
    return {
        success: true,
        type: 'diagnostic',
        content: lines.join('\n'),
        exitCode: 0,
    };
}
export default doctor;
//# sourceMappingURL=doctor.js.map