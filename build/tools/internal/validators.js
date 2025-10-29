import { ErrorCode } from '../../types/index.js';
import { AGENT_NAME_PATTERN, WORKFLOW_NAME_PATTERN, MIN_NAME_LENGTH, MAX_NAME_LENGTH, DANGEROUS_CHARS, } from './constants.js';
import { checkCaseMismatch, findClosestMatch } from './fuzzy.js';
import { formatDangerousCharsError, formatNonAsciiError, formatNameTooShortError, formatNameTooLongError, formatInvalidFormatError, formatUnknownAgentError, formatUnknownWorkflowError, formatCaseMismatchError, } from './formatters.js';
import { isAgentName as isAgent, isWorkflowName as isWorkflow } from './registry.js';
export function checkSecurity(command) {
    const foundDangerous = DANGEROUS_CHARS.filter((c) => command.includes(c));
    if (foundDangerous.length > 0) {
        return {
            valid: false,
            errorCode: ErrorCode.INVALID_CHARACTERS,
            errorMessage: formatDangerousCharsError(foundDangerous),
            exitCode: 1,
        };
    }
    if (!/^[\x00-\x7F]*$/.test(command)) {
        const nonAscii = [...command].filter((c) => c.charCodeAt(0) > 127);
        return {
            valid: false,
            errorCode: ErrorCode.NON_ASCII_CHARACTERS,
            errorMessage: formatNonAsciiError(nonAscii),
            exitCode: 1,
        };
    }
    return { valid: true, exitCode: 0 };
}
export function validateName(name, commandType, agents, workflows) {
    if (name.length < MIN_NAME_LENGTH) {
        return {
            valid: false,
            errorCode: ErrorCode.NAME_TOO_SHORT,
            errorMessage: formatNameTooShortError(name, commandType, agents, workflows),
            exitCode: 1,
        };
    }
    if (name.length > MAX_NAME_LENGTH) {
        return {
            valid: false,
            errorCode: ErrorCode.NAME_TOO_LONG,
            errorMessage: formatNameTooLongError(name, name.length),
            exitCode: 1,
        };
    }
    const pattern = commandType === 'workflow' ? WORKFLOW_NAME_PATTERN : AGENT_NAME_PATTERN;
    if (!pattern.test(name)) {
        return {
            valid: false,
            errorCode: ErrorCode.INVALID_NAME_FORMAT,
            errorMessage: formatInvalidFormatError(name, commandType),
            exitCode: 1,
        };
    }
    if (commandType === 'workflow') {
        if (!isWorkflow(name, workflows)) {
            const suggestion = findClosestMatch(name, workflows.map((w) => w.name));
            return {
                valid: false,
                errorCode: ErrorCode.UNKNOWN_WORKFLOW,
                errorMessage: formatUnknownWorkflowError(name, workflows, suggestion),
                suggestions: suggestion ? [suggestion] : [],
                exitCode: 1,
            };
        }
    }
    else {
        if (!isAgent(name, agents)) {
            const caseMatch = checkCaseMismatch(name, agents.map((a) => a.name));
            if (caseMatch) {
                return {
                    valid: false,
                    errorCode: ErrorCode.CASE_MISMATCH,
                    errorMessage: formatCaseMismatchError(name, caseMatch),
                    suggestions: [caseMatch],
                    exitCode: 1,
                };
            }
            const suggestion = findClosestMatch(name, agents.map((a) => a.name));
            return {
                valid: false,
                errorCode: ErrorCode.UNKNOWN_AGENT,
                errorMessage: formatUnknownAgentError(name, agents, suggestion),
                suggestions: suggestion ? [suggestion] : [],
                exitCode: 1,
            };
        }
    }
    return { valid: true, exitCode: 0 };
}
//# sourceMappingURL=validators.js.map