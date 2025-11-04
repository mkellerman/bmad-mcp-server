/**
 * Global Setup for Unified Testing Framework
 *
 * This setup cleans up old test fragments before tests run
 * and generates the final report after all tests complete.
 */

import { reporter } from '../core/reporter.js';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Global setup - Clean old test fragments
 */
export async function setup() {
  const fragmentsDir = path.join(
    process.cwd(),
    'test-results/reports/test-fragments',
  );

  try {
    // Remove old fragments
    await fs.rm(fragmentsDir, { recursive: true, force: true });
    console.log('🧹 Cleaned old test fragments');
  } catch {
    // Directory doesn't exist, that's fine
  }
}

/**
 * Global teardown - Generate report after all tests complete
 */
export async function teardown() {
  console.log('\n🔄 Generating unified test report...');
  await reporter.generateReport();
}
