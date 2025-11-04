/**
 * Agent Logger Usage Examples
 *
 * This file demonstrates how to use the Agent Logger helper
 * in real-world testing scenarios.
 */

import { describe, it, expect } from 'vitest';
import {
  createAgentLogger,
  captureAgentExecution,
  logAndCapture,
  measureAction,
} from '../framework/helpers/agent-logger.js';

describe('Agent Logger Usage Examples', () => {
  describe('Basic Logging', () => {
    it('should log agent workflow execution', async () => {
      const logger = createAgentLogger();

      // Start workflow
      logger.logWorkflowStart('party-mode');

      // Invoke agents
      logger.logAgentInvoked('bmad-orchestrator');
      logger.logInfo('Orchestrating workflow');

      logger.logAgentInvoked('analyst');
      logger.logInfo('Analyzing requirements');

      logger.logAgentInvoked('architect');
      logger.logInfo('Designing solution');

      // Complete workflow
      logger.logWorkflowEnd('party-mode');
      logger.complete();

      // Get formatted log
      const agentLog = logger.formatForReporter();

      expect(agentLog.agentName).toBe('architect'); // Last agent
      expect(agentLog.entries.length).toBeGreaterThan(5);
      expect(agentLog.endTime).toBeDefined();
    });

    it('should log task execution', async () => {
      const logger = createAgentLogger();

      logger.logWorkflowStart('dev-story');
      logger.logAgentInvoked('dev');

      // Log tasks
      logger.logTaskStart('analyze-requirements');
      logger.logInfo('Reading user story');
      logger.logTaskEnd('analyze-requirements');

      logger.logTaskStart('implement-feature');
      logger.logInfo('Writing code');
      logger.logTaskEnd('implement-feature');

      logger.logTaskStart('write-tests');
      logger.logInfo('Creating test cases');
      logger.logTaskEnd('write-tests');

      logger.complete();

      const summary = logger.getSummary();
      expect(summary.actionCount).toBeGreaterThan(8);
      expect(summary.workflow).toBe('dev-story');
    });
  });

  describe('Tool Call Logging', () => {
    it('should log MCP tool calls', async () => {
      const logger = createAgentLogger();

      logger.logAgentInvoked('bmad-master');

      // Log tool calls
      logger.logToolCall('bmad', { command: '*list-agents' });
      logger.logToolCall('bmad', { command: 'analyst' });
      logger.logToolCall(
        'bmad',
        { command: 'architect' },
        { content: [{ type: 'text', text: 'Agent loaded' }] },
      );

      const toolCalls = logger.getActionsByType('tool_called');
      expect(toolCalls).toHaveLength(3);
      expect(toolCalls[2].metadata?.result).toBeDefined();
    });
  });

  describe('Error Tracking', () => {
    it('should log and track errors', async () => {
      const logger = createAgentLogger();

      logger.logAgentInvoked('test-agent');
      logger.logInfo('Starting execution');

      try {
        throw new Error('Simulated failure');
      } catch (error) {
        logger.logError(error as Error, { context: 'test-execution' });
      }

      logger.logInfo('Recovering from error');
      logger.complete();

      const summary = logger.getSummary();
      expect(summary.errorCount).toBe(1);

      const errors = logger.getActionsByType('error');
      expect(errors[0].message).toContain('Simulated failure');
    });
  });

  describe('State Transitions', () => {
    it('should track agent state changes', async () => {
      const logger = createAgentLogger();

      logger.logAgentInvoked('workflow-agent');
      logger.logStateChange('idle', 'initializing');
      logger.logStateChange('initializing', 'running');
      logger.logStateChange('running', 'waiting');
      logger.logStateChange('waiting', 'running');
      logger.logStateChange('running', 'completed');

      const states = logger.getActionsByType('state_change');
      expect(states).toHaveLength(5);

      // Verify state progression
      expect(states[0].metadata?.from).toBe('idle');
      expect(states[4].metadata?.to).toBe('completed');
    });
  });

  describe('Debug Logging', () => {
    it('should capture debug logs when enabled', async () => {
      const logger = createAgentLogger({ captureDebug: true });

      logger.logAgentInvoked('debug-agent');
      logger.logDebug('Starting debug session');
      logger.logDebug('Variable x = 42');
      logger.logDebug('Entering loop');
      logger.logInfo('Processing complete');

      const debugLogs = logger.getActionsByType('debug');
      expect(debugLogs).toHaveLength(3);
    });

    it('should skip debug logs when disabled', async () => {
      const logger = createAgentLogger({ captureDebug: false });

      logger.logAgentInvoked('prod-agent');
      logger.logDebug('This should not appear');
      logger.logInfo('This should appear');

      const actions = logger.getActions();
      expect(actions).toHaveLength(2); // agent_invoked + info
      expect(actions.some((a) => a.type === 'debug')).toBe(false);
    });
  });

  describe('Auto-Capture Execution', () => {
    it('should capture execution automatically', async () => {
      const { result, logger } = await captureAgentExecution(async (log) => {
        log.logAgentInvoked('auto-agent');
        log.logWorkflowStart('auto-workflow');

        // Simulate work
        log.logInfo('Processing step 1');
        log.logInfo('Processing step 2');
        log.logInfo('Processing step 3');

        log.logWorkflowEnd('auto-workflow');

        return { success: true, itemsProcessed: 3 };
      });

      expect(result.success).toBe(true);
      expect(result.itemsProcessed).toBe(3);
      expect(logger.getActions()).toHaveLength(6);
      expect(logger.getDuration()).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors in auto-capture', async () => {
      await expect(
        captureAgentExecution(async (log) => {
          log.logAgentInvoked('failing-agent');
          log.logInfo('Starting work');
          throw new Error('Unexpected error');
        }),
      ).rejects.toThrow('Unexpected error');
    });
  });

  describe('Log and Capture Helper', () => {
    it('should return formatted logs and summary', async () => {
      const { result, logs, summary } = await logAndCapture(async (log) => {
        log.logAgentInvoked('comprehensive-agent');
        log.logWorkflowStart('comprehensive-workflow');

        log.logTaskStart('task-1');
        log.logInfo('Executing task 1');
        log.logTaskEnd('task-1');

        log.logTaskStart('task-2');
        log.logInfo('Executing task 2');
        log.logTaskEnd('task-2');

        log.logWorkflowEnd('comprehensive-workflow');

        return { completed: true, tasks: 2 };
      });

      expect(result.completed).toBe(true);
      expect(logs.agentName).toBe('comprehensive-agent');
      expect(logs.entries.length).toBeGreaterThan(6);
      expect(summary.actionCount).toBeGreaterThan(6);
      expect(summary.errorCount).toBe(0);
      expect(summary.workflow).toBe('comprehensive-workflow');
    });
  });

  describe('Measure Action Helper', () => {
    it('should measure action duration', async () => {
      const logger = createAgentLogger();
      logger.logAgentInvoked('timing-agent');

      const result = await measureAction(
        logger,
        'expensive-operation',
        async () => {
          // Simulate work
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 'completed';
        },
      );

      expect(result).toBe('completed');

      const actions = logger.getActions();
      expect(actions[1].message).toContain('Starting: expensive-operation');
      expect(actions[2].message).toContain('Completed: expensive-operation');
      expect(actions[2].metadata?.duration).toBeGreaterThanOrEqual(10);
    });

    it('should measure failed action duration', async () => {
      const logger = createAgentLogger();
      logger.logAgentInvoked('timing-agent');

      await expect(
        measureAction(logger, 'failing-operation', async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          throw new Error('Operation failed');
        }),
      ).rejects.toThrow('Operation failed');

      const errors = logger.getActionsByType('error');
      expect(errors).toHaveLength(1);
      expect(errors[0].metadata?.action).toBe('failing-operation');
      expect(errors[0].metadata?.duration).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Integration with Test Reporter', () => {
    it('should format logs for unified test reporter', async () => {
      const { logs } = await logAndCapture(async (log) => {
        log.logAgentInvoked('test-agent');
        log.logWorkflowStart('test-workflow');

        log.logInfo('Step 1: Initialize');
        log.logToolCall('read_file', { path: '/test.ts' });
        log.logInfo('Step 2: Process');
        log.logToolCall('write_file', { path: '/output.ts' });
        log.logInfo('Step 3: Verify');

        log.logWorkflowEnd('test-workflow');

        return { success: true };
      });

      // This is the format expected by the unified test reporter
      expect(logs.id).toBeDefined();
      expect(logs.agentName).toBe('test-agent');
      expect(logs.startTime).toBeDefined();
      expect(logs.entries).toBeInstanceOf(Array);

      // Verify entry structure
      const entry = logs.entries[0];
      expect(entry.timestamp).toBeDefined();
      expect(entry.level).toBeDefined();
      expect(entry.message).toBeDefined();

      // Can be directly used in test results
      const testResult = {
        name: 'Agent Workflow Test',
        status: 'passed' as const,
        duration: 100,
        agentLogs: [logs], // Array of AgentLog
      };

      expect(testResult.agentLogs[0].agentName).toBe('test-agent');
    });
  });

  describe('Complex Workflow Example', () => {
    it('should log complex multi-agent workflow', async () => {
      const { logs, summary } = await logAndCapture(async (log) => {
        // Orchestrator starts
        log.logAgentInvoked('bmad-orchestrator');
        log.logWorkflowStart('greenfield-fullstack');
        log.logInfo('Analyzing project requirements');

        // Delegate to analyst
        log.logAgentInvoked('analyst');
        log.logTaskStart('requirement-analysis');
        log.logInfo('Gathering requirements');
        log.logToolCall('read_file', { path: '/requirements.md' });
        log.logInfo('Requirements analyzed');
        log.logTaskEnd('requirement-analysis');

        // Delegate to architect
        log.logAgentInvoked('architect');
        log.logTaskStart('solution-design');
        log.logInfo('Designing architecture');
        log.logToolCall('create_file', { path: '/design.md' });
        log.logStateChange('planning', 'designing');
        log.logInfo('Architecture designed');
        log.logTaskEnd('solution-design');

        // Delegate to dev
        log.logAgentInvoked('dev');
        log.logTaskStart('implementation');
        log.logInfo('Implementing solution');
        log.logToolCall('create_file', { path: '/src/index.ts' });
        log.logToolCall('create_file', { path: '/src/utils.ts' });
        log.logStateChange('designing', 'implementing');
        log.logInfo('Implementation complete');
        log.logTaskEnd('implementation');

        // Delegate to QA
        log.logAgentInvoked('qa');
        log.logTaskStart('testing');
        log.logInfo('Running tests');
        log.logToolCall('run_tests', { path: '/tests' });
        log.logStateChange('implementing', 'testing');
        log.logInfo('All tests passed');
        log.logTaskEnd('testing');

        // Back to orchestrator
        log.logAgentInvoked('bmad-orchestrator');
        log.logInfo('Workflow complete');
        log.logWorkflowEnd('greenfield-fullstack');

        return { success: true, agents: 5 };
      });

      expect(logs.entries.length).toBeGreaterThan(20);
      expect(summary.actionCount).toBeGreaterThan(20);
      expect(summary.errorCount).toBe(0);

      // Verify different action types were logged
      const allActions = logs.entries;
      expect(allActions.some((e) => e.message.includes('Workflow'))).toBe(true);
      expect(allActions.some((e) => e.message.includes('Task'))).toBe(true);
      expect(allActions.some((e) => e.message.includes('Agent'))).toBe(true);
      expect(allActions.some((e) => e.message.includes('Tool'))).toBe(true);
      expect(allActions.some((e) => e.message.includes('State'))).toBe(true);
    });
  });
});
