/**
 * Unified BMAD Tool - Instruction-based routing for agents and workflows.
 *
 * This module implements a single `bmad` tool that intelligently routes commands:
 * - `bmad` → Load bmad-master agent (default)
 * - `bmad <agent-name>` → Load specified agent
 * - `bmad *<workflow-name>` → Execute specified workflow
 *
 * The tool uses instruction-based routing where the LLM reads instructions
 * in the tool description to understand how to route commands correctly.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ManifestLoader } from '../utils/manifest-loader.js';
import { FileReader } from '../utils/file-reader.js';
import { detectManifestDirectory, } from '../utils/bmad-path-resolver.js';
// Validation patterns
const AGENT_NAME_PATTERN = /^[a-z]+(-[a-z]+)*$/;
const WORKFLOW_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 50;
const DANGEROUS_CHARS = [
    ';',
    '&',
    '|',
    '$',
    '`',
    '<',
    '>',
    '\n',
    '\r',
    '(',
    ')',
];
const FUZZY_MATCH_THRESHOLD = 0.7;
/**
 * Calculate similarity ratio between two strings (Levenshtein-based)
 */
function similarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0)
        return 1.0;
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}
/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1, s2) {
    const matrix = [];
    for (let i = 0; i <= s2.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= s2.length; i++) {
        for (let j = 1; j <= s1.length; j++) {
            if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
    }
    return matrix[s2.length][s1.length];
}
/**
 * Unified BMAD tool handler with instruction-based routing.
 *
 * Handles all BMAD commands through a single entry point:
 * - Agent loading
 * - Workflow execution
 * - Smart error handling with fuzzy matching
 * - Comprehensive validation
 */
export class UnifiedBMADTool {
    bmadRoot;
    manifestLoader;
    fileReader;
    agents;
    workflows;
    discovery;
    packageBmadPath;
    userBmadPath;
    projectRoot;
    manifestDir;
    constructor(options) {
        const { bmadRoot, discovery } = options;
        this.discovery = discovery;
        this.packageBmadPath = discovery.packageBmadPath;
        this.userBmadPath = discovery.userBmadPath;
        this.projectRoot = discovery.projectRoot;
        this.bmadRoot = path.resolve(bmadRoot);
        const manifestDir = discovery.activeLocation.manifestDir;
        if (!manifestDir) {
            throw new Error('Active location missing manifest directory.');
        }
        this.manifestDir = manifestDir;
        this.manifestLoader = new ManifestLoader(this.bmadRoot);
        // Collect all BMAD roots for fallback file loading
        // Priority order: project -> cli -> env -> user -> package
        // Include ALL locations with resolved paths (even partial/invalid structures)
        // to allow workspace files to override specific files without needing full BMAD structure
        const validRoots = [];
        // Sort all locations by priority that have a resolved path (directory exists)
        const sortedLocations = [...discovery.locations]
            .filter((loc) => {
            // Include if it has a resolvedRoot (valid or invalid structure)
            // OR if it has an originalPath that exists (even if marked missing during discovery)
            return loc.resolvedRoot ?? (loc.originalPath && fs.existsSync(loc.originalPath));
        })
            .sort((a, b) => a.priority - b.priority);
        for (const location of sortedLocations) {
            const root = location.resolvedRoot ?? location.originalPath;
            if (root && !validRoots.includes(root)) {
                validRoots.push(root);
            }
        }
        // Always add package location as final fallback (if not already included)
        if (!validRoots.includes(discovery.packageBmadPath)) {
            validRoots.push(discovery.packageBmadPath);
        }
        console.error(`FileReader fallback chain (${validRoots.length} locations):`);
        validRoots.forEach((root, idx) => {
            const location = discovery.locations.find((loc) => loc.resolvedRoot === root || loc.originalPath === root);
            const source = location?.displayName ?? 'Package';
            const status = location ? ` [${location.status}]` : '';
            console.error(`  ${idx + 1}. ${source}${status}: ${root}`);
        });
        this.fileReader = new FileReader(validRoots);
        // Load manifests on init for validation
        this.agents = this.manifestLoader.loadAgentManifest();
        this.workflows = this.manifestLoader.loadWorkflowManifest();
        console.error(`UnifiedBMADTool initialized with ${this.agents.length} agents ` +
            `and ${this.workflows.length} workflows`);
    }
    /**
     * Execute unified BMAD command with intelligent routing.
     *
     * @param command Command string to parse and execute
     * @returns Result object with data or error information
     */
    execute(command) {
        // Normalize command (trim whitespace)
        const normalized = command.trim();
        // Empty command → load bmad-master (default)
        if (!normalized) {
            console.error('Empty command, loading bmad-master (default)');
            return this.loadAgent('bmad-master');
        }
        // Check for built-in discovery commands first (before parsing)
        if (normalized === '*list-agents') {
            console.error('Discovery command: list-agents');
            return this.listAgents();
        }
        else if (normalized === '*list-workflows') {
            console.error('Discovery command: list-workflows');
            return this.listWorkflows();
        }
        else if (normalized === '*list-tasks') {
            console.error('Discovery command: list-tasks');
            return this.listTasks();
        }
        else if (normalized === '*discover') {
            console.error('Discovery command: discover');
            return this.discover();
        }
        else if (normalized.startsWith('*init')) {
            console.error('Initialization command received');
            return this.init(normalized);
        }
        else if (normalized === '*help') {
            console.error('Discovery command: help');
            return this.help();
        }
        // Parse command to determine type
        const parsedCommand = this.parseCommand(normalized);
        if (parsedCommand.type === 'error') {
            return this.formatErrorResponse(parsedCommand.validation);
        }
        // Validate the name
        const validation = this.validateName(parsedCommand.name, parsedCommand.type);
        if (!validation.valid) {
            return this.formatErrorResponse(validation);
        }
        // Route to appropriate handler
        if (parsedCommand.type === 'workflow') {
            return this.executeWorkflow(parsedCommand.name);
        }
        else {
            return this.loadAgent(parsedCommand.name);
        }
    }
    /**
     * Parse command to determine type and extract name.
     */
    parseCommand(command) {
        // Security check: dangerous characters
        const securityValidation = this.checkSecurity(command);
        if (!securityValidation.valid) {
            return { type: 'error', validation: securityValidation };
        }
        // Check for multiple arguments (spaces)
        if (command.includes(' ')) {
            const parts = command.split(' ');
            if (parts.length > 1) {
                return {
                    type: 'error',
                    validation: {
                        valid: false,
                        errorCode: 'TOO_MANY_ARGUMENTS',
                        errorMessage: this.formatTooManyArgsError(parts),
                        exitCode: 1,
                    },
                };
            }
        }
        // Workflow pattern: starts with *
        if (command.startsWith('**')) {
            // Double asterisk error
            const workflowName = command.substring(2);
            return {
                type: 'error',
                validation: {
                    valid: false,
                    errorCode: 'INVALID_ASTERISK_COUNT',
                    errorMessage: this.formatDoubleAsteriskError(workflowName),
                    suggestions: [`*${workflowName}`],
                    exitCode: 1,
                },
            };
        }
        else if (command.startsWith('*')) {
            // Extract workflow name (everything after *)
            const workflowName = command.substring(1).trim();
            if (!workflowName) {
                // Asterisk only, no name
                return {
                    type: 'error',
                    validation: {
                        valid: false,
                        errorCode: 'MISSING_WORKFLOW_NAME',
                        errorMessage: this.formatMissingWorkflowNameError(),
                        exitCode: 1,
                    },
                };
            }
            return { type: 'workflow', name: workflowName };
        }
        else {
            // Agent pattern: no asterisk
            const agentName = command;
            // Check if user forgot asterisk for workflow
            if (this.isWorkflowName(agentName)) {
                return {
                    type: 'error',
                    validation: {
                        valid: false,
                        errorCode: 'MISSING_ASTERISK',
                        errorMessage: this.formatMissingAsteriskError(agentName),
                        suggestions: [`*${agentName}`],
                        exitCode: 1,
                    },
                };
            }
            return { type: 'agent', name: agentName };
        }
    }
    /**
     * Check for dangerous characters and non-ASCII.
     */
    checkSecurity(command) {
        // Check dangerous characters
        const foundDangerous = DANGEROUS_CHARS.filter((c) => command.includes(c));
        if (foundDangerous.length > 0) {
            return {
                valid: false,
                errorCode: 'INVALID_CHARACTERS',
                errorMessage: this.formatDangerousCharsError(foundDangerous),
                exitCode: 1,
            };
        }
        // Check non-ASCII
        if (!/^[\x00-\x7F]*$/.test(command)) {
            const nonAscii = [...command].filter((c) => c.charCodeAt(0) > 127);
            return {
                valid: false,
                errorCode: 'NON_ASCII_CHARACTERS',
                errorMessage: this.formatNonAsciiError(nonAscii),
                exitCode: 1,
            };
        }
        return { valid: true, exitCode: 0 };
    }
    /**
     * Validate agent or workflow name.
     */
    validateName(name, commandType) {
        // Length validation
        if (name.length < MIN_NAME_LENGTH) {
            return {
                valid: false,
                errorCode: 'NAME_TOO_SHORT',
                errorMessage: this.formatNameTooShortError(name, commandType),
                exitCode: 1,
            };
        }
        if (name.length > MAX_NAME_LENGTH) {
            return {
                valid: false,
                errorCode: 'NAME_TOO_LONG',
                errorMessage: this.formatNameTooLongError(name, name.length),
                exitCode: 1,
            };
        }
        // Pattern validation
        const pattern = commandType === 'workflow' ? WORKFLOW_NAME_PATTERN : AGENT_NAME_PATTERN;
        if (!pattern.test(name)) {
            return {
                valid: false,
                errorCode: 'INVALID_NAME_FORMAT',
                errorMessage: this.formatInvalidFormatError(name, commandType),
                exitCode: 1,
            };
        }
        // Existence validation
        if (commandType === 'workflow') {
            if (!this.isWorkflowName(name)) {
                // Try fuzzy match
                const suggestion = this.findClosestMatch(name, this.getWorkflowNames());
                return {
                    valid: false,
                    errorCode: 'UNKNOWN_WORKFLOW',
                    errorMessage: this.formatUnknownWorkflowError(name, suggestion),
                    suggestions: suggestion ? [suggestion] : [],
                    exitCode: 1,
                };
            }
        }
        else {
            // agent
            if (!this.isAgentName(name)) {
                // Check case mismatch
                const caseMatch = this.checkCaseMismatch(name, this.getAgentNames());
                if (caseMatch) {
                    return {
                        valid: false,
                        errorCode: 'CASE_MISMATCH',
                        errorMessage: this.formatCaseMismatchError(name, caseMatch),
                        suggestions: [caseMatch],
                        exitCode: 1,
                    };
                }
                // Try fuzzy match
                const suggestion = this.findClosestMatch(name, this.getAgentNames());
                return {
                    valid: false,
                    errorCode: 'UNKNOWN_AGENT',
                    errorMessage: this.formatUnknownAgentError(name, suggestion),
                    suggestions: suggestion ? [suggestion] : [],
                    exitCode: 1,
                };
            }
        }
        return { valid: true, exitCode: 0 };
    }
    /**
     * Resolve agent name aliases to canonical names.
     */
    resolveAgentAlias(name) {
        // Define common aliases
        const aliases = {
            master: 'bmad-master',
        };
        // Check if it's a known alias
        const canonical = aliases[name];
        if (canonical) {
            console.error(`Resolved alias '${name}' to '${canonical}'`);
            return canonical;
        }
        // Check if adding module prefix resolves to valid agent
        for (const agent of this.agents) {
            const agentName = agent.name;
            const module = agent.module;
            // Check if the name is the suffix of an agent with module prefix
            if (agentName.endsWith(`-${name}`) &&
                agentName.startsWith(`${module}-`)) {
                console.error(`Resolved module alias '${name}' to '${agentName}' (module: ${module})`);
                return agentName;
            }
        }
        return name;
    }
    /**
     * Check if name exists in agent manifest (after alias resolution).
     */
    isAgentName(name) {
        const canonicalName = this.resolveAgentAlias(name);
        return this.agents.some((a) => a.name === canonicalName);
    }
    /**
     * Check if name exists in workflow manifest.
     */
    isWorkflowName(name) {
        return this.workflows.some((w) => w.name === name);
    }
    /**
     * Get list of all agent names.
     */
    getAgentNames() {
        return this.agents.map((a) => a.name);
    }
    /**
     * Get list of all workflow names.
     */
    getWorkflowNames() {
        return this.workflows.map((w) => w.name);
    }
    /**
     * Check if name matches a valid name but with wrong case.
     */
    checkCaseMismatch(name, validNames) {
        const lowercaseName = name.toLowerCase();
        for (const validName of validNames) {
            if (validName.toLowerCase() === lowercaseName && validName !== name) {
                return validName;
            }
        }
        return undefined;
    }
    /**
     * Find closest matching name using fuzzy matching.
     */
    findClosestMatch(inputName, validNames) {
        let bestMatch = undefined;
        let bestScore = 0.0;
        for (const validName of validNames) {
            const ratio = similarity(inputName.toLowerCase(), validName.toLowerCase());
            if (ratio >= FUZZY_MATCH_THRESHOLD && ratio > bestScore) {
                bestScore = ratio;
                bestMatch = validName;
            }
        }
        return bestMatch;
    }
    /**
     * Load agent prompt content.
     */
    loadAgent(agentName) {
        // Resolve aliases (e.g., "master" → "bmad-master")
        const canonicalName = this.resolveAgentAlias(agentName);
        console.error(`Loading agent: ${canonicalName}${canonicalName !== agentName ? ` (from alias: ${agentName})` : ''}`);
        // Find agent in manifest using canonical name
        const agent = this.agents.find((a) => a.name === canonicalName);
        if (!agent) {
            // This shouldn't happen after validation, but handle gracefully
            return {
                success: false,
                error: `Agent '${canonicalName}' not found in manifest`,
                exitCode: 2,
            };
        }
        // Build agent prompt content
        const contentParts = [];
        // Header
        const displayName = agent.displayName || agentName;
        const title = agent.title || 'BMAD Agent';
        contentParts.push(`# BMAD Agent: ${displayName}`);
        contentParts.push(`**Title:** ${title}\n`);
        // Agent markdown file
        const agentPath = agent.path;
        if (agentPath) {
            contentParts.push('## Agent Definition\n');
            contentParts.push(`**File:** \`${agentPath}\`\n`);
            try {
                const agentMdContentRaw = this.fileReader.readFile(agentPath);
                // Dynamically replace {project-root} with {mcp-resources}
                const agentMdContent = this.resolveWorkflowPlaceholders(agentMdContentRaw);
                contentParts.push('```markdown');
                contentParts.push(agentMdContent);
                contentParts.push('```\n');
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                contentParts.push(`[Error reading agent file: ${errorMessage}]\n`);
                console.error(`Error reading agent file ${agentPath}:`, error);
            }
        }
        // Customization YAML file
        const module = agent.module ?? 'bmm';
        const customizePath = `bmad/_cfg/agents/${module}-${agentName}.customize.yaml`;
        contentParts.push('## Agent Customization\n');
        contentParts.push(`**File:** \`${customizePath}\`\n`);
        try {
            const yamlContentRaw = this.fileReader.readFile(customizePath);
            // Dynamically replace {project-root} with {mcp-resources}
            const yamlContent = this.resolveWorkflowPlaceholders(yamlContentRaw);
            contentParts.push('```yaml');
            contentParts.push(yamlContent);
            contentParts.push('```\n');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            contentParts.push(`[Customization file not found or error: ${errorMessage}]\n`);
        }
        // BMAD Processing Instructions
        contentParts.push(this.getAgentInstructions());
        return {
            success: true,
            type: 'agent',
            agentName: canonicalName,
            displayName: displayName,
            content: contentParts.join('\n'),
            exitCode: 0,
        };
    }
    /**
     * List all available agents from agent manifest.
     */
    listAgents() {
        const contentParts = ['# Available BMAD Agents\n'];
        if (this.agents.length === 0) {
            contentParts.push('No agents found in manifest.\n');
        }
        else {
            contentParts.push(`Found ${this.agents.length} agents:\n`);
            for (let i = 0; i < this.agents.length; i++) {
                const agent = this.agents[i];
                const name = agent.name || 'unknown';
                const displayName = agent.displayName || name;
                const role = agent.role || 'No role specified';
                const module = agent.module || 'core';
                contentParts.push(`\n${i + 1}. **${displayName}** (\`${name}\`)`);
                contentParts.push(`   - Role: ${role}`);
                contentParts.push(`   - Module: ${module}`);
                contentParts.push(`   - Command: \`bmad ${name}\`\n`);
            }
        }
        contentParts.push('\n**Usage:**');
        contentParts.push('- Load an agent: `bmad <agent-name>`');
        contentParts.push('- Example: `bmad analyst` loads Mary, the Business Analyst\n');
        return {
            success: true,
            type: 'list',
            listType: 'agents',
            count: this.agents.length,
            content: contentParts.join('\n'),
            exitCode: 0,
        };
    }
    /**
     * List all available workflows from workflow manifest.
     */
    listWorkflows() {
        const contentParts = ['# Available BMAD Workflows\n'];
        if (this.workflows.length === 0) {
            contentParts.push('No workflows found in manifest.\n');
        }
        else {
            contentParts.push(`Found ${this.workflows.length} workflows:\n`);
            for (let i = 0; i < this.workflows.length; i++) {
                const workflow = this.workflows[i];
                const name = workflow.name ?? 'unknown';
                const description = workflow.description ?? 'No description';
                const trigger = workflow.trigger ?? name;
                const module = workflow.module ?? 'core';
                contentParts.push(`\n${i + 1}. **${trigger}** - ${description}`);
                contentParts.push(`   - Module: ${module}`);
                contentParts.push(`   - Command: \`bmad *${trigger}\`\n`);
            }
        }
        contentParts.push('\n**Usage:**');
        contentParts.push('- Execute a workflow: `bmad *<workflow-name>`');
        contentParts.push('- Example: `bmad *party-mode` starts group discussion\n');
        return {
            success: true,
            type: 'list',
            listType: 'workflows',
            count: this.workflows.length,
            content: contentParts.join('\n'),
            exitCode: 0,
        };
    }
    /**
     * List all available tasks from task manifest.
     */
    listTasks() {
        const contentParts = ['# Available BMAD Tasks\n'];
        const tasks = this.manifestLoader.loadTaskManifest();
        if (tasks.length === 0) {
            contentParts.push('No tasks found in manifest.\n');
        }
        else {
            contentParts.push(`Found ${tasks.length} tasks:\n`);
            for (let i = 0; i < tasks.length; i++) {
                const task = tasks[i];
                const name = task.name || 'unknown';
                const description = task.description || 'No description';
                const module = task.module || 'core';
                contentParts.push(`\n${i + 1}. **${name}**`);
                contentParts.push(`   - ${description}`);
                contentParts.push(`   - Module: ${module}\n`);
            }
        }
        contentParts.push('\n**Note:** Tasks are referenced within workflows and agent instructions.\n');
        return {
            success: true,
            type: 'list',
            listType: 'tasks',
            count: tasks.length,
            content: contentParts.join('\n'),
            exitCode: 0,
        };
    }
    discover() {
        const active = this.discovery.activeLocation;
        const lines = [];
        lines.push('# BMAD Discovery Report');
        lines.push('');
        lines.push(`Active Location: ${active.displayName}`);
        lines.push(`- Priority: ${active.priority}`);
        lines.push(`- Path: ${this.formatLocationPath(active)}`);
        lines.push(`- Status: ${this.formatLocationStatus(active)}`);
        const activeStats = this.getLocationStats(active);
        if (activeStats) {
            lines.push(`- Catalog: ${activeStats.agents} agents, ` +
                `${activeStats.workflows} workflows, ${activeStats.tasks} tasks`);
        }
        lines.push('');
        lines.push('Locations (priority order):');
        const sorted = [...this.discovery.locations].sort((a, b) => a.priority - b.priority);
        for (const location of sorted) {
            const marker = location === active ? ' [active]' : '';
            const status = this.formatLocationStatus(location);
            const pathLine = this.formatLocationPath(location);
            const stats = this.getLocationStats(location);
            let summary = `${location.priority}. ${location.displayName}${marker} - ${status}`;
            summary += ` - ${pathLine}`;
            if (stats) {
                summary += ` - ${stats.agents} agents / ${stats.workflows} workflows / ${stats.tasks} tasks`;
            }
            lines.push(summary);
            if (location.details) {
                lines.push(`   Notes: ${location.details}`);
            }
        }
        lines.push('');
        lines.push('To initialize a writable BMAD directory, run `bmad *init --help`.');
        return {
            success: true,
            type: 'diagnostic',
            content: lines.join('\n'),
            data: {
                activeLocation: active,
                locations: sorted,
            },
            exitCode: 0,
        };
    }
    init(command) {
        const rawArgs = command.slice('*init'.length).trim();
        const normalizedArgs = rawArgs.toLowerCase();
        if (!rawArgs ||
            normalizedArgs === '--project' ||
            normalizedArgs === 'project') {
            return this.performInitialization({ scope: 'project' });
        }
        if (normalizedArgs === '--user' || normalizedArgs === 'user') {
            return this.performInitialization({ scope: 'user' });
        }
        if (normalizedArgs === '--help' ||
            normalizedArgs === '-h' ||
            normalizedArgs === 'help') {
            return this.initHelp();
        }
        return this.performInitialization({ scope: 'custom', customPath: rawArgs });
    }
    initHelp() {
        const lines = [
            '# BMAD Initialization',
            '',
            'Create a writable BMAD directory populated with the default templates.',
            '',
            'Usage:',
            '- `bmad *init --project` -> Copy into the current workspace (`./bmad`)',
            '- `bmad *init --user` -> Copy into the user directory (`~/.bmad`)',
            '- `bmad *init <path>` -> Copy into a custom path',
            '',
            'Priority order for resolving BMAD content:',
            '1. Local project (`./bmad`)',
            '2. Command argument (when provided)',
            '3. `BMAD_ROOT` environment variable',
            '4. User defaults (`~/.bmad`)',
            '5. Package defaults (read-only)',
            '',
            'After initialization, restart the BMAD MCP server or reconnect your client to load the new configuration.',
        ];
        return {
            success: true,
            type: 'help',
            content: lines.join('\n'),
            exitCode: 0,
        };
    }
    performInitialization(options) {
        const source = this.packageBmadPath;
        if (!fs.existsSync(source)) {
            return {
                success: false,
                exitCode: 1,
                error: `Package BMAD templates not found at ${source}. Reinstall the server to restore templates.`,
            };
        }
        const target = this.resolveInitTarget(options);
        if (!target) {
            return {
                success: false,
                exitCode: 1,
                error: 'Initialization aborted: unable to determine target directory.',
            };
        }
        const existingManifest = detectManifestDirectory(target);
        if (existingManifest) {
            return {
                success: false,
                exitCode: 1,
                error: `BMAD already initialized at ${existingManifest.resolvedRoot}. Remove it before running *init again.`,
            };
        }
        if (fs.existsSync(target)) {
            const stats = fs.statSync(target);
            if (!stats.isDirectory()) {
                return {
                    success: false,
                    exitCode: 1,
                    error: `Target path exists and is not a directory: ${target}`,
                };
            }
            const contents = fs.readdirSync(target);
            if (contents.length > 0) {
                return {
                    success: false,
                    exitCode: 1,
                    error: `Target directory is not empty: ${target}. Choose an empty directory or remove existing files.`,
                };
            }
        }
        else {
            fs.mkdirSync(target, { recursive: true });
        }
        try {
            this.copyBmadTemplate(source, target);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                exitCode: 1,
                error: `Failed to copy BMAD templates: ${errorMessage}`,
            };
        }
        const message = this.buildInitSuccessMessage(options.scope, target);
        return {
            success: true,
            type: 'init',
            content: message,
            exitCode: 0,
        };
    }
    resolveInitTarget(options) {
        if (options.scope === 'project') {
            return path.join(this.projectRoot, 'bmad');
        }
        if (options.scope === 'user') {
            return this.userBmadPath;
        }
        if (options.customPath) {
            const expanded = this.expandHomePath(options.customPath);
            return path.resolve(expanded);
        }
        return undefined;
    }
    expandHomePath(input) {
        const trimmed = input.trim();
        if (!trimmed) {
            return trimmed;
        }
        if (trimmed === '~') {
            return os.homedir();
        }
        if (trimmed.startsWith('~/')) {
            return path.join(os.homedir(), trimmed.slice(2));
        }
        if (trimmed.startsWith('~')) {
            return path.join(os.homedir(), trimmed.slice(1));
        }
        return trimmed;
    }
    copyBmadTemplate(source, destination) {
        const entries = fs.readdirSync(source, { withFileTypes: true });
        for (const entry of entries) {
            const sourcePath = path.join(source, entry.name);
            const destinationPath = path.join(destination, entry.name);
            if (entry.isDirectory()) {
                fs.mkdirSync(destinationPath, { recursive: true });
                this.copyBmadTemplate(sourcePath, destinationPath);
            }
            else {
                fs.copyFileSync(sourcePath, destinationPath, fs.constants.COPYFILE_EXCL);
            }
        }
    }
    buildInitSuccessMessage(scope, target) {
        const lines = [];
        lines.push('# BMAD Templates Copied');
        lines.push('');
        lines.push(`Scope: ${scope}`);
        lines.push(`Location: ${target}`);
        lines.push('');
        lines.push('Customize agents, workflows, and tasks in this directory.');
        lines.push('');
        if (scope === 'project') {
            lines.push('This project BMAD directory overrides user and package defaults.');
            lines.push('Consider adding `bmad/` to `.gitignore` if these templates should remain local.');
        }
        else if (scope === 'user') {
            lines.push('User templates apply when no project or environment override is present.');
        }
        else {
            lines.push('Set `BMAD_ROOT` to this path to use the custom templates:');
            lines.push(`export BMAD_ROOT=${target}`);
        }
        lines.push('');
        lines.push('After making changes, restart the BMAD MCP server or reconnect your client.');
        lines.push('Run `bmad *discover` to verify the active location.');
        lines.push('');
        lines.push('Priority order: project -> command argument -> BMAD_ROOT -> user -> package');
        return lines.join('\n');
    }
    getLocationStats(location) {
        if (location.status !== 'valid' || !location.resolvedRoot) {
            return undefined;
        }
        try {
            const loader = new ManifestLoader(location.resolvedRoot);
            return {
                agents: loader.loadAgentManifest().length,
                workflows: loader.loadWorkflowManifest().length,
                tasks: loader.loadTaskManifest().length,
            };
        }
        catch (error) {
            console.warn(`Unable to load manifests for ${location.resolvedRoot}:`, error);
            return undefined;
        }
    }
    formatLocationPath(location) {
        return location.resolvedRoot ?? location.originalPath ?? 'not configured';
    }
    formatLocationStatus(location) {
        return location.status.toUpperCase();
    }
    /**
     * Show help and command reference.
     */
    help() {
        const contentParts = [
            '# BMAD MCP Server - Command Reference\n',
            '## Available Commands\n',
            '### Load Agents',
            'Load and interact with BMAD agents:',
            '- `bmad ""` or `bmad` (empty) → Load bmad-master (default agent)',
            '- `bmad <agent-name>` → Load specific agent',
            '- Examples:',
            '  - `bmad analyst` → Load Mary (Business Analyst)',
            '  - `bmad dev` → Load Olivia (Senior Developer)',
            '  - `bmad tea` → Load Murat (Master Test Architect)\n',
            '### Execute Workflows',
            'Run BMAD workflows (prefix with `*`):',
            '- `bmad *<workflow-name>` → Execute workflow',
            '- Examples:',
            '  - `bmad *party-mode` → Start group discussion with all agents',
            '  - `bmad *framework` → Initialize test framework\n',
            '### Discovery Commands',
            'Explore available BMAD resources:',
            '- `bmad *list-agents` → Show all available agents',
            '- `bmad *list-workflows` → Show all available workflows',
            '- `bmad *list-tasks` → Show all available tasks',
            '- `bmad *discover` → Inspect available BMAD locations and resolution order',
            '- `bmad *init --help` → Initialize writable BMAD templates',
            '- `bmad *help` → Show this help message\n',
            '## Quick Start',
            '1. **Discover agents:** `bmad *list-agents`',
            '2. **Load an agent:** `bmad analyst`',
            '3. **Discover workflows:** `bmad *list-workflows`',
            '4. **Run a workflow:** `bmad *party-mode`\n',
            '## Agent vs Workflow',
            '- **Agents** provide personas and interactive menus (no `*` prefix)',
            '- **Workflows** execute automated tasks (use `*` prefix)\n',
            '## MCP Resources',
            `All resources are loaded from: \`${this.bmadRoot}\``,
            `- Agents: ${this.agents.length} available`,
            `- Workflows: ${this.workflows.length} available\n`,
            'For more information about specific agents or workflows, use the `*list-*` commands.',
        ];
        return {
            success: true,
            type: 'help',
            content: contentParts.join('\n'),
            exitCode: 0,
        };
    }
    /**
     * Execute workflow by loading its configuration and instructions.
     */
    executeWorkflow(workflowName) {
        console.error(`Executing workflow: ${workflowName}`);
        // Find workflow in manifest
        const workflow = this.workflows.find((w) => w.name === workflowName);
        if (!workflow) {
            return {
                success: false,
                error: `Workflow '${workflowName}' not found in manifest`,
                exitCode: 2,
            };
        }
        // Load workflow YAML file
        const workflowPath = workflow.path;
        let workflowYaml;
        if (workflowPath) {
            try {
                const workflowYamlRaw = this.fileReader.readFile(workflowPath);
                // Dynamically replace {project-root} with {mcp-resources}
                workflowYaml = this.resolveWorkflowPlaceholders(workflowYamlRaw);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                workflowYaml = `[Error reading workflow file: ${errorMessage}]`;
                console.error(`Error reading workflow file ${workflowPath}:`, error);
            }
        }
        // Try to load instructions.md from workflow directory
        let instructions;
        if (workflowPath) {
            const workflowDir = path.dirname(workflowPath);
            const instructionsPath = path.join(workflowDir, 'instructions.md');
            try {
                const instructionsRaw = this.fileReader.readFile(instructionsPath);
                // Dynamically replace {project-root} with {mcp-resources}
                instructions = this.resolveWorkflowPlaceholders(instructionsRaw);
            }
            catch {
                // Instructions file not required
            }
        }
        // Resolve paths and add agent manifest data for workflows that need it
        const workflowContext = this.buildWorkflowContext();
        return {
            success: true,
            type: 'workflow',
            name: workflow.name,
            description: workflow.description || '',
            module: workflow.module,
            path: workflowPath,
            workflowYaml,
            instructions,
            context: workflowContext,
            exitCode: 0,
        };
    }
    /**
     * Format validation error as response object.
     */
    formatErrorResponse(validation) {
        return {
            success: false,
            errorCode: validation.errorCode,
            error: validation.errorMessage,
            suggestions: validation.suggestions,
            exitCode: validation.exitCode,
        };
    }
    /**
     * Build workflow execution context with resolved paths and manifest data.
     */
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
    /**
     * Dynamically resolve workflow placeholders to clarify MCP resource usage.
     */
    resolveWorkflowPlaceholders(content) {
        return content.replace(/{project-root}/g, '{mcp-resources}');
    }
    /**
     * Get BMAD processing instructions for agents.
     */
    getAgentInstructions() {
        return `## BMAD Processing Instructions

This agent is part of the BMAD (BMad Methodology for Agile Development) framework.

**How to Process:**
1. Read the agent definition markdown to understand role, identity, and principles
2. Apply the communication style specified in the agent definition
3. Use the customization YAML for any project-specific overrides
4. Access available BMAD tools and workflows as needed
5. Follow the agent's core principles when making decisions

**Agent Activation:**
- You are now embodying this agent's persona
- Communicate using the specified communication style
- Apply the agent's principles to all recommendations
- Use the agent's identity and role to guide your responses

**Available BMAD Tools:**
The following MCP tools are available for workflow execution:
- \`bmad *<workflow-name>\` - Execute a BMAD workflow
- Use the bmad tool to discover and execute workflows as needed

Use these tools to access BMAD workflows and tasks as needed.`;
    }
    // Error message formatters
    formatTooManyArgsError(parts) {
        return `Error: Too many arguments

The bmad tool accepts only one argument at a time.

You provided: ${parts.join(' ')}

Did you mean one of these?
  - bmad ${parts[0]} (load ${parts[0]} agent)
  - bmad *${parts[1]} (execute ${parts[1]} workflow)

Usage:
  bmad                  → Load bmad-master
  bmad <agent-name>     → Load specified agent
  bmad *<workflow-name> → Execute specified workflow`;
    }
    formatDoubleAsteriskError(workflowName) {
        return `Error: Invalid syntax

Workflows require exactly one asterisk (*) prefix, not two (**).

Correct syntax:
  bmad *${workflowName}

Try: bmad *${workflowName}`;
    }
    formatMissingWorkflowNameError() {
        return `Error: Missing workflow name

The asterisk (*) prefix requires a workflow name.

Correct syntax:
  bmad *<workflow-name>

Example:
  bmad *party-mode

To list all workflows, try:
  bmad list-workflows`;
    }
    formatMissingAsteriskError(workflowName) {
        return `Error: Missing workflow prefix

'${workflowName}' appears to be a workflow name, but is missing the asterisk (*) prefix.

Workflows must be invoked with the asterisk prefix:
  Correct:   bmad *${workflowName}
  Incorrect: bmad ${workflowName}

To load an agent instead, use:
  bmad <agent-name>

Did you mean: bmad *${workflowName}?`;
    }
    formatDangerousCharsError(chars) {
        return `Error: Invalid characters detected

The command contains potentially dangerous characters: ${chars.join(', ')}

For security reasons, the following characters are not allowed:
  ; & | $ \` < > ( )

Agent and workflow names use only:
  - Lowercase letters (a-z)
  - Numbers (0-9, workflows only)
  - Hyphens (-)

Try: bmad analyst`;
    }
    formatNonAsciiError(chars) {
        return `Error: Non-ASCII characters detected

The command contains non-ASCII characters: ${chars.join(', ')}

Agent and workflow names must use ASCII characters only:
  - Lowercase letters (a-z)
  - Numbers (0-9, workflows only)
  - Hyphens (-)

Try using ASCII equivalents.`;
    }
    formatNameTooShortError(name, commandType) {
        const entity = commandType === 'agent' ? 'Agent' : 'Workflow';
        const available = this.formatAvailableList(commandType);
        return `Error: ${entity} name too short

${entity} name '${name}' is only ${name.length} character(s) long. Names must be at least ${MIN_NAME_LENGTH} characters.

${available}

Try: bmad <agent-name>`;
    }
    formatNameTooLongError(name, length) {
        return `Error: Name too long

The provided name is ${length} characters long. Names must be at most ${MAX_NAME_LENGTH} characters.

Please use a shorter agent or workflow name.`;
    }
    formatInvalidFormatError(name, commandType) {
        if (commandType === 'agent') {
            return `Error: Invalid agent name format

Agent name '${name}' contains invalid characters.

Agent names must:
  - Use lowercase letters only
  - Use hyphens (-) to separate words
  - Start and end with a letter
  - Not contain numbers or special characters

Valid examples:
  - analyst
  - bmad-master
  - game-dev`;
        }
        else {
            return `Error: Invalid workflow name format

Workflow name '${name}' contains invalid characters.

Workflow names must:
  - Use lowercase letters and numbers
  - Use hyphens (-) to separate words
  - Start and end with alphanumeric character
  - Not contain underscores or special characters

Valid examples:
  - party-mode
  - brainstorm-project
  - dev-story`;
        }
    }
    formatUnknownAgentError(name, suggestion) {
        let message = `Error: Unknown agent '${name}'\n\n`;
        if (suggestion) {
            message += `Did you mean: ${suggestion}?\n\n`;
        }
        message += `The agent '${name}' is not available in the BMAD system.\n\n`;
        message += this.formatAvailableList('agent');
        message += '\nTry: bmad <agent-name>\nExample: bmad analyst';
        return message;
    }
    formatUnknownWorkflowError(name, suggestion) {
        let message = `Error: Unknown workflow '*${name}'\n\n`;
        if (suggestion) {
            message += `Did you mean: *${suggestion}?\n\n`;
        }
        message += `The workflow '${name}' is not available in the BMAD system.\n\n`;
        message += this.formatAvailableList('workflow');
        message += '\nTry: bmad *<workflow-name>\nExample: bmad *party-mode';
        return message;
    }
    formatCaseMismatchError(name, correctName) {
        return `Error: Case sensitivity mismatch

Agent names are case-sensitive. '${name}' does not match '${correctName}'.

Did you mean: bmad ${correctName}?

Note: All agent and workflow names use lowercase letters only.`;
    }
    formatAvailableList(commandType) {
        if (commandType === 'agent') {
            const lines = ['Available agents:'];
            const displayAgents = this.agents.slice(0, 10); // Show first 10
            for (const agent of displayAgents) {
                const name = agent.name || '';
                const title = agent.title || '';
                lines.push(`  - ${name} (${title})`);
            }
            if (this.agents.length > 10) {
                lines.push(`  ... (${this.agents.length - 10} more)`);
            }
            return lines.join('\n');
        }
        else {
            const lines = ['Available workflows:'];
            const displayWorkflows = this.workflows.slice(0, 10); // Show first 10
            for (const workflow of displayWorkflows) {
                const name = workflow.name || '';
                const desc = workflow.description || '';
                lines.push(`  - *${name} (${desc})`);
            }
            if (this.workflows.length > 10) {
                lines.push(`  ... (${this.workflows.length - 10} more, use list-workflows for complete list)`);
            }
            return lines.join('\n');
        }
    }
}
//# sourceMappingURL=unified-tool.js.map