#!/usr/bin/env node
/**
 * BMAD MCP Server - Entry Point
 *
 * Tool-per-agent architecture with Git remote support.
 *
 * This is the main entry point for the BMAD MCP Server. It creates and starts
 * a BMADServerLiteMultiToolGit instance that exposes BMAD agents and workflows
 * as MCP tools to AI assistants.
 *
 * @remarks
 * The server supports multiple BMAD content sources in priority order:
 * 1. Project-local: `./bmad/` directory (highest priority)
 * 2. User-global: `~/.bmad/` directory
 * 3. Git remotes: URLs passed as CLI arguments (lowest priority)
 *
 * @example
 * ```bash
 * # Basic usage (project + user directories only)
 * node build/index.js
 * # or
 * bmad-mcp-server
 *
 * # With Git remote sources
 * node build/index.js git+https://github.com/company/bmad-extensions.git
 *
 * # Multiple Git remotes
 * node build/index.js \
 *   git+https://github.com/company/bmad-core.git#main \
 *   git+https://github.com/company/bmad-custom.git#v2.0.0
 *
 * # Git remote with subpath (monorepo support)
 * node build/index.js git+https://github.com/org/repo.git#main:/bmad/core
 * ```
 *
 * @example
 * ```bash
 * # SSH URLs (for private repositories)
 * node build/index.js git+ssh://git@github.com/company/private-bmad.git
 * ```
 */

import { BMADServerLiteMultiToolGit } from './server.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8'),
) as { version: string };
const VERSION = packageJson.version;

/**
 * Main entry point function
 *
 * Parses command line arguments and starts the MCP server.
 * All arguments starting with 'git+' are treated as Git remote URLs.
 *
 * @remarks
 * The function filters command line arguments to extract Git URLs and passes
 * them to the server constructor. Non-Git arguments are ignored for forward
 * compatibility.
 */
async function main() {
  // Parse Git URLs from command line arguments
  const gitRemotes = process.argv
    .slice(2)
    .filter((arg) => arg.startsWith('git+'));

  // Allow overriding project root via BMAD_ROOT environment variable
  // This is useful for testing and custom deployments
  const projectRoot = process.env.BMAD_ROOT;

  console.error(`BMAD MCP Server - v${VERSION}`);
  if (gitRemotes.length > 0) {
    console.error(`Git remotes: ${gitRemotes.join(', ')}`);
  }
  if (projectRoot) {
    console.error(`Project root: ${projectRoot}`);
  }

  const server = new BMADServerLiteMultiToolGit(projectRoot, gitRemotes);
  await server.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
