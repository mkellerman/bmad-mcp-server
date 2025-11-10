# Parallel-Safe Copilot CLI Testing with Session Analysis

## Overview

This advanced testing approach addresses two critical requirements:
1. **Parallel Safety**: Multiple test runs don't interfere with each other
2. **Deep Analysis**: Captures and analyzes session data beyond CLI output

## Key Features

### 1. Unique Server IDs
Each test run generates a unique MCP server ID:
```javascript
const serverID = `bmad-test-${randomUUID().substring(0, 8)}`;
// Example: bmad-test-18a6e56e
```

**Benefits:**
- ✅ Parallel test execution safe
- ✅ No config file conflicts
- ✅ Isolated MCP server instances
- ✅ Automatic cleanup per test

### 2. Temporary Config Files
Creates per-test config files:
```bash
.copilot-mcp-bmad-test-18a6e56e.json  # Created
# ... test runs ...
# Automatically deleted
```

### 3. Session JSONL Analysis
Captures rich session data from `~/.copilot/session-state/*.jsonl`:

```javascript
{
  type: 'tool.execution_start',
  data: {
    toolCallId: 'toolu_vrtx_013VyHMvSRr4fFdDA3iTur4E',
    toolName: 'bmad-test-local-bmad',
    arguments: {
      operation: 'execute',
      agent: 'debug',
      module: 'bmm',
      message: 'Please help debug...'
    }
  },
  timestamp: '2025-11-09T21:16:21.939Z'
}
```

## Usage

### Quick Run
```bash
npm run test:copilot-session
```

### Manual Run
```bash
node scripts/test-copilot-cli-session-analysis.mjs
```

### Parallel Execution
```bash
# Safe to run multiple times simultaneously
npm run test:copilot-session &
npm run test:copilot-session &
npm run test:copilot-session &
```

## What Gets Analyzed

### Session Metadata
- Session ID
- Model used (e.g., claude-sonnet-4.5)
- Total duration
- Message count

### Tool Activity
- All tool calls with timestamps
- BMAD-specific tool calls
- Tool execution results
- Success/failure status

### Message Flow
- User prompts
- Assistant responses
- Tool requests
- Tool results

## Output Example

```
════════════════════════════════════════════════════════════════════════════════
📊 Session Analysis
════════════════════════════════════════════════════════════════════════════════

📋 Session Info:
   Session ID: 1a72f923-99ba-4ed0-b159-f7cdeefd1c53
   Model: claude-sonnet-4.5
   Duration: 12.78s

💬 Messages:
   User messages: 1
   Assistant messages: 2

🔧 Tool Activity:
   Total tool calls: 2
   BMAD tool calls: 1
   Completed executions: 2

🎯 BMAD Tool Calls:
   1. bmad-test-local-bmad
      Operation: list
      Agent: N/A
      Module: N/A

📝 All Tool Calls:
   • report_intent: 1x
   • bmad-test-local-bmad: 1x
```

## Validation Checks

The test validates four critical aspects:

1. ✅ **Tool calls were made** - LLM invoked at least one tool
2. ✅ **BMAD tool was called** - Our MCP server was used
3. ✅ **All tools were executed** - No dropped tool calls
4. ✅ **At least one tool succeeded** - Actual functionality worked

Test passes if 3+ checks pass (75% success rate).

## Session File Structure

Copilot stores sessions as JSONL (JSON Lines) in `~/.copilot/session-state/`:

### Event Types

| Event Type | Description |
|------------|-------------|
| `session.start` | Session initialization with metadata |
| `session.model_change` | Model selection (e.g., claude-sonnet-4.5) |
| `user.message` | User's prompt/question |
| `assistant.message` | LLM's response with tool requests |
| `tool.execution_start` | Tool invocation begins |
| `tool.execution_complete` | Tool returns result |

### Example Event Sequence

```jsonl
{"type":"session.start","data":{"sessionId":"...","copilotVersion":"0.0.354"}}
{"type":"user.message","data":{"content":"Use bmad to list agents"}}
{"type":"assistant.message","data":{"toolRequests":[{"name":"bmad","arguments":{...}}]}}
{"type":"tool.execution_start","data":{"toolName":"bmad-test-local-bmad"}}
{"type":"tool.execution_complete","data":{"success":true,"result":{...}}}
```

