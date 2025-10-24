#!/bin/bash

# Comprehensive test runner for BMAD MCP Server
# Run different test suites with appropriate markers

set -e

echo "=================================="
echo "BMAD MCP Server - Test Suite"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run tests
run_tests() {
    local name=$1
    local marker=$2
    local extra_args=$3
    
    echo -e "${BLUE}Running $name tests...${NC}"
    pytest -v -m "$marker" $extra_args tests/ || echo -e "${YELLOW}Some $name tests failed${NC}"
    echo ""
}

# Parse command line arguments
TEST_TYPE=${1:-all}

case $TEST_TYPE in
    unit)
        echo "Running unit tests only..."
        pytest -v tests/unit/ --cov=src --cov-report=html --cov-report=term
        ;;
    
    integration)
        echo "Running integration tests only..."
        run_tests "Integration" "integration" ""
        ;;
    
    e2e)
        echo "Running E2E tests only (requires litellm)..."
        run_tests "E2E" "e2e" "-s"
        ;;
    
    security)
        echo "Running security tests only..."
        run_tests "Security" "security" ""
        ;;
    
    performance)
        echo "Running performance tests only..."
        run_tests "Performance" "performance" "-s"
        ;;
    
    fast)
        echo "Running fast tests (unit + integration, no E2E)..."
        pytest -v tests/unit/ tests/integration/test_mcp_server_integration.py tests/integration/test_workflow_execution.py
        ;;
    
    coverage)
        echo "Running all tests with coverage..."
        pytest -v tests/ --cov=src --cov-report=html --cov-report=term-missing
        echo -e "${GREEN}Coverage report generated in htmlcov/index.html${NC}"
        ;;
    
    all)
        echo "Running ALL test suites..."
        echo ""
        
        # 1. Unit tests with coverage
        echo -e "${BLUE}1. Unit Tests (with coverage)${NC}"
        pytest -v tests/unit/ --cov=src --cov-report=html --cov-report=term
        echo ""
        
        # 2. Security tests
        echo -e "${BLUE}2. Security Tests${NC}"
        run_tests "Security" "security" ""
        
        # 3. Integration tests
        echo -e "${BLUE}3. Integration Tests${NC}"
        run_tests "Integration" "integration" ""
        
        # 4. Performance tests
        echo -e "${BLUE}4. Performance Tests${NC}"
        run_tests "Performance" "performance" "-s"
        
        # 5. E2E tests (skip if litellm not available)
        echo -e "${BLUE}5. E2E Tests (may be skipped if litellm not installed)${NC}"
        run_tests "E2E" "e2e" "-s"
        
        echo ""
        echo -e "${GREEN}=================================="
        echo "Test Suite Complete!"
        echo "==================================${NC}"
        ;;
    
    *)
        echo "Usage: $0 [unit|integration|e2e|security|performance|fast|coverage|all]"
        echo ""
        echo "Options:"
        echo "  unit         - Run unit tests only"
        echo "  integration  - Run integration tests only"
        echo "  e2e          - Run E2E tests only (requires litellm)"
        echo "  security     - Run security tests only"
        echo "  performance  - Run performance tests only"
        echo "  fast         - Run fast tests (unit + key integration)"
        echo "  coverage     - Run all tests with coverage report"
        echo "  all          - Run all test suites (default)"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"
