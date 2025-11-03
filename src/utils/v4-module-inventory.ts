import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import type { BmadOrigin, MasterRecord, V6ModuleInfo } from '../types/index.js';

interface V4InstallManifest {
  version: string;
  installed_at?: string;
  install_type?: string;
  expansion_packs?: string[];
  files?: Array<{
    path: string;
    hash?: string;
    modified?: boolean;
  }>;
}

export interface OriginInventoryResult {
  modules: V6ModuleInfo[];
  agents: MasterRecord[];
  workflows: MasterRecord[];
  tasks: MasterRecord[];
}

function readYaml<T = unknown>(filePath: string): T | undefined {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return yaml.load(content) as T;
  } catch {
    return undefined;
  }
}

function classifyFilePath(filePath: string): {
  kind: 'agent' | 'workflow' | 'task';
  moduleName: string;
  name: string;
} | null {
  // Parse path like: .bmad-core/agents/analyst.md
  // or: .bmad-2d-unity-game-dev/agents/game-developer.md

  const parts = filePath.split('/');
  if (parts.length < 3) return null;

  const moduleDir = parts[0]; // e.g., .bmad-core or .bmad-2d-unity-game-dev
  const moduleName = moduleDir.startsWith('.bmad-')
    ? moduleDir.substring(6) // Remove '.bmad-' prefix
    : moduleDir;

  const category = parts[1]; // agents, workflows, tasks, etc.
  const fileName = parts[parts.length - 1];

  if (category === 'agents' && fileName.endsWith('.md')) {
    return {
      kind: 'agent',
      moduleName,
      name: path.basename(fileName, '.md'),
    };
  }

  if (
    category === 'workflows' &&
    (fileName.endsWith('.yaml') || fileName.endsWith('.yml'))
  ) {
    return {
      kind: 'workflow',
      moduleName,
      name: path.basename(fileName, path.extname(fileName)),
    };
  }

  if (category === 'tasks' && fileName.endsWith('.md')) {
    return {
      kind: 'task',
      moduleName,
      name: path.basename(fileName, '.md'),
    };
  }

  return null;
}

/**
 * Dynamically resolve file paths by trying multiple path strategies.
 * Handles cases where manifest paths may not match actual directory structure.
 */
function resolveFilePath(
  installRoot: string,
  manifestPath: string,
  classification: { kind: string; moduleName: string; name: string },
): { absolutePath: string; exists: boolean } {
  // Strategy 1: Try the path exactly as specified in manifest
  const exactPath = path.join(installRoot, manifestPath);
  if (fs.existsSync(exactPath)) {
    return { absolutePath: exactPath, exists: true };
  }

  // Strategy 2: Try removing the module name prefix from the path
  // e.g., "bmad-2d-phaser-game-dev/agents/game-designer.md" -> "agents/game-designer.md"
  const pathParts = manifestPath.split('/');
  if (pathParts.length > 1) {
    // Remove the first part (module name) and join the rest
    const withoutModulePrefix = pathParts.slice(1).join('/');
    const trimmedPath = path.join(installRoot, withoutModulePrefix);
    if (fs.existsSync(trimmedPath)) {
      return { absolutePath: trimmedPath, exists: true };
    }
  }

  // Strategy 3: Try constructing path based on classification
  // This handles cases where the directory structure is completely different
  const categoryMap: Record<string, string> = {
    agent: 'agents',
    workflow: 'workflows',
    task: 'tasks',
  };
  const category = categoryMap[classification.kind];
  const fileName = path.basename(manifestPath);
  if (category) {
    const constructedPath = path.join(installRoot, category, fileName);
    if (fs.existsSync(constructedPath)) {
      return { absolutePath: constructedPath, exists: true };
    }
  }

  // Strategy 4: Return the exact path even if it doesn't exist (for error reporting)
  return { absolutePath: exactPath, exists: false };
}

function listFilesRecursive(
  dir: string,
  predicate: (p: string) => boolean,
): string[] {
  const results: string[] = [];
  const stack: string[] = [dir];
  while (stack.length) {
    const current = stack.pop()!;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        if (predicate(full)) results.push(full);
      }
    }
  }
  return results;
}

/**
 * List agent files directly in the agents/ directory (non-recursive)
 * Agents must be in the pattern: agents/<agent-name>.md
 */
function listAgentFiles(agentsDir: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(path.join(agentsDir, entry.name));
      }
    }
  } catch {
    // Directory doesn't exist or not accessible
  }
  return results;
}

/**
 * Inventory a v4 BMAD installation by reading install-manifest.yaml
 * and scanning filesystem for orphaned files
 */
