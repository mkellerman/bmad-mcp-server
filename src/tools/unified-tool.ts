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
import { FileScanner } from '../utils/file-scanner.js';
import type {
  Agent,
  Workflow,
  ValidationResult,
  BMADToolResult,
  ParsedCommand,
  WorkflowContext,
} from '../types/index.js';
import type { ScannedFile } from '../utils/file-scanner.js';
import {
  detectManifestDirectory,
  type BmadLocationInfo,
  type BmadPathResolution,
} from '../utils/bmad-path-resolver.js';

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
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const matrix: number[][] = [];

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
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
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
  private bmadRoot: string;
  private manifestLoader: ManifestLoader;
  private fileReader: FileReader;
  private agents: Agent[];
  private workflows: Workflow[];
  private discovery: BmadPathResolution;
  private packageBmadPath: string;
  private userBmadPath: string;
  private projectRoot: string;
  private manifestDir: string;

  constructor(options: { bmadRoot: string; discovery: BmadPathResolution }) {
    const { bmadRoot, discovery } = options;
    this.discovery = discovery;
    this.packageBmadPath = discovery.packageBmadPath;
    this.userBmadPath = discovery.userBmadPath;
    this.projectRoot = discovery.projectRoot;

    this.bmadRoot = path.resolve(bmadRoot);

    // Find a location with actual manifests for ManifestLoader
    // Use the first location with manifestDir, or fall back to package
    const manifestLocation = discovery.locations.find(
      (loc) => loc.status === 'valid' && loc.manifestDir,
    );

    let manifestRoot: string | undefined;
    let manifestDir: string | undefined;

    if (manifestLocation && manifestLocation.manifestDir) {
      manifestRoot = manifestLocation.resolvedRoot;
      manifestDir = manifestLocation.manifestDir;
    } else {
      // Fallback: check if packageBmadPath has a _cfg directory
      const packageCfgDir = path.join(discovery.packageBmadPath, '_cfg');
      if (fs.existsSync(packageCfgDir) && fs.statSync(packageCfgDir).isDirectory()) {
        manifestRoot = discovery.packageBmadPath;
        manifestDir = packageCfgDir;
      } else {
        throw new Error(
          `No valid manifest directory found. Searched locations: ${discovery.locations.map(loc => loc.resolvedRoot ?? loc.originalPath).join(', ')} and fallback package path ${packageCfgDir}`
        );
      }
    }

    this.manifestDir = manifestDir;
    this.manifestLoader = new ManifestLoader(manifestRoot);

    // Collect all BMAD roots for fallback file loading
    // Priority order: project -> cli -> env -> user -> package
    // Only include locations with manifestDir (actual _cfg directory found)
    // to ensure FileReader can find the actual BMAD assets
    const validRoots: string[] = [];

    // Sort all locations by priority that have manifestDir
    const sortedLocations = [...discovery.locations]
      .filter((loc) => loc.status === 'valid' && loc.manifestDir)
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

    console.error(
      `FileReader fallback chain (${validRoots.length} locations):`,
    );
    validRoots.forEach((root, idx) => {
      const location = discovery.locations.find(
        (loc) => loc.resolvedRoot === root || loc.originalPath === root,
      );
      const source = location?.displayName ?? 'Package';
      const status = location ? ` [${location.status}]` : '';
      console.error(`  ${idx + 1}. ${source}${status}: ${root}`);
    });

    this.fileReader = new FileReader(validRoots);

    // Load manifests on init for validation
    this.agents = this.manifestLoader.loadAgentManifest();
    this.workflows = this.manifestLoader.loadWorkflowManifest();

    console.error(
      `UnifiedBMADTool initialized with ${this.agents.length} agents ` +
        `and ${this.workflows.length} workflows`,
    );
  }

  /**
   * Execute unified BMAD command with intelligent routing.
   *
   * @param command Command string to parse and execute
   * @returns Result object with data or error information
   */
  execute(command: string): BMADToolResult {
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
    } else if (normalized === '*list-workflows') {
      console.error('Discovery command: list-workflows');
      return this.listWorkflows();
    } else if (normalized === '*list-tasks') {
      console.error('Discovery command: list-tasks');
      return this.listTasks();
    } else if (normalized === '*doctor' || normalized.startsWith('*doctor ')) {
      console.error('Discovery command: doctor');
      const fullReport = normalized.includes('--full');
      return this.discover(fullReport);
    } else if (normalized.startsWith('*init')) {
      console.error('Initialization command received');
      return this.init(normalized);
    } else if (normalized === '*help') {
      console.error('Discovery command: help');
      return this.help();
    }

    // Parse command to determine type
    const parsedCommand = this.parseCommand(normalized);

    if (parsedCommand.type === 'error') {
      return this.formatErrorResponse(parsedCommand.validation);
    }

    // Validate the name
    const validation = this.validateName(
      parsedCommand.name,
      parsedCommand.type,
    );
    if (!validation.valid) {
      return this.formatErrorResponse(validation);
    }

    // Route to appropriate handler
    if (parsedCommand.type === 'workflow') {
      return this.executeWorkflow(parsedCommand.name);
    } else {
      return this.loadAgent(parsedCommand.name);
    }
  }

  /**
   * Parse command to determine type and extract name.
   */
  private parseCommand(command: string): ParsedCommand {
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
    } else if (command.startsWith('*')) {
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
    } else {
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
  private checkSecurity(command: string): ValidationResult {
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
  private validateName(
    name: string,
    commandType: 'agent' | 'workflow',
  ): ValidationResult {
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
    const pattern =
      commandType === 'workflow' ? WORKFLOW_NAME_PATTERN : AGENT_NAME_PATTERN;
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
    } else {
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
  private resolveAgentAlias(name: string): string {
    // Define common aliases
    const aliases: Record<string, string> = {
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
      if (
        agentName.endsWith(`-${name}`) &&
        agentName.startsWith(`${module}-`)
      ) {
        console.error(
          `Resolved module alias '${name}' to '${agentName}' (module: ${module})`,
        );
        return agentName;
      }
    }

    return name;
  }

  /**
   * Check if name exists in agent manifest (after alias resolution).
   */
  private isAgentName(name: string): boolean {
    const canonicalName = this.resolveAgentAlias(name);
    return this.agents.some((a) => a.name === canonicalName);
  }

  /**
   * Check if name exists in workflow manifest.
   */
  private isWorkflowName(name: string): boolean {
    return this.workflows.some((w) => w.name === name);
  }

  /**
   * Get list of all agent names.
   */
  private getAgentNames(): string[] {
    return this.agents.map((a) => a.name);
  }

  /**
   * Get list of all workflow names.
   */
  private getWorkflowNames(): string[] {
    return this.workflows.map((w) => w.name);
  }

  /**
   * Check if name matches a valid name but with wrong case.
   */
  private checkCaseMismatch(
    name: string,
    validNames: string[],
  ): string | undefined {
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
  private findClosestMatch(
    inputName: string,
    validNames: string[],
  ): string | undefined {
    let bestMatch: string | undefined = undefined;
    let bestScore = 0.0;

    for (const validName of validNames) {
      const ratio = similarity(
        inputName.toLowerCase(),
        validName.toLowerCase(),
      );
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
  private loadAgent(agentName: string): BMADToolResult {
    // Resolve aliases (e.g., "master" → "bmad-master")
    const canonicalName = this.resolveAgentAlias(agentName);

    console.error(
      `Loading agent: ${canonicalName}${canonicalName !== agentName ? ` (from alias: ${agentName})` : ''}`,
    );

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
    const contentParts: string[] = [];

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
        const agentMdContent =
          this.resolveWorkflowPlaceholders(agentMdContentRaw);

        contentParts.push('```markdown');
        contentParts.push(agentMdContent);
        contentParts.push('```\n');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      contentParts.push(
        `[Customization file not found or error: ${errorMessage}]\n`,
      );
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
  private listAgents(): BMADToolResult {
    const contentParts = ['# Available BMAD Agents\n'];

    if (this.agents.length === 0) {
      contentParts.push('No agents found in manifest.\n');
    } else {
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
    contentParts.push(
      '- Example: `bmad analyst` loads Mary, the Business Analyst\n',
    );

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
  private listWorkflows(): BMADToolResult {
    const contentParts = ['# Available BMAD Workflows\n'];

    if (this.workflows.length === 0) {
      contentParts.push('No workflows found in manifest.\n');
    } else {
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
    contentParts.push(
      '- Example: `bmad *party-mode` starts group discussion\n',
    );

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
  private listTasks(): BMADToolResult {
    const contentParts = ['# Available BMAD Tasks\n'];

    const tasks = this.manifestLoader.loadTaskManifest();

    if (tasks.length === 0) {
      contentParts.push('No tasks found in manifest.\n');
    } else {
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

    contentParts.push(
      '\n**Note:** Tasks are referenced within workflows and agent instructions.\n',
    );

    return {
      success: true,
      type: 'list',
      listType: 'tasks',
      count: tasks.length,
      content: contentParts.join('\n'),
      exitCode: 0,
    };
  }

  /**
   * Render a visual health bar for the diagnostic summary
   */
  private renderHealthBar(score: number): string {
    const barLength = 10;
    const filled = Math.round((score / 100) * barLength);
    const empty = barLength - filled;

    const filledChar = '█';
    const emptyChar = '░';

    return `│ ${filledChar.repeat(filled)}${emptyChar.repeat(empty)} │`;
  }

  private discover(fullReport = false): BMADToolResult {
    const active = this.discovery.activeLocation;
    const lines: string[] = [];

    lines.push(
      '╭─────────────────────────────────────────────────────────────╮',
    );
    lines.push(
      '│          🏥 BMAD Health Diagnostic                          │',
    );
    lines.push(
      '╰─────────────────────────────────────────────────────────────╯',
    );
    lines.push('');

    // Scan each valid location in priority order
    const sorted = [...this.discovery.locations]
      .filter((loc) => loc.status === 'valid' && loc.resolvedRoot)
      .sort((a, b) => a.priority - b.priority);

    // Collect statistics for summary
    const stats = {
      totalAgents: 0,
      totalWorkflows: 0,
      totalTasks: 0,
      registeredAgents: 0,
      registeredWorkflows: 0,
      registeredTasks: 0,
      orphanedAgents: 0,
      orphanedWorkflows: 0,
      orphanedTasks: 0,
      missingAgents: 0,
      missingWorkflows: 0,
      missingTasks: 0,
    };

    // Scan all locations first to gather statistics
    const inventories = new Map<
      BmadLocationInfo,
      {
        agents: ScannedFile[];
        workflows: ScannedFile[];
        tasks: ScannedFile[];
      }
    >();

    // Track unique files across all locations to avoid double-counting
    const seenRegistered = {
      agents: new Set<string>(),
      workflows: new Set<string>(),
      tasks: new Set<string>(),
    };
    const seenOrphaned = {
      agents: new Set<string>(),
      workflows: new Set<string>(),
      tasks: new Set<string>(),
    };
    const seenMissing = {
      agents: new Set<string>(),
      workflows: new Set<string>(),
      tasks: new Set<string>(),
    };

    for (const location of sorted) {
      const inventory = this.scanLocation(location, sorted);
      if (inventory) {
        inventories.set(location, inventory);

        // Count statistics - only count each unique file once
        for (const agent of inventory.agents) {
          const filePath = path.join(location.resolvedRoot ?? '', agent.path);
          const fileExists = fs.existsSync(filePath);

          if (agent.inManifest && fileExists) {
            if (!seenRegistered.agents.has(agent.name)) {
              stats.registeredAgents++;
              seenRegistered.agents.add(agent.name);
            }
          } else if (!agent.inManifest && fileExists) {
            if (!seenOrphaned.agents.has(agent.name)) {
              stats.orphanedAgents++;
              seenOrphaned.agents.add(agent.name);
            }
          } else if (agent.inManifest && !fileExists) {
            if (!seenMissing.agents.has(agent.name)) {
              stats.missingAgents++;
              seenMissing.agents.add(agent.name);
            }
          }
        }

        for (const workflow of inventory.workflows) {
          const filePath = path.join(
            location.resolvedRoot ?? '',
            workflow.path,
          );
          const fileExists = fs.existsSync(filePath);

          if (workflow.inManifest && fileExists) {
            if (!seenRegistered.workflows.has(workflow.name)) {
              stats.registeredWorkflows++;
              seenRegistered.workflows.add(workflow.name);
            }
          } else if (!workflow.inManifest && fileExists) {
            if (!seenOrphaned.workflows.has(workflow.name)) {
              stats.orphanedWorkflows++;
              seenOrphaned.workflows.add(workflow.name);
            }
          } else if (workflow.inManifest && !fileExists) {
            if (!seenMissing.workflows.has(workflow.name)) {
              stats.missingWorkflows++;
              seenMissing.workflows.add(workflow.name);
            }
          }
        }

        for (const task of inventory.tasks) {
          const filePath = path.join(location.resolvedRoot ?? '', task.path);
          const fileExists = fs.existsSync(filePath);

          if (task.inManifest && fileExists) {
            if (!seenRegistered.tasks.has(task.name)) {
              stats.registeredTasks++;
              seenRegistered.tasks.add(task.name);
            }
          } else if (!task.inManifest && fileExists) {
            if (!seenOrphaned.tasks.has(task.name)) {
              stats.orphanedTasks++;
              seenOrphaned.tasks.add(task.name);
            }
          } else if (task.inManifest && !fileExists) {
            if (!seenMissing.tasks.has(task.name)) {
              stats.missingTasks++;
              seenMissing.tasks.add(task.name);
            }
          }
        }

        stats.totalAgents += inventory.agents.length;
        stats.totalWorkflows += inventory.workflows.length;
        stats.totalTasks += inventory.tasks.length;
      }
    }

    if (!fullReport) {
      // SUMMARY VIEW (default) - Redesigned for better UX

      // Calculate health score
      const totalRegistered =
        stats.registeredAgents +
        stats.registeredWorkflows +
        stats.registeredTasks;
      const totalIssues =
        stats.orphanedAgents +
        stats.orphanedWorkflows +
        stats.orphanedTasks +
        stats.missingAgents +
        stats.missingWorkflows +
        stats.missingTasks;
      const healthScore =
        totalRegistered > 0
          ? Math.round(
              (totalRegistered / (totalRegistered + totalIssues)) * 100,
            )
          : 0;

      // Header with health status
      const healthEmoji =
        healthScore === 100
          ? '💚'
          : healthScore >= 80
            ? '💛'
            : healthScore >= 50
              ? '🧡'
              : '❤️';
      const healthText =
        healthScore === 100
          ? 'Excellent'
          : healthScore >= 80
            ? 'Good'
            : healthScore >= 50
              ? 'Fair'
              : 'Needs Attention';

      lines.push(
        '┌─ System Health ────────────────────────────────────────────┐',
      );
      lines.push(
        `│  ${healthEmoji} ${healthText.padEnd(12)} │ Health Score: ${String(healthScore).padStart(3)}% ${this.renderHealthBar(healthScore)}`,
      );
      lines.push(
        '└────────────────────────────────────────────────────────────┘',
      );
      lines.push('');

      // Active Location - simplified and cleaner
      lines.push('📍 **Active Location**');
      lines.push(`   ${active.displayName} · Priority ${active.priority}`);
      const formattedPath = this.formatLocationPath(active);
      const truncatedPath =
        formattedPath.length > 50
          ? '...' + formattedPath.slice(-47)
          : formattedPath;
      lines.push(`   \`${truncatedPath}\``);
      lines.push('');

      // Resource Summary - visual cards layout
      lines.push('📦 **Resources Available**');
      lines.push('');
      lines.push('   ┌─ Agents ──────┬─ Workflows ───┬─ Tasks ───────┐');
      lines.push(
        `   │  ✓ ${String(stats.registeredAgents).padStart(3)} ready  │  ✓ ${String(stats.registeredWorkflows).padStart(3)} ready │  ✓ ${String(stats.registeredTasks).padStart(3)} ready  │`,
      );
      lines.push('   └───────────────┴───────────────┴───────────────┘');
      lines.push('');

      const hasIssues =
        stats.orphanedAgents +
          stats.orphanedWorkflows +
          stats.orphanedTasks +
          stats.missingAgents +
          stats.missingWorkflows +
          stats.missingTasks >
        0;

      if (hasIssues) {
        lines.push('⚠️  **Issues Detected**');
        lines.push('');

        if (
          stats.orphanedAgents + stats.orphanedWorkflows + stats.orphanedTasks >
          0
        ) {
          lines.push('   🔸 **Orphaned Files** (exist but not in manifest)');
          if (stats.orphanedAgents > 0)
            lines.push(
              `      • ${stats.orphanedAgents} agent${stats.orphanedAgents > 1 ? 's' : ''}`,
            );
          if (stats.orphanedWorkflows > 0)
            lines.push(
              `      • ${stats.orphanedWorkflows} workflow${stats.orphanedWorkflows > 1 ? 's' : ''}`,
            );
          if (stats.orphanedTasks > 0)
            lines.push(
              `      • ${stats.orphanedTasks} task${stats.orphanedTasks > 1 ? 's' : ''}`,
            );
          lines.push('      💡 Add these to manifest CSV files in `_cfg/`');
          lines.push('');
        }

        if (
          stats.missingAgents + stats.missingWorkflows + stats.missingTasks >
          0
        ) {
          lines.push('   🔸 **Missing Files** (in manifest but not found)');
          if (stats.missingAgents > 0)
            lines.push(
              `      • ${stats.missingAgents} agent${stats.missingAgents > 1 ? 's' : ''}`,
            );
          if (stats.missingWorkflows > 0)
            lines.push(
              `      • ${stats.missingWorkflows} workflow${stats.missingWorkflows > 1 ? 's' : ''}`,
            );
          if (stats.missingTasks > 0)
            lines.push(
              `      • ${stats.missingTasks} task${stats.missingTasks > 1 ? 's' : ''}`,
            );
          lines.push(
            '      💡 Remove entries from manifest CSV files in `_cfg/`',
          );
          lines.push('');
        }
      } else {
        lines.push('✨ **All Clear!**');
        lines.push('   All files are properly registered and available.');
        lines.push('');
      }

      // Scanned Locations - compact list
      if (sorted.length > 1) {
        lines.push('🗂️  **Scanned Locations**');
        for (const location of sorted) {
          const marker = location === active ? '← active' : '';
          const priority = `${location.priority}.`;
          lines.push(`   ${priority} ${location.displayName} ${marker}`);
        }
        lines.push('');
      }

      lines.push(
        '─────────────────────────────────────────────────────────────',
      );
      lines.push('');
      lines.push(
        '💡 *Tip:* Run `bmad *doctor --full` for detailed file-by-file listing',
      );
    } else {
      // FULL DETAILED REPORT - Redesigned
      lines.push(
        '┌─ Active Configuration ─────────────────────────────────────┐',
      );
      lines.push(`│  Location: ${active.displayName}`);
      lines.push(`│  Priority: ${active.priority}`);
      lines.push(`│  Path: ${this.formatLocationPath(active)}`);
      lines.push(`│  Status: ${this.formatLocationStatus(active)}`);
      if (active.manifestDir) {
        lines.push(`│  Manifest: ${active.manifestDir}`);
      }
      lines.push(
        '└────────────────────────────────────────────────────────────┘',
      );
      lines.push('');

      lines.push('📋 **Detailed Inventory**');
      lines.push('');

      for (const location of sorted) {
        const isActive = location === active;
        const marker = isActive ? ' ⚡' : '';

        lines.push(
          `╭─ ${location.displayName}${marker} ${'─'.repeat(Math.max(0, 48 - location.displayName.length - marker.length))}╮`,
        );
        lines.push(`│ 📂 \`${this.formatLocationPath(location)}\``);

        const inventory = inventories.get(location);

        if (inventory) {
          lines.push('│');
          lines.push('│ 👤 **Agents:**');
          this.formatInventoryFull(lines, inventory.agents, location, 'agent');

          lines.push('│');
          lines.push('│ ⚙️  **Workflows:**');
          this.formatInventoryFull(
            lines,
            inventory.workflows,
            location,
            'workflow',
          );

          lines.push('│');
          lines.push('│ 📝 **Tasks:**');
          this.formatInventoryFull(lines, inventory.tasks, location, 'task');
        } else {
          lines.push('│   ⚠️  Unable to scan this location');
        }

        lines.push('╰' + '─'.repeat(60) + '╯');
        lines.push('');
      }

      lines.push('🔄 **Resolution Priority**');
      lines.push('');
      lines.push('   BMAD checks locations in this order:');
      for (const location of sorted) {
        const marker = location === active ? '← active' : '';
        const status = location.status === 'valid' ? '✓' : '✗';
        lines.push(
          `   ${status} ${location.priority}. ${location.displayName} ${marker}`,
        );
      }

      lines.push('');
      lines.push(
        '┌─ Legend ───────────────────────────────────────────────────┐',
      );
      lines.push(
        '│  ✅ Registered  → File exists and in manifest (will load)  │',
      );
      lines.push(
        '│  ⚠️  Orphaned   → File exists but not in manifest          │',
      );
      lines.push(
        '│  ❌ Missing     → In manifest but file not found           │',
      );
      lines.push(
        '└────────────────────────────────────────────────────────────┘',
      );
    }

    lines.push('');

    // Next Steps - more actionable and contextual
    const hasOrphaned =
      stats.orphanedAgents + stats.orphanedWorkflows + stats.orphanedTasks > 0;
    const hasMissing =
      stats.missingAgents + stats.missingWorkflows + stats.missingTasks > 0;

    if (hasOrphaned || hasMissing) {
      lines.push('🛠️  **Recommended Actions**');
      lines.push('');
      if (hasMissing) {
        lines.push('   1. Fix missing files: Update CSV manifests in `_cfg/`');
      }
      if (hasOrphaned) {
        lines.push(
          '   2. Register orphaned files: Add entries to `_cfg/*.csv`',
        );
      }
      lines.push('   3. Initialize new BMAD directory: `bmad *init --help`');
      lines.push('');
    }

    return {
      success: true,
      type: 'diagnostic',
      content: lines.join('\n'),
      data: {
        activeLocation: active,
        locations: sorted,
        statistics: stats,
      },
      exitCode: 0,
    };
  }

  /**
   * Scan a location for BMAD files and compare with ALL manifests across all locations.
   * A file is only considered orphaned if it exists but is NOT in any manifest anywhere.
   */
  private scanLocation(
    location: BmadLocationInfo,
    allLocations: BmadLocationInfo[],
  ):
    | {
        agents: ScannedFile[];
        workflows: ScannedFile[];
        tasks: ScannedFile[];
      }
    | undefined {
    if (!location.resolvedRoot) {
      return undefined;
    }

    try {
      const scanner = new FileScanner(location.resolvedRoot);
      const scanned = scanner.scan();

      // Load manifests from ALL locations to check if files are registered anywhere
      const allAgents = new Set<string>();
      const allWorkflows = new Set<string>();
      const allTasks = new Set<string>();

      for (const loc of allLocations) {
        if (!loc.resolvedRoot) continue;
        try {
          const loader = new ManifestLoader(loc.resolvedRoot);
          loader.loadAgentManifest().forEach((a) => {
            if (a.name) allAgents.add(a.name);
          });
          loader.loadWorkflowManifest().forEach((w) => {
            if (w.name) allWorkflows.add(w.name);
          });
          loader.loadTaskManifest().forEach((t) => {
            if (t.name) allTasks.add(t.name);
          });
        } catch {
          // Skip locations with manifest errors
        }
      }

      // Mark files based on whether they're in ANY manifest
      for (const agent of scanned.agents) {
        agent.inManifest = allAgents.has(agent.name);
      }

      for (const workflow of scanned.workflows) {
        workflow.inManifest = allWorkflows.has(workflow.name);
      }

      for (const task of scanned.tasks) {
        task.inManifest = allTasks.has(task.name);
      }

      // Load THIS location's manifest to find missing files
      const loader = new ManifestLoader(location.resolvedRoot);
      const agentManifest = loader.loadAgentManifest();
      const workflowManifest = loader.loadWorkflowManifest();
      const taskManifest = loader.loadTaskManifest();

      // Add manifest entries from THIS location that have no file in THIS location

      // Add manifest entries that have no file
      for (const agent of agentManifest) {
        if (agent.name && !scanned.agents.some((a) => a.name === agent.name)) {
          scanned.agents.push({
            name: agent.name,
            path: agent.path ?? '',
            type: 'agent',
            inManifest: true,
          });
        }
      }

      for (const workflow of workflowManifest) {
        if (
          workflow.name &&
          !scanned.workflows.some((w) => w.name === workflow.name)
        ) {
          scanned.workflows.push({
            name: workflow.name,
            path: workflow.path ?? '',
            type: 'workflow',
            inManifest: true,
          });
        }
      }

      for (const task of taskManifest) {
        if (task.name && !scanned.tasks.some((t) => t.name === task.name)) {
          scanned.tasks.push({
            name: task.name,
            path: task.path ?? '',
            type: 'task',
            inManifest: true,
          });
        }
      }

      return scanned;
    } catch (error) {
      console.error(`Error scanning ${location.resolvedRoot}:`, error);
      return undefined;
    }
  }

  /**
   * Format inventory for display.
   */
  private formatInventory(
    lines: string[],
    items: ScannedFile[],
    location: BmadLocationInfo,
    type: 'agent' | 'workflow' | 'task',
  ): void {
    if (items.length === 0) {
      lines.push('- None found');
      return;
    }

    // Sort: registered first, then orphaned, then missing
    const sorted = [...items].sort((a, b) => {
      const aPath = path.join(location.resolvedRoot ?? '', a.path);
      const bPath = path.join(location.resolvedRoot ?? '', b.path);
      const aExists = fs.existsSync(aPath);
      const bExists = fs.existsSync(bPath);

      // Registered (in manifest + exists)
      const aRegistered = a.inManifest && aExists;
      const bRegistered = b.inManifest && bExists;
      if (aRegistered && !bRegistered) return -1;
      if (!aRegistered && bRegistered) return 1;

      // Orphaned (exists but not in manifest)
      const aOrphaned = !a.inManifest && aExists;
      const bOrphaned = !b.inManifest && bExists;
      if (aOrphaned && !bOrphaned) return -1;
      if (!aOrphaned && bOrphaned) return 1;

      // Missing (in manifest but doesn't exist)
      return 0;
    });

    for (const item of sorted) {
      const filePath = path.join(location.resolvedRoot ?? '', item.path);
      const fileExists = fs.existsSync(filePath);
      let status: string;

      if (item.inManifest && fileExists) {
        status = '✅';
      } else if (!item.inManifest && fileExists) {
        status = '⚠️ ';
      } else if (item.inManifest && !fileExists) {
        status = '❌';
      } else {
        status = '❓';
      }

      const prefix = type === 'workflow' ? '*' : '';
      lines.push(`- ${status} \`${prefix}${item.name}\` - ${item.path}`);
    }
  }

  /**
   * Format inventory for full detailed display with borders.
   */
  private formatInventoryFull(
    lines: string[],
    items: ScannedFile[],
    location: BmadLocationInfo,
    type: 'agent' | 'workflow' | 'task',
  ): void {
    if (items.length === 0) {
      lines.push('│   None found');
      return;
    }

    // Sort: registered first, then orphaned, then missing
    const sorted = [...items].sort((a, b) => {
      const aPath = path.join(location.resolvedRoot ?? '', a.path);
      const bPath = path.join(location.resolvedRoot ?? '', b.path);
      const aExists = fs.existsSync(aPath);
      const bExists = fs.existsSync(bPath);

      // Registered (in manifest + exists)
      const aRegistered = a.inManifest && aExists;
      const bRegistered = b.inManifest && bExists;
      if (aRegistered && !bRegistered) return -1;
      if (!aRegistered && bRegistered) return 1;

      // Orphaned (exists but not in manifest)
      const aOrphaned = !a.inManifest && aExists;
      const bOrphaned = !b.inManifest && bExists;
      if (aOrphaned && !bOrphaned) return -1;
      if (!aOrphaned && bOrphaned) return 1;

      // Missing (in manifest but doesn't exist)
      return 0;
    });

    for (const item of sorted) {
      const filePath = path.join(location.resolvedRoot ?? '', item.path);
      const fileExists = fs.existsSync(filePath);
      let status: string;

      if (item.inManifest && fileExists) {
        status = '✅';
      } else if (!item.inManifest && fileExists) {
        status = '⚠️ ';
      } else if (item.inManifest && !fileExists) {
        status = '❌';
      } else {
        status = '❓';
      }

      const prefix = type === 'workflow' ? '*' : '';
      const itemName = `${prefix}${item.name}`;

      // Truncate path if too long for display
      const displayPath =
        item.path.length > 40 ? '...' + item.path.slice(-37) : item.path;

      lines.push(`│   ${status} ${itemName.padEnd(25)} ${displayPath}`);
    }
  }

  private init(command: string): BMADToolResult {
    const rawArgs = command.slice('*init'.length).trim();
    const normalizedArgs = rawArgs.toLowerCase();

    if (
      !rawArgs ||
      normalizedArgs === '--project' ||
      normalizedArgs === 'project'
    ) {
      return this.performInitialization({ scope: 'project' });
    }

    if (normalizedArgs === '--user' || normalizedArgs === 'user') {
      return this.performInitialization({ scope: 'user' });
    }

    if (
      normalizedArgs === '--help' ||
      normalizedArgs === '-h' ||
      normalizedArgs === 'help'
    ) {
      return this.initHelp();
    }

    return this.performInitialization({ scope: 'custom', customPath: rawArgs });
  }

  private initHelp(): BMADToolResult {
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

  private performInitialization(options: {
    scope: 'project' | 'user' | 'custom';
    customPath?: string;
  }): BMADToolResult {
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
    } else {
      fs.mkdirSync(target, { recursive: true });
    }

    try {
      this.copyBmadTemplate(source, target);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
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

  private resolveInitTarget(options: {
    scope: 'project' | 'user' | 'custom';
    customPath?: string;
  }): string | undefined {
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

  private expandHomePath(input: string): string {
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

  private copyBmadTemplate(source: string, destination: string): void {
    const entries = fs.readdirSync(source, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const destinationPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        fs.mkdirSync(destinationPath, { recursive: true });
        this.copyBmadTemplate(sourcePath, destinationPath);
      } else {
        fs.copyFileSync(
          sourcePath,
          destinationPath,
          fs.constants.COPYFILE_EXCL,
        );
      }
    }
  }

  private buildInitSuccessMessage(
    scope: 'project' | 'user' | 'custom',
    target: string,
  ): string {
    const lines: string[] = [];
    lines.push('# BMAD Templates Copied');
    lines.push('');
    lines.push(`Scope: ${scope}`);
    lines.push(`Location: ${target}`);
    lines.push('');
    lines.push('Customize agents, workflows, and tasks in this directory.');
    lines.push('');
    if (scope === 'project') {
      lines.push(
        'This project BMAD directory overrides user and package defaults.',
      );
      lines.push(
        'Consider adding `bmad/` to `.gitignore` if these templates should remain local.',
      );
    } else if (scope === 'user') {
      lines.push(
        'User templates apply when no project or environment override is present.',
      );
    } else {
      lines.push('Set `BMAD_ROOT` to this path to use the custom templates:');
      lines.push(`export BMAD_ROOT=${target}`);
    }
    lines.push('');
    lines.push(
      'After making changes, restart the BMAD MCP server or reconnect your client.',
    );
    lines.push('Run `bmad *doctor` to verify the active location.');
    lines.push('');
    lines.push(
      'Priority order: project -> command argument -> BMAD_ROOT -> user -> package',
    );

    return lines.join('\n');
  }

  private getLocationStats(
    location: BmadLocationInfo,
  ): { agents: number; workflows: number; tasks: number } | undefined {
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
    } catch (error) {
      console.warn(
        `Unable to load manifests for ${location.resolvedRoot}:`,
        error,
      );
      return undefined;
    }
  }

  private formatLocationPath(location: BmadLocationInfo): string {
    return location.resolvedRoot ?? location.originalPath ?? 'not configured';
  }

  private formatLocationStatus(location: BmadLocationInfo): string {
    return location.status.toUpperCase();
  }

  /**
   * Show help and command reference.
   */
  private help(): BMADToolResult {
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
      '- `bmad *doctor` → Quick diagnostic summary',
      '- `bmad *doctor --full` → Detailed file-by-file inventory',
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
  private executeWorkflow(workflowName: string): BMADToolResult {
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
    let workflowYaml: string | undefined;

    if (workflowPath) {
      try {
        const workflowYamlRaw = this.fileReader.readFile(workflowPath);
        // Dynamically replace {project-root} with {mcp-resources}
        workflowYaml = this.resolveWorkflowPlaceholders(workflowYamlRaw);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        workflowYaml = `[Error reading workflow file: ${errorMessage}]`;
        console.error(`Error reading workflow file ${workflowPath}:`, error);
      }
    }

    // Try to load instructions.md from workflow directory
    let instructions: string | undefined;
    if (workflowPath) {
      const workflowDir = path.dirname(workflowPath);
      const instructionsPath = path.join(workflowDir, 'instructions.md');

      try {
        const instructionsRaw = this.fileReader.readFile(instructionsPath);
        // Dynamically replace {project-root} with {mcp-resources}
        instructions = this.resolveWorkflowPlaceholders(instructionsRaw);
      } catch {
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
  private formatErrorResponse(validation: ValidationResult): BMADToolResult {
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
  private buildWorkflowContext(): WorkflowContext {
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
  private resolveWorkflowPlaceholders(content: string): string {
    return content.replace(/{project-root}/g, '{mcp-resources}');
  }

  /**
   * Get BMAD processing instructions for agents.
   */
  private getAgentInstructions(): string {
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

  private formatTooManyArgsError(parts: string[]): string {
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

  private formatDoubleAsteriskError(workflowName: string): string {
    return `Error: Invalid syntax

Workflows require exactly one asterisk (*) prefix, not two (**).

Correct syntax:
  bmad *${workflowName}

Try: bmad *${workflowName}`;
  }

  private formatMissingWorkflowNameError(): string {
    return `Error: Missing workflow name

The asterisk (*) prefix requires a workflow name.

Correct syntax:
  bmad *<workflow-name>

Example:
  bmad *party-mode

To list all workflows, try:
  bmad list-workflows`;
  }

  private formatMissingAsteriskError(workflowName: string): string {
    return `Error: Missing workflow prefix

'${workflowName}' appears to be a workflow name, but is missing the asterisk (*) prefix.

Workflows must be invoked with the asterisk prefix:
  Correct:   bmad *${workflowName}
  Incorrect: bmad ${workflowName}

To load an agent instead, use:
  bmad <agent-name>

Did you mean: bmad *${workflowName}?`;
  }

  private formatDangerousCharsError(chars: string[]): string {
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

  private formatNonAsciiError(chars: string[]): string {
    return `Error: Non-ASCII characters detected

The command contains non-ASCII characters: ${chars.join(', ')}

Agent and workflow names must use ASCII characters only:
  - Lowercase letters (a-z)
  - Numbers (0-9, workflows only)
  - Hyphens (-)

Try using ASCII equivalents.`;
  }

  private formatNameTooShortError(
    name: string,
    commandType: 'agent' | 'workflow',
  ): string {
    const entity = commandType === 'agent' ? 'Agent' : 'Workflow';
    const available = this.formatAvailableList(commandType);

    return `Error: ${entity} name too short

${entity} name '${name}' is only ${name.length} character(s) long. Names must be at least ${MIN_NAME_LENGTH} characters.

${available}

Try: bmad <agent-name>`;
  }

  private formatNameTooLongError(name: string, length: number): string {
    return `Error: Name too long

The provided name is ${length} characters long. Names must be at most ${MAX_NAME_LENGTH} characters.

Please use a shorter agent or workflow name.`;
  }

  private formatInvalidFormatError(
    name: string,
    commandType: 'agent' | 'workflow',
  ): string {
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
    } else {
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

  private formatUnknownAgentError(name: string, suggestion?: string): string {
    let message = `Error: Unknown agent '${name}'\n\n`;

    if (suggestion) {
      message += `Did you mean: ${suggestion}?\n\n`;
    }

    message += `The agent '${name}' is not available in the BMAD system.\n\n`;
    message += this.formatAvailableList('agent');
    message += '\nTry: bmad <agent-name>\nExample: bmad analyst';

    return message;
  }

  private formatUnknownWorkflowError(
    name: string,
    suggestion?: string,
  ): string {
    let message = `Error: Unknown workflow '*${name}'\n\n`;

    if (suggestion) {
      message += `Did you mean: *${suggestion}?\n\n`;
    }

    message += `The workflow '${name}' is not available in the BMAD system.\n\n`;
    message += this.formatAvailableList('workflow');
    message += '\nTry: bmad *<workflow-name>\nExample: bmad *party-mode';

    return message;
  }

  private formatCaseMismatchError(name: string, correctName: string): string {
    return `Error: Case sensitivity mismatch

Agent names are case-sensitive. '${name}' does not match '${correctName}'.

Did you mean: bmad ${correctName}?

Note: All agent and workflow names use lowercase letters only.`;
  }

  private formatAvailableList(commandType: 'agent' | 'workflow'): string {
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
    } else {
      const lines = ['Available workflows:'];
      const displayWorkflows = this.workflows.slice(0, 10); // Show first 10

      for (const workflow of displayWorkflows) {
        const name = workflow.name || '';
        const desc = workflow.description || '';
        lines.push(`  - *${name} (${desc})`);
      }

      if (this.workflows.length > 10) {
        lines.push(
          `  ... (${this.workflows.length - 10} more, use list-workflows for complete list)`,
        );
      }

      return lines.join('\n');
    }
  }
}
