import path from 'node:path';
import { resolveBmadPaths, } from '../../utils/bmad-path-resolver.js';
import { detectV6 } from '../../utils/version-detector.js';
export function doctor(command, ctx) {
    const parts = command.split(' ').slice(1);
    const reload = parts.includes('--reload');
    const pathArg = parts.find((p) => p && !p.startsWith('--'));
    const localDiscovery = pathArg
        ? resolveBmadPaths({
            cwd: ctx.projectRoot,
            cliArgs: [pathArg],
            envVar: undefined,
            userBmadPath: ctx.userBmadPath,
        })
        : ctx.discovery;
    // Use master manifest service for v6 inventory
    const service = ctx.masterManifestService;
    const master = service
        ? reload
            ? service.reload()
            : service.get()
        : null;
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
        const notInManifestAgents = master.agents.filter((r) => r.status === 'not-in-manifest').length;
        const notInManifestWorkflows = master.workflows.filter((r) => r.status === 'not-in-manifest').length;
        const notInManifestTasks = master.tasks.filter((r) => r.status === 'not-in-manifest').length;
        const noFileFoundAgents = master.agents.filter((r) => r.status === 'no-file-found').length;
        const noFileFoundWorkflows = master.workflows.filter((r) => r.status === 'no-file-found').length;
        const noFileFoundTasks = master.tasks.filter((r) => r.status === 'no-file-found').length;
        const fmt = (verified, notInManifest, noFileFound) => `verified: ${verified} | not-in-manifest: ${notInManifest} | no-file-found: ${noFileFound}`;
        const verifiedAgents = totalAgents - notInManifestAgents - noFileFoundAgents;
        const verifiedWorkflows = totalWorkflows - notInManifestWorkflows - noFileFoundWorkflows;
        const verifiedTasks = totalTasks - notInManifestTasks - noFileFoundTasks;
        // Inventory Summary
        lines.push('┌─ Inventory Summary (All Origins) ──────────────────────────┐');
        lines.push(`│  Agents    → ${fmt(verifiedAgents, notInManifestAgents, noFileFoundAgents)}`);
        lines.push(`│  Workflows → ${fmt(verifiedWorkflows, notInManifestWorkflows, noFileFoundWorkflows)}`);
        lines.push(`│  Tasks     → ${fmt(verifiedTasks, notInManifestTasks, noFileFoundTasks)}`);
        lines.push('└────────────────────────────────────────────────────────────┘');
        lines.push('');
        // Issues Snapshot
        const topN = 8;
        const notInManifest = [
            ...master.agents,
            ...master.workflows,
            ...master.tasks,
        ].filter((r) => r.status === 'not-in-manifest');
        const noFileFound = [
            ...master.agents,
            ...master.workflows,
            ...master.tasks,
        ].filter((r) => r.status === 'no-file-found');
        if (notInManifest.length || noFileFound.length) {
            lines.push('┌─ Issues Snapshot ──────────────────────────────────────────┐');
            if (notInManifest.length) {
                lines.push(`│  Files not in manifest: ${notInManifest.length}`);
                for (const r of notInManifest.slice(0, topN)) {
                    lines.push(`│    • ${r.kind} — ${r.moduleName}/${r.moduleRelativePath}`);
                }
                if (notInManifest.length > topN)
                    lines.push(`│    • ...and ${notInManifest.length - topN} more`);
            }
            if (noFileFound.length) {
                lines.push(`│  Files not found (in manifest but missing on disk): ${noFileFound.length}`);
                for (const r of noFileFound.slice(0, topN)) {
                    lines.push(`│    • ${r.kind} — ${r.moduleName}/${r.moduleRelativePath}`);
                }
                if (noFileFound.length > topN)
                    lines.push(`│    • ...and ${noFileFound.length - topN} more`);
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