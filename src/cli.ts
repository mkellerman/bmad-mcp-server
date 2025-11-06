#!/usr/bin/env node

/**
 * BMAD CLI Tool
 *
 * Command-line interface for BMAD with contextual TUI menus.
 * Similar to gh (GitHub CLI) - works with parameters OR interactive prompts.
 *
 * Usage:
 *   bmad list agents [--json]
 *   bmad list workflows [--json]
 *   bmad list modules [--json]
 *   bmad search <query> [--type=agents|workflows|all] [--json]
 *   bmad read agent <name> [--json]
 *   bmad read workflow <name> [--json]
 *   bmad execute agent <name> --message "..." [--json]
 *   bmad execute workflow <name> [--message "..."] [--json]
 *
 * Interactive mode (no args):
 *   bmad
 *
 * Environment Variables:
 *   BMAD_ROOT - Path to BMAD directory (overrides default .bmad location)
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import * as clack from '@clack/prompts';
import pc from 'picocolors';
import { BMADEngine } from './core/bmad-engine.js';

// ============================================================================
// Types
// ============================================================================

interface CliArgs {
  command?: string;
  subcommand?: string;
  target?: string;
  message?: string;
  query?: string;
  type?: 'agents' | 'workflows' | 'all';
  json?: boolean;
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Load environment variables and determine BMAD root path
 *
 * Returns the path to search for BMAD content.
 * ResourceLoaderGit will look for:
 * - {returnedPath}/bmad directory OR
 * - {returnedPath}/.bmad directory OR
 * - Treat {returnedPath} itself as bmad root if it has module structure
 *
 * Priority order:
 * 1. BMAD_ROOT environment variable (if set) - can point to parent or bmad dir itself
 * 2. Load .env file and use BMAD_ROOT from there
 * 3. Default to current working directory
 */
function loadBmadRoot(): string {
  const projectRoot = process.cwd();

  // Try to load .env from project root (simple parser to avoid noisy dotenv v17)
  const envPath = join(projectRoot, '.env');
  if (existsSync(envPath)) {
    try {
      const envContent = readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) continue;
        // Parse KEY=value
        const match = trimmed.match(/^([A-Z_]+)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          // Only set if not already in environment
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    } catch {
      // Ignore errors reading .env
    }
  }

  // BMAD_ROOT can point to:
  // - Parent directory containing bmad/ (e.g., /project)
  // - The bmad directory itself (e.g., /project/bmad or /tests/fixtures/bmad)
  // - Relative path (resolved from current directory)
  // ResourceLoaderGit will auto-detect the structure
  let bmadRoot = process.env.BMAD_ROOT || projectRoot;

  // If relative path, resolve it from project root
  if (bmadRoot && !bmadRoot.startsWith('/')) {
    bmadRoot = join(projectRoot, bmadRoot);
  }

  return bmadRoot;
}

async function main() {
  const args = parseArgs();

  // Initialize engine (silent in CLI mode, with spinner in interactive)
  const engine = await initializeEngine(args.json === true);

  // Route to CLI or TUI
  if (args.command) {
    await runCli(engine, args);
  } else {
    await runTui(engine);
  }
}

// ============================================================================
// Engine Initialization
// ============================================================================

async function initializeEngine(silent: boolean): Promise<BMADEngine> {
  const bmadRoot = loadBmadRoot();
  const gitRemotes = process.argv
    .slice(2)
    .filter((arg) => arg.startsWith('git+'));

  const engine = new BMADEngine(bmadRoot, gitRemotes);

  if (silent) {
    await engine.initialize();
  } else {
    const s = clack.spinner();
    s.start('Initializing BMAD Engine...');
    try {
      await engine.initialize();
      s.stop(pc.green('✓ BMAD Engine initialized'));
    } catch (error) {
      s.stop(pc.red('✗ Failed to initialize'));
      throw error;
    }
  }

  return engine;
}

// ============================================================================
// CLI Mode (with parameters)
// ============================================================================

