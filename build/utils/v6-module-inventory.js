import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { ManifestLoader } from './manifest-loader.js';
import { detectV6, detectV6Filesystem } from './version-detector.js';
// Exclusions for agent file detection (case-insensitive basenames)
const EXCLUDED_AGENT_FILES = ['readme.md'];
function readYaml(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return yaml.load(content);
    }
    catch {
        return undefined;
    }
}
function listFilesRecursive(dir, predicate) {
    const results = [];
    const stack = [dir];
    while (stack.length) {
        const current = stack.pop();
        let entries = [];
        try {
            entries = fs.readdirSync(current, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === '_cfg')
                    continue; // skip config folder
                stack.push(full);
            }
            else if (entry.isFile()) {
                if (predicate(full))
                    results.push(full);
            }
        }
    }
    return results;
}
function listWorkflowFiles(workflowsDir) {
    const results = [];
    try {
        const entries = fs.readdirSync(workflowsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && entry.name !== '_cfg') {
                const workflowPath = path.join(workflowsDir, entry.name);
                // Look for workflow.yaml or workflow.yml in this directory only
                const yamlPath = path.join(workflowPath, 'workflow.yaml');
                const ymlPath = path.join(workflowPath, 'workflow.yml');
                if (fs.existsSync(yamlPath)) {
                    results.push(yamlPath);
                }
                else if (fs.existsSync(ymlPath)) {
                    results.push(ymlPath);
                }
            }
        }
    }
    catch {
        // Directory doesn't exist or not accessible
    }
    return results;
}
export function inventoryOriginV6(origin) {
    // Try to detect v6 with manifest first, fallback to filesystem detection
    let detected = detectV6(origin.root);
    const hasManifest = Boolean(detected);
    if (!detected) {
        detected = detectV6Filesystem(origin.root);
    }
    if (!detected) {
        return { modules: [], agents: [], workflows: [], tasks: [] };
    }
    // Load manifest CSV files only if manifest exists
    const quiet = {
        warn: () => { },
        error: () => { },
    };
    const agentsCsv = hasManifest
        ? new ManifestLoader(origin.root, quiet).loadAgentManifest()
        : [];
    const workflowsCsv = hasManifest
        ? new ManifestLoader(origin.root, quiet).loadWorkflowManifest()
        : [];
    const tasksCsv = hasManifest
        ? new ManifestLoader(origin.root, quiet).loadTaskManifest()
        : [];
    const modules = [];
    const agentRecords = [];
    const workflowRecords = [];
    const taskRecords = [];
    if (!detected.modules || !Array.isArray(detected.modules)) {
        console.warn('No modules found or modules is not an array');
        // Return empty inventory but valid structure
        return {
            agents: agentRecords,
            workflows: workflowRecords,
            tasks: taskRecords,
            modules,
        };
    }
    for (const mod of detected.modules) {
        // Handle both string and object formats defensively
        let moduleName;
        if (typeof mod === 'string') {
            moduleName = mod;
        }
        else if (mod && typeof mod === 'object' && 'name' in mod) {
            moduleName = mod.name;
        }
        else {
            console.warn(`Skipping invalid module:`, mod);
            continue;
        }
        // Skip modules with invalid names
        if (!moduleName || typeof moduleName !== 'string') {
            console.warn(`Skipping invalid module name:`, moduleName);
            continue;
        }
        const modulePath = path.join(origin.root, moduleName);
        const configPath = path.join(modulePath, 'config.yaml');
        const configExists = fs.existsSync(configPath);
        const config = configExists
            ? readYaml(configPath)
            : undefined;
        const moduleInfo = {
            name: moduleName,
            path: modulePath,
            configPath,
            configValid: Boolean(configExists),
            errors: configExists ? [] : ['Missing config.yaml'],
            moduleVersion: (config && (config.version || config.moduleVersion)) ||
                'v6.x', // No version available from string format
            bmadVersion: detected.installationVersion || 'v6.x',
            origin,
        };
        modules.push(moduleInfo);
        // CSV entries filtered by module (exclude invalid agent files like README.md)
        const modAgentsCsv = agentsCsv
            .filter((a) => a.module === moduleName)
            .filter((row) => {
            const p = typeof row.path === 'string'
                ? row.path
                : '';
            const base = path.basename(p).toLowerCase();
            return !EXCLUDED_AGENT_FILES.includes(base);
        });
        const modWorkflowsCsv = workflowsCsv.filter((w) => w.module === moduleName);
        const modTasksCsv = tasksCsv.filter((t) => t.module === moduleName);
        const csvAgentKeys = new Set(modAgentsCsv.map((a) => `${moduleName}:${a.name}`));
        const csvWorkflowPaths = new Set(modWorkflowsCsv.map((w) => w.path));
        const csvTaskPaths = new Set(modTasksCsv.map((t) => t.path ?? ''));
        // Workflows from manifest
        for (const row of modWorkflowsCsv) {
            const moduleRelativePath = row.path;
            const absolutePath = path.join(origin.root, moduleRelativePath);
            const exists = fs.existsSync(absolutePath);
            // Start with manifest description, then enrich from YAML if file exists
            let description = row.description;
            let displayName = row.description;
            if (exists) {
                try {
                    const y = readYaml(absolutePath);
                    // Prefer description from YAML file (it's the source of truth)
                    if (y?.description && typeof y.description === 'string') {
                        description = y.description;
                        displayName = y.description;
                    }
                }
                catch {
                    // If YAML parsing fails, keep manifest description
                }
            }
            const rec = {
                kind: 'workflow',
                source: 'manifest',
                origin,
                moduleName,
                moduleVersion: moduleInfo.moduleVersion,
                bmadVersion: moduleInfo.bmadVersion,
                name: row.name,
                displayName,
                description,
                bmadRelativePath: path.join('bmad', moduleRelativePath),
                moduleRelativePath,
                absolutePath,
                exists,
                status: exists ? 'verified' : 'no-file-found',
            };
            workflowRecords.push(rec);
        }
        for (const row of modTasksCsv) {
            const moduleRelativePath = row.path ?? '';
            const absolutePath = moduleRelativePath
                ? path.join(origin.root, moduleRelativePath)
                : '';
            const exists = moduleRelativePath ? fs.existsSync(absolutePath) : false;
            const rec = {
                kind: 'task',
                source: 'manifest',
                origin,
                moduleName,
                moduleVersion: moduleInfo.moduleVersion,
                bmadVersion: moduleInfo.bmadVersion,
                name: row.name,
                displayName: row.description,
                description: row.description,
                bmadRelativePath: moduleRelativePath
                    ? path.join('bmad', moduleRelativePath)
                    : '',
                moduleRelativePath,
                absolutePath,
                exists,
                status: exists ? 'verified' : 'no-file-found',
            };
            taskRecords.push(rec);
        }
        // FS scan
        const agentFiles = listFilesRecursive(path.join(modulePath, 'agents'), (p) => p.endsWith('.md'));
        const workflowFiles = listWorkflowFiles(path.join(modulePath, 'workflows'));
        const taskFiles = listFilesRecursive(path.join(modulePath, 'tasks'), (p) => p.endsWith('.md') || p.endsWith('.xml'));
        // Agents from manifest (priority source - always include)
        for (const row of modAgentsCsv) {
            const moduleRelativePath = row.path; // loader strips leading 'bmad/'
            const absolutePath = path.join(origin.root, moduleRelativePath);
            const name = row.name;
            const exists = fs.existsSync(absolutePath);
            const rec = {
                kind: 'agent',
                source: 'manifest',
                origin,
                moduleName,
                moduleVersion: moduleInfo.moduleVersion,
                bmadVersion: moduleInfo.bmadVersion,
                name,
                displayName: row.displayName,
                description: row.title,
                bmadRelativePath: path.join('bmad', moduleRelativePath),
                moduleRelativePath,
                absolutePath,
                exists,
                status: exists ? 'verified' : 'no-file-found',
            };
            agentRecords.push(rec);
        }
        // Agents from filesystem (only orphans not in manifest)
        for (const abs of agentFiles) {
            const baseLower = path.basename(abs).toLowerCase();
            if (EXCLUDED_AGENT_FILES.includes(baseLower))
                continue;
            const moduleRelativePath = path.relative(origin.root, abs);
            const name = path.basename(abs, '.md');
            const key = `${moduleName}:${name}`;
            const inManifest = csvAgentKeys.has(key);
            // Only add if NOT in manifest (orphan file)
            if (!inManifest) {
                const rec = {
                    kind: 'agent',
                    source: 'filesystem',
                    origin,
                    moduleName,
                    moduleVersion: moduleInfo.moduleVersion,
                    bmadVersion: moduleInfo.bmadVersion,
                    name,
                    bmadRelativePath: path.join('bmad', moduleRelativePath),
                    moduleRelativePath,
                    absolutePath: abs,
                    exists: true,
                    status: 'not-in-manifest',
                };
                agentRecords.push(rec);
            }
        }
        // Workflows from filesystem (only orphans not in manifest)
        for (const abs of workflowFiles) {
            const moduleRelativePath = path.relative(origin.root, abs);
            const inManifest = csvWorkflowPaths.has(moduleRelativePath);
            // Only add if NOT in manifest (orphan file)
            if (!inManifest) {
                // Try to read name and description from yaml
                let name;
                let description;
                try {
                    const y = readYaml(abs);
                    if (y?.name && typeof y.name === 'string')
                        name = y.name;
                    if (y?.description && typeof y.description === 'string')
                        description = y.description;
                }
                catch {
                    // ignore
                }
                if (!name)
                    name = path.basename(path.dirname(abs));
                const rec = {
                    kind: 'workflow',
                    source: 'filesystem',
                    origin,
                    moduleName,
                    moduleVersion: moduleInfo.moduleVersion,
                    bmadVersion: moduleInfo.bmadVersion,
                    name,
                    displayName: description,
                    description,
                    bmadRelativePath: path.join('bmad', moduleRelativePath),
                    moduleRelativePath,
                    absolutePath: abs,
                    exists: true,
                    status: 'not-in-manifest',
                };
                workflowRecords.push(rec);
            }
        }
        // Tasks from filesystem (only orphans not in manifest)
        for (const abs of taskFiles) {
            const moduleRelativePath = path.relative(origin.root, abs);
            const inManifest = csvTaskPaths.has(moduleRelativePath);
            // Only add if NOT in manifest (orphan file)
            if (!inManifest) {
                const rec = {
                    kind: 'task',
                    source: 'filesystem',
                    origin,
                    moduleName,
                    moduleVersion: moduleInfo.moduleVersion,
                    bmadVersion: moduleInfo.bmadVersion,
                    name: path.basename(abs).replace(/\.(xml|md)$/i, ''),
                    bmadRelativePath: path.join('bmad', moduleRelativePath),
                    moduleRelativePath,
                    absolutePath: abs,
                    exists: true,
                    status: 'not-in-manifest',
                };
                taskRecords.push(rec);
            }
        }
    }
    return {
        modules,
        agents: agentRecords,
        workflows: workflowRecords,
        tasks: taskRecords,
    };
}
//# sourceMappingURL=v6-module-inventory.js.map