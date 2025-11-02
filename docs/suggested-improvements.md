# Suggested CI/CD Improvements

This document lists high‑impact automations to further improve our release process.

## Already Implemented

- Branch‑tagged PR pre‑releases (sanitized tag equals branch name)
- Single pre‑release per branch; replaces on new commits
- Cleanup on PR merge/close: removes pre‑release + tag; branch auto‑deletes
- Concurrency + fork guard for pre‑release workflow
- Manual release trigger (`workflow_dispatch`) and serialized releases on `main`
- NPM provenance enabled and repository metadata fixed
- Commitlint job for PRs; strict shell `set -euo pipefail`; artifact strictness

## Semantic Versioning

- Multi‑channel releases via branches
  - Keep `main` stable; add prerelease lines like `next`, `beta`, or maintenance.
  - Example `.releaserc.json`:
    ```json
    {
      "branches": [
        "main",
        { "name": "next", "prerelease": true },
        { "name": "beta", "prerelease": "beta" },
        { "name": "maintenance/*", "range": "<2.0.0" }
      ]
    }
    ```
- Custom release rules
  - Map more commit types to version bumps (e.g., `perf`, `build` → patch).
  - Configure in `@semantic-release/commit-analyzer` `releaseRules`.

## Quality Gates

- Enforce semantic PR titles
  - Ensure squash merges still trigger the correct version using PR titles.
  - Use `amannn/action-semantic-pull-request` in a small workflow.
- Release freeze switch
  - Respect a label or repo variable to skip publishing (e.g., `RELEASE_FREEZE=true`).
  - Add an early guard step in the Release job.
- Require green CI for Release
  - Keep `needs: ci` and protect `main` so Release runs only when CI is green.

## Pre‑Release Controls

- Label‑gated pre‑releases
  - Only create pre‑releases when PR has a label like `pre-release` to reduce noise.
  - Job if: `contains(toJson(github.event.pull_request.labels.*.name), 'pre-release')`.
- TTL sweeper
  - Nightly cleanup of orphaned pre‑releases/tags older than N days for safety.

## Security & Supply Chain

- Pin actions to SHAs
  - Replace `@v5`/`@v6` with immutable commit SHAs for all actions used.
- Enforce provenance by default
  - Add an `.npmrc` with `provenance=true` to keep config consistent with env.

## CI Matrix & Gating

- Node version matrix
  - Test against active LTS versions (e.g., 18, 20, 22) to catch runtime diffs.
- Optional E2E gate
  - Run E2E only when PR has label `e2e-required` and make it a required check.

## Release UX

- Rich release notes
  - Use a custom preset/notes template to group changes and add compare links.
- Attach artifacts
  - Upload minimal CLI bundle or relevant assets to GitHub releases for convenience.

## Docs & Changelog Automation

- PR step summary
  - Write install/checkout snippets to `GITHUB_STEP_SUMMARY` in pre‑release.
- README version badge
  - Update a small version badge automatically via `@semantic-release/git` assets.

## Backports & Maintenance

- Automated backports
  - Use a backport action keyed on labels like `backport-to/v1` to open PRs.
- Dependabot conventional commits
  - Ensure commit messages are `chore(deps): ...` so they don’t trigger releases.

---

If you’d like, we can stage these in small PRs: (1) semantic PR titles, (2) branch channels,
(3) label‑gated pre‑releases + TTL sweeper, (4) action pinning, (5) Node matrix + E2E gate,
(6) release notes template + summary outputs.

