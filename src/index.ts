#!/usr/bin/env node

/**
 * BMAD MCP Server - Entry point
 *
 * This is the main entry point for the BMAD MCP server.
 * It initializes and runs the server using stdio transport.
 */

import { main } from './server.js';

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
