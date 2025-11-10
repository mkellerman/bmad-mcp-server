# Performance SLAs

## Overview

Service Level Agreements (SLAs) for E2E test performance metrics. These thresholds ensure tests run efficiently and help detect performance regressions.

## Performance Targets

### E2E Test Execution Times (P95)

| Test Category | SLA (P95) | Rationale |
|---------------|-----------|-----------|
| Agent Loading | 30s | Complex operation involving LLM inference, MCP server communication, and agent initialization |
| Workflow Listing | 20s | Simple list operation, should be faster than agent execution |
| Simple Query | 15s | Basic information retrieval, minimal processing |
| Workflow Execution | 60s | Most complex operation, involves agent loading + workflow initialization + interaction |

### Tool Call Efficiency

| Metric | SLA | Rationale |
|--------|-----|-----------|
| Tool Calls per Operation | ≤ 3 | Efficient agents should complete tasks with minimal tool calls |
| Invalid Tool Calls | 0 | All tool calls should be valid and properly formed |
| Tool Call Success Rate | ≥ 95% | Almost all tool calls should execute successfully |

## SLA Definitions

### P95 (95th Percentile)
- **Definition**: 95% of test runs complete within this time
- **Why P95**: More reliable than average, tolerates occasional slow runs
- **Measurement**: Calculated from multiple test runs (minimum 5 recommended)

### Agent Loading SLA: 30 seconds

**Components**:
1. LLM inference (~5-10s)
2. MCP server startup (~2-5s)
3. Tool calling overhead (~3-5s)
4. Agent initialization (~5-10s)
5. Session analysis (~1-2s)

**Rationale**: 
- Copilot CLI includes network latency and LLM processing
- Agent loading requires multiple tool calls
- MCP server may need cold start
- 30s provides buffer for variance while remaining acceptable for testing

**Failure Actions**:
- P95 > 40s: Investigate LLM performance or MCP server issues
- P95 > 60s: Critical regression, block release

### Workflow Listing SLA: 20 seconds

**Components**:
1. LLM inference (~5-10s)
2. MCP list operation (~1-2s)
3. Session analysis (~1-2s)

**Rationale**:
- Simpler than agent loading
- No agent initialization required
- Should complete faster than full agent execution

**Failure Actions**:
- P95 > 25s: Check MCP server performance
- P95 > 35s: Critical regression

### Simple Query SLA: 15 seconds

**Components**:
1. LLM inference (~5-10s)
2. MCP query operation (~1-3s)
3. Session analysis (~1-2s)

**Rationale**:
- Simplest operation
- Minimal processing required
- Should be fastest test category

**Failure Actions**:
- P95 > 20s: Check LLM response times
- P95 > 30s: Critical regression

### Workflow Execution SLA: 60 seconds

**Components**:
1. LLM inference (~10-15s)
2. Agent loading (~10-15s)
3. Workflow initialization (~5-10s)
4. Workflow interaction (~10-15s)
5. Session analysis (~2-3s)

**Rationale**:
- Most complex operation
- Multiple sequential steps
- Requires full agent context
- Interactive workflow session

**Failure Actions**:
- P95 > 75s: Investigate workflow performance
- P95 > 90s: Critical regression

## Monitoring Approach

### Baseline Establishment

1. **Clean Environment**: Run on stable build with no other processes
2. **Multiple Runs**: Execute each test 5-10 times
3. **Statistical Analysis**: Calculate P50, P95, P99, mean, stddev
4. **Baseline Storage**: Save results to `test-results/performance-metrics/baseline.json`

```bash
# Run benchmarks multiple times
for i in {1..5}; do npm run test:e2e:benchmark; done

# Establish baseline
npm run test:performance:baseline
```

### Continuous Monitoring

1. **Pre-Release**: Run performance tests before each release
2. **Dashboard**: Review `npm run test:performance:dashboard`
3. **Trend Analysis**: Compare current vs baseline
4. **Regression Detection**: Alert on significant degradation

### Regression Thresholds

| Severity | P95 Delta | Action |
|----------|-----------|--------|
| None | < +10% | Pass, continue |
| Minor | +10% to +20% | Log warning, monitor |
| Moderate | +20% to +30% | Investigate before release |
| Critical | > +30% | Block release, fix required |

## Performance Optimization Guidelines

### When Tests Are Too Slow

**LLM Performance** (> 50% of time):
- Check network connectivity
- Consider using faster model if available
- Review prompt complexity

**MCP Server** (> 20% of time):
- Check server startup time
- Review server initialization code
- Consider connection pooling

**Tool Calling** (> 15% of time):
- Reduce tool call frequency
- Optimize tool implementations
- Cache repetitive operations

**Session Analysis** (> 10% of time):
- Optimize JSONL parsing
- Reduce session file size
- Parallelize analysis where possible

### Acceptable Variance

**Normal Variance**: ±10-15%
- LLM inference is non-deterministic
- Network latency varies
- System load affects timing

**Investigate if**: Consistent degradation across multiple runs
**Don't over-optimize**: Single slow run is acceptable

## SLA Review Process

### Quarterly Review
- Analyze performance trends
- Update SLAs based on infrastructure changes
- Consider new optimization opportunities

### After Major Changes
- Re-establish baseline
- Review SLA appropriateness
- Document performance impacts

## References

- [Performance Tracking](./performance-tracking.md)
- [Performance Dashboard](./performance-dashboard.md)
- [E2E Testing Guide](./copilot-cli-session-analysis.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-09 | Initial SLA definitions |
