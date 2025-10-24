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

import path from 'node:path';
import { ManifestLoader } from '../utils/manifest-loader.js';
import { FileReader } from '../utils/file-reader.js';
import type {
  Agent,
  Workflow,
  ValidationResult,
  BMADToolResult,
  ParsedCommand,
  WorkflowContext,
} from '../types/index.js';

// Validation patterns
const AGENT_NAME_PATTERN = /^[a-z]+(-[a-z]+)*$/;
const WORKFLOW_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 50;
const DANGEROUS_CHARS = [';', '&', '|', '$', '`', '<', '>', '\n', '\r', '(', ')'];
const FUZZY_MATCH_THRESHOLD = 0.70;

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
          matrix[i - 1][j] + 1
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

  constructor(bmadRoot: string) {
    this.bmadRoot = path.resolve(bmadRoot);
    this.manifestLoader = new ManifestLoader(this.bmadRoot);
    this.fileReader = new FileReader(this.bmadRoot);

    // Load manifests on init for validation
    this.agents = this.manifestLoader.loadAgentManifest();
    this.workflows = this.manifestLoader.loadWorkflowManifest();

    console.log(
      `UnifiedBMADTool initialized with ${this.agents.length} agents ` +
      `and ${this.workflows.length} workflows`
    );
  }

  /**
   * Execute unified BMAD command with intelligent routing.
   *
   * @param command Command string to parse and execute
   * @returns Result object with data or error information
   */
  async execute(command: string): Promise<BMADToolResult> {
    // Normalize command (trim whitespace)
    const normalized = command.trim();

    // Empty command → load bmad-master (default)
    if (!normalized) {
      console.log('Empty command, loading bmad-master (default)');
      return this.loadAgent('bmad-master');
    }

    // Check for built-in discovery commands first (before parsing)
    if (normalized === '*list-agents') {
      console.log('Discovery command: list-agents');
      return this.listAgents();
    } else if (normalized === '*list-workflows') {
      console.log('Discovery command: list-workflows');
      return this.listWorkflows();
    } else if (normalized === '*list-tasks') {
      console.log('Discovery command: list-tasks');
      return this.listTasks();
    } else if (normalized === '*help') {
      console.log('Discovery command: help');
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
    const foundDangerous = DANGEROUS_CHARS.filter(c => command.includes(c));
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
      const nonAscii = [...command].filter(c => c.charCodeAt(0) > 127);
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
  private validateName(name: string, commandType: 'agent' | 'workflow'): ValidationResult {
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
      'master': 'bmad-master',
    };

    // Check if it's a known alias
    const canonical = aliases[name];
    if (canonical) {
      console.log(`Resolved alias '${name}' to '${canonical}'`);
      return canonical;
    }

    // Check if adding module prefix resolves to valid agent
    for (const agent of this.agents) {
      const agentName = agent.name;
      const module = agent.module;

      // Check if the name is the suffix of an agent with module prefix
      if (agentName.endsWith(`-${name}`) && agentName.startsWith(`${module}-`)) {
        console.log(`Resolved module alias '${name}' to '${agentName}' (module: ${module})`);
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
    return this.agents.some(a => a.name === canonicalName);
  }

  /**
   * Check if name exists in workflow manifest.
   */
  private isWorkflowName(name: string): boolean {
    return this.workflows.some(w => w.name === name);
  }

  /**
   * Get list of all agent names.
   */
  private getAgentNames(): string[] {
    return this.agents.map(a => a.name);
  }

  /**
   * Get list of all workflow names.
   */
  private getWorkflowNames(): string[] {
    return this.workflows.map(w => w.name);
  }

  /**
   * Check if name matches a valid name but with wrong case.
   */
  private checkCaseMismatch(name: string, validNames: string[]): string | undefined {
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
  private findClosestMatch(inputName: string, validNames: string[]): string | undefined {
    let bestMatch: string | undefined = undefined;
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
  private async loadAgent(agentName: string): Promise<BMADToolResult> {
    // Resolve aliases (e.g., "master" → "bmad-master")
    const canonicalName = this.resolveAgentAlias(agentName);

    console.log(
      `Loading agent: ${canonicalName}${canonicalName !== agentName ? ` (from alias: ${agentName})` : ''}`
    );

    // Find agent in manifest using canonical name
    const agent = this.agents.find(a => a.name === canonicalName);

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
      contentParts.push(`## Agent Definition\n`);
      contentParts.push(`**File:** \`${agentPath}\`\n`);

      try {
        const agentMdContentRaw = this.fileReader.readFile(agentPath);
        // Dynamically replace {project-root} with {mcp-resources}
        const agentMdContent = this.resolveWorkflowPlaceholders(agentMdContentRaw);

        contentParts.push('```markdown');
        contentParts.push(agentMdContent);
        contentParts.push('```\n');
      } catch (error: any) {
        contentParts.push(`[Error reading agent file: ${error.message}]\n`);
        console.error(`Error reading agent file ${agentPath}:`, error);
      }
    }

    // Customization YAML file
    const module = agent.module || 'bmm';
    const customizePath = `bmad/_cfg/agents/${module}-${agentName}.customize.yaml`;

    contentParts.push(`## Agent Customization\n`);
    contentParts.push(`**File:** \`${customizePath}\`\n`);

    try {
      const yamlContentRaw = this.fileReader.readFile(customizePath);
      // Dynamically replace {project-root} with {mcp-resources}
      const yamlContent = this.resolveWorkflowPlaceholders(yamlContentRaw);

      contentParts.push('```yaml');
      contentParts.push(yamlContent);
      contentParts.push('```\n');
    } catch (error: any) {
      contentParts.push(`[Customization file not found or error: ${error.message}]\n`);
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
  private async listAgents(): Promise<BMADToolResult> {
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
  private async listWorkflows(): Promise<BMADToolResult> {
    const contentParts = ['# Available BMAD Workflows\n'];

    if (this.workflows.length === 0) {
      contentParts.push('No workflows found in manifest.\n');
    } else {
      contentParts.push(`Found ${this.workflows.length} workflows:\n`);

      for (let i = 0; i < this.workflows.length; i++) {
        const workflow = this.workflows[i];
        const name = workflow.name || 'unknown';
        const description = workflow.description || 'No description';
        const trigger = workflow.trigger || name;
        const module = workflow.module || 'core';

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
  private async listTasks(): Promise<BMADToolResult> {
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

  /**
   * Show help and command reference.
   */
  private async help(): Promise<BMADToolResult> {
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
  private async executeWorkflow(workflowName: string): Promise<BMADToolResult> {
    console.log(`Executing workflow: ${workflowName}`);

    // Find workflow in manifest
    const workflow = this.workflows.find(w => w.name === workflowName);

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
      } catch (error: any) {
        workflowYaml = `[Error reading workflow file: ${error.message}]`;
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
      agentManifestPath: path.join(this.bmadRoot, 'bmad', '_cfg', 'agent-manifest.csv'),
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

  private formatNameTooShortError(name: string, commandType: 'agent' | 'workflow'): string {
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

  private formatInvalidFormatError(name: string, commandType: 'agent' | 'workflow'): string {
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

  private formatUnknownWorkflowError(name: string, suggestion?: string): string {
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
          `  ... (${this.workflows.length - 10} more, use list-workflows for complete list)`
        );
      }

      return lines.join('\n');
    }
  }
}
