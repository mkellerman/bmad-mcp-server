<!-- Powered by BMAD-CORE™ -->

# Murat Test Architecture Foundations (Slim Brief)

This brief distills Murat Ozcan's testing philosophy used by the Test Architect agent. Use it as the north star after loading `tea-commands.csv`.

## Core Principles

- Cost vs confidence: cost = creation + execution + maintenance. Push confidence where impact is highest and skip redundant checks.
- Engineering assumes failure: predict what breaks, defend with tests, learn from every failure. A single failing test means the software is not ready.
- Quality is team work. Story estimates include testing, documentation, and deployment work required to ship safely.
- Missing test coverage is feature debt (hurts customers), not mere tech debt—treat it with the same urgency as functionality gaps.
- Shared mutable state is the source of all evil: design fixtures and helpers so each test owns its data.
- Composition over inheritance: prefer functional helpers and fixtures that compose behaviour; page objects and deep class trees hide duplication.
- Setup via API, assert via UI. Keep tests user-centric while priming state through fast interfaces.
- One test = one concern. Explicit assertions live in the test body, not buried in helpers.

## Patterns & Heuristics

- Selector order: `data-cy` / `data-testid` -> ARIA -> text. Avoid brittle CSS, IDs, or index based locators.
- Network boundary is the mock boundary. Stub at the edge, never mid-service unless risk demands.
- **Network-first pattern**: ALWAYS intercept before navigation: `const call = interceptNetwork(); await page.goto(); await call;`
- Deterministic waits only: await specific network responses, elements disappearing, or event hooks. Ban fixed sleeps.
- **Fixture architecture (The Murat Way)**:
  ```typescript
  // 1. Pure function first (testable independently)
  export async function apiRequest({ request, method, url, data }) {
    /* implementation */
  }
  // 2. Fixture wrapper
  export const apiRequestFixture = base.extend({
    apiRequest: async ({ request }, use) => {
      await use((params) => apiRequest({ request, ...params }));
    },
  });
  // 3. Compose via mergeTests
  export const test = mergeTests(base, apiRequestFixture, authFixture, networkFixture);
  ```
- **Data factories pattern**:
  ```typescript
  export const createUser = (overrides = {}) => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    ...overrides,
  });
  ```
- Visual debugging: keep component/test runner UIs available (Playwright trace viewer, Cypress runner) to accelerate feedback.

## Risk & Coverage

- Risk score = probability (1-3) × impact (1-3). Score 9 => gate FAIL, ≥6 => CONCERNS. Most stories have 0-1 high risks.
- Test level ratio: heavy unit/component coverage, but always include E2E for critical journeys and integration seams.
- Traceability looks for reality: map each acceptance criterion to concrete tests and flag missing coverage or duplicate value.
- NFR focus areas: Security, Performance, Reliability, Maintainability. Demand evidence (tests, telemetry, alerts) before approving.

## Test Configuration

- **Timeouts**: actionTimeout 15s, navigationTimeout 30s, testTimeout 60s, expectTimeout 10s
- **Reporters**: HTML (never auto-open) + JUnit XML for CI integration
- **Media**: screenshot only-on-failure, video retain-on-failure
- **Language Matching**: Tests should match source code language (JS/TS frontend -> JS/TS tests)

## Automation & CI

- Prefer Playwright for multi-language teams, worker parallelism, rich debugging; Cypress suits smaller DX-first repos or component-heavy spikes.
- **Framework Selection**: Large repo + performance = Playwright, Small repo + DX = Cypress
- **Component Testing**: Large repos = Vitest (has UI, easy RTL conversion), Small repos = Cypress CT
- CI pipelines run lint -> unit -> component -> e2e, with selective reruns for flakes and artifacts (videos, traces) on failure.
- Shard suites to keep feedback tight; treat CI as shared safety net, not a bottleneck.
- Test selection ideas (32+ strategies): filter by tags/grep (`npm run test -- --grep "@smoke"`), file patterns (`--spec "**/*checkout*"`), changed files (`npm run test:changed`), or test level (`npm run test:unit` / `npm run test:e2e`).
- Burn-in testing: run new or changed specs multiple times (e.g., 3-10x) to flush flakes before they land in main.
- Keep helper scripts handy (`scripts/test-changed.sh`, `scripts/burn-in-changed.sh`) so CI and local workflows stay in sync.

## Project Structure & Config

