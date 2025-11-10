#!/usr/bin/env node

/**
 * Establish Performance Baseline
 * 
 * Runs E2E tests multiple times and establishes baseline performance metrics.
 * This should be run on a stable build to create the initial baseline.
 */

import fs from 'fs/promises';
import path from 'path';

// Inline PerformanceTracker to avoid build dependency
class PerformanceTracker {
  constructor(metricsDir = 'test-results/performance-metrics') {
    this.metricsDir = metricsDir;
    this.metricsFile = path.join(metricsDir, 'all-metrics.json');
  }

  async ensureMetricsDir() {
    try {
      await fs.mkdir(this.metricsDir, { recursive: true });
    } catch {
      // Already exists
    }
  }

  async loadMetrics() {
    try {
      const content = await fs.readFile(this.metricsFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  async getTestMetrics(testName) {
    const testFile = path.join(this.metricsDir, `${testName}.json`);
    try {
      const content = await fs.readFile(testFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  async calculateStatistics(testName) {
    const metrics = await this.getTestMetrics(testName);
    if (metrics.length === 0) return null;

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((acc, val) => acc + val, 0);
    const avg = sum / durations.length;

    const squaredDiffs = durations.map(d => Math.pow(d - avg, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / durations.length;
    const stdDev = Math.sqrt(variance);

    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.floor(durations.length * 0.95);

    return {
      testName,
      runs: metrics.length,
      avgDuration: Math.round(avg),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      stdDevDuration: Math.round(stdDev),
      p50Duration: durations[p50Index],
      p95Duration: durations[p95Index],
    };
  }

  async getAllStatistics() {
    const metrics = await this.loadMetrics();
    const testNames = [...new Set(metrics.map(m => m.testName))];
    const stats = [];
    
    for (const testName of testNames) {
      const stat = await this.calculateStatistics(testName);
      if (stat) stats.push(stat);
    }
    
    return stats.sort((a, b) => a.testName.localeCompare(b.testName));
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}

async function runBaselineEstablishment() {
  console.log('📊 Performance Baseline Establishment');
  console.log('═'.repeat(60));
  console.log();

  const tracker = new PerformanceTracker();
  await tracker.ensureMetricsDir();

  // Check if we have existing metrics
  const stats = await tracker.getAllStatistics();

  if (stats.length === 0) {
    console.log('❌ No performance metrics found.');
    console.log();
    console.log('To establish a baseline:');
    console.log('1. Run E2E tests multiple times (5+ runs recommended):');
    console.log('   npm run test:e2e:benchmark');
    console.log();
    console.log('2. Then run this script again to save the baseline:');
    console.log('   npm run test:performance:baseline');
    process.exit(1);
  }

  console.log(`Found ${stats.length} test(s) with performance metrics:\n`);

  for (const stat of stats) {
    console.log(`✓ ${stat.testName}`);
    console.log(`  Runs:    ${stat.runs}`);
    console.log(`  Average: ${tracker.formatDuration(stat.avgDuration)}`);
    console.log(`  Min:     ${tracker.formatDuration(stat.minDuration)}`);
    console.log(`  Max:     ${tracker.formatDuration(stat.maxDuration)}`);
    console.log(`  StdDev:  ${tracker.formatDuration(stat.stdDevDuration)}`);
    console.log(`  P50:     ${tracker.formatDuration(stat.p50Duration)}`);
    console.log(`  P95:     ${tracker.formatDuration(stat.p95Duration)} (baseline)`);
    console.log();
  }

  // Create baseline
  const baseline = stats.map(stat => ({
    testName: stat.testName,
    baselineDuration: stat.p95Duration,
    baselineAvg: stat.avgDuration,
    baselineStdDev: stat.stdDevDuration,
    baselineDate: new Date().toISOString(),
    runs: stat.runs,
  }));

  const baselineFile = path.join('test-results/performance-metrics', 'baseline.json');
  await fs.writeFile(baselineFile, JSON.stringify(baseline, null, 2));

  console.log(`✅ Baseline saved for ${baseline.length} test(s)`);
  console.log(`   Baseline file: ${baselineFile}`);
  console.log();
  console.log('Next steps:');
  console.log('• Run performance regression tests: npm run test:performance:regression');
  console.log('• View performance dashboard: npm run test:performance:dashboard');
}

runBaselineEstablishment().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
