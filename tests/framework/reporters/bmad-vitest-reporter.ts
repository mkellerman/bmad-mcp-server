import type { Reporter } from 'vitest/reporters';
import path from 'path';

/**
 * Custom Vitest reporter that captures test results and enriches them with
 * BMAD-specific context (LLM interactions, agent logs, validation results, etc.)
 */
export class BMADReporter implements Reporter {
  async onTestRunEnd(testModules: readonly any[]) {
    if (!testModules) return;

    console.log(`\n📋 Capturing ${testModules.length} test modules...`);

    // Dynamically import the reporter
    const { reporter } = await import('../core/reporter.js');

    // Process all modules
    let testCount = 0;
    try {
      for (const module of testModules) {
        testCount += await this.processModule(module, reporter);
      }
      console.log(`✅ Captured ${testCount} tests\n`);
    } catch (error) {
      console.error('Error processing modules:', error);
    }
  }

  async processModule(module: any, reporter: any): Promise<number> {
    let count = 0;
    // Process the task recursively
    if (module.task) {
      count = await this.processTask(module.task, module, reporter);
    }
    return count;
  }

  async processTask(task: any, module: any, reporter: any): Promise<number> {
    // Get tasks array
    const children = Array.isArray(task.tasks)
      ? task.tasks
      : task.tasks?.values?.()
        ? Array.from(task.tasks.values())
        : [];

    if (task.type === 'suite' && children.length > 0) {
      let count = 0;
      for (const childTask of children) {
        count += await this.processTask(childTask, module, reporter);
      }
      return count;
    }

    if (task.type !== 'test') return 0;

    // Get filepath from task or module
    const filepath =
      task.filepath || module.filepath || task.file?.filepath || 'unknown';

    const testType = this.inferTestType(filepath);

    const testResult: any = {
      id: `${path.basename(filepath)}-${task.id}`,
      name: task.name,
      fullName: this.getFullName(task),
      filePath: filepath,
      type: testType,
      status:
        task.result?.state === 'pass' || task.result?.state === 'passed'
          ? 'passed'
          : task.result?.state === 'fail' || task.result?.state === 'failed'
            ? 'failed'
            : task.mode === 'skip'
              ? 'skipped'
              : 'pending',
      startTime: new Date(task.result?.startTime || Date.now()).toISOString(),
      endTime: new Date(
        (task.result?.startTime || Date.now()) + (task.result?.duration || 0),
      ).toISOString(),
      duration: task.result?.duration || 0,
      tags: [testType],
      metadata: {
        file: path.basename(filepath),
        line: task.location?.line,
      },
    };

    // Capture console output
    if (task.logs?.length > 0) {
      testResult.console = task.logs.map((log: any) => ({
        type: log.type || 'log',
        content: log.content || String(log),
        time: log.time,
      }));
    }

    // Capture error details with diff
    if (testResult.status === 'failed' && task.result?.errors?.[0]) {
      const error = task.result.errors[0];
      testResult.error = {
        message: error.message || String(error),
        stack: error.stack,
        actual: error.actual !== undefined ? error.actual : null,
        expected: error.expected !== undefined ? error.expected : null,
        diff: error.diff || null,
        operator: error.operator || null,
        showDiff:
          error.showDiff !== false &&
          (error.actual !== undefined || error.expected !== undefined),
      };
    }

    // Capture retry information if available
    if (task.result?.retryCount) {
      testResult.metadata.retries = task.result.retryCount;
    }

    // Capture hooks information if available
    if (task.result?.hooks) {
      testResult.metadata.hooks = task.result.hooks;
    }

    // Try to get rich test context data
    try {
      const { getAllTestContexts } = await import('../core/test-context.js');
      const contexts = await getAllTestContexts();

      // Normalize test name for better matching
      const normalizedTaskName = task.name
        ?.replace(/[^a-z0-9-]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const normalizedFullName = this.getFullName(task)
        ?.replace(/[^a-z0-9-]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Try to find context by test name or full name (with multiple variations)
      const context =
        contexts.get(task.name) ||
        contexts.get(this.getFullName(task)) ||
        contexts.get(testResult.id) ||
        contexts.get(normalizedTaskName) ||
        contexts.get(normalizedFullName);

      if (context) {
        // Merge context data into test result (context data can appear in any test type)
        if (context.llmInteractions) {
          testResult.llmInteractions = context.llmInteractions;

          // Auto-populate metadata from LLM interactions for consistent display
          if (context.llmInteractions.length > 0 && testType === 'llm') {
            const interaction = context.llmInteractions[0];

            // Set scenario if not already present
            if (!testResult.scenario) {
              testResult.scenario = 'LLM interaction test';
            }

            // Create steps from tool calls if not already present
            if (!testResult.steps && interaction.toolCalls?.length > 0) {
              testResult.steps = [
                {
                  name: 'LLM receives user prompt',
                  status: 'passed',
                  duration: 0,
                },
                ...interaction.toolCalls.map((tool: any) => ({
                  name: `Execute ${tool.name}`,
                  status: tool.error ? 'failed' : 'passed',
                  duration: tool.duration || 0,
                })),
                {
                  name: 'LLM generates response',
                  status: 'passed',
                  duration: 0,
                },
              ];
            }

            // Populate metadata with user/tool/system structure
            if (!testResult.metadata.userInput) {
              testResult.metadata.userInput = interaction.prompt;
            }
            if (!testResult.metadata.systemResponse) {
              if (interaction.response && interaction.response.trim()) {
                testResult.metadata.systemResponse = interaction.response;
              } else if (interaction.toolCalls?.length > 0) {
                // If no text response but there are tool calls, show that
                testResult.metadata.systemResponse = `[LLM made ${interaction.toolCalls.length} tool call(s) without text response]`;
              }
            }
            if (
              !testResult.metadata.toolResponse &&
              interaction.toolCalls?.length > 0
            ) {
              const toolCall = interaction.toolCalls[0];
              testResult.metadata.toolResponse =
                toolCall.result || JSON.stringify(toolCall.arguments, null, 2);
            }
            if (!testResult.metadata.testResults) {
              testResult.metadata.testResults = {
                success: testResult.status === 'passed',
                interactions: interaction.toolCalls?.length || 0,
                tokens: interaction.tokenUsage?.total || 0,
              };
            }
          }
        }
        if (context.agentLogs) {
          testResult.agentLogs = context.agentLogs;
        }
        if (context.chatConversation) {
          testResult.chatConversation = context.chatConversation;
        }
        if (context.xmlValidation) {
          testResult.xmlValidation = context.xmlValidation;
        }
        if (context.agent) {
          testResult.agent = context.agent;
        }
        if (context.validations) {
          testResult.validations = context.validations;
        }
        if (context.steps && testType === 'e2e') {
          testResult.steps = context.steps;
        }
        if (context.expectedBehavior) {
          testResult.expectedBehavior = context.expectedBehavior;
        }
        if (context.actualBehavior) {
          testResult.actualBehavior = context.actualBehavior;
        }
        if (context.scenario && testType === 'e2e') {
          testResult.scenario = context.scenario;
        }
        if (context.components && testType === 'integration') {
          testResult.components = context.components;
        }
        if (context.dependencies && testType === 'integration') {
          testResult.dependencies = context.dependencies;
        }

        // Add any other custom metadata
        Object.keys(context).forEach((key) => {
          if (
            ![
              'llmInteractions',
              'chatConversation',
              'agentLogs',
              'xmlValidation',
              'agent',
              'validations',
              'steps',
              'expectedBehavior',
              'actualBehavior',
              'scenario',
              'components',
              'dependencies',
            ].includes(key)
          ) {
            testResult.metadata[key] = context[key];
          }
        });
      }
    } catch (error) {
      // Context not available, skip enrichment
      console.warn('Could not load test context:', error);
    }

    const suiteName = this.getSuiteName(task);
    await reporter.addTest(suiteName, testResult);
    return 1;
  }

  getSuiteName(task: any): string {
    const parts: string[] = [];
    let current: any = task.suite;
    while (current) {
      if (current.name && current.type === 'suite') {
        parts.unshift(current.name);
      }
      current = current.suite;
    }
    return parts.length > 0 ? parts.join(' > ') : 'Default Suite';
  }

  getFullName(task: any): string {
    const parts: string[] = [];
    let current: any = task;
    while (current) {
      if (current.name) {
        parts.unshift(current.name);
      }
      current = current.suite;
    }
    return parts.join(' > ');
  }

  inferTestType(filePath: string): 'unit' | 'integration' | 'e2e' | 'llm' {
    if (!filePath) return 'unit';
    const normalized = filePath.toLowerCase();
    // Match by directory (most specific categorization)
    // Check /llm/ before /e2e/ since some files were moved from e2e
    if (normalized.includes('/llm/')) return 'llm';
    if (normalized.includes('/integration/')) return 'integration';
    if (normalized.includes('/e2e/')) return 'e2e';
    // Everything else is a unit test
    return 'unit';
  }
}
