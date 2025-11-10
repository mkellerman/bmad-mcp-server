/**
 * Performance Benchmarking Tests
 * 
 * Run these tests multiple times to establish baseline metrics.
 * Usage: npm run test:e2e:benchmark
 */

import { describe, it, expect } from 'vitest';
import { CopilotSessionHelper } from '../framework/helpers/copilot-session-helper.js';
import { PerformanceTracker } from '../framework/helpers/performance-tracker.js';

describe('Performance Benchmarks', () => {
  const timeout = 120_000; // 2 minutes for E2E tests
  const tracker = new PerformanceTracker();

  it('should measure agent loading performance', async () => {
    const testName = 'agent-loading-performance';
    const startTime = Date.now();

    const helper = new CopilotSessionHelper();

    const analysis = await helper.execute({
      prompt: 'Load the analyst agent (Mary) and confirm she is ready to help.',
      allowAllTools: true,
      timeout: 120000,
    });

    expect(analysis).toBeTruthy();
    
    // Verify agent loaded
    const bmadCalls = analysis.toolCalls.filter(call => 
      call.toolName === 'mcp_bmad_bmad'
    );

    expect(bmadCalls.length).toBeGreaterThan(0);

    const duration = Date.now() - startTime;

    // Record performance metric
    await tracker.recordMetric({
      testName,
      duration,
      timestamp: new Date().toISOString(),
      metadata: {
        toolCalls: analysis.toolCalls.length,
        bmadCalls: bmadCalls.length,
      },
    });

    console.log(`✓ Agent loading completed in ${duration}ms`);
  }, timeout);

  it('should measure workflow listing performance', async () => {
    const testName = 'workflow-listing-performance';
    const startTime = Date.now();

    const helper = new CopilotSessionHelper();

    const analysis = await helper.execute({
      prompt: 'List all available workflows in the BMM module.',
      allowAllTools: true,
      timeout: 120000,
    });

    expect(analysis).toBeTruthy();
    expect(analysis.toolCalls.length).toBeGreaterThan(0);

    const duration = Date.now() - startTime;

    await tracker.recordMetric({
      testName,
      duration,
      timestamp: new Date().toISOString(),
      metadata: {
        toolCalls: analysis.toolCalls.length,
      },
    });

    console.log(`✓ Workflow listing completed in ${duration}ms`);
  }, timeout);

  it('should measure simple query performance', async () => {
    const testName = 'simple-query-performance';
    const startTime = Date.now();

    const helper = new CopilotSessionHelper();

    const analysis = await helper.execute({
      prompt: 'What agents are available in BMAD?',
      allowAllTools: true,
      timeout: 120000,
    });

    expect(analysis).toBeTruthy();
    expect(analysis.toolCalls.length).toBeGreaterThan(0);

    const duration = Date.now() - startTime;

    await tracker.recordMetric({
      testName,
      duration,
      timestamp: new Date().toISOString(),
      metadata: {
        toolCalls: analysis.toolCalls.length,
      },
    });

    console.log(`✓ Simple query completed in ${duration}ms`);
  }, timeout);

  it('should measure workflow execution performance', async () => {
    const testName = 'workflow-execution-performance';
    const startTime = Date.now();

    const helper = new CopilotSessionHelper();

    const analysis = await helper.execute({
      prompt: 'Execute the brainstorming workflow to help me brainstorm a mobile app idea.',
      allowAllTools: true,
      timeout: 120000,
    });

    expect(analysis).toBeTruthy();

    const bmadCalls = analysis.toolCalls.filter(call =>
      call.toolName === 'mcp_bmad_bmad'
    );

    expect(bmadCalls.length).toBeGreaterThan(0);

    const duration = Date.now() - startTime;

    await tracker.recordMetric({
      testName,
      duration,
      timestamp: new Date().toISOString(),
      metadata: {
        toolCalls: analysis.toolCalls.length,
        bmadCalls: bmadCalls.length,
      },
    });

    console.log(`✓ Workflow execution completed in ${duration}ms`);
  }, timeout);
});