- **Directory structure**:
  ```
  project/
  ├── playwright.config.ts     # Environment-based config loading
  ├── playwright/
  │   ├── tests/               # All specs (group by domain: auth/, network/, feature-flags/…)
  │   ├── support/             # Frequently touched helpers (global-setup, merged-fixtures, ui helpers, factories)
  │   ├── config/              # Environment configs (base, local, staging, production)
  │   └── scripts/             # Expert utilities (burn-in, record/playback, maintenance)
  ```
- **Environment config pattern**:
  ```javascript
  const configs = {
    local: require('./config/local.config'),
    staging: require('./config/staging.config'),
    prod: require('./config/prod.config'),
  };
  export default configs[process.env.TEST_ENV || 'local'];
  ```

## Test Hygiene & Independence

- Tests must be independent and stateless; never rely on execution order.
- Cleanup all data created during tests (afterEach or API cleanup).
- Ensure idempotency: same results every run.
- No shared mutable state; prefer factory functions per test.
- Tests must run in parallel safely; never commit `.only`.
- Prefer co-location: component tests next to components, integration in `tests/integration`, etc.
- Feature flags: centralise enum definitions (e.g., `export const FLAGS = Object.freeze({ NEW_FEATURE: 'new-feature' })`), provide helpers to set/clear targeting, and write dedicated flag tests that clean up targeting after each run.

## CCTDD (Component Test-Driven Development)

- Start with failing component test -> implement minimal component -> refactor.
- Component tests catch ~70% of bugs before integration.
- Use `cy.mount()` or `render()` to test components in isolation; focus on user interactions.

## CI Optimization Strategies

- **Parallel execution**: Split by test file, not test case.
- **Smart selection**: Run only tests affected by changes (dependency graphs, git diff).
- **Burn-in testing**: Run new/modified tests 3x to catch flakiness early.
- **HAR recording**: Record network traffic for offline playback in CI.
- **Selective reruns**: Only rerun failed specs, not entire suite.
- **Network recording**: capture HAR files during stable runs so CI can replay network traffic when external systems are flaky.

## Package Scripts

- **Essential npm scripts**:
  ```json
  "test:e2e": "playwright test",
  "test:unit": "vitest run",
  "test:component": "cypress run --component",
  "test:contract": "jest --testMatch='**/pact/*.spec.ts'",
  "test:debug": "playwright test --headed",
  "test:ci": "npm run test:unit && npm run test:e2e",
  "contract:publish": "pact-broker publish"
  ```

## Contract Testing (Pact)

- Use for microservices with integration points.
- Consumer generates contracts, provider verifies.
- Structure: `pact/` directory at root, `pact/config.ts` for broker settings.
- Reference repos: pact-js-example-consumer, pact-js-example-provider, pact-js-example-react-consumer.

## Online Resources & Examples

- Fixture architecture: https://github.com/muratkeremozcan/cy-vs-pw-murats-version
- Playwright patterns: https://github.com/muratkeremozcan/pw-book
- Component testing (CCTDD): https://github.com/muratkeremozcan/cctdd
- Contract testing: https://github.com/muratkeremozcan/pact-js-example-consumer
- Full app example: https://github.com/muratkeremozcan/tour-of-heroes-react-vite-cypress-ts
- Blog posts: https://dev.to/muratkeremozcan

## Risk Model Details

- TECH: Unmitigated architecture flaws, experimental patterns without fallbacks.
- SEC: Missing security controls, potential vulnerabilities, unsafe data handling.
- PERF: SLA-breaking slowdowns, resource exhaustion, lack of caching.
- DATA: Loss or corruption scenarios, migrations without rollback, inconsistent schemas.
- BUS: Business or user harm, revenue-impacting failures, compliance gaps.
- OPS: Deployment, infrastructure, or observability gaps that block releases.

## Probability & Impact Scale

- Probability 1 = Unlikely (standard implementation, low risk).
- Probability 2 = Possible (edge cases, needs attention).
- Probability 3 = Likely (known issues, high uncertainty).
- Impact 1 = Minor (cosmetic, easy workaround).
- Impact 2 = Degraded (partial feature loss, manual workaround needed).
- Impact 3 = Critical (blocker, data/security/regulatory impact).
- Scores: 9 => FAIL, 6-8 => CONCERNS, 4 => monitor, 1-3 => note only.

## Test Design Frameworks

- Use `docs/docs-v6/v6-bmm/test-levels-framework.md` for level selection and anti-patterns.
- Use `docs/docs-v6/v6-bmm/test-priorities-matrix.md` for P0-P3 priority criteria.
- Naming convention: `{epic}.{story}-{LEVEL}-{sequence}` (e.g., `2.4-E2E-01`).
- Tie each scenario to risk mitigations or acceptance criteria.

## Test Quality Definition of Done

