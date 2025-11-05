/**
 * Test Builder Helper
 *
 * Provides a fluent API for building test results for the unified testing framework.
 * Makes it easy to construct test results with minimal boilerplate.
 *
 * Usage:
 * ```typescript
 * const result = TestBuilder.unit()
 *   .name('my test')
 *   .passed()
 *   .duration(100)
 *   .build();
 * ```
 */

import type {
  BaseTestResult,
  UnitTestResult,
  IntegrationTestResult,
  E2ETestResult,
  LLMTestResult,
  AgentTestResult,
  LLMInteraction,
  XMLValidation,
  AgentLog,
  TestStatus,
  AgentMetadata,
} from '../core/types.js';

/**
 * Base test builder with common fields
 */
class BaseTestBuilder<T extends BaseTestResult> {
  protected result: any;

  constructor(type: T['type']) {
    this.result = {
      id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      name: '',
      fullName: '',
      filePath: '',
      status: 'passed' as TestStatus,
      startTime: new Date().toISOString(),
      duration: 0,
      tags: [],
      metadata: {},
    };
  }

  /**
   * Set test name
   */
  name(name: string): this {
    this.result.name = name;
    if (!this.result.fullName) {
      this.result.fullName = name;
    }
    return this;
  }

  /**
   * Set test ID
   */
  id(id: string): this {
    this.result.id = id;
    return this;
  }

  /**
   * Set full name (path + describes + name)
   */
  fullName(fullName: string): this {
    this.result.fullName = fullName;
    return this;
  }

  /**
   * Set file path
   */
  filePath(path: string): this {
    this.result.filePath = path;
    return this;
  }

  /**
   * Set test to passed status
   */
  passed(): this {
    this.result.status = 'passed' as TestStatus;
    delete this.result.error;
    return this;
  }

  /**
   * Set test to failed status with optional error
   */
  failed(error?: string | Error): this {
    this.result.status = 'failed' as TestStatus;
    if (error) {
      this.result.error = {
        message: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      };
    }
    return this;
  }

  /**
   * Set test to skipped status
   */
  skipped(): this {
    this.result.status = 'skipped' as TestStatus;
    delete this.result.error;
    return this;
  }

  /**
   * Set duration in milliseconds
   */
  duration(ms: number): this {
    this.result.duration = ms;
    return this;
  }

  /**
   * Set start time
   */
  startTime(timestamp: string): this {
    this.result.startTime = timestamp;
    return this;
  }

  /**
   * Set end time
   */
  endTime(timestamp: string): this {
    this.result.endTime = timestamp;
    return this;
  }

  /**
   * Set error details
   */
  error(error: string | Error): this {
    this.result.error = {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    };
    return this;
  }

  /**
   * Set tags
   */
  tags(tags: string[]): this {
    this.result.tags = tags;
    return this;
  }

  /**
   * Add a single tag
   */
  tag(tag: string): this {
    if (!this.result.tags) {
      this.result.tags = [];
    }
    this.result.tags.push(tag);
    return this;
  }

  /**
   * Set metadata
   */
  metadata(metadata: Record<string, unknown>): this {
    this.result.metadata = metadata;
    return this;
  }

  /**
   * Set a single metadata field
   */
  meta(key: string, value: unknown): this {
    if (!this.result.metadata) {
      this.result.metadata = {};
    }
    this.result.metadata[key] = value;
    return this;
  }

  /**
   * Build the test result
   */
  build(): T {
    if (!this.result.name) {
      throw new Error('Test name is required');
    }
    return this.result as T;
  }
}

/**
 * Unit test builder
 */
class UnitTestBuilder extends BaseTestBuilder<UnitTestResult> {
  constructor() {
    super('unit');
  }

  /**
   * Set coverage data
   */
  coverage(coverage: UnitTestResult['coverage']): this {
    this.result.coverage = coverage;
    return this;
  }
}

/**
 * Integration test builder
 */
class IntegrationTestBuilder extends BaseTestBuilder<IntegrationTestResult> {
  constructor() {
    super('integration');
    this.result.components = [];
  }

  /**
   * Set components involved
   */
  components(components: string[]): this {
    this.result.components = components;
    return this;
  }

  /**
   * Add a component
   */
  component(component: string): this {
    if (!this.result.components) {
      this.result.components = [];
    }
    this.result.components.push(component);
    return this;
  }

  /**
   * Set dependencies
   */
  dependencies(dependencies: string[]): this {
    this.result.dependencies = dependencies;
    return this;
  }
}

/**
 * E2E test builder
 */
class E2ETestBuilder extends BaseTestBuilder<E2ETestResult> {
  constructor() {
    super('e2e');
    this.result.scenario = '';
    this.result.steps = [];
  }

  /**
   * Set scenario name
   */
  scenario(scenario: string): this {
    this.result.scenario = scenario;
    return this;
  }

  /**
   * Set steps
   */
  steps(steps: E2ETestResult['steps']): this {
    this.result.steps = steps;
    return this;
  }

  /**
   * Add a step
   */
  step(
    name: string,
    status: TestStatus,
    duration: number,
    error?: string,
  ): this {
    if (!this.result.steps) {
      this.result.steps = [];
    }
    this.result.steps.push({ name, status, duration, error });
    return this;
  }

  /**
   * Set screenshots
   */
  screenshots(screenshots: E2ETestResult['screenshots']): this {
    this.result.screenshots = screenshots;
    return this;
  }

  /**
   * Add a screenshot
   */
  screenshot(name: string, path: string): this {
    if (!this.result.screenshots) {
      this.result.screenshots = [];
    }
    this.result.screenshots.push({
      name,
      path,
      timestamp: new Date().toISOString(),
    });
    return this;
  }
}

