# Release Process

This document describes the automated release process for `bmad-mcp-server`.

## Overview

We use a **trunk-based development** model with automated releases based on conventional commits:

```
main branch
    ↓
  merge PR with conventional commit
    ↓
  automatic pre-release (alpha) created
    ↓
  manual full release creation
    ↓
  automatic publish to npm @latest
```

## Release Types

### Pre-release (Alpha)

- **When**: Automatically created on every merge to `main` (with version-bumping commits)
- **Published to**: npm with `@alpha` tag
- **GitHub**: Marked as "Pre-release" (visible but not marked as latest)
- **Tag format**: `v{version}-alpha.1` (e.g., `v3.1.0-alpha.1`)
- **Purpose**: Testing and validation before stable release

### Full Release (Stable)

- **When**: Manually created from GitHub UI or CLI
- **Published to**: npm with `@latest` tag
- **GitHub**: Marked as "Latest release"
- **Tag format**: `v{version}` (e.g., `v3.1.0`)
- **Purpose**: Production-ready stable version

## Workflows

### 1. PR Title Validation (`.github/workflows/pr-title-check.yml`)

- **Triggers**: On pull request open/edit
- **Purpose**: Validates PR title follows conventional commits
- **Actions**:
  - Checks PR title format
  - Calculates version bump preview
  - Posts comment showing current/alpha/final versions

### 2. PR Preview (`.github/workflows/pr-preview.yml`)

- **Triggers**: On pull request labeled with `preview`
- **Purpose**: Creates GitHub-only preview release (no npm)
- **Actions**:
  - Creates GitHub release tagged as PR preview
  - Does NOT publish to npm

### 3. CI (`.github/workflows/ci.yml`)

- **Triggers**: On PR and push to main
- **Purpose**: Runs tests, lint, and build
- **Actions**:
  - Commitlint check
  - ESLint
  - Build TypeScript
  - Unit tests
  - Integration tests (if exist)

### 4. Create Pre-release (`.github/workflows/release-draft.yml`)

- **Triggers**: On push to `main`
- **Purpose**: Creates alpha pre-release for testing
- **Actions**:
  1. Runs CI workflow
  2. Detects version bump from commit message
  3. Calculates next version
  4. Publishes to npm with `@alpha` tag
  5. Creates GitHub pre-release (NOT draft)

### 5. Publish Release (`.github/workflows/release-publish.yml`)

- **Triggers**: When a new full release is created
- **Purpose**: Publishes stable version to npm
- **Actions**:
  1. Extracts version from tag
  2. Removes `-alpha.X` suffix
  3. Publishes to npm with `@latest` tag
  4. Creates stable git tag
  5. Updates release notes

### 6. Cleanup PR Preview (`.github/workflows/cleanup-pr-preview.yml`)

- **Triggers**: On PR close
- **Purpose**: Removes PR preview releases
- **Actions**: Deletes GitHub releases tagged as PR previews

## Version Bumping

