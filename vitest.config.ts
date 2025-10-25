import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: [
      '**/node_modules/**',
      '**/build/**',
      '**/coverage/**',
      '**/tests/e2e/framework/runner.spec.ts', // LLM-based tests require LiteLLM proxy
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/build/**',
        '**/tests/**',
        '**/coverage/**',
        '**/*.config.*',
        '**/*.d.ts',
      ],
      reportsDirectory: './coverage',
    },
    typecheck: {
      enabled: false,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
