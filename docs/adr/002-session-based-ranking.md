# Session-Based Intelligent Ranking System

**Status:** ✅ Implemented (commit 1d19e0e)  
**Tests:** 21/21 passing (100%)  
**Integration:** BMADEngine + all list/execute operations

---

## Overview

The BMAD MCP Server now implements **stateful, session-based ranking** that learns from usage patterns to surface the most relevant agents, workflows, and modules first. This dramatically improves UX for both human users and LLMs by reducing cognitive load and presenting contextually-relevant options.

## Ranking Signals

The system combines **4 weighted signals** to calculate ranking scores:

### 1. **Recency (40% weight)** 🕐

**Question:** When was this item last used?

- **Formula:** Exponential decay with 15-minute half-life
- **Behavior:**
  - Just used (< 5 min ago): ~1.0 score
  - Recently used (15 min ago): ~0.5 score
  - Old usage (> 1 hour ago): ~0.1 score
  - Never used: 0.0 score

**Why it matters:** Temporal locality - if you used `debug` agent 2 minutes ago, you're likely to use it again soon.

### 2. **Frequency (30% weight)** 📊

**Question:** How often is this item used?

- **Formula:** Log₂-scaled count (diminishing returns)
- **Behavior:**
  - 1 access: ~0.3 score
  - 10 accesses: ~0.7 score
  - 100+ accesses: ~1.0 score (capped)

**Why it matters:** Popular items should rank higher, but with diminishing returns to avoid stagnation.

### 3. **Manifest Priority (20% weight)** 📋

**Question:** Where did the author place this in the manifest?

- **Formula:** Linear interpolation (first = 1.0, last = 0.0)
- **Behavior:**
  - First item: 1.0 score
  - Middle item: 0.5 score
  - Last item: 0.0 score

**Why it matters:** Authors know their system best - respect their curation.

### 4. **Core Module Boost (10% boost)** ⭐

**Question:** Is this a core module item on a fresh session?

- **Formula:** +0.1 boost if module = `core` AND no prior usage
- **Behavior:**
  - Fresh session: Core items get +10% advantage
  - After first use: Boost disappears (usage patterns take over)

**Why it matters:** Sensible defaults - core module contains fundamental tools most users need.

---

## How It Works

### Execution Flow

```typescript
// 1. User requests agent list
await engine.listAgents();

// 2. Engine ranks agents by usage
const rankedAgents = rankByUsage(agents, (a) => `${a.module}:${a.name}`);
// Calculates: 0.4*recency + 0.3*frequency + 0.2*manifest + coreBoost

// 3. User executes an agent
await engine.executeAgent({ agent: 'debug', module: 'core' });

// 4. Usage tracked automatically
sessionTracker.recordUsage('core:debug'); // Timestamp + increment count
sessionTracker.recordUsage('core'); // Module-level tracking

// 5. Next list call reflects updated rankings
await engine.listAgents(); // "debug" now ranks higher
```

### Module-Level Aggregation

When you use `core:debug`, the system tracks:

- **Agent-level:** `core:debug` usage count + timestamp
- **Module-level:** `core` usage count + timestamp

