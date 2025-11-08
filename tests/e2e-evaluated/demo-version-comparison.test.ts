/**
 * Demo: Version Comparison for Performance Tracking
 *
 * Demonstrates how to track and compare test results across different
 * code versions (commits, PRs, releases).
 *
 * Run with: npm test -- demo-version-comparison
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  EvaluationStorage,
  type VersionInfo,
} from '../helpers/llm-evaluation/storage';
import type {
  MCPResponse,
  ConsistencyResult,
} from '../helpers/llm-evaluation/types';

describe('DEMO: Version Comparison', () => {
  const testStorageDir = 'test-results/evaluations-version-demo';
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

  it('📊 Should track performance across versions', () => {
    const testName = 'workflow-ranking-quality';

    // Simulate evaluations from version 3.0.0 (baseline)
    const v300: VersionInfo = {
      package: '3.0.0',
      gitSha: 'abc1234567890abcdef1234567890abcdef12345',
      gitShortSha: 'abc1234',
      gitBranch: 'main',
      isDirty: false,
      capturedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    };

    // Add 5 evaluations for version 3.0.0 with baseline performance
    for (let i = 0; i < 5; i++) {
      const score = 75 + Math.random() * 10; // 75-85 range
      saveEvaluation(storage, testName, v300, score, score >= 80);
    }

    // Simulate evaluations from version 3.0.1 (current - with improvement)
    const v301: VersionInfo = {
      package: '3.0.1',
      gitSha: 'def4567890abcdef1234567890abcdef12345678',
      gitShortSha: 'def4567',
      gitBranch: 'feature/mcp-optimizer',
      prNumber: '30',
      isDirty: false,
      capturedAt: Date.now(),
    };

    // Add 5 evaluations for version 3.0.1 with improved performance
    for (let i = 0; i < 5; i++) {
      const score = 85 + Math.random() * 10; // 85-95 range (improved!)
      saveEvaluation(storage, testName, v301, score, score >= 80);
    }

    console.log('\n📊 Version Performance Analysis:');
    console.log('─'.repeat(80));

    const versionStats = storage.analyzeByVersion(testName);
    expect(versionStats.size).toBe(2);

    for (const [versionKey, stats] of versionStats) {
      console.log(`\n${versionKey}:`);
      console.log(`  Evaluations: ${stats.count}`);
      console.log(`  Pass Rate: ${(stats.passRate * 100).toFixed(1)}%`);
      console.log(`  Avg Score: ${stats.averageScore.toFixed(1)}/100`);
      console.log(`  Std Dev: ${stats.scoreStdDev.toFixed(1)}`);
      console.log(`  Total Cost: $${stats.totalCost.toFixed(4)}`);
    }

    console.log('\n' + '─'.repeat(80));
  });

  it('🔍 Should compare baseline vs current version', () => {
    const testName = 'workflow-ranking-quality';
    const versionStats = storage.analyzeByVersion(testName);

    const versions = Array.from(versionStats.keys());
    expect(versions.length).toBe(2);

    const [baseline, current] = versions.sort(); // Alphabetically: 3.0.0 then 3.0.1

    const comparison = storage.compareVersions(testName, baseline, current);
    expect(comparison).not.toBeNull();

    if (comparison) {
      storage.printVersionComparison(comparison);

      // Verify the comparison shows improvement
      expect(comparison.improvement).toBe(true);
      expect(comparison.regression).toBe(false);
      expect(comparison.deltas.averageScore).toBeGreaterThan(0);
    }
  });

  it('⚠️ Should detect regressions between versions', () => {
    const testName = 'response-completeness';

    // Good version (3.0.1)
    const v301: VersionInfo = {
      package: '3.0.1',
      gitSha: 'goodversion1234567890abcdef1234567890abcd',
      gitShortSha: 'goodver',
      gitBranch: 'main',
      isDirty: false,
      capturedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    };

    for (let i = 0; i < 5; i++) {
      const score = 85 + Math.random() * 10; // 85-95
      saveEvaluation(storage, testName, v301, score, score >= 80);
    }

    // Bad version (3.0.2-beta) with regression
    const v302: VersionInfo = {
      package: '3.0.2-beta',
      gitSha: 'badversion1234567890abcdef1234567890abcde',
      gitShortSha: 'badver',
      gitBranch: 'feature/broken-feature',
      prNumber: '42',
      isDirty: true,
      capturedAt: Date.now(),
    };

    for (let i = 0; i < 5; i++) {
      const score = 65 + Math.random() * 10; // 65-75 (regression!)
      saveEvaluation(storage, testName, v302, score, score >= 80);
    }

    const versionStats = storage.analyzeByVersion(testName);
    const versions = Array.from(versionStats.keys()).sort();
    const comparison = storage.compareVersions(
      testName,
      versions[0],
      versions[1],
    );

    if (comparison) {
      console.log('\n⚠️  REGRESSION DETECTED:');
      storage.printVersionComparison(comparison);

      expect(comparison.regression).toBe(true);
      expect(comparison.improvement).toBe(false);
      expect(comparison.deltas.averageScore).toBeLessThan(0);
    }
  });

  it('📈 Should show performance across PR lifecycle', () => {
    const testName = 'pr-lifecycle-test';

    // PR initial commit (needs work)
    const prInitial: VersionInfo = {
      package: '3.1.0-dev',
      gitSha: 'pr123initial1234567890abcdef1234567890abc',
      gitShortSha: 'pr123-1',
      gitBranch: 'feature/new-feature',
      prNumber: '123',
      isDirty: false,
      capturedAt: Date.now() - 48 * 60 * 60 * 1000,
    };

    for (let i = 0; i < 3; i++) {
      const score = 70 + Math.random() * 10; // 70-80
      saveEvaluation(storage, testName, prInitial, score, score >= 80);
    }

    // PR after fixes (improved)
    const prFixed: VersionInfo = {
      package: '3.1.0-dev',
      gitSha: 'pr123fixed1234567890abcdef1234567890abcde',
      gitShortSha: 'pr123-2',
      gitBranch: 'feature/new-feature',
      prNumber: '123',
      isDirty: false,
      capturedAt: Date.now() - 24 * 60 * 60 * 1000,
    };

    for (let i = 0; i < 3; i++) {
      const score = 85 + Math.random() * 10; // 85-95
      saveEvaluation(storage, testName, prFixed, score, score >= 80);
    }

    // PR final (ready to merge)
    const prFinal: VersionInfo = {
      package: '3.1.0-dev',
      gitSha: 'pr123final1234567890abcdef1234567890abcdef',
      gitShortSha: 'pr123-3',
      gitBranch: 'feature/new-feature',
      prNumber: '123',
      isDirty: false,
      capturedAt: Date.now(),
    };

    for (let i = 0; i < 3; i++) {
      const score = 90 + Math.random() * 8; // 90-98
      saveEvaluation(storage, testName, prFinal, score, score >= 80);
    }

    console.log('\n📈 PR QUALITY PROGRESSION:');
    console.log('═'.repeat(80));

    const versionStats = storage.analyzeByVersion(testName);
    const versions = Array.from(versionStats.keys()).sort();

    for (const versionKey of versions) {
      const stats = versionStats.get(versionKey)!;
      console.log(`\n${versionKey}:`);
      console.log(`  Pass Rate: ${(stats.passRate * 100).toFixed(1)}%`);
      console.log(`  Avg Score: ${stats.averageScore.toFixed(1)}/100`);
    }

    console.log('\n' + '═'.repeat(80));

    // Compare initial vs final
    const improvement = storage.compareVersions(
      testName,
      versions[0],
      versions[2],
    );
    if (improvement) {
      console.log('\n🎯 PR Evolution (Initial → Final):');
      console.log(
        `   Score improvement: +${improvement.deltas.averageScore.toFixed(1)} points`,
      );
      console.log(
        `   Pass rate change: ${improvement.deltas.passRate > 0 ? '+' : ''}${improvement.deltas.passRate.toFixed(1)}%`,
      );
      console.log(
        `   Status: ${improvement.improvement ? '✅ READY TO MERGE' : '⚠️ NEEDS MORE WORK'}`,
      );

      expect(improvement.improvement).toBe(true);
    }
  });
});

/**
 * Helper to save a mock evaluation with specified version
 */
function saveEvaluation(
  storage: EvaluationStorage,
  testName: string,
  version: VersionInfo,
  score: number,
  passed: boolean,
): void {
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

  const result: ConsistencyResult = {
    samples: [
      {
        score,
        passed,
        reasoning: 'Test reasoning',
        checkpointScores: {},
        metadata: {
          model: 'gpt-4-turbo',
          timestamp: Date.now(),
          duration: 1000,
          inputTokens: 400,
          outputTokens: 150,
          cost: 0.008,
          attempt: 1,
        },
      },
    ],
    finalScore: score,
    passed,
    selectedSample: {} as any,
    variance: 0,
    consistencyWarning: false,
  };

  // Manually create record with custom version
  const record = storage.save(
    testName,
    response,
    { description: 'test', checkpoints: [] },
    result,
  );

  // Override version (since save() captures current version)
  record.version = version;

  // Re-save with custom version
  const filepath = join(
    'test-results/evaluations-version-demo',
    `${record.id}.json`,
  );
  writeFileSync(filepath, JSON.stringify(record, null, 2));
}
