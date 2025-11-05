/**
 * Unified Testing Framework - Test Result Reporter
 *
 * This module provides a unified reporter that collects all test results
 * (unit, integration, E2E, LLM, agent) and generates a JSON report.
 *
 * The JSON output can then be consumed by the HTML generator to create
 * beautiful standalone HTML reports.
 *
 * Key Features:
 * - Single reporter for all test types
 * - Collects rich metadata (LLM interactions, XML validation, agent logs)
 * - Generates comprehensive JSON report
 * - Clean separation between data collection and presentation
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  type TestReport,
  type TestSuite,
  type TestResult,
  type TestSummary,
  type TestEnvironment,
  type TestType,
} from './types.js';
import { generateHTMLReport } from './html-generator.js';

/**
 * BMADUnifiedReporter - Collects test results and generates JSON report
 *
 * Usage in tests:
 * ```ts
 * import { reporter } from './tests/framework/core/reporter.js';
 *
 * // Add test results
 * reporter.addTest('suite-name', {
 *   id: 'test-1',
 *   name: 'my test',
 *   type: 'llm',
 *   status: 'passed',
 *   // ... other fields
 * });
 *
 * // Generate report
 * await reporter.generateReport();
 * ```
 */
export class BMADUnifiedReporter {
  private outputDir: string;
  private testResultsDir: string;
  private jsonFilename: string;
  private startTime: Date | null = null;
  private environment: TestEnvironment | null = null;

  constructor(outputDir = 'test-results', jsonFilename = 'test-results.json') {
    this.outputDir = outputDir;
    // Use TEST_TYPE subdirectory if available (unit, integration, e2e)
    const testType = process.env.TEST_TYPE || 'default';
    this.testResultsDir = path.join(outputDir, '.results', testType);
    this.jsonFilename = jsonFilename;
    this.initialize();
  }

  /**
   * Initialize reporter - ensure output directories exist
   */
  private initialize(): void {
    this.startTime = new Date();
    this.environment = this.captureEnvironment();
  }

  /**
   * Add a test result - writes immediately to individual JSON file
   */
  async addTest(suiteName: string, test: TestResult): Promise<void> {
    // Ensure output directories exist
    await fs.mkdir(this.testResultsDir, { recursive: true });

    // Create a unique filename for this test result (lowercase-kebab)
    const safeTestId = test.id
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const safeSuiteName = suiteName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const filename = `${safeSuiteName}--${safeTestId}.json`;
    const filePath = path.join(this.testResultsDir, filename);

    // Write test result with suite info
    const fragment = {
      suiteName,
      test,
      timestamp: new Date().toISOString(),
    };

    await fs.writeFile(filePath, JSON.stringify(fragment, null, 2), 'utf-8');
  }

