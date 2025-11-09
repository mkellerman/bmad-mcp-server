/**
 * Global Setup for Unified Testing Framework
 *
 * This setup cleans up old test result fragments before tests run
 * and generates the final report after all tests complete.
 *
 * For E2E tests, it ensures LiteLLM proxy is running.
 * For Manual LLM-Evaluated tests, it ensures Copilot Proxy is running.
 */

import { reporter } from '../core/reporter.js';
import { startLiteLLMProxy } from '../../support/litellm-helper.mjs';
import {
  startCopilotProxy,
  stopCopilotProxy,
} from '../../support/copilot-helper.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Global setup - Clean old test result fragments and contexts for this test type
 *
 * Each test type (unit, integration, e2e) has its own subdirectory in .results
 * so they can run independently without interfering with each other.
 */
export async function setup() {
  // Set git auto-update to false for all tests to prevent git lock conflicts
  process.env.BMAD_GIT_AUTO_UPDATE = 'false';

  const testType = process.env.TEST_TYPE || 'default';
  const resultsDir = path.join(
    process.cwd(),
    'test-results/.results',
    testType,
  );

  // Detect if we're running manual/llm-evaluated tests from command line args
  // Only auto-start Copilot Proxy if explicitly requested
  const isRunningEvaluatedTests =
    process.env.RUN_LLM_EVALUATION === 'true' ||
    process.env.AUTO_START_COPILOT === 'true';

  try {
    // Remove old fragments and contexts for this test type only
    await fs.rm(resultsDir, { recursive: true, force: true });
    console.log(`🧹 Cleaned old ${testType} test results and contexts`);
  } catch {
    // Directories don't exist, that's fine
  }

  // For E2E tests, ensure LiteLLM proxy is running
  if (testType === 'e2e' && process.env.SKIP_LLM_TESTS !== 'true') {
    console.log('\n🔍 Checking LiteLLM proxy for E2E tests...');

    // Check if already running
    try {
      const response = await fetch('http://localhost:4000/health/readiness');
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'healthy') {
          console.log('✅ LiteLLM proxy already running\n');
          return;
        }
      }
    } catch {
      // Not running, will try to start
    }

    // Try to start it
    const started = await startLiteLLMProxy();
    if (!started) {
      console.warn(
        '\n⚠️  LiteLLM proxy could not be started automatically.',
        '\n   E2E tests will be skipped.',
        '\n   To run E2E tests, start it manually:',
        '\n   npm run test:litellm-start\n',
      );
    }
  }

  // For Manual LLM-Evaluated tests, ensure Copilot Proxy is running
  // Only if explicitly requested via environment variable
  if (isRunningEvaluatedTests) {
    console.log('\n🔍 Checking Copilot Proxy for LLM evaluation tests...');
    console.log('   Set AUTO_START_COPILOT=true to auto-start proxy\n');

    try {
      // This will throw if authentication fails or server can't start
      await startCopilotProxy();
    } catch (err) {
      const error = err as Error;
      // Warn but don't fail - manual tests should handle unavailability
      console.warn('\n⚠️  WARNING: Copilot Proxy startup failed');
      console.warn('   Error:', error.message);
      console.warn('\n   Manual LLM evaluation tests may be skipped.');
      console.warn('   To enable: npx copilot-proxy --auth\n');
    }
  }
}

/**
 * Global teardown - Generate report after all tests complete
 *
 * The report aggregates results from all test types (unit, integration, e2e)
 */
export async function teardown() {
  // Stop Copilot Proxy if it was started
  try {
    await stopCopilotProxy();
  } catch (err) {
    const error = err as Error;
    console.warn('⚠️  Error stopping Copilot Proxy:', error.message);
  }

  // Small delay to ensure custom reporter finishes writing fragments
  console.log('\n⏳ Waiting for test reporters to finish...');
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log('\n🔄 Generating unified test report...');
  await reporter.generateReport();
}
