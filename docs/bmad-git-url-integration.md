# BMAD Git URL Integration Guide

This document describes the Git URL functionality in the BMAD MCP Server and validation requirements for Git-hosted BMAD installations.

## Overview

The BMAD MCP Server supports loading BMAD installations directly from Git repositories using npm-style Git URL syntax. This enables dynamic loading of BMAD content from GitHub and other Git hosting platforms.

## Git URL Format

### Supported URL Patterns

```bash
# Basic repository with default branch
git+https://github.com/org/repo.git

# Specific branch or tag
git+https://github.com/org/repo.git#branch-name
git+https://github.com/org/repo.git#v6-alpha
git+https://github.com/org/repo.git#v1.0.0

# Repository with subpath
git+https://github.com/org/repo.git#branch:/subpath
git+https://github.com/org/repo.git#main:/bmad
git+https://github.com/org/repo.git#v6-alpha:/bmad

# SSH URLs (if SSH keys configured)
git+ssh://git@github.com/org/repo.git#branch:/subpath
```

### Official BMAD-METHOD Repository

The official BMAD-METHOD repository can be loaded using:

```bash
# v6-alpha branch (recommended)
git+https://github.com/bmad-code-org/BMAD-METHOD.git#v6-alpha:/bmad

# Main branch
git+https://github.com/bmad-code-org/BMAD-METHOD.git#main:/bmad
```

## Caching Behavior

### Cache Directory Structure

Git repositories are cached locally in:
```
~/.bmad/cache/git/
├── github.com-org-repo-branch-{hash}/
├── github.com-bmad-code-org-BMAD-METHOD-main-{hash}/
└── github.com-bmad-code-org-BMAD-METHOD-v6-alpha-{hash}/
```

### Branch Isolation

- **Different branches** → **Different cache directories**
- **Same branch** → **Reuses cache with git pull**
- **URL changes** → **Cache invalidation and re-clone**

### Cache Key Generation

The cache key includes:
- Host (github.com)
- Organization (bmad-code-org)
- Repository (BMAD-METHOD)
- Branch/ref (main, v6-alpha)
- URL hash (for subpath changes)

Example: `github.com-bmad-code-org-BMAD-METHOD-v6-alpha-c81cc34992146161`

## Module Format Compatibility

### Supported manifest.yaml Formats

The Git URL loader supports both module formats:

#### String Array Format (Simple)
```yaml
installation:
  version: "6.0.0-alpha.3"
  installDate: "2025-11-01T01:27:21.194Z"
modules:
  - core
  - bmb
  - bmd
```

#### Object Array Format (Extended)
```yaml
installation:
  version: "6.0.0-alpha.0"
  installDate: "2025-10-28T17:08:48.104Z"
modules:
  - name: core
    version: "1.0.0"
    shortTitle: "Core Module"
  - name: bmb
    version: "1.2.0"
    shortTitle: "BMAD Builder"
```

### Module Detection Logic

The system automatically detects and converts both formats:

1. **String format**: Converted to `{name: string, version: undefined}`
2. **Object format**: Uses existing `{name: string, version?: string}` structure
3. **Invalid modules**: Filtered out with warnings

## MCP Configuration

### VS Code mcp.json Example

```json
{
  "servers": {
    "bmad": {
      "command": "node",
      "args": [
        "${workspaceFolder}/build/index.js",
        "git+https://github.com/bmad-code-org/BMAD-METHOD.git#v6-alpha:/bmad",
        "--mode=strict"
      ]
    }
  }
}
```

### Command Line Usage

```bash
# Start server with Git URL
node build/index.js git+https://github.com/bmad-code-org/BMAD-METHOD.git#v6-alpha:/bmad

# With strict mode
node build/index.js git+https://github.com/bmad-code-org/BMAD-METHOD.git#v6-alpha:/bmad --mode=strict

# Test different branches
node build/index.js git+https://github.com/bmad-code-org/BMAD-METHOD.git#main:/bmad
```

## Validation Requirements

### Git URL Validation Checklist

