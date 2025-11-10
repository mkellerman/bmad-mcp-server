/**
 * Convert a BMAD-related file path to a bmad:// URI using regex rules.
 * Handles .bmad/, bmad/, {project-root}/.bmad/, and module subfolders.
 * Returns the original path if no rule matches.
 */
export function toBmadUri(path: string): string {
  const rules: Array<{
    regex: RegExp;
    replacer: (m: RegExpMatchArray) => string;
  }> = [
    // .bmad/_cfg/...
    {
      regex: /^\.?bmad[\/]_cfg[\/](.+)$/i,
      replacer: (m) => `bmad://_cfg/${m[1]}`,
    },
    // .bmad/_data/...
    {
      regex: /^\.?bmad[\/]_data[\/](.+)$/i,
      replacer: (m) => `bmad://_data/${m[1]}`,
    },
    // .bmad/agents/...
    {
      regex: /^\.?bmad[\/]agents[\/](.+)$/i,
      replacer: (m) => `bmad://agents/${m[1]}`,
    },
    // .bmad/{module}/agents/...
    {
      regex: /^\.?bmad[\/]([\w-]+)[\/]agents[\/](.+)$/i,
      replacer: (m) => `bmad://${m[1]}/agents/${m[2]}`,
    },
    // .bmad/{module}/workflows/...
    {
      regex: /^\.?bmad[\/]([\w-]+)[\/]workflows[\/](.+)$/i,
      replacer: (m) => `bmad://${m[1]}/workflows/${m[2]}`,
    },
    // .bmad/{module}/tasks/...
    {
      regex: /^\.?bmad[\/]([\w-]+)[\/]tasks[\/](.+)$/i,
      replacer: (m) => `bmad://${m[1]}/tasks/${m[2]}`,
    },
    // .bmad/{module}/templates/...
    {
      regex: /^\.?bmad[\/]([\w-]+)[\/]templates[\/](.+)$/i,
      replacer: (m) => `bmad://${m[1]}/templates/${m[2]}`,
    },
    // .bmad/{module}/config.yaml
    {
      regex: /^\.?bmad[\/]([\w-]+)[\/]config.yaml$/i,
      replacer: (m) => `bmad://${m[1]}/config.yaml`,
    },
    // .bmad/{module}/...
    {
      regex: /^\.?bmad[\/]([\w-]+)[\/](.+)$/i,
      replacer: (m) => `bmad://${m[1]}/${m[2]}`,
    },
    // bmad/{module}/...
    {
      regex: /^bmad[\/]([\w-]+)[\/](.+)$/i,
      replacer: (m) => `bmad://${m[1]}/${m[2]}`,
    },
    // {project-root}/.bmad/{module}/...
    {
      regex: /^\{project-root\}[\/]\.bmad[\/]([\w-]+)[\/](.+)$/i,
      replacer: (m) => `bmad://${m[1]}/${m[2]}`,
    },
  ];
  for (const rule of rules) {
    const match = path.match(rule.regex);
    if (match) return rule.replacer(match);
  }
  return path;
}
/**
 * BMAD Path & Placeholder Utilities
 *
 * Provides a single helper for all BMAD path and variable substitutions.
 *
 * Usage:
 *   resolveBmadPath(template, context, { toBmadUri: true })
 *
 * - template: string with placeholders (e.g., '{project-root}/bmad/bmm/config.yaml')
 * - context: object with keys for all known placeholders
 * - options: { toBmadUri?: boolean } (default false)
 */

export interface BmadPathContext {
  [key: string]: string | undefined;
}

export interface ResolveBmadPathOptions {
  toBmadUri?: boolean;
}

/**
 * Substitute all known BMAD placeholders in a path template.
 * Optionally convert to bmad:// URI.
 */
export function resolveBmadPath(
  template: string,
  context: BmadPathContext,
  options: ResolveBmadPathOptions = {},
): string {
  let result = template;

  // Replace all {placeholder} with context values
  result = result.replace(/\{([\w-]+)\}/g, (_: string, key: string) => {
    if (context[key] !== undefined) return String(context[key]);
    return `{${key}}`; // leave unresolved if not found
  });

  // If requested, convert {project-root}/bmad/... to bmad://...
  if (options.toBmadUri) {
    const bmadRootPattern = /^(.*?)(?:\/)?bmad\/(.+)$/;
    const match = result.match(bmadRootPattern);
    if (match) {
      // Only use the part after bmad/ for the URI
      return `bmad://${match[2]}`;
    }
  }

  return result;
}
