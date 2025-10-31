import fs from 'node:fs';
import path from 'node:path';
import { ManifestLoader } from '../../utils/manifest-loader.js';
import { FileScanner } from '../../utils/file-scanner.js';
import { detectBmadSource } from '../../utils/bmad-source-detector.js';
import { resolveBmadPaths } from '../../utils/bmad-path-resolver.js';
export function doctor(command, ctx) {
    const parts = command.split(' ').slice(1);
    const full = parts.includes('--full');
    const pathArg = parts.find((p) => p && !p.startsWith('--'));
    const localDiscovery = pathArg
        ? resolveBmadPaths({
            cwd: ctx.projectRoot,
            cliArg: pathArg,
            envVar: undefined,
            userBmadPath: ctx.userBmadPath,
        })
        : ctx.discovery;
    const active = localDiscovery.activeLocation;
    const root = active.resolvedRoot ?? active.originalPath ?? ctx.bmadRoot;
    const v6Root = path.basename(root) === 'bmad' ? root : path.join(root, 'bmad');
    const v6Cfg = path.join(v6Root, '_cfg');
    const hasV6 = (() => {
        try {
            return fs.existsSync(v6Cfg) && fs.statSync(v6Cfg).isDirectory();
        }
        catch {
            return false;
        }
    })();
    const v4DirDirect = path.basename(root) === '.bmad' ? root : undefined;
    const v4DirChild = path.join(root, '.bmad');
    const coreDirDirect = path.basename(root) === '.bmad-core' ? root : undefined;
    const coreDirChild = path.join(root, '.bmad-core');
    const hasV4DirDirect = (() => {
        try {
            return !!(v4DirDirect && fs.existsSync(v4DirDirect) && fs.statSync(v4DirDirect).isDirectory());
        }
        catch {
            return false;
        }
    })();
    const hasV4DirChild = (() => {
        try {
            return fs.existsSync(v4DirChild) && fs.statSync(v4DirChild).isDirectory();
        }
        catch {
            return false;
        }
    })();
    const hasCoreDirDirect = (() => {
        try {
            return !!(coreDirDirect && fs.existsSync(coreDirDirect) && fs.statSync(coreDirDirect).isDirectory());
        }
        catch {
            return false;
        }
    })();
    const hasCoreDirChild = (() => {
        try {
            return fs.existsSync(coreDirChild) && fs.statSync(coreDirChild).isDirectory();
        }
        catch {
            return false;
        }
    })();
    let v6Counts;
    if (hasV6) {
        try {
            const loader = new ManifestLoader(v6Root);
            v6Counts = {
                agents: loader.loadAgentManifest().length,
                workflows: loader.loadWorkflowManifest().length,
                tasks: loader.loadTaskManifest().length,
            };
        }
        catch {
            // ignore
        }
    }
    const relPath = path.relative(ctx.projectRoot, root) || '.';
    const lines = [];
    lines.push('╭─────────────────────────────────────────────────────────────╮');
    lines.push('│          🏥 BMAD Health Diagnostic                          │');
    lines.push('╰─────────────────────────────────────────────────────────────╯');
    lines.push('');
    lines.push('┌─ Active Configuration ─────────────────────────────────────┐');
    if (hasV6) {
        const v6Info = detectBmadSource(v6Root);
        lines.push('│  Type: v6');
        if (v6Info && v6Info.version)
            lines.push(`│  Version: ${v6Info.version}`);
        const pathLine = relPath;
        lines.push(`│  Path: ${pathLine}`);
    }
    else if (hasV4DirDirect || hasCoreDirDirect || hasV4DirChild || hasCoreDirChild) {
        const isDotBmad = hasV4DirDirect || hasV4DirChild;
        lines.push(`│  Type: v4 (${isDotBmad ? '.bmad' : '.bmad-core'})`);
        const pathLine = relPath;
        lines.push(`│  Path: ${pathLine}`);
    }
    else {
        lines.push('│  Type: unknown');
        const pathLine = relPath;
        lines.push(`│  Path: ${pathLine}`);
    }
    lines.push('└────────────────────────────────────────────────────────────┘');
    lines.push('');
    if (hasV6) {
        if (full) {
            try {
                const loader = new ManifestLoader(v6Root);
                const agents = loader.loadAgentManifest();
                const workflows = loader.loadWorkflowManifest();
                const tasks = loader.loadTaskManifest();
                const moduleSet = new Set();
                agents.forEach((a) => moduleSet.add(a.module));
                workflows.forEach((w) => moduleSet.add(w.module));
                tasks.forEach((t) => moduleSet.add(t.module));
                const modules = Array.from(moduleSet).sort();
                lines.push('┌─ Available Resources ──────────────────────────────────────┐');
                for (const mod of modules) {
                    const modAgents = agents
                        .filter((a) => a.module === mod)
                        .map((a) => a.name)
                        .sort();
                    const modWorkflows = workflows
                        .filter((w) => w.module === mod)
                        .map((w) => w.name)
                        .sort();
                    const modTasks = tasks
                        .filter((t) => t.module === mod)
                        .map((t) => t.name)
                        .sort();
                    lines.push(`│  Module: ${mod}`);
                    lines.push('│    Agents:');
                    if (modAgents.length === 0) {
                        lines.push('│      - (none)');
                    }
                    else {
                        for (const name of modAgents)
                            lines.push(`│      - ${name}`);
                    }
                    lines.push('│    Workflows:');
                    if (modWorkflows.length === 0) {
                        lines.push('│      - (none)');
                    }
                    else {
                        for (const name of modWorkflows)
                            lines.push(`│      - ${name}`);
                    }
                    lines.push('│    Tasks:');
                    if (modTasks.length === 0) {
                        lines.push('│      - (none)');
                    }
                    else {
                        for (const name of modTasks)
                            lines.push(`│      - ${name}`);
                    }
                }
                lines.push('└────────────────────────────────────────────────────────────┘');
                lines.push('');
                // Orphaned resources by module
                try {
                    const agentSet = new Set(agents.map((a) => a.name));
                    const workflowSet = new Set(workflows.map((w) => w.name));
                    const taskSet = new Set(tasks.map((t) => t.name));
                    const scanner = new FileScanner(v6Root);
                    const scan = scanner.scan();
                    const orphanByModule = new Map();
                    function getModuleForPath(p) {
                        const first = (p || '').split(/[\\\/]/)[0];
                        if (first === 'agents' || first === 'workflows' || first === 'tasks' || first === '')
                            return 'root';
                        return first;
                    }
                    for (const f of scan.agents) {
                        if (!agentSet.has(f.name)) {
                            const mod = getModuleForPath(f.path);
                            if (!orphanByModule.has(mod))
                                orphanByModule.set(mod, { agents: [], workflows: [], tasks: [] });
                            orphanByModule.get(mod).agents.push(f.name);
                        }
                    }
                    for (const f of scan.workflows) {
                        if (!workflowSet.has(f.name)) {
                            const mod = getModuleForPath(f.path);
                            if (!orphanByModule.has(mod))
                                orphanByModule.set(mod, { agents: [], workflows: [], tasks: [] });
                            orphanByModule.get(mod).workflows.push(f.name);
                        }
                    }
                    for (const f of scan.tasks) {
                        if (!taskSet.has(f.name)) {
                            const mod = getModuleForPath(f.path);
                            if (!orphanByModule.has(mod))
                                orphanByModule.set(mod, { agents: [], workflows: [], tasks: [] });
                            orphanByModule.get(mod).tasks.push(f.name);
                        }
                    }
                    const hasOrphans = Array.from(orphanByModule.values()).some((g) => g.agents.length || g.workflows.length || g.tasks.length);
                    if (hasOrphans) {
                        lines.push('┌─ Orphaned Resources Detected ──────────────────────────────┐');
                        for (const [mod, groups] of Array.from(orphanByModule.entries()).sort(([a], [b]) => a.localeCompare(b))) {
                            if (groups.agents.length || groups.workflows.length || groups.tasks.length) {
                                lines.push(`│  Module: ${mod}`);
                                if (groups.agents.length) {
                                    lines.push('│    Agents:');
                                    for (const name of groups.agents.sort())
                                        lines.push(`│      - ${name}`);
                                }
                                if (groups.workflows.length) {
                                    lines.push('│    Workflows:');
                                    for (const name of groups.workflows.sort())
                                        lines.push(`│      - ${name}`);
                                }
                                if (groups.tasks.length) {
                                    lines.push('│    Tasks:');
                                    for (const name of groups.tasks.sort())
                                        lines.push(`│      - ${name}`);
                                }
                            }
                        }
                        lines.push('└────────────────────────────────────────────────────────────┘');
                        lines.push('');
                    }
                }
                catch {
                    // ignore orphaned errors
                }
            }
            catch {
                // ignore module listing errors
            }
        }
    }
    else if (hasV4DirDirect || hasCoreDirDirect || hasV4DirChild || hasCoreDirChild) {
        const v4Base = (hasV4DirDirect ? v4DirDirect : hasCoreDirDirect ? coreDirDirect : hasV4DirChild ? v4DirChild : coreDirChild);
        const info = detectBmadSource(v4Base);
        lines.push('🧰 v4 Installation');
        if (info.version)
            lines.push(`- Version: ${info.version}`);
        if (info.manifestPath)
            lines.push(`- Install manifest: ${info.manifestPath}`);
        if (full && info.expansionPacks && info.expansionPacks.length > 0) {
            lines.push('- Expansion packs:');
            for (const pack of info.expansionPacks)
                lines.push(`  • ${pack}`);
        }
        lines.push('');
    }
    else {
        lines.push('⚠️  No BMAD installation detected at the provided path.');
    }
    if (!full) {
        if (hasV6 && v6Counts) {
            lines.push('┌─ Available Resources ──────────────────────────────────────┐');
            lines.push(`│  Agents: ${v6Counts.agents}`);
            lines.push(`│  Workflows: ${v6Counts.workflows}`);
            lines.push(`│  Tasks: ${v6Counts.tasks}`);
            lines.push('└────────────────────────────────────────────────────────────┘');
            lines.push('');
            try {
                const loader = new ManifestLoader(v6Root);
                const agentSet = new Set(loader.loadAgentManifest().map((a) => a.name).filter(Boolean));
                const workflowSet = new Set(loader.loadWorkflowManifest().map((w) => w.name).filter(Boolean));
                const taskSet = new Set(loader.loadTaskManifest().map((t) => t.name).filter(Boolean));
                const scanner = new FileScanner(v6Root);
                const scan = scanner.scan();
                const orphanedAgents = scan.agents.filter((f) => !agentSet.has(f.name)).length;
                const orphanedWorkflows = scan.workflows.filter((f) => !workflowSet.has(f.name)).length;
                const orphanedTasks = scan.tasks.filter((f) => !taskSet.has(f.name)).length;
                if (orphanedAgents > 0 || orphanedWorkflows > 0 || orphanedTasks > 0) {
                    lines.push('┌─ Orphaned Resources Detected ──────────────────────────────┐');
                    if (orphanedAgents > 0)
                        lines.push(`│  Agents: ${orphanedAgents}`);
                    if (orphanedWorkflows > 0)
                        lines.push(`│  Workflows: ${orphanedWorkflows}`);
                    if (orphanedTasks > 0)
                        lines.push(`│  Tasks: ${orphanedTasks}`);
                    lines.push('└────────────────────────────────────────────────────────────┘');
                    lines.push('');
                }
            }
            catch {
                // ignore orphaned detection errors
            }
        }
        lines.push('To view detailed diagnostics, run: bmad *doctor --full');
    }
    return {
        success: true,
        type: 'diagnostic',
        content: lines.join('\n'),
        exitCode: 0,
    };
}
//# sourceMappingURL=doctor.js.map