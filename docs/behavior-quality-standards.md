# Behavior Quality Standards

## Overview

BMAD MCP Server implements comprehensive behavior quality monitoring to ensure agents consistently deliver high-quality interactions. Quality is measured across six dimensions beyond simple functional correctness.

## Quality Dimensions

### 1. Tool Call Accuracy (20% weight)
**What it measures:** Whether agents select the correct operation types for different scenarios.

**Scoring:**
- List operation for discovery requests ("what agents are available?")
- Read operation for capability queries ("tell me about X agent")
- Execute operation for actionable requests ("load agent X", "run workflow Y")

**Excellent:** 90-100% - All tool calls use appropriate operations
**Good:** 75-89% - Most tool calls use correct operations
**Acceptable:** 60-74% - Majority of tool calls correct
**Poor:** <60% - Frequent operation mismatches

### 2. Parameter Completeness (20% weight)
**What it measures:** Whether all required parameters are provided and correct.

**Key requirements:**
- Execute operations require: `operation`, `agent`/`workflow`, `message`
- List operations require: `operation`, `query`
- Read operations require: `operation`, `agent`/`workflow`
- No module prefixes in agent/workflow names (use "debug", not "bmm-debug")

**Excellent:** 90-100% - All parameters complete and valid
**Good:** 75-89% - Minor parameter issues
**Acceptable:** 60-74% - Some missing parameters
**Poor:** <60% - Frequent parameter errors

### 3. Contextual Relevance (15% weight)
**What it measures:** Whether tool calls are appropriate for the user's context and intent.

**Good behavior:**
- Discovery before execution when exploring options
- Direct execution for explicit agent requests
- Appropriate operation selection for query type

**Poor behavior:**
- Listing agents when user explicitly requests a specific one
- Executing without context when discovery would help
- Invalid parameter combinations (e.g., both agent and workflow in list)

### 4. Conversation Coherence (15% weight)
**What it measures:** Logical flow, context awareness, and message balance.

**Indicators:**
- Balanced message ratio (user:assistant between 0.5-5.0)
- Consistent tool call timing (no large gaps suggesting context loss)
- No repetitive calls indicating confusion

**Red flags:**
- Same operation repeated >3 times
- Large time gaps between related tool calls
- Extremely one-sided conversations

### 5. Efficiency (15% weight)
**What it measures:** Minimal unnecessary calls and optimal paths to goals.

**Benchmarks:**
- Simple agent load: ≤2 calls (1 execute, maybe 1 discovery)
- Discovery query: ≤2 calls (1-2 list/read operations)
- Complex workflow: ≤5 calls
- Error recovery: ≤1 retry

**Penalties:**
- -15 points per excessive call beyond threshold
- -10 points per failed call that didn't lead to correction
- -20 points for missing discovery when appropriate

### 6. Instruction Adherence (15% weight)
**What it measures:** Following system prompts, user constraints, and documented behavior.

**Requirements:**
- Use expected agent/workflow when explicitly named
- Follow operation type constraints when specified
- All tool calls should succeed (basic adherence)
- Respect user-defined limitations

**Excellent:** 90-100% - Perfect instruction following
**Good:** 75-89% - Minor deviation from instructions
**Acceptable:** 60-74% - Some instructions missed
**Poor:** <60% - Frequent instruction violations

## Overall Scoring

**Formula:**
```
Overall = (ToolCallAccuracy × 0.20) + 
          (ParameterCompleteness × 0.20) + 
          (ContextualRelevance × 0.15) + 
          (ConversationCoherence × 0.15) + 
          (Efficiency × 0.15) + 
          (InstructionAdherence × 0.15)
```

**Ratings:**
- **Excellent:** 90-100 points - Production ready, exemplary behavior
- **Good:** 75-89 points - Production acceptable, minor improvements possible
- **Acceptable:** 60-74 points - Functional but needs optimization
- **Poor:** 40-59 points - Significant issues, requires fixes
- **Failed:** 0-39 points - Critical problems, not acceptable

## Quality Thresholds by Test Type

### Unit Tests
- Minimum: 70 points (Acceptable)
- Target: 80 points (Good)

### Integration Tests
- Minimum: 70 points (Acceptable)
- Target: 85 points (Good to Excellent)

### E2E Tests
- Minimum: 65 points (Acceptable with variance)
- Target: 80 points (Good)

### Production Monitoring
- Alert threshold: 60 points (below Acceptable)
- Critical threshold: 50 points (Poor)

## Common Issues and Recommendations

### Low Tool Call Accuracy
**Symptoms:** Wrong operations selected
**Fixes:**
- Improve prompt engineering for operation selection
- Add explicit operation type guidance in system prompts
- Review agent persona for clarity on when to list/read/execute

### Low Parameter Completeness
**Symptoms:** Missing required parameters, invalid combinations
**Fixes:**
- Validate parameter requirements before tool calls
- Remove module prefixes from agent/workflow names
- Check forbidden parameter combinations

### Low Contextual Relevance
**Symptoms:** Inappropriate tool selections for context
**Fixes:**
- Better context awareness in prompts
- Clearer user intent detection
- Appropriate discovery vs direct execution logic

### Low Conversation Coherence
**Symptoms:** Repetitive calls, context loss, poor message flow
**Fixes:**
- Improve context retention between calls
- Add conversation state tracking
- Reduce repetitive error patterns

### Low Efficiency
**Symptoms:** Excessive tool calls, wasted errors
**Fixes:**
- Optimize discovery patterns
- Better error recovery strategies
- Reduce unnecessary verification calls

### Low Instruction Adherence
**Symptoms:** Not following explicit instructions
**Fixes:**
- Strengthen constraint parsing
- Improve system prompt clarity
- Add instruction validation layer

## Usage in Tests

```typescript
import { BehaviorQualityChecker, assertQualityMeetsStandard } from '../framework/helpers';

const qualityChecker = new BehaviorQualityChecker();
const qualityReport = qualityChecker.calculateOverallQuality(analysis, {
  expectedTarget: 'debug',
  expectedOperation: 'execute',
  maxToolCalls: 3,
});

const assertion = assertQualityMeetsStandard(qualityReport, 70);
expect(assertion.passed, assertion.message).toBe(true);
```

## Continuous Improvement

### Weekly Review
- Analyze quality trends across all E2E tests
- Identify patterns in low-scoring dimensions
- Update prompts or agent personas based on findings

### Baseline Tracking
- Maintain historical quality scores
- Alert on regression (>10 point drop)
- Celebrate improvements (>10 point gain)

### Quality Gates
- PR reviews include quality score checks
- CI/CD fails on quality regression
- Production deployments require ≥75 average score

## References

- [BehaviorQualityChecker Implementation](../tests/framework/helpers/behavior-quality.ts)
- [Quality Validation Tests](../tests/e2e/behavior-quality.test.ts)
- [Session Analysis](../tests/framework/helpers/copilot-session-helper.ts)
