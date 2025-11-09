# MCP Sampling Integration Design

## Overview

Integrate MCP SDK's `sampling/createMessage` capability to enable LLM-powered intelligent ranking when supported by the client. Maintains session-based ranking as fallback for unsupported clients.

## Client Support Matrix

| Client          | Sampling Support | Detection Method                        |
| --------------- | ---------------- | --------------------------------------- |
| VS Code Copilot | ✅ Yes           | `clientCapabilities.sampling` present   |
| Claude Desktop  | ❌ No            | `clientCapabilities.sampling` undefined |
| Cursor          | ✅ Yes           | `clientCapabilities.sampling` present   |
| Cline           | Unknown          | Runtime detection                       |

## Architecture

### 1. Client Capability Detection

**Location**: `BMADEngine` initialization

```typescript
interface SamplingCapability {
  supported: boolean;
  detected: Date;
  clientInfo?: {
    name?: string;
    version?: string;
  };
}

class BMADEngine {
  private samplingCapability: SamplingCapability;

  async detectSamplingSupport(server: Server): Promise<void> {
    const capabilities = server.getClientCapabilities();
    this.samplingCapability = {
      supported: !!capabilities?.sampling,
      detected: new Date(),
      clientInfo: capabilities?.clientInfo,
    };
  }
}
```

### 2. Hybrid Ranking Strategy

**Decision Tree**:

```
Query arrives
  ├─ Is sampling supported?
  │  ├─ NO → Use session-based ranking ✓
  │  └─ YES → Is query ambiguous/complex?
  │     ├─ NO → Use session-based ranking (fast path)
  │     └─ YES → Use LLM ranking
  │        ├─ Success → Return LLM-ranked results ✓
  │        └─ Error → Fallback to session-based ranking ✓
```

**Criteria for LLM Ranking**:

- Ambiguous queries (multiple potential matches)
- List operations with >5 candidates
- Complex user intent requiring semantic understanding
- User explicitly requests recommendations

**Criteria for Session Ranking**:

- Unambiguous queries (single match)
- Client doesn't support sampling
- LLM ranking fails/times out
- Fast-path scenarios (simple list operations)

### 3. LLM Ranking Prompts

**Token Budget**: ~200 tokens per ranking request

**Prompt Template**:

```typescript
interface RankingContext {
  userQuery: string;
  candidates: Array<{
    key: string;
    name: string;
    description: string;
    module: string;
  }>;
  usageHistory?: Array<{
    key: string;
    lastUsed: Date;
    useCount: number;
  }>;
}

function buildRankingPrompt(context: RankingContext): string {
  return `Rank these ${context.candidates.length} items by relevance to: "${context.userQuery}"

Available items:
${context.candidates
  .map(
    (c, i) =>
      `${i + 1}. ${c.key} (${c.module}): ${c.description.slice(0, 80)}...`,
  )
  .join('\n')}

${
  context.usageHistory
    ? `Recent usage:
${context.usageHistory.map((h) => `- ${h.key}: used ${h.useCount}x, last ${formatRelative(h.lastUsed)}`).join('\n')}
`
    : ''
}

Return ONLY a comma-separated list of keys in ranked order (most relevant first).
Example: bmm:analyst,core:debug,bmm:architect`;
}
```

### 4. Response Parsing

**Expected LLM Response Format**:

```
bmm:analyst,core:debug,bmm:architect,bmm:pm
```

**Parser**:

```typescript
function parseRankingResponse(
  response: string,
  validKeys: Set<string>,
): string[] {
  // Extract comma-separated keys
  const ranked = response
    .trim()
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter((k) => validKeys.has(k));

  // Validation: ensure all candidates present (LLM might skip some)
  const missing = Array.from(validKeys).filter((k) => !ranked.includes(k));

  return [...ranked, ...missing]; // Append missing at end
}
```

### 5. Error Handling & Fallback

