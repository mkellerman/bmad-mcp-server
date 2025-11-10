#!/usr/bin/env node

/**
 * Generate Performance Dashboard
 * 
 * Creates a comprehensive performance metrics dashboard from test results.
 */

import fs from 'fs/promises';
import path from 'path';

class PerformanceTracker {
  constructor(metricsDir = 'test-results/performance-metrics') {
    this.metricsDir = metricsDir;
    this.metricsFile = path.join(metricsDir, 'all-metrics.json');
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

  async loadBaseline() {
    const baselineFile = path.join(this.metricsDir, 'baseline.json');
    try {
      const content = await fs.readFile(baselineFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

async function generateDashboard() {
  console.log('📊 Generating Performance Dashboard...\n');

  const tracker = new PerformanceTracker();
  const stats = await tracker.getAllStatistics();
  const baseline = await tracker.loadBaseline();

  if (stats.length === 0) {
    console.log('❌ No performance metrics found.');
    console.log('Run: npm run test:e2e:benchmark');
    process.exit(1);
  }

  // Generate markdown dashboard
  let markdown = '# Performance Dashboard\n\n';
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  markdown += `Total Tests: ${stats.length}\n\n`;

  markdown += '## Performance Summary\n\n';
  markdown += '| Test | Runs | Avg | Min | Max | P50 | P95 | P99 | StdDev |\n';
  markdown += '|------|------|-----|-----|-----|-----|-----|-----|--------|\n';

  for (const stat of stats) {
    markdown += `| ${stat.testName} `;
    markdown += `| ${stat.runs} `;
    markdown += `| ${tracker.formatDuration(stat.avgDuration)} `;
    markdown += `| ${tracker.formatDuration(stat.minDuration)} `;
    markdown += `| ${tracker.formatDuration(stat.maxDuration)} `;
    markdown += `| ${tracker.formatDuration(stat.p50Duration)} `;
    markdown += `| ${tracker.formatDuration(stat.p95Duration)} `;
    markdown += `| ${tracker.formatDuration(stat.p99Duration)} `;
    markdown += `| ${tracker.formatDuration(stat.stdDevDuration)} |\n`;
  }

  markdown += '\n## Baseline Comparison\n\n';
  
  if (baseline) {
    markdown += '| Test | Current P95 | Baseline P95 | Delta | Status |\n';
    markdown += '|------|-------------|--------------|-------|--------|\n';

    for (const stat of stats) {
      const baselineItem = baseline.find(b => b.testName === stat.testName);
      if (baselineItem) {
        const delta = stat.p95Duration - baselineItem.baselineDuration;
        const deltaPercent = ((delta / baselineItem.baselineDuration) * 100).toFixed(1);
        const status = delta > 0 ? '🔴 Slower' : delta < 0 ? '🟢 Faster' : '⚪ Same';
        
        markdown += `| ${stat.testName} `;
        markdown += `| ${tracker.formatDuration(stat.p95Duration)} `;
        markdown += `| ${tracker.formatDuration(baselineItem.baselineDuration)} `;
        markdown += `| ${delta > 0 ? '+' : ''}${tracker.formatDuration(delta)} (${deltaPercent > 0 ? '+' : ''}${deltaPercent}%) `;
        markdown += `| ${status} |\n`;
      }
    }
  } else {
    markdown += '*No baseline established. Run: npm run test:performance:baseline*\n';
  }

  markdown += '\n## Test Details\n\n';

  for (const stat of stats) {
    markdown += `### ${stat.testName}\n\n`;
    markdown += `- **Runs**: ${stat.runs}\n`;
    markdown += `- **Average**: ${tracker.formatDuration(stat.avgDuration)}\n`;
    markdown += `- **Min**: ${tracker.formatDuration(stat.minDuration)}\n`;
    markdown += `- **Max**: ${tracker.formatDuration(stat.maxDuration)}\n`;
    markdown += `- **Median (P50)**: ${tracker.formatDuration(stat.p50Duration)}\n`;
    markdown += `- **P95**: ${tracker.formatDuration(stat.p95Duration)}\n`;
    markdown += `- **P99**: ${tracker.formatDuration(stat.p99Duration)}\n`;
    markdown += `- **Standard Deviation**: ${tracker.formatDuration(stat.stdDevDuration)}\n`;
    markdown += `- **First Run**: ${new Date(stat.firstRun).toLocaleString()}\n`;
    markdown += `- **Last Run**: ${new Date(stat.lastRun).toLocaleString()}\n`;
    markdown += '\n';
  }

  markdown += '## SLA Status\n\n';
  markdown += '| Test | P95 | SLA | Status |\n';
  markdown += '|------|-----|-----|--------|\n';

  // Define SLAs (can be customized)
  const slas = {
    'agent-loading-performance': 30000,      // 30s
    'workflow-listing-performance': 20000,   // 20s
    'simple-query-performance': 15000,       // 15s
    'workflow-execution-performance': 60000, // 60s
  };

  for (const stat of stats) {
    const sla = slas[stat.testName] || 30000;
    const status = stat.p95Duration <= sla ? '✅ Pass' : '❌ Fail';
    
    markdown += `| ${stat.testName} `;
    markdown += `| ${tracker.formatDuration(stat.p95Duration)} `;
    markdown += `| ${tracker.formatDuration(sla)} `;
    markdown += `| ${status} |\n`;
  }

  // Save dashboard
  const dashboardPath = path.join('docs', 'performance-dashboard.md');
  await fs.writeFile(dashboardPath, markdown);

  // Save JSON for programmatic access
  const jsonPath = path.join('test-results', 'performance-dashboard.json');
  const jsonData = {
    generatedAt: new Date().toISOString(),
    statistics: stats,
    baseline: baseline || [],
    slas,
  };
  await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2));

  console.log('✅ Dashboard generated successfully!');
  console.log(`   Markdown: ${dashboardPath}`);
  console.log(`   JSON:     ${jsonPath}`);
  console.log();
  console.log('Console Output:');
  console.log('═'.repeat(60));
  console.log(markdown);
}

generateDashboard().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
