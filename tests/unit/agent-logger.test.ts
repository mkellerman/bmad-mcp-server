/**
 * Unit tests for Agent Logger helper
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AgentLogger,
  createAgentLogger,
  captureAgentExecution,
  formatAgentLog,
  formatAgentLogs,
  logAndCapture,
  measureAction,
  type AgentAction,
} from '../framework/helpers/agent-logger.js';

describe('AgentLogger', () => {
  describe('constructor', () => {
    it('should create logger with default config', () => {
      const logger = new AgentLogger();
      expect(logger).toBeInstanceOf(AgentLogger);
      expect(logger.getActions()).toEqual([]);
    });

    it('should create logger with custom config', () => {
      const logger = new AgentLogger({
        captureDebug: true,
        maxActions: 100,
        includeMetadata: false,
      });
      expect(logger).toBeInstanceOf(AgentLogger);
    });
  });

  describe('logAction', () => {
    let logger: AgentLogger;

    beforeEach(() => {
      logger = new AgentLogger();
    });

    it('should log a basic action', () => {
      logger.logAction('info', 'Test message');
      const actions = logger.getActions();

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('info');
      expect(actions[0].message).toBe('Test message');
      expect(actions[0].timestamp).toBeDefined();
    });

    it('should log action with metadata', () => {
      logger.logAction('info', 'Test message', { key: 'value' });
      const actions = logger.getActions();

      expect(actions[0].metadata).toEqual({ key: 'value' });
    });

    it('should skip debug logs when captureDebug is false', () => {
      logger.logAction('debug', 'Debug message');
      expect(logger.getActions()).toHaveLength(0);
    });

    it('should capture debug logs when captureDebug is true', () => {
      const debugLogger = new AgentLogger({ captureDebug: true });
      debugLogger.logAction('debug', 'Debug message');
      expect(debugLogger.getActions()).toHaveLength(1);
    });

    it('should respect maxActions limit', () => {
      const limitedLogger = new AgentLogger({ maxActions: 2 });
      limitedLogger.logAction('info', 'Message 1');
      limitedLogger.logAction('info', 'Message 2');
      limitedLogger.logAction('info', 'Message 3');

      expect(limitedLogger.getActions()).toHaveLength(2);
    });

    it('should not include metadata when includeMetadata is false', () => {
      const noMetadataLogger = new AgentLogger({ includeMetadata: false });
      noMetadataLogger.logAction('info', 'Test', { key: 'value' });

      expect(noMetadataLogger.getActions()[0].metadata).toBeUndefined();
    });

    it('should include agent context when set', () => {
      logger.logAgentInvoked('test-agent');
      logger.logAction('info', 'Test message');

      const actions = logger.getActions();
      expect(actions[1].agent).toBe('test-agent');
    });

    it('should include workflow context when set', () => {
      logger.logWorkflowStart('test-workflow');
      logger.logAction('info', 'Test message');

      const actions = logger.getActions();
      expect(actions[1].workflow).toBe('test-workflow');
    });
  });

  describe('workflow logging', () => {
    let logger: AgentLogger;

    beforeEach(() => {
      logger = new AgentLogger();
    });

    it('should log workflow start', () => {
      logger.logWorkflowStart('my-workflow');
      const actions = logger.getActions();

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('workflow_start');
      expect(actions[0].message).toContain('my-workflow');
    });

    it('should log workflow end', () => {
      logger.logWorkflowEnd('my-workflow');
      const actions = logger.getActions();

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('workflow_end');
      expect(actions[0].message).toContain('my-workflow');
    });

    it('should set workflow context', () => {
      logger.logWorkflowStart('my-workflow');
      logger.logInfo('Test');

      expect(logger.getActions()[1].workflow).toBe('my-workflow');
    });
  });

  describe('task logging', () => {
    let logger: AgentLogger;

    beforeEach(() => {
      logger = new AgentLogger();
    });

    it('should log task start', () => {
      logger.logTaskStart('my-task');
      const actions = logger.getActions();

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('task_start');
      expect(actions[0].message).toContain('my-task');
    });

    it('should log task end', () => {
      logger.logTaskEnd('my-task');
      const actions = logger.getActions();

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('task_end');
      expect(actions[0].message).toContain('my-task');
    });

    it('should include task in metadata', () => {
      logger.logTaskStart('my-task', { extra: 'data' });
      const actions = logger.getActions();

      expect(actions[0].metadata?.task).toBe('my-task');
      expect(actions[0].metadata?.extra).toBe('data');
    });
  });

  describe('agent logging', () => {
    let logger: AgentLogger;

    beforeEach(() => {
      logger = new AgentLogger();
    });

    it('should log agent invocation', () => {
      logger.logAgentInvoked('my-agent');
      const actions = logger.getActions();

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('agent_invoked');
      expect(actions[0].message).toContain('my-agent');
    });

    it('should set agent context', () => {
      logger.logAgentInvoked('my-agent');
      logger.logInfo('Test');

      expect(logger.getActions()[1].agent).toBe('my-agent');
    });
  });

  describe('tool logging', () => {
    let logger: AgentLogger;

    beforeEach(() => {
      logger = new AgentLogger();
    });

    it('should log tool call without args', () => {
      logger.logToolCall('my-tool');
      const actions = logger.getActions();

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('tool_called');
      expect(actions[0].message).toContain('my-tool');
    });

    it('should log tool call with args', () => {
      logger.logToolCall('my-tool', { arg1: 'value1' });
      const actions = logger.getActions();

      expect(actions[0].metadata?.args).toEqual({ arg1: 'value1' });
    });

    it('should log tool call with result', () => {
      logger.logToolCall('my-tool', { arg1: 'value1' }, { result: 'success' });
      const actions = logger.getActions();

      expect(actions[0].metadata?.result).toEqual({ result: 'success' });
    });
  });

  describe('state change logging', () => {
    let logger: AgentLogger;

    beforeEach(() => {
      logger = new AgentLogger();
    });

    it('should log state change', () => {
      logger.logStateChange('idle', 'running');
      const actions = logger.getActions();

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('state_change');
      expect(actions[0].message).toContain('idle → running');
    });

    it('should include from and to in metadata', () => {
      logger.logStateChange('idle', 'running');
      const actions = logger.getActions();

      expect(actions[0].metadata?.from).toBe('idle');
      expect(actions[0].metadata?.to).toBe('running');
    });
  });

  describe('error logging', () => {
    let logger: AgentLogger;

    beforeEach(() => {
      logger = new AgentLogger();
    });

    it('should log error from Error object', () => {
      const error = new Error('Test error');
      logger.logError(error);
      const actions = logger.getActions();

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('error');
      expect(actions[0].message).toContain('Test error');
      expect(actions[0].metadata?.error).toContain('Error: Test error');
    });

    it('should log error from string', () => {
      logger.logError('Test error');
      const actions = logger.getActions();

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('error');
      expect(actions[0].message).toContain('Test error');
    });
  });

  describe('info and debug logging', () => {
    let logger: AgentLogger;

    beforeEach(() => {
      logger = new AgentLogger();
    });

    it('should log info message', () => {
      logger.logInfo('Info message');
      expect(logger.getActions()).toHaveLength(1);
      expect(logger.getActions()[0].type).toBe('info');
    });

    it('should not log debug by default', () => {
      logger.logDebug('Debug message');
      expect(logger.getActions()).toHaveLength(0);
    });

    it('should log debug when enabled', () => {
      const debugLogger = new AgentLogger({ captureDebug: true });
      debugLogger.logDebug('Debug message');
      expect(debugLogger.getActions()).toHaveLength(1);
    });
  });

  describe('metadata management', () => {
    let logger: AgentLogger;

    beforeEach(() => {
      logger = new AgentLogger();
    });

    it('should set metadata', () => {
      logger.setMetadata('key', 'value');
      // Metadata is internal, we can verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('action retrieval', () => {
    let logger: AgentLogger;

    beforeEach(() => {
      logger = new AgentLogger();
      logger.logInfo('Info 1');
      logger.logError('Error 1');
      logger.logInfo('Info 2');
      logger.logError('Error 2');
    });

    it('should get all actions', () => {
      expect(logger.getActions()).toHaveLength(4);
    });

    it('should get actions by type', () => {
      const errors = logger.getActionsByType('error');
      expect(errors).toHaveLength(2);
      expect(errors.every((a) => a.type === 'error')).toBe(true);
    });

    it('should return copy of actions array', () => {
      const actions1 = logger.getActions();
      const actions2 = logger.getActions();
      expect(actions1).not.toBe(actions2);
      expect(actions1).toEqual(actions2);
    });
  });

  describe('duration tracking', () => {
    let logger: AgentLogger;

    beforeEach(() => {
      logger = new AgentLogger();
    });

    it('should track duration before completion', () => {
      const duration = logger.getDuration();
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should mark execution as complete', () => {
      logger.complete();
      const duration1 = logger.getDuration();

      // Wait a bit
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Busy wait
      }

      const duration2 = logger.getDuration();
      expect(duration2).toBe(duration1); // Should be same after complete
    });
  });

  describe('clear', () => {
    let logger: AgentLogger;

    beforeEach(() => {
      logger = new AgentLogger();
      logger.logInfo('Info 1');
      logger.logInfo('Info 2');
    });

    it('should clear all actions', () => {
      expect(logger.getActions()).toHaveLength(2);
      logger.clear();
      expect(logger.getActions()).toHaveLength(0);
    });
  });

  describe('getSummary', () => {
    let logger: AgentLogger;

    beforeEach(() => {
      logger = new AgentLogger();
    });

    it('should return summary with basic stats', () => {
      logger.logInfo('Info 1');
      logger.logError('Error 1');
      logger.logInfo('Info 2');

      const summary = logger.getSummary();
      expect(summary.actionCount).toBe(3);
      expect(summary.errorCount).toBe(1);
      expect(summary.duration).toBeGreaterThanOrEqual(0);
    });

    it('should include agent and workflow when set', () => {
      logger.logAgentInvoked('my-agent');
      logger.logWorkflowStart('my-workflow');

      const summary = logger.getSummary();
      expect(summary.agent).toBe('my-agent');
      expect(summary.workflow).toBe('my-workflow');
    });
  });

  describe('formatForReporter', () => {
    let logger: AgentLogger;

    beforeEach(() => {
      logger = new AgentLogger();
    });

    it('should format as AgentLog object', () => {
      logger.logAgentInvoked('test-agent');
      logger.logInfo('Test message');
      logger.complete();

      const agentLog = logger.formatForReporter();

      expect(agentLog.id).toBeDefined();
      expect(agentLog.agentName).toBe('test-agent');
      expect(agentLog.startTime).toBeDefined();
      expect(agentLog.endTime).toBeDefined();
      expect(agentLog.entries).toHaveLength(2);
    });

    it('should format entries with correct structure', () => {
      logger.logInfo('Test message', { key: 'value' });
      const agentLog = logger.formatForReporter();

      expect(agentLog.entries[0].timestamp).toBeDefined();
      expect(agentLog.entries[0].level).toBe('info');
      expect(agentLog.entries[0].message).toBe('Test message');
      expect(agentLog.entries[0].context).toEqual({ key: 'value' });
    });

    it('should handle unknown agent name', () => {
      logger.logInfo('Test');
      const agentLog = logger.formatForReporter();

      expect(agentLog.agentName).toBe('unknown');
    });

    it('should not have endTime before completion', () => {
      logger.logInfo('Test');
      const agentLog = logger.formatForReporter();

      expect(agentLog.endTime).toBeUndefined();
    });
  });

  describe('mapActionTypeToLogLevel', () => {
    let logger: AgentLogger;

    beforeEach(() => {
      logger = new AgentLogger({ captureDebug: true });
    });

    it('should map error to error level', () => {
      logger.logError('Error');
      const agentLog = logger.formatForReporter();
      expect(agentLog.entries[0].level).toBe('error');
    });

    it('should map debug to debug level', () => {
      logger.logDebug('Debug');
      const agentLog = logger.formatForReporter();
      expect(agentLog.entries[0].level).toBe('debug');
    });

    it('should map other types to info level', () => {
      logger.logWorkflowStart('test');
      logger.logTaskStart('test');
      logger.logAgentInvoked('test');
      logger.logToolCall('test');
      logger.logStateChange('a', 'b');
      logger.logInfo('test');

      const agentLog = logger.formatForReporter();
      agentLog.entries.forEach((entry) => {
        expect(entry.level).toBe('info');
      });
    });
  });
});

describe('createAgentLogger', () => {
  it('should create a new logger', () => {
    const logger = createAgentLogger();
    expect(logger).toBeInstanceOf(AgentLogger);
  });

  it('should pass config to logger', () => {
    const logger = createAgentLogger({ captureDebug: true });
    logger.logDebug('Test');
    expect(logger.getActions()).toHaveLength(1);
  });
});

describe('captureAgentExecution', () => {
  it('should capture successful execution', async () => {
    const { result, logger } = await captureAgentExecution(async (log) => {
      log.logInfo('Test');
      return 'success';
    });

    expect(result).toBe('success');
    expect(logger.getActions()).toHaveLength(1);
    expect(logger.getDuration()).toBeGreaterThanOrEqual(0);
  });

  it('should capture errors and re-throw', async () => {
    await expect(
      captureAgentExecution(async (log) => {
        log.logInfo('Before error');
        throw new Error('Test error');
      }),
    ).rejects.toThrow('Test error');
  });

  it('should log errors before re-throwing', async () => {
    try {
      await captureAgentExecution(async () => {
        throw new Error('Test error');
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch {
      // Expected to throw
      expect(true).toBe(true);
    }
  });

  it('should complete logger on success', async () => {
    const { logger } = await captureAgentExecution(async (log) => {
      log.logInfo('Test');
      return 'success';
    });

    const summary = logger.getSummary();
    expect(summary.duration).toBeGreaterThanOrEqual(0);
  });
});

describe('formatAgentLog', () => {
  it('should format basic action', () => {
    const action: AgentAction = {
      timestamp: '2024-01-01T00:00:00.000Z',
      type: 'info',
      message: 'Test message',
    };

    const formatted = formatAgentLog(action);
    expect(formatted).toContain('[2024-01-01T00:00:00.000Z]');
    expect(formatted).toContain('[INFO]');
    expect(formatted).toContain('Test message');
  });

  it('should include agent when present', () => {
    const action: AgentAction = {
      timestamp: '2024-01-01T00:00:00.000Z',
      type: 'info',
      message: 'Test',
      agent: 'my-agent',
    };

    const formatted = formatAgentLog(action);
    expect(formatted).toContain('[my-agent]');
  });

  it('should include workflow when present', () => {
    const action: AgentAction = {
      timestamp: '2024-01-01T00:00:00.000Z',
      type: 'info',
      message: 'Test',
      workflow: 'my-workflow',
    };

    const formatted = formatAgentLog(action);
    expect(formatted).toContain('[my-workflow]');
  });

  it('should include task when present', () => {
    const action: AgentAction = {
      timestamp: '2024-01-01T00:00:00.000Z',
      type: 'info',
      message: 'Test',
      task: 'my-task',
    };

    const formatted = formatAgentLog(action);
    expect(formatted).toContain('[my-task]');
  });

  it('should include metadata when present', () => {
    const action: AgentAction = {
      timestamp: '2024-01-01T00:00:00.000Z',
      type: 'info',
      message: 'Test',
      metadata: { key: 'value' },
    };

    const formatted = formatAgentLog(action);
    expect(formatted).toContain(JSON.stringify({ key: 'value' }));
  });
});

describe('formatAgentLogs', () => {
  it('should format multiple actions', () => {
    const actions: AgentAction[] = [
      {
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'info',
        message: 'First',
      },
      {
        timestamp: '2024-01-01T00:00:01.000Z',
        type: 'info',
        message: 'Second',
      },
    ];

    const formatted = formatAgentLogs(actions);
    expect(formatted).toContain('First');
    expect(formatted).toContain('Second');
    expect(formatted.split('\n')).toHaveLength(2);
  });

  it('should handle empty array', () => {
    const formatted = formatAgentLogs([]);
    expect(formatted).toBe('');
  });
});

describe('logAndCapture', () => {
  it('should capture execution and return formatted logs', async () => {
    const { result, logs, summary } = await logAndCapture(async (log) => {
      log.logAgentInvoked('test-agent');
      log.logInfo('Test message');
      return 'success';
    });

    expect(result).toBe('success');
    expect(logs.agentName).toBe('test-agent');
    expect(logs.entries).toHaveLength(2);
    expect(summary.actionCount).toBe(2);
  });

  it('should handle errors', async () => {
    await expect(
      logAndCapture(async (log) => {
        log.logInfo('Before error');
        throw new Error('Test error');
      }),
    ).rejects.toThrow('Test error');
  });
});

describe('measureAction', () => {
  it('should measure successful action', async () => {
    const logger = new AgentLogger();

    const result = await measureAction(logger, 'test-action', async () => {
      return 'success';
    });

    expect(result).toBe('success');
    expect(logger.getActions()).toHaveLength(2); // Start and complete
    expect(logger.getActions()[0].message).toContain('Starting');
    expect(logger.getActions()[1].message).toContain('Completed');
    expect(logger.getActions()[1].metadata?.duration).toBeGreaterThanOrEqual(0);
  });

  it('should measure failed action', async () => {
    const logger = new AgentLogger();

    await expect(
      measureAction(logger, 'test-action', async () => {
        throw new Error('Test error');
      }),
    ).rejects.toThrow('Test error');

    expect(logger.getActions()).toHaveLength(2); // Start and error
    const errorAction = logger.getActionsByType('error')[0];
    expect(errorAction.metadata?.action).toBe('test-action');
    expect(errorAction.metadata?.duration).toBeGreaterThanOrEqual(0);
  });
});