async function runCli(engine: BMADEngine, args: CliArgs) {
  try {
    let result;

    switch (args.command) {
      case 'list':
        result = await handleListCommand(engine, args);
        break;
      case 'search':
        result = await handleSearchCommand(engine, args);
        break;
      case 'read':
        result = await handleReadCommand(engine, args);
        break;
      case 'execute':
        result = await handleExecuteCommand(engine, args);
        break;
      default:
        throw new Error(`Unknown command: ${args.command}`);
    }

    // Output result
    if (args.json) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(result, null, 2));
    } else {
      // eslint-disable-next-line no-console
      console.log(result.text || JSON.stringify(result.data, null, 2));
    }

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    if (args.json) {
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify(
          {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
          null,
          2,
        ),
      );
    } else {
      console.error(
        pc.red('Error:'),
        error instanceof Error ? error.message : String(error),
      );
    }
    process.exit(1);
  }
}

async function handleListCommand(engine: BMADEngine, args: CliArgs) {
  switch (args.subcommand) {
    case 'agents':
      return engine.listAgents();
    case 'workflows':
      return engine.listWorkflows();
    case 'modules':
      return engine.listModules();
    default:
      throw new Error(
        `Unknown list target: ${args.subcommand}. Use: agents, workflows, modules`,
      );
  }
}

async function handleSearchCommand(engine: BMADEngine, args: CliArgs) {
  if (!args.query) {
    throw new Error('Search query is required');
  }
  return engine.search(args.query, args.type || 'all');
}

async function handleReadCommand(engine: BMADEngine, args: CliArgs) {
  if (!args.target) {
    throw new Error('Target name is required');
  }

  switch (args.subcommand) {
    case 'agent':
      return engine.readAgent(args.target);
    case 'workflow':
      return engine.readWorkflow(args.target);
    default:
      throw new Error(
        `Unknown read target: ${args.subcommand}. Use: agent, workflow`,
      );
  }
}

async function handleExecuteCommand(engine: BMADEngine, args: CliArgs) {
  if (!args.target) {
    throw new Error('Target name is required');
  }

  switch (args.subcommand) {
    case 'agent':
      if (!args.message) {
        throw new Error('Message is required for agent execution');
      }
      return engine.executeAgent({ agent: args.target, message: args.message });
    case 'workflow':
      return engine.executeWorkflow({
        workflow: args.target,
        message: args.message || '',
      });
    default:
      throw new Error(
        `Unknown execute target: ${args.subcommand}. Use: agent, workflow`,
      );
  }
}

// ============================================================================
// TUI Mode (interactive contextual menus)
// ============================================================================

async function runTui(engine: BMADEngine) {
  clack.intro(pc.bgCyan(pc.black(' BMAD CLI ')));

  let running = true;

  while (running) {
    const action = await clack.select({
      message: 'What would you like to do?',
      options: [
        { value: 'list', label: 'List', hint: 'agents, workflows, modules' },
        { value: 'search', label: 'Search', hint: 'Find agents/workflows' },
        { value: 'read', label: 'Read', hint: 'View details' },
        { value: 'execute', label: 'Execute', hint: 'Run agent/workflow' },
        { value: 'exit', label: 'Exit' },
      ],
    });

    if (clack.isCancel(action) || action === 'exit') {
      running = false;
      break;
    }

    switch (action) {
      case 'list':
        await tuiList(engine);
        break;
      case 'search':
        await tuiSearch(engine);
        break;
      case 'read':
        await tuiRead(engine);
        break;
      case 'execute':
        await tuiExecute(engine);
        break;
    }
  }

  clack.outro(pc.cyan('Goodbye! 👋'));
}

// ============================================================================
// Argument Parser
// ============================================================================

