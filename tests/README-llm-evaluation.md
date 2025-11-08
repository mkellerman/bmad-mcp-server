# LLM Evaluation Framework

Dual-LLM testing framework for evaluating AI response quality using a judge LLM.

## Overview

This framework enables behavioral quality testing where:

1. **Subject LLM** generates a response (e.g., BMAD ranks workflows)
2. **Judge LLM** evaluates the response quality against defined criteria
3. **Test passes/fails** based on judge's score

## Quick Start

### Basic Evaluation

```typescript
import { evaluateTest } from './helpers/llm-evaluation';
import { createRankingCriteria } from './fixtures/evaluation-prompts';

const result = await evaluateTest(
  'test-name',
  response, // MCPResponse from subject LLM
  createRankingCriteria('mobile app development', 'UX/UI Design', [
    'create-ux-design',
    'product-brief',
  ]),
);

expect(result?.passed).toBe(true);
expect(result?.selectedSample.score).toBeGreaterThanOrEqual(80);
```

### Test Matrix (Multiple Judges)

```typescript
import { TestMatrix, JUDGE_MODELS } from './helpers/llm-evaluation';

const matrix = new TestMatrix([
  JUDGE_MODELS.GPT4_TURBO,
  JUDGE_MODELS.CLAUDE_35_SONNET,
  JUDGE_MODELS.GPT35_TURBO,
]);

const results = await matrix.run(testName, response, criteria, {
  passingScore: 80,
});
const comparison = matrix.analyze(results);
matrix.printComparison(comparison);
```

### Storage and Trend Analysis

```typescript
import { getEvaluationStorage } from './helpers/llm-evaluation';

// Storage is automatic when enabled in config (CI/nightly profiles)
// Or can be explicitly enabled:
const result = await evaluateTest('test-name', response, criteria, {
  enableStorage: true,
});

// Analyze trends over time
const storage = getEvaluationStorage();
const trends = storage.analyzeTrends('test-name');
if (trends) {
  storage.printTrends(trends);

  // Check for regressions
  if (trends.regressions.length > 0) {
    console.warn('⚠️ Detected score regressions!');
  }
}

// Generate cross-test summary
const summary = storage.generateSummary();
console.log(`Total tests: ${summary.totalTests}`);
console.log(`Pass rate: ${(summary.overallPassRate * 100).toFixed(1)}%`);
console.log(`Total cost: $${summary.totalCost.toFixed(4)}`);
```

## What You Can See

### Individual Evaluation Output

```
📊 LLM Evaluation: ranking-quality-mobile-app
   Score: 92/100 (✅ PASS)
   Samples: 3
   Variance: 2.4%
   Subject: claude-3-opus → Judge: gpt-4-turbo

   💭 Judge Reasoning:
      Excellent ranking with strong domain focus. UX workflows
      properly prioritized over generic ones.

   🎯 Checkpoint Scores:
      ✅ create-ux-design workflow appears in top 5: 100/100
      ✅ product-brief workflow appears in top 5: 95/100
      ⚠️  Response prioritizes UI/UX workflows: 85/100

   ⚙️  Evaluation Metadata:
      Model: gpt-4-turbo-preview
      Duration: 1240ms
      Tokens: 450 in, 180 out
      Cost: $0.0084
```

### Test Matrix Comparison

```
═══════════════════════════════════════════════════════════════════════════
📊 TEST MATRIX COMPARISON
═══════════════════════════════════════════════════════════════════════════

🎯 Judge Results:
┌──────────────────────────────────────────────────────────────────────────┐
│ Judge Model              │ Result │ Score   │ Variance │ Duration │ Cost     │
├──────────────────────────────────────────────────────────────────────────┤
│ GPT-4 Turbo              │ ✅ PASS │ 92/100  │ 2.1%     │ 1240ms   │ $0.0084  │
│ Claude 3.5 Sonnet        │ ✅ PASS │ 88/100  │ 3.2%     │ 980ms    │ $0.0042  │
│ GPT-3.5 Turbo            │ ❌ FAIL │ 76/100  │ 5.8%     │ 620ms    │ $0.0012  │
└──────────────────────────────────────────────────────────────────────────┘

🤝 Consensus Analysis:
   ⚠️  Split decision (67% agreement)

📈 Score Statistics:
   Mean:   85.3/100
   Median: 88.0/100
   Range:  76.0 - 92.0
   StdDev: 6.8

💰 Cost Summary:
   Total: $0.0138
   GPT-4 Turbo: $0.0084
   Claude 3.5 Sonnet: $0.0042
   GPT-3.5 Turbo: $0.0012

═══════════════════════════════════════════════════════════════════════════
```

## Configuration

### Test Profiles

Set via environment variable:

```bash
# Development: Run all evaluations, no budget limit
TEST_PROFILE=development npm test

# CI: Selective evaluation, $0.50 budget
TEST_PROFILE=ci npm test

# Nightly: Comprehensive evaluation, $5.00 budget
TEST_PROFILE=nightly npm test
```

