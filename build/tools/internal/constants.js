/**
 * Shared constants for the Unified BMAD tool.
 */
// Validation patterns
export const AGENT_NAME_PATTERN = /^[a-z]+(-[a-z]+)*$/;
export const WORKFLOW_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 50;
// Characters that should never appear in user commands
export const DANGEROUS_CHARS = [
    ';',
    '&',
    '|',
    '$',
    '`',
    '<',
    '>',
    '\n',
    '\r',
    '(',
    ')',
];
// Fuzzy string match threshold for suggestions
export const FUZZY_MATCH_THRESHOLD = 0.7;
//# sourceMappingURL=constants.js.map