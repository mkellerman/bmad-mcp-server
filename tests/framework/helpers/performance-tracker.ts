/**
 * Performance Tracker for E2E Tests
 * 
 * Tracks test execution duration and provides performance metrics.
 * Helps identify performance regressions and optimization opportunities.
 */

import fs from 'fs/promises';
import path from 'path';

export interface PerformanceMetric {
  testName: string;
  duration: number;        // milliseconds
  timestamp: string;
  metadata?: {
    toolCalls?: number;
    sessionSize?: number;
    [key: string]: unknown;
  };
}

export interface PerformanceStatistics {
  testName: string;
  runs: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  stdDevDuration: number;
  p50Duration: number;     // median
  p95Duration: number;
  p99Duration: number;
  firstRun: string;
  lastRun: string;
}

export interface PerformanceBaseline {
  testName: string;
  baselineDuration: number;      // p95 duration
  baselineAvg: number;
  baselineStdDev: number;
  baselineDate: string;
  runs: number;
}

export class PerformanceTracker {
  private metricsFile: string;
  private metricsDir: string;

  constructor(metricsDir: string = 'test-results/performance-metrics') {
    this.metricsDir = metricsDir;
    this.metricsFile = path.join(metricsDir, 'all-metrics.json');
  }

  /**
   * Record a performance metric for a test
   */
  async recordMetric(metric: PerformanceMetric): Promise<void> {
    await this.ensureMetricsDir();
    
    // Load existing metrics
    const metrics = await this.loadMetrics();
    
    // Add new metric
    metrics.push(metric);
    
    // Save updated metrics
    await fs.writeFile(this.metricsFile, JSON.stringify(metrics, null, 2));
    
    // Also save to per-test file
    await this.saveTestMetric(metric);
  }

  /**
   * Get all metrics for a specific test
   */
  async getTestMetrics(testName: string): Promise<PerformanceMetric[]> {
    const testFile = path.join(this.metricsDir, `${testName}.json`);
    
    try {
      const content = await fs.readFile(testFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  /**
   * Calculate statistics for a test
   */
  async calculateStatistics(testName: string): Promise<PerformanceStatistics | null> {
    const metrics = await this.getTestMetrics(testName);
    
    if (metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((acc, val) => acc + val, 0);
    const avg = sum / durations.length;

    // Calculate standard deviation
    const squaredDiffs = durations.map(d => Math.pow(d - avg, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / durations.length;
    const stdDev = Math.sqrt(variance);

    // Calculate percentiles
    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    return {
      testName,
      runs: metrics.length,
      avgDuration: Math.round(avg),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      stdDevDuration: Math.round(stdDev),
      p50Duration: durations[p50Index],
      p95Duration: durations[p95Index],
      p99Duration: durations[p99Index],
      firstRun: metrics[0].timestamp,
      lastRun: metrics[metrics.length - 1].timestamp,
    };
  }

  /**
   * Get all test statistics
   */
  async getAllStatistics(): Promise<PerformanceStatistics[]> {
    const metrics = await this.loadMetrics();
    const testNames = [...new Set(metrics.map(m => m.testName))];
    
    const stats: PerformanceStatistics[] = [];
    
    for (const testName of testNames) {
      const stat = await this.calculateStatistics(testName);
      if (stat) {
        stats.push(stat);
      }
    }
    
    return stats.sort((a, b) => a.testName.localeCompare(b.testName));
  }

  /**
   * Save performance baseline
   */
  async saveBaseline(): Promise<number> {
    const stats = await this.getAllStatistics();
    
    if (stats.length === 0) {
      throw new Error('No performance metrics found. Run tests first.');
    }

    const baseline: PerformanceBaseline[] = stats.map(stat => ({
      testName: stat.testName,
      baselineDuration: stat.p95Duration,
      baselineAvg: stat.avgDuration,
      baselineStdDev: stat.stdDevDuration,
      baselineDate: new Date().toISOString(),
      runs: stat.runs,
    }));

    const baselineFile = path.join(this.metricsDir, 'baseline.json');
    await fs.writeFile(baselineFile, JSON.stringify(baseline, null, 2));
    
    return baseline.length;
  }

  /**
   * Load performance baseline
   */
  async loadBaseline(): Promise<PerformanceBaseline[]> {
    const baselineFile = path.join(this.metricsDir, 'baseline.json');
    
    try {
      const content = await fs.readFile(baselineFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      throw new Error(`Baseline not found at ${baselineFile}. Run baseline establishment first.`);
    }
  }

  /**
   * Format duration in human-readable format
   */
  formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Generate performance report
   */
  async generateReport(): Promise<string> {
    const stats = await this.getAllStatistics();
    
    if (stats.length === 0) {
      return 'No performance metrics available.';
    }

    let report = '📊 Performance Metrics Report\n';
    report += '═'.repeat(60) + '\n\n';

    for (const stat of stats) {
      report += `✓ ${stat.testName}\n`;
      report += `  Runs:    ${stat.runs}\n`;
      report += `  Average: ${this.formatDuration(stat.avgDuration)}\n`;
      report += `  Min:     ${this.formatDuration(stat.minDuration)}\n`;
      report += `  Max:     ${this.formatDuration(stat.maxDuration)}\n`;
      report += `  StdDev:  ${this.formatDuration(stat.stdDevDuration)}\n`;
      report += `  P50:     ${this.formatDuration(stat.p50Duration)}\n`;
      report += `  P95:     ${this.formatDuration(stat.p95Duration)}\n`;
      report += `  P99:     ${this.formatDuration(stat.p99Duration)}\n`;
      report += '\n';
    }

    return report;
  }

  // Private helper methods

  private async ensureMetricsDir(): Promise<void> {
    try {
      await fs.mkdir(this.metricsDir, { recursive: true });
    } catch {
      // Directory already exists
    }
  }

  private async loadMetrics(): Promise<PerformanceMetric[]> {
    try {
      const content = await fs.readFile(this.metricsFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private async saveTestMetric(metric: PerformanceMetric): Promise<void> {
    const testFile = path.join(this.metricsDir, `${metric.testName}.json`);
    
    // Load existing metrics for this test
    const metrics = await this.getTestMetrics(metric.testName);
    
    // Add new metric
    metrics.push(metric);
    
    // Save updated metrics
    await fs.writeFile(testFile, JSON.stringify(metrics, null, 2));
  }
}

/**
 * Measure test performance with async function
 */
export async function measurePerformance<T>(
  testName: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;

  const tracker = new PerformanceTracker();
  await tracker.recordMetric({
    testName,
    duration,
    timestamp: new Date().toISOString(),
    metadata,
  });

  return { result, duration };
}
