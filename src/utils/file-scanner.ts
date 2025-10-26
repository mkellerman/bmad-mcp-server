/**
 * File Scanner - Discover BMAD assets by scanning the filesystem.
 *
 * Scans directories for agent, workflow, and task files following BMAD conventions.
 * Used by diagnostic tools to detect orphaned files not in manifests.
 */

import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

export interface ScannedFile {
  /** File name without extension */
  name: string;
  /** Full file path relative to bmadRoot */
  path: string;
  /** File type */
  type: 'agent' | 'workflow' | 'task';
  /** Whether file exists in manifest */
  inManifest: boolean;
}

export interface ScanResult {
  /** All discovered agent files */
  agents: ScannedFile[];
  /** All discovered workflow files */
  workflows: ScannedFile[];
  /** All discovered task files */
  tasks: ScannedFile[];
}

/**
 * Scan BMAD directory for agent, workflow, and task files.
 */
export class FileScanner {
  private bmadRoot: string;

  constructor(bmadRoot: string) {
    this.bmadRoot = path.resolve(bmadRoot);
  }

  /**
   * Scan for all BMAD assets in the directory.
   */
  scan(): ScanResult {
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
  private scanAgents(): ScannedFile[] {
    const searchPaths = [
      path.join(this.bmadRoot, 'agents'),
      path.join(this.bmadRoot, 'bmm', 'agents'),
      path.join(this.bmadRoot, 'core', 'agents'),
    ];

    const files: ScannedFile[] = [];

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
  private scanWorkflows(): ScannedFile[] {
    const searchPaths = [
      path.join(this.bmadRoot, 'workflows'),
      path.join(this.bmadRoot, 'bmm', 'workflows'),
      path.join(this.bmadRoot, 'core', 'workflows'),
    ];

    const files: ScannedFile[] = [];

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
  private scanTasks(): ScannedFile[] {
    const searchPaths = [
      path.join(this.bmadRoot, 'tasks'),
      path.join(this.bmadRoot, 'bmm', 'tasks'),
      path.join(this.bmadRoot, 'core', 'tasks'),
    ];

    const files: ScannedFile[] = [];

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
  private scanDirectory(
    dir: string,
    handler: (filePath: string) => void,
  ): void {
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
        } else if (entry.isFile()) {
          handler(fullPath);
        }
      }
    } catch (error) {
      // Silently skip directories that can't be read
      console.error(`Error scanning directory ${dir}:`, error);
    }
  }

  /**
   * Extract agent name from file path.
   * Follows convention: agents/<module>/<agent-name>.md
   */
  private extractAgentName(filePath: string): string | undefined {
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
  private extractWorkflowName(filePath: string): string | undefined {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = yaml.load(content) as { name?: string };
      if (parsed && typeof parsed.name === 'string') {
        // Workflow names use lowercase-hyphen-number format
        if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(parsed.name)) {
          return parsed.name;
        }
      }
    } catch (error) {
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
  private extractTaskName(filePath: string): string | undefined {
    const basename = path.basename(filePath, '.xml');
    // Task names use lowercase-hyphen-number format
    if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(basename)) {
      return basename;
    }
    return undefined;
  }
}
