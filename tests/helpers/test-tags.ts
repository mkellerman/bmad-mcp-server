/**
 * Test tagging helper for categorizing tests
 *
 * Usage:
 * import { test } from './helpers/test-tags';
 *
 * test.unit('my unit test', () => { ... });
 * test.integration('my integration test', () => { ... });
 * test.e2e('my e2e test', () => { ... });
 */

import { it as vitestIt, test as vitestTest } from 'vitest';

export type TestType = 'unit' | 'integration' | 'e2e';

// Store current test type in process.env for reporters to access
let currentTestType: TestType = 'unit';

function setTestType(type: TestType) {
  currentTestType = type;
  // Also set in env for reporters
  if (!process.env.CURRENT_TEST_TYPE) {
    process.env.CURRENT_TEST_TYPE = type;
  }
}

export function getTestType(): TestType {
  return (process.env.CURRENT_TEST_TYPE as TestType) || currentTestType;
}

// Create tagged test functions
function createTaggedTest(type: TestType) {
  return (name: string, fn: () => void | Promise<void>, timeout?: number) => {
    setTestType(type);
    return vitestIt(name, fn, timeout);
  };
}

// Export tagged test functions
export const test = {
  unit: createTaggedTest('unit'),
  integration: createTaggedTest('integration'),
  e2e: createTaggedTest('e2e'),
  // Also expose the base test for flexibility
  ...vitestTest,
};

// Also export 'it' versions
export const it = {
  unit: createTaggedTest('unit'),
  integration: createTaggedTest('integration'),
  e2e: createTaggedTest('e2e'),
  // Also expose the base it for flexibility
  ...vitestIt,
};
