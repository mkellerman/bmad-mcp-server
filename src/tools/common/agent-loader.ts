import type { Agent, BMADToolResult } from '../../types/index.js';
import { getAgentInstructions } from './agent-instructions.js';
import { FileReader } from '../../utils/file-reader.js';
import { parseQualifiedName } from '../../utils/name-parser.js';

export interface LoadAgentOptions {
  agentName: string;
  agents: Agent[];
  fileReader: FileReader;
}

/**
 * Build agent payload by reading the agent markdown and optional customization YAML.
 */
export function loadAgent({
  agentName,
  agents,
  fileReader,
}: LoadAgentOptions): BMADToolResult {
  // Parse the agent name to handle module-qualified names (e.g., "core/bmad-master")
  const parsed = parseQualifiedName(agentName);

  // Find agent in manifest using parsed name and optional module
  let agent: Agent | undefined;

  if (parsed.module) {
    // Module-qualified: match both module and name
    agent = agents.find(
      (a) => a.module === parsed.module && a.name === parsed.name,
    );
  } else {
    // Simple name: match just the name (first match by priority)
    agent = agents.find((a) => a.name === parsed.name);
  }

  if (!agent) {
    // Should not happen after validation, but guard anyway
    return {
      success: false,
      error: `Agent '${agentName}' not found in manifest`,
      exitCode: 2,
    };
  }

  const contentParts: string[] = [];

  // Header
  const displayName = agent.displayName || agentName;
  const title = agent.title || 'BMAD Agent';
  contentParts.push(`# BMAD Agent: ${displayName}`);
  contentParts.push(`**Title:** ${title}\n`);

  // Load agent markdown
  try {
    const agentContent = fileReader.readFile(agent.path);
    contentParts.push(agentContent);
  } catch (error) {
    return {
      success: false,
      error: `Error loading agent file: ${(error as Error).message}`,
      exitCode: 3,
    };
  }

  // Include instructions section
  contentParts.push('');
  contentParts.push(getAgentInstructions());

  return {
    success: true,
    type: 'agent',
    agentName,
    displayName,
    content: contentParts.join('\n'),
    exitCode: 0,
  };
}
