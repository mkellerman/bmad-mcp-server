/**
 * File Scanner - Discover BMAD assets by scanning the filesystem.
 *
 * Scans directories for agent, workflow, and task files following BMAD conventions.
 * Used by diagnostic tools to detect orphaned files not in manifests.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
/**
 * Scan BMAD directory for agent, workflow, and task files.
 */
export class FileScanner {
    bmadRoot;
    constructor(bmadRoot) {
        this.bmadRoot = path.resolve(bmadRoot);
    }
    /**
     * Scan for all BMAD assets in the directory.
     */
    scan() {
        return {
            agents: this.scanAgents(),
            workflows: this.scanWorkflows(),
            tasks: this.scanTasks(),
        };
    }
    /**
     * Scan for agent markdown files.
     * Looks in: bmad/agents/, bmad/bmm/agents/, bmad/core/agents/
     */
    scanAgents() {
        const searchPaths = [
            path.join(this.bmadRoot, 'agents'),
            path.join(this.bmadRoot, 'bmm', 'agents'),
            path.join(this.bmadRoot, 'core', 'agents'),
        ];
        const files = [];
        for (const searchPath of searchPaths) {
            if (!fs.existsSync(searchPath)) {
                continue;
            }
            this.scanDirectory(searchPath, (filePath) => {
                if (filePath.endsWith('.md')) {
                    const name = this.extractAgentName(filePath);
                    if (name) {
                        files.push({
                            name,
                            path: path.relative(this.bmadRoot, filePath),
                            type: 'agent',
                            inManifest: false, // Will be set by caller
                        });
                    }
                }
            });
        }
        return files;
    }
    /**
     * Scan for workflow YAML files.
     * Looks in: bmad/workflows/, bmad/bmm/workflows/, bmad/core/workflows/
     */
    scanWorkflows() {
        const searchPaths = [
            path.join(this.bmadRoot, 'workflows'),
            path.join(this.bmadRoot, 'bmm', 'workflows'),
            path.join(this.bmadRoot, 'core', 'workflows'),
        ];
        const files = [];
        for (const searchPath of searchPaths) {
            if (!fs.existsSync(searchPath)) {
                continue;
            }
            this.scanDirectory(searchPath, (filePath) => {
                // Only scan for workflow.yaml files (excludes templates, configs, helpers)
                if (path.basename(filePath) === 'workflow.yaml') {
                    const name = this.extractWorkflowName(filePath);
                    if (name) {
                        files.push({
                            name,
                            path: path.relative(this.bmadRoot, filePath),
                            type: 'workflow',
                            inManifest: false, // Will be set by caller
                        });
                    }
                }
            });
        }
        return files;
    }
    /**
     * Scan for task XML files.
     * Looks in: bmad/tasks/, bmad/bmm/tasks/, bmad/core/tasks/
     */
    scanTasks() {
        const searchPaths = [
            path.join(this.bmadRoot, 'tasks'),
            path.join(this.bmadRoot, 'bmm', 'tasks'),
            path.join(this.bmadRoot, 'core', 'tasks'),
        ];
        const files = [];
        for (const searchPath of searchPaths) {
            if (!fs.existsSync(searchPath)) {
                continue;
            }
            this.scanDirectory(searchPath, (filePath) => {
                if (filePath.endsWith('.xml')) {
                    const name = this.extractTaskName(filePath);
                    if (name) {
                        files.push({
                            name,
                            path: path.relative(this.bmadRoot, filePath),
                            type: 'task',
                            inManifest: false, // Will be set by caller
                        });
                    }
                }
            });
        }
        return files;
    }
    /**
     * Recursively scan directory and call handler for each file.
     */
    scanDirectory(dir, handler) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                // Skip _cfg directory
                if (entry.isDirectory() && entry.name === '_cfg') {
                    continue;
                }
                if (entry.isDirectory()) {
                    this.scanDirectory(fullPath, handler);
                }
                else if (entry.isFile()) {
                    handler(fullPath);
                }
            }
        }
        catch (error) {
            // Silently skip directories that can't be read
            console.error(`Error scanning directory ${dir}:`, error);
        }
    }
    /**
     * Extract agent name from file path.
     * Follows convention: agents/<module>/<agent-name>.md
     */
    extractAgentName(filePath) {
        const basename = path.basename(filePath, '.md');
        // Agent names use lowercase-hyphen format
        if (/^[a-z]+(-[a-z]+)*$/.test(basename)) {
            return basename;
        }
        return undefined;
    }
    /**
     * Extract workflow name from YAML file.
     * Reads the `name` property from the YAML content.
     */
    extractWorkflowName(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const parsed = yaml.load(content);
            if (parsed && typeof parsed.name === 'string') {
                // Workflow names use lowercase-hyphen-number format
                if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(parsed.name)) {
                    return parsed.name;
                }
            }
        }
        catch (error) {
            // If we can't parse the YAML, fall back to filename extraction
            console.error(`Error parsing workflow YAML ${filePath}:`, error);
        }
        // Fallback: extract from filename
        const basename = path.basename(filePath).replace(/\.(yaml|yml)$/, '');
        if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(basename)) {
            return basename;
        }
        return undefined;
    }
    /**
     * Extract task name from file path.
     * Follows convention: tasks/<module>/<task-name>.xml
     */
    extractTaskName(filePath) {
        const basename = path.basename(filePath, '.xml');
        // Task names use lowercase-hyphen-number format
        if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(basename)) {
            return basename;
        }
        return undefined;
    }
}
//# sourceMappingURL=file-scanner.js.map