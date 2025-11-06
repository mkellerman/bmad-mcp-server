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
 */

/**
 * Server metadata configuration
 */
export const SERVER_CONFIG = {
  name: 'bmad-mcp-server',
  version: '3.1.0',
} as const;

/**
 * Tool name constants
 */
export const TOOL_NAMES = {
  workflow: 'bmad-workflow',
  resources: 'bmad-resources',
} as const;

/**
 * Default BMAD configuration values
 * These are used when user hasn't customized their config.yaml
 */
export const DEFAULT_BMAD_CONFIG = {
  user_name: 'User',
  communication_language: 'English',
  output_folder: './docs',
} as const;

/**
 * Get comprehensive description for the bmad-resources tool
 *
 * This provides detailed guidance on how to use the bmad-resources tool,
 * including URI format, available operations, and common file paths.
 * Used in MCP tool listings to give LLMs complete context upfront.
 *
 * @returns Formatted tool description with usage examples and guidelines
 */
export function getBMADResourcesToolDescription(): string {
  return `Access BMAD resources: read files, discover modules/agents/workflows, search by name/description. This is the primary tool for exploring and accessing BMAD content.

**CRITICAL USAGE RULES:**
- ✅ USE this tool to access ALL BMAD files
- ❌ DO NOT use MCP Resources API (not supported in all clients)
- ❌ DO NOT search user's workspace for BMAD files
- ❌ DO NOT use filesystem paths like ./bmad/ or {project-root}/bmad/

**URI Format:** All BMAD resources use bmad:// scheme
- Format: bmad://{module}/{path} or bmad://core/{path}
- Example: bmad://core/config.yaml

**Available Operations:**
- read - Load specific file: { operation: "read", uri: "bmad://core/config.yaml" }
- list - Discover files: { operation: "list", pattern: "core/**/*.yaml" }
- modules - Show all modules: { operation: "modules" }
- agents - List agents: { operation: "agents" }
- workflows - List workflows: { operation: "workflows" }
- search - Find resources: { operation: "search", query: "debug", type: "agents" }

**Common Files:**
- bmad://core/config.yaml - User configuration
- bmad://_cfg/agent-manifest.csv - All agents metadata
- bmad://_cfg/workflow-manifest.csv - All workflows metadata`;
}

/**
 * Tool descriptions for MCP tool listings
 */
