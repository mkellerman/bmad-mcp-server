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
import { convertAgents, convertWorkflows } from '../../utils/master-manifest-adapter.js';

import { loadAgent as loadAgentPayload } from './agent-loader.js';
import { executeWorkflow as executeWorkflowPayload } from './workflow-executor.js';

import { doctor as doctorReport } from '../internal/doctor.js';
import { handleInit as initHandler } from '../internal/init.js';
import { handleListCommand as handleList } from '../internal/list.js';
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

  constructor(options: {
    bmadRoot: string;
    discovery: BmadPathResolution;
    masterManifestService: MasterManifestService;
  }) {
    const { bmadRoot, discovery, masterManifestService } = options;

    // Store core dependencies
    this.discovery = discovery;
    this.masterService = masterManifestService;
    this.userBmadPath = discovery.userBmadPath;
    this.projectRoot = discovery.projectRoot;
    this.bmadRoot = path.resolve(bmadRoot);

    const debug = process.env.BMAD_DEBUG === '1' || process.env.BMAD_DEBUG === 'true';

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

    logger.info(
      `UnifiedBMADTool initialized with ${this.agents.length} agents ` +
      `and ${this.workflows.length} workflows from master manifest`,
    );
  }

  execute(command: string): BMADToolResult {
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
    if (
      normalized === '*list-agents' ||
      normalized === '*list-workflows' ||
      normalized === '*list-tasks' ||
      normalized === '*list-modules' ||
      normalized.startsWith('*export-master-manifest')
    ) {
      return this.handleListCommand(normalized);
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
   * Handle list commands (*list-agents, *list-workflows, *list-tasks).
   *
   * Queries master manifest and formats results for display.
   *
   * @param cmd - List command string
   * @returns Formatted list result
   */
  private handleListCommand(cmd: string): BMADToolResult {
    const master = this.masterService.get();
    const activeRoot =
      this.discovery.activeLocation.resolvedRoot ??
      this.discovery.activeLocation.originalPath;
    const resolved = resolveAvailableCatalog(master, {
      scope: 'active-only',
      activeRoot: activeRoot ?? undefined,
    });
    return handleList(cmd, { resolved, master, discovery: this.discovery });
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
    const manifestDir = this.discovery.activeLocation.manifestDir ||
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

