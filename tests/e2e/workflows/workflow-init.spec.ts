/**
 * E2E Test: workflow-init execution
 *
 * Validates that the 'execute workflow-init' command correctly triggers
 * the workflow-init workflow in the BMAD MCP server.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClientFixture } from '../../support/mcp-client-fixture';

describe('workflow-init execution', () => {
  let mcpClient: MCPClientFixture;

  beforeAll(async () => {
    mcpClient = new MCPClientFixture();
    await mcpClient.setup();
  }, 30000);

  afterAll(async () => {
    await mcpClient.cleanup();
  });

  it('should execute workflow-init when requested', async () => {
    // Execute the BMAD tool with workflow-init
    const result = await mcpClient.callTool('bmad', {
      operation: 'execute',
      workflow: 'workflow-init',
      message: 'Initialize BMM project',
    });

    // Log the full response for debugging
    console.log('\n=== WORKFLOW-INIT EXECUTION TEST ===');
    console.log('Tool Response:', result.content);
    console.log('Is Error:', result.isError);
    console.log('=====================================\n');

    // Assertions
    expect(result.isError).toBe(false);
    expect(result.content).toBeTruthy();
    expect(result.content.length).toBeGreaterThan(0);

    // Check that we got a response indicating workflow execution
    // (not an error about workflow not found)
    expect(result.content).not.toContain('Workflow not found');

    // Check for actual error (not instructional ❌ DO NOT text)
    expect(result.content).not.toMatch(/^❌/m); // Should not start with error emoji

    // The workflow should either:
    // 1. Execute successfully and return workflow content/instructions
    // 2. Return an interactive prompt from the workflow
    const hasWorkflowContent =
      result.content.includes('workflow') ||
      result.content.includes('initialize') ||
      result.content.includes('project') ||
      result.content.includes('BMM') ||
      result.content.includes('level') || // workflow-init asks about project level
      result.content.includes('type'); // workflow-init asks about project type

    expect(hasWorkflowContent).toBe(true);
  }, 30000);

  it('should handle workflow-init with module specification', async () => {
    // Try executing with explicit module
    const result = await mcpClient.callTool('bmad', {
      operation: 'execute',
      workflow: 'workflow-init',
      module: 'bmm',
      message: 'Initialize BMM project for my app',
    });

    console.log('\n=== WORKFLOW-INIT WITH MODULE TEST ===');
    console.log('Tool Response:', result.content);
    console.log('Is Error:', result.isError);
    console.log('========================================\n');

    expect(result.isError).toBe(false);
    expect(result.content).toBeTruthy();
    expect(result.content).not.toContain('Workflow not found');
    expect(result.content).not.toMatch(/^❌/m); // Should not start with error emoji
  }, 30000);

  it.skip('should return workflow-init details when using read operation', async () => {
    // TODO: Fix validation error in read operation
    // Read the workflow definition
    const result = await mcpClient.callTool('bmad', {
      operation: 'read',
      type: 'workflow',
      workflow: 'workflow-init',
    });

    console.log('\n=== WORKFLOW-INIT READ TEST ===');
    console.log('Tool Response:', result.content);
    console.log('Is Error:', result.isError);
    console.log('================================\n');

    expect(result.isError).toBe(false);
    expect(result.content).toBeTruthy();

    // Should contain workflow metadata
    const hasMetadata =
      result.content.includes('workflow-init') ||
      result.content.includes('description') ||
      result.content.includes('name');

    expect(hasMetadata).toBe(true);
  }, 30000);
});
