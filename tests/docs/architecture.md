# BMAD Unified Testing Framework - Architecture

## 🏛️ System Overview

The BMAD Unified Testing Framework is built on **three core principles**:

1. **Single Source of Truth** - One reporter handles all test types
2. **Layered Architecture** - Clear separation between collection, processing, and presentation
3. **Extensibility** - Easy to add new test types and validators

---

## 📐 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Execution Layer                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Unit   │  │Integration│  │   E2E    │  │   LLM    │   │
│  │  Tests   │  │   Tests   │  │  Tests   │  │  Tests   │   │
│  └────┬─────┘  └────┬──────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │             │           │
└───────┼─────────────┼──────────────┼─────────────┼───────────┘
        │             │              │             │
        └─────────────┴──────────────┴─────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────────┐
        │      Vitest Test Runner (Built-in)      │
        └─────────────────┬───────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│               Collection & Processing Layer                  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         BMADUnifiedReporter (Custom)               │    │
│  │                                                     │    │
│  │  onInit() ────────────────► Initialize             │    │
│  │  onTestBegin() ───────────► Start tracking         │    │
│  │  onTestEnd() ─────────────► Collect results        │    │
│  │  onFinished() ────────────► Generate reports       │    │
│  └────────────────┬───────────────────────────────────┘    │
│                   │                                          │
│                   ├──► TestResultCollector                  │
│                   │    (In-memory storage)                   │
│                   │                                          │
│                   ├──► XMLValidator                          │
│                   │    (Check tags & content)                │
│                   │                                          │
│                   └──► AgentLogger                           │
│                        (Write interaction logs)              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Presentation Layer                          │
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐      │
│  │   HTMLGenerator      │    │   JSONGenerator      │      │
│  │                      │    │                      │      │
│  │  • Summary cards     │    │  • Structured data   │      │
│  │  • Test suites       │    │  • Machine-readable  │      │
│  │  • LLM viewer        │    │  • CI/CD friendly    │      │
│  │  • Agent logs        │    │  • Programmatic      │      │
│  │  • Search/filter     │    │                      │      │
│  └──────────┬───────────┘    └──────────┬───────────┘      │
│             │                           │                   │
│             ▼                           ▼                   │
│    test-report.html            test-results.json           │
│    (Standalone)                (Structured)                 │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Output Layer                             │
│                                                              │
│  test-results/                                              │
│  ├── reports/                                               │
│  │   ├── test-report.html ◄─── Single unified report       │
│  │   └── test-results.json ◄── Machine-readable results    │
│  ├── agent-logs/                                            │
│  │   ├── analyst_interaction.log                           │
│  │   ├── architect_interaction.log                         │
│  │   └── ...                                                │
│  └── prompts/                                               │
│      ├── 2025-11-03_16-00-00.json                          │
│      └── ...                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 Component Architecture

### 1. **Data Layer** (`tests/framework/core/types.ts`)

```typescript
// Base interfaces
interface BaseTestResult {
  id: string;
  name: string;
  suite: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  startTime: number;
  endTime: number;
  error?: TestError;
  metadata?: TestMetadata;
}

// Test type specializations
interface UnitTestResult extends BaseTestResult {
  type: 'unit';
  coverage?: CoverageData;
}

interface E2ETestResult extends BaseTestResult {
  type: 'e2e';
  llmInteraction?: LLMInteraction;
  xmlValidation?: XMLValidation;
  agentLog?: AgentLog;
}

// Supporting types
interface LLMInteraction {
  userPrompt: string;
  model: string;
  toolCalls: ToolCall[];
  response: string;
  tokens?: TokenUsage;
}

interface XMLValidation {
  hasInstructions: boolean;
  hasContent: boolean;
  hasContext?: boolean;
  noLeakage: boolean;
  errors: string[];
}
```

**Design Decisions:**

- ✅ **Inheritance** for common fields (DRY principle)
- ✅ **Type discriminator** (`type` field) for runtime checks
- ✅ **Optional fields** for flexibility
- ✅ **Timestamps** for performance analysis

---

### 2. **Collection Layer** (`tests/framework/core/reporter.ts`)

```typescript
export class BMADUnifiedReporter implements Reporter {
  private collector: TestResultCollector;
  private xmlValidator: XMLValidator;
  private agentLogger: AgentLogger;

  async onInit(ctx: Vitest) {
    // Initialize collectors and utilities
  }

  async onTestBegin(test: Test) {
    // Start tracking test execution
  }

  async onTestEnd(test: Test) {
    // Collect results, validate XML, log interactions
  }

  async onFinished() {
    // Generate HTML and JSON reports
  }
}
```

