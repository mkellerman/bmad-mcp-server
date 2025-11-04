import { defineConfig } from 'vitest/config';
import path from 'path';
import { BMADReporter } from './tests/framework/reporters/bmad-vitest-reporter.js';

// Determine test type from environment variable
const testType = process.env.TEST_TYPE || 'all';

// Configure includes based on test type
const getIncludes = () => {
  switch (testType) {
    case 'unit':
      return ['tests/unit/**/*.test.ts', 'tests/unit/**/*.spec.ts'];
    case 'integration':
      return [
        'tests/integration/**/*.test.ts',
        'tests/integration/**/*.spec.ts',
      ];
    case 'e2e':
      return ['tests/e2e/**/*.test.ts', 'tests/e2e/**/*.spec.ts'];
    default: // 'all'
      return ['tests/**/*.test.ts', 'tests/**/*.spec.ts'];
  }
};

// Configure timeouts based on test type
const getTimeouts = () => {
  switch (testType) {
    case 'unit':
      return { testTimeout: 5000, hookTimeout: 10000 };
    case 'integration':
      return { testTimeout: 10000, hookTimeout: 10000 };
    case 'e2e':
      return { testTimeout: 30000, hookTimeout: 30000 };
    default:
      return { testTimeout: 30000, hookTimeout: 30000 };
  }
};

const timeouts = getTimeouts();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: getIncludes(),
    exclude: [
      '**/node_modules/**',
      '**/build/**',
      '**/coverage/**',
      '**/tests/examples/**',
    ],
    ...timeouts,
    // Tests can now run in parallel since each writes its own fragment file
    fileParallelism: true,
    // Global setup runs before runner initialization
    globalSetup: ['./tests/framework/setup/global-setup.ts'],
    // Setup files run in test context for each test file
    setupFiles: ['./tests/framework/setup/test-setup.ts'],
    reporters: [
      'default', // Keep console output
      new BMADReporter() as any, // Custom inline reporter
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
