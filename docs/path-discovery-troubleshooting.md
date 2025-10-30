# BMAD Path Discovery Troubleshooting

This guide helps you troubleshoot path discovery issues in the BMAD MCP server.

## Quick Diagnostic

Run the doctor command to see what paths are being checked:

```bash
npm run bmad -- "*doctor"
```

This will show:
- ✓ Valid BMAD installations found
- ✗ Paths that don't exist
- ○ Paths not configured

## What Doctor Checks

For each path, doctor shows a checklist of what it's looking for:

### For v6 Installations
```
✓ _cfg/manifest.yaml (v6)
```
Looks for:
1. Directory named `_cfg`
2. File `_cfg/manifest.yaml`

### For v4 Installations
```
✓ install-manifest.yaml (v4)
```
Looks for:
1. File `install-manifest.yaml` in the root

### For Custom Installations
```
✓ agents/ or workflows/ (custom)
○ No manifest found
```
Looks for:
1. Directory named `agents/` OR `workflows/`
2. No manifest required

## Detailed Debug Logging

For verbose output showing every directory checked:

```bash
BMAD_DEBUG=1 npm run bmad -- "*doctor"
```

This shows:
- Every directory the finder checks
- What it finds (v4, v6, or custom installations)
- What it skips (hidden folders, filtered names, etc.)
- Maximum search depth (default: 3 levels)

### Debug Output Example

```
[bmad-finder] Starting search from: /Users/you/project
[bmad-finder] Max depth: 3
[bmad-finder] Checking: /Users/you/project
[bmad-finder] Scanning 14 subdirectories in project
  [bmad-finder] Checking: /Users/you/project/.bmad
  [bmad-finder] Scanning 3 subdirectories in .bmad
    [bmad-finder] Checking: /Users/you/project/.bmad/6.0.0-alpha.0/bmad
    [bmad-finder] ✓ Found v6 installation at .bmad/6.0.0-alpha.0/bmad
    [bmad-finder]   - Manifest: .bmad/6.0.0-alpha.0/bmad/_cfg/manifest.yaml
```

## Search Rules

The finder uses smart filtering to avoid scanning unnecessary directories:

### Depth 0-1 (Start + First Level)
- Scans **ALL** subdirectories
- No filtering by name

### Depth 2+ (Deeper Levels)
Only searches directories that:
- Contain 'bmad' in the name (case-insensitive), OR
- Are exactly named: `agents`, `workflows`, `tasks`, or `_cfg`

### Always Skipped
- Hidden directories (starting with `.`) unless they match search criteria
- Directories inside found installations (to prevent nested detection)

## Common Issues

### "Not Found" for workspace path

**Problem:** The workspace is checked but no BMAD installation found.

**Checklist:**
1. Do you have a `bmad/` directory in your project?
2. Does it contain `_cfg/manifest.yaml` (v6)?
3. Or does it contain `install-manifest.yaml` (v4)?
4. Or does it have `agents/` or `workflows/` folders (custom)?

**Solution:** Install BMAD or configure `BMAD_ROOT`:
```bash
# Install BMAD to your project
npx bmad-method install

# Or point to an existing installation
export BMAD_ROOT=/path/to/bmad
```

### "Directory does not exist" for ~/.bmad

**Problem:** User defaults location `~/.bmad` doesn't exist.

**This is normal** - the user defaults location is optional. It's only used if:
1. No BMAD found in workspace
2. No `BMAD_ROOT` environment variable set

**Solution:** Install BMAD globally if you want a fallback:
```bash
npx bmad-method install --global
```

### Multiple installations found

**Problem:** Doctor shows multiple `[1]`, `[2]`, `[3]` entries from the same source.

**This is normal** - BMAD supports multiple installations. The finder:
- Searches recursively (up to depth 3)
- Returns ALL found installations
- Prioritizes by: depth (shallower first) → version (v6 > v4 > custom)

**Active installation** uses the first one by priority.

### Build directory showing as installation

**Problem:** `build/` directory shows in the results with workflows.

**Explanation:** The build directory may contain compiled BMAD artifacts that look like an installation.

**Solution:** This is expected. The active installation prioritizes:
1. Locations with manifests over those without
2. Explicit inputs (CLI/ENV) over auto-detected ones

## Priority Order

Path discovery checks sources in this order:

1. **CLI arguments** (highest priority)
   - `npm run bmad -- "*doctor" /custom/path`
   
2. **Project workspace** (./bmad or ./.bmad)
   - Searches current directory recursively
   
3. **BMAD_ROOT** environment variable
   - `export BMAD_ROOT=/path/to/bmad`
   
4. **User defaults** (~/.bmad) (lowest priority)
   - Global installation fallback

Within each source, installations are prioritized by:
1. Depth (shallower = higher priority)
2. Version (v6 > v4 > unknown/custom)
3. Path (alphabetically)

## Environment Variables

- `BMAD_ROOT`: Override default search paths
- `BMAD_DEBUG=1`: Enable verbose logging for troubleshooting

## Related Commands

- `npm run bmad -- "*doctor"` - Show diagnostic information
- `npm run bmad -- "*list-agents"` - List all available agents
- `npm run bmad -- "*list-workflows"` - List all available workflows
- `npm run bmad -- "*list-modules"` - List all BMAD modules

## Still Having Issues?

1. Run `BMAD_DEBUG=1 npm run bmad -- "*doctor"` and check the logs
2. Verify your BMAD installation structure matches v4, v6, or custom format
3. Check file permissions on the BMAD directory
4. Open an issue with the debug output at: https://github.com/bmadcode/bmad-mcp-server/issues