**Responsibilities:**

- **Hook into Vitest lifecycle** via Reporter interface
- **Collect test results** as they execute
- **Orchestrate validation** (XML, structure, etc.)
- **Trigger report generation** on completion
- **Manage state** across test run

**Design Patterns:**

- **Observer Pattern** - React to test lifecycle events
- **Strategy Pattern** - Different validators for different test types
- **Builder Pattern** - Construct complex reports incrementally

---

### 3. **Processing Layer** (`tests/framework/helpers/`)

#### XMLValidator (`xml-validator.ts`)

```typescript
export class XMLValidator {
  validate(content: string): XMLValidation {
    // Check for <instructions>, <content>, <context> tags
    // Detect instruction leakage in content
    // Verify proper nesting
  }
}
```

#### AgentLogger (`agent-logger.ts`)

```typescript
export class AgentLogger {
  writeLog(agentName: string, interaction: LLMInteraction): string {
    // Format interaction as readable log
    // Save to test-results/agent-logs/
    // Return log file path for linking
  }
}
```

#### LLMHelper (`llm-helper.ts`)

```typescript
export class LLMHelper {
  async sendPrompt(prompt: string): Promise<LLMInteraction> {
    // Connect to LLM
    // Send prompt with MCP tool access
    // Capture full trace
    // Return structured interaction
  }
}
```

**Key Features:**

- ✅ **Composable** - Mix and match helpers
- ✅ **Reusable** - Used by tests and prompt tool
- ✅ **Testable** - Each helper tested independently
- ✅ **Type-safe** - Full TypeScript support

---

### 4. **Presentation Layer** (`tests/framework/core/html-generator.ts`)

```typescript
export class HTMLGenerator {
  generate(report: TestReport): string {
    // Build self-contained HTML
    // Inline CSS for styling
    // Inline JS for interactivity
    // No external dependencies
    return html;
  }
}
```

**Features:**

- **Summary Dashboard** - Pass/fail/skip counts, duration
- **Test Type Badges** - Visual indicators (Unit, E2E, LLM)
- **Collapsible Suites** - Expand/collapse test groups
- **Search & Filter** - Find tests by name, status, type
- **LLM Interaction Viewer** - See prompts and responses
- **Agent Log Links** - Click to view full logs
- **XML Validation Indicators** - Show tag presence
- **Performance Metrics** - Charts for slow tests
- **Failure Details** - Stack traces and error messages

**Technical Approach:**

- **Template Literals** - Generate HTML programmatically
- **Inline Styles** - No external CSS files
- **Vanilla JS** - No framework dependencies
- **Progressive Enhancement** - Works without JS

---

### 5. **CLI Tool** (`scripts/test-prompt.mjs`)

```typescript
// CLI argument parsing
const prompt = process.argv[2];
const format = parseFlags().format || 'json';

// Connect to MCP and LLM
const mcpClient = await createMCPClient();
const llmClient = new LLMClient();

// Execute prompt
const interaction = await llmClient.sendPrompt(prompt, mcpClient);

// Validate XML
const xmlValidation = xmlValidator.validate(interaction.toolResponse);

// Format output
const output = formatOutput(interaction, xmlValidation, format);
console.log(output);
```

**Capabilities:**

- **Quick Testing** - No test file needed
- **Multiple Formats** - JSON, text, XML output
- **Save Results** - Optional persistence
- **XML Validation** - Automatic tag checking
- **Replay** - Can re-run saved prompts

---

## 🔄 Data Flow

### Test Execution Flow

```
1. Developer runs: npm test
2. Vitest discovers test files
3. For each test:
   a. Vitest calls onTestBegin()
   b. Reporter starts tracking
   c. Test executes
   d. Helper utilities capture LLM interactions
   e. XML validator checks responses
   f. Agent logger writes interaction logs
   g. Vitest calls onTestEnd()
   h. Reporter stores result
4. After all tests:
   a. Vitest calls onFinished()
   b. Reporter generates HTML
   c. Reporter generates JSON
   d. Files written to test-results/
```

### Prompt Testing Flow

```
1. Developer runs: npm run test:prompt -- "my prompt"
2. CLI tool parses arguments
3. Connects to MCP server
4. Connects to LLM
5. Sends prompt with tool access
6. LLM calls bmad tool
7. Tool returns XML response
8. CLI captures interaction
9. XML validator checks structure
10. Format output (JSON/text/XML)
11. Print to console
12. Optionally save to file
```

---

## 🗄️ File Structure

