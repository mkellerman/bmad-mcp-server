# BMAD MCP Server - Quick Reference

**Generated:** October 24, 2025

## Quick Commands

```bash
# Discovery
bmad *list-agents          # Show all 11 agents
bmad *list-workflows       # Show all 36+ workflows
bmad *help                 # Command reference

# Load Agents
bmad                       # bmad-master (default)
bmad analyst              # Business Analyst (Mary)
bmad architect            # Solution Architect (Winston)
bmad dev                  # Senior Developer (Amelia)
bmad tea                  # Test Architect (Murat)
bmad pm                   # Product Manager (John)

# Popular Workflows
bmad *party-mode          # Multi-agent discussion
bmad *brainstorming       # Creative ideation
bmad *document-project    # This workflow!
bmad *workflow-status     # Check progress
```

## Architecture at a Glance

```
AI Assistant → MCP Protocol → BMAD Server → BMAD Framework
                              ├─ UnifiedBMADTool (routing)
                              ├─ ManifestLoader (discovery)
                              └─ FileReader (secure access)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/mcp_server.py` | Main MCP server, protocol handlers |
| `src/unified_tool.py` | Command routing, validation, fuzzy matching |
| `src/loaders/manifest_loader.py` | CSV manifest parsing |
| `src/utils/file_reader.py` | Secure file reading |
| `src/bmad/_cfg/*.csv` | Agent/workflow/task manifests |
| `src/bmad/bmm/config.yaml` | BMM module configuration |

## Development Quick Start

```bash
# Setup
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Test
pytest                      # All tests (fast)
pytest tests/unit/         # Unit tests only
pytest tests/e2e/          # E2E with Copilot

# Quality
black src/ tests/          # Format
pytest --cov=src           # Coverage
```

## Adding Resources

### New Agent
1. Create `src/bmad/{module}/agents/{name}.md`
2. Add to `src/bmad/_cfg/agent-manifest.csv`
3. Restart server

### New Workflow
1. Create `src/bmad/{module}/workflows/{phase}/{name}/`
2. Add `workflow.yaml`, `instructions.md`, `template.md`
3. Add to `src/bmad/_cfg/workflow-manifest.csv`
4. Restart server

## Security Checklist

- ✅ Path traversal protection (FileReader)
- ✅ Input validation (dangerous chars, length, format)
- ✅ Name pattern enforcement (lowercase + hyphens)
- ✅ Existence validation (agents/workflows must exist)
- ✅ Error handling (helpful messages, suggestions)

## Testing Levels

| Level | Speed | Purpose | Count |
|-------|-------|---------|-------|
| Unit | Fast | Isolated logic | ~20 |
| Integration | Medium | Component integration | ~15 |
| E2E | Slow | Full workflow with AI | ~10 |

## Common Patterns

### Command Validation Flow
```
Input → Security Check → Length Check → Pattern Check → 
Existence Check → Fuzzy Match (if error) → Suggest
```

### Agent Loading Flow
```
Command → Manifest Lookup → Read Agent File → 
Format Response → Return to AI
```

### Workflow Execution Flow
```
Command → Manifest Lookup → Read Workflow YAML → 
Read Instructions → Format Response → Return to AI
```

## Error Codes

| Code | Meaning |
|------|---------|
| `INVALID_CHARACTERS` | Dangerous chars in input |
| `NOO_ASCII_CHARACTERS` | Non-ASCII detected |
| `NAME_TOO_SHORT` | Less than 2 chars |
| `NAME_TOO_LONG` | More than 50 chars |
| `INVALID_NAME_FORMAT` | Pattern violation |
| `UNKNOWN_AGENT` | Agent not in manifest |
| `UNKNOWN_WORKFLOW` | Workflow not in manifest |
| `MISSING_ASTERISK` | Forgot * for workflow |
| `CASE_MISMATCH` | Wrong case |

## Performance Targets

- Manifest loading: <50ms
- Agent loading: <100ms
- Workflow loading: <150ms
- Fuzzy matching: <10ms
- Total request: <200ms

## Useful Snippets

### Run Specific Test
```bash
pytest tests/unit/test_unified_tool.py::TestUnifiedTool::test_parse_agent_command -v
```

### Debug MCP Response
```python
result = await unified_tool.execute("analyst")
print(json.dumps(result, indent=2))
```

### Check Coverage for Module
```bash
pytest --cov=src.unified_tool --cov-report=term-missing
```

### Test Against Real Copilot
```bash
pytest tests/e2e/test_copilot_agent_activation.py -v -s
```

## Resources

- Full Documentation: `docs/bmm-index.md`
- Test README: `tests/README.md`
- Main README: `README.md`
- Agent Aliases: `docs/AGENT_ALIASES.md`

---

**For complete documentation, see:** `docs/bmm-index.md`
