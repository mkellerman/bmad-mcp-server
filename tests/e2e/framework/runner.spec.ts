import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { YAMLTestLoader } from './yaml-loader';
import { LLMClient } from './llm-client';
import { ValidatorRegistry } from './validators';

/**
 * Playwright Test Runner for YAML-based LLM tests
 * Dynamically generates tests from YAML files in test-cases directory
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_CASES_DIR = path.join(__dirname, '../test-cases');

// Load all test suites from YAML files
const testSuites = YAMLTestLoader.loadTestDirectory(TEST_CASES_DIR);

if (testSuites.length === 0) {
  test('No test suites found', () => {
    console.warn(`Warning: No YAML test files found in ${TEST_CASES_DIR}`);
  });
}

// Generate Playwright tests for each suite
for (const suite of testSuites) {
  test.describe(suite.name, () => {
    let llmClient: LLMClient;
    let validators: ValidatorRegistry;

    test.beforeAll(async () => {
      // Initialize LLM client
      llmClient = new LLMClient();

      // Check if LiteLLM proxy is running
      const isHealthy = await llmClient.healthCheck();
      if (!isHealthy) {
        throw new Error(
          '❌ LiteLLM proxy is not running!\n\n' +
            '   Start it with:\n' +
            '   docker-compose up -d\n\n' +
            '   Or check health:\n' +
            '   npm run litellm:docker:health',
        );
      }

      // Initialize validators
      validators = new ValidatorRegistry(llmClient, suite.config.judge_model);

      console.log('\n✅ LiteLLM proxy is healthy');
      console.log(`📦 Suite: ${suite.name}`);
      console.log(`🤖 Model: ${suite.config.llm_model}`);
      console.log(`⚖️  Judge: ${suite.config.judge_model}\n`);
    });

    test.describe(suite.description, () => {
      for (const testCase of suite.tests) {
        test(testCase.name, async () => {
          // Set test timeout
          test.setTimeout(suite.config.timeout || 30000);

          const promptPreview =
            testCase.prompt.length > 80
              ? testCase.prompt.substring(0, 80) + '...'
              : testCase.prompt;
          console.log(`\n🧪 ${testCase.name}`);
          console.log(`   ${promptPreview}`);

          // Execute LLM call
          const startTime = Date.now();
          const completion = await llmClient.chat(
            suite.config.llm_model,
            [{ role: 'user', content: testCase.prompt }],
            { temperature: suite.config.temperature },
          );
          const responseTime = Date.now() - startTime;

          const responseText = llmClient.getResponseText(completion);
          const responsePreview =
            responseText.length > 100
              ? responseText.substring(0, 100) + '...'
              : responseText;
          console.log(`   ✓ Response (${responseTime}ms): ${responsePreview}`);

          // Run all validators
          for (const expectation of testCase.expectations) {
            const result = await validators.validate(responseText, expectation);

            if (result.pass) {
              console.log(`   ✓ ${expectation.type}`);
            } else {
              console.log(`   ✗ ${expectation.type}: ${result.message}`);
              if (result.details) {
                console.log(`     ${JSON.stringify(result.details)}`);
              }
            }

            // Assert validation passed
            expect(result.pass, result.message).toBe(true);
          }
        });
      }
    });
  });
}
