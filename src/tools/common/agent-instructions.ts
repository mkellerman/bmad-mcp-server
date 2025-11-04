import { loadConfig } from '../../config.js';

export function getAgentInstructions(): string {
  const config = loadConfig();
  return config.instructions.agent;
}
