/**
 * E2E Test: workflow-status Execution Flow
 *
 * Purpose: Capture the complete execution flow when user says "execute workflow-status"
 * to analyze:
 * 1. Tool call sequence
 * 2. Ambiguity handling
 * 3. Ranking behavior
 * 4. Sampling vs session-based decisions
 * 5. Performance metrics
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BMADEngine } from '../../src/core/bmad-engine.js';

interface ToolCall {
  timestamp: number;
  operation: string;
  params: Record<string, unknown>;
  result?: unknown;
  durationMs?: number;
  error?: string;
}

interface ExecutionTrace {
  userPrompt: string;
  toolCalls: ToolCall[];
  totalDurationMs: number;
  samplingUsed: boolean;
  ambiguousResults: number;
  finalOutcome: string;
}

describe('E2E: workflow-status Execution Flow', () => {
  let engine: BMADEngine;
  let trace: ExecutionTrace;

  beforeAll(async () => {
    // Initialize engine with test configuration
    engine = new BMADEngine(
      undefined,
      [
        'git+https://github.com/mkellerman/BMAD-METHOD#debug-agent-workflow:/bmad',
      ],
      'strict',
    );
    await engine.initialize();

    // Initialize trace
    trace = {
      userPrompt: 'execute workflow-status',
      toolCalls: [],
      totalDurationMs: 0,
      samplingUsed: false,
      ambiguousResults: 0,
      finalOutcome: 'unknown',
    };
  });

  afterAll(() => {
    // Print detailed trace
    console.log('\n' + '='.repeat(80));
    console.log('EXECUTION TRACE ANALYSIS');
    console.log('='.repeat(80));
    console.log(`User Prompt: "${trace.userPrompt}"`);
    console.log(`Total Duration: ${trace.totalDurationMs}ms`);
    console.log(`Sampling Used: ${trace.samplingUsed ? 'YES' : 'NO'}`);
    console.log(`Ambiguous Results: ${trace.ambiguousResults}`);
    console.log(`Final Outcome: ${trace.finalOutcome}`);
    console.log('\nTOOL CALL SEQUENCE:');
    console.log('-'.repeat(80));

    trace.toolCalls.forEach((call, i) => {
      console.log(`\n${i + 1}. ${call.operation.toUpperCase()}`);
      console.log(`   Timestamp: +${call.timestamp}ms`);
      console.log(`   Duration: ${call.durationMs}ms`);
      console.log(`   Params:`, JSON.stringify(call.params, null, 2));

      if (call.error) {
        console.log(`   ❌ Error: ${call.error}`);
      } else if (call.result) {
        const result = call.result as {
          success?: boolean;
          ambiguous?: boolean;
          matches?: unknown[];
        };
        if (result.ambiguous) {
          console.log(
            `   ⚠️  Ambiguous Result: ${result.matches?.length || 0} matches`,
          );
        } else if (result.success !== false) {
          console.log(`   ✅ Success`);
        }
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('PERFORMANCE ANALYSIS:');
    console.log('-'.repeat(80));

    // Calculate metrics
    const executeOps = trace.toolCalls.filter((c) => c.operation === 'execute');
    const readOps = trace.toolCalls.filter((c) => c.operation === 'read');
    const listOps = trace.toolCalls.filter((c) => c.operation === 'list');

    console.log(`Execute operations: ${executeOps.length}`);
    console.log(`Read operations: ${readOps.length}`);
    console.log(`List operations: ${listOps.length}`);
    console.log(`Total tool calls: ${trace.toolCalls.length}`);

    if (trace.toolCalls.length > 0) {
      const avgDuration =
        trace.toolCalls.reduce((sum, c) => sum + (c.durationMs || 0), 0) /
        trace.toolCalls.length;
      console.log(`Average call duration: ${avgDuration.toFixed(2)}ms`);
    }

    console.log('='.repeat(80) + '\n');
  });

  it('should handle "execute workflow-status" user prompt', async () => {
    const startTime = Date.now();

    // Helper to record tool call
    const recordCall = async <T>(
      operation: string,
      params: Record<string, unknown>,
      fn: () => Promise<T>,
    ): Promise<T> => {
      const callStart = Date.now();
      const timestamp = callStart - startTime;

      try {
        const result = await fn();
        const durationMs = Date.now() - callStart;

        trace.toolCalls.push({
          timestamp,
          operation,
          params,
          result,
          durationMs,
        });

        // Track ambiguous results
        if (
          typeof result === 'object' &&
          result !== null &&
          'ambiguous' in result
        ) {
          trace.ambiguousResults++;
        }

        return result;
      } catch (error) {
        const durationMs = Date.now() - callStart;
        trace.toolCalls.push({
          timestamp,
          operation,
          params,
          durationMs,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    };

    // SIMULATION: What the LLM would do with "execute workflow-status"
    console.log(
      '\n🔍 Simulating LLM decision flow for: "execute workflow-status"\n',
    );

    // Step 1: LLM likely tries direct execute first
    console.log('Step 1: Attempting direct execute...');
    const executeResult = await recordCall(
      'execute',
      { workflow: 'workflow-status' },
      () => engine.executeWorkflow({ workflow: 'workflow-status' }),
    );

    console.log('Execute result:', {
      success: (executeResult as { success?: boolean }).success,
      ambiguous: (executeResult as { ambiguous?: boolean }).ambiguous,
      type: (executeResult as { type?: string }).type,
      matches: (executeResult as { matches?: unknown[] }).matches?.length,
    });

    // Check if result is ambiguous
    if ((executeResult as { ambiguous?: boolean }).ambiguous) {
      console.log('\n⚠️  AMBIGUOUS RESULT DETECTED');
      const matches =
        (
          executeResult as {
            matches?: Array<{ key: string; workflow: string; module: string }>;
          }
        ).matches || [];

      console.log(`Found ${matches.length} matches:`);
      matches.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.key} (${m.module}:${m.workflow})`);
      });

      // Step 2: LLM reads workflow to understand it (current behavior)
      console.log(
        '\nStep 2: LLM reads workflow definition to make decision...',
      );

      // Check if sampling is available
      const samplingAvailable = engine.isSamplingAvailable();
      console.log(`Sampling available: ${samplingAvailable}`);

      if (!samplingAvailable) {
        console.log('⚠️  NO SAMPLING: LLM must read each workflow to decide');

        // LLM reads the first match (typical behavior)
        if (matches.length > 0) {
          const firstMatch = matches[0];
          const [module, workflow] = firstMatch.key.split(':').slice(0, 2);

          console.log(`Reading: ${module}:${workflow}`);
          const readResult = await recordCall(
            'read',
            { workflow, module },
            () => engine.readWorkflow(workflow, module),
          );

          console.log('Read result:', {
            success: (readResult as { success?: boolean }).success,
            hasContent: !!(readResult as { data?: { content?: string } }).data
              ?.content,
          });

          trace.finalOutcome = 'read-workflow-to-decide';
        }
      } else {
        console.log('✅ SAMPLING AVAILABLE: Could use LLM to rank/decide');
        trace.samplingUsed = true;
        trace.finalOutcome = 'sampling-based-ranking';
      }
    } else {
      console.log('\n✅ DIRECT EXECUTION');
      trace.finalOutcome = 'direct-execute';
    }

    trace.totalDurationMs = Date.now() - startTime;

    // Assertions
    expect(trace.toolCalls.length).toBeGreaterThan(0);
    expect(trace.totalDurationMs).toBeGreaterThanOrEqual(0); // Can be 0ms on fast systems
  });

  it('should show sampling capability status', () => {
    const capability = engine.getSamplingCapability();

    console.log('\n' + '='.repeat(80));
    console.log('SAMPLING CAPABILITY STATUS:');
    console.log('-'.repeat(80));
    console.log(`Supported: ${capability.supported}`);
    console.log(`Detected: ${capability.detected}`);
    console.log(`Client: ${capability.clientInfo?.name || 'unknown'}`);
    console.log(`Version: ${capability.clientInfo?.version || 'unknown'}`);
    console.log('='.repeat(80) + '\n');

    expect(capability).toBeDefined();
    expect(typeof capability.supported).toBe('boolean');
  });

  it('should demonstrate the problem: agent unknown vs direct execution', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('PROBLEM ANALYSIS: Why does agent show as "unknown"?');
    console.log('='.repeat(80));

    // Execute workflow-status again to see what the tool returns
    const result = await engine.executeWorkflow({
      workflow: 'workflow-status',
    });

    console.log('\nExecute result structure:');
    console.log(JSON.stringify(result, null, 2));

    const resultObj = result as {
      ambiguous?: boolean;
      matches?: Array<{
        key: string;
        agentName: string;
        workflow: string;
        description: string;
      }>;
      success?: boolean;
      text?: string;
    };

    if (resultObj.ambiguous && resultObj.matches) {
      console.log('\n📊 RANKING ORDER:');
      resultObj.matches.forEach((m, i) => {
        console.log(`${i + 1}. ${m.key}`);
        console.log(`   Agent: ${m.agentName}`);
        console.log(`   Workflow: ${m.workflow}`);
        console.log(`   Description: ${m.description.slice(0, 80)}...`);
      });

      console.log('\n🔍 EXPECTED BEHAVIOR:');
      console.log(
        '1. Tool should detect most likely match (bmm:workflow-status)',
      );
      console.log('2. Tool should either:');
      console.log('   a) Use sampling to ask LLM which one user wants');
      console.log('   b) Use session ranking to auto-select top match');
      console.log('   c) Execute top match directly if confidence is high');

      console.log('\n❌ ACTUAL BEHAVIOR:');
      console.log('1. Returns ambiguous result with all matches');
      console.log('2. LLM receives agent: unknown in the response');
      console.log('3. LLM has to read workflow to understand it');
      console.log('4. LLM then executes on its own');

      console.log('\n💡 SOLUTION NEEDED:');
      console.log('1. Implement confidence threshold');
      console.log('2. If top match has high score (>0.8), execute directly');
      console.log('3. Use sampling to disambiguate when scores are close');
      console.log('4. Include agent name in ambiguous response text');
    }

    console.log('='.repeat(80) + '\n');
  });
});
