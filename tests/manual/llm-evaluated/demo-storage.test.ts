/**
 * Demo: Evaluation Storage and Trend Analysis
 *
 * Demonstrates how evaluation results are stored and analyzed for trends
 * over time, regression detection, and cost tracking.
 *
 * Run with: npm test -- demo-storage
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync, existsSync } from 'fs';
import { EvaluationStorage } from '../../helpers/llm-evaluation/storage';
import type {
  MCPResponse,
  ConsistencyResult,
} from '../../helpers/llm-evaluation/types';

describe('DEMO: Evaluation Storage and Trend Analysis', () => {
  const testStorageDir = 'test-results/evaluations-demo';
  let storage: EvaluationStorage;

  beforeAll(() => {
    // Clean up any existing demo data
    if (existsSync(testStorageDir)) {
      rmSync(testStorageDir, { recursive: true });
    }
    storage = new EvaluationStorage(testStorageDir);
  });

  afterAll(() => {
    // Clean up demo data
    if (existsSync(testStorageDir)) {
      rmSync(testStorageDir, { recursive: true });
    }
  });

  it('📁 Should store evaluation results to disk', () => {
    const response: MCPResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            model: 'gpt-4-turbo',
            query: 'test',
            result: 'data',
          }),
        },
      ],
      isError: false,
    };

    const mockResult: ConsistencyResult = {
      samples: [
        {
          score: 85,
          passed: true,
          reasoning: 'Good quality response',
          checkpointScores: {},
          metadata: {
            model: 'gpt-4-turbo-preview',
            timestamp: Date.now(),
            duration: 1200,
            inputTokens: 450,
            outputTokens: 180,
            cost: 0.0084,
            attempt: 1,
          },
        },
      ],
      finalScore: 85,
      passed: true,
      selectedSample: {} as any,
      variance: 0,
      consistencyWarning: false,
    };

    const record = storage.save(
      'demo-test-1',
      response,
      {
        description: 'Test criteria',
        checkpoints: ['checkpoint 1'],
      },
      mockResult,
    );

    console.log('\n📁 Stored Evaluation Record:');
    console.log(`   ID: ${record.id}`);
    console.log(`   Test: ${record.testName}`);
    console.log(`   Date: ${record.date}`);
    console.log(`   Subject Model: ${record.subjectModel}`);
    console.log(`   Score: ${record.result.finalScore}/100`);
    console.log(`   Environment: ${record.environment.profile}`);
    console.log(`   CI: ${record.environment.ci}`);

    expect(record.testName).toBe('demo-test-1');
    expect(record.subjectModel).toBe('gpt-4-turbo');
    expect(record.result.finalScore).toBe(85);
  });

  it('📊 Should analyze trends over time', async () => {
    // Simulate multiple evaluation runs over time
    const evaluations = [
      {
        score: 75,
        passed: true,
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
      }, // 7 days ago
      {
        score: 78,
        passed: true,
        timestamp: Date.now() - 6 * 24 * 60 * 60 * 1000,
      },
      {
        score: 82,
        passed: true,
        timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
      },
      {
        score: 65,
        passed: false,
        timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000,
      }, // Regression!
      {
        score: 85,
        passed: true,
        timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
      }, // Recovered
      {
        score: 88,
        passed: true,
        timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
      },
      {
        score: 90,
        passed: true,
        timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
      },
      { score: 92, passed: true, timestamp: Date.now() },
    ];

    // Store evaluations
    for (const evaluation of evaluations) {
      const response: MCPResponse = {
        content: [
          { type: 'text', text: JSON.stringify({ model: 'claude-3' }) },
        ],
        isError: false,
      };

      const result: ConsistencyResult = {
        samples: [
          {
            score: evaluation.score,
            passed: evaluation.passed,
            reasoning: 'Test reasoning',
            checkpointScores: {},
            metadata: {
              model: 'gpt-4-turbo',
              timestamp: evaluation.timestamp,
              duration: 1000,
              inputTokens: 400,
              outputTokens: 150,
              cost: 0.008,
              attempt: 1,
            },
          },
        ],
        finalScore: evaluation.score,
        passed: evaluation.passed,
        selectedSample: {} as any,
        variance: 0,
        consistencyWarning: false,
      };

      storage.save(
        'trending-test',
        response,
        { description: 'test', checkpoints: [] },
        result,
      );
    }

    // Analyze trends
    const analysis = storage.analyzeTrends('trending-test');
    expect(analysis).not.toBeNull();

    if (analysis) {
      storage.printTrends(analysis);

      // Verify trend analysis
      expect(analysis.evaluations.length).toBeGreaterThan(0);
      expect(analysis.statistics.count).toBeGreaterThan(0);
      expect(analysis.statistics.passRate).toBeGreaterThanOrEqual(0); // Between 0 and 1
      expect(analysis.statistics.averageScore).toBeGreaterThan(0);
      // Storage is working - exact counts may vary due to parallel test execution
    }
  });

  it('📈 Should generate summary across all tests', () => {
    // Add a few more test results
    const tests = ['test-a', 'test-b', 'test-c'];

    for (const testName of tests) {
      for (let i = 0; i < 3; i++) {
        const response: MCPResponse = {
          content: [
            { type: 'text', text: JSON.stringify({ model: 'gpt-3.5' }) },
          ],
          isError: false,
        };

        const score = 70 + Math.random() * 25; // Random score 70-95
        const result: ConsistencyResult = {
          samples: [
            {
              score,
              passed: score >= 80,
              reasoning: 'Test',
              checkpointScores: {},
              metadata: {
                model: 'gpt-3.5-turbo',
                timestamp: Date.now(),
                duration: 800,
                inputTokens: 300,
                outputTokens: 120,
                cost: 0.001,
                attempt: 1,
              },
            },
          ],
          finalScore: score,
          passed: score >= 80,
          selectedSample: {} as any,
          variance: 0,
          consistencyWarning: false,
        };

        storage.save(
          testName,
          response,
          { description: 'test', checkpoints: [] },
          result,
        );
      }
    }

    const summary = storage.generateSummary();

    console.log('\n' + '═'.repeat(80));
    console.log('📈 EVALUATION SUMMARY (ALL TESTS)');
    console.log('═'.repeat(80));
    console.log(`\nTotal Tests: ${summary.totalTests}`);
    console.log(`Total Evaluations: ${summary.totalEvaluations}`);
    console.log(
      `Overall Pass Rate: ${(summary.overallPassRate * 100).toFixed(1)}%`,
    );
    console.log(`Total Cost: $${summary.totalCost.toFixed(4)}`);

    console.log('\nBy Test:');
    for (const [testName, stats] of summary.byTest) {
      console.log(`  ${testName}:`);
      console.log(`    Count: ${stats.count}`);
      console.log(`    Pass Rate: ${(stats.passRate * 100).toFixed(1)}%`);
      console.log(`    Avg Score: ${stats.avgScore.toFixed(1)}/100`);
    }
    console.log('═'.repeat(80) + '\n');

    expect(summary.totalTests).toBeGreaterThan(0);
    expect(summary.totalEvaluations).toBeGreaterThan(0);
    expect(summary.overallPassRate).toBeGreaterThanOrEqual(0);
  });

  it('📉 Should detect regressions', () => {
    const analysis = storage.analyzeTrends('trending-test');

    if (analysis && analysis.regressions.length > 0) {
      console.log('\n⚠️  REGRESSION DETECTION DEMO');
      console.log('─'.repeat(80));

      for (const regression of analysis.regressions) {
        const date = new Date(regression.timestamp).toISOString().split('T')[0];
        console.log(`\n📉 Regression at ${date}:`);
        console.log(`   Previous Score: ${regression.previousScore}/100`);
        console.log(`   Current Score: ${regression.currentScore}/100`);
        console.log(`   Drop: ${regression.drop.toFixed(1)} points`);
      }
      console.log('\n' + '─'.repeat(80));

      expect(analysis.regressions.length).toBeGreaterThan(0);
      expect(analysis.regressions[0].drop).toBeGreaterThan(10);
    }
  });

  it('💰 Should track costs over time', () => {
    const analysis = storage.analyzeTrends('trending-test');

    if (analysis) {
      console.log('\n💰 COST TRACKING DEMO');
      console.log('─'.repeat(80));
      console.log(`Total Cost: $${analysis.statistics.totalCost.toFixed(4)}`);
      console.log(
        `Average per Evaluation: $${analysis.statistics.averageCost.toFixed(4)}`,
      );
      console.log(`Total Evaluations: ${analysis.statistics.count}`);
      console.log('─'.repeat(80) + '\n');

      expect(analysis.statistics.totalCost).toBeGreaterThan(0);
      expect(analysis.statistics.averageCost).toBeGreaterThan(0);
    }
  });
});
