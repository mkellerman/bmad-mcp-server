# 🚀 Release Pipeline Setup Checklist

Complete these steps to enable automated releases:

## ☐ 1. TestPyPI Setup (5 minutes)

1. [ ] Create account at https://test.pypi.org/account/register/
2. [ ] Verify email
3. [ ] Go to https://test.pypi.org/manage/account/token/
4. [ ] Click "Add API token"
   - Token name: `bmad-mcp-server-github-actions`
   - Scope: "Entire account" (or specific to bmad-mcp-server once uploaded)
5. [ ] Copy the token (starts with `pypi-...`)
6. [ ] Add to GitHub:
   - Go to repository Settings > Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `TEST_PYPI_API_TOKEN`
   - Value: paste the token
   - Click "Add secret"

## ☐ 2. PyPI Setup (5 minutes)

1. [ ] Create account at https://pypi.org/account/register/
2. [ ] Verify email
3. [ ] Go to https://pypi.org/manage/account/token/
4. [ ] Click "Add API token"
   - Token name: `bmad-mcp-server-github-actions`
   - Scope: "Entire account" (or specific to bmad-mcp-server once uploaded)
5. [ ] Copy the token (starts with `pypi-...`)
6. [ ] Add to GitHub:
   - Go to repository Settings > Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `PYPI_API_TOKEN`
   - Value: paste the token
   - Click "Add secret"

## ☐ 3. GitHub Permissions (1 minute)

1. [ ] Go to repository Settings > Actions > General
2. [ ] Scroll to "Workflow permissions"
3. [ ] Select "Read and write permissions"
4. [ ] Check "Allow GitHub Actions to create and approve pull requests" (optional)
5. [ ] Click "Save"

## ☐ 4. Test Pre-release Workflow (2 minutes)

1. [ ] Make a small change (e.g., update README)
2. [ ] Commit and push to `main` branch:
   ```bash
   git add .
   git commit -m "docs: test release pipeline"
   git push origin main
   ```
3. [ ] Go to Actions tab on GitHub
4. [ ] Watch "Pre-release (TestPyPI)" workflow run
5. [ ] Check that:
   - [ ] Workflow completes successfully
   - [ ] New tag is created (e.g., `v0.1.0-alpha.1`)
   - [ ] Pre-release appears in Releases
   - [ ] Package appears on TestPyPI

## ☐ 5. Test Manual Release (Optional - 3 minutes)

**Only after step 4 succeeds!**

1. [ ] Go to Actions > Release to PyPI
2. [ ] Click "Run workflow"
3. [ ] Enter version: `0.1.0`
4. [ ] Enter pre-release tag: `v0.1.0-alpha.1` (from step 4)
5. [ ] Click "Run workflow"
6. [ ] Watch workflow complete
7. [ ] Verify package on PyPI: https://pypi.org/project/bmad-mcp-server/

---

## ✅ Verification

After completing all steps, verify everything works:

```bash
# Test installation from TestPyPI
pip install --index-url https://test.pypi.org/simple/ \
            --extra-index-url https://pypi.org/simple/ \
            bmad-mcp-server

# Test installation from PyPI (after first release)
pip install bmad-mcp-server
```

---

## 📝 Next Steps

Once setup is complete:

1. Read [RELEASE.md](.github/RELEASE.md) for detailed workflow documentation
2. Continue normal development - pre-releases are automatic on push to `main`
3. Use "Release to PyPI" workflow when ready for production releases

---

## 🆘 Troubleshooting

### "Secret not found" error
- Double-check secret names: `TEST_PYPI_API_TOKEN` and `PYPI_API_TOKEN` (exact spelling)
- Verify secrets are at repository level, not environment level

### "Permission denied" error
- Check workflow permissions are set to "Read and write"
- May need to re-run workflow after changing permissions

### "Package already exists" on TestPyPI
- TestPyPI sometimes has issues with version conflicts
- Pre-release workflow auto-increments, so shouldn't happen
- If it does, just wait for next push to `main` - it will create a new version

### Workflow not triggering
- Check that push is to `main` branch (not `master` or other)
- Ensure workflow file is in `.github/workflows/` directory
- Verify workflow file is valid YAML (no syntax errors)

---

## 📚 References

- [RELEASE.md - Full Documentation](.github/RELEASE.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Python Packaging Tutorial](https://packaging.python.org/tutorials/packaging-projects/)
