# Release Process

Guide for maintainers: versioning, testing, and publishing the BMAD MCP Server.

> **For contributors:** See [Development Guide](./development.md) for contribution workflow.  
> **For users:** Releases are automatic—just use `npx bmad-mcp-server@latest`.

## Versioning Strategy

This project follows [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH):

- **MAJOR** (x.0.0) - Breaking changes, incompatible API changes
- **MINOR** (0.x.0) - New features, backward compatible
- **PATCH** (0.0.x) - Bug fixes, backward compatible

**Examples:**

- `feat: add new agent` → MINOR (0.1.0 → 0.2.0)
- `fix: resolve path bug` → PATCH (0.1.0 → 0.1.1)
- `feat!: change config format` → MAJOR (0.1.0 → 1.0.0)

## Pre-Release Testing

### Automatic PR Pre-releases

Every Pull Request automatically creates a pre-release for testing on other machines.

**How it works:**

1. **Open a PR** - GitHub Actions creates pre-release tag `pr-{number}-{sha}`
2. **Bot comments** with installation instructions
3. **Test on any machine** using the pre-release:

   ```json
   {
     "servers": {
       "bmad": {
         "command": "npx",
         "args": [
           "-y",
           "git+https://github.com/mkellerman/bmad-mcp-server#main"
         ]
       }
     }
   }
   ```

4. **Auto-cleanup** when PR is merged or closed

**Benefits:**

- ✅ Test before merging
- ✅ No local installation needed on test machines
- ✅ Works with any MCP client
- ✅ Automatic cleanup

### Local Testing

Test locally before creating a PR:

```bash
# Make changes
npm run build

# Test built version
node build/index.js

# Run in dev mode
npm run dev

# Run all tests
npm test
```

---

## Creating a Release

### Pre-Release Checklist

Before creating a release:

- [ ] All tests passing (`npm test`)
- [ ] Linting clean (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] All changes committed and pushed
- [ ] Pull latest from main branch

### Release Steps

**1. Update version**

Use npm's built-in versioning:

```bash
# Patch release (0.1.0 → 0.1.1)
npm version patch

# Minor release (0.1.0 → 0.2.0)
npm version minor

# Major release (0.1.0 → 1.0.0)
npm version major
```

This automatically:

- Updates `package.json` and `package-lock.json`
- Creates git commit: "v0.1.1"
- Creates git tag: "v0.1.1"

**2. Push tag to GitHub**

```bash
git push origin main --follow-tags
```

**3. Create GitHub Release**

