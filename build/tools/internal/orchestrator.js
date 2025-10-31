/**
 * Unified BMAD Tool orchestrator.
 * Thin class delegating to parser, validators, loaders, and tools.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ManifestLoader } from '../../utils/manifest-loader.js';
import { FileReader } from '../../utils/file-reader.js';
import { loadAgent as loadAgentPayload } from './agent-loader.js';
import { executeWorkflow as executeWorkflowPayload } from './workflow-executor.js';
import { doctor as doctorReport } from '../doctor.js';
import { handleInit as initHandler } from '../init.js';
import { parseCommand } from './parser.js';
import { validateName as validateInputName } from './validators.js';
import logger from '../../utils/logger.js';
import { resolveAvailableCatalog } from '../../utils/availability-resolver.js';
export class UnifiedBMADTool {
    bmadRoot;
    manifestLoader;
    fileReader;
    agents;
    workflows;
    discovery;
    userBmadPath;
    projectRoot;
    manifestDir;
    masterService;
    constructor(options) {
        const { bmadRoot, discovery, masterManifestService } = options;
        this.discovery = discovery;
        this.masterService = masterManifestService;
        this.userBmadPath = discovery.userBmadPath;
        this.projectRoot = discovery.projectRoot;
        const debug = process.env.BMAD_DEBUG === '1' || process.env.BMAD_DEBUG === 'true';
        this.bmadRoot = path.resolve(bmadRoot);
        const manifestLocation = discovery.locations.find((loc) => loc.status === 'valid' && loc.manifestDir);
        let manifestRoot;
        let manifestDir;
        if (manifestLocation?.manifestDir) {
            manifestRoot = manifestLocation.resolvedRoot ?? bmadRoot;
            manifestDir = manifestLocation.manifestDir;
        }
        else {
            manifestRoot = bmadRoot;
            manifestDir = path.join(bmadRoot, '_cfg');
        }
        this.manifestDir = manifestDir;
        this.manifestLoader = new ManifestLoader(manifestRoot);
        const validRoots = [];
        if (debug) {
            logger.debug(`\nBuilding FileReader fallback chain...`);
            logger.debug(`Total discovered locations: ${discovery.locations.length}`);
        }
        const allLocations = [...discovery.locations].sort((a, b) => a.priority - b.priority);
        if (debug) {
            for (const loc of allLocations) {
                const defined = loc.source === 'project' ? 'no' : loc.originalPath ? 'yes' : 'no';
                const probePath = loc.resolvedRoot ?? loc.originalPath;
                let exists = 'no';
                try {
                    exists = probePath && fs.existsSync(probePath) ? 'yes' : 'no';
                }
                catch {
                    exists = 'no';
                }
                const bmStatus = loc.manifestDir
                    ? 'valid'
                    : exists === 'yes'
                        ? 'invalid'
                        : loc.status;
                const included = loc.manifestDir ? loc.manifestDir : '—';
                logger.debug(`  - ${loc.displayName}: defined=${defined}, exists=${exists}, status=${bmStatus}, included=${included}`);
            }
        }
        const sortedLocations = allLocations
            .filter((loc) => loc.status === 'valid' && loc.manifestDir)
            .sort((a, b) => a.priority - b.priority);
        if (debug) {
            logger.debug(`Locations with manifestDir: ${sortedLocations.length}\n`);
        }
        for (const location of sortedLocations) {
            const root = location.resolvedRoot ?? location.originalPath;
            if (root && !validRoots.includes(root)) {
                validRoots.push(root);
            }
        }
        if (debug) {
            logger.debug(`FileReader fallback chain (${validRoots.length} locations):`);
            validRoots.forEach((root, idx) => {
                const location = discovery.locations.find((loc) => loc.resolvedRoot === root || loc.originalPath === root);
                const source = location?.displayName ?? 'Package';
                const status = location ? ` [${location.status}]` : '';
                logger.debug(`  ${idx + 1}. ${source}${status}: ${root}`);
            });
        }
        this.fileReader = new FileReader(validRoots);
        this.agents = this.manifestLoader.loadAgentManifest();
        this.workflows = this.manifestLoader.loadWorkflowManifest();
        logger.error(`UnifiedBMADTool initialized with ${this.agents.length} agents and ${this.workflows.length} workflows`);
    }
    execute(command) {
        const normalized = command.trim();
        if (!normalized) {
            logger.info('Empty command, loading bmad-master (default)');
            return this.loadAgent('bmad-master');
        }
        if (normalized === '*doctor' || normalized.startsWith('*doctor ')) {
            return doctorReport(normalized, {
                discovery: this.discovery,
                projectRoot: this.projectRoot,
                bmadRoot: this.bmadRoot,
                userBmadPath: this.userBmadPath,
                masterManifestService: this.masterService,
            });
        }
        if (normalized.startsWith('*init')) {
            logger.info('Initialization command received');
            return initHandler(normalized, {
                projectRoot: this.projectRoot,
                userBmadPath: this.userBmadPath,
            });
        }
        // Listing commands (handled before general parsing)
        if (normalized === '*list-agents' ||
            normalized === '*list-workflows' ||
            normalized === '*list-tasks' ||
            normalized === '*list-modules' ||
            normalized.startsWith('*export-master-manifest')) {
            return this.handleListCommand(normalized);
        }
        const parsedCommand = parseCommand(normalized, this.workflows);
        if (parsedCommand.type === 'error') {
            return this.formatErrorResponse(parsedCommand.validation);
        }
        const validation = validateInputName(parsedCommand.name, parsedCommand.type, this.agents, this.workflows);
        if (!validation.valid) {
            return this.formatErrorResponse(validation);
        }
        if (parsedCommand.type === 'workflow') {
            return this.executeWorkflow(parsedCommand.name);
        }
        else {
            return this.loadAgent(parsedCommand.name);
        }
    }
    handleListCommand(cmd) {
        if (!this.masterService) {
            return {
                success: false,
                exitCode: 1,
                error: 'Master manifest service not available',
            };
        }
        const master = this.masterService.get();
        const activeRoot = this.discovery.activeLocation.resolvedRoot ?? this.discovery.activeLocation.originalPath;
        const resolved = resolveAvailableCatalog(master, { scope: 'active-only', activeRoot: activeRoot ?? undefined });
        const lines = [];
        if (cmd === '*list-agents') {
            const items = resolved.agents
                .filter((r) => r.kind === 'agent')
                .filter((r) => {
                const name = (r.name || '').toString().toLowerCase();
                const path = (r.moduleRelativePath || '').toString().toLowerCase();
                return name !== 'readme' && !path.endsWith('/readme.md');
            })
                .map((r) => {
                const name = r.name ?? r.moduleRelativePath;
                const desc = r.description || r.displayName;
                return desc ? `${name} — ${desc}` : `${name}`;
            })
                .sort((a, b) => a.localeCompare(b));
            // Group by module
            lines.push('Agents (available)');
            const byModule = new Map();
            for (const r of resolved.agents.filter((x) => x.kind === 'agent')) {
                const nm = (r.name || '').toString().toLowerCase();
                const pth = (r.moduleRelativePath || '').toString().toLowerCase();
                if (nm === 'readme' || pth.endsWith('/readme.md'))
                    continue;
                const labelName = r.name ?? r.moduleRelativePath;
                const desc = r.description || r.displayName;
                const label = desc ? `${labelName} — ${desc}` : `${labelName}`;
                const list = byModule.get(r.moduleName) ?? [];
                list.push(label);
                byModule.set(r.moduleName, list);
            }
            for (const mod of Array.from(byModule.keys()).sort()) {
                lines.push(`Module: ${mod}`);
                for (const item of byModule.get(mod).sort((a, b) => a.localeCompare(b))) {
                    lines.push(`- ${item}`);
                }
            }
            return { success: true, type: 'list', listType: 'agents', count: items.length, content: lines.join('\n'), exitCode: 0 };
        }
        // Grouped by module: workflows
        if (cmd === '*list-workflows') {
            lines.push('Workflows (available)');
            const byModule = new Map();
            for (const r of resolved.workflows.filter((x) => x.kind === 'workflow')) {
                const label = r.name ?? r.moduleRelativePath;
                const list = byModule.get(r.moduleName) ?? [];
                list.push(label);
                byModule.set(r.moduleName, list);
            }
            for (const mod of Array.from(byModule.keys()).sort()) {
                lines.push(`Module: ${mod}`);
                for (const item of byModule.get(mod).sort((a, b) => a.localeCompare(b))) {
                    lines.push(`- ${item}`);
                }
            }
            return { success: true, type: 'list', listType: 'workflows', count: resolved.workflows.length, content: lines.join('\n'), exitCode: 0 };
        }
        if (cmd === '*list-workflows') {
            const items = resolved.workflows.filter((r) => r.kind === 'workflow').map((r) => r.name ?? r.moduleRelativePath).sort();
            lines.push('Workflows (available)');
            items.forEach((n) => lines.push(`- ${n}`));
            return { success: true, type: 'list', listType: 'workflows', count: items.length, content: lines.join('\n'), exitCode: 0 };
        }
        // Grouped by module: tasks
        if (cmd === '*list-tasks') {
            lines.push('Tasks (available)');
            const byModuleTasks = new Map();
            for (const r of resolved.tasks.filter((x) => x.kind === 'task')) {
                const label = r.name ?? r.moduleRelativePath;
                const list = byModuleTasks.get(r.moduleName) ?? [];
                list.push(label);
                byModuleTasks.set(r.moduleName, list);
            }
            for (const mod of Array.from(byModuleTasks.keys()).sort()) {
                lines.push(`Module: ${mod}`);
                for (const item of byModuleTasks.get(mod).sort((a, b) => a.localeCompare(b))) {
                    lines.push(`- ${item}`);
                }
            }
            return { success: true, type: 'list', listType: 'tasks', count: resolved.tasks.length, content: lines.join('\n'), exitCode: 0 };
        }
        if (cmd === '*list-tasks') {
            const items = resolved.tasks.filter((r) => r.kind === 'task').map((r) => r.name ?? r.moduleRelativePath).sort();
            lines.push('Tasks (available)');
            items.forEach((n) => lines.push(`- ${n}`));
            return { success: true, type: 'list', listType: 'tasks', count: items.length, content: lines.join('\n'), exitCode: 0 };
        }
        // Table of modules with counts per module (available, active origin)
        if (cmd === '*list-modules') {
            const origin = (this.discovery.activeLocation.source || 'unknown');
            const byModule = new Map();
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
        if (cmd === '*list-modules') {
            const mods = new Map();
            for (const m of master.modules) {
                const key = `${m.name} @ ${m.origin.kind}`;
                mods.set(key, (mods.get(key) ?? 0) + 1);
            }
            lines.push('Modules (detected)');
            Array.from(mods.keys()).sort().forEach((k) => lines.push(`- ${k}`));
            return { success: true, type: 'list', listType: 'modules', count: mods.size, content: lines.join('\n'), exitCode: 0 };
        }
        if (cmd.startsWith('*export-master-manifest')) {
            const parts = cmd.split(' ').filter(Boolean);
            const target = parts[1] || 'master-manifest.json';
            try {
                const fs = require('node:fs');
                fs.writeFileSync(target, JSON.stringify(master, null, 2), 'utf-8');
                return { success: true, type: 'list', listType: 'dump', content: `Master manifest written to ${target}`, exitCode: 0 };
            }
            catch (e) {
                return { success: false, exitCode: 1, error: `Failed to write file: ${e?.message || String(e)}` };
            }
        }
        return { success: false, exitCode: 1, error: 'Unknown list command' };
    }
    resolveAgentAlias(name) {
        // alias resolution is handled inside registry; keep log here if changed
        return name;
    }
    loadAgent(agentName) {
        const canonicalName = agentName; // alias resolution is inside registry/validators
        logger.info(`Loading agent: ${canonicalName}${canonicalName !== agentName ? ` (from alias: ${agentName})` : ''}`);
        return loadAgentPayload({ agentName: canonicalName, agents: this.agents, fileReader: this.fileReader });
    }
    executeWorkflow(workflowName) {
        logger.info(`Executing workflow: ${workflowName}`);
        return executeWorkflowPayload({
            workflowName,
            workflows: this.workflows,
            fileReader: this.fileReader,
            buildWorkflowContext: () => this.buildWorkflowContext(),
        });
    }
    formatErrorResponse(validation) {
        return {
            success: false,
            errorCode: validation.errorCode,
            error: validation.errorMessage,
            suggestions: validation.suggestions,
            exitCode: validation.exitCode,
        };
    }
    buildWorkflowContext() {
        return {
            bmadServerRoot: this.bmadRoot,
            projectRoot: this.bmadRoot,
            mcpResources: this.bmadRoot,
            agentManifestPath: path.join(this.manifestDir, 'agent-manifest.csv'),
            agentManifestData: this.agents,
            agentCount: this.agents.length,
        };
    }
}
//# sourceMappingURL=orchestrator.js.map