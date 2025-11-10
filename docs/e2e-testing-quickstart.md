# E2E Testing Quick Start Guide

A quick reference for running and writing E2E tests with Copilot CLI.

## Running Tests

### Run All E2E Tests
```bash
npm run test:e2e:copilot
```

### Run Standalone Validation
```bash
# Session analysis test (with metrics)
npm run test:copilot-session

# Basic tool calling test
npm run test:copilot-cli
```

### Run Specific Test
```bash
npx vitest run tests/e2e/copilot-cli-agent-loading.test.ts
```

## Writing Tests

### Basic Template

```typescript
import { CopilotSessionHelper } from '../framework/helpers/copilot-session-helper.js';

it('should test something', async () => {
  // Create helper (unique server ID auto-generated)
  const helper = new CopilotSessionHelper();
  
  // Execute Copilot CLI with prompt
  const analysis = await helper.execute({
    prompt: 'Your test prompt here',
    allowAllTools: true,
    timeout: 60000, // 60 seconds
  });
  
  // Display results
  console.log(CopilotSessionHelper.formatAnalysis(analysis));
  
  // Assertions
  expect(analysis.bmadCalls.length).toBeGreaterThan(0);
  expect(analysis.allToolsSucceeded).toBe(true);
}, {
  timeout: 90000, // Test timeout (higher than execution timeout)
});
```

### Common Assertions

```typescript
// Session metadata
expect(analysis.sessionId).toBeDefined();
expect(analysis.model).toBeTruthy();
expect(analysis.durationSeconds).toBeLessThan(60);

// Tool activity
expect(analysis.toolCalls.length).toBeGreaterThan(0);
expect(analysis.bmadCalls.length).toBeGreaterThan(0);

// Validation checks
expect(analysis.validationChecks.toolCallsMade).toBe(true);
expect(analysis.validationChecks.bmadToolCalled).toBe(true);
expect(analysis.validationChecks.allToolsExecuted).toBe(true);
expect(analysis.validationChecks.atLeastOneSuccess).toBe(true);

// Success
expect(analysis.allToolsSucceeded).toBe(true);
```

### Finding Specific Tool Calls

```typescript
// Find agent execution
const agentCall = analysis.bmadCalls.find(
  call => call.arguments.operation === 'execute' &&
          call.arguments.agent === 'debug'
);
expect(agentCall).toBeDefined();

// Find list operation
const listCall = analysis.bmadCalls.find(
  call => call.arguments.operation === 'list'
);
expect(listCall?.arguments.query).toBe('agents');

// Find workflow
const workflowCall = analysis.bmadCalls.find(
  call => call.arguments.workflow === 'prd'
);
```

## Session Analysis Fields

### SessionAnalysis Interface

```typescript
{
  sessionId: string;              // Unique session identifier
  model: string;                  // LLM model used (e.g., "claude-sonnet-4.5")
  startTime: Date;                // Session start time
  endTime: Date;                  // Session end time
  durationSeconds: number;        // Total duration
  userMessages: number;           // Count of user messages
  assistantMessages: number;      // Count of assistant responses
  toolCalls: ToolCall[];          // All tool calls made
  toolExecutions: ToolExecution[]; // All tool executions
  bmadCalls: ToolCall[];          // BMAD-specific tool calls
  allToolsSucceeded: boolean;     // All executions successful?
  validationChecks: {             // 4-point validation
    toolCallsMade: boolean;
    bmadToolCalled: boolean;
    allToolsExecuted: boolean;
    atLeastOneSuccess: boolean;
  };
}
```

### ToolCall Interface

```typescript
{
  toolCallId: string;        // Unique call identifier
  toolName: string;          // Tool name (e.g., "bmad-test-abc123")
  arguments: {               // Tool arguments
    operation: string;       // "list" | "read" | "execute"
    agent?: string;          // Agent name if execute
    workflow?: string;       // Workflow name if execute
    query?: string;          // Query if list
    message?: string;        // Message if execute
    module?: string;         // Module filter
  };
  timestamp: string;         // ISO timestamp
}
```

## Troubleshooting

### Session File Not Found
**Issue**: `No session file found after execution`

**Solutions:**
1. Increase wait time (default 1 second might not be enough)
2. Check no other Copilot instances are running
3. Verify `~/.copilot/session-state/` directory exists

### Config File Conflicts
**Issue**: `EEXIST: file already exists`

**Solutions:**
1. Clean up old temp configs: `rm .copilot-mcp-*.json`
2. Check cleanup is working in your test
3. Ensure unique server IDs are generated

### Tool Calls Not Being Made
**Issue**: `analysis.toolCalls.length === 0`

**Solutions:**
1. Verify prompt is clear and actionable
2. Check `--allow-all-tools` flag is set
3. Increase timeout if command is slow
4. Review session JSONL file manually

### Wrong Session Captured
**Issue**: Test captures session from different run

**Solutions:**
1. Stop all other Copilot instances
2. Increase timestamp precision in file discovery
3. Use unique prompts for debugging

## Best Practices

### 1. Always Set Timeouts
```typescript
const analysis = await helper.execute({
  prompt: '...',
  timeout: 60000, // Execution timeout
});
```

