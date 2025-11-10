/**
 * Quality Metrics Collector
 *
 * Collects and persists behavior quality metrics from E2E test runs
 * for historical tracking, trend analysis, and dashboard generation.
 *
 * Usage:
 * ```ts
 * const collector = new QualityMetricsCollector();
 * 
 * // Record quality report from test
 * await collector.recordMetric({
 *   testName: 'should load debug agent',
 *   timestamp: new Date().toISOString(),
 *   qualityReport: report,
 *   sessionAnalysis: analysis,
 * });
 * 
 * // Get historical data
 * const history = await collector.getHistory('should load debug agent');
 * const trends = collector.analyzeTrends(history);
 * ```
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { BehaviorQualityReport } from './behavior-quality.js';
import type { SessionAnalysis } from './copilot-session-helper.js';

/**
 * Quality metric record for a single test execution
 */
export interface QualityMetricRecord {
  /** Test name/identifier */
  testName: string;
  /** ISO timestamp of test execution */
  timestamp: string;
  /** Overall quality score (0-100) */
  overallScore: number;
  /** Quality rating */
  rating: 'Excellent' | 'Good' | 'Acceptable' | 'Poor' | 'Failed';
  /** Dimension scores */
  dimensions: {
    toolCallAccuracy: number;
    parameterCompleteness: number;
    contextualRelevance: number;
    conversationCoherence: number;
    efficiency: number;
    instructionAdherence: number;
  };
  /** Session metadata */
  session: {
    model: string;
    durationSeconds: number;
    toolCalls: number;
    bmadCalls: number;
    userMessages: number;
    assistantMessages: number;
  };
  /** Issues found (if any) */
  findings: string[];
  /** Recommendations (if any) */
  recommendations: string[];
}

/**
 * Aggregate statistics for a test
 */
export interface QualityStatistics {
  /** Test name */
  testName: string;
  /** Number of runs */
  runs: number;
  /** Score statistics */
  scores: {
    current: number;
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
  };
  /** Dimension averages */
  dimensionAverages: {
    toolCallAccuracy: number;
    parameterCompleteness: number;
    contextualRelevance: number;
    conversationCoherence: number;
    efficiency: number;
    instructionAdherence: number;
  };
  /** Trend analysis */
  trend: {
    direction: 'improving' | 'stable' | 'degrading';
    changePercent: number;
    recentAverage: number;
    historicalAverage: number;
  };
}

/**
 * Quality Metrics Collector
 *
 * Persists quality metrics to JSON files for historical tracking
 */
export class QualityMetricsCollector {
  private metricsDir: string;

  constructor(metricsDir = join(process.cwd(), 'test-results', 'quality-metrics')) {
    this.metricsDir = metricsDir;
  }

  /**
   * Record a quality metric from a test run
   *
   * @param data - Test execution data
   */
  async recordMetric(data: {
    testName: string;
    timestamp: string;
    qualityReport: BehaviorQualityReport;
    sessionAnalysis: SessionAnalysis;
  }): Promise<void> {
    const { testName, timestamp, qualityReport, sessionAnalysis } = data;

    // Create metric record
    const record: QualityMetricRecord = {
      testName,
      timestamp,
      overallScore: qualityReport.overallScore,
      rating: qualityReport.rating,
      dimensions: {
        toolCallAccuracy: qualityReport.dimensions.toolCallAccuracy,
        parameterCompleteness: qualityReport.dimensions.parameterCompleteness,
        contextualRelevance: qualityReport.dimensions.contextualRelevance,
        conversationCoherence: qualityReport.dimensions.conversationCoherence,
        efficiency: qualityReport.dimensions.efficiency,
        instructionAdherence: qualityReport.dimensions.instructionAdherence,
      },
      session: {
        model: sessionAnalysis.model,
        durationSeconds: sessionAnalysis.durationSeconds,
        toolCalls: sessionAnalysis.toolCalls.length,
        bmadCalls: sessionAnalysis.bmadCalls.length,
        userMessages: sessionAnalysis.userMessages,
        assistantMessages: sessionAnalysis.assistantMessages,
      },
      findings: qualityReport.findings,
      recommendations: qualityReport.recommendations,
    };

    // Ensure directory exists
    await this.ensureMetricsDir();

    // Load existing metrics
    const metrics = await this.loadMetrics(testName);

    // Add new record
    metrics.push(record);

    // Save updated metrics
    await this.saveMetrics(testName, metrics);
  }

  /**
   * Get all historical metrics for a test
   *
   * @param testName - Name of test
   * @returns Array of metric records
   */
  async getHistory(testName: string): Promise<QualityMetricRecord[]> {
    return this.loadMetrics(testName);
  }