/**
 * LLM test builder
 */
class LLMTestBuilder extends BaseTestBuilder<LLMTestResult> {
  constructor() {
    super('llm');
    this.result.llmInteractions = [];
  }

  /**
   * Add an LLM interaction
   */
  interaction(interaction: LLMInteraction): this {
    if (!this.result.llmInteractions) {
      this.result.llmInteractions = [];
    }
    this.result.llmInteractions.push(interaction);
    return this;
  }

  /**
   * Set LLM interactions
   */
  interactions(interactions: LLMInteraction[]): this {
    this.result.llmInteractions = interactions;
    return this;
  }

  /**
   * Set XML validation
   */
  xmlValidation(validation: XMLValidation): this {
    this.result.xmlValidation = validation;
    return this;
  }

  /**
   * Set agent logs
   */
  agentLogs(logs: AgentLog[]): this {
    this.result.agentLogs = logs;
    return this;
  }

  /**
   * Set expected behavior
   */
  expectedBehavior(behavior: string): this {
    this.result.expectedBehavior = behavior;
    return this;
  }

  /**
   * Set actual behavior
   */
  actualBehavior(behavior: string): this {
    this.result.actualBehavior = behavior;
    return this;
  }
}

/**
 * Agent test builder
 */
class AgentTestBuilder extends BaseTestBuilder<AgentTestResult> {
  constructor() {
    super('agent');
    this.result.agent = {
      name: '',
      module: '',
      filePath: '',
      exists: false,
      validFormat: false,
      formatErrors: [],
    } as AgentMetadata;
    this.result.validations = [];
  }

  /**
   * Set agent metadata
   */
  agentMetadata(agent: AgentMetadata): this {
    this.result.agent = agent;
    return this;
  }

  /**
   * Set validations
   */
  validations(
    validations: Array<{ check: string; passed: boolean; message?: string }>,
  ): this {
    this.result.validations = validations;
    return this;
  }

  /**
   * Add a validation
   */
  validation(check: string, passed: boolean, message?: string): this {
    if (!this.result.validations) {
      this.result.validations = [];
    }
    this.result.validations.push({ check, passed, message });
    return this;
  }

  /**
   * Set agent logs
   */
  agentLogs(logs: AgentLog[]): this {
    this.result.agentLogs = logs;
    return this;
  }

  /**
   * Add an agent log
   */
  agentLog(log: AgentLog): this {
    if (!this.result.agentLogs) {
      this.result.agentLogs = [];
    }
    this.result.agentLogs.push(log);
    return this;
  }
}

/**
 * Main TestBuilder class with static factory methods
 */
export class TestBuilder {
  /**
   * Create a unit test builder
   */
  static unit(): UnitTestBuilder {
    return new UnitTestBuilder();
  }

  /**
   * Create an integration test builder
   */
  static integration(): IntegrationTestBuilder {
    return new IntegrationTestBuilder();
  }

  /**
   * Create an E2E test builder
   */
  static e2e(): E2ETestBuilder {
    return new E2ETestBuilder();
  }

  /**
   * Create an LLM test builder
   */
  static llm(): LLMTestBuilder {
    return new LLMTestBuilder();
  }

  /**
   * Create an agent test builder
   */
  static agent(): AgentTestBuilder {
    return new AgentTestBuilder();
  }
}

/**
 * Helper to create a quick passed unit test
 */
export function quickUnitTest(
  name: string,
  duration: number = 0,
): UnitTestResult {
  return TestBuilder.unit().name(name).passed().duration(duration).build();
}

/**
 * Helper to create a quick failed unit test
 */
export function quickFailedTest(
  name: string,
  error: string | Error,
  duration: number = 0,
): UnitTestResult {
  return TestBuilder.unit().name(name).failed(error).duration(duration).build();
}

/**
 * Helper to create a quick skipped test
 */
export function quickSkippedTest(name: string): UnitTestResult {
  return TestBuilder.unit().name(name).skipped().duration(0).build();
}

/**
 * Helper to create an LLM interaction
 */
export function createLLMInteraction(
  prompt: string,
  response: string,
  options?: {
    provider?: LLMInteraction['provider'];
    toolCalls?: LLMInteraction['toolCalls'];
    duration?: number;
    tokenUsage?: { prompt: number; completion: number; total: number };
  },
): LLMInteraction {
  return {
    id: `interaction-${Date.now()}`,
    timestamp: new Date().toISOString(),
    prompt,
    response,
    provider: options?.provider ?? { name: 'openai', model: 'gpt-4' },
    toolCalls: options?.toolCalls ?? [],
    duration: options?.duration ?? 0,
    tokenUsage: options?.tokenUsage,
  };
}

/**
 * Helper to create an XML validation result
 */
export function createXMLValidation(
  valid: boolean,
  options?: {
    tags?: Array<{
      tag: string;
      found: boolean;
      closed: boolean;
      hasContent: boolean;
      content?: string;
    }>;
    errors?: string[];
    instructionLeakage?: boolean;
    rawResponse?: string;
  },
): XMLValidation {
  return {
    valid,
    tags:
      options?.tags?.map((tag) => ({
        tag: tag.tag,
        found: tag.found,
        closed: tag.closed,
        hasContent: tag.hasContent,
        content: tag.content,
        errors: [],
      })) ?? [],
    errors: options?.errors ?? [],
    instructionLeakage: options?.instructionLeakage ?? false,
    rawResponse: options?.rawResponse ?? '',
    timestamp: new Date().toISOString(),
  };
}
