/**
 * Multi-Source BMAD Loader
 *
 * Loads agents and workflows from multiple BMAD installations (v6 and v4)
 * with conflict detection and first-source-wins resolution.
 */
import path from 'node:path';
import fs from 'node:fs';
import { detectBmadSource } from './bmad-source-detector.js';
/**
 * Multi-source BMAD loader with conflict detection
 */
export class MultiSourceLoader {
    sources = [];
    agentConflicts = new Map();
    workflowConflicts = new Map();
    includeInvalid;
    constructor(config) {
        this.includeInvalid = config.includeInvalid ?? false;
        this.initializeSources(config.sources);
    }
    initializeSources(sourcePaths) {
        sourcePaths.forEach((sourcePath, index) => {
            const detection = detectBmadSource(sourcePath);
            if (detection.isValid) {
                this.sources.push({
                    path: detection.path,
                    type: detection.type,
                    version: detection.version,
                    priority: index,
                    isValid: true,
                    modules: detection.modules,
                    expansionPacks: detection.expansionPacks,
                });
            }
            else if (this.includeInvalid) {
                // Include invalid sources in report if requested
                this.sources.push({
                    path: detection.path,
                    type: detection.type,
                    priority: index,
                    isValid: false,
                    error: detection.error,
                });
            }
        });
    }
    /**
     * Get the number of valid sources
     */
    getSourceCount() {
        return this.sources.filter((s) => s.isValid).length;
    }
    /**
     * Get detailed information about all sources
     */
    getSourceInfo() {
        if (this.includeInvalid) {
            return [...this.sources];
        }
        return this.sources.filter((s) => s.isValid);
    }
    /**
     * Load agents from all sources with conflict detection
     */
    loadAgents() {
        const agents = [];
        const seenNames = new Set();
        this.agentConflicts.clear();
        for (const source of this.sources.filter((s) => s.isValid)) {
            const sourceAgents = this.loadAgentsFromSource(source);
            for (const agent of sourceAgents) {
                if (seenNames.has(agent.name)) {
                    // Conflict detected - track it
                    this.trackConflict('agent', agent.name, source);
                }
                else {
                    // First occurrence wins
                    seenNames.add(agent.name);
                    agents.push(agent);
                }
            }
        }
        return agents;
    }
    /**
     * Load workflows from all sources with conflict detection
     */
    loadWorkflows() {
        const workflows = [];
        const seenNames = new Set();
        this.workflowConflicts.clear();
        for (const source of this.sources.filter((s) => s.isValid)) {
            const sourceWorkflows = this.loadWorkflowsFromSource(source);
            for (const workflow of sourceWorkflows) {
                if (seenNames.has(workflow.name)) {
                    // Conflict detected - track it
                    this.trackConflict('workflow', workflow.name, source);
                }
                else {
                    // First occurrence wins
                    seenNames.add(workflow.name);
                    workflows.push(workflow);
                }
            }
        }
        return workflows;
    }
    /**
     * Get conflict report
     */
    getConflicts() {
        return {
            agents: Array.from(this.agentConflicts.values()),
            workflows: Array.from(this.workflowConflicts.values()),
        };
    }
    /**
     * Load agents from a specific source
     */
    loadAgentsFromSource(source) {
        if (source.type === 'v6') {
            return this.loadV6Agents(source);
        }
        else if (source.type === 'v4') {
            return this.loadV4Agents(source);
        }
        return [];
    }
    /**
     * Load workflows from a specific source
     */
    loadWorkflowsFromSource(source) {
        if (source.type === 'v6') {
            return this.loadV6Workflows(source);
        }
        else if (source.type === 'v4') {
            return this.loadV4Workflows(source);
        }
        return [];
    }
    /**
     * Load agents from v6 structure
     */
    loadV6Agents(source) {
        const agents = [];
        const manifestPath = path.join(source.path, '_cfg', 'agent-manifest.csv');
        if (!fs.existsSync(manifestPath)) {
            return agents;
        }
        try {
            const content = fs.readFileSync(manifestPath, 'utf-8');
            const lines = content.split('\n').filter((line) => line.trim());
            // Skip header
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line)
                    continue;
                const parts = line.split(',');
                if (parts.length < 5)
                    continue;
                const name = parts[0];
                const displayName = parts[1];
                const description = parts[2];
                const module = parts[3];
                const agentPath = parts[4];
                agents.push({
                    name,
                    displayName: displayName || undefined,
                    description: description || undefined,
                    module: module || undefined,
                    path: agentPath,
                    source,
                });
            }
        }
        catch (error) {
            // Ignore errors - return empty array
        }
        return agents;
    }
    /**
     * Load agents from v4 structure
     */
    loadV4Agents(source) {
        const agents = [];
        const agentsDir = path.join(source.path, 'agents');
        if (!fs.existsSync(agentsDir)) {
            return agents;
        }
        try {
            const files = fs.readdirSync(agentsDir);
            for (const file of files) {
                if (!file.endsWith('.md'))
                    continue;
                const name = path.basename(file, '.md');
                const filePath = path.join(agentsDir, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    // Parse frontmatter for displayName
                    let displayName;
                    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                    if (frontmatterMatch) {
                        const titleMatch = frontmatterMatch[1].match(/title:\s*(.+)/);
                        if (titleMatch) {
                            displayName = titleMatch[1].trim();
                        }
                    }
                    agents.push({
                        name,
                        displayName,
                        path: `agents/${file}`,
                        source,
                    });
                }
                catch (error) {
                    // Skip files that can't be read
                }
            }
        }
        catch (error) {
            // Ignore errors - return empty array
        }
        return agents;
    }
    /**
     * Load workflows from v6 structure
     */
    loadV6Workflows(source) {
        const workflows = [];
        const manifestPath = path.join(source.path, '_cfg', 'workflow-manifest.csv');
        if (!fs.existsSync(manifestPath)) {
            return workflows;
        }
        try {
            const content = fs.readFileSync(manifestPath, 'utf-8');
            const lines = content.split('\n').filter((line) => line.trim());
            // Skip header
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line)
                    continue;
                const parts = line.split(',');
                if (parts.length < 4)
                    continue;
                const name = parts[0];
                const description = parts[1];
                const module = parts[2];
                const workflowPath = parts[3];
                workflows.push({
                    name,
                    description: description || undefined,
                    module: module || undefined,
                    path: workflowPath,
                    source,
                });
            }
        }
        catch (error) {
            // Ignore errors - return empty array
        }
        return workflows;
    }
    /**
     * Load workflows from v4 structure
     */
    loadV4Workflows(source) {
        const workflows = [];
        const workflowsDir = path.join(source.path, 'workflows');
        if (!fs.existsSync(workflowsDir)) {
            return workflows;
        }
        try {
            const dirs = fs.readdirSync(workflowsDir, { withFileTypes: true });
            for (const dir of dirs) {
                if (!dir.isDirectory())
                    continue;
                const name = dir.name;
                const workflowXmlPath = path.join(workflowsDir, name, 'workflow.xml');
                if (fs.existsSync(workflowXmlPath)) {
                    workflows.push({
                        name,
                        path: `workflows/${name}/workflow.xml`,
                        source,
                    });
                }
            }
        }
        catch (error) {
            // Ignore errors - return empty array
        }
        return workflows;
    }
    /**
     * Track a conflict when duplicate name is found
     */
    trackConflict(type, name, conflictingSource) {
        const conflictMap = type === 'agent' ? this.agentConflicts : this.workflowConflicts;
        let conflict = conflictMap.get(name);
        if (!conflict) {
            // Find the winning source (the first one that had this name)
            const winningSource = this.findWinningSource(type, name);
            if (!winningSource)
                return;
            conflict = {
                name,
                type,
                winningSource,
                conflictingSources: [],
            };
            conflictMap.set(name, conflict);
        }
        // Add this source to the conflict list if not already there
        if (!conflict.conflictingSources.some((s) => s.path === conflictingSource.path)) {
            conflict.conflictingSources.push(conflictingSource);
        }
    }
    /**
     * Find the winning source for a given name (first occurrence)
     */
    findWinningSource(type, name) {
        for (const source of this.sources.filter((s) => s.isValid)) {
            const items = type === 'agent'
                ? this.loadAgentsFromSource(source)
                : this.loadWorkflowsFromSource(source);
            if (items.some((item) => item.name === name)) {
                return source;
            }
        }
        return undefined;
    }
}
//# sourceMappingURL=multi-source-loader.js.map