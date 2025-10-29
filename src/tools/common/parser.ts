import type { ParsedCommand, Workflow } from '../../types/index.js';
import { ErrorCode } from '../../types/index.js';
import { checkSecurity } from './validators.js';
import { isWorkflowName as isWorkflow } from './registry.js';
import {
  formatDoubleAsteriskError,
  formatMissingWorkflowNameError,
  formatMissingAsteriskError,
} from './formatters.js';

export function parseCommand(command: string, workflows: Workflow[]): ParsedCommand {
  const securityValidation = checkSecurity(command);
  if (!securityValidation.valid) {
    return { type: 'error', validation: securityValidation };
  }
  if (command.includes(' ')) {
    const parts = command.split(' ');
    if (parts.length > 1) {
      return {
        type: 'error',
        validation: {
          valid: false,
          errorCode: ErrorCode.TOO_MANY_ARGUMENTS,
          errorMessage: `Error: Too many arguments`,
          exitCode: 1,
        },
      };
    }
  }
  if (command.startsWith('**')) {
    const workflowName = command.substring(2);
    return {
      type: 'error',
      validation: {
        valid: false,
        errorCode: ErrorCode.INVALID_ASTERISK_COUNT,
        errorMessage: formatDoubleAsteriskError(workflowName),
        suggestions: [`*${workflowName}`],
        exitCode: 1,
      },
    };
  } else if (command.startsWith('*')) {
    const workflowName = command.substring(1).trim();
    if (!workflowName) {
      return {
        type: 'error',
        validation: {
          valid: false,
          errorCode: ErrorCode.MISSING_WORKFLOW_NAME,
          errorMessage: formatMissingWorkflowNameError(),
          exitCode: 1,
        },
      };
    }
    return { type: 'workflow', name: workflowName };
  }
  const agentName = command;
  if (isWorkflow(agentName, workflows)) {
    return {
      type: 'error',
      validation: {
        valid: false,
        errorCode: ErrorCode.MISSING_ASTERISK,
        errorMessage: formatMissingAsteriskError(agentName),
        suggestions: [`*${agentName}`],
        exitCode: 1,
      },
    };
  }
  return { type: 'agent', name: agentName };
}