**Error Scenarios**:

1. Sampling not supported → Use session ranking (pre-detected)
2. `createMessage` throws error → Log warning, use session ranking
3. LLM response timeout (>2s) → Use session ranking
4. Invalid LLM response format → Parse best-effort, fill gaps with session ranking
5. Empty LLM response → Use session ranking

**Logging**:

```typescript
if (samplingFailed) {
  console.warn('Sampling ranking failed, using session-based fallback', {
    error: e.message,
    query: userQuery,
    candidateCount: candidates.length,
  });
}
```

### 6. Performance Considerations

**Caching**: No caching initially (ranking is context-dependent)

**Timeouts**:

- LLM ranking timeout: 2000ms
- Fallback to session ranking on timeout

**Token Usage**:

- Prompt: ~200 tokens
- Response: ~50 tokens
- Total per ranking: ~250 tokens

**When to Skip LLM**:

- <3 candidates (not ambiguous)
- Client doesn't support sampling
- Previous sampling errors (circuit breaker pattern for future enhancement)

## Implementation Plan

### Phase 1: Detection & Infrastructure

1. Add `SamplingCapability` interface and state to `BMADEngine`
2. Implement `detectSamplingSupport()` method
3. Call detection after server initialization (in `oninitialized` callback)
4. Add logging for capability detection

### Phase 2: LLM Ranking Core

1. Create `src/core/llm-ranker.ts` module
2. Implement `buildRankingPrompt()` function
3. Implement `parseRankingResponse()` function
4. Implement `rankWithLLM()` method in `BMADEngine`
5. Add error handling and fallback logic

### Phase 3: Hybrid Strategy

1. Add decision logic in `BMADEngine.rankByUsage()`
2. Implement complexity heuristics (when to use LLM)
3. Add timeout handling
4. Integrate with existing list/ambiguous operations

### Phase 4: Testing

1. Unit tests for prompt building
2. Unit tests for response parsing
3. Integration tests with mock `createMessage` responses
4. Test fallback scenarios
5. Test with real VS Code Copilot (manual)

### Phase 5: Monitoring

1. Add metrics for sampling usage
2. Track success/failure rates
3. Measure performance impact
4. A/B comparison with session-based ranking

## Metrics to Track

```typescript
interface SamplingMetrics {
  attempts: number;
  successes: number;
  failures: number;
  fallbacks: number;
  avgLatencyMs: number;
  avgTokens: number;
}
```

## Open Questions

1. **Should we cache LLM rankings?**
   - Probably not - context changes with usage history
   - Could cache for same query within short window (30s?)

2. **Circuit breaker for repeated failures?**
   - If sampling fails 3x in a row, disable for 5 minutes?
   - Or just log and always fallback?

3. **Include manifest priority in LLM prompt?**
   - Currently using session-based manifest priority
   - Could tell LLM "core module items are higher priority"

4. **Token budget limits?**
   - What if >50 candidates?
   - Truncate descriptions? Limit candidate count?

## Success Criteria

1. Sampling capability detected correctly for all clients
2. LLM ranking improves relevance over session-based (subjective evaluation)
3. Graceful fallback works 100% of the time
4. No performance regression (<100ms added latency p50, <500ms p99)
5. No crashes or errors in production use
6. Works in VS Code Copilot environment

## Timeline

- Phase 1 (Detection): 1 hour
- Phase 2 (LLM Core): 2 hours
- Phase 3 (Hybrid Strategy): 1 hour
- Phase 4 (Testing): 2 hours
- Phase 5 (Monitoring): 1 hour
- **Total**: ~7 hours development + testing

## References

- MCP SDK Types: `@modelcontextprotocol/sdk/types.js`
- Server.createMessage: `@modelcontextprotocol/sdk/server/index.js`
- Session Ranking: `src/core/session-tracker.ts`
- Existing optimization docs: `docs/session-based-ranking.md`
