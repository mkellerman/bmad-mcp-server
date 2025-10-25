/**
 * Manifest Loader - CSV manifest file parser for BMAD discovery.
 *
 * This module reads CSV manifest files to discover available agents, workflows,
 * and tasks. It does NOT parse the actual agent/workflow files - just reads
 * the manifests for discovery purposes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import type { Agent, Workflow, Task } from '../types/index.js';

/**
 * Loads and parses BMAD CSV manifest files for resource discovery.
 *
 * Reads manifest files to discover what agents, workflows, and tasks
 * are available. Does not parse or process the actual resource files -
 * that's the LLM's responsibility.
 */
export class ManifestLoader {
  private bmadRoot: string;
  private manifestDir: string;

  constructor(bmadRoot: string) {
    this.bmadRoot = path.resolve(bmadRoot);
    const srcCfg = path.join(this.bmadRoot, 'src', 'bmad', '_cfg');
    const nestedPath = path.join(this.bmadRoot, 'bmad', '_cfg');
    const directPath = path.join(this.bmadRoot, '_cfg');

    if (fs.existsSync(srcCfg) && fs.statSync(srcCfg).isDirectory()) {
      this.manifestDir = srcCfg;
      this.bmadRoot = path.dirname(srcCfg);
      return;
    }

    if (fs.existsSync(nestedPath) && fs.statSync(nestedPath).isDirectory()) {
      this.manifestDir = nestedPath;
      this.bmadRoot = path.dirname(nestedPath);
      return;
    }

    if (fs.existsSync(directPath) && fs.statSync(directPath).isDirectory()) {
      this.manifestDir = directPath;
      return;
    }

    throw new Error(
      `BMAD manifest directory not found. Checked ${srcCfg}, ${nestedPath} and ${directPath}`,
    );
  }

  /**
   * Load agent-manifest.csv and return list of agent metadata.
   *
   * @returns List of agent metadata objects
   */
  loadAgentManifest(): Agent[] {
    return this.loadManifest<Agent>('agent-manifest.csv');
  }

  /**
   * Load workflow-manifest.csv and return list of workflow metadata.
   *
   * @returns List of workflow metadata objects
   */
  loadWorkflowManifest(): Workflow[] {
    return this.loadManifest<Workflow>('workflow-manifest.csv');
  }

  /**
   * Load task-manifest.csv and return list of task metadata.
   *
   * @returns List of task metadata objects
   */
  loadTaskManifest(): Task[] {
    return this.loadManifest<Task>('task-manifest.csv');
  }

  /**
   * Internal method to load any CSV manifest file.
   *
   * @param filename Name of manifest file (e.g., "agent-manifest.csv")
   * @returns List of records from CSV, or empty list on error
   */
  private loadManifest<T>(filename: string): T[] {
    const manifestPath = path.join(this.manifestDir, filename);

    // Check if file exists
    if (!fs.existsSync(manifestPath)) {
      console.warn(`Manifest not found: ${manifestPath}`);
      return [];
    }

    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');

      // Parse CSV using csv-parse
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      // Filter out completely empty rows
      const filtered = records.filter((row) =>
        Object.values(row as Record<string, unknown>).some(
          (value) => String(value).trim() !== '',
        ),
      );

      console.error(`Loaded ${filtered.length} entries from ${filename}`);
      return filtered;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error loading manifest ${manifestPath}:`, errorMessage);
      return [];
    }
  }

  /**
   * Get agent metadata by name.
   *
   * @param agentName Agent identifier (e.g., "analyst")
   * @returns Agent metadata object or undefined if not found
   */
  getAgentByName(agentName: string): Agent | undefined {
    const agents = this.loadAgentManifest();
    return agents.find((a) => a.name === agentName);
  }

  /**
   * Get workflow metadata by name.
   *
   * @param workflowName Workflow identifier
   * @returns Workflow metadata object or undefined if not found
   */
  getWorkflowByName(workflowName: string): Workflow | undefined {
    const workflows = this.loadWorkflowManifest();
    return workflows.find((w) => w.name === workflowName);
  }
}
