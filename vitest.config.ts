import { defineConfig } from 'vitest/config';
import path from 'path';
import type { Reporter } from 'vitest/reporters';

// Inline custom reporter
class BMADReporter implements Reporter {
  // eslint-disable-next-line no-unused-vars
  async onTestRunEnd(
    testModules: readonly any[],
    _unhandledErrors: readonly any[],
    _reason: any,
  ) {
    if (!testModules) return;

    console.log(`\n📋 Capturing ${testModules.length} test modules...`);

    // Dynamically import the reporter
    const { reporter } = await import('./tests/framework/core/reporter.js');

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

    const testResult: any = {
      id: `${path.basename(filepath)}-${task.id}`,
      name: task.name,
      fullName: this.getFullName(task),
      filePath: filepath,
      type: this.inferTestType(filepath),
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
      tags: [this.inferTestType(module.filepath)],
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

  inferTestType(
    filePath: string,
  ): 'unit' | 'integration' | 'e2e' | 'llm' | 'agent' {
    if (!filePath) return 'unit';
    const normalized = filePath.toLowerCase();
    if (normalized.includes('/integration/')) return 'integration';
    if (normalized.includes('/e2e/')) return 'e2e';
    if (normalized.includes('llm')) return 'llm';
    if (normalized.includes('agent')) return 'agent';
    return 'unit';
  }
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: [
      '**/node_modules/**',
      '**/build/**',
      '**/coverage/**',
      '**/tests/e2e/**', // E2E/LLM tests are for manual developer testing only
      '**/tests/examples/**', // Exclude example tests from automated runs
    ],
    // Tests can now run in parallel since each writes its own fragment file
    fileParallelism: true,
    globalSetup: ['./tests/framework/setup/global-setup.ts'],
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
