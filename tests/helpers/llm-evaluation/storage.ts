/**
 * Evaluation Result Storage
 *
 * Stores LLM evaluation results to disk for:
 * - Trend analysis over time
 * - Regression detection
 * - Judge performance comparison
 * - Cost tracking history
 *
 * Results are stored as timestamped JSON files in test-results/evaluations/
 */

import {
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  readFileSync,
} from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import type {
  ConsistencyResult,
  EvaluationCriteria,
  MCPResponse,
} from './types.js';

/**
 * Capture current version information
 */
function captureVersionInfo(): VersionInfo {
  const timestamp = Date.now();

  // Get package version
  let packageVersion = 'unknown';
  try {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf-8'),
    );
    packageVersion = packageJson.version;
  } catch {
    // Ignore errors
  }

  // Get git information
  let gitSha: string | undefined;
  let gitShortSha: string | undefined;
  let gitBranch: string | undefined;
  let isDirty = false;

  try {
    // Full SHA
    gitSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    gitShortSha = gitSha.substring(0, 7);

    // Branch name
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
    }).trim();

    // Check if working directory is dirty
    const status = execSync('git status --porcelain', {
      encoding: 'utf-8',
    }).trim();
    isDirty = status.length > 0;
  } catch {
    // Not a git repo or git not available
  }

  // Try to extract PR number from branch name or env
  let prNumber: string | undefined;
  if (gitBranch?.includes('/')) {
    const match = gitBranch.match(/(?:pr|pull)[-/](\d+)/i);
    if (match) prNumber = match[1];
  }
  // Check environment variables for PR number
  if (!prNumber) {
    prNumber =
      process.env.GITHUB_PR_NUMBER ||
      process.env.PULL_REQUEST_NUMBER ||
      process.env.PR_NUMBER;
  }

  return {
    package: packageVersion,
    gitSha,
    gitShortSha,
    gitBranch,
    prNumber,
    isDirty,
    capturedAt: timestamp,
  };
}

/**
 * Version information for the tested code
 */
export interface VersionInfo {
  /** Package version from package.json (e.g., "3.0.1") */
  package: string;
  /** Full git SHA (e.g., "a58f5681234...") */
  gitSha?: string;
  /** Short git SHA (first 7 chars) */
  gitShortSha?: string;
  /** Git branch name */
  gitBranch?: string;
  /** PR number if testing a PR */
  prNumber?: string;
  /** Whether working directory has uncommitted changes */
  isDirty?: boolean;
  /** Timestamp when version was captured */
  capturedAt: number;
}

/**
 * Stored evaluation record
 */
export interface EvaluationRecord {
  id: string;
  testName: string;
  timestamp: number;
  date: string;

  // Test context
  criteria: EvaluationCriteria;
  subjectModel?: string;

  // Results
  result: ConsistencyResult;

  // Version information
  version: VersionInfo;

  // Metadata
  environment: {
    profile: string;
    ci: boolean;
  };
}

/**
 * Trend analysis for a test over time
 */
export interface TrendAnalysis {
  testName: string;
  evaluations: EvaluationRecord[];

  statistics: {
    count: number;
    passRate: number;
    averageScore: number;
    scoreStdDev: number;
    averageCost: number;
    totalCost: number;
  };

  trend: {
    improving: boolean;
    degrading: boolean;
    stable: boolean;
    recentPassRate: number; // Last 5 evaluations
    historicalPassRate: number; // All evaluations
  };

  regressions: Array<{
    recordId: string;
    timestamp: number;
    previousScore: number;
    currentScore: number;
    drop: number;
  }>;
}

/**
 * Version-specific statistics
 */
export interface VersionStats {
  version: VersionInfo;
  count: number;
  passRate: number;
  averageScore: number;
  scoreStdDev: number;
  totalCost: number;
  firstSeen: number;
  lastSeen: number;
}

/**
 * Comparison between two versions
 */
export interface VersionComparison {
  testName: string;
  baseline: VersionStats;
  current: VersionStats;

  deltas: {
    passRate: number; // Percentage point change
    averageScore: number; // Score point change
    scoreStdDev: number;
    cost: number; // Cost change
  };

  improvement: boolean;
  regression: boolean;
}

/**
 * Storage manager for evaluation results
 */
export class EvaluationStorage {
  private storageDir: string;

  constructor(baseDir: string = 'test-results/evaluations') {
    this.storageDir = baseDir;
    this.ensureStorageDir();
  }

