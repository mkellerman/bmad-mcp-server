# Troubleshooting Guide

Common issues and solutions for the BMAD MCP Server.

## Installation Issues

### Server Not Found

**Symptoms:**

- AI client can't connect to BMAD server
- No response when typing `bmad` commands

**Solutions:**

1. **Restart your AI client** after configuration
   - VS Code: Reload window (Cmd/Ctrl + Shift + P → "Reload Window")
   - Claude Desktop: Quit and restart the application
   - Cursor: Restart the application

2. **Verify absolute paths** in configuration

   ```json
   // ❌ Wrong (relative path)
   "args": ["./build/index.js"]

   // ✅ Correct (absolute path)
   "args": ["/Users/username/bmad-mcp-server/build/index.js"]
   ```

3. **Check Node.js version**

   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

4. **Ensure build directory exists**
   ```bash
   cd /path/to/bmad-mcp-server
   npm run build
   ls build/  # Should see index.js
   ```

### Build Errors

**Symptoms:**

- `npm run build` fails
- Missing build/ directory

**Solutions:**

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Check Node.js version**

   ```bash
   node --version  # Must be 18+
   ```

3. **Clean and rebuild**

   ```bash
   rm -rf node_modules build
   npm install
   npm run build
   ```

4. **Check for TypeScript errors**
   ```bash
   npm run build 2>&1 | grep error
   ```

### Import Errors

**Symptoms:**

- `ERR_MODULE_NOT_FOUND`
- `Cannot find module`

**Solutions:**

1. **Verify package.json has ESM config**

   ```json
   {
     "type": "module"
   }
   ```

2. **Check import extensions**
   - All imports must use `.js` extensions (not `.ts`)

   ```typescript
   // ✅ Correct
   import { foo } from './utils/bar.js';

   // ❌ Wrong
   import { foo } from './utils/bar';
   ```

3. **Verify tsconfig.json**
   ```json
   {
     "compilerOptions": {
       "module": "ESNext",
       "moduleResolution": "node"
     }
   }
   ```

## Runtime Issues

### BMAD Root Not Found

**Symptoms:**

- Server can't find BMAD templates
- Error: "BMAD directory not found"

**Solutions:**

1. **Check BMAD discovery order**
   The server looks in this order:
   - `./bmad` (current workspace)
   - CLI argument path
   - `BMAD_ROOT` environment variable
   - `~/.bmad` (user defaults)
   - Package defaults (read-only)

2. **Verify BMAD_ROOT is set correctly**

   ```json
   {
     "env": {
       "BMAD_ROOT": "/absolute/path/to/your/project"
     }
   }
   ```

3. **Initialize templates**

   ```bash
   bmad *init --project  # Copy to ./bmad
   bmad *init --user     # Copy to ~/.bmad
   ```

4. **Check active location**
   ```bash
   bmad *discover
   ```

### Workflows Not Executing

**Symptoms:**

- Workflow command recognized but nothing happens
- "Workflow not found" errors

**Solutions:**

1. **Verify workflow name**

   ```bash
   bmad *list-workflows  # See all available workflows
   ```

2. **Check manifest file**
   Ensure workflow is listed in `src/bmad/_cfg/workflow-manifest.csv`

3. **Verify workflow file exists**

   ```bash
   ls src/bmad/*/workflows/*/workflow.yaml
   ```

4. **Check YAML syntax**
   Ensure workflow YAML is valid

### Agent Not Loading

**Symptoms:**

- `bmad analyst` doesn't work
- Agent not found errors

**Solutions:**

1. **List available agents**

   ```bash
   bmad *list-agents
   ```

2. **Check agent name**
   - Use lowercase-hyphen format
   - Examples: `analyst`, `bmad-master`, `ux-expert`

3. **Verify manifest**
   Check `src/bmad/_cfg/agent-manifest.csv`

## Configuration Issues

### Claude Desktop Specific

**Symptoms:**

- Works in VS Code but not Claude Desktop
- Path-related errors in Claude

**Solutions:**

1. **Use absolute paths everywhere**

   ```json
   {
     "command": "node",
     "args": ["/absolute/path/to/build/index.js"],
     "env": {
       "BMAD_ROOT": "/absolute/path/to/project"
     }
   }
   ```

2. **Check config file location**
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

3. **Restart Claude Desktop**
   - Fully quit (not just close window)
   - Restart application

### VS Code Copilot Specific

**Symptoms:**

- Server not appearing in Copilot
- Configuration not recognized

**Solutions:**

1. **Check settings location**
   - Settings → Extensions → GitHub Copilot → MCP Servers
   - Or edit `.vscode/settings.json`

2. **Use workspace variables**

   ```json
   {
     "args": ["${workspaceFolder}/build/index.js"],
     "env": {
       "BMAD_ROOT": "${workspaceFolder}"
     }
   }
   ```

3. **Reload VS Code window**
   - Cmd/Ctrl + Shift + P
   - "Developer: Reload Window"

## Performance Issues

### Slow Response Times

**Symptoms:**

- Commands take a long time to execute
- Timeouts

**Solutions:**

1. **Check file system performance**
   - Slow network drives can cause delays
   - Use local BMAD_ROOT when possible

2. **Verify LLM performance**
   - For E2E tests, check LiteLLM container

   ```bash
   npm run litellm:docker:health
   ```

3. **Check for large file reads**
   - Review workflow YAML for excessive file operations

## Development Issues

### Tests Failing

**Symptoms:**

- `npm test` shows failures
- Coverage drops unexpectedly

**Solutions:**

1. **Run specific test**

   ```bash
   npm test -- tests/unit/manifest-loader.test.ts
   ```

2. **Check for missing dependencies**

   ```bash
   npm install
   ```

3. **Clear Jest cache**

   ```bash
   npm test -- --clearCache
   ```

4. **Review test output**
   ```bash
   npm test -- --verbose
   ```

### Linting Errors

**Symptoms:**

- Pre-commit hooks fail
- `npm run lint` shows errors

**Solutions:**

1. **Auto-fix when possible**

   ```bash
   npm run lint:fix
   npm run format
   ```

2. **Review specific errors**

   ```bash
   npm run lint 2>&1 | less
   ```

3. **Check ESLint config**
   - Verify `eslint.config.mjs` is correct
   - Ensure rules match project standards

## Still Having Issues?

1. **Check existing issues**
   - [GitHub Issues](https://github.com/mkellerman/bmad-mcp-server/issues)

2. **Review documentation**
   - [Installation Guide](./installation.md)
   - [Development Guide](./development.md)

3. **Enable debug logging**
   Add to your code:

   ```typescript
   console.error('[DEBUG]', variableName);
   ```

4. **Create a new issue**
   - Include error messages
   - Describe steps to reproduce
   - Share your configuration (remove sensitive paths)
   - Mention your environment (OS, Node version, AI client)

## Common Error Messages

### "Cannot find module '@modelcontextprotocol/sdk'"

**Solution:** Install dependencies

```bash
npm install
```

### "Permission denied"

**Solution:** Check file permissions

```bash
chmod +x build/index.js
```

### "ENOENT: no such file or directory"

**Solution:** Verify paths are absolute and files exist

```bash
ls -la /path/mentioned/in/error
```

### "Unexpected token"

**Solution:** Ensure Node.js version is 18+

```bash
node --version
npm run build  # Rebuild if needed
```
