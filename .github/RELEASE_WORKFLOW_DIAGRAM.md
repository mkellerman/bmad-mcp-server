# Release Workflow Diagram

## Updated Flow (Pre-release → alpha, Full Release → latest)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Developer Workflow                          │
└─────────────────────────────────────────────────────────────────────┘

1. Create PR with conventional commit title
   └─→ PR Title Check workflow validates format
   └─→ Comment shows version bump preview

2. Optional: Add "preview" label
   └─→ PR Preview workflow creates GitHub-only release
   └─→ No npm publication

3. Merge PR to main
   ↓

┌─────────────────────────────────────────────────────────────────────┐
│                    Automatic Pre-release Flow                       │
│                    (release-draft.yml workflow)                     │
└─────────────────────────────────────────────────────────────────────┘

   ├─→ CI workflow runs (lint, test, build)
   │
   ├─→ Detect version bump from commit message
   │   │
   │   ├─ feat!: or BREAKING CHANGE → major (3.0.0 → 4.0.0)
   │   ├─ feat: → minor (3.0.0 → 3.1.0)
   │   ├─ fix: → patch (3.0.0 → 3.0.1)
   │   └─ docs/chore/etc → none (skip release)
   │
   ├─→ Calculate next version
   │   Example: 3.0.0 → 3.1.0-alpha.1
   │
   ├─→ Publish to npm with @alpha tag
   │   npm install bmad-mcp-server@alpha
   │
   └─→ Create GitHub PRE-RELEASE (not draft)
       ├─ Tag: v3.1.0-alpha.1
       ├─ Title: v3.1.0
       ├─ Marked as: Pre-release ✓
       └─ Status: Published (visible in releases)

┌─────────────────────────────────────────────────────────────────────┐
│                         Testing Phase                               │
└─────────────────────────────────────────────────────────────────────┘

   Developers test the alpha version:

   npm install bmad-mcp-server@alpha
   # or
   npx -y bmad-mcp-server@alpha

   If issues found → Create fix PR → New alpha version
   If all good → Proceed to stable release ↓

┌─────────────────────────────────────────────────────────────────────┐
│                    Manual Full Release Creation                     │
│                  (Via GitHub UI or CLI when ready)                  │
└─────────────────────────────────────────────────────────────────────┘

   Option A: GitHub UI
   ├─→ Go to Releases page
   ├─→ Click "Create a new release"
   ├─→ Tag: v3.1.0 (remove -alpha.1 suffix)
   ├─→ Uncheck "Set as a pre-release"
   └─→ Publish release

   Option B: GitHub CLI
   └─→ gh release create v3.1.0 --generate-notes --latest

   ↓

┌─────────────────────────────────────────────────────────────────────┐
│                   Automatic Publish Flow                            │
│                  (release-publish.yml workflow)                     │
└─────────────────────────────────────────────────────────────────────┘

   Triggers on: release created (not pre-release)
   Condition: prerelease == false

   ├─→ Checkout release tag (v3.1.0)
   │
   ├─→ Build package
   │
   ├─→ Run tests
   │
   ├─→ Extract stable version from tag
   │   v3.1.0-alpha.1 → 3.1.0
   │
   ├─→ Publish to npm with @latest tag
   │   npm install bmad-mcp-server
   │   npm install bmad-mcp-server@3.1.0
   │
   ├─→ Create stable git tag
   │   git tag v3.1.0
   │
   └─→ Update release notes with npm info

┌─────────────────────────────────────────────────────────────────────┐
│                         Final State                                 │
└─────────────────────────────────────────────────────────────────────┘

   GitHub Releases:
   ├─ v3.1.0 [Latest release]
   └─ v3.1.0-alpha.1 [Pre-release]

   npm Package:
   ├─ @latest → 3.1.0
   └─ @alpha → 3.1.0-alpha.1

   Git Tags:
   ├─ v3.1.0
   └─ v3.1.0-alpha.1
```

## Key Differences from Previous Flow

### Before (Had Issues)

- Created draft + pre-release (both flags set)
- Publishing draft didn't automatically remove pre-release flag
- Workflow condition: `draft == false && prerelease == false`
- Required manual editing of pre-release flag

### After (Fixed)

- Creates pre-release only (no draft flag)
- Pre-release is visible and clearly marked for testing
- Full release is a separate manual creation
- Workflow condition: `prerelease == false`
- Clearer intent and easier automation

## npm Distribution Tags Timeline

```
Time ──────────────────────────────────────────────────────→

Merge PR     Create Release
    ↓              ↓

@alpha: ────●──────●──────→ (stays at 3.1.0-alpha.1)
         3.1.0-α.1

@latest: ─────────────●───→ (updates to 3.1.0)
                   3.1.0
```

## Workflow State Machine

```
┌─────────┐
│ PR Open │
└────┬────┘
     │
     ├─→ PR Title Check (validates format)
     └─→ PR Preview (if labeled)
     │
     ↓
┌─────────┐
│ PR Merge│
└────┬────┘
     │
     ↓
┌──────────────┐       ┌─────────────────┐
│ CI Workflow  │──────→│ Create Pre-rel  │
│ (runs tests) │       │ (publish alpha) │
└──────────────┘       └────────┬────────┘
                                │
                                ↓
                       ┌─────────────────┐
                       │  Pre-release    │◄──┐
                       │  v3.1.0-alpha.1 │   │
                       │  @alpha on npm  │   │
                       └────────┬────────┘   │
                                │            │
                         [Test Period]       │
                                │            │
                         [Issues Found?] ────┘
                                │
                                │ [All Good]
                                ↓
                       ┌─────────────────┐
                       │ Manual: Create  │
                       │ Full Release    │
                       │ v3.1.0          │
                       └────────┬────────┘
                                │
                                ↓
                       ┌─────────────────┐
                       │ Publish Workflow│
                       │ (publish latest)│
                       └────────┬────────┘
                                │
                                ↓
                       ┌─────────────────┐
                       │  Full Release   │
                       │  v3.1.0         │
                       │  @latest on npm │
                       └─────────────────┘
```