1. Go to [Releases](https://github.com/mkellerman/bmad-mcp-server/releases)
2. Click "Draft a new release"
3. Select tag (e.g., `v0.1.1`)
4. Title: "v0.1.1 - Brief description"
5. Release notes:
   - **Added** - New features
   - **Changed** - Improvements
   - **Fixed** - Bug fixes
   - **Breaking Changes** - If any
6. Click "Publish release"

**4. Automatic Publishing**

GitHub Actions automatically:

- Runs linting checks
- Runs unit tests
- Builds package
- Publishes to npm with provenance

**5. Verify Publication**

1. Check [npm package page](https://www.npmjs.com/package/bmad-mcp-server)
2. Verify version number
3. Test installation:
   ```bash
   npx bmad-mcp-server@latest
   ```

---

## NPM Publishing Setup

### Configure NPM Token

Required for automated npm publishing via GitHub Actions.

**Generate token:**

1. Login to [npmjs.com](https://www.npmjs.com/)
2. Account Settings → Access Tokens
3. "Generate New Token" → "Automation" type
4. Copy token (shown only once!)

**Add to GitHub:**

1. Repository Settings → Secrets → Actions
2. "New repository secret"
3. Name: `NPM_TOKEN`
4. Value: paste your token
5. "Add secret"

### Manual Publishing

If automated publishing fails:

```bash
# Login to npm
npm login

# Build
npm run build

# Publish
npm publish --access public
```

---

## Release Workflows

### Standard Release Flow

```
1. Development
   ├─ Create feature branch
   ├─ Make changes
   ├─ Create PR (auto pre-release)
   └─ Test pre-release

2. Merge to Main
   ├─ Review and approve
   └─ Merge PR

3. Create Release
   ├─ npm version [patch|minor|major]
   ├─ git push --follow-tags
   └─ Create GitHub Release

4. Automatic Publishing
   ├─ GitHub Actions runs
   ├─ Tests execute
   └─ Published to npm
```

### Hotfix Workflow

For urgent production fixes:

1. **Create hotfix branch** from main
2. **Make minimal changes**
3. **Fast-track PR** with "hotfix" label
4. **Merge and release** as PATCH version
5. **Consider backporting** to older versions if needed

---

## CHANGELOG Best Practices

### Format

Use this structure:

```markdown
## [0.2.0] - 2025-01-15

### Added

- New workflow for automated testing
- Support for custom agent configurations

### Changed

- Improved error messages in manifest loader
- Updated documentation structure

### Fixed

- Path resolution on Windows
- Memory leak in file scanner

### Deprecated

- Old configuration format (will be removed in v1.0.0)

### Breaking Changes

- Configuration format changed from X to Y
- Migration guide: [link]
```

### When to Update

- **During development** - Add entries as you work
- **Before PR** - Ensure changes are documented
- **Before release** - Review and organize entries

### Categories

- **Added** - New features
- **Changed** - Changes to existing features
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security fixes
- **Breaking Changes** - Incompatible changes

---

## Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Features (MINOR version)
feat: add support for custom templates
feat(agents): add game development specialist

# Bug fixes (PATCH version)
fix: resolve Windows path handling
fix(manifest): handle missing CSV files

# Breaking changes (MAJOR version)
feat!: change configuration format
feat(api)!: rename loadAgent to getAgent

BREAKING CHANGE: Configuration format changed.
See migration guide for details.

# Other types (no version bump)
docs: update installation guide
chore: update dependencies
refactor: simplify file reader
test: add coverage for manifest loader
perf: optimize manifest loading
```

**Commit scope:**

- Use when helpful: `feat(agents):`, `fix(workflows):`
- Optional but encouraged

---

## GitHub Actions

### Release Workflow

**Trigger:** GitHub Release published

**Steps:**

1. Checkout code
2. Setup Node.js 18
3. Install dependencies
4. Run linting (`npm run lint`)
5. Run tests (`npm test`)
6. Build package (`npm run build`)
7. Publish to npm (with provenance)

**Configuration:** `.github/workflows/release.yml`

### PR Pre-release Workflow

**Trigger:** Pull Request opened/updated

**Steps:**

1. Build package
2. Create pre-release tag
3. Comment installation instructions on PR
4. Auto-delete on PR close/merge

**Configuration:** `.github/workflows/pr-prerelease.yml`

---

## Troubleshooting Releases

### Release Workflow Fails

**Check:**

- NPM_TOKEN is valid and not expired
- All tests passing locally (`npm test`)
- Build succeeds locally (`npm run build`)
- Review GitHub Actions logs for specific errors

**Common issues:**

- Test failures - Fix tests before release
- Linting errors - Run `npm run lint:fix`
- NPM authentication - Regenerate NPM_TOKEN

### Version Conflict

**Symptoms:** Version already exists on npm

**Solution:**

```bash
# Pull latest
git pull origin main

# Check current version
npm version

# Bump to next version
npm version patch  # or minor, major
git push origin main --follow-tags
```

### npm Publish Permission Denied

**Solutions:**

1. **Verify login:**

   ```bash
   npm whoami
   ```

2. **Check package ownership** on npmjs.com

3. **Verify NPM_TOKEN** has correct permissions

4. **Manual publish:**
   ```bash
   npm publish --access public
   ```

---

## Best Practices

### Before Releasing

1. ✅ **Test thoroughly** - Run full test suite
2. ✅ **Update CHANGELOG** - Document all changes
3. ✅ **Review changes** - Ensure quality and consistency
4. ✅ **Test on multiple platforms** - If possible
5. ✅ **Verify in different MCP clients** - VS Code, Claude Desktop, Cursor

### Version Bump Guidelines

- **PATCH (0.0.x)** - Bug fixes only, no new features
- **MINOR (0.x.0)** - New features, backward compatible
- **MAJOR (x.0.0)** - Breaking changes, incompatible updates

### Release Notes

**Good release notes include:**

- Clear summary of changes
- Breaking changes highlighted
- Migration guide for MAJOR versions
- Credits to contributors
- Links to relevant issues/PRs

**Example:**

```markdown
## v0.2.0 - Enhanced Resource Discovery

### 🎉 New Features

- Master Manifest architecture for multi-location BMAD resources
- Module-qualified agent/workflow names (e.g., `bmad core/analyst`)
- Built-in `*doctor` command for diagnostics

### 🔧 Changes

- Improved priority-based resource resolution
- Better error messages for missing agents

### 🐛 Fixes

- Fixed path resolution on Windows (#45)
- Resolved manifest loading race condition (#47)

### 📚 Documentation

- Updated architecture guide
- Simplified installation instructions

### 🙏 Contributors

Thanks to @contributor1 and @contributor2!
```

### Communication

1. **Tag releases** clearly with version
2. **Write clear release notes** for users
3. **Mention breaking changes** prominently
4. **Provide migration guides** for MAJOR versions
5. **Announce** in relevant channels (if applicable)

---

## Support and Questions

**For release-related questions:**

- Review [GitHub Actions](https://github.com/mkellerman/bmad-mcp-server/actions)
- Check [existing releases](https://github.com/mkellerman/bmad-mcp-server/releases)
- Open an [issue](https://github.com/mkellerman/bmad-mcp-server/issues) for problems

**Related documentation:**

- [Development Guide](./development.md) - Contributing workflow
- [Installation Guide](./installation.md) - How users install releases
- [Architecture Guide](./architecture.md) - System design