## Advantages Over CLI Output Parsing

### CLI Output
- ✅ Human-readable
- ❌ Unstructured text
- ❌ Limited detail
- ❌ Hard to parse reliably

### Session JSONL
- ✅ Structured JSON
- ✅ Complete event history
- ✅ Precise timestamps
- ✅ Tool arguments and results
- ✅ Error details
- ✅ Model metadata

## Use Cases

### 1. E2E Testing
```javascript
// Verify complete agent loading flow
const analysis = analyzeSession(events);
assert(analysis.bmadCalls.some(c => c.arguments.agent === 'debug'));
assert(analysis.toolExecutions.every(e => e.success));
```

### 2. Performance Metrics
```javascript
// Track tool execution times
const toolDurations = events
  .filter(e => e.type === 'tool.execution_complete')
  .map(e => calculateDuration(e));
```

### 3. Debugging
```javascript
// Find failed tool calls
const failures = events
  .filter(e => e.type === 'tool.execution_complete' && !e.data.success)
  .map(e => e.data.result);
```

### 4. Quality Assurance
```javascript
// Ensure optimal tool usage
assert(analysis.toolCalls.length <= 5); // Not too many calls
assert(analysis.duration < 30); // Completes quickly
```

## Integration with Test Suite

This approach can be integrated into Vitest E2E tests:

```typescript
// tests/e2e/copilot-cli-session.test.ts
import { CopilotSessionTester } from '../framework/helpers/copilot-session-tester';

test('should load Diana agent via Copilot CLI', async () => {
  const tester = new CopilotSessionTester();
  
  const result = await tester.execute(
    'Have diana help me debug this project'
  );
  
  expect(result.bmadCalls).toHaveLength(1);
  expect(result.bmadCalls[0].arguments.agent).toBe('debug');
  expect(result.allToolsSucceeded).toBe(true);
  expect(result.duration).toBeLessThan(60);
});
```

## Comparison: Test Approaches

| Approach | Parallel Safe | Rich Data | Cost | Setup |
|----------|---------------|-----------|------|-------|
| **copilot-proxy** | ❌ | ❌ | $0 | Easy |
| **OpenAI API** | ✅ | ⚠️ | $$ | Easy |
| **Copilot CLI (basic)** | ❌ | ❌ | $0 | Medium |
| **Copilot CLI + Session** | ✅ | ✅ | $0 | Medium |

## Best Practices

### 1. Always Clean Up
```javascript
finally {
  await removeTempMcpConfig(configPath);
}
```

### 2. Use Unique IDs
```javascript
const serverID = `bmad-test-${randomUUID().substring(0, 8)}`;
```

### 3. Wait for Session File
```javascript
await new Promise(resolve => setTimeout(resolve, 1000));
const sessionFile = await findLatestSessionFile();
```

### 4. Validate Timestamps
```javascript
if (stats.mtime.getTime() >= beforeTime) {
  // This is our session
}
```

### 5. Handle Parse Errors
```javascript
try {
  events.push(JSON.parse(line));
} catch (error) {
  logWarning(`Failed to parse JSONL line`);
}
```

## Troubleshooting

### Session File Not Found
**Cause**: File not written yet or wrong timestamp
**Fix**: Increase wait time or check file timestamps

### Wrong Session Captured
**Cause**: Multiple Copilot instances running
**Fix**: Ensure no other Copilot sessions active during test

### Parse Errors
**Cause**: Malformed JSONL
**Fix**: Add error handling per line, don't fail on single bad line

### Config Conflicts
**Cause**: Old temp configs not cleaned up
**Fix**: Clean up all `.copilot-mcp-*.json` files before test

## Future Enhancements

1. **Streaming Analysis**: Real-time event processing
2. **Metrics Dashboard**: Visualize tool usage patterns
3. **Comparison Tool**: Diff sessions to track changes
4. **Error Analytics**: Aggregate failure patterns
5. **Performance Profiling**: Identify slow tools

## Related Documentation

- [Copilot CLI Tool Calling Test](./copilot-cli-tool-calling-test.md)
- [Copilot CLI Experiment Results](./copilot-cli-experiment-results.md)
- [Decision: Tool Calling Approach](./decision-tool-calling-approach.md)

## License

ISC
