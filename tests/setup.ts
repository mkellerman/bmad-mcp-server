/**
 * Vitest Setup File
 *
 * Automatically captures test results and makes them available to the reporter.
 * This integrates the custom Vitest reporter with the framework reporter.
 */

import { afterEach, beforeEach } from 'vitest';

// Store current test context
let currentTestContext: {
  suiteName: string;
  testName: string;
  testId: string;
  startTime: number;
} | null = null;

/**
 * Before each test - Initialize test context
 */
beforeEach((context) => {
  const task = (context as any).task;
  const suite = task?.suite;

  currentTestContext = {
    suiteName: suite?.name || 'Unknown Suite',
    testName: task?.name || 'Unknown Test',
    testId: task?.id || `test-${Date.now()}`,
    startTime: Date.now(),
  };
});

/**
 * After each test - This will be called by Vitest reporter
 * Tests can also manually call reporter.addTest() with rich data
 */
// eslint-disable-next-line no-unused-vars
afterEach(async (_context) => {
  // The custom Vitest reporter already captures basic test data
  // This is just a hook point for tests that want to add extra metadata
  currentTestContext = null;
});

/**
 * Export a function that tests can use to add custom metadata
 */
export function addTestMetadata(metadata: Record<string, any>) {
  if (!currentTestContext) {
    console.warn('No active test context for metadata');
    return;
  }

  // Store metadata for the current test
  // This could be enhanced to merge with Vitest reporter data
  globalThis.__testMetadata = {
    ...globalThis.__testMetadata,
    [currentTestContext.testId]: {
      ...(globalThis.__testMetadata?.[currentTestContext.testId] || {}),
      ...metadata,
    },
  };
}

// Make it globally available
globalThis.addTestMetadata = addTestMetadata;
