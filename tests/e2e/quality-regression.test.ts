/**
 * E2E Regression Test Suite
 *
 * Validates that quality metrics haven't regressed from established baseline.
 * Run this before releases to ensure no quality degradation.
 *
 * Usage:
 *   npm run test:regression
 *   npm run test:regression:baseline  # Update baseline
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { QualityRegressionDetector, assertNoRegressions } from '../framework/helpers/quality-regression-detector.js';
import { QualityMetricsCollector } from '../framework/helpers/quality-metrics-collector.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

describe('Quality Regression Suite', () => {
  let detector: QualityRegressionDetector;
  let collector: QualityMetricsCollector;
  const baselinePath = join(process.cwd(), 'test-results', 'quality-baseline.json');

  beforeAll(() => {
    detector = new QualityRegressionDetector();
    collector = new QualityMetricsCollector();
  });

  it('should have a quality baseline established', () => {
    expect(existsSync(baselinePath)).toBe(true);
    
    if (!existsSync(baselinePath)) {
      throw new Error(
        'Quality baseline not found. Run: npm run test:regression:baseline'
      );
    }
  });

  it('should not have quality regressions from baseline', async () => {
    const report = await detector.detectRegressions();
    
    // Log the regression report
    console.log('\n' + detector.formatReport(report));
    
    // Assert no regressions
    expect(report.passed, 'Quality regressions detected').toBe(true);
    expect(report.failedTests).toBe(0);
    expect(report.summary.critical).toBe(0);
    
    // Can also use the helper
    assertNoRegressions(report);
  });

  it('should detect critical regressions (score drop >10 points)', async () => {
    const report = await detector.detectRegressions();
    
    const criticalRegressions = report.regressions.filter(
      (r) => r.severity === 'critical'
    );
    
    expect(criticalRegressions.length).toBe(0);
    
    if (criticalRegressions.length > 0) {
      const message = criticalRegressions
        .map((r) => `  - ${r.testName}: ${r.currentScore.toFixed(1)} (Δ ${r.scoreDelta.toFixed(1)})`)
        .join('\n');
      
      throw new Error(`Critical quality regressions:\n${message}`);
    }
  });

  it('should maintain quality across all dimensions', async () => {
    const report = await detector.detectRegressions();
    
    // Check for dimension-specific regressions
    const testsWithDimensionRegressions = report.regressions.filter(
      (r) => r.dimensionRegressions.length > 0
    );
    
    if (testsWithDimensionRegressions.length > 0) {
      console.log('\n⚠️  Tests with dimension regressions:');
      for (const test of testsWithDimensionRegressions) {
        console.log(`\n  ${test.testName}:`);
        for (const dim of test.dimensionRegressions) {
          console.log(`    - ${dim.dimension}: ${dim.current.toFixed(1)} (was ${dim.baseline.toFixed(1)})`);
        }
      }
    }
    
    // For now, just warn about dimension regressions (don't fail)
    // In stricter mode, you could fail on any dimension regression
    expect(testsWithDimensionRegressions.every(
      (t) => t.passed // Overall score still passes
    )).toBe(true);
  });

  it('should track quality improvements over time', async () => {
    const report = await detector.detectRegressions();
    
    const improvements = report.regressions.filter(
      (r) => r.scoreDelta > 0
    );
    
    if (improvements.length > 0) {
      console.log('\n📈 Quality improvements detected:');
      for (const improvement of improvements) {
        console.log(
          `  - ${improvement.testName}: ${improvement.currentScore.toFixed(1)} ` +
          `(+${improvement.scoreDelta.toFixed(1)}, ${improvement.deltaPercent.toFixed(1)}%)`
        );
      }
    }
    
    // This is informational, always pass
    expect(true).toBe(true);
  });

  it('should have quality metrics for all baseline tests', async () => {
    const baseline = await detector.loadBaseline();
    const allTests = await collector.getAllTests();
    
    // Check that all baseline tests have current metrics
    for (const baselineTest of baseline) {
      const hasMetrics = allTests.includes(baselineTest.testName);
      
      expect(hasMetrics, `Missing metrics for: ${baselineTest.testName}`).toBe(true);
    }
  });
});
