import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for LLM-based tests that require external LiteLLM proxy.
 * These tests are excluded from the main test suite to prevent failures when
 * the proxy is not running.
 *
 * Run with: npm run test:llm
 * Prerequisites: npm run litellm:docker:start
 */
export default defineConfig({
  test: {
    include: ['tests/e2e/framework/runner.spec.ts'],
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ['verbose'],
  },
});
