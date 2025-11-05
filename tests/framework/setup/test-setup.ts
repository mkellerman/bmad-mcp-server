/**
 * Test Setup - Runs in test context for all tests
 *
 * This setup file is imported by Vitest for every test file
 * and provides automatic test context tracking.
 */

import { beforeEach, afterEach } from 'vitest';
import { setCurrentTest } from '../core/test-context.js';

/**
 * Automatically set current test name for context tracking
 */
beforeEach((context) => {
  // Get test name from Vitest context
  const testName = context.task.name || 'unknown-test';
  setCurrentTest(testName);
});

/**
 * Clear test name after each test
 */
afterEach(() => {
  setCurrentTest('');
});
