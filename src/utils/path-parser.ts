/**
 * Path Parser - Parse and normalize BMAD file paths
 *
 * Supports two path formats:
 * - v6: {project-root}/bmad/<module>/<file-path>
 * - v4: .bmad-<module>/<file-path>
 *
 * Extracts module name and file path for master manifest queries.
 */

export interface ParsedBmadPath {
  /**
   * The module name extracted from the path.
   * Examples: 'core', 'debug', '2d-phaser-game-dev'
   */
  module: string | null;

  /**
   * The file path within the module.
   * Examples: 'agents/analyst.md', 'workflows/instrument/workflow.yaml'
   */
  filePath: string;

  /**
   * The original format detected.
   */
  format: 'v6' | 'v4' | 'unknown';

  /**
   * Whether the path contained a placeholder.
   */
  hasPlaceholder: boolean;
}

/**
 * Parse a BMAD file path into its components.
 *
 * Handles:
 * - v6 format: {project-root}/bmad/debug/workflows/instrument/workflow.yaml
 * - v4 format: .bmad-2d-phaser-game-dev/tasks/create-doc.md
 * - Plain relative: tasks/create-doc.md (no module specified)
 *
 * @param path - The file path to parse
 * @returns Parsed components (module, filePath, format)
 */
export function parseBmadPath(path: string): ParsedBmadPath {
  const trimmed = path.trim();

  // Check for v6 format: {project-root}/bmad/<module>/<file-path>
  const v6Match = trimmed.match(/^\{project-root\}\/bmad\/([^/]+)\/(.+)$/);
  if (v6Match) {
    return {
      module: v6Match[1],
      filePath: v6Match[2],
      format: 'v6',
      hasPlaceholder: true,
    };
  }

  // Check for v4 format: .bmad-<module>/<file-path>
  const v4Match = trimmed.match(/^\.bmad-([^/]+)\/(.+)$/);
  if (v4Match) {
    return {
      module: v4Match[1],
      filePath: v4Match[2],
      format: 'v4',
      hasPlaceholder: false,
    };
  }

  // No module specified - plain relative path
  return {
    module: null,
    filePath: trimmed,
    format: 'unknown',
    hasPlaceholder: false,
  };
}

/**
 * Normalize a file path by removing leading slashes and dots.
 *
 * @param path - The path to normalize
 * @returns Normalized path
 */
export function normalizePath(path: string): string {
  return path.replace(/^[./]+/, '');
}
