/**
 * Unified BMAD Tool orchestrator.
 * Thin class delegating to parser, validators, loaders, and tools.
 */

import path from 'node:path';
import type {
  Agent,
  Workflow,
  ValidationResult,
  BMADToolResult,
  WorkflowContext,
} from '../../types/index.js';
import type { BmadPathResolution } from '../../utils/bmad-path-resolver.js';
import { FileReader } from '../../utils/file-reader.js';
import { MasterManifestService } from '../../services/master-manifest-service.js';
import {
  convertAgents,
  convertWorkflows,
} from '../../utils/master-manifest-adapter.js';

import { loadAgent as loadAgentPayload } from './agent-loader.js';
import {
  parseRemoteAgentRef,
  loadRemoteAgent,
  loadRemoteModule,
} from '../../utils/dynamic-agent-loader.js';
import { parseRemoteArgs } from '../../utils/remote-registry.js';
import { executeWorkflow as executeWorkflowPayload } from './workflow-executor.js';

import { doctor as doctorReport } from '../internal/doctor.js';
import { handleInit as initHandler } from '../internal/init.js';
import { handleListCommand as handleList } from '../internal/list.js';
import type { RemoteRegistry } from '../../utils/remote-registry.js';
import { parseCommand } from './parser.js';
import { validateName as validateInputName } from './validators.js';
import logger from '../../utils/logger.js';
import { resolveAvailableCatalog } from '../../utils/availability-resolver.js';

/**
 * Unified BMAD Tool - Main orchestrator for agent and workflow loading.
 *
 * Uses master manifest for resource discovery and FileReader for file loading.
 * Delegates actual loading to specialized loaders (agent-loader, workflow-executor).
 */
export class UnifiedBMADTool {
  private bmadRoot: string;
  private fileReader: FileReader;
  private agents: Agent[];
  private workflows: Workflow[];
  private discovery: BmadPathResolution;
  private userBmadPath: string;
  private projectRoot: string;
  private masterService: MasterManifestService;
  private remoteRegistry?: RemoteRegistry;

  constructor(options: {
    bmadRoot: string;
    discovery: BmadPathResolution;
    masterManifestService: MasterManifestService;
    remoteRegistry?: RemoteRegistry;
  }) {
    const { bmadRoot, discovery, masterManifestService, remoteRegistry } =
      options;

    // Store core dependencies
    this.discovery = discovery;
    this.masterService = masterManifestService;
    this.remoteRegistry = remoteRegistry;
    this.userBmadPath = discovery.userBmadPath;
    this.projectRoot = discovery.projectRoot;
    this.bmadRoot = path.resolve(bmadRoot);

    const debug =
      process.env.BMAD_DEBUG === '1' || process.env.BMAD_DEBUG === 'true';

    // Initialize FileReader with master manifest for module-aware path resolution
    // The master manifest is the source of truth for all file paths
    const masterData = this.masterService.get();
    this.fileReader = new FileReader(masterData);

    if (debug) {
      logger.debug(`\nFileReader initialized with master manifest`);
      logger.debug(`  Total agents: ${masterData.agents.length}`);
      logger.debug(`  Total workflows: ${masterData.workflows.length}`);
      logger.debug(`  Total tasks: ${masterData.tasks.length}`);
      logger.debug(`  Total modules: ${masterData.modules.length}\n`);
    }

    // Convert master manifest records to legacy Agent/Workflow interfaces
    // This maintains backward compatibility with existing loader code
    this.agents = convertAgents(masterData.agents);
    this.workflows = convertWorkflows(masterData.workflows);
  }

  async execute(command: string): Promise<BMADToolResult> {
    const normalized = command.trim();
    if (!normalized) {
      logger.info('Empty command, loading bmad-master (default)');
      return this.loadAgent('bmad-master');
    }

    // Check for remote agent or module loading (@remote:agents/name format)
    const remoteAgentRef = parseRemoteAgentRef(normalized);
    if (remoteAgentRef) {
      // Parse remote registry from CLI args (or use built-ins)
      const registry = parseRemoteArgs(process.argv);

      if (remoteAgentRef.isModule) {
        // Load entire module (agents/module-name)
        logger.info(
          `Loading remote module: ${remoteAgentRef.agentPath} from ${remoteAgentRef.remote}`,
        );
        const { result, scanned } = await loadRemoteModule(
          remoteAgentRef,
          registry,
        );

        // Register scanned resources in master manifest
        if (scanned) {
          const masterManifests = this.masterService.get();
          masterManifests.agents.push(...scanned.agents);
          masterManifests.workflows.push(...scanned.workflows);
          masterManifests.tasks.push(...scanned.tasks);
          logger.info(
            `Registered ${scanned.agents.length} agents, ${scanned.workflows.length} workflows, ${scanned.tasks.length} tasks`,
          );
        }

        return result;
      } else {
        // Load single agent file (agents/module-name/agents/agent.md)
        logger.info(
          `Loading remote agent: ${remoteAgentRef.agentPath} from ${remoteAgentRef.remote}`,
        );
        return await loadRemoteAgent(remoteAgentRef, registry);
      }
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
      return initHandler();
    }

    // Listing commands (handled before general parsing)
    if (
      normalized === '*list-agents' ||
      normalized === '*list-workflows' ||
      normalized === '*list-remotes' ||
      normalized.startsWith('*list-agents @') ||
      normalized.startsWith('*list-modules @') ||
      normalized.startsWith('*export-master-manifest')
    ) {
      return await this.handleListCommand(normalized);
    }

    const parsedCommand = parseCommand(normalized, this.workflows);
    if (parsedCommand.type === 'error') {
      return this.formatErrorResponse(parsedCommand.validation);
    }

    const validation = validateInputName(
      parsedCommand.name,
      parsedCommand.type,
      this.agents,
      this.workflows,
    );
    if (!validation.valid) {
      return this.formatErrorResponse(validation);
    }

    if (parsedCommand.type === 'workflow') {
      return this.executeWorkflow(parsedCommand.name);
    } else {
      return this.loadAgent(parsedCommand.name);
    }
  }

