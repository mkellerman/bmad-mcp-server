/**
 * Global Setup for Unified Testing Framework
 *
 * This setup cleans up old test result fragments before tests run
 * and generates the final report after all tests complete.
 */

import { reporter } from '../core/reporter.js';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Global setup - Clean old test result fragments and contexts for this test type
 *
 * Each test type (unit, integration, e2e) has its own subdirectory in .results
 * so they can run independently without interfering with each other.
 */
export async function setup() {
  const testType = process.env.TEST_TYPE || 'unknown';
  const resultsDir = path.join(
    process.cwd(),
    'test-results/.results',
    testType,
  );
  const contextsDir = path.join(
    process.cwd(),
    'test-results/.contexts',
    testType,
  );

  try {
    // Remove old fragments and contexts for this test type only
    await fs.rm(resultsDir, { recursive: true, force: true });
    await fs.rm(contextsDir, { recursive: true, force: true });
    console.log(`🧹 Cleaned old ${testType} test results and contexts`);
  } catch {
    // Directories don't exist, that's fine
  }
}

/**
 * Global teardown - Generate report after all tests complete
 *
 * The report aggregates results from all test types (unit, integration, e2e)
 */
export async function teardown() {
  // Small delay to ensure custom reporter finishes writing fragments
  console.log('\n⏳ Waiting for test reporters to finish...');
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log('\n🔄 Generating unified test report...');
  await reporter.generateReport();
}