  /**
   * Save evaluation result to disk
   */
  save(
    testName: string,
    response: MCPResponse,
    criteria: EvaluationCriteria,
    result: ConsistencyResult,
  ): EvaluationRecord {
    const timestamp = Date.now();
    const date = new Date(timestamp).toISOString();
    const id = `${testName}-${timestamp}`;

    // Extract subject model from response
    let subjectModel: string | undefined;
    try {
      if (response.content?.[0]?.type === 'text') {
        const content = JSON.parse(response.content[0].text);
        subjectModel = content.model || content.metadata?.model;
      }
    } catch {
      // Ignore parsing errors
    }

    // Get environment info
    const environment = {
      profile: process.env.TEST_PROFILE || 'development',
      ci: process.env.CI === 'true',
    };

    // Capture version information
    const version = captureVersionInfo();

    const record: EvaluationRecord = {
      id,
      testName,
      timestamp,
      date,
      criteria,
      subjectModel,
      result,
      version,
      environment,
    };

    // Write to disk
    const filename = `${id}.json`;
    const filepath = join(this.storageDir, filename);

    try {
      writeFileSync(filepath, JSON.stringify(record, null, 2));
    } catch (error) {
      console.warn(`Failed to save evaluation result: ${error}`);
    }

    return record;
  }

