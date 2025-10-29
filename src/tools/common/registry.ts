import type { Agent, Workflow } from '../../types/index.js';

export function resolveAgentAlias(name: string): string {
  return name;
}

export function isAgentName(name: string, agents: Agent[]): boolean {
  return agents.some((a) => a.name === name);
}

export function isWorkflowName(name: string, workflows: Workflow[]): boolean {
  return workflows.some((w) => w.name === name);
}

export function getAgentNames(agents: Agent[]): string[] {
  return agents.map((a) => a.name);
}

export function getWorkflowNames(workflows: Workflow[]): string[] {
  return workflows.map((w) => w.name);
}
