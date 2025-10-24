# Agent Name Aliases

The BMAD MCP Server supports convenient aliases for agent names to make common agents easier to access.

## Available Aliases

### Core Aliases

- **`master`** → `bmad-master`
  - The main BMAD orchestrator and task executor
  - Example: `bmad master` instead of `bmad bmad-master`

### Module-Specific Shortcuts

For agents with module prefixes (e.g., `game-architect`), you can use just the suffix if it uniquely identifies the agent within that module context:

- `architect` → May resolve to `game-architect` in game module context
- This allows shorter commands while maintaining clarity

## Usage Examples

```bash
# Load bmad-master using alias
bmad master

# Load bmad-master using full name (still works)
bmad bmad-master

# Both commands load the same agent
```

## How It Works

When you provide an agent name, the system:

1. **Checks for exact match** against canonical names in the manifest
2. **Checks built-in aliases** (like `master` → `bmad-master`)
3. **Checks module-based resolution** for shortened names
4. **Returns the canonical name** for consistent internal handling

## Benefits

- **Faster typing**: `master` is quicker than `bmad-master`
- **User-friendly**: More intuitive for common operations
- **Backward compatible**: Full names still work perfectly
- **Consistent behavior**: Aliases resolve to canonical names internally

## Adding Custom Aliases

Aliases are defined in `src/unified_tool.py` in the `_resolve_agent_alias` method:

```python
aliases = {
    "master": "bmad-master",
    # Add more aliases here
}
```

## See Also

- [Agent Manifest](../src/bmad/_cfg/agent-manifest.csv) - Full list of available agents
- [UnifiedBMADTool](../src/unified_tool.py) - Implementation details