```
tests/
├── docs/                          # Documentation
│   ├── prd.md                     # Product requirements
│   ├── architecture.md            # This file
│   └── README.md                  # User guide
│
├── framework/                     # Framework core
│   ├── core/                      # Core components
│   │   ├── types.ts              # Type definitions
│   │   ├── reporter.ts           # Vitest reporter
│   │   ├── collector.ts          # Result collection
│   │   └── html-generator.ts     # HTML builder
│   │
│   ├── helpers/                   # Utilities
│   │   ├── llm-helper.ts         # LLM interactions
│   │   ├── mcp-helper.ts         # MCP client wrapper
│   │   ├── xml-validator.ts      # XML validation
│   │   ├── agent-logger.ts       # Agent logging
│   │   └── test-builder.ts       # Test DSL
│   │
│   └── README.md                  # Framework guide
│
├── examples/                      # Example tests
│   ├── unit.test.ts              # Unit test example
│   ├── integration.test.ts       # Integration example
│   ├── e2e-llm.test.ts          # E2E LLM example
│   └── agent-validation.test.ts  # Agent test example
│
├── unit/                          # Existing unit tests
├── integration/                   # Existing integration tests
├── e2e/                          # E2E tests (migrating)
└── support/                      # Test fixtures & helpers

scripts/
└── test-prompt.mjs               # Interactive CLI tool

test-results/
├── test-results.html             # Unified HTML report
├── test-results.json             # Machine-readable results
├── .fragments/                   # Test fragments (hidden)
├── agent-logs/                   # Agent interaction logs
└── prompts/                      # Saved prompt interactions
```

---

## 🔌 Integration Points

### Vitest Integration

- **Interface**: `Reporter` from `vitest`
- **Methods**: `onInit`, `onTestBegin`, `onTestEnd`, `onFinished`
- **Context**: Access to full test context and results

### MCP Integration

- **Protocol**: Model Context Protocol
- **Connection**: Stdio transport
- **Tools**: bmad tool with command parameter

### LLM Integration

- **Provider**: LiteLLM proxy
- **Models**: gpt-4.1, gpt-3.5-turbo (configurable)
- **API**: OpenAI-compatible

---

## 🛡️ Error Handling

### Strategy

1. **Graceful Degradation** - Partial data better than none
2. **Clear Messages** - Tell user what went wrong and why
3. **Recovery** - Try to continue when possible
4. **Logging** - Capture errors for debugging

### Implementation

```typescript
try {
  const result = await executeTest();
  collector.add(result);
} catch (error) {
  collector.add({
    ...test,
    status: 'failed',
    error: {
      message: error.message,
      stack: error.stack,
      recoverable: isRecoverable(error),
    },
  });
}
```

---

## 🎯 Design Goals

### Achieved

✅ **Single Responsibility** - Each component does one thing well  
✅ **Open/Closed** - Open for extension, closed for modification  
✅ **Liskov Substitution** - Test types are substitutable  
✅ **Interface Segregation** - Focused interfaces  
✅ **Dependency Inversion** - Depend on abstractions

### Trade-offs

⚖️ **Completeness vs Simplicity** - Rich data model vs easy to use  
⚖️ **Flexibility vs Convention** - Customizable vs opinionated  
⚖️ **Performance vs Features** - Fast execution vs rich reporting

**Decision**: Prioritize developer experience and rich reporting

---

## 📈 Scalability Considerations

### Current Scale

- 325 tests (unit + integration)
- 80 E2E tests
- ~400 total tests

### Future Scale (Est.)

- 1000+ unit tests
- 500+ integration tests
- 200+ E2E tests
- 1700+ total tests

### Optimizations

1. **Streaming JSON** - Don't hold all results in memory
2. **Lazy Loading** - Load test details on demand
3. **Pagination** - Paginate large test suites
4. **Caching** - Cache validation results
5. **Compression** - Gzip large reports

---

## 🔒 Security Considerations

### Input Validation

- Sanitize user prompts (prevent injection)
- Validate test names (prevent path traversal)
- Escape HTML in reports (prevent XSS)

### File System

- Write only to test-results/ directory
- Validate file paths before write
- Set appropriate permissions

### API Keys

- Never log API keys
- Use environment variables
- Support key rotation

---

## 🧪 Testing Strategy

### Unit Tests

- Test each component in isolation
- Mock dependencies
- Cover edge cases

### Integration Tests

- Test components working together
- Use real files and directories
- Verify report generation

### E2E Tests

- Test full workflow
- Use real MCP server
- Validate HTML output

---

## 📚 References

- [Vitest Reporter API](https://vitest.dev/guide/reporters.html)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenAI API](https://platform.openai.com/docs/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
