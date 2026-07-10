#!/bin/bash
# Stability test: Run E2E agent tests 10 times and collect results

echo "🔄 Running E2E Agent Tests 10 Times for Stability Analysis"
echo "=========================================================="
echo ""

RESULTS_DIR="test-results/stability-test"
SUMMARY_FILE="${RESULTS_DIR}/summary.txt"

# Clear previous results
rm -f ${RESULTS_DIR}/run-*.txt
rm -f ${RESULTS_DIR}/junit-*.xml
rm -f ${SUMMARY_FILE}

# Initialize summary
echo "E2E Agent Tests - Stability Analysis" > ${SUMMARY_FILE}
echo "Timestamp: $(date)" >> ${SUMMARY_FILE}
echo "========================================" >> ${SUMMARY_FILE}
echo "" >> ${SUMMARY_FILE}

TOTAL_RUNS=10
PASSED_RUNS=0
FAILED_RUNS=0

for i in $(seq 1 ${TOTAL_RUNS}); do
  echo "📊 Run ${i}/${TOTAL_RUNS} - $(date +%H:%M:%S)"
  
  # Clean test results before each run
  npm run test:clean > /dev/null 2>&1
  
  # Run tests and capture output
  OUTPUT_FILE="${RESULTS_DIR}/run-${i}.txt"
  npm run test:e2e:agents > ${OUTPUT_FILE} 2>&1
  EXIT_CODE=$?
  
  # Copy junit report if it exists
  if [ -f "test-results/junit.xml" ]; then
    cp test-results/junit.xml ${RESULTS_DIR}/junit-${i}.xml
  fi
  
  # Parse results
  PASS_COUNT=$(grep -o "Tests.*passed" ${OUTPUT_FILE} | grep -o "[0-9]* passed" | grep -o "[0-9]*" || echo "0")
  FAIL_COUNT=$(grep -o "[0-9]* failed" ${OUTPUT_FILE} | grep -o "[0-9]*" || echo "0")
  
  # Update summary
  if [ ${EXIT_CODE} -eq 0 ]; then
    STATUS="✅ PASS"
    PASSED_RUNS=$((PASSED_RUNS + 1))
  else
    STATUS="❌ FAIL"
    FAILED_RUNS=$((FAILED_RUNS + 1))
  fi
  
  echo "Run ${i}: ${STATUS} (Exit: ${EXIT_CODE}, Passed: ${PASS_COUNT}, Failed: ${FAIL_COUNT})" | tee -a ${SUMMARY_FILE}
  
  # Brief pause between runs
  sleep 2
done

echo "" | tee -a ${SUMMARY_FILE}
echo "========================================" | tee -a ${SUMMARY_FILE}
echo "Final Results:" | tee -a ${SUMMARY_FILE}
echo "  Total Runs: ${TOTAL_RUNS}" | tee -a ${SUMMARY_FILE}
echo "  Passed: ${PASSED_RUNS} ($(( PASSED_RUNS * 100 / TOTAL_RUNS ))%)" | tee -a ${SUMMARY_FILE}
echo "  Failed: ${FAILED_RUNS} ($(( FAILED_RUNS * 100 / TOTAL_RUNS ))%)" | tee -a ${SUMMARY_FILE}
echo "" | tee -a ${SUMMARY_FILE}

if [ ${FAILED_RUNS} -eq 0 ]; then
  echo "✅ All runs passed! Tests are stable." | tee -a ${SUMMARY_FILE}
else
  echo "⚠️  Instability detected! ${FAILED_RUNS} runs failed." | tee -a ${SUMMARY_FILE}
fi

echo ""
echo "📄 Detailed results saved to: ${RESULTS_DIR}/"
echo "📊 Summary: ${SUMMARY_FILE}"
