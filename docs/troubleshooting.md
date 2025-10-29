# Troubleshooting Guide

Solutions to common issues with the BMAD MCP Server.

> **Quick fix:** Most issues are solved by restarting your AI client after configuration changes.

## Quick Diagnostics

Before diving into specific issues, try these:

1. **Restart your AI client completely** (not just reload)
2. **Check Node.js version:** `node --version` (must be 18+)
3. **Verify configuration syntax** (valid JSON, no trailing commas)
4. **Check the basics:** `bmad *list-agents` to verify server is responding

---

## Common Issues

### Server Not Responding

**Symptoms:**
- No response when typing `bmad` commands
- AI client can't connect to server
- Timeout errors

**Solutions:**

**1. Restart your AI client properly**

- **VS Code:** Cmd/Ctrl+Shift+P → "Developer: Reload Window"
- **Claude Desktop:** Quit completely (not just close), then reopen
- **Cursor:** Restart application

**2. Verify configuration location and syntax**

Check your configuration file:
- **VS Code:** `.vscode/settings.json` or User Settings
- **Claude Desktop:** `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
- **Cursor:** MCP settings file

Ensure valid JSON (no trailing commas, proper quotes):

```json
{
  "servers": {
    "bmad": {
      "command": "npx",
      "args": ["-y", "bmad-mcp-server"]
    }
  }
}
```

**3. Check Node.js version**

```bash
node --version  # Must be 18.0.0 or higher
```

If too old, update Node.js from [nodejs.org](https://nodejs.org/).

**4. Test npx directly**

```bash
npx -y bmad-mcp-server
# Should start server (won't work interactively, but shouldn't error)
```

**5. Check AI client logs**

- **VS Code:** Output panel → "GitHub Copilot Chat"
- **Claude Desktop:** Developer Console (if available)
- Look for connection errors or configuration issues

---

### Agent Not Found

**Symptoms:**
- "Agent not found" error
- Specific agent doesn't load (e.g., `bmad analyst` fails)

**Solutions:**

**1. Check agent name format**

Use lowercase-hyphen format:

```bash
# ✅ Correct
bmad analyst
bmad ux-expert
bmad bmad-master

# ❌ Wrong
bmad Analyst
bmad UX-Expert
bmad bmadMaster
```

**2. List available agents**

```bash
bmad *list-agents
```

This shows all agents the server can find. If your agent isn't listed, it's not in any BMAD location.

**3. Verify BMAD files exist**

If using custom BMAD location, ensure files exist:

```bash
# Check package defaults (always available)
ls node_modules/bmad-mcp-server/build/bmad/core/agents/

# Check user defaults
ls ~/.bmad/core/agents/

# Check project
ls ./bmad/core/agents/
```

**4. Module-qualified names**

If the agent exists in a specific module:

```bash
bmad core/analyst      # Load from 'core' module
bmad bmm/architect     # Load from 'bmm' module
```

---

### Workflow Not Executing

**Symptoms:**
- Workflow command recognized but doesn't run
- "Workflow not found" error

**Solutions:**

**1. Use asterisk prefix**

Workflows require `*` prefix:

```bash
# ✅ Correct
bmad *party-mode
bmad *workflow-status

# ❌ Wrong
bmad party-mode
```

**2. List available workflows**

```bash
bmad *list-workflows
```

**3. Check workflow name**

Workflow names are lowercase-hyphen:

```bash
bmad *party-mode        # ✅ Correct
bmad *Party-Mode        # ❌ Wrong
```

---

### BMAD Files Not Found

**Symptoms:**
- Server can't locate BMAD resources
- "BMAD directory not found" errors
- Using wrong version of agent/workflow

**Solutions:**

**1. Understand priority order**

Server searches in this order (lowest priority number wins):

1. `./bmad` (project)
2. CLI argument path
3. `BMAD_ROOT` environment variable
4. `~/.bmad` (user)
5. Package defaults (always available)

**2. Check active location**

```bash
bmad *doctor
```

This shows which BMAD locations are active and their priority.

**3. Initialize BMAD files**

Create editable BMAD files:

```bash
# User defaults (all projects)
bmad *init --user

