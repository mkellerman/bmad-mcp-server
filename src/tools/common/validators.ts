import type { Agent, Workflow, ValidationResult } from '../../types/index.js';
import { ErrorCode } from '../../types/index.js';
import {
  AGENT_NAME_PATTERN,
  WORKFLOW_NAME_PATTERN,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  DANGEROUS_CHARS,
} from './constants.js';
import { getAgentNames, getWorkflowNames } from './registry.js';
import { checkCaseMismatch, findClosestMatch } from './fuzzy.js';
import { parseQualifiedName } from '../../utils/name-parser.js';

export function checkSecurity(input: string): ValidationResult {
  if (DANGEROUS_CHARS.test(input)) {
    return {
      valid: false,
      errorCode: ErrorCode.INVALID_CHARACTERS,
      errorMessage: 'Invalid characters detected',
      exitCode: 1,
    };
  }
  if (!/^[\x00-\x7F]*$/.test(input)) {
    return {
      valid: false,
      errorCode: ErrorCode.NON_ASCII_CHARACTERS,
      errorMessage: 'Non-ASCII characters detected',
      exitCode: 1,
    };
  }
  return { valid: true, exitCode: 0 };
}

export function validateName(
  name: string,
  type: 'agent' | 'workflow',
  agents: Agent[],
  workflows: Workflow[],
): ValidationResult {
  if (name.length < MIN_NAME_LENGTH)
    return {
      valid: false,
      errorCode: ErrorCode.NAME_TOO_SHORT,
      errorMessage: 'Name too short',
      exitCode: 1,
    };
  if (name.length > MAX_NAME_LENGTH)
    return {
      valid: false,
      errorCode: ErrorCode.NAME_TOO_LONG,
      errorMessage: 'Name too long',
      exitCode: 1,
    };
  const pattern = type === 'agent' ? AGENT_NAME_PATTERN : WORKFLOW_NAME_PATTERN;
  if (!pattern.test(name))
    return {
      valid: false,
      errorCode: ErrorCode.INVALID_NAME_FORMAT,
      errorMessage: `Invalid name format: "${name}" doesn't match pattern ${pattern.source}`,
      exitCode: 1,
    };

  // Parse the name to handle module-qualified names (e.g., "core/bmad-master")
  const parsed = parseQualifiedName(name);

  if (type === 'agent') {
    // Check if the agent exists with optional module filtering
    let found = false;

    if (parsed.module) {
      // Module-qualified: check for exact module + name match
      found = agents.some(
        (a) => a.module === parsed.module && a.name === parsed.name,
      );

      if (!found) {
        // Debug module-qualified search
        const matchingAgents = agents.filter((a) => a.name === parsed.name);
        const allModules = [...new Set(agents.map((a) => a.module))]
          .filter(Boolean)
          .sort();

        let errorMessage = `❌ Agent Not Found: '${name}'`;
        errorMessage += `\n\n🔍 Module-qualified search: Looking for "${parsed.name}" in module "${parsed.module}"`;
        errorMessage += `\nFound ${matchingAgents.length} agents with name "${parsed.name}":`;

        if (matchingAgents.length > 0) {
          matchingAgents.forEach((a) => {
            errorMessage += `\n  • ${a.name} in module "${a.module || '(no module)'}"`;
          });
        } else {
          errorMessage += `\n  (No agents found with name "${parsed.name}")`;
        }

        errorMessage += `\n\nAvailable modules: ${allModules.length > 0 ? allModules.join(', ') : '(none)'}`;
        errorMessage += `\nTotal agents in system: ${agents.length}`;

        const suggestions: string[] = [];
        if (matchingAgents.length > 0) {
          // Suggest available modules for this agent name
          matchingAgents.forEach((a) => {
            if (a.module) {
              suggestions.push(`${a.module}/${a.name}`);
            } else {
              suggestions.push(a.name);
            }
          });
        }

        if (suggestions.length > 0) {
          errorMessage += `\n\nDid you mean one of these?`;
          suggestions.forEach((s) => {
            errorMessage += `\n  • ${s}`;
          });
        }

        errorMessage += `\n\n💡 See all agents: *list-agents`;

        return {
          valid: false,
          errorCode: ErrorCode.UNKNOWN_AGENT,
          errorMessage,
          suggestions,
          exitCode: 1,
        };
      }
    } else {
      // Simple name: implement smart fallback
      const matchingAgents = agents.filter((a) => a.name === parsed.name);

      if (matchingAgents.length === 0) {
        found = false;
      } else if (matchingAgents.length === 1) {
        // Unique match - allow it
        found = true;
      } else {
        // Multiple matches - require disambiguation
        const disambiguationOptions = matchingAgents
          .map((a) => ({
            display: a.module ? `${a.module}/${a.name}` : a.name,
            value: a.module ? `${a.module}/${a.name}` : a.name,
            description: a.title || a.role || '',
          }))
          .filter(
            (item, index, arr) =>
              arr.findIndex((x) => x.value === item.value) === index,
          ) // Remove duplicates
          .sort((a, b) => a.display.localeCompare(b.display));

        const errorMessage =
          `❌ Multiple agents found with name '${parsed.name}'\n\n` +
          `Please select which agent you want to load:\n\n` +
          disambiguationOptions
            .map(
              (opt, index) =>
                `${index + 1}. ${opt.display}${opt.description ? ` - ${opt.description}` : ''}`,
            )
            .join('\n') +
          `\n\n💡 Type the number (1-${disambiguationOptions.length}) or use the full qualified name`;

        return {
          valid: false,
          errorCode: ErrorCode.UNKNOWN_AGENT,
          errorMessage,
          suggestions: disambiguationOptions.map((opt) => opt.value),
          requiresDisambiguation: true,
          disambiguationOptions,
          exitCode: 1,
        };
      }
    }

    if (!found) {
      // For suggestions, use simple names only (don't suggest qualified names yet)
      const names = getAgentNames(agents);
      const caseMatch = checkCaseMismatch(parsed.name, names);
      const close = findClosestMatch(parsed.name, names);

      // Build enhanced error message with debug info for module-qualified names
      let errorMessage = `❌ Agent Not Found: '${name}'`;

      if (parsed.module) {
        const matchingAgents = agents.filter((a) => a.name === parsed.name);
        const allModules = [...new Set(agents.map((a) => a.module))].sort();
        errorMessage += `\n\n🔍 Debug: Looking for "${parsed.name}" in module "${parsed.module}"`;
        errorMessage += `\nFound ${matchingAgents.length} agents with name "${parsed.name}":`;
        matchingAgents.forEach((a) => {
          errorMessage += `\n  • ${a.name} in module "${a.module}"`;
        });
        errorMessage += `\n\nAvailable modules: ${allModules.join(', ')}`;
      }

      const suggestions: string[] = [];

      if (caseMatch) {
        suggestions.push(caseMatch);
      }
      if (close && close !== caseMatch) {
        suggestions.push(close);
      }

      // Add helpful context
      if (suggestions.length > 0) {
        errorMessage += `\n\nDid you mean one of these?`;
        suggestions.forEach((s) => {
          const agent = agents.find((a) => a.name === s);
          const desc = agent?.title || agent?.role || '';
          errorMessage += `\n  • ${s}${desc ? ` (${desc})` : ''}`;
        });
        errorMessage += `\n\n💡 See all agents: *list-agents`;
      } else {
        errorMessage += `\n\n💡 See available agents: *list-agents`;
      }

      return {
        valid: false,
        errorCode: ErrorCode.UNKNOWN_AGENT,
        errorMessage,
        suggestions,
        exitCode: 2,
      };
    }
  } else {
    // Workflow validation with module support
    let found = false;

    if (parsed.module) {
      found = workflows.some(
        (w) => w.module === parsed.module && w.name === parsed.name,
      );
    } else {
      found = workflows.some((w) => w.name === parsed.name);
    }

    if (!found) {
      const names = getWorkflowNames(workflows);
      const caseMatch = checkCaseMismatch(parsed.name, names);
      const close = findClosestMatch(parsed.name, names);

      // Build enhanced error message
      let errorMessage = `❌ Workflow Not Found: '${name}'`;
      const suggestions: string[] = [];

      if (caseMatch) {
        suggestions.push(caseMatch);
      }
      if (close && close !== caseMatch) {
        suggestions.push(close);
      }

      // Add helpful context
      if (suggestions.length > 0) {
        errorMessage += `\n\nDid you mean one of these?`;
        suggestions.forEach((s) => {
          const workflow = workflows.find((w) => w.name === s);
          const desc = workflow?.description || '';
          errorMessage += `\n  • ${s}${desc ? ` (${desc})` : ''}`;
        });
        errorMessage += `\n\n💡 See all workflows: *list-workflows`;
      } else {
        errorMessage += `\n\n💡 See available workflows: *list-workflows`;
      }

      return {
        valid: false,
        errorCode: ErrorCode.UNKNOWN_WORKFLOW,
        errorMessage,
        suggestions,
        exitCode: 2,
      };
    }
  }
  return { valid: true, exitCode: 0 };
}