  /**
   * Load all evaluations for a specific test
   */
  loadTest(testName: string): EvaluationRecord[] {
    if (!existsSync(this.storageDir)) {
      return [];
    }

    const files = readdirSync(this.storageDir);
    const records: EvaluationRecord[] = [];

    for (const file of files) {
      if (!file.startsWith(testName) || !file.endsWith('.json')) {
        continue;
      }

      try {
        const filepath = join(this.storageDir, file);
        const content = readFileSync(filepath, 'utf-8');
        const record = JSON.parse(content) as EvaluationRecord;
        records.push(record);
      } catch (error) {
        console.warn(`Failed to load ${file}: ${error}`);
      }
    }

    return records.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Load all evaluations across all tests
   */
  loadAll(): EvaluationRecord[] {
    if (!existsSync(this.storageDir)) {
      return [];
    }

    const files = readdirSync(this.storageDir);
    const records: EvaluationRecord[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue;
      }

      try {
        const filepath = join(this.storageDir, file);
        const content = readFileSync(filepath, 'utf-8');
        const record = JSON.parse(content) as EvaluationRecord;
        records.push(record);
      } catch (error) {
        console.warn(`Failed to load ${file}: ${error}`);
      }
    }

    return records.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Analyze trends for a specific test
   */
  analyzeTrends(testName: string): TrendAnalysis | null {
    const evaluations = this.loadTest(testName);

    if (evaluations.length === 0) {
      return null;
    }

    // Calculate statistics
    const scores = evaluations.map((e) => e.result.finalScore);
    const passed = evaluations.filter((e) => e.result.passed);
    const costs = evaluations.map((e) =>
      e.result.samples.reduce((sum, s) => sum + s.metadata.cost, 0),
    );

    const count = evaluations.length;
    const passRate = passed.length / count;
    const averageScore = scores.reduce((a, b) => a + b, 0) / count;
    const variance =
      scores.reduce(
        (sum, score) => sum + Math.pow(score - averageScore, 2),
        0,
      ) / count;
    const scoreStdDev = Math.sqrt(variance);
    const averageCost = costs.reduce((a, b) => a + b, 0) / count;
    const totalCost = costs.reduce((a, b) => a + b, 0);

    // Trend analysis (recent vs historical)
    const recentCount = Math.min(5, count);
    const recentEvals = evaluations.slice(-recentCount);
    const recentPassed = recentEvals.filter((e) => e.result.passed);
    const recentPassRate = recentPassed.length / recentCount;

    const improving = recentPassRate > passRate + 0.1;
    const degrading = recentPassRate < passRate - 0.1;
    const stable = !improving && !degrading;

    // Detect regressions (score drops > 10 points)
    const regressions: TrendAnalysis['regressions'] = [];
    for (let i = 1; i < evaluations.length; i++) {
      const prev = evaluations[i - 1];
      const curr = evaluations[i];
      const drop = prev.result.finalScore - curr.result.finalScore;

      if (drop > 10) {
        regressions.push({
          recordId: curr.id,
          timestamp: curr.timestamp,
          previousScore: prev.result.finalScore,
          currentScore: curr.result.finalScore,
          drop,
        });
      }
    }

    return {
      testName,
      evaluations,
      statistics: {
        count,
        passRate,
        averageScore,
        scoreStdDev,
        averageCost,
        totalCost,
      },
      trend: {
        improving,
        degrading,
        stable,
        recentPassRate,
        historicalPassRate: passRate,
      },
      regressions,
    };
  }

  /**
   * Print trend analysis report
   */
  printTrends(analysis: TrendAnalysis): void {
    console.log('\n' + '═'.repeat(80));
    console.log(`📊 TREND ANALYSIS: ${analysis.testName}`);
    console.log('═'.repeat(80));

    console.log('\n📈 Statistics:');
    console.log(`   Total Evaluations: ${analysis.statistics.count}`);
    console.log(
      `   Pass Rate: ${(analysis.statistics.passRate * 100).toFixed(1)}%`,
    );
    console.log(
      `   Average Score: ${analysis.statistics.averageScore.toFixed(1)}/100`,
    );
    console.log(
      `   Score Std Dev: ${analysis.statistics.scoreStdDev.toFixed(1)}`,
    );
    console.log(
      `   Average Cost: $${analysis.statistics.averageCost.toFixed(4)}`,
    );
    console.log(`   Total Cost: $${analysis.statistics.totalCost.toFixed(4)}`);

    console.log('\n📉 Trend:');
    const trendIcon = analysis.trend.improving
      ? '📈'
      : analysis.trend.degrading
        ? '📉'
        : '➡️';
    const trendLabel = analysis.trend.improving
      ? 'IMPROVING'
      : analysis.trend.degrading
        ? 'DEGRADING'
        : 'STABLE';

    console.log(`   ${trendIcon} ${trendLabel}`);
    console.log(
      `   Recent (5): ${(analysis.trend.recentPassRate * 100).toFixed(1)}%`,
    );
    console.log(
      `   Historical: ${(analysis.trend.historicalPassRate * 100).toFixed(1)}%`,
    );

    if (analysis.regressions.length > 0) {
      console.log('\n⚠️  Regressions Detected:');
      for (const regression of analysis.regressions) {
        const date = new Date(regression.timestamp).toISOString().split('T')[0];
        console.log(
          `   ${date}: ${regression.previousScore} → ${regression.currentScore} (↓${regression.drop.toFixed(1)})`,
        );
      }
    }

    console.log('═'.repeat(80) + '\n');
  }

  /**
   * Group evaluations by version and calculate statistics for each
   */
  analyzeByVersion(testName: string): Map<string, VersionStats> {
    const evaluations = this.loadTest(testName);
    const byVersion = new Map<string, EvaluationRecord[]>();

    // Group by version key (package@sha or package@sha-dirty)
    for (const record of evaluations) {
      const versionKey = this.getVersionKey(record.version);
      if (!byVersion.has(versionKey)) {
        byVersion.set(versionKey, []);
      }
      byVersion.get(versionKey)!.push(record);
    }

    // Calculate statistics for each version
    const stats = new Map<string, VersionStats>();
    for (const [versionKey, records] of byVersion) {
      const scores = records.map((r) => r.result.finalScore);
      const passed = records.filter((r) => r.result.passed);
      const costs = records.map((r) =>
        r.result.samples.reduce((sum, s) => sum + s.metadata.cost, 0),
      );

      const count = records.length;
      const passRate = passed.length / count;
      const averageScore = scores.reduce((a, b) => a + b, 0) / count;
      const variance =
        scores.reduce(
          (sum, score) => sum + Math.pow(score - averageScore, 2),
          0,
        ) / count;
      const scoreStdDev = Math.sqrt(variance);
      const totalCost = costs.reduce((a, b) => a + b, 0);

      stats.set(versionKey, {
        version: records[0].version,
        count,
        passRate,
        averageScore,
        scoreStdDev,
        totalCost,
        firstSeen: Math.min(...records.map((r) => r.timestamp)),
        lastSeen: Math.max(...records.map((r) => r.timestamp)),
      });
    }

    return stats;
  }

  /**
   * Compare two versions for a specific test
   */
  compareVersions(
    testName: string,
    baselineVersion: string,
    currentVersion: string,
  ): VersionComparison | null {
    const versionStats = this.analyzeByVersion(testName);

    const baseline = versionStats.get(baselineVersion);
    const current = versionStats.get(currentVersion);

    if (!baseline || !current) {
      return null;
    }

    const deltas = {
      passRate: (current.passRate - baseline.passRate) * 100, // Convert to percentage points
      averageScore: current.averageScore - baseline.averageScore,
      scoreStdDev: current.scoreStdDev - baseline.scoreStdDev,
      cost:
        current.totalCost / current.count - baseline.totalCost / baseline.count,
    };

    const improvement =
      deltas.passRate > 5 || // 5% improvement in pass rate
      (deltas.passRate >= 0 && deltas.averageScore > 5); // Same pass rate but 5+ point score improvement

    const regression =
      deltas.passRate < -5 || // 5% drop in pass rate
      (deltas.passRate <= 0 && deltas.averageScore < -5); // Same/worse pass rate and 5+ point score drop

    return {
      testName,
      baseline,
      current,
      deltas,
      improvement,
      regression,
    };
  }

  /**
   * Print version comparison in a readable format
   */
  printVersionComparison(comparison: VersionComparison): void {
    console.log('\n' + '═'.repeat(80));
    console.log(`📊 VERSION COMPARISON: ${comparison.testName}`);
    console.log('═'.repeat(80));

    const baselineKey = this.getVersionKey(comparison.baseline.version);
    const currentKey = this.getVersionKey(comparison.current.version);

    console.log('\n📌 Baseline Version:');
    console.log(`   ${baselineKey}`);
    console.log(`   Evaluations: ${comparison.baseline.count}`);
    console.log(
      `   Pass Rate: ${(comparison.baseline.passRate * 100).toFixed(1)}%`,
    );
    console.log(
      `   Avg Score: ${comparison.baseline.averageScore.toFixed(1)}/100`,
    );
    console.log(
      `   Avg Cost: $${(comparison.baseline.totalCost / comparison.baseline.count).toFixed(4)}`,
    );

    console.log('\n🆕 Current Version:');
    console.log(`   ${currentKey}`);
    console.log(`   Evaluations: ${comparison.current.count}`);
    console.log(
      `   Pass Rate: ${(comparison.current.passRate * 100).toFixed(1)}%`,
    );
    console.log(
      `   Avg Score: ${comparison.current.averageScore.toFixed(1)}/100`,
    );
    console.log(
      `   Avg Cost: $${(comparison.current.totalCost / comparison.current.count).toFixed(4)}`,
    );

    console.log('\n📈 Performance Delta:');
    const passRateIcon =
      comparison.deltas.passRate > 0
        ? '📈'
        : comparison.deltas.passRate < 0
          ? '📉'
          : '➡️';
    const scoreIcon =
      comparison.deltas.averageScore > 0
        ? '📈'
        : comparison.deltas.averageScore < 0
          ? '📉'
          : '➡️';
    const costIcon =
      comparison.deltas.cost < 0
        ? '💰'
        : comparison.deltas.cost > 0
          ? '💸'
          : '➡️';

    console.log(
      `   ${passRateIcon} Pass Rate: ${comparison.deltas.passRate > 0 ? '+' : ''}${comparison.deltas.passRate.toFixed(1)}%`,
    );
    console.log(
      `   ${scoreIcon} Avg Score: ${comparison.deltas.averageScore > 0 ? '+' : ''}${comparison.deltas.averageScore.toFixed(1)}`,
    );
    console.log(
      `   ${costIcon} Avg Cost: ${comparison.deltas.cost > 0 ? '+' : ''}$${comparison.deltas.cost.toFixed(4)}`,
    );

    console.log('\n🎯 Assessment:');
    if (comparison.improvement) {
      console.log('   ✅ IMPROVEMENT - Performance is better');
    } else if (comparison.regression) {
      console.log('   ⚠️  REGRESSION - Performance has degraded');
    } else {
      console.log('   ➡️  NEUTRAL - No significant change');
    }

    console.log('═'.repeat(80) + '\n');
  }

  /**
   * Get a unique key for a version
   */
  private getVersionKey(version: VersionInfo): string {
    const sha = version.gitShortSha || 'unknown';
    const dirty = version.isDirty ? '-dirty' : '';
    return `${version.package}@${sha}${dirty}`;
  }

  /**
   * Generate summary report across all tests
   */
  generateSummary(): {
    totalTests: number;
    totalEvaluations: number;
    overallPassRate: number;
    totalCost: number;
    byTest: Map<string, { count: number; passRate: number; avgScore: number }>;
  } {
    const records = this.loadAll();
    const byTest = new Map<
      string,
      { count: number; passRate: number; avgScore: number }
    >();

    let totalPassed = 0;
    let totalCost = 0;

    for (const record of records) {
      const testName = record.testName;

      if (!byTest.has(testName)) {
        byTest.set(testName, { count: 0, passRate: 0, avgScore: 0 });
      }

      const stats = byTest.get(testName)!;
      stats.count++;
      stats.avgScore =
        (stats.avgScore * (stats.count - 1) + record.result.finalScore) /
        stats.count;

      if (record.result.passed) {
        totalPassed++;
      }

      totalCost += record.result.samples.reduce(
        (sum, s) => sum + s.metadata.cost,
        0,
      );
    }

    // Calculate pass rates
    for (const [testName, stats] of byTest) {
      const testRecords = records.filter((r) => r.testName === testName);
      const testPassed = testRecords.filter((r) => r.result.passed).length;
      stats.passRate = testPassed / stats.count;
    }

    return {
      totalTests: byTest.size,
      totalEvaluations: records.length,
      overallPassRate: records.length > 0 ? totalPassed / records.length : 0,
      totalCost,
      byTest,
    };
  }

  /**
   * Ensure storage directory exists
   */
  private ensureStorageDir(): void {
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true });
    }
  }
}

/**
 * Global storage instance
 */
let globalStorage: EvaluationStorage | null = null;

/**
 * Get or create global storage instance
 */
export function getEvaluationStorage(): EvaluationStorage {
  if (!globalStorage) {
    globalStorage = new EvaluationStorage();
  }
  return globalStorage;
}
