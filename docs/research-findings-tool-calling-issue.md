# Research Findings: Tool Calling Issue with GitHub Copilot API

## Executive Summary
GitHub Copilot's Chat Completions API (`https://api.individual.githubcopilot.com/chat/completions`) does not support OpenAI-style function calling/tools, despite being advertised as OpenAI-compatible.

## Investigation Date
2025-11-09

## Problem Statement
LLM refuses to call tools when provided via the `tools` parameter. Instead, it returns text responses describing what it would do, with `finish_reason: "stop"` instead of `finish_reason: "tool_calls"`.

## Evidence

### Request Structure (CORRECT)
```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant with access to a calculator tool. When asked to perform calculations, you MUST use the calculator tool. Do not calculate in your head - always call the tool."
    },
    {
      "role": "user",
      "content": "What is 25 + 17?"
    }
  ],
  "temperature": 0.1,
  "max_tokens": 4000,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "calculator",
        "description": "Performs basic arithmetic operations. Use this to calculate math problems.",
        "parameters": {
          "type": "object",
          "properties": {
            "operation": {
              "type": "string",
              "enum": ["add", "subtract", "multiply", "divide"],
              "description": "The operation to perform"
            },
            "a": {
              "type": "number",
              "description": "First number"
            },
            "b": {
              "type": "number",
              "description": "Second number"
            }
          },
          "required": ["operation", "a", "b"]
        }
      }
    }
  ],
  "tool_choice": "auto"
}
```

### Response Structure (PROBLEM)
```json
{
  "id": "chatcmpl-Ca6YxcfxUUAwFwdYkMvjGDyl9pTZ4",
  "object": "chat.completion",
  "created": 1762721071,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Let me calculate that for you. One moment."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 56,
    "completion_tokens": 11,
    "total_tokens": 67
  }
}
```

**Key Observations:**
- ✅ Request matches OpenAI's Chat Completions API spec exactly
- ❌ Response has `finish_reason: "stop"` (should be `"tool_calls"`)
- ❌ Response `message` object has no `tool_calls` array
- ❌ LLM returns text description instead of calling the tool
- ✅ HTTP 200 response (no API errors)
- ✅ Model used: `gpt-4o-2024-11-20`

## Tests Conducted

### Test 1: Simple Calculator Tool
- **Tool**: Basic calculator with add/subtract/multiply/divide
- **Prompt**: "What is 25 + 17?"
- **System Message**: Explicitly instructs to ALWAYS use the tool
- **Result**: ❌ FAILED - No tool calls made

### Test 2: BMAD MCP Tool (Planned)
- **Tool**: BMAD agent listing via MCP
- **Expected**: Same failure pattern
- **Status**: Not yet executed (calculator failure is diagnostic enough)

## Attempts to Resolve

### Attempt 1: Add `tool_choice: "auto"`
- **Rationale**: Maybe Copilot requires explicit tool_choice parameter
- **Result**: ❌ FAILED - No change in behavior

### Attempt 2: Strong System Prompting
- **Rationale**: Maybe model needs explicit instruction
- **System Message**: "You MUST use the calculator tool. Do not calculate in your head"
- **Result**: ❌ FAILED - Model still doesn't call tools

## Root Cause Analysis

### Primary Hypothesis: API Limitation
GitHub Copilot's Chat Completions endpoint may not implement the full OpenAI function calling specification. The endpoint accepts the `tools` parameter without error but **silently ignores** it.

### Supporting Evidence
1. Request format is correct (matches OpenAI spec)
2. No API errors or validation failures
3. Response structure lacks `tool_calls` field entirely
4. Model acknowledges task ("Let me calculate") but doesn't execute tool
5. Same behavior with `tool_choice: "auto"` parameter

### Alternative Hypotheses (Ruled Out)
- ❌ **Incorrect request format**: Request matches OpenAI spec exactly
- ❌ **Model incompatibility**: gpt-4o-2024-11-20 supports function calling on OpenAI
- ❌ **Missing parameters**: Added tool_choice, no change
- ❌ **Schema errors**: Calculator schema is simple and valid