function parseArgs(): CliArgs {
  const argv = process.argv.slice(2);
  const args: CliArgs = {};

  // Filter out git remotes
  const cleanArgs = argv.filter((arg) => !arg.startsWith('git+'));

  // Check for help flag
  if (cleanArgs.includes('--help') || cleanArgs.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  for (let i = 0; i < cleanArgs.length; i++) {
    const arg = cleanArgs[i];

    if (arg === '--json') {
      args.json = true;
    } else if (arg.startsWith('--message=')) {
      args.message = arg.slice(10);
    } else if (arg === '--message' || arg === '-m') {
      args.message = cleanArgs[++i];
    } else if (arg.startsWith('--type=')) {
      const type = arg.slice(7);
      if (type === 'agents' || type === 'workflows' || type === 'all') {
        args.type = type;
      }
    } else if (arg === '--type') {
      const type = cleanArgs[++i];
      if (type === 'agents' || type === 'workflows' || type === 'all') {
        args.type = type;
      }
    } else if (!arg.startsWith('--')) {
      if (!args.command) {
        args.command = arg;
      } else if (!args.subcommand) {
        args.subcommand = arg;
      } else if (!args.target && !args.query) {
        // For search, this is the query; for read/execute, it's the target
        if (args.command === 'search') {
          args.query = arg;
        } else {
          args.target = arg;
        }
      }
    }
  }

  return args;
}

function printHelp() {
  /* eslint-disable no-console */
  console.log(`
${pc.cyan(pc.bold('BMAD CLI'))} - Command-line interface for BMAD methodology

${pc.bold('USAGE:')}
  bmad [command] [options]
  bmad                        # Interactive mode (contextual menus)

${pc.bold('COMMANDS:')}
  ${pc.cyan('list')} <target> [--json]     # List agents, workflows, or modules
    bmad list agents
    bmad list workflows
    bmad list modules

  ${pc.cyan('search')} <query> [options]    # Search agents and workflows
    bmad search debug --type=agents --json
    bmad search architecture --type=all

  ${pc.cyan('read')} <type> <name> [--json] # Read agent or workflow details
    bmad read agent analyst
    bmad read workflow prd

  ${pc.cyan('execute')} <type> <name> [options]  # Execute agent or workflow
    bmad execute agent dev --message "Create a login form"
    bmad execute workflow debug-inspect --message "Fix the bug"

${pc.bold('OPTIONS:')}
  --json                      # Output in JSON format (for scripting)
  --message, -m <text>        # Message for execution
  --type <agents|workflows|all>  # Filter search results
  --help, -h                  # Show this help message

${pc.bold('EXAMPLES:')}
  ${pc.dim('# List all agents in JSON format')}
  bmad list agents --json

  ${pc.dim('# Search for debug-related workflows')}
  bmad search debug --type=workflows

  ${pc.dim('# Execute PM agent to create a PRD')}
  bmad execute agent pm --message "Create PRD for user authentication"

  ${pc.dim('# Interactive mode with contextual menus')}
  bmad
`);
  /* eslint-enable no-console */
}

// ============================================================================
// TUI Helpers (Simple contextual menus)
// ============================================================================

async function tuiList(engine: BMADEngine) {
  const what = await clack.select({
    message: 'What would you like to list?',
    options: [
      { value: 'agents', label: 'Agents' },
      { value: 'workflows', label: 'Workflows' },
      { value: 'modules', label: 'Modules' },
      { value: 'back', label: '← Back' },
    ],
  });

  if (clack.isCancel(what) || what === 'back') {
    return;
  }

  const s = clack.spinner();
  s.start(`Loading ${what}...`);

  let result;
  switch (what) {
    case 'agents':
      result = await engine.listAgents();
      break;
    case 'workflows':
      result = await engine.listWorkflows();
      break;
    case 'modules':
      result = await engine.listModules();
      break;
  }

  s.stop(result?.success ? pc.green('✓ Loaded') : pc.red('✗ Failed'));

  if (result?.success) {
    clack.note(
      result.text,
      pc.cyan(`${what.charAt(0).toUpperCase() + what.slice(1)}`),
    );
  } else {
    clack.log.error(result?.error || 'Unknown error');
  }
}

async function tuiSearch(engine: BMADEngine) {
  const query = await clack.text({
    message: 'Enter search query:',
    placeholder: 'e.g., debug, architecture, test',
  });

  if (clack.isCancel(query) || !query) {
    return;
  }

  const type = await clack.select({
    message: 'Search in:',
    options: [
      { value: 'all', label: 'Agents and Workflows' },
      { value: 'agents', label: 'Agents only' },
      { value: 'workflows', label: 'Workflows only' },
    ],
  });

  if (clack.isCancel(type)) {
    return;
  }

  const s = clack.spinner();
  s.start('Searching...');

  const result = await engine.search(query, type);

  s.stop(result.success ? pc.green('✓ Found results') : pc.red('✗ Failed'));

  if (result.success) {
    clack.note(result.text, pc.cyan('Search Results'));
  } else {
    clack.log.error(result.error || 'Unknown error');
  }
}

async function tuiRead(engine: BMADEngine) {
  const what = await clack.select({
    message: 'What would you like to read?',
    options: [
      { value: 'agent', label: 'Agent details' },
      { value: 'workflow', label: 'Workflow details' },
      { value: 'back', label: '← Back' },
    ],
  });

  if (clack.isCancel(what) || what === 'back') {
    return;
  }

  // Get list first
  const s = clack.spinner();
  s.start(`Loading ${what}s...`);

  const listResult =
    what === 'agent' ? await engine.listAgents() : await engine.listWorkflows();

  s.stop(listResult.success ? pc.green('✓ Loaded') : pc.red('✗ Failed'));

  if (!listResult.success) {
    clack.log.error(listResult.error || 'Unknown error');
    return;
  }

  const items = listResult.data as Array<{
    name: string;
    displayName?: string;
    description?: string;
    title?: string;
  }>;

  const selected = await clack.select({
    message: `Select ${what}:`,
    options: items.map((item) => ({
      value: item.name,
      label: item.displayName || item.name,
      hint: item.description || item.title,
    })),
  });

  if (clack.isCancel(selected)) {
    return;
  }

  const readS = clack.spinner();
  readS.start(`Reading ${what} details...`);

  const result =
    what === 'agent'
      ? await engine.readAgent(selected)
      : await engine.readWorkflow(selected);

  readS.stop(result.success ? pc.green('✓ Read complete') : pc.red('✗ Failed'));

  if (result.success) {
    clack.note(
      result.text,
      pc.cyan(`${what.charAt(0).toUpperCase() + what.slice(1)} Details`),
    );
  } else {
    clack.log.error(result.error || 'Unknown error');
  }
}

async function tuiExecute(engine: BMADEngine) {
  const what = await clack.select({
    message: 'What would you like to execute?',
    options: [
      { value: 'agent', label: 'Agent' },
      { value: 'workflow', label: 'Workflow' },
      { value: 'back', label: '← Back' },
    ],
  });

  if (clack.isCancel(what) || what === 'back') {
    return;
  }

  // Get list first
  const s = clack.spinner();
  s.start(`Loading ${what}s...`);

  const listResult =
    what === 'agent' ? await engine.listAgents() : await engine.listWorkflows();

  s.stop(listResult.success ? pc.green('✓ Loaded') : pc.red('✗ Failed'));

  if (!listResult.success) {
    clack.log.error(listResult.error || 'Unknown error');
    return;
  }

  const items = listResult.data as Array<{
    name: string;
    displayName?: string;
    description?: string;
    title?: string;
  }>;

  const selected = await clack.select({
    message: `Select ${what}:`,
    options: items.map((item) => ({
      value: item.name,
      label: item.displayName || item.name,
      hint: item.description || item.title,
    })),
  });

  if (clack.isCancel(selected)) {
    return;
  }

  // Get message
  const message = await clack.text({
    message: `Enter message for ${what}:`,
    placeholder: what === 'agent' ? 'Required' : 'Optional',
  });

  if (clack.isCancel(message)) {
    return;
  }

  if (what === 'agent' && !message) {
    clack.log.error('Message is required for agent execution');
    return;
  }

  // Execute
  const execS = clack.spinner();
  execS.start(`Executing ${what}...`);

  const result =
    what === 'agent'
      ? await engine.executeAgent({ agent: selected, message: message || '' })
      : await engine.executeWorkflow({
          workflow: selected,
          message: message || '',
        });

  execS.stop(result.success ? pc.green('✓ Executed') : pc.red('✗ Failed'));

  if (result.success) {
    clack.note(result.text, pc.cyan('Execution Result'));
  } else {
    clack.log.error(result.error || 'Unknown error');
  }
}

// ============================================================================
// Run the application
// ============================================================================

main().catch((error) => {
  console.error(pc.red('Fatal error:'), error);
  process.exit(1);
});
