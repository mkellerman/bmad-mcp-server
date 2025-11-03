import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for E2E/LLM-based tests that require external LiteLLM proxy.
 * These tests are excluded from CI and are for manual developer testing only.
 *
 * Run with: npm run test:e2e
 * Prerequisites: npm run litellm:docker:start
 */
export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.spec.ts'],
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ['verbose'],
  },
});
