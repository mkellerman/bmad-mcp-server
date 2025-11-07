/**
 * Centralized configuration for BMAD MCP Server
 *
 * This module contains all configuration constants, server metadata,
 * and instruction templates used throughout the application.
 *
 * Modify this file to adjust:
 * - Server name and version
 * - Agent activation instructions
 * - Workflow execution instructions
 * - Resource access guidelines
 * - Default configuration values
 * - Feature flags (e.g., enable search operation)
 */

/**
 * Server metadata configuration
 */
export const SERVER_CONFIG = {
  name: 'bmad-mcp-server',
  version: '3.1.0',
} as const;

/**
 * Feature flags
 *
 * To enable the search operation in the unified BMAD tool, pass config to createBMADTool:
 * ```typescript
 * createBMADTool(agents, workflows, { enableSearch: true })
 * ```
 */
export const FEATURE_FLAGS = {
  /** Enable search operation in unified BMAD tool (default: false) */
  enableSearch: false,
} as const;

/**
 * Default BMAD configuration values
 * These are used when user hasn't customized their config.yaml
```
 */
export const DEFAULT_BMAD_CONFIG = {
  user_name: 'User',
  communication_language: 'English',
  output_folder: './docs',
} as const;

/**
 * Instructions configuration
 */
export interface InstructionsConfig {
  /** Instructions for accessing BMAD resources (used by both agents and workflows) */
  resourceAccess: string;
  /** Instructions for agent activation and persona embodiment */
  agentActivation: string;
  /** Instructions for workflow execution */
  workflowExecution: string;
}

/**
 * Get the complete instruction set for agent invocation
 *
 * @returns Complete instructions including resource access and agent activation
 */
export function getAgentExecutionPrompt(context: {
  agent: string;
  userContext?: string;
}): string {
  // Build the YAML frontmatter
  const frontmatter = `---

agent: ${context.agent}
user-prompt: ${context.userContext || '(no prompt provided)'}

---`;

  // Add resource access instructions
  const resourceInstructions = `
${getResourceAccessInstructions()}

---`;

  // Simple activation message
  const activationMessage = `
This agent has been requested.

**CRITICAL:** Use the \`bmad\` tool to read the full agent definition:
  bmad({ operation: "read", agent: "${context.agent}" })

The agent definition contains your persona, role, capabilities, menu items, and all instructions.
Embody that agent completely and respond to the user's prompt.`;

  return `${frontmatter}${resourceInstructions}${activationMessage}
`;
}

/**
 * Get the complete instruction set for workflow execution
 *
 * @param _workflowName - Name of the workflow being executed (unused but kept for API compatibility)
 * @param _context - Optional user-provided context (unused but kept for API compatibility)
 * @returns Complete instructions including resource access
 */
export function getWorkflowInstructions(
  _workflowName: string,
  _context?: string,
): string {
  return `
${getResourceAccessInstructions()}`;
}

/**
 * Build the workflow execution prompt with minimal injection.
 *
 * Injects only:
 * 1. Agent's workflow handler instructions (tells LLM what to do)
 * 2. workflow.yaml (raw YAML - configuration)
 *
 * The agent's workflow handler will instruct the LLM to load workflow.xml
 * and any other files via bmad-resources tool.
 */
export function getWorkflowExecutionPrompt(context: {
  workflow: string;
  workflowPath: string;
  userContext?: string;
  agent?: string;
  agentWorkflowHandler?: string;
}): string {
  // Build the YAML frontmatter
  const frontmatter = `---

agent: ${context.agent || 'unknown'}
menu-item: ${context.workflow}
workflow: ${context.workflowPath}
user-prompt: ${context.userContext || '(no prompt provided)'}

---`;

  // Add resource access instructions FIRST
  const resourceInstructions = `
${getResourceAccessInstructions()}

---`;

  // Build handler section
  const handlerSection = context.agentWorkflowHandler
    ? `
This workflow has been requested to be executed.

${context.agentWorkflowHandler}`
    : '\nThis workflow has been requested to be executed.';

  return `${frontmatter}${resourceInstructions}${handlerSection}
`;
}

/**
 * Resource access instructions for agents and workflows
 * These tell the LLM how to properly access BMAD files using the bmad tool
 */
export function getResourceAccessInstructions(): string {
  return `## HOW TO ACCESS BMAD RESOURCES

**CRITICAL:** ALL BMAD files MUST be accessed through the \`bmad\` tool:
- ✅ USE: \`bmad\` tool with appropriate operation
- ❌ DO NOT: Use MCP Resources API (not supported in all clients)
- ❌ DO NOT: Search the user's workspace for BMAD files
- ❌ DO NOT: Use filesystem paths like ./bmad/ or {project-root}/bmad/

**WORKFLOW HANDLING BEHAVIOR:**
- ⚡ **BE SILENT**: When loading workflow instructions, configurations, or internal BMAD files
- ⚡ **NO COMMENTARY**: Don't explain what you're doing when accessing bmad:// resources
- ⚡ **DIRECT EXECUTION**: Load required files quietly and proceed directly to workflow execution
- ⚡ **USER FOCUS**: Only communicate with user for workflow outputs, questions, or results

**COMMON BMAD OPERATIONS:**
  - **List agents**: bmad({ operation: "list", query: "agents" })
  - **List workflows**: bmad({ operation: "list", query: "workflows" })
  - **Read agent definition**: bmad({ operation: "read", agent: "analyst" })
  - **Read workflow definition**: bmad({ operation: "read", workflow: "prd" })
  - **Execute agent**: bmad({ operation: "execute", agent: "analyst", message: "your request" })
  - **Execute workflow**: bmad({ operation: "execute", workflow: "prd", message: "context" })

**FILE LOCATIONS (for reference only):**
  - Configuration: {project-root}/bmad/core/config.yaml
  - Core tasks: {project-root}/bmad/core/tasks/workflow.xml
  - Agent definitions: {project-root}/bmad/{module}/agents/{agent-name}.md
  - Workflow definitions: {project-root}/bmad/{module}/workflows/{workflow-name}/workflow.yaml

**Note:** The agent workflow handler instructions will tell you which files to load and how.`;
}