  /**
   * Calculate statistics for a test
   *
   * @param testName - Name of test
   * @returns Quality statistics
   */
  async getStatistics(testName: string): Promise<QualityStatistics | null> {
    const metrics = await this.loadMetrics(testName);

    if (metrics.length === 0) {
      return null;
    }

    const scores = metrics.map((m) => m.overallScore);
    const current = scores[scores.length - 1];
    const sorted = [...scores].sort((a, b) => a - b);
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Calculate dimension averages
    const dimensionAverages = {
      toolCallAccuracy: this.average(metrics.map((m) => m.dimensions.toolCallAccuracy)),
      parameterCompleteness: this.average(metrics.map((m) => m.dimensions.parameterCompleteness)),
      contextualRelevance: this.average(metrics.map((m) => m.dimensions.contextualRelevance)),
      conversationCoherence: this.average(metrics.map((m) => m.dimensions.conversationCoherence)),
      efficiency: this.average(metrics.map((m) => m.dimensions.efficiency)),
      instructionAdherence: this.average(metrics.map((m) => m.dimensions.instructionAdherence)),
    };

    // Analyze trend (recent 3 runs vs historical)
    const recentRuns = metrics.slice(-3);
    const historicalRuns = metrics.slice(0, -3);
    
    const recentAverage = recentRuns.reduce((sum, m) => sum + m.overallScore, 0) / recentRuns.length;
    const historicalAverage = historicalRuns.length > 0
      ? historicalRuns.reduce((sum, m) => sum + m.overallScore, 0) / historicalRuns.length
      : recentAverage;
    
    const changePercent = ((recentAverage - historicalAverage) / historicalAverage) * 100;
    
    let direction: 'improving' | 'stable' | 'degrading';
    if (changePercent > 5) direction = 'improving';
    else if (changePercent < -5) direction = 'degrading';
    else direction = 'stable';

    return {
      testName,
      runs: metrics.length,
      scores: {
        current,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean,
        median,
        stdDev,
      },
      dimensionAverages,
      trend: {
        direction,
        changePercent,
        recentAverage,
        historicalAverage,
      },
    };
  }

  /**
   * Get all test names with recorded metrics
   *
   * @returns Array of test names
   */
  async getAllTests(): Promise<string[]> {
    if (!existsSync(this.metricsDir)) {
      return [];
    }

    const { readdir } = await import('node:fs/promises');
    const files = await readdir(this.metricsDir);
    
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''));
  }

  /**
   * Clear all metrics for a test
   *
   * @param testName - Name of test
   */
  async clearMetrics(testName: string): Promise<void> {
    const filePath = this.getMetricsPath(testName);
    
    if (existsSync(filePath)) {
      const { unlink } = await import('node:fs/promises');
      await unlink(filePath);
    }
  }

  /**
   * Ensure metrics directory exists
   */
  private async ensureMetricsDir(): Promise<void> {
    if (!existsSync(this.metricsDir)) {
      await mkdir(this.metricsDir, { recursive: true });
    }
  }

  /**
   * Get file path for test metrics
   */
  private getMetricsPath(testName: string): string {
    // Sanitize test name for filename
    const sanitized = testName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    return join(this.metricsDir, `${sanitized}.json`);
  }

  /**
   * Load metrics from file
   */
  private async loadMetrics(testName: string): Promise<QualityMetricRecord[]> {
    const filePath = this.getMetricsPath(testName);

    if (!existsSync(filePath)) {
      return [];
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content) as QualityMetricRecord[];
    } catch (error) {
      console.warn(`Failed to load metrics for ${testName}:`, error);
      return [];
    }
  }

  /**
   * Save metrics to file
   */
  private async saveMetrics(testName: string, metrics: QualityMetricRecord[]): Promise<void> {
    const filePath = this.getMetricsPath(testName);
    await writeFile(filePath, JSON.stringify(metrics, null, 2));
  }

  /**
   * Calculate average of numbers
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
}

/**
 * Export quality metrics to a summary JSON file
 *
 * @param collector - Metrics collector instance
 * @param outputPath - Path to output file
 */
export async function exportQualityDashboard(
  collector: QualityMetricsCollector,
  outputPath: string
): Promise<void> {
  const allTests = await collector.getAllTests();
  
  const dashboard = {
    generatedAt: new Date().toISOString(),
    totalTests: allTests.length,
    tests: [] as QualityStatistics[],
  };

  for (const testName of allTests) {
    const stats = await collector.getStatistics(testName);
    if (stats) {
      dashboard.tests.push(stats);
    }
  }

  // Sort by current score (descending)
  dashboard.tests.sort((a, b) => b.scores.current - a.scores.current);

  await writeFile(outputPath, JSON.stringify(dashboard, null, 2));
}
