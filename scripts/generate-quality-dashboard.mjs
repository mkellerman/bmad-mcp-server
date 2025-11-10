#!/usr/bin/env node
/**
 * Quality Metrics Dashboard Generator
 *
 * Generates a comprehensive quality dashboard from collected test metrics.
 * Creates both JSON data files and human-readable markdown reports.
 *
 * Usage:
 *   node scripts/generate-quality-dashboard.mjs
 *   node scripts/generate-quality-dashboard.mjs --output=docs/quality-dashboard.md
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

/**
 * Load quality statistics from JSON dashboard
 */
async function loadDashboardData(dashboardPath) {
  if (!existsSync(dashboardPath)) {
    console.warn(`⚠️  No dashboard data found at ${dashboardPath}`);
    return null;
  }

  const content = await readFile(dashboardPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Generate markdown dashboard report
 */
function generateMarkdownReport(dashboard) {
  const lines = [];

  // Header
  lines.push('# Quality Metrics Dashboard');
  lines.push('');
  lines.push(`**Generated:** ${new Date(dashboard.generatedAt).toLocaleString()}`);
  lines.push(`**Total Tests:** ${dashboard.totalTests}`);
  lines.push('');

  // Overall summary
  lines.push('## Overall Summary');
  lines.push('');

  const allScores = dashboard.tests.map((t) => t.scores.current);
  const avgScore = allScores.reduce((sum, s) => sum + s, 0) / allScores.length;
  const excellentCount = dashboard.tests.filter((t) => t.scores.current >= 90).length;
  const goodCount = dashboard.tests.filter((t) => t.scores.current >= 75 && t.scores.current < 90).length;
  const acceptableCount = dashboard.tests.filter((t) => t.scores.current >= 60 && t.scores.current < 75).length;
  const poorCount = dashboard.tests.filter((t) => t.scores.current < 60).length;

  lines.push(`- **Average Score:** ${avgScore.toFixed(1)}/100`);
  lines.push(`- **Excellent (≥90):** ${excellentCount} tests`);
  lines.push(`- **Good (75-89):** ${goodCount} tests`);
  lines.push(`- **Acceptable (60-74):** ${acceptableCount} tests`);
  lines.push(`- **Poor (<60):** ${poorCount} tests`);
  lines.push('');

  // Trend summary
  const improving = dashboard.tests.filter((t) => t.trend.direction === 'improving').length;
  const stable = dashboard.tests.filter((t) => t.trend.direction === 'stable').length;
  const degrading = dashboard.tests.filter((t) => t.trend.direction === 'degrading').length;

  lines.push('## Trend Analysis');
  lines.push('');
  lines.push(`- **Improving:** ${improving} tests 📈`);
  lines.push(`- **Stable:** ${stable} tests ➡️`);
  lines.push(`- **Degrading:** ${degrading} tests 📉`);
  lines.push('');

  if (degrading > 0) {
    lines.push('### ⚠️  Tests Showing Degradation');
    lines.push('');
    const degradingTests = dashboard.tests.filter((t) => t.trend.direction === 'degrading');
    for (const test of degradingTests) {
      lines.push(`- **${test.testName}**`);
      lines.push(`  - Current: ${test.scores.current.toFixed(1)}`);
      lines.push(`  - Recent Avg: ${test.trend.recentAverage.toFixed(1)}`);
      lines.push(`  - Historical Avg: ${test.trend.historicalAverage.toFixed(1)}`);
      lines.push(`  - Change: ${test.trend.changePercent.toFixed(1)}%`);
    }
    lines.push('');
  }

  // Test details
  lines.push('## Test Details');
  lines.push('');

  for (const test of dashboard.tests) {
    const emoji = getRatingEmoji(test.scores.current);
    const trend = getTrendEmoji(test.trend.direction);
    
    lines.push(`### ${emoji} ${test.testName} ${trend}`);
    lines.push('');
    
    // Scores
    lines.push('**Scores:**');
    lines.push(`- Current: **${test.scores.current.toFixed(1)}/100** (${getRating(test.scores.current)})`);
    lines.push(`- Average: ${test.scores.mean.toFixed(1)}`);
    lines.push(`- Range: ${test.scores.min.toFixed(1)} - ${test.scores.max.toFixed(1)}`);
    lines.push(`- Std Dev: ${test.scores.stdDev.toFixed(1)}`);
    lines.push(`- Runs: ${test.runs}`);
    lines.push('');

    // Dimensions
    lines.push('**Quality Dimensions:**');
    lines.push('');
    lines.push('| Dimension | Score | Bar |');
    lines.push('|-----------|-------|-----|');
    
    const dimensions = [
      ['Tool Call Accuracy', test.dimensionAverages.toolCallAccuracy],
      ['Parameter Completeness', test.dimensionAverages.parameterCompleteness],
      ['Contextual Relevance', test.dimensionAverages.contextualRelevance],
      ['Conversation Coherence', test.dimensionAverages.conversationCoherence],
      ['Efficiency', test.dimensionAverages.efficiency],
      ['Instruction Adherence', test.dimensionAverages.instructionAdherence],
    ];

    for (const [name, score] of dimensions) {
      const bar = generateBar(score);
      lines.push(`| ${name} | ${score.toFixed(1)} | ${bar} |`);
    }
    
    lines.push('');

    // Trend
    lines.push('**Trend:**');
    lines.push(`- Direction: ${test.trend.direction} (${test.trend.changePercent >= 0 ? '+' : ''}${test.trend.changePercent.toFixed(1)}%)`);
    lines.push(`- Recent Average: ${test.trend.recentAverage.toFixed(1)}`);
    lines.push(`- Historical Average: ${test.trend.historicalAverage.toFixed(1)}`);
    lines.push('');
  }

  // Dimension analysis
  lines.push('## Dimension Analysis');
  lines.push('');
  lines.push('Average scores across all tests by dimension:');
  lines.push('');

  const avgDimensions = {
    toolCallAccuracy: avgDimension(dashboard.tests, 'toolCallAccuracy'),
    parameterCompleteness: avgDimension(dashboard.tests, 'parameterCompleteness'),
    contextualRelevance: avgDimension(dashboard.tests, 'contextualRelevance'),
    conversationCoherence: avgDimension(dashboard.tests, 'conversationCoherence'),
    efficiency: avgDimension(dashboard.tests, 'efficiency'),
    instructionAdherence: avgDimension(dashboard.tests, 'instructionAdherence'),
  };

  lines.push('| Dimension | Average Score |');
  lines.push('|-----------|---------------|');
  lines.push(`| Tool Call Accuracy | ${avgDimensions.toolCallAccuracy.toFixed(1)} |`);
  lines.push(`| Parameter Completeness | ${avgDimensions.parameterCompleteness.toFixed(1)} |`);
  lines.push(`| Contextual Relevance | ${avgDimensions.contextualRelevance.toFixed(1)} |`);
  lines.push(`| Conversation Coherence | ${avgDimensions.conversationCoherence.toFixed(1)} |`);
  lines.push(`| Efficiency | ${avgDimensions.efficiency.toFixed(1)} |`);
  lines.push(`| Instruction Adherence | ${avgDimensions.instructionAdherence.toFixed(1)} |`);
  lines.push('');

  // Identify weakest dimension
  const weakest = Object.entries(avgDimensions)
    .sort((a, b) => a[1] - b[1])[0];
  
  if (weakest[1] < 80) {
    lines.push('### 💡 Recommendation');
    lines.push('');
    lines.push(`Focus on improving **${formatDimensionName(weakest[0])}** (current avg: ${weakest[1].toFixed(1)})`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get rating from score
 */
function getRating(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Acceptable';
  if (score > 0) return 'Poor';
  return 'Failed';
}

/**
 * Get emoji for rating
 */
function getRatingEmoji(score) {
  if (score >= 90) return '🌟';
  if (score >= 75) return '✅';
  if (score >= 60) return '⚡';
  if (score > 0) return '⚠️';
  return '❌';
}

/**
 * Get emoji for trend
 */
function getTrendEmoji(direction) {
  if (direction === 'improving') return '📈';
  if (direction === 'stable') return '➡️';
  return '📉';
}

/**
 * Generate progress bar
 */
function generateBar(score) {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Calculate average dimension score
 */
function avgDimension(tests, dimensionName) {
  const scores = tests.map((t) => t.dimensionAverages[dimensionName]);
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

/**
 * Format dimension name
 */
function formatDimensionName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Main execution
 */
async function main() {
  console.log('📊 Generating Quality Dashboard...\n');

  const dashboardPath = join(PROJECT_ROOT, 'test-results', 'quality-dashboard.json');
  const outputPath = process.argv.includes('--output')
    ? process.argv.find((arg) => arg.startsWith('--output='))?.split('=')[1]
    : join(PROJECT_ROOT, 'docs', 'quality-dashboard.md');

  // Load dashboard data
  const dashboard = await loadDashboardData(dashboardPath);

  if (!dashboard) {
    console.log('ℹ️  No quality metrics collected yet.');
    console.log('   Run E2E tests with quality monitoring to generate metrics.\n');
    return;
  }

  // Generate markdown report
  const markdown = generateMarkdownReport(dashboard);

  // Write report
  await writeFile(outputPath, markdown);

  console.log(`✅ Dashboard generated at: ${outputPath}`);
  console.log(`   Tests analyzed: ${dashboard.totalTests}`);
  console.log(`   Generated: ${new Date(dashboard.generatedAt).toLocaleString()}\n`);
}

main().catch((error) => {
  console.error('❌ Error generating dashboard:', error);
  process.exit(1);
});
