# LLM Helper - Documentation

## Overview

The **LLM Helper** is a testing utility that simplifies LLM interactions and automatically captures all metadata needed for test reporting. It handles communication with LiteLLM proxy, tracks token usage, manages conversation history, and records tool calls.

## Features

- ✅ **Automatic Metadata Capture** - Prompts, responses, timing, and token usage tracked automatically
- ✅ **Conversation Management** - Maintains conversation history across multiple turns
- ✅ **Tool Call Support** - Execute tools and track results
- ✅ **Error Handling** - Captures failed interactions for debugging
- ✅ **Token Tracking** - Get total token usage across all interactions
- ✅ **Zero Boilerplate** - Simple API, complex tracking happens automatically

## Installation

```typescript
import { LLMHelper } from '../framework/helpers/llm-helper.js';
```

## Basic Usage

### Simple Chat

```typescript
const llm = new LLMHelper({
  baseURL: 'http://localhost:4000',
  model: 'gpt-4.1',
  systemMessage: 'You are a helpful assistant.',
});

const response = await llm.chat('What is 2+2?');
console.log(response.content); // "4"

// Get all interactions (automatically captured!)
const interactions = llm.getInteractions();
```

### Quick One-off Request

```typescript
import { quickChat } from '../framework/helpers/llm-helper.js';

const answer = await quickChat('What is the capital of France?');
console.log(answer); // "Paris"
```

### With XML Validation

```typescript
import {
  validateXML,
  extractTagContent,
} from '../framework/helpers/xml-validator.js';

const llm = new LLMHelper({
  baseURL: 'http://localhost:4000',
  model: 'gpt-4.1',
  systemMessage: `Respond using XML:
<instructions>Your reasoning</instructions>
<content>User-facing content</content>`,
});

const response = await llm.chat('Explain quantum physics briefly');

// Validate structure
const validation = validateXML(response.content, ['instructions', 'content']);
if (validation.valid) {
  const userContent = extractTagContent(response.content, 'content');
  console.log(userContent);
}
```

### With Tool Calls

```typescript
const llm = new LLMHelper({
  baseURL: 'http://localhost:4000',
  model: 'gpt-4.1',
  tools: [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get current weather',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' },
          },
        },
      },
    },
  ],
});

const response = await llm.chat('What is the weather in Tokyo?');

if (response.toolCalls.length > 0) {
  const toolCall = response.toolCalls[0];

  // Execute tool
  const result = await llm.executeTool(toolCall, async (args) => {
    return { temp: 25, condition: 'Sunny' };
  });

  // Continue conversation with result
  const continuation = await llm.continueWithToolResult(
    'call_id',
    toolCall.name,
    result,
  );
}
```

## API Reference

### LLMHelper Class

#### Constructor

```typescript
new LLMHelper(config: LLMConfig)
```

**Config Options:**

- `baseURL` (required) - LLM API endpoint (e.g., 'http://localhost:4000')
- `model` (required) - Model name (e.g., 'gpt-4.1', 'claude-3-opus')
- `apiKey` (optional) - API key (may not be needed for local LiteLLM)
- `provider` (optional) - Provider name (defaults to 'litellm')
- `temperature` (optional) - Temperature 0-2 (default: 1)
- `maxTokens` (optional) - Max tokens to generate (default: 4000)
- `systemMessage` (optional) - System message to prepend
- `tools` (optional) - Tools available to the LLM

#### Methods

##### `chat(prompt, options?)`

Send a chat message and get response.

```typescript
const response = await llm.chat('Hello');
// Returns: { content: string, toolCalls: ToolCall[] }
```

**Options:**

- `systemMessage` - Override system message for this request
- `temperature` - Override temperature
- `maxTokens` - Override max tokens
- `tools` - Override tools

##### `executeTool(toolCall, executor)`

Execute a tool call and record the result.

```typescript
const result = await llm.executeTool(toolCall, async (args) => {
  // Your tool execution logic
  return { result: 'data' };
});
```

##### `continueWithToolResult(toolCallId, toolName, result)`

Add tool result to conversation and continue.

```typescript
const continuation = await llm.continueWithToolResult(
  'call_123',
  'get_weather',
  { temp: 25 },
);
```

##### `getInteractions()`

Get all recorded interactions (for test reporter).

```typescript
const interactions = llm.getInteractions();
// Returns: LLMInteraction[]
```

##### `getLastInteraction()`

Get the most recent interaction.

```typescript
const last = llm.getLastInteraction();
// Returns: LLMInteraction | undefined
```

##### `clearInteractions()`

Clear all recorded interactions.

```typescript
llm.clearInteractions();
```

##### `resetConversation()`

Reset conversation history (keeps interactions).

```typescript
llm.resetConversation();
```

##### `getConversationHistory()`

Get conversation messages.

```typescript
const history = llm.getConversationHistory();
// Returns: ChatMessage[]
```

##### `getTotalTokenUsage()`

Get total token usage across all interactions.

```typescript
const usage = llm.getTotalTokenUsage();
// Returns: { prompt: number, completion: number, total: number }
```

##### `getTotalDuration()`

Get total duration of all interactions in milliseconds.

```typescript
const duration = llm.getTotalDuration();
// Returns: number
```

## Testing

The LLM Helper includes comprehensive unit tests:

```bash
npm test -- tests/unit/llm-helper.test.ts
```

**Test Coverage:**

- ✅ 23 unit tests
- ✅ Constructor and configuration
- ✅ Chat requests and responses
- ✅ Tool call handling
- ✅ Interaction tracking
- ✅ Conversation management
- ✅ Token usage tracking
- ✅ Error handling
- ✅ Helper functions

## Examples

See `tests/examples/llm-helper-usage.test.ts` for real-world usage patterns including:

- Simple chat interactions
- XML-structured responses with validation
- Tool calls and execution

## Integration with Reporter

The LLM Helper is designed to work seamlessly with the Unified Test Reporter:

```typescript
const llm = new LLMHelper({
  /* config */
});
const response = await llm.chat('Test prompt');

// Interactions are automatically captured
reporter.addTest('My Suite', {
  // ... other test fields
  llmInteractions: llm.getInteractions(), // ← Just pass this!
});
```

All metadata (prompts, responses, tool calls, timing, tokens) is captured automatically and ready for the reporter.

## Benefits

1. **Automatic Tracking** - No manual metadata capture needed
2. **Type Safety** - Full TypeScript support with proper types
3. **Conversation State** - Maintains context across multiple turns
4. **Tool Support** - Built-in tool call execution and tracking
5. **Error Handling** - Failed interactions are captured for debugging
6. **Token Awareness** - Track usage to optimize costs
7. **Test Integration** - Designed to work with unified test reporter

## Future Enhancements

- [ ] Streaming support
- [ ] Retry logic with exponential backoff
- [ ] Rate limiting
- [ ] Caching layer
- [ ] Multiple provider support (OpenAI, Anthropic, etc.)
- [ ] Batch request support

## Related

- **XML Validator** - Validate XML structure in LLM responses
- **Unified Test Reporter** - Report test results with LLM metadata
- **MCP Helper** - (Coming soon) MCP protocol testing utilities
