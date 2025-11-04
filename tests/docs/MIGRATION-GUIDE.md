# Unified Testing Framework - Migration Guide

This guide shows how to migrate existing tests to use the unified testing framework.

## Overview

The unified framework provides:

- **Test Helpers**: LLMHelper, MCPHelper, AgentLogger for auto-capturing metadata
- **Test Builder**: Fluent API for constructing test results
- **Unified Reporter**: Single JSON output for all test types
- **HTML Generator**: Beautiful, interactive HTML reports

## Quick Start

### 1. Install Dependencies

All dependencies are already included in the project:

```typescript
import { createLLMHelper } from '../framework/helpers/llm-helper.js';
import {
  createMCPHelper,
  withMCPHelper,
} from '../framework/helpers/mcp-helper.js';
import { createAgentLogger } from '../framework/helpers/agent-logger.js';
import { TestBuilder } from '../framework/helpers/test-builder.js';
import { reporter } from '../framework/core/reporter.js';
```

### 2. Basic Migration Pattern

**Before (Old Style):**

```typescript
it('should do something', async () => {
  const mcpClient = await createMCPClient();
  const result = await mcpClient.callTool('bmad', { command: '*list-agents' });
  expect(result).toBeDefined();
  await mcpClient.cleanup();
});
```

**After (Unified Framework):**

```typescript
it('should do something', async () => {
  const startTime = Date.now();
  const suiteName = 'My Test Suite';

  try {
    await withMCPHelper({ serverPath: './build/index.js' }, async (mcp) => {
      const result = await mcp.callTool('bmad', { command: '*list-agents' });
      expect(result).toBeDefined();

      // Build and report test result
      const testResult = TestBuilder.integration()
        .name('should do something')
        .filePath(__filename)
        .component('mcp-server')
        .tag('integration')
        .meta('interactions', mcp.getInteractions())
        .passed()
        .duration(Date.now() - startTime)
        .build();

      // IMPORTANT: Use await when calling reporter.addTest()
      await reporter.addTest(suiteName, testResult);
    });
  } catch (error) {
    const testResult = TestBuilder.integration()
      .name('should do something')
      .filePath(__filename)
      .failed(error as Error)
      .duration(Date.now() - startTime)
      .build();

    // IMPORTANT: Use await when calling reporter.addTest()
    await reporter.addTest(suiteName, testResult);
    throw error;
  }
});
```

**Note**: The `reporter.addTest()` method is now async and must be awaited. It writes the test result to a JSON file immediately, allowing tests to run in parallel.

## Helper Examples

### LLM Helper

```typescript
import { createLLMHelper } from '../framework/helpers/llm-helper.js';

const llm = createLLMHelper({
  baseURL: 'http://localhost:4000',
  model: 'gpt-4.1',
  temperature: 0.1,
});

// Simple chat
const response = await llm.chat('Hello');

// Chat with tools
const response = await llm.chat('List agents', {
  tools: [openAITool],
  systemMessage: 'You are helpful',
});

// Get auto-captured interactions
const interactions = llm.getInteractions();
const lastInteraction = llm.getLastInteraction();

// Use in test result
const testResult = TestBuilder.llm()
  .name('my test')
  .interactions(interactions)
  .build();
```

### MCP Helper

```typescript
import {
  createMCPHelper,
  withMCPHelper,
} from '../framework/helpers/mcp-helper.js';

// Option 1: Auto-cleanup with withMCPHelper
await withMCPHelper({ serverPath: './build/index.js' }, async (mcp) => {
  const tools = await mcp.listTools();
  const result = await mcp.callTool('bmad', { command: '*list-agents' });
  const info = await mcp.getServerInfo();

  // Auto-captured metadata
  const interactions = mcp.getInteractions();
  const duration = mcp.getTotalDuration();
});

// Option 2: Manual management
const mcp = createMCPHelper({ serverPath: './build/index.js' });
await mcp.connect();
const result = await mcp.callTool('bmad', { command: 'analyst' });
await mcp.disconnect();
```

### Agent Logger

```typescript
import {
  createAgentLogger,
  logAndCapture,
} from '../framework/helpers/agent-logger.js';

// Option 1: Manual logging
const logger = createAgentLogger();
logger.logWorkflowStart('my-workflow');
logger.logAgentInvoked('bmad-master');
logger.logToolCall('bmad', { command: '*list-agents' });
logger.logInfo('Processing complete');
logger.logWorkflowEnd('my-workflow');
logger.complete();

// Get formatted logs for reporter
const agentLog = logger.formatForReporter();

// Option 2: Auto-capture
const { result, logs, summary } = await logAndCapture(async (log) => {
  log.logAgentInvoked('my-agent');
  log.logInfo('Starting work');
  // ... do work
  return { success: true };
});
```

### Test Builder