  /**
   * Handle list commands (*list-agents, *list-workflows).
   *
   * Queries master manifest and formats results for display.
   * Uses all CLI-provided active locations to support multi-root setups.
   *
   * @param cmd - List command string
   * @returns Formatted list result
   */
  private async handleListCommand(cmd: string): Promise<BMADToolResult> {
    console.error(`🔧 ORCHESTRATOR handleListCommand called with: "${cmd}"`);
    const master = this.masterService.get();

    // Use full resolved catalog that includes all discoverable agents (like diagnostic)
    // This ensures consistent counts between *list-agents and *doctor commands
    const resolved = resolveAvailableCatalog(master, {
      scope: 'all', // Show all discoverable agents, not just active-only
    });

    console.error(`🔧 About to call handleList from internal/list.ts`);
    return await handleList(cmd, {
      resolved,
      master,
      discovery: this.discovery,
      remoteRegistry: this.remoteRegistry,
    });
  }

  /**
   * Resolve agent name aliases (e.g., "master" → "bmad-master").
   *
   * Note: Alias resolution is currently handled in registry/validators.
   * This method is kept for future extensibility.
   *
   * @param name - Agent name to resolve
   * @returns Canonical agent name
   */
  private resolveAgentAlias(name: string): string {
    // Alias resolution is handled inside registry; keep log here if changed
    return name;
  }

  /**
   * Load an agent and return its content.
   *
   * Delegates to agent-loader which handles:
   * - Finding agent in manifest
   * - Reading agent markdown file
   * - Reading customization YAML (if exists)
   * - Formatting response
   *
   * @param agentName - Name of agent to load
   * @returns BMADToolResult with agent content
   */
  private loadAgent(agentName: string): BMADToolResult {
    const canonicalName = agentName; // Alias resolution is inside registry/validators

    logger.info(
      `Loading agent: ${canonicalName}${canonicalName !== agentName ? ` (from alias: ${agentName})` : ''}`,
    );

    return loadAgentPayload({
      agentName: canonicalName,
      agents: this.agents,
      fileReader: this.fileReader,
    });
  }

  /**
   * Execute a workflow and return its definition.
   *
   * Delegates to workflow-executor which handles:
   * - Finding workflow in manifest
   * - Reading workflow YAML
   * - Reading workflow instructions (if exists)
   * - Building workflow context
   * - Formatting response
   *
   * @param workflowName - Name of workflow to execute
   * @returns BMADToolResult with workflow content
   */
  private executeWorkflow(workflowName: string): BMADToolResult {
    logger.info(`Executing workflow: ${workflowName}`);

    return executeWorkflowPayload({
      workflowName,
      workflows: this.workflows,
      fileReader: this.fileReader,
      buildWorkflowContext: () => this.buildWorkflowContext(),
    });
  }

  private formatErrorResponse(validation: ValidationResult): BMADToolResult {
    // Handle disambiguation cases with numbered options
    if (validation.requiresDisambiguation && validation.disambiguationOptions) {
      const lines: string[] = [];
      lines.push('<instructions>\n');
      lines.push(
        'You are helping the user select from multiple matching agents in the BMAD system. Display the content in the <content> tags below EXACTLY as written to help them make their selection.\n',
      );
      lines.push('</instructions>\n\n');
      lines.push('<content>\n');
      lines.push(`# 🤔 Multiple Agents Found\n`);
      lines.push(
        `Multiple agents found with the same name. Please select which one you want to load:\n`,
      );

      validation.disambiguationOptions.forEach((option, index) => {
        const description = option.description
          ? ` - ${option.description}`
          : '';
        lines.push(`${index + 1}. **${option.display}**${description}`);
      });

      lines.push(`\n**Selection Options:**`);
      lines.push(
        `- Type a number (1-${validation.disambiguationOptions.length}) to select`,
      );
      lines.push(
        `- Or use the full qualified name (e.g., \`bmad ${validation.disambiguationOptions[0].value}\`)`,
      );
      lines.push(
        `\n💡 **Tip:** You can avoid this prompt by using module-qualified names from the start!`,
      );
      lines.push('</content>');

      return {
        success: false,
        type: 'help',
        content: lines.join('\n'),
        errorCode: validation.errorCode,
        error: validation.errorMessage,
        suggestions: validation.suggestions,
        exitCode: validation.exitCode,
      };
    }

    return {
      success: false,
      errorCode: validation.errorCode,
      error: validation.errorMessage,
      suggestions: validation.suggestions,
      exitCode: validation.exitCode,
    };
  }

  private buildWorkflowContext(): WorkflowContext {
    // Build workflow context with agent data from master manifest
    // Note: agentManifestPath is legacy - workflows should use agentManifestData
    const manifestDir =
      this.discovery.activeLocation.manifestDir ||
      path.join(this.bmadRoot, '_cfg');

    return {
      bmadServerRoot: this.bmadRoot,
      projectRoot: this.bmadRoot,
      mcpResources: this.bmadRoot,
      agentManifestPath: path.join(manifestDir, 'agent-manifest.csv'),
      agentManifestData: this.agents,
      agentCount: this.agents.length,
    };
  }
}
