/**
 * Auto Context Plugin for Vitest
 *
 * This plugin automatically tracks the current test and sets up context
 * so that tests can use addLLMInteraction() without manually calling setCurrentTest().
 */

import type { Plugin } from 'vite';

export function autoContextPlugin(): Plugin {
  return {
    name: 'vitest-auto-context',
    transform(code, id) {
      // Only process test files
      if (!id.includes('test.ts') && !id.includes('spec.ts')) {
        return null;
      }

      // Skip if already importing setCurrentTest
      if (code.includes('setCurrentTest')) {
        return null;
      }

      // Inject automatic context tracking
      const injectedCode = `
import { setCurrentTest as __autoSetCurrentTest } from '../framework/core/test-context.js';

// Auto-wrap it() to set current test
const __originalIt = it;
globalThis.it = function(name, fn, timeout) {
  return __originalIt(name, async (...args) => {
    __autoSetCurrentTest(name);
    return fn(...args);
  }, timeout);
};

// Auto-wrap test() alias
if (typeof test !== 'undefined') {
  const __originalTest = test;
  globalThis.test = function(name, fn, timeout) {
    return __originalTest(name, async (...args) => {
      __autoSetCurrentTest(name);
      return fn(...args);
    }, timeout);
  };
}

${code}
`;

      return {
        code: injectedCode,
        map: null,
      };
    },
  };
}