  /**
   * Generate JSON report by merging all test fragment files
   */
  async generateReport(): Promise<TestReport> {
    if (!this.startTime || !this.environment) {
      throw new Error('Reporter not initialized properly');
    }

    const endTime = new Date();

    console.log('\n📊 Generating test report...');

    // Load all test fragments
    const fragments = await this.loadAllFragments();

    // Group tests by suite
    const suiteMap = new Map<string, TestSuite>();
    const allTests: TestResult[] = [];

    for (const fragment of fragments) {
      const { suiteName, test } = fragment;
      allTests.push(test);

      // Find or create suite
      let suite = Array.from(suiteMap.values()).find(
        (s) => s.name === suiteName,
      );

      if (!suite) {
        const suiteId = this.generateSuiteId(suiteName);
        suite = {
          id: suiteId,
          name: suiteName,
          filePath: test.filePath,
          type: test.type,
          startTime: test.startTime,
          duration: 0,
          tests: [],
          suites: [],
          tags: [],
        };
        suiteMap.set(suiteId, suite);
      }

      // Add test to suite
      if (!suite.tests.find((t) => t.id === test.id)) {
        suite.tests.push(test);
        suite.duration += test.duration;
      }
    }

    // Build complete test report
    const report: TestReport = {
      version: '1.0.0',
      timestamp: endTime.toISOString(),
      environment: this.environment,
      summary: this.generateSummary(allTests, endTime),
      suites: Array.from(suiteMap.values()),
      tests: allTests,
      metadata: {
        reporter: 'BMADUnifiedReporter v1.0.0',
        format: 'json',
      },
    };

    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });

    // Write JSON report
    await this.writeJSONReport(report);

    // Write HTML report
    await this.writeHTMLReport(report);

    // Print summary
    const duration = endTime.getTime() - this.startTime.getTime();
    this.printSummary(report.summary, duration);

    return report;
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  /**
   * Load all test fragment files from all test types (unit, integration, e2e)
   */
  private async loadAllFragments(): Promise<
    Array<{ suiteName: string; test: TestResult; timestamp: string }>
  > {
    try {
      const resultsBaseDir = path.join(this.outputDir, '.results');
      const allFragments: Array<{
        suiteName: string;
        test: TestResult;
        timestamp: string;
      }> = [];

      // Check if base results directory exists
      try {
        await fs.access(resultsBaseDir);
      } catch {
        // Directory doesn't exist yet
        return [];
      }

      // Read all subdirectories (unit, integration, e2e, etc.)
      const testTypes = await fs.readdir(resultsBaseDir);

      for (const testType of testTypes) {
        const testTypeDir = path.join(resultsBaseDir, testType);

        // Check if it's a directory
        const stat = await fs.stat(testTypeDir);
        if (!stat.isDirectory()) continue;

        // Read all JSON files in this test type directory
        const files = await fs.readdir(testTypeDir);
        // Filter out timestamped aggregate files and archived files
        const jsonFiles = files.filter((f) => {
          if (!f.endsWith('.json')) return false;
          // Skip files matching pattern: <type>-results.json or <type>-<timestamp>-results.json
          if (/-results\.json$/.test(f)) return false;
          return true;
        });

        const fragments = await Promise.all(
          jsonFiles.map(async (file) => {
            const filePath = path.join(testTypeDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content);
          }),
        );

        allFragments.push(...fragments);
      }

      return allFragments;
    } catch {
      return [];
    }
  }

  /**
   * Generate unique suite ID from name
   */
  private generateSuiteId(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Capture test environment information
   */
  private captureEnvironment(): TestEnvironment {
    return {
      nodeVersion: process.version,
      testRunner: `vitest@${this.getVitestVersion()}`,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
      env: this.filterEnvVars(process.env),
      branch: process.env.GIT_BRANCH,
      commit: process.env.GIT_COMMIT,
    };
  }

  /**
   * Get Vitest version from package.json
   */
  private getVitestVersion(): string {
    try {
      const pkg = require('../../../package.json');
      return pkg.devDependencies?.vitest ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Filter environment variables for security
   */
  private filterEnvVars(env: typeof process.env): Record<string, string> {
    const safe: Record<string, string> = {};
    const allowedKeys = [
      'NODE_ENV',
      'CI',
      'GITHUB_ACTIONS',
      'GITHUB_SHA',
      'GITHUB_REF',
      'VITEST',
      'BMAD_ROOT',
    ];

    for (const key of allowedKeys) {
      if (env[key]) {
        safe[key] = env[key] as string;
      }
    }

    return safe;
  }

  /**
   * Generate test summary statistics
   */
  private generateSummary(tests: TestResult[], endTime: Date): TestSummary {
    const startTime = this.startTime!;
    const duration = endTime.getTime() - startTime.getTime();

    const total = tests.length;
    const passed = tests.filter((t) => t.status === 'passed').length;
    const failed = tests.filter((t) => t.status === 'failed').length;
    const skipped = tests.filter((t) => t.status === 'skipped').length;
    const pending = tests.filter((t) => t.status === 'pending').length;
    const todo = tests.filter((t) => t.status === 'todo').length;

    // Calculate by type
    const byType: Record<TestType, any> = {} as any;
    const types: TestType[] = ['unit', 'integration', 'e2e', 'llm'];

    for (const type of types) {
      const typeTests = tests.filter((t) => t.type === type);
      byType[type] = {
        total: typeTests.length,
        passed: typeTests.filter((t) => t.status === 'passed').length,
        failed: typeTests.filter((t) => t.status === 'failed').length,
        skipped: typeTests.filter((t) => t.status === 'skipped').length,
        pending: typeTests.filter((t) => t.status === 'pending').length,
        todo: typeTests.filter((t) => t.status === 'todo').length,
        duration: typeTests.reduce((sum, t) => sum + t.duration, 0),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        successRate:
          typeTests.length > 0
            ? (typeTests.filter((t) => t.status === 'passed').length /
                typeTests.length) *
              100
            : 0,
      };
    }

    return {
      total,
      passed,
      failed,
      skipped,
      pending,
      todo,
      duration,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      successRate: total > 0 ? (passed / total) * 100 : 0,
      byType,
    };
  }

  /**
   * Write JSON report to disk
   * - Writes {type}-results.json to .results/ directory (current)
   * - Writes {type}-{timestamp}-results.json to .results/archive/ (history)
   * - Writes aggregated test-results.json to root test-results/
   * - Individual fragment files are kept in .results/{type}/ for debugging
   */
  private async writeJSONReport(report: TestReport): Promise<void> {
    const json = JSON.stringify(report, null, 2);
    const testType = process.env.TEST_TYPE || 'default';

    // 1. Write current results to .results/{type}-results.json
    const resultsDir = path.join(this.outputDir, '.results');
    await fs.mkdir(resultsDir, { recursive: true });
    const currentResultsPath = path.join(
      resultsDir,
      `${testType}-results.json`,
    );
    await fs.writeFile(currentResultsPath, json, 'utf-8');
    console.log(`   ✅ Current results: ${currentResultsPath}`);

    // 2. Archive to .results/archive/{type}-{timestamp}-results.json
    const archiveDir = path.join(resultsDir, 'archive');
    await fs.mkdir(archiveDir, { recursive: true });
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19); // YYYY-MM-DDTHH-MM-SS
    const archivePath = path.join(
      archiveDir,
      `${testType}-${timestamp}-results.json`,
    );
    await fs.writeFile(archivePath, json, 'utf-8');
    console.log(`   ✅ Archived: ${archivePath}`);

    // 3. Write to root test-results/ directory (for aggregation)
    const jsonPath = path.join(this.outputDir, this.jsonFilename);
    await fs.writeFile(jsonPath, json, 'utf-8');
    console.log(`   ✅ Root report: ${jsonPath}`);
  }

  /**
   * Write HTML report to disk
   */
  private async writeHTMLReport(report: TestReport): Promise<void> {
    const htmlFilename = this.jsonFilename.replace('.json', '.html');
    const htmlPath = path.join(this.outputDir, htmlFilename);
    const html = generateHTMLReport(report);
    await fs.writeFile(htmlPath, html, 'utf-8');
    console.log(`   ✅ HTML report: ${htmlPath}`);
  }

  /**
   * Print summary to console
   */
  private printSummary(summary: TestSummary, duration: number): void {
    const { total, passed, failed, skipped, successRate } = summary;

    console.log('\n📈 Test Summary');
    console.log('   ═══════════════════════════════════════');
    console.log(`   Total:    ${total}`);
    console.log(`   ✅ Passed:  ${passed}`);
    console.log(`   ❌ Failed:  ${failed}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📊 Success: ${successRate.toFixed(1)}%`);
    console.log(`   ⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log('   ═══════════════════════════════════════\n');

    // Print by type if multiple types
    const types = Object.entries(summary.byType).filter(
      ([, stats]) => stats.total > 0,
    );
    if (types.length > 1) {
      console.log('   By Type:');
      for (const [type, stats] of types) {
        console.log(
          `     ${type}: ${stats.passed}/${stats.total} (${stats.successRate.toFixed(1)}%)`,
        );
      }
      console.log('');
    }
  }
}

/**
 * Singleton instance for easy import
 */
export const reporter = new BMADUnifiedReporter();
