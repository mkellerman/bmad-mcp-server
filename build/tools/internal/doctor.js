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
    // Header
    lines.push('# 🏥 BMAD Health Diagnostic\n');
    // Installation Discovery
    lines.push('## 📍 Installation Discovery\n');
    const activeLocation = localDiscovery.locations.find(loc => loc.status === 'valid');
    if (activeLocation) {
        const v6info = detectV6(v6Root);
        const versionStr = v6info?.installationVersion ? `v${v6info.installationVersion}` : active.version || 'unknown';
        lines.push(`✅ **Active Location:** ${relPath} (${activeLocation.displayName})`);
        lines.push(`- **Version:** ${versionStr}`);
        lines.push(`- **Format:** ${active.version === 'v6' ? 'Modern modular structure' : active.version === 'v4' ? 'Legacy dotfolder structure' : 'Custom installation'}`);
        lines.push(`- **Status:** All systems operational\n`);
    }
    else {
        lines.push('⚠️ **No active installation found**\n');
    }
    // Show all searched locations in a clean table format
    lines.push('**Searched Locations:**\n');
    for (const location of localDiscovery.locations) {
        const statusIcon = location.status === 'valid'
            ? '✅'
            : location.status === 'missing'
                ? '⚠️'
                : location.status === 'not-found'
                    ? '✗'
                    : '❌';
        const displayPath = location.resolvedRoot || location.originalPath || '(not provided)';
        const relDisplayPath = path.relative(ctx.projectRoot, displayPath);
        const shortPath = relDisplayPath && relDisplayPath.length < displayPath.length
            ? relDisplayPath
            : displayPath;
        // Build the detail string on the same line
        let detail = '';
        if (location.status === 'valid') {
            if (location.manifestDir) {
                detail = ` — _cfg/manifest.yaml (${location.version})`;
            }
            else if (location.manifestPath && location.version === 'v4') {
                detail = ` — install-manifest.yaml (${location.version})`;
            }
            else if (location.version === 'unknown') {
                detail = ` — agents/ or workflows/ (custom)`;
            }
        }
        else {
            const reason = location.details ||
                (location.status === 'not-found' ? 'Not found' :
                    location.status === 'missing' ? 'Missing required files' :
                        'Invalid');
            detail = ` — ${reason}`;
        }
        lines.push(`${statusIcon} **${location.displayName}:** \`${shortPath}\`${detail}`);
    }
    lines.push('');
    lines.push('---\n');
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
        const verifiedAgents = totalAgents - notInManifestAgents - noFileFoundAgents;
        const verifiedWorkflows = totalWorkflows - notInManifestWorkflows - noFileFoundWorkflows;
        const verifiedTasks = totalTasks - notInManifestTasks - noFileFoundTasks;
        // Inventory Summary
        lines.push('## 📊 Resource Inventory\n');
        lines.push('| Resource  | Available | Untracked | Missing | Status |');
        lines.push('|-----------|-----------|-----------|---------|--------|');
        const agentStatus = noFileFoundAgents > 0 ? '⚠️' : '✅';
        const workflowStatus = noFileFoundWorkflows > 0 ? '⚠️' : '✅';
        const taskStatus = noFileFoundTasks > 0 ? '⚠️' : '✅';
        lines.push(`| Agents    | ${verifiedAgents} | ${notInManifestAgents} | ${noFileFoundAgents} | ${agentStatus} |`);
        lines.push(`| Workflows | ${verifiedWorkflows} | ${notInManifestWorkflows} | ${noFileFoundWorkflows} | ${workflowStatus} |`);
        lines.push(`| Tasks     | ${verifiedTasks} | ${notInManifestTasks} | ${noFileFoundTasks} | ${taskStatus} |\n`);
        lines.push('**Legend:**');
        lines.push('- **Available:** Verified and ready to use');
        lines.push('- **Untracked:** Found on disk but not in manifest');
        lines.push('- **Missing:** Listed in manifest but file not found\n');
        lines.push('---\n');
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
            lines.push('## ⚠️ Issues Detected\n');
            if (notInManifest.length) {
                lines.push(`**Untracked Files:** ${notInManifest.length} files found on disk but not in manifest\n`);
                for (const r of notInManifest.slice(0, topN)) {
                    lines.push(`- ${r.kind} — \`${r.moduleName}/${r.moduleRelativePath}\``);
                }
                if (notInManifest.length > topN)
                    lines.push(`- ...and ${notInManifest.length - topN} more\n`);
                else
                    lines.push('');
            }
            if (noFileFound.length) {
                lines.push(`**Missing Files:** ${noFileFound.length} files listed in manifest but not found on disk\n`);
                for (const r of noFileFound.slice(0, topN)) {
                    lines.push(`- ${r.kind} — \`${r.moduleName}/${r.moduleRelativePath}\``);
                }
                if (noFileFound.length > topN)
                    lines.push(`- ...and ${noFileFound.length - topN} more\n`);
                else
                    lines.push('');
            }
            lines.push('---\n');
        }
    }
    else {
        lines.push('⚠️ **Master manifest service is not available.**\n');
    }
    // Next Steps
    lines.push('## 💡 Next Steps\n');
    lines.push('- View all agents: `*list-agents`');
    lines.push('- Check workflows: `*list-workflows`');
    lines.push('- View tasks: `*list-tasks`');
    lines.push('- Module overview: `*list-modules`');
    return {
        success: true,
        type: 'diagnostic',
        content: lines.join('\n'),
        exitCode: 0,
    };
}
export default doctor;
//# sourceMappingURL=doctor.js.map