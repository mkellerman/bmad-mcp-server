# Test Operation Implementation Summary

**Date:** 2025-11-08  
**Branch:** feature/mcp-optimizer  
**Commit:** 5abb28b

## What Was Built

Implemented a flexible test harness for the BMAD unified tool that allows rapid iteration on execute response structures using external text files instead of hardcoded responses.

## Components

### 1. Test Operation in BMAD Tool

**File:** `src/tools/bmad-unified.ts`

**Changes:**

- Added `test` to operation enum
- Added `testScenario?: string` parameter to tool schema
- Added `handleTest()` function with dynamic file loading
- ES module compatibility (`__dirname` workaround using `fileURLToPath`)

**Functionality:**

```typescript
bmad({
  operation: 'test',
  testScenario: 'new-response-v1', // or any scenario name
});
```

**Error Handling:**

- File not found: Clear message with expected path
- Invalid scenario: Helpful instructions to create file
- Read errors: Exception details

### 2. Test Response Files

**Directory:** `tests/fixtures/test-responses/`

**Files Created:**

- `new-response-v1.txt` - Complete proposed execute response structure (debug agent Diana)
- `minimal-response.txt` - Simple example demonstrating flexibility
- `README.md` - Comprehensive documentation of the system

**Format:**

- Plain text files with `.txt` extension
- No special parsing or escaping required
- UTF-8 encoded
- Any content format (markdown, plain text, formatted prompts)

### 3. Test Script

**File:** `scripts/test-new-response.mjs`

**Usage:**

```bash
node scripts/test-new-response.mjs [scenario-name]

# Examples:
node scripts/test-new-response.mjs                    # uses default: new-response-v1
node scripts/test-new-response.mjs minimal-response   # loads minimal-response.txt
node scripts/test-new-response.mjs workflow-response  # shows error if not exists
```

**Output:**

- Scenario name
- Full response text
- Status message
- Next steps instructions

### 4. Documentation

**File:** `docs/execute-response-proposal.md`

Complete proposal document showing:

- Current problem (2 tool calls for execute)
- Proposed solution (1 call with structured data)
- TypeScript response structure
- Agent execution example
- Workflow execution example
- Benefits and implementation notes

## How It Works

### File Loading Flow

1. User calls test operation with scenario name
2. `handleTest()` constructs file path:
   ```
   {project-root}/tests/fixtures/test-responses/{scenario}.txt
   ```
3. Check if file exists
4. Read file contents (UTF-8)
5. Return as TextContent
6. If file not found or error, return helpful error message

### Path Resolution

```typescript
// __dirname is in build/tools/ after compilation
const projectRoot = join(__dirname, '..', '..'); // Go up to project root
const responsePath = join(
  projectRoot,
  'tests',
  'fixtures',
  'test-responses',
  `${scenario}.txt`,
);
```

This ensures files are always loaded from the source tree, not the build directory.

## Benefits

### Rapid Iteration

- Add new test scenarios by creating text files
- No code changes required
- No rebuilding needed (files loaded at runtime)
- Easy comparison of different formats

### Flexibility

- Any content format (markdown, plain text, XML, JSON-like structures)
- No escaping or special formatting required
- Version control friendly
- Simple to edit in any text editor

### Testing

- Validate different execute response structures
- Test how LLMs respond to various prompt formats
- Experiment with activation sequences
- Compare persona descriptions

## Example: Adding a New Test Scenario

```bash
# 1. Create new test file
cat > tests/fixtures/test-responses/workflow-response.txt << 'EOF'
📋 **Workflow Activated: Product Brief**

## WORKFLOW STEPS
1. Gather product vision
2. Define target users
3. Outline key features
4. Set success metrics

▶️ **BEGIN WORKFLOW**
Let's start with step 1...
EOF

# 2. Test it immediately (no rebuild needed!)
node scripts/test-new-response.mjs workflow-response

# 3. Or use from MCP client
bmad({ operation: "test", testScenario: "workflow-response" })
```

## Current Test Scenarios

### new-response-v1

**Purpose:** Comprehensive agent activation format  
**Content:**

- Agent identity (Diana, Debug Specialist)
- 10-step activation sequence with IMMEDIATE ACTION
- Menu handlers for workflows
- Critical rules
- 14 available commands
- User request integration
- Clear action directive

**Use Case:** Testing proposed execute response structure that eliminates the 2-call inefficiency

### minimal-response

**Purpose:** Simple example  
**Content:** Basic formatted text with quick info  
**Use Case:** Demonstrating flexibility of the system

## Implementation Details

### ES Module Compatibility

```typescript
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

Required because ES modules don't have `__dirname` by default.

### Error Messages

- File not found: Shows expected path and instructions
- Read error: Shows exception details
- Invalid scenario: Helpful guidance to create file

### Type Safety

```typescript
interface BMADToolParams {
  operation: 'list' | 'read' | 'execute' | 'search' | 'test';
  testScenario?: string; // New parameter
  // ... other params
}
```

## Testing

All tests passing: **235/235 (100%)**

No regressions introduced.

## Next Steps

### Immediate

1. ✅ Test operation implemented
2. ✅ File-based loading working
3. ✅ Documentation complete
4. ✅ Example scenarios created

### Future

1. Add more test scenarios (workflow-response, action-focused, etc.)
2. Use test scenarios to validate different execute response formats
3. Implement actual execute response with new structure
4. Parse agent.md XML to extract activation/persona/menu
5. Format LLM-optimized text from parsed data

## Files Changed

```
docs/execute-response-proposal.md           NEW - 300+ lines
scripts/test-new-response.mjs              NEW - test script
src/tools/bmad-unified.ts                  MODIFIED - added test operation
tests/fixtures/test-responses/README.md    NEW - documentation
tests/fixtures/test-responses/new-response-v1.txt    NEW - main test scenario
tests/fixtures/test-responses/minimal-response.txt   NEW - simple example
```

## Validation

```bash
# Build succeeds
npm run build  # ✅ Success

# Test with default scenario
node scripts/test-new-response.mjs
# ✅ Loads new-response-v1.txt correctly

# Test with custom scenario
node scripts/test-new-response.mjs minimal-response
# ✅ Loads minimal-response.txt correctly

# Test error handling
node scripts/test-new-response.mjs nonexistent
# ✅ Shows helpful error message

# All tests pass
npm test
# ✅ 235/235 passing
```

## Summary

Successfully implemented a flexible test harness that allows rapid iteration on execute response structures. The system uses external text files for easy modification without code changes or rebuilding. This enables quick experimentation with different response formats to optimize the execute operation before implementing the full XML parsing and formatting logic.

The implementation is clean, type-safe, well-documented, and includes helpful error messages. Adding new test scenarios is as simple as creating a text file.