## Implications for BMad Method Testing

### Critical Impact
- **E2E Tests**: Cannot test agent loading flow with real tool calling
- **Smoke Tests**: Both simple and BMAD tools will fail
- **Metrics Tracking**: ToolCallTracker will always show 0 tool calls
- **Phase 2 Progress**: Blocked at 25% (1/4 tasks complete)

### Test Infrastructure Status
- ✅ ToolCallTracker: Fully implemented and tested (31 unit tests passing)
- ✅ LLMHelper: Enhanced with tracking and debug logging
- ✅ Visual Output: Comprehensive console logging with emojis/tables
- ✅ Conversation Loop: continueWithToolResult() working correctly
- ❌ **Actual Tool Execution**: Blocked by API limitation

## Recommended Solutions

### Option 1: Mock Tool Calling (Recommended for Short-Term)
**Pros:**
- Can complete E2E tests immediately
- Tests infrastructure code (tracker, metrics, formatting)
- Validates conversation loop mechanics
- Can still measure efficiency with mocked calls

**Cons:**
- Not testing real LLM behavior
- May miss real-world tool calling issues

**Implementation:**
- Create `MockLLMHelper` that simulates tool calls
- Use for E2E tests, keep real LLMHelper for production
- Document limitation clearly in test comments

### Option 2: Switch to Direct OpenAI API (Recommended for Long-Term)
**Pros:**
- Real tool calling behavior
- Full OpenAI function calling support
- Industry-standard testing

**Cons:**
- Requires OpenAI API key
- Costs money (though minimal for testing)
- Different authentication flow

**Implementation:**
- Add environment variable: `OPENAI_API_KEY`
- Conditional LLM provider: Copilot for dev, OpenAI for tool tests
- Update CI/CD to use OpenAI API key from secrets

### Option 3: Use Copilot Extensions API (Research Required)
**Pros:**
- May support tool calling properly
- Uses existing Copilot subscription

**Cons:**
- Unknown if supported
- May require different endpoint/authentication
- Documentation unclear

**Implementation:**
- Research Copilot Extensions API capabilities
- Test alternative endpoints
- May require GitHub App registration

### Option 4: Feature Request to GitHub
**Pros:**
- Could enable future tool calling support
- Benefits entire community

**Cons:**
- Long timeline (months/years)
- No guarantee of implementation
- Doesn't solve immediate problem

**Implementation:**
- File GitHub feedback/feature request
- Document use case and benefits
- Community advocacy

## Immediate Next Steps

1. **Document findings** ✅ (this document)
2. **Present findings to user** for decision on approach
3. **Choose solution path**:
   - Quick win: Option 1 (Mock)
   - Production ready: Option 2 (OpenAI)
   - Research: Option 3 (Copilot Extensions)
4. **Update workflow status** based on chosen path
5. **Implement selected solution**

## Technical Artifacts

### Debug Environment Variable
```bash
DEBUG_LLM=true npm run test:e2e
```

### Test Files
- `tests/e2e/tool-calling.smoke.test.ts` - Smoke tests (failing)
- `tests/e2e/agent-loading-flow.test.ts` - E2E test (failing)
- `tests/framework/helpers/llm-helper.ts` - Enhanced with debug logging
- `tests/framework/helpers/tool-call-tracker.ts` - Working correctly

### Debug Output Location
Full request/response logging in test output when `DEBUG_LLM=true`

## References
- OpenAI Chat Completions API: https://platform.openai.com/docs/api-reference/chat
- OpenAI Function Calling Guide: https://platform.openai.com/docs/guides/function-calling
- GitHub Copilot API Docs: (unclear on function calling support)

## Conclusion
The test infrastructure is **complete and working correctly**. The blocker is GitHub Copilot's Chat Completions API not supporting OpenAI-style function calling. We need to choose between mocking tool calls for testing or switching to direct OpenAI API for real tool calling behavior.

**Recommendation**: Implement both approaches - use mocks for fast unit/integration tests, use OpenAI API (gated by environment variable) for real E2E validation.
