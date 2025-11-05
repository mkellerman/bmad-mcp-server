/**
 * Custom Vitest Reporter for Unified Testing Framework
 *
 * This reporter automatically captures all Vitest test results and feeds them
 * to the unified reporter without requiring any code changes in test files.
 */

import type { Reporter } from 'vitest/reporters';
import { reporter } from '../core/reporter.js';
import type { TestStatus, TestType } from '../core/types.js';
import path from 'node:path';

export class BMADVitestReporter implements Reporter {
  async onFinished(files?: any[]) {
    console.log(
      `\n📋 BMAD Reporter: Processing ${files?.length || 0} test files...`,
    );

    if (!files) return;

    // Process all test files
    for (const file of files) {
      await this.processFile(file);
    }

    console.log('✅ BMAD Reporter: Finished processing tests\n');
  }

  private async processFile(file: any) {
    // Process all tasks (tests) in the file
    for (const task of file.tasks) {
      await this.processTask(task, file);
    }
  }

  private async processTask(task: any, file: any) {
    // Handle nested describes
    if (task.type === 'suite' && task.tasks) {
      for (const childTask of task.tasks) {
        await this.processTask(childTask, file);
      }
      return;
    }

    // Only process test tasks
    if (task.type !== 'test') return;

    const testResult = this.convertToTestResult(task, file);
    const suiteName = this.getSuiteName(task);

    // Add to unified reporter
    await reporter.addTest(suiteName, testResult);
  }

  private convertToTestResult(task: any, file: any) {
    const status = this.getTestStatus(task);
    const testType = this.inferTestType(file.filepath);
    const duration = task.result?.duration ?? 0;
    const startTime = task.result?.startTime ?? Date.now();

    // Base result compatible with all test types
    const baseResult: any = {
      id: this.generateTestId(task, file),
      name: task.name,
      fullName: this.getFullName(task),
      filePath: file.filepath,
      type: testType,
      status,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(startTime + duration).toISOString(),
      duration,
      tags: this.extractTags(task, file),
      metadata: {},
    };

    // Add error if test failed
    if (status === 'failed' && task.result?.errors?.[0]) {
      const error = task.result.errors[0];
      baseResult.error = {
        message: error.message || String(error),
        stack: error.stack,
        expected: (error as any).expected,
        actual: (error as any).actual,
      };
    }

    return baseResult;
  }

  private getTestStatus(task: any): TestStatus {
    if (task.mode === 'skip') return 'skipped';
    if (task.mode === 'todo') return 'todo';
    if (task.result?.state === 'pass') return 'passed';
    if (task.result?.state === 'fail') return 'failed';
    return 'pending';
  }

  private inferTestType(filePath: string): TestType {
    const normalized = filePath.toLowerCase();

    if (normalized.includes('/integration/')) return 'integration';
    if (normalized.includes('/e2e/')) return 'e2e';
    if (normalized.includes('/unit/')) return 'unit';
    if (normalized.includes('llm')) return 'llm';
    if (normalized.includes('agent')) return 'agent';

    // Default to unit tests
    return 'unit';
  }

  private getSuiteName(task: any): string {
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

  private getFullName(task: any): string {
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

  private generateTestId(task: any, file: any): string {
    // Create a unique ID from file path and task name
    const fileName = path.basename(file.filepath, path.extname(file.filepath));
    const taskName = task.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return `${fileName}-${taskName}-${task.id}`;
  }

  private extractTags(task: any, file: any): string[] {
    const tags: string[] = [];

    // Add type as tag
    tags.push(this.inferTestType(file.filepath));

    // Add file-based tags
    const fileName = path.basename(file.filepath);
    if (fileName.includes('.test.')) tags.push('test');
    if (fileName.includes('.spec.')) tags.push('spec');

    // Add suite-based tags from task meta
    if (task.meta && typeof task.meta === 'object') {
      const meta = task.meta as Record<string, any>;
      if (meta.tags && Array.isArray(meta.tags)) {
        tags.push(...meta.tags);
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  }
}

// Default export for Vitest
export default BMADVitestReporter;
