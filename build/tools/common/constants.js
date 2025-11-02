/**
 * Shared constants for the Unified BMAD tool.
 */
// Updated to support module-qualified names like "core/bmad-master" or "bmad-2d-phaser-game-dev/architect"
export const AGENT_NAME_PATTERN = /^([a-z0-9]+(-[a-z0-9]+)*)(\/[a-z0-9]+(-[a-z0-9]+)*)?$/;
export const WORKFLOW_NAME_PATTERN = /^([a-z0-9]+(-[a-z0-9]+)*)(\/[a-z0-9]+(-[a-z0-9]+)*)?$/;
export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 64;
export const DANGEROUS_CHARS = /[;&|`<>$]/;
//# sourceMappingURL=constants.js.map