Versions are determined by the **first line** of the commit message using [Conventional Commits](https://www.conventionalcommits.org/):

| Commit Type                                                                  | Version Bump              | Example                 |
| ---------------------------------------------------------------------------- | ------------------------- | ----------------------- |
| `feat!:` or `BREAKING CHANGE`                                                | **Major** (3.0.0 → 4.0.0) | `feat!: redesign API`   |
| `feat:`                                                                      | **Minor** (3.0.0 → 3.1.0) | `feat: add new command` |
| `fix:`                                                                       | **Patch** (3.0.0 → 3.0.1) | `fix: resolve bug`      |
| `docs:`, `chore:`, `refactor:`, `test:`, `ci:`, `perf:`, `build:`, `revert:` | **None**                  | No release created      |

## Step-by-Step Release Process

### Automatic Pre-release (happens on merge)

1. **Create PR** with conventional commit title

   ```
   feat: add support for new MCP feature
   ```

2. **Merge PR** to main
   - CI runs automatically
   - Pre-release workflow creates:
     - npm package `@alpha` (e.g., `3.1.0-alpha.1`)
     - GitHub pre-release (visible in releases list)

3. **Test the alpha version**
   ```bash
   npm install bmad-mcp-server@alpha
   # or
   npx -y bmad-mcp-server@alpha
   ```

### Manual Full Release (when ready for stable)

#### Option A: GitHub UI

1. Go to [Releases](https://github.com/mkellerman/bmad-mcp-server/releases)
2. Find the pre-release you want to promote
3. Click "Edit release" (or "Create a new release")
4. **Change the tag** from `v3.1.0-alpha.1` to `v3.1.0`
5. **Uncheck** "Set as a pre-release"
6. **Check** "Set as the latest release"
7. Update release notes if needed
8. Click "Publish release"

#### Option B: GitHub CLI

```bash
# Create a new full release from the pre-release commit
gh release create v3.1.0 \
  --title "v3.1.0" \
  --notes "Release notes here" \
  --latest
```

#### Option C: Git CLI

```bash
# Tag the commit
git tag v3.1.0 <commit-sha>
git push origin v3.1.0

# Create release
gh release create v3.1.0 \
  --title "v3.1.0" \
  --generate-notes \
  --latest
```

### What Happens After Creating Full Release

The `release-publish.yml` workflow automatically:

1. ✅ Checks out the release tag
2. ✅ Builds the package
3. ✅ Runs tests
4. ✅ Publishes to npm with `@latest` tag
5. ✅ Creates stable git tag (removes `-alpha` suffix)
6. ✅ Updates release notes with npm installation info

## npm Distribution Tags

| Tag       | Purpose                    | Installation                        |
| --------- | -------------------------- | ----------------------------------- |
| `@latest` | Stable production releases | `npm install bmad-mcp-server`       |
| `@alpha`  | Pre-releases for testing   | `npm install bmad-mcp-server@alpha` |
| `@beta`   | Legacy (not used)          | -                                   |

## Skipping Releases

To merge to main without creating a release, include in commit message:

- `[skip release]` - Skips release creation
- `[skip ci]` - Skips both CI and release

Or use non-version-bumping commit types:

- `docs:` - Documentation only
- `chore:` - Maintenance tasks
- `ci:` - CI configuration changes

## Troubleshooting

### Pre-release created but workflow skipped

- Check if commit message was correct conventional format
- Look at workflow run logs in Actions tab

### Full release workflow didn't run

- Ensure the release is NOT marked as pre-release
- Check that the tag doesn't contain `-alpha` or other pre-release identifiers
- Verify workflow condition: `github.event.release.prerelease == false`

### npm publish failed with "Cannot publish over previously published version"

- npm doesn't allow re-publishing the same version
- If you need to republish, bump the patch version (e.g., 3.0.0 → 3.0.1)
- Wait 24 hours if you just un-published the version

### Version calculation wrong

- The version bump is calculated from the **first line** of the merge commit message
- Ensure PR title follows conventional commits format
- Check the PR title validation workflow for preview of version bump

## Best Practices

1. ✅ **Always use conventional commits** in PR titles
2. ✅ **Test alpha versions** before promoting to stable
3. ✅ **Update release notes** when creating full release
4. ✅ **Communicate breaking changes** clearly in release notes
5. ✅ **Use semantic versioning** correctly:
   - Major: Breaking changes
   - Minor: New features (backwards compatible)
   - Patch: Bug fixes (backwards compatible)

## Examples

### Example: Minor Release (New Feature)

1. PR title: `feat: add support for workflow templates`
2. Merge to main → Creates `v3.1.0-alpha.1` pre-release, publishes to npm `@alpha`
3. Test: `npm install bmad-mcp-server@alpha`
4. When ready: Create full release `v3.1.0` → Publishes to npm `@latest`

### Example: Patch Release (Bug Fix)

1. PR title: `fix: resolve resource loading issue`
2. Merge to main → Creates `v3.0.1-alpha.1` pre-release, publishes to npm `@alpha`
3. Test: `npx -y bmad-mcp-server@alpha`
4. When ready: Create full release `v3.0.1` → Publishes to npm `@latest`

### Example: Major Release (Breaking Change)

1. PR title: `feat!: redesign agent execution API`
2. Merge to main → Creates `v4.0.0-alpha.1` pre-release, publishes to npm `@alpha`
3. Test thoroughly: `npm install bmad-mcp-server@alpha`
4. Update migration guide in release notes
5. When ready: Create full release `v4.0.0` → Publishes to npm `@latest`

### Example: No Release (Documentation)

1. PR title: `docs: update README installation instructions`
2. Merge to main → No release created (docs don't bump version)
3. CI runs but release workflow skips

## Quick Reference

```bash
# Install latest stable
npm install bmad-mcp-server

# Install latest alpha
npm install bmad-mcp-server@alpha

# Install specific version
npm install bmad-mcp-server@3.1.0

# Run with npx
npx -y bmad-mcp-server@latest
npx -y bmad-mcp-server@alpha

# Check available versions
npm view bmad-mcp-server versions
npm view bmad-mcp-server dist-tags

# Create release via CLI
gh release create v3.1.0 --generate-notes --latest
```
