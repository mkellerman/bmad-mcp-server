# BMAD Unified Testing Framework

> A comprehensive testing framework for BMAD MCP Server that handles all test types (unit, integration, E2E, LLM) and produces beautiful, standalone HTML reports.

---

## 🚀 Quick Start

### Running Tests

```bash
# Run all unit and integration tests
npm test

# Run E2E and LLM tests
npm run test:e2e

# Run everything
npm run test:all

# Run specific test type
npm run test:llm      # LLM tests only
npm run test:agents   # Agent validation only
```

### Interactive Prompt Testing

```bash
# Test a prompt and see full interaction
npm run test:prompt -- "Load the analyst agent"

# Save results for later
npm run test:prompt -- "Show agents" --save

# Human-readable output
npm run test:prompt -- "List workflows" --format text

# Get help
npm run test:prompt -- --help
```

### Viewing Results

```bash
# Open HTML report in browser
npm run test:report

# Report is also at: test-results/reports/test-report.html
```

---

## 📊 What You Get

### Beautiful HTML Report

- ✅ **Summary Dashboard** - See pass/fail/skip counts at a glance
- ✅ **Test Type Badges** - Unit, Integration, E2E, LLM clearly marked
- ✅ **Search & Filter** - Find tests by name, status, or type
- ✅ **Collapsible Suites** - Expand/collapse test groups
- ✅ **LLM Interaction Viewer** - See prompts and responses inline
- ✅ **Agent Log Links** - Click to view detailed interaction logs
- ✅ **XML Validation** - See if instructions/content properly separated
- ✅ **Performance Metrics** - Identify slow tests
- ✅ **Failure Details** - Stack traces and error messages
- ✅ **Offline-First** - No server needed, works anywhere

### Structured JSON Output

```json
{
  "summary": {
    "total": 405,
    "passed": 390,
    "failed": 10,
    "skipped": 5,
    "duration": 45230
  },
  "suites": [...]
}
```

---

## 📝 Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe(42);
  });
});
```

### E2E LLM Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { LLMHelper, XMLValidator } from '../framework/helpers';

describe('Agent Loading', () => {
  it('should load analyst agent with proper XML formatting', async () => {
    const llm = new LLMHelper();
    const validator = new XMLValidator();

    // Send prompt to LLM
    const interaction = await llm.sendPrompt('Load the analyst agent');

    // Validate XML structure
    const validation = validator.validate(interaction.toolResponse);
    expect(validation.hasInstructions).toBe(true);
    expect(validation.hasContent).toBe(true);
    expect(validation.noLeakage).toBe(true);

    // Check LLM response
    expect(interaction.response).toContain('Mary');
  });
});
```

### Agent Validation Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { TestBuilder } from '../framework/helpers';

describe('Analyst Agent', () => {
  it('should adopt Mary persona', async () => {
    const test = new TestBuilder()
      .forAgent('analyst')
      .withPrompt('Hi')
      .expectPersona('Mary')
      .expectGreeting()
      .build();

    const result = await test.run();
    expect(result.success).toBe(true);
  });
});
```

---

## 🛠️ Framework Architecture

### Core Components

```
tests/framework/
├── core/
│   ├── types.ts              # TypeScript interfaces
│   ├── reporter.ts           # Vitest custom reporter
│   ├── collector.ts          # Result collection
│   └── html-generator.ts     # HTML report builder
│
├── helpers/
│   ├── llm-helper.ts         # LLM testing utilities
│   ├── mcp-helper.ts         # MCP client wrapper
│   ├── xml-validator.ts      # XML validation
│   ├── agent-logger.ts       # Agent log management
│   └── test-builder.ts       # Fluent test API
│
└── README.md                 # This file
```

### How It Works

1. **Test Execution** - Vitest runs your tests
2. **Result Collection** - Custom reporter captures results
3. **Validation** - XML validator checks responses
4. **Logging** - Agent logger writes interaction logs
5. **Report Generation** - HTML and JSON reports created
6. **Output** - Files written to `test-results/`

---

## 🎨 Test Helpers

### LLMHelper

```typescript
const llm = new LLMHelper();

// Send prompt and get structured response
const interaction = await llm.sendPrompt('Load analyst');
// Returns: { userPrompt, model, toolCalls, response, tokens }

// With custom model
const interaction = await llm.sendPrompt('Load analyst', {
  model: 'gpt-3.5-turbo',
  temperature: 0.1,
});
```

### XMLValidator

```typescript
const validator = new XMLValidator();

// Validate XML structure
const validation = validator.validate(toolResponse);

console.log(validation);
// {
//   hasInstructions: true,
//   hasContent: true,
//   hasContext: false,
//   noLeakage: true,
//   errors: []
// }
```

### AgentLogger

```typescript
const logger = new AgentLogger();

// Write agent interaction log
const logPath = logger.writeLog('analyst', interaction);
// Returns: 'test-results/agent-logs/analyst_2025-11-03_16-00-00.log'

// Logs are automatically linked in HTML report
```

### TestBuilder (Fluent API)

```typescript
const test = new TestBuilder()
  .forAgent('analyst')
  .withPrompt('Hi, I need help with requirements')
  .expectPersona('Mary')
  .expectGreeting()
  .expectMenu()
  .withMinMenuItems(3)
  .build();

const result = await test.run();
```

---

## 🔧 Configuration

### Vitest Config (vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config';
import { BMADUnifiedReporter } from './tests/framework/core/reporter';

export default defineConfig({
  test: {
    reporters: [
      'verbose', // Console output
      new BMADUnifiedReporter(), // HTML + JSON
    ],
  },
});
```

