/**
 * Unit tests for Test Builder helper
 */

import { describe, it, expect } from 'vitest';
import {
  TestBuilder,
  quickUnitTest,
  quickFailedTest,
  quickSkippedTest,
  createLLMInteraction,
  createXMLValidation,
} from '../../framework/helpers/test-builder.js';
import type {
  UnitTestResult,
  IntegrationTestResult,
  E2ETestResult,
  LLMTestResult,
  AgentTestResult,
} from '../../framework/core/types.js';

describe('TestBuilder', () => {
  describe('Unit Test Builder', () => {
    it('should create a basic unit test', () => {
      const result: UnitTestResult = TestBuilder.unit()
        .name('my test')
        .passed()
        .duration(100)
        .build();

      expect(result.type).toBe('unit');
      expect(result.name).toBe('my test');
      expect(result.status).toBe('passed');
      expect(result.duration).toBe(100);
      expect(result.id).toBeDefined();
      expect(result.startTime).toBeDefined();
    });

    it('should create a failed unit test with error', () => {
      const error = new Error('Test failed');
      const result = TestBuilder.unit()
        .name('failing test')
        .failed(error)
        .duration(50)
        .build();

      expect(result.status).toBe('failed');
      expect(result.error?.message).toBe('Test failed');
      expect(result.error?.stack).toBeDefined();
    });

    it('should create a skipped test', () => {
      const result = TestBuilder.unit().name('skipped test').skipped().build();

      expect(result.status).toBe('skipped');
      expect(result.error).toBeUndefined();
    });

    it('should set file path', () => {
      const result = TestBuilder.unit()
        .name('test')
        .filePath('/path/to/test.ts')
        .build();

      expect(result.filePath).toBe('/path/to/test.ts');
    });

    it('should set full name', () => {
      const result = TestBuilder.unit()
        .name('test')
        .fullName('describe block > test')
        .build();

      expect(result.fullName).toBe('describe block > test');
    });

    it('should add tags', () => {
      const result = TestBuilder.unit()
        .name('test')
        .tag('integration')
        .tag('slow')
        .build();

      expect(result.tags).toEqual(['integration', 'slow']);
    });

    it('should set coverage', () => {
      const coverage = {
        lines: { total: 100, covered: 80, pct: 80 },
        statements: { total: 100, covered: 80, pct: 80 },
        functions: { total: 20, covered: 15, pct: 75 },
        branches: { total: 40, covered: 30, pct: 75 },
      };
      const result = TestBuilder.unit().name('test').coverage(coverage).build();

      expect(result.coverage).toEqual(coverage);
    });

    it('should set metadata', () => {
      const result = TestBuilder.unit()
        .name('test')
        .meta('key1', 'value1')
        .meta('key2', 123)
        .build();

      expect(result.metadata.key1).toBe('value1');
      expect(result.metadata.key2).toBe(123);
    });

    it('should throw error if name not set', () => {
      expect(() => {
        TestBuilder.unit().build();
      }).toThrow('Test name is required');
    });
  });

  describe('Integration Test Builder', () => {
    it('should create a basic integration test', () => {
      const result: IntegrationTestResult = TestBuilder.integration()
        .name('integration test')
        .component('database')
        .component('api')
        .passed()
        .duration(200)
        .build();

      expect(result.type).toBe('integration');
      expect(result.components).toEqual(['database', 'api']);
      expect(result.status).toBe('passed');
    });

    it('should set components array', () => {
      const result = TestBuilder.integration()
        .name('test')
        .components(['db', 'cache', 'api'])
        .build();

      expect(result.components).toEqual(['db', 'cache', 'api']);
    });

    it('should set dependencies', () => {
      const result = TestBuilder.integration()
        .name('test')
        .dependencies(['redis', 'postgresql'])
        .build();

      expect(result.dependencies).toEqual(['redis', 'postgresql']);
    });
  });

  describe('E2E Test Builder', () => {
    it('should create a basic E2E test', () => {
      const result: E2ETestResult = TestBuilder.e2e()
        .name('user flow test')
        .scenario('User login flow')
        .step('Navigate to login', 'passed', 100)
        .step('Enter credentials', 'passed', 50)
        .step('Click submit', 'passed', 150)
        .passed()
        .duration(300)
        .build();

      expect(result.type).toBe('e2e');
      expect(result.scenario).toBe('User login flow');
      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].name).toBe('Navigate to login');
      expect(result.steps[0].status).toBe('passed');
    });

    it('should add screenshots', () => {
      const result = TestBuilder.e2e()
        .name('test')
        .scenario('scenario')
        .screenshot('login-page', '/screenshots/login.png')
        .screenshot('dashboard', '/screenshots/dashboard.png')
        .build();

      expect(result.screenshots).toHaveLength(2);
      expect(result.screenshots?.[0].name).toBe('login-page');
      expect(result.screenshots?.[0].path).toBe('/screenshots/login.png');
      expect(result.screenshots?.[0].timestamp).toBeDefined();
    });

    it('should set steps array', () => {
      const steps = [
        { name: 'step1', status: 'passed' as const, duration: 100 },
        {
          name: 'step2',
          status: 'failed' as const,
          duration: 50,
          error: 'Failed',
        },
      ];
      const result = TestBuilder.e2e()
        .name('test')
        .scenario('test')
        .steps(steps)
        .build();

      expect(result.steps).toEqual(steps);
    });
  });

  describe('LLM Test Builder', () => {
    it('should create a basic LLM test', () => {
      const interaction = createLLMInteraction('Test prompt', 'Test response', {
        duration: 1000,
      });

      const result: LLMTestResult = TestBuilder.llm()
        .name('llm test')
        .interaction(interaction)
        .passed()
        .duration(1000)
        .build();

      expect(result.type).toBe('llm');
      expect(result.llmInteractions).toHaveLength(1);
      expect(result.llmInteractions[0].prompt).toBe('Test prompt');
      expect(result.llmInteractions[0].response).toBe('Test response');
    });

    it('should set multiple interactions', () => {
      const interactions = [
        createLLMInteraction('Prompt 1', 'Response 1'),
        createLLMInteraction('Prompt 2', 'Response 2'),
      ];

      const result = TestBuilder.llm()
        .name('test')
        .interactions(interactions)
        .build();

      expect(result.llmInteractions).toHaveLength(2);
    });

    it('should set XML validation', () => {
      const validation = createXMLValidation(true, {
        tags: [
          {
            tag: 'instructions',
            found: true,
            closed: true,
            hasContent: true,
          },
        ],
      });

      const result = TestBuilder.llm()
        .name('test')
        .xmlValidation(validation)
        .build();

      expect(result.xmlValidation?.valid).toBe(true);
      expect(result.xmlValidation?.tags).toHaveLength(1);
    });

    it('should set expected and actual behavior', () => {
      const result = TestBuilder.llm()
        .name('test')
        .expectedBehavior('Should return JSON')
        .actualBehavior('Returned XML')
        .build();

      expect(result.expectedBehavior).toBe('Should return JSON');
      expect(result.actualBehavior).toBe('Returned XML');
    });
  });

  describe('Agent Test Builder', () => {
    it('should create a basic agent test', () => {
      const result: AgentTestResult = TestBuilder.agent()
        .name('agent test')
        .agentMetadata({
          name: 'test-agent',
          module: 'core',
          filePath: '/path/to/agent.md',
          exists: true,
          validFormat: true,
          formatErrors: [],
        })
        .validation('has_role', true)
        .validation('has_context', true)
        .passed()
        .duration(500)
        .build();

      expect(result.type).toBe('agent');
      expect(result.agent.name).toBe('test-agent');
      expect(result.validations).toHaveLength(2);
      expect(result.validations[0].check).toBe('has_role');
      expect(result.validations[0].passed).toBe(true);
    });

    it('should add validations with messages', () => {
      const result = TestBuilder.agent()
        .name('test')
        .validation('check1', true, 'All good')
        .validation('check2', false, 'Missing field')
        .build();

      expect(result.validations[0].message).toBe('All good');
      expect(result.validations[1].passed).toBe(false);
      expect(result.validations[1].message).toBe('Missing field');
    });

    it('should set validations array', () => {
      const validations = [
        { check: 'format', passed: true },
        { check: 'structure', passed: false, message: 'Invalid' },
      ];

      const result = TestBuilder.agent()
        .name('test')
        .validations(validations)
        .build();

      expect(result.validations).toEqual(validations);
    });
  });

  describe('Common Builder Methods', () => {
    it('should set custom ID', () => {
      const result = TestBuilder.unit()
        .id('custom-id-123')
        .name('test')
        .build();

      expect(result.id).toBe('custom-id-123');
    });

    it('should set start and end time', () => {
      const startTime = '2024-01-01T00:00:00.000Z';
      const endTime = '2024-01-01T00:00:01.000Z';

      const result = TestBuilder.unit()
        .name('test')
        .startTime(startTime)
        .endTime(endTime)
        .build();

      expect(result.startTime).toBe(startTime);
      expect(result.endTime).toBe(endTime);
    });

    it('should set error from Error object', () => {
      const error = new Error('Something went wrong');
      const result = TestBuilder.unit().name('test').error(error).build();

      expect(result.error?.message).toBe('Something went wrong');
      expect(result.error?.stack).toBeDefined();
    });

    it('should set error from string', () => {
      const result = TestBuilder.unit()
        .name('test')
        .error('Custom error message')
        .build();

      expect(result.error?.message).toBe('Custom error message');
    });

    it('should set tags array', () => {
      const result = TestBuilder.unit()
        .name('test')
        .tags(['slow', 'flaky', 'critical'])
        .build();

      expect(result.tags).toEqual(['slow', 'flaky', 'critical']);
    });

    it('should set metadata object', () => {
      const metadata = { author: 'test', priority: 1 };
      const result = TestBuilder.unit().name('test').metadata(metadata).build();

      expect(result.metadata).toEqual(metadata);
    });
  });

  describe('Quick Helper Functions', () => {
    it('should create quick passed test', () => {
      const result = quickUnitTest('quick test', 100);

      expect(result.name).toBe('quick test');
      expect(result.status).toBe('passed');
      expect(result.duration).toBe(100);
    });

    it('should create quick failed test with error', () => {
      const result = quickFailedTest('failing test', 'Error occurred', 50);

      expect(result.name).toBe('failing test');
      expect(result.status).toBe('failed');
      expect(result.error?.message).toBe('Error occurred');
      expect(result.duration).toBe(50);
    });

    it('should create quick failed test with Error object', () => {
      const error = new Error('Test error');
      const result = quickFailedTest('test', error);

      expect(result.error?.message).toBe('Test error');
      expect(result.error?.stack).toBeDefined();
    });

    it('should create quick skipped test', () => {
      const result = quickSkippedTest('skipped test');

      expect(result.name).toBe('skipped test');
      expect(result.status).toBe('skipped');
      expect(result.duration).toBe(0);
    });
  });

  describe('createLLMInteraction', () => {
    it('should create basic interaction', () => {
      const interaction = createLLMInteraction('prompt', 'response');

      expect(interaction.prompt).toBe('prompt');
      expect(interaction.response).toBe('response');
      expect(interaction.id).toBeDefined();
      expect(interaction.timestamp).toBeDefined();
      expect(interaction.provider).toBeDefined();
      expect(interaction.toolCalls).toEqual([]);
    });

    it('should create interaction with options', () => {
      const provider = { name: 'anthropic' as const, model: 'claude-3' };
      const toolCalls = [
        {
          name: 'read_file',
          arguments: { path: '/test.ts' },
          timestamp: new Date().toISOString(),
          duration: 100,
        },
      ];
      const tokenUsage = { prompt: 100, completion: 50, total: 150 };

      const interaction = createLLMInteraction('prompt', 'response', {
        provider,
        toolCalls,
        duration: 500,
        tokenUsage,
      });

      expect(interaction.provider).toEqual(provider);
      expect(interaction.toolCalls).toEqual(toolCalls);
      expect(interaction.duration).toBe(500);
      expect(interaction.tokenUsage).toEqual(tokenUsage);
    });
  });

  describe('createXMLValidation', () => {
    it('should create basic validation', () => {
      const validation = createXMLValidation(true);

      expect(validation.valid).toBe(true);
      expect(validation.tags).toEqual([]);
      expect(validation.errors).toEqual([]);
      expect(validation.instructionLeakage).toBe(false);
      expect(validation.timestamp).toBeDefined();
    });

    it('should create validation with tags', () => {
      const validation = createXMLValidation(true, {
        tags: [
          {
            tag: 'instructions',
            found: true,
            closed: true,
            hasContent: true,
            content: 'Instructions content',
          },
          {
            tag: 'content',
            found: true,
            closed: true,
            hasContent: true,
          },
        ],
      });

      expect(validation.tags).toHaveLength(2);
      expect(validation.tags[0].tag).toBe('instructions');
      expect(validation.tags[0].found).toBe(true);
      expect(validation.tags[0].content).toBe('Instructions content');
    });

    it('should create invalid validation with errors', () => {
      const validation = createXMLValidation(false, {
        errors: ['Missing instructions tag', 'Content tag not closed'],
        instructionLeakage: true,
        rawResponse: '<content>Some text</content>',
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toEqual([
        'Missing instructions tag',
        'Content tag not closed',
      ]);
      expect(validation.instructionLeakage).toBe(true);
      expect(validation.rawResponse).toBe('<content>Some text</content>');
    });
  });

  describe('Fluent API Chaining', () => {
    it('should support method chaining', () => {
      const result = TestBuilder.unit()
        .name('chained test')
        .filePath('/test.ts')
        .tag('unit')
        .tag('fast')
        .meta('author', 'tester')
        .meta('priority', 'high')
        .passed()
        .duration(50)
        .build();

      expect(result.name).toBe('chained test');
      expect(result.filePath).toBe('/test.ts');
      expect(result.tags).toEqual(['unit', 'fast']);
      expect(result.metadata.author).toBe('tester');
      expect(result.metadata.priority).toBe('high');
      expect(result.status).toBe('passed');
      expect(result.duration).toBe(50);
    });

    it('should allow overriding values', () => {
      const result = TestBuilder.unit()
        .name('test')
        .passed()
        .duration(100)
        .failed('Something went wrong')
        .duration(200)
        .build();

      expect(result.status).toBe('failed');
      expect(result.duration).toBe(200);
      expect(result.error?.message).toBe('Something went wrong');
    });
  });
});
