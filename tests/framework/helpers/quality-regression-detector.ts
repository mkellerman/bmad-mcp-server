/**
 * Quality Regression Detector
 *
 * Detects quality regressions by comparing current quality metrics
 * against established baselines. Used to prevent quality degradation
 * in new releases.
 *
 * Usage:
 * ```ts
 * const detector = new QualityRegressionDetector();
 * 
 * // Set baseline from current metrics
 * await detector.saveBaseline();
 * 
 * // Check for regressions
 * const result = await detector.detectRegressions();
 * if (!result.passed) {
 *   console.error('Quality regressions detected!');
 * }
 * ```
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { QualityMetricsCollector } from './quality-metrics-collector.js';

/**
 * Baseline quality metrics for a test
 */
export interface BaselineMetric {
  testName: string;
  baselineScore: number;
  baselineDimensions: {
    toolCallAccuracy: number;
    parameterCompleteness: number;
    contextualRelevance: number;
    conversationCoherence: number;
    efficiency: number;
    instructionAdherence: number;
  };
  baselineDate: string;
  runs: number;
}

/**
 * Regression detection result
 */
export interface RegressionResult {
  testName: string;
  passed: boolean;
  currentScore: number;
  baselineScore: number;
  scoreDelta: number;
  deltaPercent: number;
  threshold: number;
  dimensionRegressions: Array<{
    dimension: string;
    current: number;
    baseline: number;
    delta: number;
  }>;
  severity: 'none' | 'minor' | 'moderate' | 'critical';
}

/**
 * Overall regression detection results
 */
export interface RegressionReport {
  passed: boolean;
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  regressions: RegressionResult[];
  summary: {
    critical: number;
    moderate: number;
    minor: number;
    none: number;
  };
}

/**
 * Quality Regression Detector
 *
 * Detects quality regressions by comparing current metrics to baselines
 */
export class QualityRegressionDetector {
  private baselinePath: string;
  private collector: QualityMetricsCollector;
  private regressionThreshold: number;

  constructor(
    baselinePath?: string,
    collector?: QualityMetricsCollector,
    regressionThreshold = -10 // Default: fail if score drops >10 points
  ) {
    this.baselinePath = baselinePath || join(process.cwd(), 'test-results', 'quality-baseline.json');
    this.collector = collector || new QualityMetricsCollector();
    this.regressionThreshold = regressionThreshold;
  }

  /**
   * Save current metrics as baseline
   *
   * @returns Number of tests saved as baseline
   */
  async saveBaseline(): Promise<number> {
    const allTests = await this.collector.getAllTests();
    const baseline: BaselineMetric[] = [];

    for (const testName of allTests) {
      const stats = await this.collector.getStatistics(testName);
      if (stats) {
        baseline.push({
          testName,
          baselineScore: stats.scores.current,
          baselineDimensions: stats.dimensionAverages,
          baselineDate: new Date().toISOString(),
          runs: stats.runs,
        });
      }
    }

    await writeFile(this.baselinePath, JSON.stringify(baseline, null, 2));
    return baseline.length;
  }

  /**
   * Load baseline metrics
   *
   * @returns Array of baseline metrics
   */
  async loadBaseline(): Promise<BaselineMetric[]> {
    if (!existsSync(this.baselinePath)) {
      throw new Error(`Baseline not found at ${this.baselinePath}. Run saveBaseline() first.`);
    }

    const content = await readFile(this.baselinePath, 'utf-8');
    return JSON.parse(content) as BaselineMetric[];
  }

  /**
   * Detect regressions by comparing current metrics to baseline
   *
   * @returns Regression report
   */
  async detectRegressions(): Promise<RegressionReport> {
    const baseline = await this.loadBaseline();
    const regressions: RegressionResult[] = [];

    for (const baselineMetric of baseline) {
      const stats = await this.collector.getStatistics(baselineMetric.testName);
      
      if (!stats) {
        // Test no longer exists or hasn't run
        regressions.push({
          testName: baselineMetric.testName,
          passed: false,
          currentScore: 0,
          baselineScore: baselineMetric.baselineScore,
          scoreDelta: -baselineMetric.baselineScore,
          deltaPercent: -100,
          threshold: this.regressionThreshold,
          dimensionRegressions: [],
          severity: 'critical',
        });
        continue;
      }

      const currentScore = stats.scores.current;
      const baselineScore = baselineMetric.baselineScore;
      const scoreDelta = currentScore - baselineScore;
      const deltaPercent = (scoreDelta / baselineScore) * 100;

      // Check dimension regressions
      const dimensionRegressions: Array<{
        dimension: string;
        current: number;
        baseline: number;
        delta: number;
      }> = [];

      for (const [dimension, currentValue] of Object.entries(stats.dimensionAverages)) {
        const baselineValue = baselineMetric.baselineDimensions[dimension as keyof typeof baselineMetric.baselineDimensions];
        const delta = currentValue - baselineValue;
        
        if (delta < -5) { // Dimension dropped >5 points
          dimensionRegressions.push({
            dimension,
            current: currentValue,
            baseline: baselineValue,
            delta,
          });
        }
      }

      // Determine severity
      let severity: 'none' | 'minor' | 'moderate' | 'critical';
      if (scoreDelta >= 0) {
        severity = 'none'; // Improvement or stable
      } else if (scoreDelta > -5) {
        severity = 'minor'; // Small drop
      } else if (scoreDelta > this.regressionThreshold) {
        severity = 'moderate'; // Noticeable drop but above threshold
      } else {
        severity = 'critical'; // Below threshold
      }

      const passed = scoreDelta >= this.regressionThreshold;

      regressions.push({
        testName: baselineMetric.testName,
        passed,
        currentScore,
        baselineScore,
        scoreDelta,
        deltaPercent,
        threshold: this.regressionThreshold,
        dimensionRegressions,
        severity,
      });
    }

    const summary = {
      critical: regressions.filter((r) => r.severity === 'critical').length,
      moderate: regressions.filter((r) => r.severity === 'moderate').length,
      minor: regressions.filter((r) => r.severity === 'minor').length,
      none: regressions.filter((r) => r.severity === 'none').length,
    };

    return {
      passed: regressions.every((r) => r.passed),
      timestamp: new Date().toISOString(),
      totalTests: regressions.length,
      passedTests: regressions.filter((r) => r.passed).length,
      failedTests: regressions.filter((r) => !r.passed).length,
      regressions,
      summary,
    };
  }

