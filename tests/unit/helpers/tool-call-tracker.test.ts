/**
 * Unit Tests: Tool Call Tracker
 *
 * Tests the ToolCallTracker class functionality including:
 * - Event tracking and metrics calculation
 * - Error detection (validation vs execution vs protocol)
 * - Efficiency scoring algorithm
 * - Filtering and categorization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ToolCallTracker,
  calculateEfficiencyScore,
  getEfficiencyRating,
  formatMetrics,
  type ToolCallEvent,
  type ToolCallMetrics,
} from '../../framework/helpers/tool-call-tracker.js';

describe('ToolCallTracker', () => {
  let tracker: ToolCallTracker;

  beforeEach(() => {
    tracker = new ToolCallTracker();
  });

  describe('Event Tracking', () => {
    it('should track a single tool call event', () => {
      const event: ToolCallEvent = {
        timestamp: '2025-11-09T10:00:00.000Z',
        operation: 'execute',
        parameters: { operation: 'execute', agent: 'debug', module: 'bmm' },
        response: 'success',
        duration: 500,
      };

      tracker.trackCall(event);

      const metrics = tracker.getMetrics();
      expect(metrics.totalCalls).toBe(1);
      expect(metrics.validCalls).toBe(1);
      expect(metrics.invalidCalls).toBe(0);
      expect(metrics.errorCalls).toBe(0);
      expect(metrics.duration).toBe(500);
    });

    it('should track multiple tool calls', () => {
      tracker.trackCall({
        timestamp: '2025-11-09T10:00:00.000Z',
        operation: 'list',
        parameters: { operation: 'list', query: 'agents' },
        response: 'success',
        duration: 200,
      });

      tracker.trackCall({
        timestamp: '2025-11-09T10:00:01.000Z',
        operation: 'execute',
        parameters: { operation: 'execute', agent: 'debug', module: 'bmm' },
        response: 'success',
        duration: 500,
      });

      const metrics = tracker.getMetrics();
      expect(metrics.totalCalls).toBe(2);
      expect(metrics.validCalls).toBe(2);
      expect(metrics.duration).toBe(700);
      expect(metrics.averageDuration).toBe(350);
    });

    it('should track start and end times', () => {
      tracker.trackCall({
        timestamp: '2025-11-09T10:00:00.000Z',
        operation: 'list',
        parameters: {},
        response: 'success',
        duration: 100,
      });

      tracker.trackCall({
        timestamp: '2025-11-09T10:00:05.000Z',
        operation: 'execute',
        parameters: {},
        response: 'success',
        duration: 200,
      });

      const metrics = tracker.getMetrics();
      expect(metrics.startTime).toBe('2025-11-09T10:00:00.000Z');
      expect(metrics.endTime).toBe('2025-11-09T10:00:05.000Z');
    });
  });

  describe('Error Detection', () => {
    it('should detect validation errors', () => {
      const validationError =
        '❌ Validation Error: Missing required parameter: module';

      expect(tracker.detectValidationError(validationError)).toBe(true);
      expect(tracker.detectValidationError('Success response')).toBe(false);
    });

    it('should detect execution errors', () => {
      expect(tracker.detectExecutionError('❌ Error: Agent not found')).toBe(
        true,
      );
      expect(
        tracker.detectExecutionError('Failed to execute workflow'),
      ).toBe(true);
      expect(tracker.detectExecutionError('Agent not found in module')).toBe(
        true,
      );
      expect(tracker.detectExecutionError('Success response')).toBe(false);
    });

    it('should categorize responses correctly', () => {
      expect(
        tracker.categorizeResponse(
          '❌ Validation Error: Missing parameter',
        ),
      ).toBe('validation_error');

      expect(tracker.categorizeResponse('❌ Error: Not found')).toBe(
        'execution_error',
      );

      expect(tracker.categorizeResponse('Successfully executed')).toBe(
        'success',
      );

      expect(
        tracker.categorizeResponse({ result: 'ok', status: 'success' }),
      ).toBe('success');
    });
  });

  describe('Metrics Calculation', () => {
    it('should return empty metrics for no calls', () => {
      const metrics = tracker.getMetrics();

      expect(metrics.totalCalls).toBe(0);
      expect(metrics.validCalls).toBe(0);
      expect(metrics.invalidCalls).toBe(0);
      expect(metrics.errorCalls).toBe(0);
      expect(metrics.duration).toBe(0);
      expect(metrics.averageDuration).toBe(0);
    });

    it('should count validation errors correctly', () => {
      tracker.trackCall({
        timestamp: new Date().toISOString(),
        operation: 'execute',
        parameters: { operation: 'execute', agent: 'debug' },
        response: 'validation_error',
        errorMessage: '❌ Validation Error: Missing module',
        duration: 100,
      });

      const metrics = tracker.getMetrics();
      expect(metrics.totalCalls).toBe(1);
      expect(metrics.validCalls).toBe(0);
      expect(metrics.invalidCalls).toBe(1);
      expect(metrics.errorCalls).toBe(0);
    });

    it('should count execution errors correctly', () => {
      tracker.trackCall({
        timestamp: new Date().toISOString(),
        operation: 'execute',
        parameters: {},
        response: 'execution_error',
        errorMessage: '❌ Error: Agent not found',
        duration: 200,
      });

      const metrics = tracker.getMetrics();
      expect(metrics.totalCalls).toBe(1);
      expect(metrics.validCalls).toBe(0);
      expect(metrics.invalidCalls).toBe(0);
      expect(metrics.errorCalls).toBe(1);
    });

    it('should count protocol errors correctly', () => {
      tracker.trackCall({
        timestamp: new Date().toISOString(),
        operation: 'execute',
        parameters: {},
        response: 'protocol_error',
        errorMessage: 'Invalid JSON-RPC',
        duration: 50,
      });

      const metrics = tracker.getMetrics();
      expect(metrics.totalCalls).toBe(1);
      expect(metrics.protocolErrorCalls).toBe(1);
    });

    it('should calculate average duration correctly', () => {
      tracker.trackCall({
        timestamp: new Date().toISOString(),
        operation: 'list',
        parameters: {},
        response: 'success',
        duration: 100,
      });

      tracker.trackCall({
        timestamp: new Date().toISOString(),
        operation: 'execute',
        parameters: {},
        response: 'success',
        duration: 500,
      });

      const metrics = tracker.getMetrics();
      expect(metrics.averageDuration).toBe(300);
    });
  });

  describe('Event Filtering', () => {
    beforeEach(() => {
      tracker.trackCall({
        timestamp: '2025-11-09T10:00:00.000Z',
        operation: 'list',
        parameters: {},
        response: 'success',
        duration: 100,
      });

      tracker.trackCall({
        timestamp: '2025-11-09T10:00:01.000Z',
        operation: 'execute',
        parameters: {},
        response: 'validation_error',
        duration: 200,
      });

      tracker.trackCall({
        timestamp: '2025-11-09T10:00:02.000Z',
        operation: 'execute',
        parameters: {},
        response: 'success',
        duration: 500,
      });
    });

    it('should filter events by type', () => {
      const successEvents = tracker.getEventsByType('success');
      expect(successEvents).toHaveLength(2);

      const validationErrors = tracker.getEventsByType('validation_error');
      expect(validationErrors).toHaveLength(1);
    });

    it('should filter events by operation', () => {
      const listEvents = tracker.getEventsByOperation('list');
      expect(listEvents).toHaveLength(1);

      const executeEvents = tracker.getEventsByOperation('execute');
      expect(executeEvents).toHaveLength(2);
    });

    it('should return all events', () => {
      const allEvents = tracker.getEvents();
      expect(allEvents).toHaveLength(3);
      // Should be a copy, not the original array
      expect(allEvents).not.toBe(tracker.getEvents());
    });
  });

  describe('Reset', () => {
    it('should clear all events on reset', () => {
      tracker.trackCall({
        timestamp: new Date().toISOString(),
        operation: 'list',
        parameters: {},
        response: 'success',
        duration: 100,
      });

      expect(tracker.getMetrics().totalCalls).toBe(1);

      tracker.reset();

      expect(tracker.getMetrics().totalCalls).toBe(0);
      expect(tracker.getEvents()).toHaveLength(0);
    });
  });
});

describe('Efficiency Scoring', () => {
  it('should score 100 for single successful call', () => {
    const metrics: ToolCallMetrics = {
      totalCalls: 1,
      validCalls: 1,
      invalidCalls: 0,
      errorCalls: 0,
      protocolErrorCalls: 0,
      duration: 500,
      averageDuration: 500,
      callSequence: [],
    };

    expect(calculateEfficiencyScore(metrics)).toBe(100);
  });

  it('should score 85 for two successful calls', () => {
    const metrics: ToolCallMetrics = {
      totalCalls: 2,
      validCalls: 2,
      invalidCalls: 0,
      errorCalls: 0,
      protocolErrorCalls: 0,
      duration: 700,
      averageDuration: 350,
      callSequence: [],
    };

    expect(calculateEfficiencyScore(metrics)).toBe(85);
  });

  it('should score 70 for three successful calls', () => {
    const metrics: ToolCallMetrics = {
      totalCalls: 3,
      validCalls: 3,
      invalidCalls: 0,
      errorCalls: 0,
      protocolErrorCalls: 0,
      duration: 1000,
      averageDuration: 333,
      callSequence: [],
    };

    expect(calculateEfficiencyScore(metrics)).toBe(70);
  });

  it('should penalize validation errors by 10 points', () => {
    const metrics: ToolCallMetrics = {
      totalCalls: 2,
      validCalls: 1,
      invalidCalls: 1,
      errorCalls: 0,
      protocolErrorCalls: 0,
      duration: 600,
      averageDuration: 300,
      callSequence: [],
    };

    // Base score 85 (2 calls) - 10 (validation error) = 75
    expect(calculateEfficiencyScore(metrics)).toBe(75);
  });

  it('should penalize execution errors by 15 points', () => {
    const metrics: ToolCallMetrics = {
      totalCalls: 2,
      validCalls: 1,
      invalidCalls: 0,
      errorCalls: 1,
      protocolErrorCalls: 0,
      duration: 600,
      averageDuration: 300,
      callSequence: [],
    };

    // Base score 85 (2 calls) - 15 (execution error) = 70
    expect(calculateEfficiencyScore(metrics)).toBe(70);
  });

  it('should penalize protocol errors by 20 points', () => {
    const metrics: ToolCallMetrics = {
      totalCalls: 2,
      validCalls: 1,
      invalidCalls: 0,
      errorCalls: 0,
      protocolErrorCalls: 1,
      duration: 600,
      averageDuration: 300,
      callSequence: [],
    };

    // Base score 85 (2 calls) - 20 (protocol error) = 65
    expect(calculateEfficiencyScore(metrics)).toBe(65);
  });

  it('should not go below 0', () => {
    const metrics: ToolCallMetrics = {
      totalCalls: 10,
      validCalls: 1,
      invalidCalls: 5,
      errorCalls: 3,
      protocolErrorCalls: 1,
      duration: 5000,
      averageDuration: 500,
      callSequence: [],
    };

    const score = calculateEfficiencyScore(metrics);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should not exceed 100', () => {
    const metrics: ToolCallMetrics = {
      totalCalls: 1,
      validCalls: 1,
      invalidCalls: 0,
      errorCalls: 0,
      protocolErrorCalls: 0,
      duration: 100,
      averageDuration: 100,
      callSequence: [],
    };

    expect(calculateEfficiencyScore(metrics)).toBe(100);
  });

  it('should score 0 for no calls', () => {
    const metrics: ToolCallMetrics = {
      totalCalls: 0,
      validCalls: 0,
      invalidCalls: 0,
      errorCalls: 0,
      protocolErrorCalls: 0,
      duration: 0,
      averageDuration: 0,
      callSequence: [],
    };

    expect(calculateEfficiencyScore(metrics)).toBe(0);
  });
});

describe('Efficiency Rating', () => {
  it('should rate 90+ as Excellent', () => {
    expect(getEfficiencyRating(100)).toBe('Excellent');
    expect(getEfficiencyRating(95)).toBe('Excellent');
    expect(getEfficiencyRating(90)).toBe('Excellent');
  });

  it('should rate 75-89 as Good', () => {
    expect(getEfficiencyRating(89)).toBe('Good');
    expect(getEfficiencyRating(80)).toBe('Good');
    expect(getEfficiencyRating(75)).toBe('Good');
  });

  it('should rate 60-74 as Acceptable', () => {
    expect(getEfficiencyRating(74)).toBe('Acceptable');
    expect(getEfficiencyRating(65)).toBe('Acceptable');
    expect(getEfficiencyRating(60)).toBe('Acceptable');
  });

  it('should rate 1-59 as Poor', () => {
    expect(getEfficiencyRating(59)).toBe('Poor');
    expect(getEfficiencyRating(30)).toBe('Poor');
    expect(getEfficiencyRating(1)).toBe('Poor');
  });

  it('should rate 0 as Failed', () => {
    expect(getEfficiencyRating(0)).toBe('Failed');
  });
});

describe('Metrics Formatting', () => {
  it('should format metrics for console display', () => {
    const metrics: ToolCallMetrics = {
      totalCalls: 3,
      validCalls: 2,
      invalidCalls: 1,
      errorCalls: 0,
      protocolErrorCalls: 0,
      duration: 800,
      averageDuration: 267,
      callSequence: [],
      startTime: '2025-11-09T10:00:00.000Z',
      endTime: '2025-11-09T10:00:05.000Z',
    };

    const formatted = formatMetrics(metrics);

    expect(formatted).toContain('📊 Tool Call Metrics');
    expect(formatted).toContain('Total calls:       3');
    expect(formatted).toContain('Valid calls:       2');
    expect(formatted).toContain('Validation errors: 1');
    expect(formatted).toContain('Efficiency Score:  60/100');
    expect(formatted).toContain('Acceptable');
  });

  it('should include wall time if timestamps available', () => {
    const metrics: ToolCallMetrics = {
      totalCalls: 2,
      validCalls: 2,
      invalidCalls: 0,
      errorCalls: 0,
      protocolErrorCalls: 0,
      duration: 700,
      averageDuration: 350,
      callSequence: [],
      startTime: '2025-11-09T10:00:00.000Z',
      endTime: '2025-11-09T10:00:05.000Z',
    };

    const formatted = formatMetrics(metrics);
    expect(formatted).toContain('Wall time:');
  });
});