# Project-specific
bmad *init --project
```

**4. Verify BMAD_ROOT (if set)**

If using `BMAD_ROOT`, ensure it's an absolute path:

```json
{
  "env": {
    "BMAD_ROOT": "/absolute/path/to/bmad"
  }
}
```

**VS Code users:** Can use `${workspaceFolder}`:

```json
{
  "env": {
    "BMAD_ROOT": "${workspaceFolder}"
  }
}
```

---

### Path Issues (Claude Desktop / Cursor)

**Symptoms:**
- Works in VS Code but not Claude Desktop
- Path-related errors
- Can't find files

**Solutions:**

**1. Always use absolute paths**

Claude Desktop and Cursor don't have a well-defined working directory.

```json
{
  "mcpServers": {
    "bmad": {
      "command": "node",
      "args": ["/Users/username/bmad-mcp-server/build/index.js"],
      "env": {
        "BMAD_ROOT": "/Users/username/my-project"
      }
    }
  }
}
```

**2. No workspace variables**

VS Code's `${workspaceFolder}` doesn't work in Claude Desktop or Cursor.

**3. Check file paths**

Verify paths exist:

```bash
ls /Users/username/bmad-mcp-server/build/index.js
ls /Users/username/my-project/bmad
```

---

### Build Errors (Contributors)

**Symptoms:**
- `npm run build` fails
- Missing `build/` directory
- TypeScript compilation errors

**Solutions:**

**1. Clean install**

```bash
rm -rf node_modules build
npm install
npm run build
```

**2. Check TypeScript errors**

```bash
npm run build 2>&1 | grep "error TS"
```

Fix any TypeScript errors shown.

**3. Verify import extensions**

All imports must use `.js` extensions:

```typescript
// ✅ Correct
import { foo } from './utils/bar.js';

// ❌ Wrong
import { foo } from './utils/bar';
```

**4. Check Node.js version**

```bash
node --version  # Must be 18+
```

---

### Test Failures (Contributors)

**Symptoms:**
- `npm test` shows failures
- Coverage drops
- E2E tests timeout

**Solutions:**

**1. Run specific test**

```bash
npm test -- tests/unit/manifest-loader.test.ts
```

**2. Clear test cache**

```bash
npm test -- --clearCache
npm test
```

**3. Check dependencies**

```bash
npm install
```

**4. Verbose output**

```bash
npm test -- --verbose
```

**5. E2E test issues**

```bash
# Ensure LiteLLM is running
npm run e2e:start

# Check health
npm run litellm:docker:health

# Run E2E tests
npm run test:e2e
```

---

### Linting / Formatting Errors

**Symptoms:**
- Pre-commit hooks fail
- `npm run lint` shows errors
- Code style inconsistencies

**Solutions:**

**1. Auto-fix**

```bash
npm run lint:fix
npm run format
```

**2. Check specific errors**

```bash
npm run lint 2>&1 | less
```

**3. Verify ESLint config**

Ensure `eslint.config.mjs` matches project standards.

---

## Error Messages Reference

### "Cannot find module '@modelcontextprotocol/sdk'"

**Solution:**

```bash
npm install
```

### "Permission denied"

**Solution:**

```bash
chmod +x build/index.js
# Or use: node build/index.js
```

### "ENOENT: no such file or directory"

**Solution:**

Verify the path exists:

```bash
ls -la /path/from/error
```

Use absolute paths in configuration.

### "Unexpected token"

**Solution:**

1. Check Node.js version: `node --version` (must be 18+)
2. Rebuild: `npm run build`
3. Verify `package.json` has `"type": "module"`

### "Agent/Workflow not found"

**Solution:**

1. List available: `bmad *list-agents` or `bmad *list-workflows`
2. Check name spelling (lowercase-hyphen)
3. Verify files exist at BMAD location
4. Try module-qualified name: `bmad core/analyst`

---

## Still Having Issues?

### Enable Debug Logging

Add debug statements to server code:

```typescript
console.error('[DEBUG] Variable:', variableName);
```

### Check GitHub Issues

Search existing issues: [bmad-mcp-server/issues](https://github.com/mkellerman/bmad-mcp-server/issues)

### Create a New Issue

Include:
- **Error messages** (full text)
- **Steps to reproduce**
- **Your configuration** (remove sensitive paths)
- **Environment details:**
  - OS and version
  - Node.js version (`node --version`)
  - AI client (VS Code, Claude Desktop, Cursor)
  - BMAD MCP Server version

### Additional Resources

- **Installation Guide:** [installation.md](./installation.md)
- **Development Guide:** [development.md](./development.md)
- **Architecture Guide:** [architecture.md](./architecture.md)