export function inventoryOriginV4(origin: BmadOrigin): OriginInventoryResult {
  const manifestPath = path.join(origin.root, 'install-manifest.yaml');

  if (!fs.existsSync(manifestPath)) {
    return { modules: [], agents: [], workflows: [], tasks: [] };
  }

  const manifest = readYaml<V4InstallManifest>(manifestPath);
  if (!manifest) {
    return { modules: [], agents: [], workflows: [], tasks: [] };
  }

  const modules: V6ModuleInfo[] = [];
  const agentRecords: MasterRecord[] = [];
  const workflowRecords: MasterRecord[] = [];
  const taskRecords: MasterRecord[] = [];

  // Create a module entry for 'core'
  const coreModule: V6ModuleInfo = {
    name: 'core',
    path: path.join(origin.root, '.bmad-core'),
    configPath: path.join(origin.root, '.bmad-core', 'core-config.yaml'),
    configValid: fs.existsSync(
      path.join(origin.root, '.bmad-core', 'core-config.yaml'),
    ),
    errors: [],
    moduleVersion: manifest.version,
    bmadVersion: manifest.version,
    origin,
  };
  modules.push(coreModule);

  // Create module entries for expansion packs
  if (manifest.expansion_packs) {
    for (const packName of manifest.expansion_packs) {
      const packPath = path.join(origin.root, `.bmad-${packName}`);
      const configPath = path.join(packPath, 'config.yaml');
      const configExists = fs.existsSync(configPath);

      modules.push({
        name: packName,
        path: packPath,
        configPath,
        configValid: configExists,
        errors: configExists ? [] : ['Missing config.yaml'],
        moduleVersion: manifest.version,
        bmadVersion: manifest.version,
        origin,
      });
    }
  }

  // Build a set of paths from manifest for orphan detection
  const manifestPaths = new Set<string>();
  if (manifest.files) {
    for (const file of manifest.files) {
      manifestPaths.add(file.path);
    }
  }

  // Calculate installRoot for absolute path resolution
  // For v4, origin.root might be .bmad-core itself, so we need parent directory
  const installRoot =
    path.basename(origin.root) === '.bmad-core'
      ? path.dirname(origin.root)
      : origin.root;

  // Process all files from manifest
  if (manifest.files) {
    for (const file of manifest.files) {
      const classification = classifyFilePath(file.path);
      if (!classification) continue;

      // Try multiple path resolution strategies for robust file detection
      const { absolutePath, exists } = resolveFilePath(
        installRoot,
        file.path,
        classification,
      );
      const moduleRelativePath = file.path;
      const bmadRelativePath = file.path;

      const record: MasterRecord = {
        kind: classification.kind,
        source: 'manifest',
        origin,
        moduleName: classification.moduleName,
        moduleVersion: manifest.version,
        bmadVersion: manifest.version,
        name: classification.name,
        bmadRelativePath,
        moduleRelativePath,
        absolutePath,
        exists,
        status: exists ? 'verified' : 'no-file-found',
      };

      // For workflows, try to read description from YAML file
      if (classification.kind === 'workflow' && exists) {
        try {
          const y = readYaml<{
            name?: string;
            description?: string;
            workflow?: { name?: string; description?: string };
          }>(absolutePath);
          // v4 format has workflow.description
          if (
            y?.workflow?.description &&
            typeof y.workflow.description === 'string'
          ) {
            record.description = y.workflow.description;
            record.displayName = y.workflow.description;
          } else if (y?.description && typeof y.description === 'string') {
            record.description = y.description;
            record.displayName = y.description;
          }
        } catch {
          // ignore parsing errors
        }
      }

      if (classification.kind === 'agent') {
        agentRecords.push(record);
      } else if (classification.kind === 'workflow') {
        workflowRecords.push(record);
      } else if (classification.kind === 'task') {
        taskRecords.push(record);
      }
    }
  }

  // Scan filesystem for orphaned files in core and expansion packs
  const moduleNames = ['core', ...(manifest.expansion_packs || [])];

  for (const moduleName of moduleNames) {
    // For v4, origin.root might be the .bmad-core folder itself, or the parent folder
    // Check if origin.root ends with .bmad-core, if so use parent
    const installRoot =
      path.basename(origin.root) === '.bmad-core'
        ? path.dirname(origin.root)
        : origin.root;

    // Module names in the expansion_packs array may already include 'bmad-' prefix
    const moduleDir =
      moduleName === 'core'
        ? path.join(installRoot, '.bmad-core')
        : path.join(
            installRoot,
            moduleName.startsWith('bmad-')
              ? `.${moduleName}`
              : `.bmad-${moduleName}`,
          );

    if (!fs.existsSync(moduleDir)) continue;

    // Scan agents - only direct children of agents/ directory
    const agentsDir = path.join(moduleDir, 'agents');
    if (fs.existsSync(agentsDir)) {
      const agentFiles = listAgentFiles(agentsDir);
      for (const absolutePath of agentFiles) {
        // Compute path like: .bmad-core/agents/test.md or .bmad-infrastructure-devops/agents/test.md
        const moduleDirName =
          moduleName === 'core'
            ? '.bmad-core'
            : moduleName.startsWith('bmad-')
              ? `.${moduleName}`
              : `.bmad-${moduleName}`;
        const relativeToModule = path.relative(moduleDir, absolutePath);
        const relativePath = path
          .join(moduleDirName, relativeToModule)
          .replace(/\\/g, '/');

        // Only add if NOT in manifest (orphan)
        if (!manifestPaths.has(relativePath)) {
          const name = path.basename(absolutePath, '.md');
          // Normalize module name: strip 'bmad-' prefix to match manifest entries
          const normalizedModuleName =
            moduleName === 'core'
              ? 'core'
              : moduleName.startsWith('bmad-')
                ? moduleName.substring(5)
                : moduleName;
          agentRecords.push({
            kind: 'agent',
            source: 'filesystem',
            origin,
            moduleName: normalizedModuleName,
            moduleVersion: manifest.version,
            bmadVersion: manifest.version,
            name,
            bmadRelativePath: relativePath,
            moduleRelativePath: relativePath,
            absolutePath,
            exists: true,
            status: 'not-in-manifest',
          });
        }
      }
    }

    // Scan workflows
    const workflowsDir = path.join(moduleDir, 'workflows');
    if (fs.existsSync(workflowsDir)) {
      const workflowFiles = listFilesRecursive(
        workflowsDir,
        (p) => p.endsWith('.yaml') || p.endsWith('.yml'),
      );
      for (const absolutePath of workflowFiles) {
        // Compute path like: .bmad-core/workflows/test.yaml or .bmad-infrastructure-devops/workflows/test.yaml
        const moduleDirName =
          moduleName === 'core'
            ? '.bmad-core'
            : moduleName.startsWith('bmad-')
              ? `.${moduleName}`
              : `.bmad-${moduleName}`;
        const relativeToModule = path.relative(moduleDir, absolutePath);
        const relativePath = path
          .join(moduleDirName, relativeToModule)
          .replace(/\\/g, '/');

        // Only add if NOT in manifest (orphan)
        if (!manifestPaths.has(relativePath)) {
          // Try to read name and description from yaml
          let name = path.basename(absolutePath, path.extname(absolutePath));
          let description: string | undefined;
          try {
            const y = readYaml<{
              name?: string;
              description?: string;
              workflow?: { name?: string; description?: string };
            }>(absolutePath);
            // v4 format has workflow.name and workflow.description
            if (y?.workflow?.name && typeof y.workflow.name === 'string')
              name = y.workflow.name;
            else if (y?.name && typeof y.name === 'string') name = y.name;

            if (
              y?.workflow?.description &&
              typeof y.workflow.description === 'string'
            )
              description = y.workflow.description;
            else if (y?.description && typeof y.description === 'string')
              description = y.description;
          } catch {
            // ignore
          }
          // Normalize module name: strip 'bmad-' prefix to match manifest entries
          const normalizedModuleName =
            moduleName === 'core'
              ? 'core'
              : moduleName.startsWith('bmad-')
                ? moduleName.substring(5)
                : moduleName;
          workflowRecords.push({
            kind: 'workflow',
            source: 'filesystem',
            origin,
            moduleName: normalizedModuleName,
            moduleVersion: manifest.version,
            bmadVersion: manifest.version,
            name,
            displayName: description,
            description,
            bmadRelativePath: relativePath,
            moduleRelativePath: relativePath,
            absolutePath,
            exists: true,
            status: 'not-in-manifest',
          });
        }
      }
    }

    // Scan tasks
    const tasksDir = path.join(moduleDir, 'tasks');
    if (fs.existsSync(tasksDir)) {
      const taskFiles = listFilesRecursive(tasksDir, (p) => p.endsWith('.md'));
      for (const absolutePath of taskFiles) {
        // Compute path like: .bmad-core/tasks/test.md or .bmad-infrastructure-devops/tasks/test.md
        const moduleDirName =
          moduleName === 'core'
            ? '.bmad-core'
            : moduleName.startsWith('bmad-')
              ? `.${moduleName}`
              : `.bmad-${moduleName}`;
        const relativeToModule = path.relative(moduleDir, absolutePath);
        const relativePath = path
          .join(moduleDirName, relativeToModule)
          .replace(/\\/g, '/');

        // Only add if NOT in manifest (orphan)
        if (!manifestPaths.has(relativePath)) {
          const name = path.basename(absolutePath, '.md');
          // Normalize module name: strip 'bmad-' prefix to match manifest entries
          const normalizedModuleName =
            moduleName === 'core'
              ? 'core'
              : moduleName.startsWith('bmad-')
                ? moduleName.substring(5)
                : moduleName;
          taskRecords.push({
            kind: 'task',
            source: 'filesystem',
            origin,
            moduleName: normalizedModuleName,
            moduleVersion: manifest.version,
            bmadVersion: manifest.version,
            name,
            bmadRelativePath: relativePath,
            moduleRelativePath: relativePath,
            absolutePath,
            exists: true,
            status: 'not-in-manifest',
          });
        }
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
