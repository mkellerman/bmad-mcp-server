import os from 'node:os';
import path from 'node:path';
import type { DiscoveryMode } from './types/index.js';

export interface DiscoveryConfig {
  mode: DiscoveryMode;
  envRoot?: string;
  userBmadPath: string;
  includeUserBmad: boolean;
  rootSearchMaxDepth: number;
  excludeDirs: string[];
}

export interface GitConfig {
  cacheDir: string;
  autoUpdate: boolean;
}

export interface LoggingConfig {
  debug: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
}

export interface CLIConfig {
  modeArg?: string;
  remotes: string[];
  rawArgs: string[];
}

/**
 * Instructions injected when loading agents and workflows.
 * These provide the LLM with guidance on how to process and adopt agent personas
 * and execute workflows according to BMAD methodology.
 */
export interface InstructionsConfig {
  /** Instructions appended to agent content when loading agents */
  agent: string;
  /** Instructions appended to workflow content when executing workflows */
  workflow: string;
}

export interface BMADConfig {
  discovery: DiscoveryConfig;
  git: GitConfig;
  logging: LoggingConfig;
  cli: CLIConfig;
  instructions: InstructionsConfig;
}

function toBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const v = value.toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function parseDiscoveryMode(value?: string): DiscoveryMode {
  if (value === 'auto' || value === 'strict') return value;
  return 'auto';
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : defaultValue;
}

function splitList(value: string | undefined, defaults: string[]): string[] {
  if (!value) return defaults;
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function loadConfig(options?: {
  argv?: string[];
  env?: NodeJS.ProcessEnv;
}): BMADConfig {
  const argv = options?.argv ?? process.argv.slice(2);
  const env = options?.env ?? process.env;

  const modeArg = argv.find((a) => a.startsWith('--mode='));
  const modeValue = modeArg?.split('=')[1];
  const envMode = env.BMAD_DISCOVERY_MODE;
  const mode = parseDiscoveryMode(modeValue || envMode || 'auto');

  const envRoot = env.BMAD_ROOT || undefined;

  const userBmadPath = env.BMAD_USER_PATH || path.join(os.homedir(), '.bmad');
  const includeUserBmad = !toBool(env.BMAD_DISABLE_USER_BMAD, false);
  const rootSearchMaxDepth = parseNumber(env.BMAD_ROOT_SEARCH_MAX_DEPTH, 3);
  const excludeDirs = splitList(env.BMAD_EXCLUDE_DIRS, [
    '.git',
    'git',
    'node_modules',
    'cache',
    'build',
    'dist',
    'bin',
  ]);

  const gitCacheDir =
    env.BMAD_GIT_CACHE_DIR || path.join(userBmadPath, 'cache', 'git');
  const gitAutoUpdate = toBool(env.BMAD_AUTO_UPDATE_GIT, true);

  const debug = toBool(env.BMAD_DEBUG, false);
  const levelEnv = (env.BMAD_LOG_LEVEL || '').toLowerCase();
  const level: LoggingConfig['level'] =
    levelEnv === 'debug' ||
    levelEnv === 'info' ||
    levelEnv === 'warn' ||
    levelEnv === 'error'
      ? levelEnv
      : debug
        ? 'debug'
        : 'info';

  const remotes = argv.filter((a) => a.startsWith('--remote='));

  // Agent instructions - appended to all loaded agents
  // Modify these to change how the LLM processes agent personas
  const agentInstructions = [
    '## Agent Instructions',
    '',
    '1. Read the agent definition markdown to understand role, identity, and principles',
    '2. Apply the communication style specified in the agent definition',
    '3. Follow activation rules and command handling as defined in the agent XML/markdown',
    '',
    '## Default Configuration (config.yaml)',
    '',
    '- user_name: User',
    '- communication_language: English',
    '- output_folder: ./docs',
    '',
  ].join('\n');

  // Workflow instructions - appended to all executed workflows
  // Modify these to change how the LLM processes workflow definitions
  const workflowInstructions = [
    '## Execution Instructions',
    '',
    'Process this workflow according to BMAD workflow execution methodology:',
    '',
    '1. **Read the complete workflow.yaml configuration**',
    '2. **IMPORTANT - MCP Resource Resolution:**',
    '   - All `{mcp-resources}` placeholders refer to the MCP server installation',
    "   - DO NOT search the user's workspace for manifest files or agent data",
    '   - USE the Agent Roster JSON provided in the Workflow Context section above',
    '   - The MCP server has already resolved all paths and loaded all necessary data',
    '3. **Resolve variables:** Replace any `{{variables}}` with user input or defaults',
    '4. **Follow instructions:** Execute steps in exact order as defined',
    '5. **Generate content:** Process `<template-output>` sections as needed',
    '6. **Request input:** Use `<elicit-required>` sections to gather additional user input',
    '',
    '**CRITICAL:** The Agent Roster JSON in the Workflow Context contains all agent metadata',
    'from the MCP server. Use this data directly - do not attempt to read files from the',
    "user's workspace.",
    '',
    'Begin workflow execution now.',
  ].join('\n');

  return {
    discovery: {
      mode,
      envRoot,
      userBmadPath,
      includeUserBmad,
      rootSearchMaxDepth,
      excludeDirs,
    },
    git: {
      cacheDir: gitCacheDir,
      autoUpdate: gitAutoUpdate,
    },
    logging: {
      debug,
      level,
    },
    cli: {
      modeArg,
      remotes,
      rawArgs: argv,
    },
    instructions: {
      agent: agentInstructions,
      workflow: workflowInstructions,
    },
  };
}

export default loadConfig;
