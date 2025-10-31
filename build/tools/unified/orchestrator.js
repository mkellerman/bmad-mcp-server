/**
 * Unified BMAD Tool orchestrator.
 * Thin class delegating to parser, validators, loaders, and tools.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ManifestLoader } from '../../utils/manifest-loader.js';
import { FileReader } from '../../utils/file-reader.js';
import { loadAgent as loadAgentPayload } from '../internal/agent-loader.js';
import { executeWorkflow as executeWorkflowPayload } from '../internal/workflow-executor.js';
import { doctor as doctorReport } from '../doctor.js';
import { handleInit as initHandler } from '../init.js';
import { parseCommand } from '../internal/parser.js';
import { validateName as validateInputName } from '../internal/validators.js';
import logger from '../../utils/logger.js';
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
    constructor(options) {
        const { bmadRoot, discovery } = options;
        this.discovery = discovery;
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
            });
        }
        if (normalized.startsWith('*init')) {
            logger.info('Initialization command received');
            return initHandler(normalized, {
                projectRoot: this.projectRoot,
                userBmadPath: this.userBmadPath,
            });
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