# Quick Start: E2E Inspection Tool

## TL;DR - Run This Now

```bash
# From project root
python tests/manual/inspect_e2e_prompts.py
```

This will show you:
1. ✅ What prompts are sent to Copilot
2. ✅ What responses come back
3. ✅ How agents are discovered and loaded
4. ✅ How workflows are discovered
5. ✅ Complete conversation flows

## What It Does

Runs 5 visual tests showing the E2E flow:

1. **Agent Discovery** - Copilot finding agent prompts
2. **Agent Loading** - Loading analyst agent with manifest data
3. **Agent Identification** - Copilot selecting the right agent
4. **Workflow Discovery** - Finding workflow tools
5. **Full Conversation** - Complete multi-step interaction

## Example Output

```
╔════════════════════════════════════════════════════════════════╗
║   BMAD MCP E2E Prompt/Response Inspection Tool                ║
╚════════════════════════════════════════════════════════════════╝

✓ litellm is available - real API calls will be made

================================================================================
TEST 1: Agent Discovery Flow
================================================================================

Step 1: Asking Copilot to help find a business analyst agent

╭─ Input to Copilot ─────────────────────────────────────╮
│ Task: I need help from a business analyst...           │
│ Available Tools: list_prompts, get_prompt, list_tools  │
╰─────────────────────────────────────────────────────────╯

→ Making API call to GitHub Copilot...

╭─ Response from Copilot ────────────────────────────────╮
│ {                                                       │
│   "tool": "list_prompts",                               │
│   "why": "To see available BMAD agents",                │
│   "confidence": 0.95                                    │
│ }                                                       │
╰─────────────────────────────────────────────────────────╯

✓ Copilot selected tool: list_prompts
```

## Requirements

```bash
pip install rich      # For beautiful output
pip install litellm   # For Copilot API calls
```

## Save Output to File

```bash
# Save all output for inspection
python tests/manual/inspect_e2e_prompts.py | tee e2e_inspection.log

# Just save without terminal output
python tests/manual/inspect_e2e_prompts.py > e2e_inspection.log 2>&1
```

## Troubleshooting

### "litellm not available"
```bash
pip install litellm
```

### API Errors
Ensure you have GitHub Copilot access.

### JSON Parsing Errors
These are expected! The LLM sometimes returns prose. This is normal.

## Next Steps

After running the inspection tool:

1. **Review the output** - See what prompts/responses look like
2. **Check manifest data** - Verify agent names match (Mary, Winston, etc.)
3. **Run E2E tests** - `pytest tests/e2e/ -v`
4. **Read full docs** - See `README_E2E_INSPECTION.md`

---

**That's it! Just run it and inspect.** 🔍
