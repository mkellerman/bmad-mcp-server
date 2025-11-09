#!/bin/bash
# Compare test results between builds

BASELINE="${1:-test-results/junit-baseline.xml}"
CURRENT="${2:-test-results/junit.xml}"

if [ ! -f "$BASELINE" ]; then
  echo "❌ Baseline not found: $BASELINE"
  echo "Create one with: cp test-results/junit.xml test-results/junit-baseline.xml"
  exit 1
fi

if [ ! -f "$CURRENT" ]; then
  echo "❌ Current results not found: $CURRENT"
  exit 1
fi

echo "📊 Test Results Comparison"
echo "=========================="
echo ""

# Extract metrics
baseline_tests=$(grep -o 'tests="[0-9]*"' "$BASELINE" | head -1 | grep -o '[0-9]*')
baseline_failures=$(grep -o 'failures="[0-9]*"' "$BASELINE" | head -1 | grep -o '[0-9]*')
baseline_time=$(grep -o 'time="[0-9.]*"' "$BASELINE" | head -1 | grep -o '[0-9.]*')

current_tests=$(grep -o 'tests="[0-9]*"' "$CURRENT" | head -1 | grep -o '[0-9]*')
current_failures=$(grep -o 'failures="[0-9]*"' "$CURRENT" | head -1 | grep -o '[0-9]*')
current_time=$(grep -o 'time="[0-9.]*"' "$CURRENT" | head -1 | grep -o '[0-9.]*')

echo "Baseline: $baseline_tests tests, $baseline_failures failures, ${baseline_time}s"
echo "Current:  $current_tests tests, $current_failures failures, ${current_time}s"
echo ""

# Calculate differences
test_diff=$((current_tests - baseline_tests))
failure_diff=$((current_failures - baseline_failures))
time_diff=$(echo "$current_time - $baseline_time" | bc)

echo "Changes:"
[ $test_diff -ne 0 ] && echo "  Tests: ${test_diff:+$test_diff}"
[ $failure_diff -ne 0 ] && echo "  Failures: ${failure_diff:+$failure_diff}" || echo "  ✅ No new failures"
echo "  Time: ${time_diff}s"
echo ""

# Status
if [ $failure_diff -gt 0 ]; then
  echo "❌ REGRESSION: New test failures detected!"
  exit 1
elif [ $failure_diff -lt 0 ]; then
  echo "✅ IMPROVEMENT: Failures reduced!"
  exit 0
else
  echo "✅ STABLE: No regression detected"
  exit 0
fi