```typescript
it('test', async () => {
  // test code
}, {
  timeout: 90000, // Test timeout (higher than execution)
});
```

### 2. Use Descriptive Prompts
```typescript
// ✅ Good - Clear intent
'Have diana help me debug this project'
'Use bmad to show me all available agents'

// ❌ Bad - Ambiguous
'Do something'
'Help'
```

### 3. Display Analysis Results
```typescript
console.log(CopilotSessionHelper.formatAnalysis(analysis));
```

This helps with debugging and provides visual feedback during test runs.

### 4. Check Multiple Validation Points
```typescript
// Don't just check one thing
expect(analysis.allToolsSucceeded).toBe(true);

// Validate the full picture
expect(analysis.bmadCalls.length).toBeGreaterThan(0);
expect(analysis.validationChecks.bmadToolCalled).toBe(true);
expect(analysis.durationSeconds).toBeLessThan(60);
```

### 5. Handle Optional Fields
```typescript
const agentCall = analysis.bmadCalls.find(/* ... */);

if (agentCall) {
  expect(agentCall.arguments.agent).toBe('debug');
} else {
  // Fallback: might use list/read first
  const listCall = analysis.bmadCalls.find(
    call => call.arguments.operation === 'list'
  );
  expect(listCall).toBeDefined();
}
```

## Performance Expectations

### Typical Metrics

```
Duration: 8-15 seconds
Tool calls: 1-3 calls
BMAD calls: 1-2 calls
User messages: 1
Assistant messages: 1-2
```

### Efficiency Ratings

```typescript
const bmadCallCount = analysis.bmadCalls.length;

const efficiency = 
  bmadCallCount <= 3 ? 'excellent' :
  bmadCallCount <= 5 ? 'good' :
  bmadCallCount <= 8 ? 'acceptable' :
  'needs-optimization';
```

## Example Test Scenarios

### 1. Agent Loading
```typescript
it('should load Diana agent', async () => {
  const helper = new CopilotSessionHelper();
  const analysis = await helper.execute({
    prompt: 'Have diana help me debug this project',
  });
  
  const dianaCall = analysis.bmadCalls.find(
    call => call.arguments.agent === 'debug'
  );
  
  expect(dianaCall).toBeDefined();
});
```

### 2. List Operations
```typescript
it('should list agents', async () => {
  const helper = new CopilotSessionHelper();
  const analysis = await helper.execute({
    prompt: 'Show me all bmad agents',
  });
  
  const listCall = analysis.bmadCalls.find(
    call => call.arguments.operation === 'list'
  );
  
  expect(listCall?.arguments.query).toBe('agents');
});
```

### 3. Complex Workflows
```typescript
it('should handle multi-step workflow', async () => {
  const helper = new CopilotSessionHelper();
  const analysis = await helper.execute({
    prompt: 'List bmad agents, then tell me about the analyst',
  });
  
  expect(analysis.bmadCalls.length).toBeGreaterThanOrEqual(2);
  
  const operations = analysis.bmadCalls.map(c => c.arguments.operation);
  expect(operations).toContain('list');
});
```

## Advanced Usage

### Custom Validation
```typescript
function validateAgentLoad(analysis: SessionAnalysis, agentName: string) {
  const agentCall = analysis.bmadCalls.find(
    call => call.arguments.agent === agentName
  );
  
  return {
    loaded: !!agentCall,
    operation: agentCall?.arguments.operation,
    duration: analysis.durationSeconds,
    efficient: analysis.bmadCalls.length <= 3,
  };
}

const result = validateAgentLoad(analysis, 'debug');
expect(result.loaded).toBe(true);
expect(result.efficient).toBe(true);
```

### Performance Benchmarking
```typescript
const runs: number[] = [];

for (let i = 0; i < 5; i++) {
  const helper = new CopilotSessionHelper();
  const analysis = await helper.execute({
    prompt: 'Load diana',
  });
  runs.push(analysis.durationSeconds);
}

const avg = runs.reduce((a, b) => a + b) / runs.length;
console.log(`Average duration: ${avg.toFixed(2)}s`);
expect(avg).toBeLessThan(20); // Performance SLA
```

## Resources

- **Full Guide**: [docs/copilot-cli-session-analysis.md](./copilot-cli-session-analysis.md)
- **Status**: [docs/e2e-testing-status.md](./e2e-testing-status.md)
- **Test Plan**: [docs/test-plan-diana-loading-e2e.md](./test-plan-diana-loading-e2e.md)
- **Helper Code**: [tests/framework/helpers/copilot-session-helper.ts](../tests/framework/helpers/copilot-session-helper.ts)
- **Examples**: [tests/e2e/copilot-cli-agent-loading.test.ts](../tests/e2e/copilot-cli-agent-loading.test.ts)

## Support

For issues or questions:
1. Check session JSONL files in `~/.copilot/session-state/`
2. Review temp config files: `.copilot-mcp-*.json`
3. Enable debug logging: `COPILOT_DEBUG=1`
4. Consult comprehensive guide for troubleshooting