### Environment Variables

```bash
# LLM Configuration
LLM_MODEL=gpt-4.1
LLM_TEMPERATURE=0.1
LLM_API_KEY=sk-test-...

# MCP Configuration
BMAD_ROOT=/path/to/bmad

# Test Configuration
TEST_TIMEOUT=30000
```

---

## 📁 Output Structure

```
test-results/
├── reports/
│   ├── test-report.html          # 🌟 Main HTML report
│   └── test-results.json         # Machine-readable results
│
├── agent-logs/                    # Agent interaction logs
│   ├── analyst_2025-11-03_16-00-00.log
│   ├── architect_2025-11-03_16-01-30.log
│   └── ...
│
└── prompts/                      # Saved prompt interactions
    ├── 2025-11-03_16-00-00.json
    └── ...
```

---

## 🎯 Interactive Prompt Tool

### Usage

```bash
# Basic usage
npm run test:prompt -- "my prompt"

# With options
npm run test:prompt -- "my prompt" --format text --save --model gpt-3.5-turbo
```

### Options

- `--format <json|text|xml>` - Output format (default: json)
- `--save` - Save results to test-results/prompts/
- `--model <model>` - LLM model to use
- `--temperature <temp>` - Temperature (0.0-2.0)
- `--quiet` - Only show errors and summary

### Output Format

**JSON (default):**

```json
{
  "timestamp": "2025-11-03T16:00:00.000Z",
  "userPrompt": "Load the analyst agent",
  "llmModel": "gpt-4.1",
  "toolCalls": [
    {
      "tool": "bmad",
      "arguments": { "command": "analyst" },
      "response": "<instructions>...</instructions><content>...</content>"
    }
  ],
  "systemResponse": "I've loaded Mary, the Business Analyst...",
  "xmlValidation": {
    "hasInstructions": true,
    "hasContent": true,
    "noLeakage": true
  },
  "duration": 1234
}
```

**Text (--format text):**

```
╔══════════════════════════════════════════════════════════════╗
║ Prompt Test Results                                          ║
╚══════════════════════════════════════════════════════════════╝

📝 User Prompt: Load the analyst agent
🤖 LLM Model: gpt-4.1
⏱️  Duration: 1.2s

🔧 Tool Calls (1):
  → bmad(command: "analyst")

📦 Tool Response:
  <instructions>...</instructions>
  <content>...</content>

✅ XML Validation: PASSED
  • Has <instructions>: ✓
  • Has <content>: ✓
  • No leakage: ✓

💬 System Response:
  I've loaded Mary, the Business Analyst...
```

---

## 🐛 Debugging Tests

### View Test Logs

```bash
# Open HTML report and click on failed test
npm run test:report

# Or view agent log directly
cat test-results/agent-logs/analyst_2025-11-03_16-00-00.log
```

### Verbose Output

```bash
# Run with verbose logging
npm test -- --reporter=verbose

# Run single test file
npm test -- tests/unit/my-test.test.ts
```

### Debug LLM Interactions

```bash
# Test prompt to see what LLM receives
npm run test:prompt -- "Load analyst" --format text

# Save for comparison
npm run test:prompt -- "Load analyst" --save
```

---

## 📚 Migration Guide

### From Old Framework

**Before (old BMADTestReporter):**

```typescript
import { BMADTestReporter } from './framework/bmad-reporter';

const reporter = new BMADTestReporter();
reporter.addTest('suite', { ... });
reporter.generateReports();
```

**After (unified framework):**

```typescript
// Just write normal Vitest tests!
import { describe, it, expect } from 'vitest';
import { LLMHelper } from '../framework/helpers';

describe('My Suite', () => {
  it('my test', async () => {
    const llm = new LLMHelper();
    const result = await llm.sendPrompt('test');
    expect(result).toBeDefined();
  });
});

// Reporter automatically handles everything!
```

### YAML Tests

**Before:**

```yaml
# tests/e2e/test-cases/my-test.yaml
name: My Test
prompts:
  - user: Load analyst
    expect: Mary
```

**After:**

```typescript
// tests/e2e/my-test.test.ts
import { TestBuilder } from '../framework/helpers';

it('should load analyst', async () => {
  await new TestBuilder()
    .forAgent('analyst')
    .expectPersona('Mary')
    .build()
    .run();
});
```

---

## 🤝 Contributing

### Adding a New Test Type

1. Extend `BaseTestResult` in `core/types.ts`
2. Update `HTMLGenerator` to handle new type
3. Add helper utilities if needed
4. Create example test

### Adding a New Validator

1. Create validator in `helpers/`
2. Implement validation logic
3. Update `reporter.ts` to use validator
4. Add tests for validator

---

## 📖 Learn More

- [Product Requirements Document](./prd.md)
- [Architecture Guide](./architecture.md)
- [Test Examples](../examples/)
- [Vitest Documentation](https://vitest.dev/)

---

## 🎉 Features

- ✅ **Unified Reporting** - All test types in one place
- ✅ **Beautiful UI** - Standalone HTML reports
- ✅ **LLM-Aware** - Track prompts, responses, tool calls
- ✅ **XML Validation** - Verify proper tag structure
- ✅ **Agent Logging** - Detailed interaction logs
- ✅ **Interactive Testing** - Quick prompt validation
- ✅ **Search & Filter** - Find tests easily
- ✅ **Performance Metrics** - Identify slow tests
- ✅ **Offline-First** - Works without server
- ✅ **Type-Safe** - Full TypeScript support

---

## 📝 License

Same as BMAD MCP Server