  /**
   * Format regression report for console output
   *
   * @param report - Regression report
   * @returns Formatted string
   */
  formatReport(report: RegressionReport): string {
    const lines = [];

    lines.push('🔍 Quality Regression Report');
    lines.push('═'.repeat(60));
    lines.push('');

    if (report.passed) {
      lines.push('✅ No regressions detected');
    } else {
      lines.push('❌ Quality regressions found');
    }

    lines.push('');
    lines.push(`Timestamp: ${new Date(report.timestamp).toLocaleString()}`);
    lines.push(`Total Tests: ${report.totalTests}`);
    lines.push(`Passed: ${report.passedTests}`);
    lines.push(`Failed: ${report.failedTests}`);
    lines.push('');

    lines.push('Summary:');
    lines.push(`  Critical: ${report.summary.critical} ⛔`);
    lines.push(`  Moderate: ${report.summary.moderate} ⚠️`);
    lines.push(`  Minor:    ${report.summary.minor} ⚡`);
    lines.push(`  None:     ${report.summary.none} ✅`);
    lines.push('');

    // Show failing tests
    const failing = report.regressions.filter((r) => !r.passed);
    if (failing.length > 0) {
      lines.push('Failing Tests:');
      lines.push('─'.repeat(60));
      
      for (const result of failing) {
        const emoji = this.getSeverityEmoji(result.severity);
        lines.push('');
        lines.push(`${emoji} ${result.testName}`);
        lines.push(`  Current:  ${result.currentScore.toFixed(1)}`);
        lines.push(`  Baseline: ${result.baselineScore.toFixed(1)}`);
        lines.push(`  Delta:    ${result.scoreDelta >= 0 ? '+' : ''}${result.scoreDelta.toFixed(1)} (${result.deltaPercent.toFixed(1)}%)`);
        lines.push(`  Threshold: ${result.threshold}`);
        lines.push(`  Severity: ${result.severity}`);
        
        if (result.dimensionRegressions.length > 0) {
          lines.push('  Dimension Regressions:');
          for (const dim of result.dimensionRegressions) {
            lines.push(`    - ${dim.dimension}: ${dim.current.toFixed(1)} (was ${dim.baseline.toFixed(1)}, Δ ${dim.delta.toFixed(1)})`);
          }
        }
      }
    }

    // Show improving tests
    const improving = report.regressions.filter(
      (r) => r.passed && r.scoreDelta > 5
    );
    
    if (improving.length > 0) {
      lines.push('');
      lines.push('Improving Tests:');
      lines.push('─'.repeat(60));
      
      for (const result of improving) {
        lines.push('');
        lines.push(`📈 ${result.testName}`);
        lines.push(`  Current:  ${result.currentScore.toFixed(1)}`);
        lines.push(`  Baseline: ${result.baselineScore.toFixed(1)}`);
        lines.push(`  Delta:    +${result.scoreDelta.toFixed(1)} (${result.deltaPercent.toFixed(1)}%)`);
      }
    }

    lines.push('');
    lines.push('═'.repeat(60));

    return lines.join('\n');
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '⛔';
      case 'moderate': return '⚠️';
      case 'minor': return '⚡';
      default: return '✅';
    }
  }
}

/**
 * Assert no regressions (for use in tests)
 *
 * @param report - Regression report
 * @throws Error if regressions detected
 */
export function assertNoRegressions(report: RegressionReport): void {
  if (!report.passed) {
    const failing = report.regressions.filter((r) => !r.passed);
    const message = [
      `Quality regressions detected in ${failing.length} test(s):`,
      ...failing.map(
        (r) =>
          `  - ${r.testName}: ${r.currentScore.toFixed(1)} (was ${r.baselineScore.toFixed(1)}, Δ ${r.scoreDelta.toFixed(1)})`
      ),
    ].join('\n');
    
    throw new Error(message);
  }
}
