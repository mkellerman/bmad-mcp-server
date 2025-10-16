# 🚀 Release Process Documentation

## Overview

This project uses a fully automated CI/CD pipeline for versioning, tagging, and publishing packages.

### Workflow Summary

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Push to     │────▶│  Pre-release     │────▶│   TestPyPI       │
│  main        │     │  Auto-versioned  │     │   (automatic)    │
└──────────────┘     └──────────────────┘     └──────────────────┘
                            │
                            │ Test & Validate
                            ▼
                     ┌──────────────────┐     ┌──────────────────┐
                     │  Manual Workflow │────▶│   PyPI           │
                     │  "Release"       │     │   (production)   │
                     └──────────────────┘     └──────────────────┘
```

---

## 📋 Prerequisites

### 1. GitHub Secrets Configuration

You need to set up two API tokens in your GitHub repository:

#### **TEST_PYPI_API_TOKEN** (for pre-releases)
1. Go to https://test.pypi.org/manage/account/token/
2. Create a new API token
3. Add to GitHub: `Settings > Secrets and variables > Actions > New repository secret`
4. Name: `TEST_PYPI_API_TOKEN`
5. Value: `pypi-...` (your token)

#### **PYPI_API_TOKEN** (for production releases)
1. Go to https://pypi.org/manage/account/token/
2. Create a new API token
3. Add to GitHub: `Settings > Secrets and variables > Actions > New repository secret`
4. Name: `PYPI_API_TOKEN`
5. Value: `pypi-...` (your token)

### 2. GitHub Permissions

Ensure the repository has:
- **Settings > Actions > General > Workflow permissions**: "Read and write permissions" ✅
- This allows the workflow to commit version bumps and create tags

---

## 🔄 Automated Pre-release Flow

### Trigger: Push to `main` branch

**What happens automatically:**

1. **Version Calculation**
   - Reads current version from `pyproject.toml` (e.g., `0.1.0`)
   - Finds latest pre-release tag (e.g., `v0.1.0-alpha.2`)
   - Increments to next pre-release (e.g., `v0.1.0-alpha.3`)

2. **Testing**
   - Runs full test suite with coverage requirement (60% minimum)
   - Fails if tests don't pass

3. **Building**
   - Updates `pyproject.toml` with new version
   - Builds wheel and source distribution

4. **Versioning**
   - Commits version bump to `main` with `[skip ci]`
   - Creates and pushes git tag (e.g., `v0.1.0-alpha.3`)

5. **Publishing**
   - Publishes to **TestPyPI** automatically
   - Creates GitHub pre-release with installation instructions

### Testing the Pre-release

After the workflow completes, install from TestPyPI:

```bash
pip install --index-url https://test.pypi.org/simple/ \
            --extra-index-url https://pypi.org/simple/ \
            bmad-mcp-server==0.1.0-alpha.3
```

---

## 🎯 Manual Production Release Flow

### Trigger: Manual workflow dispatch

**When to use:**
- You've tested a pre-release on TestPyPI
- Ready to publish a stable version to production PyPI
- Want to promote a pre-release to production

### Steps:

1. **Go to GitHub Actions**
   - Navigate to: `Actions > Release to PyPI > Run workflow`

2. **Fill in inputs:**
   ```
   Version: 1.0.0
   Pre-release tag (optional): v0.1.0-alpha.3
   ```

3. **Click "Run workflow"**

**What happens:**

1. **Validation**
   - Checks version format (must be `X.Y.Z`)
   - Ensures tag doesn't already exist
   - Runs full test suite

2. **Version Update**
   - Updates `pyproject.toml` to stable version (e.g., `1.0.0`)
   - Commits to `main`

3. **Release**
   - Creates git tag (e.g., `v1.0.0`)
   - Builds and publishes to **PyPI**
   - Creates GitHub Release with changelog

4. **Post-release**
   - Automatically bumps version to next dev cycle (e.g., `1.1.0`)

---

## 📝 Version Numbering Strategy

### Semantic Versioning (SemVer)

We follow [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH[-PRERELEASE]

Examples:
  0.1.0          - Initial development
  0.1.0-alpha.1  - Pre-release (TestPyPI)
  0.1.0-alpha.2  - Pre-release (TestPyPI)
  1.0.0          - First stable release (PyPI)
  1.0.1          - Patch release (PyPI)
  1.1.0          - Minor release (PyPI)
  2.0.0          - Major release (PyPI)
```

### When to bump versions:

- **MAJOR** (X.0.0): Breaking changes, incompatible API changes
- **MINOR** (x.Y.0): New features, backward compatible
- **PATCH** (x.y.Z): Bug fixes, backward compatible

---

## 🛠️ Development Workflow

### Daily Development

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push and create PR
git push origin feature/my-feature
# Open PR on GitHub

# 4. After PR approval, merge to main
# → Triggers automatic pre-release to TestPyPI
```

### Releasing to Production

```bash
# 1. Test the latest pre-release from TestPyPI
pip install --index-url https://test.pypi.org/simple/ \
            --extra-index-url https://pypi.org/simple/ \
            bmad-mcp-server==0.1.0-alpha.5

# 2. If satisfied, go to GitHub Actions
# 3. Run "Release to PyPI" workflow
#    - Version: 0.1.0
#    - Pre-release tag: v0.1.0-alpha.5

# 4. Package is now on PyPI!
pip install bmad-mcp-server==0.1.0
```

---

## 🔍 Monitoring Releases

### Check Pre-releases
- **GitHub**: https://github.com/mkellerman/bmad-mcp-server/releases
- **TestPyPI**: https://test.pypi.org/project/bmad-mcp-server/

### Check Production Releases
- **GitHub**: https://github.com/mkellerman/bmad-mcp-server/releases (stable tags)
- **PyPI**: https://pypi.org/project/bmad-mcp-server/

### Verify Version
```bash
# Check installed version
pip show bmad-mcp-server

# Check latest version on PyPI
pip index versions bmad-mcp-server
```

---

## ⚠️ Troubleshooting

### Pre-release workflow fails

**"Tests failed"**
- Fix the failing tests
- Push to `main` again → triggers new pre-release

**"Version already exists on TestPyPI"**
- TestPyPI doesn't allow re-uploading same version
- The version auto-increments, so this shouldn't happen
- If it does, manually delete old versions on TestPyPI or skip this pre-release

### Production release workflow fails

**"Tag already exists"**
- You've already released this version
- Use a higher version number

**"Tests failed"**
- Don't release! Fix tests first
- Push fixes to `main` → test on TestPyPI first

**"Authentication failed"**
- Check that `PYPI_API_TOKEN` secret is set correctly
- Verify token hasn't expired

---

## 📚 Additional Resources

- [Python Packaging Guide](https://packaging.python.org/)
- [Semantic Versioning](https://semver.org/)
- [TestPyPI](https://test.pypi.org/)
- [PyPI](https://pypi.org/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

## 🎉 Quick Reference

| Action | Command/Location |
|--------|-----------------|
| **View all releases** | GitHub > Releases |
| **Run production release** | Actions > Release to PyPI > Run workflow |
| **Install pre-release** | `pip install --index-url https://test.pypi.org/simple/ --extra-index-url https://pypi.org/simple/ bmad-mcp-server==X.Y.Z-alpha.N` |
| **Install production** | `pip install bmad-mcp-server==X.Y.Z` |
| **View TestPyPI** | https://test.pypi.org/project/bmad-mcp-server/ |
| **View PyPI** | https://pypi.org/project/bmad-mcp-server/ |
| **Configure secrets** | Settings > Secrets and variables > Actions |
