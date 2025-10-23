#!/bin/bash
#
# E2E Integration Tests for BMAD MCP Server
# Tests the server via GitHub Copilot CLI with MCP protocol
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
PROJECT_ROOT="/Users/mkellerman/GitHub/bmad-mcp-server"
TEST_DIR="/tmp/bmad-e2e-test-$$"
LOG_DIR="$PROJECT_ROOT/.logs"
MCP_CONFIG_DIR="$TEST_DIR/.vscode"
COPILOT_CMD="copilot"

# Test results tracking
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Setup function
setup() {
    echo "Setting up E2E test environment..."
    
    # Create test directory
    mkdir -p "$TEST_DIR"
    mkdir -p "$MCP_CONFIG_DIR"
    mkdir -p "$LOG_DIR"
    
    # Create MCP configuration
    cat > "$MCP_CONFIG_DIR/mcp.json" << 'MCPEOF'
{
  "servers": {
    "bmad": {
      "command": "uv",
      "args": [
        "run",
        "--directory",
        "/Users/mkellerman/GitHub/bmad-mcp-server",
        "bmad-mcp-server"
      ]
    }
  }
}
MCPEOF
    
    echo "Test directory: $TEST_DIR"
    echo "Log directory: $LOG_DIR"
    cd "$TEST_DIR"
}

# Cleanup function
cleanup() {
    echo ""
    echo "Cleaning up test environment..."
    if [ -d "$TEST_DIR" ]; then
        rm -rf "$TEST_DIR"
    fi
}

# Test execution helper
run_test() {
    local test_name="$1"
    local prompt="$2"
    local expected_pattern="$3"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    echo ""
    echo "=========================================="
    echo "Test $TESTS_RUN: $test_name"
    echo "=========================================="
    echo "Prompt: $prompt"
    echo ""
    
    # Run copilot command and capture output
    local output_file="$TEST_DIR/test_${TESTS_RUN}_output.txt"
    
    if timeout 60 $COPILOT_CMD -p "$prompt" \
        --allow-tool 'bmad' \
        --log-level debug \
        --log-dir "$LOG_DIR" > "$output_file" 2>&1; then
        
        local output=$(cat "$output_file")
        
        # Check if expected pattern is in output
        if echo "$output" | grep -q "$expected_pattern"; then
            echo -e "${GREEN}✓ PASS${NC}: Found expected pattern"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            return 0
        else
            echo -e "${RED}✗ FAIL${NC}: Expected pattern not found"
            echo "Expected: $expected_pattern"
            echo "Output excerpt:"
            cat "$output_file" | head -50
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    else
        echo -e "${RED}✗ FAIL${NC}: Command timed out or failed"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Test: MCP Server Connects (checks logs instead of output)
test_server_connects() {
    echo ""
    echo "=========================================="
    echo "Test: MCP Server Connects"
    echo "=========================================="
    TESTS_RUN=$((TESTS_RUN + 1))
    
    # Clear old logs
    rm -f "$LOG_DIR"/*.log 2>/dev/null || true
    
    # Trigger server connection with a simple query
    local output_file="$TEST_DIR/test_${TESTS_RUN}_output.txt"
    timeout 30 $COPILOT_CMD -p "list available tools" \
        --allow-tool 'bmad' \
        --log-level debug \
        --log-dir "$LOG_DIR" > "$output_file" 2>&1 || true
    
    # Check if server logs were created (proves server connected)
    sleep 2  # Give logs time to flush
    local latest_log=$(ls -t "$LOG_DIR"/*.log 2>/dev/null | head -1)
    
    if [ -n "$latest_log" ] && grep -q "Starting MCP client for bmad" "$latest_log"; then
        echo -e "${GREEN}✓ PASS${NC}: MCP server connected"
        echo "Log shows: $(grep 'Starting MCP client for bmad' "$latest_log" | head -1)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: No evidence of server connection"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test: Log Files Created
test_logs_created() {
    echo ""
    echo "=========================================="
    echo "Test: Log Files Created"
    echo "=========================================="
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if [ -n "$(ls -A $LOG_DIR 2>/dev/null)" ]; then
        echo -e "${GREEN}✓ PASS${NC}: Log files created"
        echo "Logs found:"
        ls -lh "$LOG_DIR" | tail -5
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: No log files found"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test: Server Initialization in Logs
test_server_initialization() {
    echo ""
    echo "=========================================="
    echo "Test: Server Initialization"
    echo "=========================================="
    TESTS_RUN=$((TESTS_RUN + 1))
    
    local latest_log=$(ls -t "$LOG_DIR"/*.log 2>/dev/null | head -1)
    
    if [ -z "$latest_log" ]; then
        echo -e "${RED}✗ FAIL${NC}: No log file found"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    echo "Checking log: $latest_log"
    
    if grep -q "Starting BMAD MCP Server" "$latest_log" && \
       grep -q "BMAD MCP Server initialized successfully" "$latest_log"; then
        echo -e "${GREEN}✓ PASS${NC}: Server initialized correctly"
        echo "Log excerpt:"
        grep "BMAD" "$latest_log" | head -5
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: Server initialization messages not found"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test: MCP Protocol Compliance
test_mcp_protocol() {
    echo ""
    echo "=========================================="
    echo "Test: MCP Protocol Compliance"
    echo "=========================================="
    TESTS_RUN=$((TESTS_RUN + 1))
    
    local latest_log=$(ls -t "$LOG_DIR"/*.log 2>/dev/null | head -1)
    
    if [ -z "$latest_log" ]; then
        echo -e "${RED}✗ FAIL${NC}: No log file found"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    # Check for MCP protocol messages
    if grep -q "ListToolsRequest\|list_tools" "$latest_log" || \
       grep -q "ListPromptsRequest\|list_prompts" "$latest_log"; then
        echo -e "${GREEN}✓ PASS${NC}: MCP protocol messages found"
        echo "Protocol interactions:"
        grep -E "ListToolsRequest|list_tools|ListPromptsRequest|list_prompts" "$latest_log" | head -3
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: No MCP protocol messages found"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Print summary
print_summary() {
    echo ""
    echo "=========================================="
    echo "Test Summary"
    echo "=========================================="
    echo "Tests run:    $TESTS_RUN"
    echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}All tests passed! ✓${NC}"
        return 0
    else
        echo -e "${RED}Some tests failed! ✗${NC}"
        return 1
    fi
}

# Main test execution
main() {
    echo "BMAD MCP Server E2E Integration Tests"
    echo "======================================"
    echo ""
    
    # Check prerequisites
    if ! command -v copilot &> /dev/null; then
        echo -e "${RED}Error: copilot CLI not found${NC}"
        echo "Please install GitHub Copilot CLI"
        exit 1
    fi
    
    if ! command -v uv &> /dev/null; then
        echo -e "${RED}Error: uv not found${NC}"
        echo "Please install uv: https://github.com/astral-sh/uv"
        exit 1
    fi
    
    # Run tests
    trap cleanup EXIT
    setup
    
    test_server_connects
    test_logs_created
    test_server_initialization
    test_mcp_protocol
    
    print_summary
}

# Run main function
main "$@"