- No hard waits (`page.waitForTimeout`, `cy.wait(ms)`)—use deterministic waits.
- Each test < 300 lines and executes in <= 1.5 minutes.
- Tests are stateless, parallel-safe, and self-cleaning.
- No conditional logic in tests (`if/else`, `try/catch` controlling flow).
- Explicit assertions live in tests, not hidden in helpers.
- Tests must run green locally and in CI with identical commands.
- A test delivers value only when it has failed at least once—design suites so they regularly catch regressions during development.

## NFR Status Criteria

- **Security**: PASS (auth, authz, secrets handled), CONCERNS (minor gaps), FAIL (critical exposure).
- **Performance**: PASS (meets targets, profiling evidence), CONCERNS (approaching limits), FAIL (breaches limits, leaks).
- **Reliability**: PASS (error handling, retries, health checks), CONCERNS (partial coverage), FAIL (no recovery, crashes).
- **Maintainability**: PASS (tests + docs + clean code), CONCERNS (duplication, low coverage), FAIL (no tests, tangled code).
- Unknown targets => CONCERNS until defined.

## Quality Gate Schema

```yaml
schema: 1
story: '{epic}.{story}'
story_title: '{title}'
gate: PASS|CONCERNS|FAIL|WAIVED
status_reason: 'Single sentence summary'
reviewer: 'Murat (Master Test Architect)'
updated: '2024-09-20T12:34:56Z'
waiver:
  active: false
  reason: ''
  approved_by: ''
  expires: ''
top_issues:
  - id: SEC-001
    severity: high
    finding: 'Issue description'
    suggested_action: 'Action to resolve'
risk_summary:
  totals:
    critical: 0
    high: 0
    medium: 0
    low: 0
recommendations:
  must_fix: []
  monitor: []
nfr_validation:
  security: { status: PASS, notes: '' }
  performance: { status: CONCERNS, notes: 'Add caching' }
  reliability: { status: PASS, notes: '' }
  maintainability: { status: PASS, notes: '' }
history:
  - at: '2024-09-20T12:34:56Z'
    gate: CONCERNS
    note: 'Initial review'
```

- Optional sections: `quality_score` block for extended metrics, and `evidence` block (tests_reviewed, risks_identified, trace.ac_covered/ac_gaps) when teams track them.

## Collaborative TDD Loop

- Share failing acceptance tests with the developer or AI agent.
- Track red -> green -> refactor progress alongside the implementation checklist.
- Update checklist items as each test passes; add new tests for discovered edge cases.
- Keep conversation focused on observable behavior, not implementation detail.

## Traceability Coverage Definitions

- FULL: All scenarios for the criterion validated across appropriate levels.
- PARTIAL: Some coverage exists but gaps remain.
- NONE: No tests currently validate the criterion.
- UNIT-ONLY: Only low-level tests exist; add integration/E2E.
- INTEGRATION-ONLY: Missing unit/component coverage for fast feedback.
- Avoid naive UI E2E until service-level confidence exists; use API or contract tests to harden backends first, then add minimal UI coverage to fill the gaps.

## CI Platform Guidance

- Default to GitHub Actions if no preference is given; otherwise ask for GitLab, CircleCI, etc.
- Ensure local script mirrors CI pipeline (npm test vs CI workflow).
- Use concurrency controls to prevent duplicate runs (`concurrency` block in GitHub Actions).
- Keep job runtime under 10 minutes; split further if necessary.

## Testing Tool Preferences

- Component testing: Large repositories prioritize Vitest with UI (fast, component-native). Smaller DX-first teams with existing Cypress stacks can keep Cypress Component Testing for consistency.
- E2E testing: Favor Playwright for large or performance-sensitive repos; reserve Cypress for smaller DX-first teams where developer experience outweighs scale.
- API testing: Prefer Playwright's API testing or contract suites over ad-hoc REST clients.
- Contract testing: Pact.js for consumer-driven contracts; keep `pact/` config in repo.
- Visual testing: Percy, Chromatic, or Playwright snapshots when UX must be audited.

## Naming Conventions

- File names: `ComponentName.cy.tsx` for Cypress component tests, `component-name.spec.ts` for Playwright, `ComponentName.test.tsx` for unit/RTL.
- Describe blocks: `describe('Feature/Component Name', () => { context('when condition', ...) })`.
- Data attributes: always kebab-case (`data-cy="submit-button"`, `data-testid="user-email"`).

## Reference Materials

If deeper context is needed, consult Murat's testing philosophy notes, blog posts, and sample repositories in https://github.com/muratkeremozcan/test-resources-for-ai/blob/main/gitingest-full-repo-text-version.txt.
