/**
 * Performance Regression Detection Tests
 * 
 * Validates that current performance metrics meet SLA requirements
 * and have not regressed from established baselines.
 */

import { describe, it, expect } from 'vitest';
import {
  PerformanceTracker,
  type PerformanceBaseline,
} from '../framework/helpers/performance-tracker.js';

describe('Performance Regression Detection', () => {
  const tracker = new PerformanceTracker();

  // SLA definitions (P95 thresholds in milliseconds)
  const SLAS = {
    'agent-loading-performance': 30_000,      // 30s
    'workflow-listing-performance': 20_000,   // 20s
    'simple-query-performance': 15_000,       // 15s
    'workflow-execution-performance': 60_000, // 60s
  };

  // Regression threshold: fail if performance degrades > 30%
  const REGRESSION_THRESHOLD = 0.30;

  it('should have performance metrics available', async () => {
    const stats = await tracker.getAllStatistics();
    
    expect(stats.length).toBeGreaterThan(0);
    console.log(`\n✓ Found ${stats.length} test(s) with performance metrics\n`);
  });

  it('should meet SLA requirements (P95)', async () => {
    const stats = await tracker.getAllStatistics();
    const failures: string[] = [];

    console.log('\n📊 SLA Compliance Check\n');
    console.log('═'.repeat(60));

    for (const stat of stats) {
      const sla = SLAS[stat.testName as keyof typeof SLAS];
      
      if (!sla) {
        console.log(`⚠️  ${stat.testName}: No SLA defined (skipping)`);
        continue;
      }

      const passed = stat.p95Duration <= sla;
      const delta = stat.p95Duration - sla;
      const deltaPercent = ((delta / sla) * 100).toFixed(1);

      if (passed) {
        console.log(`✅ ${stat.testName}`);
        console.log(`   P95:     ${tracker.formatDuration(stat.p95Duration)}`);
        console.log(`   SLA:     ${tracker.formatDuration(sla)}`);
        console.log(`   Margin:  -${tracker.formatDuration(Math.abs(delta))} (-${Math.abs(parseFloat(deltaPercent))}%)`);
      } else {
        console.log(`❌ ${stat.testName}`);
        console.log(`   P95:     ${tracker.formatDuration(stat.p95Duration)}`);
        console.log(`   SLA:     ${tracker.formatDuration(sla)}`);
        console.log(`   Over:    +${tracker.formatDuration(delta)} (+${deltaPercent}%)`);
        
        failures.push(
          `${stat.testName}: P95 ${tracker.formatDuration(stat.p95Duration)} exceeds SLA ${tracker.formatDuration(sla)} by ${deltaPercent}%`
        );
      }
      console.log('');
    }

    if (failures.length > 0) {
      console.log('❌ SLA Failures:');
      failures.forEach(f => console.log(`   - ${f}`));
      throw new Error(`${failures.length} test(s) failed to meet SLA requirements`);
    }

    console.log('✅ All tests meet SLA requirements');
  });

  it('should not have critical regressions from baseline', async () => {
    let baseline: PerformanceBaseline[];
    
    try {
      baseline = await tracker.loadBaseline();
    } catch {
      console.log('\n⚠️  No baseline found - skipping regression check');
      console.log('   Run: npm run test:performance:baseline');
      return;
    }

    const stats = await tracker.getAllStatistics();
    const regressions: string[] = [];

    console.log('\n🔍 Performance Regression Analysis\n');
    console.log('═'.repeat(60));
    console.log(`Baseline Date: ${new Date(baseline[0]?.baselineDate).toLocaleString()}\n`);

    for (const stat of stats) {
      const baselineItem = baseline.find(b => b.testName === stat.testName);
      
      if (!baselineItem) {
        console.log(`⚠️  ${stat.testName}: No baseline (new test)`);
        continue;
      }

      const delta = stat.p95Duration - baselineItem.baselineDuration;
      const deltaPercent = (delta / baselineItem.baselineDuration);
      const isRegression = deltaPercent > REGRESSION_THRESHOLD;

      if (isRegression) {
        console.log(`❌ ${stat.testName} - REGRESSION DETECTED`);
        console.log(`   Current:  ${tracker.formatDuration(stat.p95Duration)}`);
        console.log(`   Baseline: ${tracker.formatDuration(baselineItem.baselineDuration)}`);
        console.log(`   Delta:    +${tracker.formatDuration(delta)} (+${(deltaPercent * 100).toFixed(1)}%)`);
        console.log(`   Severity: ${deltaPercent > 0.5 ? 'CRITICAL ⛔' : 'MODERATE ⚠️'}`);
        
        regressions.push(
          `${stat.testName}: P95 increased by ${(deltaPercent * 100).toFixed(1)}% (${tracker.formatDuration(delta)})`
        );
      } else if (delta > 0) {
        console.log(`⚡ ${stat.testName} - Minor slowdown (acceptable)`);
        console.log(`   Current:  ${tracker.formatDuration(stat.p95Duration)}`);
        console.log(`   Baseline: ${tracker.formatDuration(baselineItem.baselineDuration)}`);
        console.log(`   Delta:    +${tracker.formatDuration(delta)} (+${(deltaPercent * 100).toFixed(1)}%)`);
      } else if (delta < 0) {
        console.log(`🟢 ${stat.testName} - IMPROVED`);
        console.log(`   Current:  ${tracker.formatDuration(stat.p95Duration)}`);
        console.log(`   Baseline: ${tracker.formatDuration(baselineItem.baselineDuration)}`);
        console.log(`   Delta:    ${tracker.formatDuration(delta)} (${(deltaPercent * 100).toFixed(1)}%)`);
      } else {
        console.log(`✅ ${stat.testName} - No change`);
        console.log(`   P95:      ${tracker.formatDuration(stat.p95Duration)}`);
      }
      console.log('');
    }

    if (regressions.length > 0) {
      console.log('❌ Performance Regressions Detected:');
      regressions.forEach(r => console.log(`   - ${r}`));
      throw new Error(`${regressions.length} test(s) have critical performance regressions (> ${REGRESSION_THRESHOLD * 100}%)`);
    }

    console.log('✅ No critical performance regressions detected');
  });

  it('should have acceptable performance variance', async () => {
    const stats = await tracker.getAllStatistics();
    const highVariance: string[] = [];

    console.log('\n📈 Performance Variance Analysis\n');
    console.log('═'.repeat(60));

    for (const stat of stats) {
      // Calculate coefficient of variation (stddev / mean)
      const coefficientOfVariation = stat.stdDevDuration / stat.avgDuration;
      const variancePercent = (coefficientOfVariation * 100).toFixed(1);
      
      // Acceptable variance: < 30%
      const acceptable = coefficientOfVariation < 0.3;

      if (acceptable) {
        console.log(`✅ ${stat.testName}`);
        console.log(`   Avg:     ${tracker.formatDuration(stat.avgDuration)}`);
        console.log(`   StdDev:  ${tracker.formatDuration(stat.stdDevDuration)}`);
        console.log(`   CV:      ${variancePercent}% (acceptable)`);
      } else {
        console.log(`⚠️  ${stat.testName}`);
        console.log(`   Avg:     ${tracker.formatDuration(stat.avgDuration)}`);
        console.log(`   StdDev:  ${tracker.formatDuration(stat.stdDevDuration)}`);
        console.log(`   CV:      ${variancePercent}% (high variance)`);
        
        highVariance.push(
          `${stat.testName}: CV ${variancePercent}% (acceptable < 30%)`
        );
      }
      console.log('');
    }

    if (highVariance.length > 0) {
      console.log('⚠️  High Variance Tests (not failing, but worth investigating):');
      highVariance.forEach(v => console.log(`   - ${v}`));
    } else {
      console.log('✅ All tests have acceptable variance');
    }
  });

  it('should track performance trends', async () => {
    const stats = await tracker.getAllStatistics();

    console.log('\n📊 Performance Summary\n');
    console.log('═'.repeat(60));
    console.log('| Test | Runs | Avg | P50 | P95 | Max |');
    console.log('|------|------|-----|-----|-----|-----|');

    for (const stat of stats) {
      console.log(
        `| ${stat.testName} ` +
        `| ${stat.runs} ` +
        `| ${tracker.formatDuration(stat.avgDuration)} ` +
        `| ${tracker.formatDuration(stat.p50Duration)} ` +
        `| ${tracker.formatDuration(stat.p95Duration)} ` +
        `| ${tracker.formatDuration(stat.maxDuration)} |`
      );
    }

    console.log('');
    console.log('📝 Recommendations:');
    console.log('   • Run: npm run test:performance:dashboard');
    console.log('   • View full metrics in docs/performance-dashboard.md');
    console.log('   • Update baseline: npm run test:performance:baseline');
  });
});
