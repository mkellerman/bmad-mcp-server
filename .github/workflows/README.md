# 🚀 CI/CD Pipeline Summary

## Automated Release Pipeline

Your bmad-mcp-server now has a fully automated CI/CD pipeline:

```
┌────────────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT WORKFLOW                            │
└────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  Feature Branch │
│  Development    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│   Pull Request  │─────▶│  Run Tests       │
│   to main       │      │  Check Coverage  │
└─────────────────┘      │  Lint Code       │
         │               └──────────────────┘
         │ (merge)
         ▼
┌────────────────────────────────────────────────────────────────────┐
│                     AUTOMATED PRE-RELEASE                           │
│                                                                     │
│  Trigger: Push to main branch                                      │
│                                                                     │
│  1. Calculate next version (0.1.0-alpha.1 → 0.1.0-alpha.2)        │
│  2. Run full test suite with coverage                              │
│  3. Build wheel and sdist                                          │
│  4. Update pyproject.toml                                          │
│  5. Commit version bump [skip ci]                                  │
│  6. Create and push git tag (v0.1.0-alpha.2)                       │
│  7. Publish to TestPyPI                                            │
│  8. Create GitHub pre-release                                      │
│                                                                     │
│  Result: https://test.pypi.org/project/bmad-mcp-server/           │
└────────────────────────────────────────────────────────────────────┘
         │
         │ (test & validate)
         ▼
┌────────────────────────────────────────────────────────────────────┐
│                  MANUAL PRODUCTION RELEASE                          │
│                                                                     │
│  Trigger: Manual workflow dispatch                                 │
│  Inputs: version (1.0.0), optional pre-release tag                │
│                                                                     │
│  1. Validate version format (X.Y.Z)                                │
│  2. Check tag doesn't exist                                        │
│  3. Run full test suite                                            │
│  4. Update pyproject.toml to stable version                        │
│  5. Commit to main                                                 │
│  6. Create and push release tag (v1.0.0)                           │
│  7. Build and publish to PyPI                                      │
│  8. Create GitHub Release with changelog                           │
│  9. Bump to next dev version (1.1.0)                               │
│                                                                     │
│  Result: https://pypi.org/project/bmad-mcp-server/                │
└────────────────────────────────────────────────────────────────────┘
```

## 📁 Files Created

### Workflows
- `.github/workflows/test.yml` - Test suite (runs on PR/push)
- `.github/workflows/pre-release.yml` - **NEW** Automated pre-releases to TestPyPI
- `.github/workflows/release.yml` - **NEW** Manual production releases to PyPI

### Documentation
- `.github/RELEASE.md` - **NEW** Complete release process documentation
- `.github/SETUP-RELEASE.md` - **NEW** Setup checklist for release pipeline
- `.github/workflows/README.md` - **NEW** (this file) CI/CD overview

### Configuration
- `.gitignore` - Updated with test coverage artifacts
- `pyproject.toml` - Ready for automated versioning
- `README.md` - Updated with release channel information

## 🎯 Quick Reference

### For Developers

**Daily workflow:**
1. Create feature branch
2. Make changes, write tests
3. Create PR → Tests run automatically
4. Merge to main → **Pre-release published to TestPyPI automatically**

**Test pre-release:**
```bash
pip install --index-url https://test.pypi.org/simple/ \
            --extra-index-url https://pypi.org/simple/ \
            bmad-mcp-server==0.1.0-alpha.3
```

### For Maintainers

**Release to production:**
1. Test latest pre-release from TestPyPI
2. Go to Actions > "Release to PyPI" > Run workflow
3. Enter version (e.g., `1.0.0`)
4. Optionally reference pre-release tag
5. Click "Run workflow"
6. Package published to PyPI automatically

## 🔑 Setup Requirements

Before the pipeline works, you need to:

1. ☐ Create TestPyPI account and API token
2. ☐ Add `TEST_PYPI_API_TOKEN` secret to GitHub
3. ☐ Create PyPI account and API token
4. ☐ Add `PYPI_API_TOKEN` secret to GitHub
5. ☐ Enable "Read and write permissions" for GitHub Actions

**See [SETUP-RELEASE.md](SETUP-RELEASE.md) for detailed instructions.**

## 📊 Version Strategy

### Pre-release (TestPyPI)
- Format: `X.Y.Z-alpha.N`
- Example: `0.1.0-alpha.1`, `0.1.0-alpha.2`, etc.
- Auto-increments on every push to `main`
- Published to TestPyPI for testing

### Production (PyPI)
- Format: `X.Y.Z`
- Example: `1.0.0`, `1.0.1`, `2.0.0`
- Manual release via GitHub Actions
- Published to PyPI for production use

### Semantic Versioning
- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (0.Y.0): New features, backward compatible
- **PATCH** (0.0.Z): Bug fixes, backward compatible

## 🎉 What's Automated

✅ **Pre-releases:**
- Version calculation and incrementing
- Git tagging
- TestPyPI publishing
- GitHub pre-release creation
- Version bump commits

✅ **Production releases:**
- Version validation
- Full test suite
- PyPI publishing
- GitHub release with changelog
- Post-release version bump

✅ **Testing:**
- Multi-OS (Ubuntu, macOS, Windows)
- Multi-Python (3.10, 3.11, 3.12)
- Coverage reporting
- Lint and type checking

## 🔗 Links

- **GitHub Repository**: https://github.com/mkellerman/bmad-mcp-server
- **TestPyPI**: https://test.pypi.org/project/bmad-mcp-server/
- **PyPI**: https://pypi.org/project/bmad-mcp-server/
- **Documentation**: [RELEASE.md](RELEASE.md)
- **Setup Guide**: [SETUP-RELEASE.md](SETUP-RELEASE.md)

---

**Status**: ✅ Pipeline configured and ready to use after completing setup checklist!