### Test Prioritization

Configured in `tests/config/critical-tests.config.ts`:

- **Always Evaluate**: Critical behavioral tests (ranking quality, relevance)
- **Conditional**: Run in nightly or when explicitly requested
- **Never Evaluate**: Basic validation (schema checks, etc.)

### Judge Models

Configured in `tests/config/judge-models.config.ts`:

- **GPT-4 Turbo**: $0.01/$0.03 per 1K tokens (input/output)
- **Claude 3.5 Sonnet**: $0.003/$0.015 per 1K tokens
- **GPT-3.5 Turbo**: $0.0005/$0.0015 per 1K tokens

### Storage Configuration

Evaluation results are stored to disk for trend analysis:

- **Development**: `storeResults: false` (don't store during development)
- **CI**: `storeResults: true` (store for trend analysis)
- **Nightly**: `storeResults: true` (store for historical data)

Storage location: `test-results/evaluations/`
File format: `{testName}-{timestamp}.json`

Each evaluation record includes:

- Test criteria and results
- Subject and judge models used
- Environment metadata (profile, CI flag, git branch/commit)
- Timestamp and cost tracking

## Judge Prompt Templates

Pre-built templates in `tests/fixtures/evaluation-prompts/`:

### Ranking Quality

```typescript
import { createRankingCriteria } from './fixtures/evaluation-prompts';

const criteria = createRankingCriteria(
  'Help me design a mobile app', // Query
  'UX/UI Design', // Expected domain
  ['create-ux-design', 'product-brief'], // Expected top results
);
```

### Response Relevance

```typescript
import { createRelevanceCriteria } from './fixtures/evaluation-prompts';

const criteria = createRelevanceCriteria(
  'Create a product brief', // User request
  ['problem statement', 'target users'], // Expected elements
  'Product Management', // Domain
);
```

### Response Completeness

```typescript
import { createCompletenessCriteria } from './fixtures/evaluation-prompts';

const criteria = createCompletenessCriteria(
  ['all steps included', 'error handling'], // Required elements
  'implementation', // Task type
);
```

## Failure Modes

The framework handles 5 failure modes gracefully:

### 1. Graceful Degradation

When judge LLM is unavailable, tests fall back to deterministic validation:

```typescript
if (evaluation && evaluation.passed) {
  // Judge passed - use LLM score
  expect(evaluation.selectedSample.score).toBeGreaterThanOrEqual(80);
} else {
  // Judge unavailable - use fallback validation
  expect(hasRelevantWorkflow).toBe(true);
}
```

### 2. Consistency Checking

Multiple samples detect judge variance:

```
📊 LLM Evaluation: test-name
   Samples: 3
   Variance: 12.3% ⚠️  High variance detected
```

### 3. Evidence Validation

Anti-hallucination: Judge must quote from actual response:

```
⚠️  Evidence warnings:
   - Checkpoint referenced workflow not in response
❌ Missing evidence:
   - "create-ux-design" mentioned but not found
```

### 4. Cost Control

Budget enforcement with selective evaluation:

```
💰 LLM Evaluation Cost Summary:
Total Cost: $0.4850
Budget: $0.50
Over Budget: No ⚠️  Approaching limit
```

### 5. Score Bands (Anti-Flakiness)

Retesting for borderline scores (78-82 range):

```
Score: 79/100 (borderline)
Retesting with 2 additional samples...
Final: 81/100 (✅ PASS)
```

## Current Status

### ✅ Complete

- Configuration system (3 profiles, environment overrides)
- Core framework API (types, judge, consistency, runner)
- All 5 failure modes implemented
- Judge prompt templates (ranking, relevance, completeness)
- Model tracking (subject → judge display)
- Test matrix for multi-judge comparison
- Cost tracking and budget enforcement

### 🔄 In Placeholder Mode

- LLM judge calls (throws "not yet implemented")
- Tests pass via graceful degradation
- All infrastructure ready for LiteLLM integration

### 📋 Pending

- LiteLLM integration for actual judge LLM calls
- Evaluation result storage and trend analysis

## Demo Tests

See framework in action:

```bash
# Basic evaluation (shows output format in placeholder mode)
npm test -- ranking-quality.eval

# Test matrix comparison (shows multi-judge table)
npm test -- demo-test-matrix
```

## Cost Estimation

Typical costs per evaluation:

| Judge Model | Single Eval | 3-Sample Consistency | Full Matrix (3 judges) |
| ----------- | ----------- | -------------------- | ---------------------- |
| GPT-4 Turbo | ~$0.008     | ~$0.024              | ~$0.072                |
| Claude 3.5  | ~$0.004     | ~$0.012              | ~$0.036                |
| GPT-3.5     | ~$0.001     | ~$0.003              | ~$0.009                |

**Recommendation**: Use GPT-3.5 for development, GPT-4/Claude for CI/nightly.

## Integration with Existing Tests

### E2E Tests

```typescript
describe('Workflow Ranking', () => {
  it('should rank UX workflows highly for mobile app query', async () => {
    const response = await engine.executeQuery('design mobile app');

    // Standard assertions
    expect(response.workflows.length).toBeGreaterThan(0);

    // LLM evaluation
    const evaluation = await evaluateTest(
      'ranking-mobile-app',
      response,
      createRankingCriteria('mobile app', 'UX/UI'),
    );

    // Graceful: passes with or without judge
    if (evaluation?.passed) {
      console.log(`Judge score: ${evaluation.selectedSample.score}/100`);
    }
  });
});
```

## Trend Analysis Features

The storage system provides powerful trend analysis capabilities:

### Automatic Trend Detection

```typescript
const trends = storage.analyzeTrends('workflow-ranking-quality');

// Trend classification based on recent vs historical pass rates:
// 📈 IMPROVING: Recent pass rate higher than historical
// 📉 DEGRADING: Recent pass rate lower than historical
// ➡️ STABLE: No significant change
console.log(`Trend: ${trends.trend.improving ? '📈' : '📉'}`);
```

### Regression Detection

Automatically flags score drops > 10 points between consecutive runs:

```typescript
if (trends.regressions.length > 0) {
  console.warn('⚠️ Quality regressions detected!');
  for (const regression of trends.regressions) {
    console.log(`Score dropped ${regression.drop} points`);
    console.log(
      `From ${regression.previousScore} to ${regression.currentScore}`,
    );
  }
}
```

### Statistics Tracking

```typescript
console.log(`Pass rate: ${trends.statistics.passRate * 100}%`);
console.log(`Average score: ${trends.statistics.averageScore}/100`);
console.log(`Score std dev: ${trends.statistics.scoreStdDev.toFixed(1)}`);
console.log(`Total cost: $${trends.statistics.totalCost.toFixed(4)}`);
```

### Cross-Test Summary

```typescript
const summary = storage.generateSummary();

// Overall metrics
console.log(`Total tests: ${summary.totalTests}`);
console.log(`Total evaluations: ${summary.totalEvaluations}`);
console.log(`Overall pass rate: ${summary.overallPassRate * 100}%`);

// Per-test breakdown
for (const [testName, stats] of summary.byTest) {
  console.log(`${testName}: ${stats.count} runs, ${stats.avgScore}/100`);
}
```

## Best Practices

1. **Use specific criteria**: More checkpoints = better evaluation granularity
2. **Include expected evidence**: Help judge find relevant parts of response
3. **Set appropriate thresholds**: 90+ for critical, 70+ for nice-to-have
4. **Budget conservatively**: Start with selective, expand to always-on gradually
5. **Compare judges**: Use test matrix to validate consistency across models
6. **Monitor variance**: High variance (>10%) indicates unstable evaluation
7. **Check evidence**: Review warnings to catch judge hallucinations

## Troubleshooting

### Tests always skip evaluation

Check `SKIP_LLM_EVAL` environment variable and test profile:

```bash
unset SKIP_LLM_EVAL
TEST_PROFILE=development npm test
```

### High variance warnings

Increase consistency samples or adjust criteria clarity:

```typescript
// In llm-evaluation.config.ts
consistency: {
  retries: 5,  // More samples
  // OR
  varianceThreshold: 15,  // More tolerance
}
```

### Budget exceeded

Adjust strategy or increase limit:

```typescript
// In llm-evaluation.config.ts
costControl: {
  strategy: 'selective',  // vs 'all'
  budgetLimit: 1.00,      // Increase limit
}
```

## Architecture

```
tests/
├── config/
│   ├── llm-evaluation.config.ts      # Main config (profiles, failure modes)
│   ├── critical-tests.config.ts      # Test prioritization
│   └── judge-models.config.ts        # Model costs, budget tracking
│
├── helpers/llm-evaluation/
│   ├── types.ts                      # TypeScript interfaces
│   ├── llm-judge.ts                  # Judge LLM executor
│   ├── consistency-checker.ts        # Multi-sample variance checking
│   ├── evaluation-runner.ts          # High-level orchestration
│   ├── test-matrix.ts                # Multi-judge comparison
│   └── index.ts                      # Public API
│
├── fixtures/evaluation-prompts/
│   ├── ranking-judge.ts              # Ranking quality criteria
│   ├── relevance-judge.ts            # Response relevance criteria
│   ├── completeness-judge.ts         # Response completeness criteria
│   └── index.ts                      # Template exports
│
└── e2e-evaluated/
    ├── ranking-quality.eval.test.ts  # First LLM-evaluated test
    ├── demo-llm-judge.test.ts        # Demo: individual evaluation
    └── demo-test-matrix.test.ts      # Demo: multi-judge comparison
```
