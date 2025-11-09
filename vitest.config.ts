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
      '**/tests/examples/**',
    ],
    testTimeout: 30000, // Default 30s for all tests
    hookTimeout: 30000,
    // Tests can now run in parallel since each writes its own fragment file
    fileParallelism: true,
    // Global setup runs before runner initialization
    globalSetup: ['./tests/framework/setup/global-setup.ts'],
    // Setup files run in test context for each test file
    setupFiles: ['./tests/framework/setup/test-setup.ts'],
    reporters: [
      'default', // Console output
      ['junit', { outputFile: './test-results/junit.xml' }], // JUnit XML for CI/CD
      // Note: allure-vitest@3.4.2 has compatibility issues with vitest@4.0.6
      // Reporter and setup disabled until compatibility is resolved
      // 'allure-vitest/reporter',
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