```typescript
import { TestBuilder } from '../framework/helpers/test-builder.js';

// Unit test
const unitResult = TestBuilder.unit()
  .name('test name')
  .filePath('/path/to/test.ts')
  .tag('fast')
  .passed()
  .duration(10)
  .build();

// Integration test
const integrationResult = TestBuilder.integration()
  .name('integration test')
  .component('database')
  .component('api')
  .dependencies(['redis', 'postgresql'])
  .passed()
  .duration(200)
  .build();

// E2E test
const e2eResult = TestBuilder.e2e()
  .name('user flow')
  .scenario('Login flow')
  .step('Navigate', 'passed', 100)
  .step('Submit', 'passed', 150)
  .screenshot('login', '/screenshots/login.png')
  .passed()
  .duration(250)
  .build();

// LLM test
const llmResult = TestBuilder.llm()
  .name('llm test')
  .interactions(llmInteractions)
  .xmlValidation(xmlValidation)
  .agentLogs([agentLog])
  .passed()
  .duration(1000)
  .build();

// Agent test
const agentResult = TestBuilder.agent()
  .name('agent validation')
  .agentMetadata(agentMeta)
  .validation('has_role', true)
  .validation('has_context', false, 'Missing context section')
  .agentLogs([agentLog])
  .passed()
  .duration(500)
  .build();
```

## Reporting Results

### Add Results to Reporter

```typescript
import { reporter } from '../framework/core/reporter.js';

// Add individual test
reporter.addTest('Suite Name', testResult);

// Add entire suite
reporter.addSuite({
  id: 'suite-1',
  name: 'My Suite',
  filePath: '/path/to/suite.test.ts',
  tests: [test1, test2, test3],
  duration: 1000,
});
```

### Generate Reports

The reporter automatically saves to `test-results/reports/test-results.json` when tests complete.

To generate HTML:

```bash
npm run generate-html
```

This creates `test-results/reports/test-results.html` with:

- Test results summary
- Clickable tests that expand to show details
- LLM interactions with prompts, responses, tool calls
- MCP interactions
- Agent execution logs
- Metadata and custom fields

## Complete Example

```typescript
import { describe, it, expect } from 'vitest';
import { createLLMHelper } from '../framework/helpers/llm-helper.js';
import { withMCPHelper } from '../framework/helpers/mcp-helper.js';
import { createAgentLogger } from '../framework/helpers/agent-logger.js';
import { TestBuilder } from '../framework/helpers/test-builder.js';
import { reporter } from '../framework/core/reporter.js';

describe('Complete Integration Test', () => {
  it('should test LLM + MCP + Agent logging', async () => {
    const suiteName = 'Complete Integration Test';
    const startTime = Date.now();

    const llm = createLLMHelper({
      baseURL: 'http://localhost:4000',
      model: 'gpt-4.1',
    });
    const logger = createAgentLogger();

    try {
      await withMCPHelper({ serverPath: './build/index.js' }, async (mcp) => {
        logger.logWorkflowStart('test-workflow');
        logger.logAgentInvoked('test-agent');

        // Get tools
        const tools = await mcp.listTools();
        logger.logInfo(`Found ${tools.length} tools`);

        // Call LLM
        const response = await llm.chat('List available agents');
        logger.logInfo('LLM responded');

        // Execute MCP call
        const result = await mcp.callTool('bmad', { command: '*list-agents' });
        logger.logToolCall('bmad', { command: '*list-agents' }, result);

        logger.logWorkflowEnd('test-workflow');
        logger.complete();

        // Build comprehensive test result
        const testResult = TestBuilder.llm()
          .name('Complete Integration')
          .filePath(__filename)
          .tag('llm')
          .tag('mcp')
          .tag('integration')
          .interactions(llm.getInteractions())
          .agentLogs([logger.formatForReporter()])
          .meta('mcpInteractions', mcp.getInteractions())
          .meta('mcpDuration', mcp.getTotalDuration())
          .meta('agentSummary', logger.getSummary())
          .passed()
          .duration(Date.now() - startTime)
          .build();

        reporter.addTest(suiteName, testResult);

        // Assertions
        expect(response).toBeTruthy();
        expect(result).toBeDefined();
      });
    } catch (error) {
      const testResult = TestBuilder.llm()
        .name('Complete Integration')
        .filePath(__filename)
        .failed(error as Error)
        .duration(Date.now() - startTime)
        .build();

      reporter.addTest(suiteName, testResult);
      throw error;
    }
  });
});
```

## Benefits

1. **Auto-Capture**: Helpers automatically capture all interactions, timing, tokens
2. **Type Safety**: TypeScript types for all test results and metadata
3. **Flexible**: Works with existing Vitest tests, just add reporting
4. **Rich Reports**: HTML reports show everything - prompts, responses, logs, timing
5. **Single Source**: One JSON file, one HTML file - easy to archive and share
6. **Incremental**: Migrate tests one at a time, no big-bang rewrite needed

## Migration Checklist

- [ ] Import helpers: LLMHelper, MCPHelper, AgentLogger
- [ ] Import TestBuilder and reporter
- [ ] Wrap test logic in try/catch for error reporting
- [ ] Replace old client creation with helpers
- [ ] Build test result with TestBuilder
- [ ] Add result to reporter with suite name
- [ ] Verify JSON output in test-results/reports/
- [ ] Generate and review HTML report

## Next Steps

1. See `tests/examples/` for working examples
2. Run helper unit tests: `npm test -- tests/unit/*-helper.test.ts`
3. Try generating a report: `npm run generate-html`
4. Review HTML output in browser

The framework is fully functional and ready to use. Start with one test file, verify the output, then migrate others incrementally.
