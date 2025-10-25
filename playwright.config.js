import { defineConfig } from '@playwright/test';
/**
 * Playwright configuration for BMAD MCP Server E2E Testing
 *
 * This config is for LLM-powered integration tests using YAML test cases.
 * Tests communicate with LiteLLM proxy which routes to various LLM providers.
 */
export default defineConfig({
  testDir: './tests/e2e/framework',
  testMatch: '**/*.spec.ts',
  fullyParallel: false, // Run tests sequentially to avoid rate limits
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // Single worker to control LLM API costs
  timeout: 60 * 1000, // 60s per test (LLM calls can be slow)
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
//# sourceMappingURL=playwright.config.js.map
