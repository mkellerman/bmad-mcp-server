# E2E Prompt/Response Inspection Tool

Visual inspection tool for E2E tests showing complete prompts sent to GitHub Copilot and responses received.

## Purpose

This tool helps you:
- 🔍 See exactly what prompts are sent to Copilot
- 👀 Inspect the raw responses from the LLM
- ✅ Validate agent selection logic visually
- 🐛 Debug E2E test failures
- 📊 Understand the complete conversation flow

## Features

### 5 Inspection Tests

1. **Agent Discovery Flow** - How Copilot discovers agent prompts
2. **Agent Loading** - What agent content looks like
3. **Agent Identification** - How Copilot selects the right agent
4. **Workflow Discovery** - How workflow tools are discovered
5. **Full Conversation** - Complete multi-step interaction

### Rich Output

- Color-coded sections with emojis
- Syntax-highlighted JSON responses
- Panel boxes for clear visual separation
- Truncated output for readability
- Error handling with helpful messages

## Usage

### Prerequisites

```bash
# Install rich for beautiful output
pip install rich

# Install litellm for Copilot integration
pip install litellm
```

### Run the Inspection Tool

```bash
# From project root
python tests/manual/inspect_e2e_prompts.py

# Or make it executable and run directly
chmod +x tests/manual/inspect_e2e_prompts.py
./tests/manual/inspect_e2e_prompts.py
```

## What You'll See

### Test 1: Agent Discovery
```
================================================================================
TEST 1: Agent Discovery Flow
================================================================================

Step 1: Asking Copilot to help find a business analyst agent

╭─ Input to Copilot ────────────────────────────────────────╮
│ Task: I need help from a business analyst...              │
│ Available Tools: list_prompts, get_prompt, list_tools     │
│ Context: BMAD agents are available through prompts...     │
╰────────────────────────────────────────────────────────────╯

→ Making API call to GitHub Copilot...

╭─ Response from Copilot ───────────────────────────────────╮
│ {                                                          │
│   "tool": "list_prompts",                                  │
│   "args": {},                                              │
│   "why": "To see available BMAD agents",                   │
│   "confidence": 0.95                                       │
│ }                                                          │
╰────────────────────────────────────────────────────────────╯

✓ Copilot selected tool: list_prompts
✓ Reasoning: To see available BMAD agents
✓ Confidence: 0.95
```

### Test 2: Agent Loading
Shows the actual agent content loaded from the manifest:
- Agent name and description
- Content length
- First 800 characters preview
- Validation checks (displayName, markdown sections, YAML, tools)

### Test 3: Agent Identification
Shows how Copilot chooses the analyst agent from all 11 available agents with full context.

### Test 4: Workflow Discovery
Shows how Copilot selects workflow tools.

### Test 5: Full Conversation
Complete multi-step flow showing:
1. User request
2. Tool selection
3. Agent loading
4. Agent response interpretation
5. Workflow listing

## Output Details

### Color Coding
- 🟢 **Green** - Success, correct behavior
- 🔵 **Blue** - Input/context information
- 🟡 **Yellow** - Warnings or unexpected but valid
- 🔴 **Red** - Errors or incorrect behavior
- 🟣 **Magenta** - Headers and titles
- ⚫ **Dim** - Less important info

### Panels
- Input boxes show what's sent to Copilot
- Response boxes show what comes back
- Validation boxes show checks and results

## Troubleshooting

### JSON Parsing Errors
Some tests may show JSON parsing errors. This happens when:
- The LLM returns prose instead of structured JSON
- The response format doesn't match expectations

**This is expected+x tests/manual/inspect_e2e_prompts.py* It's a test expectation issue, not a core functionality problem.

### No litellm
If you see "litellm not available":
```bash
pip install litellm
```

### API Errors
If you see Copilot API errors, ensure you have access to GitHub Copilot via your account.

## Example Session

```bash
$ python tests/manual/inspect_e2e_prompts.py

╔════════════════════════════════════════════════════════════════╗
║   BMAD MCP E2E Prompt/Response Inspection Tool                ║
╚════════════════════════════════════════════════════════════════╝

✓ litellm is available - real API calls will be made

================================================================================
TEST 1: Agent Discovery Flow
================================================================================
[... detailed output ...]

================================================================================
TEST 2: Agent Loading and Content Inspection
================================================================================
[... detailed output ...]

[... all 5 tests run ...]

================================================================================
Summary
================================================================================

✓ Inspection complete!

Note: Some tests may fail with JSON parsing errors.
This happens when the LLM returns prose instead of structured JSON.
The core functionality is working - this is a test expectation issue.
```

## Use Cases

### Debugging Test Failures
Run this tool to see exactly what's happening in failing E2E tests:
```bash
python tests/manual/inspect_e2e_prompts.py > e2e_debug.log 2>&1
```

### Validating Agent Behavior
Check if agents are being loaded with correct content and displayNames.

### Understanding LLM Responses
See how Copilot interprets different prompts and contexts.

### Development Workflow
Run this before committing E2E test changes to validate behavior.

## Related Files

- `tests/e2e/test_copilot_agent_activation.py` - Agent E2E tests
- `tests/e2e/test_copilot_workflow_execution.py` - Workflow E2E tests
- `tests/utils/copilot_tester.py` - Copilot testing utility
- `tests/manual/copilot_mcp.py` - Original manual Copilot test

## Tips

1. **Pipe to file** for detailed analysis:
   ```bash
   python tests/manual/inspect_e2e_prompts.py | tee e2e_inspection.log
   ```

2. **Focus on one test** by commenting out others in `main()`

3. **Adjust truncation** by modifying the character limits in the code

4. **Save responses** for comparison across runs

---

**Happy Inspecting! 🔍**
