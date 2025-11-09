/**
 * Example: How to use the BMAD Unified Reporter
 *
 * This file demonstrates how to use the new unified testing framework
 * to collect test results and generate JSON reports.
 */

import { describe, it, expect } from 'vitest';
import { reporter } from '../../framework/core/reporter.js';

describe('BMAD Unified Reporter Example', () => {
  // Example 1: Simple unit test
  it('should pass a basic unit test', () => {
    const result = 2 + 2;

    // Track this test
    reporter.addTest('Reporter Examples', {
      id: 'example-1',
      name: 'Basic unit test',
      fullName: 'examples > Basic unit test',
      filePath: __filename,
      type: 'unit',
      status: 'passed',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 5,
      tags: ['example', 'unit'],
      metadata: {},
    });

    expect(result).toBe(4);
  });

  // Example 2: Integration test
  it('should demonstrate integration test tracking', () => {
    const components = ['ComponentA', 'ComponentB'];

    reporter.addTest('Reporter Examples', {
      id: 'example-2',
      name: 'Integration test example',
      fullName: 'examples > Integration test example',
      filePath: __filename,
      type: 'integration',
      status: 'passed',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 15,
      tags: ['example', 'integration'],
      metadata: {},
      components,
      dependencies: ['ServiceA', 'ServiceB'],
    });

    expect(components).toHaveLength(2);
  });

  // Example 3: LLM test with rich metadata
  it('should demonstrate LLM test tracking', () => {
    const llmInteraction = {
      id: 'interaction-1',
      timestamp: new Date().toISOString(),
      prompt: 'Test prompt',
      provider: {
        name: 'litellm',
        model: 'gpt-4.1',
      },
      toolCalls: [
        {
          name: 'bmad',
          arguments: { command: '' },
          result: { success: true },
          timestamp: new Date().toISOString(),
          duration: 100,
        },
      ],
      response: 'Test response',
      duration: 150,
    };

    const xmlValidation = {
      valid: true,
      tags: [
        {
          tag: 'instructions',
          found: true,
          closed: true,
          hasContent: true,
          content: 'Test instructions',
          errors: [],
        },
      ],
      errors: [],
      instructionLeakage: false,
      rawResponse:
        '<instructions>Test</instructions><content>Content</content>',
      timestamp: new Date().toISOString(),
    };

    reporter.addTest('Reporter Examples', {
      id: 'example-3',
      name: 'LLM test with XML validation',
      fullName: 'examples > LLM test with XML validation',
      filePath: __filename,
      type: 'llm',
      status: 'passed',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 200,
      tags: ['example', 'llm', 'xml'],
      metadata: {},
      llmInteractions: [llmInteraction],
      xmlValidation,
      expectedBehavior: 'Should separate instructions from content',
      actualBehavior: 'Successfully separated instructions from content',
    });

    expect(xmlValidation.valid).toBe(true);
  });

  // Example 4: Agent validation test
  it('should demonstrate agent test tracking', () => {
    const agentMetadata = {
      name: 'test-agent',
      module: 'core',
      filePath: '/path/to/agent.md',
      exists: true,
      validFormat: true,
      formatErrors: [],
    };

    reporter.addTest('Reporter Examples', {
      id: 'example-4',
      name: 'Agent validation example',
      fullName: 'examples > Agent validation example',
      filePath: __filename,
      type: 'agent',
      status: 'passed',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 50,
      tags: ['example', 'agent'],
      metadata: {},
      agent: agentMetadata,
      validations: [
        { check: 'File exists', passed: true },
        { check: 'Valid format', passed: true },
        { check: 'Has persona section', passed: true },
      ],
    });

    expect(agentMetadata.exists).toBe(true);
  });

  // Example 5: Failed test
  it('should demonstrate failed test tracking', () => {
    reporter.addTest('Reporter Examples', {
      id: 'example-5',
      name: 'Failed test example',
      fullName: 'examples > Failed test example',
      filePath: __filename,
      type: 'unit',
      status: 'failed',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 10,
      tags: ['example', 'failed'],
      metadata: {},
      error: {
        message: 'Expected 5 but received 6',
        stack: 'Error: Expected 5 but received 6\n    at Object.<anonymous>',
        expected: 5,
        actual: 6,
      },
    });

    // This will actually fail and show in the report
    expect(5).toBe(5); // But we'll pass this to not break the suite
  });
});
