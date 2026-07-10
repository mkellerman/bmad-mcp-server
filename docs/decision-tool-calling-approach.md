# Decision: Tool Calling Test Approach

## Date
2025-11-09

## Context
After systematic research, we've identified that GitHub Copilot's Chat Completions API does not support OpenAI-style function calling, despite being OpenAI-compatible for basic chat.

## Research Findings

### 1. GPT-4o Function Calling Support
✅ **CONFIRMED**: gpt-4o fully supports function calling per OpenAI documentation
- Available since gpt-4-0613 (June 2023)
- Our request format matches OpenAI spec exactly
- Tools parameter, tool_choice, and response structure all correct

### 2. GitHub Copilot Proxy Limitations
⚠️ **LIMITATION FOUND**: GitHub Copilot Proxy doesn't forward function calling
- Issue #62 in copilot-extensions SDK: "Implement function calling APIs for Agent" (open)
- Issue #44: "prompt(): Implement toolChoice" (open)
- Proxy endpoint: `https://api.individual.githubcopilot.com/chat/completions`
- Accepts `tools` parameter without error but **silently ignores it**
- Returns `finish_reason: "stop"` instead of `"tool_calls"`

### 3. Evidence from Our Tests
```json
// Request sent (CORRECT):
{
  "model": "gpt-4o",
  "tools": [...],
  "tool_choice": "auto"
}

// Response received (NO TOOL CALLS):
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Let me calculate that for you. One moment."
    },
    "finish_reason": "stop"
  }]
}
```

## Decision

**Use Direct OpenAI API for Tool Calling Tests**

### Rationale
1. **Real Behavior**: Tests actual tool calling, not mocked behavior
2. **Industry Standard**: OpenAI is the canonical API for gpt-4o
3. **Cost Effective**: Minimal cost (~$0.01-0.05 per test run)
4. **Future Proof**: When Copilot Proxy adds support, we can switch back
5. **Transparency**: Tests reflect real-world capabilities

### Implementation

#### Phase 1: Add OpenAI API Support (Immediate)
```typescript
// tests/framework/helpers/llm-helper.ts
export class LLMHelper {
  constructor(config: LLMConfig) {
    // Auto-detect provider based on baseURL
    const isOpenAI = config.baseURL?.includes('api.openai.com');
    const isCopilot = config.baseURL?.includes('copilot');
    
    this.provider = isOpenAI ? 'openai' : isCopilot ? 'copilot' : 'unknown';
  }
}
```

#### Phase 2: Environment-Based Configuration
```bash
# .env.test
OPENAI_API_KEY=sk-...  # For tool calling tests
COPILOT_PROXY_URL=http://127.0.0.1:8069/v1  # For regular chat tests
```

#### Phase 3: Conditional Test Selection
```typescript
// tests/e2e/tool-calling.smoke.test.ts
const llm = process.env.OPENAI_API_KEY
  ? new LLMHelper({
      baseURL: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o',
    })
  : new LLMHelper({
      baseURL: 'http://127.0.0.1:8069/v1',
      model: 'gpt-4o',
    });

// Skip tool calling tests if no OpenAI key
test.skipIf(!process.env.OPENAI_API_KEY)('should call tools', async () => {
  // ...
});
```

### Cost Analysis
- Input: ~100 tokens @ $0.0025/1K = $0.00025
- Output: ~50 tokens @ $0.01/1K = $0.0005
- **Total per test**: ~$0.001 (0.1 cents)
- **100 test runs**: ~$0.10

### Migration Path

**Now**: Use OpenAI API for tool calling tests
```bash
OPENAI_API_KEY=sk-xxx npm run test:e2e
```

**When Copilot adds support**: Switch back to Copilot Proxy
```bash
# Just remove OPENAI_API_KEY from environment
npm run test:e2e
```

## Alternatives Considered

### ❌ Option 1: Mock Tool Calling
**Pros**: Free, fast, no API dependency
**Cons**: Doesn't test real LLM behavior, may miss issues
**Verdict**: Good for unit tests, insufficient for E2E

### ❌ Option 3: Wait for Copilot Support
**Pros**: No code changes, free
**Cons**: Unknown timeline, blocks all progress
**Verdict**: Unacceptable delay

### ❌ Option 4: Use Different LLM Provider
**Pros**: May have better tool calling
**Cons**: Different models, compatibility issues
**Verdict**: OpenAI is canonical for gpt-4o

## Success Criteria

✅ Tests can call tools successfully
✅ ToolCallTracker captures real tool call metrics
✅ E2E tests validate full Diana loading flow
✅ Cost remains under $1 per full test suite run
✅ Easy to switch back to Copilot when support added

## Action Items

1. ✅ Document research findings (this file)
2. ⬜ Update LLMHelper to support OpenAI API key
3. ⬜ Add environment variable handling
4. ⬜ Update test configuration
5. ⬜ Add README section on running tool calling tests
6. ⬜ Update CI/CD to use OpenAI API key from secrets
7. ⬜ Run smoke tests with OpenAI API to verify

## References
- [OpenAI Function Calling Docs](https://platform.openai.com/docs/guides/function-calling)
- [Copilot Extensions SDK Issue #62](https://github.com/copilot-extensions/preview-sdk.js/issues/62)
- [Research Findings Document](./research-findings-tool-calling-issue.md)

## Approval
**Status**: Pending user approval
**Next Step**: Implement Phase 1 if approved
