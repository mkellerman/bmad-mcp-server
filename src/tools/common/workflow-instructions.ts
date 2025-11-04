import { loadConfig } from '../../config.js';

export function getWorkflowInstructions(): string {
  const config = loadConfig();
  return config.instructions.workflow;
}
