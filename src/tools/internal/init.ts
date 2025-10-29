import type { BMADToolResult } from '../../types/index.js';

export interface InitContext {
  projectRoot: string;
  userBmadPath: string;
}

export function handleInit(): BMADToolResult {
  return performInitialization();
}

function performInitialization(): BMADToolResult {
  // BMAD initialization now requires external installation via npx bmad-method install
  // We provide a clear error message and guidance
  return {
    success: false,
    type: 'init',
    exitCode: 1,
    error: 'BMAD initialization is not supported via MCP server. Please use: npx bmad-method install',
  };
}

export default handleInit;

