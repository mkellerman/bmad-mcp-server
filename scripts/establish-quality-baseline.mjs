#!/usr/bin/env node
/**
 * Establish Quality Baseline
 *
 * Saves current quality metrics as the baseline for regression testing.
 * Run this after validating that current quality is acceptable.
 *
 * Usage:
 *   node scripts/establish-quality-baseline.mjs
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

/**
 * Quality Metrics Collector (inline for script)
 */
class QualityMetricsCollector {
  constructor(metricsDir = join(PROJECT_ROOT, 'test-results', 'quality-metrics')) {
    this.metricsDir = metricsDir;
  }

  async getAllTests() {
    if (!existsSync(this.metricsDir)) {
      return [];
    }

    const { readdir } = await import('node:fs/promises');
    const files = await readdir(this.metricsDir);
    
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''));
  }

  async getStatistics(testName) {
    const metrics = await this.loadMetrics(testName);

    if (metrics.length === 0) {
      return null;
    }

    const scores = metrics.map((m) => m.overallScore);
    const current = scores[scores.length - 1];
    const sorted = [...scores].sort((a, b) => a - b);
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    const dimensionAverages = {
      toolCallAccuracy: this.average(metrics.map((m) => m.dimensions.toolCallAccuracy)),
      parameterCompleteness: this.average(metrics.map((m) => m.dimensions.parameterCompleteness)),
      contextualRelevance: this.average(metrics.map((m) => m.dimensions.contextualRelevance)),
      conversationCoherence: this.average(metrics.map((m) => m.dimensions.conversationCoherence)),
      efficiency: this.average(metrics.map((m) => m.dimensions.efficiency)),
      instructionAdherence: this.average(metrics.map((m) => m.dimensions.instructionAdherence)),
    };

    return {
      testName,
      runs: metrics.length,
      scores: {
        current,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean,
      },
      dimensionAverages,
    };
  }

  getMetricsPath(testName) {
    const sanitized = testName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    return join(this.metricsDir, `${sanitized}.json`);
  }

  async loadMetrics(testName) {
    const filePath = this.getMetricsPath(testName);

    if (!existsSync(filePath)) {
      return [];
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Failed to load metrics for ${testName}:`, error);
      return [];
    }
  }

  average(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
}

async function main() {
  console.log('📊 Establishing Quality Baseline...\n');

  const collector = new QualityMetricsCollector();
  const baselinePath = join(PROJECT_ROOT, 'test-results', 'quality-baseline.json');

  // Get current test metrics
  const allTests = await collector.getAllTests();
  
  if (allTests.length === 0) {
    console.log('❌ No quality metrics found.');
    console.log('   Run E2E tests with quality monitoring first.\n');
    process.exit(1);
  }

  console.log(`Found ${allTests.length} test(s) with quality metrics:\n`);

  const baseline = [];

  // Show current quality
  for (const testName of allTests) {
    const stats = await collector.getStatistics(testName);
    if (stats) {
      console.log(`  ✓ ${testName}`);
      console.log(`    Score: ${stats.scores.current.toFixed(1)}/100`);
      console.log(`    Runs:  ${stats.runs}`);
      console.log('');

      baseline.push({
        testName,
        baselineScore: stats.scores.current,
        baselineDimensions: stats.dimensionAverages,
        baselineDate: new Date().toISOString(),
        runs: stats.runs,
      });
    }
  }

  // Save baseline
  await writeFile(baselinePath, JSON.stringify(baseline, null, 2));

  console.log(`✅ Baseline saved for ${baseline.length} test(s)`);
  console.log(`   Baseline file: test-results/quality-baseline.json`);
  console.log('');
  console.log('💡 Run regression tests with:');
  console.log('   npm run test:regression\n');
}

main().catch((error) => {
  console.error('❌ Error establishing baseline:', error);
  process.exit(1);
});

