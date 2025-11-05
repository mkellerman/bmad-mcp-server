import { defineConfig } from 'vitest/config';
import path from 'path';
import { BMADReporter } from './tests/framework/reporters/bmad-vitest-reporter.js';

/**
 * Vitest configuration for LLM-based E2E tests.
 * Alias for test:e2e - LLM tests are now properly categorized as E2E tests.
 * These tests validate complete workflows with LLM + MCP + tool calling.
 *
 * Run with: npm run test:llm (or npm run test:e2e)
 * Prerequisites: npm run test:litellm-start
 */
export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.spec.ts', 'tests/e2e/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/build/**',
      '**/coverage/**',
      '**/tests/examples/**',
    ],
    globals: true,
    environment: 'node',
    testTimeout: 300000, // 5 minutes for LLM tests
    hookTimeout: 30000,
    fileParallelism: true,
    globalSetup: ['./tests/framework/setup/global-setup.ts'],
    setupFiles: ['./tests/framework/setup/test-setup.ts'],
    reporters: ['default', new BMADReporter() as any],
    outputFile: {
      json: './test-results/llm-results.json',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