This allows module-level ranking (e.g., `core` module ranks higher if you've used ANY core agents).

---

## Usage Examples

### Example 1: Fresh Session (Manifest Priority + Core Boost)

```typescript
const tracker = new SessionTracker();

// No usage yet, pure manifest ordering + core boost
tracker.calculateScore('core:debug', 0, 10); // ~0.30 (manifest=0.2 + boost=0.1)
tracker.calculateScore('bmm:architect', 0, 10); // ~0.20 (manifest=0.2 only)
tracker.calculateScore('cis:innovator', 9, 10); // ~0.00 (manifest=0.0, last item)
```

**Result:** `core:debug` > `bmm:architect` > `cis:innovator` (manifest order + core boost)

### Example 2: After Heavy Use (Frequency Dominates)

```typescript
// Use architect 20 times
for (let i = 0; i < 20; i++) {
  tracker.recordUsage('bmm:architect');
}

tracker.calculateScore('core:debug', 0, 10); // ~0.30 (no usage, manifest only)
tracker.calculateScore('bmm:architect', 5, 10); // ~0.65 (recency + frequency wins!)
```

**Result:** `bmm:architect` > `core:debug` (usage beats manifest)

### Example 3: Temporal Pattern (Recency Wins)

```typescript
// Use debug once, long ago
tracker.recordUsage('core:debug');
await delay(60000); // 60 seconds

// Use analyst just now
tracker.recordUsage('core:analyst');

tracker.calculateScore('core:debug', 0, 2); // ~0.35 (decayed recency)
tracker.calculateScore('core:analyst', 1, 2); // ~0.50 (fresh recency)
```

**Result:** `core:analyst` > `core:debug` (recent beats old)

---

## Integration Points

### 1. **List Operations** (Discovery)

- `listAgents()` - Ranked by session usage
- `listWorkflows()` - Ranked by session usage
- `listModules()` - Not yet ranked (TODO)

### 2. **Execute Operations** (Action + Tracking)

- `executeAgent()` - Records `module:agent` usage
- `executeWorkflow()` - Records `module:workflow` + `module:agent` usage

### 3. **Ambiguous Responses** (Disambiguation)

- `formatAmbiguousAgentResponse()` - Ranks matches before presenting
- `formatAmbiguousWorkflowResponse()` - Ranks matches before presenting

---

## Configuration

### Default Weights

```typescript
export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  recency: 0.4, // 40% weight
  frequency: 0.3, // 30% weight
  manifestPriority: 0.2, // 20% weight
  coreModuleBoost: 0.1, // +10% boost (additive)
};
```

### Custom Weights

```typescript
// Create tracker that heavily favors recency
const tracker = new SessionTracker({
  recency: 0.7,
  frequency: 0.2,
  manifestPriority: 0.05,
  coreModuleBoost: 0.05,
});
```

---

## Performance Characteristics

### Time Complexity

- **Record Usage:** O(1) - Map lookup + update
- **Calculate Score:** O(1) - Pure math calculation
- **Rank List:** O(n log n) - Standard sort

### Space Complexity

- **Per Item:** ~80 bytes (key, firstAccess, lastAccess, count)
- **Typical Session:** ~50 items = ~4 KB
- **Large Session:** ~500 items = ~40 KB (negligible)

### Session Lifecycle

- **Created:** On BMADEngine construction
- **Persisted:** In-memory only (no disk/network)
- **Cleared:** On server restart or explicit reset()
- **Duration:** Entire MCP session (connection lifetime)

---

## Observability

### Session Statistics

```typescript
const stats = tracker.getStats();

console.log(stats);
// {
//   totalItems: 15,           // Unique items tracked
//   totalAccesses: 47,        // Total usage count
//   sessionDuration: 180000,  // 3 minutes
//   topItems: [
//     { key: 'core:debug', count: 12, lastAccess: 1699... },
//     { key: 'bmm:architect', count: 8, lastAccess: 1699... },
//     ...
//   ]
// }
```

### Debugging

```typescript
// Inspect score breakdown
const score = tracker.calculateScore('core:debug', 0, 10);
console.log(`Final score: ${score}`);

// Reset for fresh start
tracker.reset();
```

---

## Future Enhancements

### Potential Improvements

1. **Cross-session persistence** - Store usage in local cache between restarts
2. **User preferences** - Allow manual pinning/boosting of favorites
3. **Time-of-day patterns** - Learn temporal workflows (morning vs afternoon)
4. **Context-aware ranking** - Boost items based on conversation context
5. **Collaborative filtering** - Learn from community usage patterns

### Performance Optimizations

1. **Lazy score calculation** - Only calc when needed
2. **Score caching** - Cache scores for stable lists
3. **Top-K tracking** - Only track most popular items

---

## Testing

### Test Coverage

- ✅ Usage recording (4 tests)
- ✅ Recency scoring (3 tests)
- ✅ Frequency scoring (2 tests)
- ✅ Manifest priority (2 tests)
- ✅ Core module boost (2 tests)
- ✅ Combined ranking (2 tests)
- ✅ Custom weights (1 test)
- ✅ Session management (2 tests)
- ✅ Statistics (3 tests)

**Total:** 21 tests, 100% passing

### Key Test Scenarios

1. Fresh session defaults to manifest order + core boost
2. Recent usage beats old usage
3. Frequent usage beats rare usage
4. Log-scale prevents frequency domination
5. Combined signals balance appropriately
6. Module-level aggregation works correctly
7. Statistics accurately reflect session state

---

## Design Rationale

### Why Session-Scoped?

**Short answer:** Privacy, simplicity, and appropriateness.

- **Privacy:** No cross-session data leakage
- **Simplicity:** No persistence layer needed
- **Fresh starts:** Each session begins clean
- **MCP philosophy:** Servers should be stateless where possible

### Why These Weights?

**Tested through experimentation:**

- **Recency (40%):** Strong signal - what you just used matters most
- **Frequency (30%):** Important but can't dominate (prevent stagnation)
- **Manifest (20%):** Respect author curation, but don't let it dominate
- **Core boost (10%):** Gentle nudge for newcomers, disappears with usage

### Why Log-Scale Frequency?

**Prevents runaway popularity:**

- Linear: 100 uses = 100x score (stagnation)
- Log: 100 uses ≈ 3x score (balanced)
- Allows new items to compete with established favorites

---

## Related Work

### Commit History

- **1d19e0e:** feat(core): add session-based intelligent ranking system
- **9cacf12:** fix(core): prioritize standalone workflows and optimize ambiguous responses

### Documentation

- [Architecture](/docs/architecture.md)
- [Optimization Strategy](/docs/server-review-report-2025-11-07.md)
- [MCP Protocol](/docs/api-contracts.md)

### Future Tasks

- [ ] Optimize tool description with lazy loading (highest ROI)
- [ ] Optimize list operations format
- [ ] Optimize read operations
- [ ] Optimize error responses
