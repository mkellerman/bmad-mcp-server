# Quality Regression Testing

## Overview

The quality regression testing suite prevents quality degradation in new releases by comparing current quality metrics against established baselines. This ensures that code changes don't negatively impact agent behavior quality.

## Quick Start

```bash
# Run quality E2E tests (generates metrics)
npm run test:e2e:quality

# Establish baseline (after validating quality is acceptable)
npm run test:regression:baseline

# Run regression tests
npm run test:regression

# Generate quality dashboard
npm run test:quality:dashboard
```

## Workflow

### 1. Initial Setup

After implementing quality monitoring, establish your baseline:

```bash
# Run E2E quality tests to generate metrics
npm run test:e2e:quality

# Verify quality is acceptable
npm run test:quality:dashboard

# Establish baseline
npm run test:regression:baseline
```

This creates `test-results/quality-baseline.json` with current quality scores.

### 2. Pre-Release Checks

Before each release, run regression tests:

```bash
# Run quality tests
npm run test:e2e:quality

# Check for regressions
npm run test:regression

# View dashboard
npm run test:quality:dashboard
```

### 3. Handling Regressions

If regressions are detected:

**Critical Regressions (score drop >10 points):**
- ⛔ **Action Required**: Fix before release
- Investigate what changed
- Review failing test output
- Fix root cause

**Moderate Regressions (score drop 5-10 points):**
- ⚠️ **Review Required**: Evaluate if acceptable
- Check dimension-specific regressions
- Document rationale if accepting degradation
- Consider updating baseline if intentional

**Minor Regressions (score drop <5 points):**
- ⚡ **Optional**: May be acceptable variance
- LLM behavior can vary slightly
- Monitor trend over time

### 4. Updating Baseline

Update baseline when:
- Quality improvements are stable
- Architecture changes affect metrics
- New tests are added
- Intentional quality trade-offs are made

```bash
npm run test:regression:baseline
```

## Quality Thresholds

### Regression Severity Levels

| Severity | Score Delta | Symbol | Action |
|----------|-------------|--------|--------|
| Critical | ≤ -10 | ⛔ | Must fix |
| Moderate | -5 to -10 | ⚠️ | Review required |
| Minor | -1 to -5 | ⚡ | Optional |
| None | ≥ 0 | ✅ | Pass |

### Default Thresholds

- **Regression Threshold**: -10 points (tests fail if score drops >10)
- **Dimension Threshold**: -5 points (flag if any dimension drops >5)

### Customizing Thresholds

```typescript
import { QualityRegressionDetector } from '../framework/helpers';

// Stricter threshold (-5 points)
const detector = new QualityRegressionDetector(
  undefined, // default baseline path
  undefined, // default collector
  -5 // custom threshold
);
```

## Files and Structure

### Generated Files

```
test-results/
├── quality-metrics/           # Per-test historical metrics
│   ├── test-name-1.json
│   └── test-name-2.json
├── quality-baseline.json      # Baseline for regression detection
└── quality-dashboard.json     # Aggregated statistics
```

### Baseline Format

```json
[
  {
    "testName": "should-load-agent-efficiently",
    "baselineScore": 95.5,
    "baselineDimensions": {
      "toolCallAccuracy": 100,
      "parameterCompleteness": 95,
      "contextualRelevance": 90,
      "conversationCoherence": 95,
      "efficiency": 95,
      "instructionAdherence": 100
    },
    "baselineDate": "2025-11-09T20:00:00.000Z",
    "runs": 5
  }
]
```

## Regression Test Suite

The regression test suite (`tests/e2e/quality-regression.test.ts`) includes:

### 1. Baseline Exists
Verifies quality baseline has been established.

### 2. No Regressions
Checks current quality against baseline, fails if score drops >10 points.

### 3. Critical Regressions
Specifically checks for critical quality drops (>10 points).

### 4. Dimension Quality
Validates no dimension has degraded >5 points.

### 5. Quality Improvements
Reports (informational) any quality improvements.

### 6. Metrics Coverage
Ensures all baseline tests have current metrics.

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Quality Regression Check

on:
  pull_request:
    branches: [main]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Run quality tests
        run: npm run test:e2e:quality
      
      - name: Check for regressions
        run: npm run test:regression
      
      - name: Generate dashboard
        run: npm run test:quality:dashboard
      
      - name: Upload dashboard
        uses: actions/upload-artifact@v3
        with:
          name: quality-dashboard
          path: docs/quality-dashboard.md
```

### Pre-commit Hook

```bash
# .husky/pre-push
npm run test:e2e:quality
npm run test:regression
```

## Troubleshooting

### No baseline found

**Error**: `Baseline not found at test-results/quality-baseline.json`

**Solution**:
```bash
npm run test:e2e:quality
npm run test:regression:baseline
```

### No quality metrics

**Error**: `No quality metrics found`

**Solution**:
```bash
# Run E2E quality tests first
npm run test:e2e:quality
```

### All tests failing

**Possible causes**:
1. Major code changes affecting quality
2. Baseline from different environment
3. LLM model changes

**Actions**:
1. Review what changed
2. Run tests locally
3. Check if quality expectations need updating
4. Re-establish baseline if architecture changed

### Flaky regression tests

**Causes**:
- LLM behavior variance
- Environment differences
- Non-deterministic test conditions

**Solutions**:
- Increase baseline sample size (more runs)
- Adjust threshold (-15 instead of -10)
- Use median instead of current score
- Add retry logic for borderline cases

## Best Practices

### 1. Establish Good Baseline

- Run quality tests multiple times (5-10 runs)
- Verify baseline represents actual quality
- Don't baseline during development (wait for stable)

### 2. Regular Monitoring

- Run quality tests with every PR
- Review dashboard weekly
- Track trends over time

### 3. Document Changes

- Note when baseline is updated
- Document intentional quality trade-offs
- Keep changelog of quality improvements

### 4. Gradual Improvement

- Don't lower baseline to pass tests
- Focus on improving low dimensions
- Celebrate quality improvements

### 5. Version Control

- Commit baseline file to git
- Track baseline evolution
- Tag baseline with release versions

## Example Output

### Passing Regression Test

```
🔍 Quality Regression Report
════════════════════════════════════════════════════════════

✅ No regressions detected

Timestamp: 11/9/2025, 7:30:22 PM
Total Tests: 2
Passed: 2
Failed: 0

Summary:
  Critical: 0 ⛔
  Moderate: 0 ⚠️
  Minor:    0 ⚡
  None:     2 ✅
```

### Failing Regression Test

```
🔍 Quality Regression Report
════════════════════════════════════════════════════════════

❌ Quality regressions found

Timestamp: 11/9/2025, 7:30:22 PM
Total Tests: 3
Passed: 2
Failed: 1

Summary:
  Critical: 1 ⛔
  Moderate: 0 ⚠️
  Minor:    0 ⚡
  None:     2 ✅

Failing Tests:
────────────────────────────────────────────────────────────

⛔ should-load-agent-efficiently
  Current:  78.5
  Baseline: 95.5
  Delta:    -17.0 (-17.8%)
  Threshold: -10
  Severity: critical
  Dimension Regressions:
    - efficiency: 70.0 (was 95.0, Δ -25.0)
    - contextualRelevance: 75.0 (was 90.0, Δ -15.0)
```

## References

- [Quality Regression Detector](../tests/framework/helpers/quality-regression-detector.ts)
- [Regression Test Suite](../tests/e2e/quality-regression.test.ts)
- [Behavior Quality Standards](./behavior-quality-standards.md)
- [Quality Dashboard](./quality-dashboard.md)
