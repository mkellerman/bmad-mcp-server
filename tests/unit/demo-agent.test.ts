/**
 * Demo Agent Test
 * Shows how agent execution data appears in test reports
 */

import { describe, it, expect } from 'vitest';
import { createAgentLogger } from '../framework/helpers/agent-logger.js';

describe('Demo Agent Execution', () => {
  it('should show agent workflow execution', async () => {
    const logger = createAgentLogger();

    console.log('=== AGENT WORKFLOW: party-mode ===\n');

    // Start workflow
    logger.logWorkflowStart('party-mode');
    console.log('[WORKFLOW START] party-mode');
    console.log('Timestamp:', new Date().toISOString());
    console.log('');

    // Agent 1: Orchestrator
    logger.logAgentInvoked('bmad-orchestrator');
    console.log('[AGENT INVOKED] bmad-orchestrator');
    console.log('Role: Coordinate the party-mode workflow');
    console.log('');

    logger.logTaskStart('analyze-requirements');
    console.log('  [TASK START] analyze-requirements');
    console.log('  Duration: 245ms');
    logger.logTaskEnd('analyze-requirements');
    console.log('  [TASK END] analyze-requirements');
    console.log('');

    // Agent 2: Analyst
    logger.logAgentInvoked('analyst');
    console.log('[AGENT INVOKED] analyst (Mary)');
    console.log('Role: Business requirements analysis');
    console.log('');

    logger.logToolCall('bmad', { command: 'analyze' });
    console.log('  [TOOL CALL] bmad');
    console.log('  Command: analyze');
    console.log(
      '  Arguments:',
      JSON.stringify({ input: 'user requirements' }, null, 2),
    );
    console.log('  Result: ✓ Analysis complete');
    console.log('');

    // Agent 3: Architect
    logger.logAgentInvoked('architect');
    console.log('[AGENT INVOKED] architect (Alex)');
    console.log('Role: Solution architecture design');
    console.log('');

    logger.logTaskStart('design-solution');
    console.log('  [TASK START] design-solution');
    const designData = {
      components: ['API Layer', 'Business Logic', 'Data Layer'],
      patterns: ['MVC', 'Repository', 'Factory'],
      technologies: ['TypeScript', 'Node.js', 'PostgreSQL'],
    };
    console.log('  Design Output:', JSON.stringify(designData, null, 2));
    logger.logTaskEnd('design-solution');
    console.log('  [TASK END] design-solution');
    console.log('  Duration: 1.2s');
    console.log('');

    // Complete workflow
    logger.logWorkflowEnd('party-mode');
    logger.complete();

    console.log('[WORKFLOW END] party-mode');
    const summary = logger.getSummary();
    console.log('Summary:');
    console.log(`  Total Actions: ${summary.actionCount}`);
    console.log(`  Total Duration: ${summary.duration}ms`);
    console.log(`  Errors: ${summary.errorCount}`);
    console.log(`  Final Agent: ${summary.agent}`);

    // Get formatted log for reporter
    const agentLog = logger.formatForReporter();

    expect(agentLog.agentName).toBe('architect');
    expect(agentLog.entries.length).toBeGreaterThan(5);
    expect(summary.errorCount).toBe(0);
  });

  it('should show agent tool calls with MCP', async () => {
    const logger = createAgentLogger();

    console.log('=== AGENT MCP TOOL INTERACTION ===\n');

    logger.logAgentInvoked('dev');
    console.log('[AGENT] dev (Diana)');
    console.log('Task: Implement feature using MCP tools');
    console.log('');

    // Tool Call 1: File read
    logger.logToolCall('read_file', { path: 'src/app.ts' });
    console.log('[MCP TOOL CALL #1]');
    console.log('Tool: read_file');
    console.log(
      'Request:',
      JSON.stringify(
        { path: 'src/app.ts', startLine: 1, endLine: 50 },
        null,
        2,
      ),
    );
    console.log('Response: ✓ 45 lines read');
    console.log('Duration: 12ms');
    console.log('');

    // Tool Call 2: Code search
    logger.logToolCall('grep_search', {
      query: 'function.*calculate',
      isRegexp: true,
    });
    console.log('[MCP TOOL CALL #2]');
    console.log('Tool: grep_search');
    console.log(
      'Request:',
      JSON.stringify({ query: 'function.*calculate', isRegexp: true }, null, 2),
    );
    console.log('Response: Found 3 matches');
    console.log(
      'Matches:',
      JSON.stringify(
        [
          { file: 'src/calc.ts', line: 15 },
          { file: 'src/utils.ts', line: 42 },
          { file: 'tests/calc.test.ts', line: 8 },
        ],
        null,
        2,
      ),
    );
    console.log('Duration: 156ms');
    console.log('');

    // Tool Call 3: File write
    logger.logToolCall('replace_string_in_file', { filePath: 'src/app.ts' });
    console.log('[MCP TOOL CALL #3]');
    console.log('Tool: replace_string_in_file');
    console.log(
      'Request:',
      JSON.stringify(
        {
          filePath: 'src/app.ts',
          oldString: 'export function calculate(a, b) {',
          newString:
            'export function calculate(a: number, b: number): number {',
        },
        null,
        2,
      ),
    );
    console.log('Response: ✓ File updated successfully');
    console.log('Duration: 23ms');
    console.log('');

    logger.complete();
    const summary = logger.getSummary();

    console.log('[EXECUTION COMPLETE]');
    console.log(
      `Total MCP Tool Calls: ${logger.getActionsByType('tool_called').length}`,
    );
    console.log(`Total Duration: ${summary.duration}ms`);

    expect(logger.getActionsByType('tool_called').length).toBe(3);
  });

  it('should show agent error handling', async () => {
    const logger = createAgentLogger();

    console.log('=== AGENT ERROR HANDLING ===\n');

    logger.logAgentInvoked('qa');
    console.log('[AGENT] qa (Quinn)');
    console.log('Task: Run test suite');
    console.log('');

    logger.logTaskStart('run-unit-tests');
    console.log('[TASK] run-unit-tests');
    console.log('Status: Running...');
    console.log('');

    // Simulate an error
    logger.logError('Test suite failed: 3 tests failed out of 45');
    console.error('[ERROR] Test suite failed');
    console.error('Failed Tests:');
    console.error('  1. calculator.test.ts - "should handle division by zero"');
    console.error('  2. auth.test.ts - "should validate JWT tokens"');
    console.error('  3. api.test.ts - "should handle rate limiting"');
    console.error('');
    console.error('Error Details:');
    console.error(
      JSON.stringify(
        {
          total: 45,
          passed: 42,
          failed: 3,
          skipped: 0,
          duration: '2.3s',
        },
        null,
        2,
      ),
    );
    console.log('');

    logger.logInfo('Generating error report');
    console.log('[INFO] Generating detailed error report...');
    console.log('Report saved to: test-results/error-report.html');
    console.log('');

    logger.logTaskEnd('run-unit-tests');
    logger.complete();

    const summary = logger.getSummary();
    console.log('[SUMMARY]');
    console.log(`Errors: ${summary.errorCount}`);
    console.log(`Total Actions: ${summary.actionCount}`);

    expect(summary.errorCount).toBe(1);
    expect(logger.getActionsByType('error').length).toBe(1);
  });

  it('should show agent state transitions', async () => {
    const logger = createAgentLogger();

    console.log('=== AGENT STATE MACHINE ===\n');

    logger.logAgentInvoked('deployment-agent');
    console.log('[AGENT] deployment-agent');
    console.log('Initial State: IDLE');
    console.log('');

    // State: Preparing
    logger.logStateChange('IDLE', 'PREPARING');
    console.log('[STATE CHANGE] IDLE → PREPARING');
    console.log('Action: Validating deployment configuration');
    console.log('Timestamp:', new Date().toISOString());
    console.log('');

    // State: Building
    logger.logStateChange('PREPARING', 'BUILDING');
    console.log('[STATE CHANGE] PREPARING → BUILDING');
    console.log('Action: Compiling TypeScript and bundling assets');
    console.log('Progress: 0%...25%...50%...75%...100%');
    console.log('Duration: 8.4s');
    console.log('');

    // State: Testing
    logger.logStateChange('BUILDING', 'TESTING');
    console.log('[STATE CHANGE] BUILDING → TESTING');
    console.log('Action: Running integration tests');
    console.log('Tests: 156 passed, 0 failed');
    console.log('Duration: 12.1s');
    console.log('');

    // State: Deploying
    logger.logStateChange('TESTING', 'DEPLOYING');
    console.log('[STATE CHANGE] TESTING → DEPLOYING');
    console.log('Action: Pushing to production');
    console.log('Environment: production');
    console.log('Version: v2.1.0');
    console.log('Duration: 3.2s');
    console.log('');

    // State: Complete
    logger.logStateChange('DEPLOYING', 'COMPLETE');
    console.log('[STATE CHANGE] DEPLOYING → COMPLETE');
    console.log('Status: ✓ Deployment successful');
    console.log('URL: https://api.example.com');
    console.log('');

    logger.complete();

    const stateChanges = logger.getActionsByType('state_change');
    console.log('[FINAL STATE]');
    console.log(`Total State Transitions: ${stateChanges.length}`);
    console.log(`Final State: COMPLETE`);
    console.log(`Total Duration: ${logger.getDuration()}ms`);

    expect(stateChanges.length).toBe(5);
  });
});
