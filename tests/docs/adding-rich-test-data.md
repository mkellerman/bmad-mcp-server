# Adding Rich Test Data to HTML Reports

## Overview

The BMAD test framework automatically captures and displays rich interaction data in HTML reports, including:

- 💬 LLM interactions (prompts, responses, tool calls)
- 📋 Agent logs
- 📝 XML validations
- 🤖 Agent metadata
- ✓ Validation checks
- 📋 E2E test steps

## Automatic Test Tracking

The framework **automatically tracks which test is running** via `setupFiles` configuration. You don't need to manually call `setCurrentTest()` - just use the data capture functions!

## How to Add Rich Data to Your Tests

### 1. Import the Test Context Functions

```typescript
import {
  addLLMInteraction,
  addAgentLog,
  setXMLValidation,
  addValidation,
  addStep,
  setBehavior,
} from './tests/framework/core/test-context.js';
```

### 2. Add Data During Your Test

#### LLM Interactions

```typescript
it('should interact with LLM', async () => {
  // Your LLM call...
  const response = await llm.chat('What is 2+2?');

  // Record the interaction (test name is tracked automatically!)
  await addLLMInteraction({
    id: 'interaction-1',
    timestamp: new Date().toISOString(),
    prompt: 'What is 2+2?',
    systemMessage: 'You are a helpful assistant.',
    provider: {
      name: 'openai',
      model: 'gpt-4',
    },
    toolCalls: [
      {
        name: 'calculate',
        arguments: { expression: '2+2' },
        result: 4,
        timestamp: new Date().toISOString(),
        duration: 50,
      },
    ],
    response: 'The answer is 4',
    duration: 150,
    tokenUsage: {
      prompt: 20,
      completion: 10,
      total: 30,
    },
  });

  expect(response).toContain('4');
});
```

#### Agent Logs

```typescript
it('should track agent execution', async () => {
  // Your agent code...

  addAgentLog({
    id: 'log-1',
    agentName: 'bmad-master',
    startTime: new Date().toISOString(),
    entries: [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Agent started',
        source: 'agent-executor',
      },
      {
        timestamp: new Date().toISOString(),
        level: 'debug',
        message: 'Processing workflow',
        context: { workflow: 'party-mode' },
        source: 'workflow-processor',
      },
    ],
  });
});
```

#### XML Validation

```typescript
it('should validate XML structure', () => {
  const xmlResponse =
    '<instructions>Do this</instructions><content>Result</content>';

  setXMLValidation({
    valid: true,
    tags: [
      {
        tag: 'instructions',
        found: true,
        closed: true,
        hasContent: true,
        content: 'Do this',
        errors: [],
      },
      {
        tag: 'content',
        found: true,
        closed: true,
        hasContent: true,
        content: 'Result',
        errors: [],
      },
    ],
    errors: [],
    instructionLeakage: false,
    rawResponse: xmlResponse,
    timestamp: new Date().toISOString(),
  });
});
```

#### E2E Test Steps

```typescript
it('should execute E2E workflow', async () => {
  const startTime = Date.now();

  // Step 1
  await doStep1();
  addStep('Initialize system', 'passed', Date.now() - startTime);

  // Step 2
  await doStep2();
  addStep('Load configuration', 'passed', Date.now() - startTime);

  // Step 3 - failed
  try {
    await doStep3();
    addStep('Process data', 'passed', Date.now() - startTime);
  } catch (error) {
    addStep('Process data', 'failed', Date.now() - startTime, error.message);
  }
});
```

#### Validation Checks

```typescript
it('should validate agent format', () => {
  addValidation('File exists', true);
  addValidation('Has persona section', true);
  addValidation('Has proper YAML frontmatter', false, 'Missing version field');
});
```

#### Expected vs Actual Behavior

```typescript
it('should perform expected behavior', () => {
  setBehavior(
    'Should separate instructions from content',
    'Successfully separated instructions into <instructions> tag',
  );
});
```

## Complete Example

```typescript
import { describe, it, expect } from 'vitest';
import {
  addLLMInteraction,
  addStep,
  setBehavior,
} from '../framework/core/test-context.js';

describe('Complete E2E Example', () => {
  it('should execute full workflow with rich data', async () => {
    // Step 1: Initialize
    const step1Start = Date.now();
    await initializeSystem();
    addStep('Initialize system', 'passed', Date.now() - step1Start);

    // Step 2: Make LLM call
    const step2Start = Date.now();
    const prompt = 'Generate a project plan';
    const response = await callLLM(prompt);

    addLLMInteraction({
      id: 'main-interaction',
      timestamp: new Date().toISOString(),
      prompt: prompt,
      systemMessage: 'You are a project planning assistant',
      provider: { name: 'openai', model: 'gpt-4' },
      toolCalls: [
        {
          name: 'create_file',
          arguments: { path: 'plan.md', content: 'Project plan...' },
          result: { success: true },
          timestamp: new Date().toISOString(),
          duration: 100,
        },
      ],
      response: response,
      duration: 500,
      tokenUsage: { prompt: 50, completion: 200, total: 250 },
    });

    addStep('Call LLM for plan', 'passed', Date.now() - step2Start);

    // Set behavior
    setBehavior(
      'Should generate a valid project plan',
      'Generated plan with timeline and milestones',
    );

    // Assertions
    expect(response).toContain('plan');
  });
});
```

## Viewing the Results

After running tests:

```bash
npm test
```

Open `test-results/test-results.html` in your browser and:

1. Click on any test to expand it
2. See all the rich data organized in color-coded sections:
   - 💬 LLM Interactions (with USER/SYSTEM/TOOL/RESPONSE)
   - 📋 Agent Logs (with timestamps and levels)
   - 📝 XML Validation (tag-by-tag)
   - 📋 Steps (for E2E tests)
   - ✓ Validations (for agent tests)

## Tips

1. **Call context functions during the test** - They must be called while the test is running
2. **Multiple interactions** - You can call `addLLMInteraction()` multiple times for multiple turns
3. **Conditional data** - Only add data that's relevant to your test type
4. **Error handling** - Context functions are safe to call even if the test fails

## See Also

- `tests/examples/test-context-usage.test.ts` - Working example
- `tests/examples/reporter-usage.test.ts` - Direct reporter usage (advanced)
- `tests/framework/core/test-context.ts` - Full API reference