- [ ] **URL Parsing**: Git URL correctly parsed into components
- [ ] **Repository Access**: Repository accessible and cloneable
- [ ] **Branch Resolution**: Specified branch/ref exists
- [ ] **Subpath Validation**: Subpath contains valid BMAD structure
- [ ] **Cache Management**: Proper cache key generation and isolation
- [ ] **Module Loading**: All declared modules load correctly
- [ ] **Agent Discovery**: Agents discoverable via MCP tools
- [ ] **Format Compatibility**: Both string and object module formats work

### Automated Validation

Use the Git URL validation script:

```bash
# Test default official repository
node scripts/validate-bmad-git-url.mjs

# Test specific branch
node scripts/validate-bmad-git-url.mjs --test-branch=main

# Test custom repository
node scripts/validate-bmad-git-url.mjs --test-custom-git-url=git+https://github.com/user/repo.git#branch:/path
```

## Troubleshooting

### Common Issues

#### 1. Invalid Git URL Format
```
Error: Invalid Git URL format
```
**Solution**: Ensure URL starts with `git+` and follows npm syntax

#### 2. Branch Not Found
```
Error: fatal: couldn't find remote ref refs/heads/branch-name
```
**Solution**: Verify branch exists in repository

#### 3. Subpath Not Found
```
Error: Subpath not found after Git clone
```
**Solution**: Verify subpath exists in the specified branch

#### 4. Module Detection Failures
```
Warning: Skipping invalid module name: undefined
```
**Solution**: Check manifest.yaml module format compatibility

#### 5. Permission Errors
```
Error: Permission denied (publickey)
```
**Solution**: Use HTTPS URLs or configure SSH keys for SSH URLs

### Debug Commands

```bash
# Check cache contents
ls -la ~/.bmad/cache/git/

# View specific cache
ls -la ~/.bmad/cache/git/github.com-*-BMAD-METHOD-*/

# Check manifest structure
cat ~/.bmad/cache/git/github.com-*-BMAD-METHOD-v6-alpha-*/bmad/_cfg/manifest.yaml

# Test repository access
git ls-remote https://github.com/bmad-code-org/BMAD-METHOD.git refs/heads/v6-alpha
```

## Repository Structure Requirements

For a repository to work with Git URL loading:

### Required Structure
```
{repo-root}/
├── bmad/                    # BMAD installation root
│   ├── _cfg/               # Configuration directory
│   │   ├── manifest.yaml   # Installation metadata
│   │   ├── agent-manifest.csv
│   │   └── workflow-manifest.csv
│   ├── core/               # Core module
│   │   ├── agents/
│   │   └── workflows/
│   └── {custom-modules}/   # Additional modules
└── README.md              # Repository documentation
```

### manifest.yaml Requirements
- Valid YAML syntax
- Installation metadata with version
- Modules array (string or object format)
- Optional: IDEs array

### Module Requirements
- Each declared module must have corresponding directory
- Agent files must be in `{module}/agents/*.md`
- Workflow files must be in `{module}/workflows/*/`

## Best Practices

### For Repository Maintainers

1. **Use semantic versioning** in manifest.yaml
2. **Keep branches stable** - avoid force pushes to public branches
3. **Test module compatibility** with both string and object formats
4. **Document available branches** and their intended use
5. **Provide examples** in repository README

### For MCP Users

1. **Pin to specific branches** for stability
2. **Use v6-alpha** for latest features
3. **Use main** for stable releases
4. **Test locally** before deploying to production
5. **Monitor cache size** and clean periodically

### Cache Management

```bash
# Clean old caches (example)
find ~/.bmad/cache/git/ -name "*BMAD-METHOD*" -mtime +30 -exec rm -rf {} \;

# Check cache sizes
du -sh ~/.bmad/cache/git/*
```

## Version Support

| Version | Git URL Support | Module Formats | Notes |
|---------|----------------|----------------|-------|
| v1.0.0+ | ✅ Full | String + Object | Current implementation |
| v0.x    | ❌ None | String only | Legacy |

## Related Documentation

- [BMAD Core v6 Validation Guide](./validate-bmad-core-v6.md)
- [Path Discovery Troubleshooting](./path-discovery-troubleshooting.md)
- [MCP Response Formatting](./mcp-response-formatting.md)