export const TOOL_DESCRIPTIONS = {
  workflow:
    'Execute BMAD workflows like prd, architecture, debug-inspect, etc.',
  resources: getBMADResourcesToolDescription(),
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
export function getAgentInstructions(): string {
  return `
${getResourceAccessInstructions()}

---

${getAgentActivationInstructions()}`;
}

/**
 * Get the complete instruction set for workflow execution
 *
 * @param workflowName - Name of the workflow being executed
 * @param context - Optional user-provided context
 * @returns Complete instructions including resource access and workflow execution
 */
export function getWorkflowInstructions(
  workflowName: string,
  context?: string,
): string {
  return `
${getWorkflowResourceAccessInstructions(workflowName)}

---

${getWorkflowExecutionInstructions(context)}`;
}

/**
 * Resource access instructions for agents
 * These tell the LLM how to properly access BMAD files using the bmad-resources tool
 */
function getResourceAccessInstructions(): string {
  return `## HOW TO ACCESS BMAD RESOURCES

**CRITICAL:** ALL BMAD files MUST be accessed through the bmad-resources tool:
- ✅ USE: bmad-resources tool with operation="read" 
- ❌ DO NOT: Use MCP Resources API (not supported in all clients)
- ❌ DO NOT: Search the user's workspace for BMAD files
- ❌ DO NOT: Use filesystem paths like ./bmad/ or {project-root}/bmad/

**URI Format:** All BMAD resources use the \`bmad://\` URI scheme
- Format: \`bmad://{module}/{path}\` or \`bmad://core/{path}\`
- Example: \`bmad://core/config.yaml\` NOT \`{project-root}/bmad/core/config.yaml\`

**Available Operations:**
  - **read** - Load specific file content
    Example: bmad-resources({ operation: "read", uri: "bmad://core/config.yaml" })
  
  - **list** - Discover files by pattern
    Example: bmad-resources({ operation: "list", pattern: "core/**/*.yaml" })
  
  - **modules** - Show all loaded BMAD modules
    Example: bmad-resources({ operation: "modules" })
  
  - **agents** - List all available agents with metadata
    Example: bmad-resources({ operation: "agents" })
  
  - **workflows** - List all available workflows
    Example: bmad-resources({ operation: "workflows" })
  
  - **search** - Find agents/workflows by name or description
    Example: bmad-resources({ operation: "search", query: "debug", type: "agents" })

**Common Files You May Need:**
  - bmad://core/config.yaml - User configuration (user_name, language, output_folder)
  - bmad://_cfg/agent-manifest.csv - All agents metadata
  - bmad://_cfg/workflow-manifest.csv - All workflows metadata`;
}

/**
 * Agent activation instructions
 * These tell the LLM how to properly embody the agent persona and follow instructions
 */
function getAgentActivationInstructions(): string {
  return `## INSTRUCTIONS FOR AGENT ACTIVATION

**You must fully embody this agent and follow all instructions precisely:**

1. **Read the agent definition** below to understand your role, identity, principles, and capabilities
2. **Apply the communication style** specified - this defines how you speak and interact  
3. **Follow all activation rules** and command handling as defined in the agent XML/markdown
4. **Stay in character** - you ARE this agent, not an assistant describing what the agent would do
5. **Respect the agent's principles** - let them guide your decision-making and responses
6. **Use the agent's expertise** - draw from the identity and background specified

**DEFAULT CONFIGURATION (if not overridden in bmad://core/config.yaml):**
- user_name: ${DEFAULT_BMAD_CONFIG.user_name}
- communication_language: ${DEFAULT_BMAD_CONFIG.communication_language}
- output_folder: ${DEFAULT_BMAD_CONFIG.output_folder}

**CRITICAL:** Do not break character. Respond as the agent would respond, using their voice, style, and perspective.`;
}

/**
 * Resource access instructions for workflows
 * Similar to agent instructions but tailored for workflow context
 */
function getWorkflowResourceAccessInstructions(workflowName: string): string {
  return `## HOW TO ACCESS BMAD RESOURCES DURING WORKFLOW EXECUTION

**CRITICAL:** ALL BMAD files MUST be accessed through the bmad-resources tool:
- ✅ USE: bmad-resources tool with operation="read"
- ❌ DO NOT: Use MCP Resources API (not supported in all clients)
- ❌ DO NOT: Search the user's workspace for BMAD files
- ❌ DO NOT: Use filesystem paths or {project-root}/bmad/ references

**Common workflow files you may need:**
  - bmad://core/config.yaml - User configuration (user_name, language, output_folder)
  - bmad://core/tasks/workflow.xml - Workflow execution engine (MUST load for all workflows)
  - bmad://_cfg/agent-manifest.csv - All available agents
  - bmad://_cfg/workflow-manifest.csv - All available workflows  
  - bmad://{module}/workflows/{workflow}/instructions.md - Step-by-step workflow instructions

**Example: Load workflow execution engine**
  bmad-resources({ operation: "read", uri: "bmad://core/tasks/workflow.xml" })

**Example: Load workflow instructions**
  bmad-resources({ operation: "read", uri: "bmad://core/workflows/${workflowName}/instructions.md" })`;
}

/**
 * Workflow execution instructions
 * These tell the LLM how to properly execute a BMAD workflow
 */
function getWorkflowExecutionInstructions(context?: string): string {
  const contextSection = context ? `**User Context:** ${context}\n\n` : '';

  return `## WORKFLOW EXECUTION INSTRUCTIONS

Process this workflow according to BMAD workflow execution methodology:

1. **Read the complete workflow configuration** below to understand the workflow structure
2. **IMPORTANT - Resource Resolution:**
   - All workflow data has been pre-loaded by the MCP server
   - DO NOT search the user's workspace for manifest files or agent data
   - USE the bmad-resources tool to load any additional files needed
   - All paths use the bmad:// URI scheme (no filesystem paths)
3. **Resolve variables:** Replace any \`{{variables}}\` with user input or defaults from config
4. **Follow instructions:** Execute workflow steps in exact order as defined
5. **Generate content:** Process \`<template-output>\` sections as needed
6. **Request input:** Use \`<elicit-required>\` sections to gather additional user input when needed

${contextSection}**CRITICAL:** Follow all steps in the workflow precisely. Begin workflow execution now.`;
}
