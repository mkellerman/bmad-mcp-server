# E2E Testing Roadmap

**Status as of November 9, 2025**

## Progress Overview

```
Phase 1: E2E Infrastructure          ████████████████████ 100% ✅ COMPLETE
Phase 2: Expand Test Coverage        ░░░░░░░░░░░░░░░░░░░░   0% 📋 TODO
Phase 3: Performance Benchmarking    ░░░░░░░░░░░░░░░░░░░░   0% 📋 TODO
Phase 4: Migrate Old Tests           ░░░░░░░░░░░░░░░░░░░░   0% 📋 TODO
Phase 5: Production Usage            ░░░░░░░░░░░░░░░░░░░░   0% 📋 TODO
Phase 6: CI/CD Integration           ░░░░░░░░░░░░░░░░░░░░   0% 📋 FUTURE

Overall Progress: ██████░░░░░░░░░░░░░░░░░░░░░░ 22% (6/27 tasks)
```

## Phase Breakdown

### ✅ Phase 1: E2E Infrastructure (COMPLETE)
**Status:** 6/6 tasks complete | **Effort:** ~10 hours

- [x] **1.1** Create ToolCallTracker class (438 lines + 31 unit tests)
- [x] **1.2** Research tool calling issues (copilot-proxy limitation discovered)
- [x] **1.3** Build CopilotSessionHelper (420 lines, parallel-safe)
- [x] **1.4** Create E2E tests (3 scenarios)
- [x] **1.5** Validation scripts (870 lines total)
- [x] **1.6** Documentation (5 comprehensive guides)

**Deliverables:**
- Production-ready test framework with UUID-based isolation
- JSONL session analysis with rich metrics
- Zero-cost solution using Copilot CLI
- Comprehensive documentation

---

### 📋 Phase 2: Expand Test Coverage (Option 1)
**Status:** 0/4 tasks | **Effort:** ~13 hours | **Priority:** HIGH

- [ ] **2.1** Test all agent types (analyst, architect, pm, sm, tea, etc.) - 4h
- [ ] **2.2** Test workflow execution (prd, architecture, brainstorming) - 4h
- [ ] **2.3** Test error handling paths - 3h
- [ ] **2.4** Test multi-module scenarios (bmm, cis, core) - 2h

**Goal:** Comprehensive test coverage for all BMAD functionality

**Recommended Start:** Task 2.1 - Most valuable for immediate validation

---

### 📊 Phase 3: Performance Benchmarking (Option 2)
**Status:** 0/4 tasks | **Effort:** ~8 hours | **Priority:** MEDIUM

- [ ] **3.1** Create baseline metrics - 3h
- [ ] **3.2** Implement performance tracking - 2h
- [ ] **3.3** Set performance SLAs - 1h
- [ ] **3.4** Performance regression detection - 2h

**Goal:** Track and monitor performance over time

**Dependencies:** Best done after Phase 2 (more data points)

---

### 🔄 Phase 4: Migrate Old Tests (Option 3)
**Status:** 0/4 tasks | **Effort:** ~6 hours | **Priority:** MEDIUM

- [ ] **4.1** Migrate agent-loading-flow.test.ts - 2h
- [ ] **4.2** Migrate tool-calling.smoke.test.ts - 1h
- [ ] **4.3** Remove copilot-proxy dependencies - 1h
- [ ] **4.4** Consolidate test utilities - 2h

**Goal:** Clean up legacy infrastructure, single source of truth

**Recommended Start:** Task 4.1 - Convert main E2E test first

---

### 🎯 Phase 5: Production Usage (Option 5)
**Status:** 0/4 tasks | **Effort:** ~11 hours | **Priority:** HIGH

- [ ] **5.1** Test actual user workflows - 3h
  - "Help me debug this API error"
  - "Create a PRD for mobile app"
  - "Design architecture for microservices"
- [ ] **5.2** Monitor agent behavior quality - 2h
- [ ] **5.3** Track quality metrics dashboard - 4h
- [ ] **5.4** Regression testing suite - 2h

**Goal:** Validate real-world use cases and monitor quality

**Recommended Start:** Task 5.1 - Most valuable for users

---

### 🏗️ Phase 6: CI/CD Integration (Future)
**Status:** 0/2 tasks | **Effort:** ~5 hours | **Priority:** LOW

- [ ] **6.1** GitHub Actions workflow - 3h
- [ ] **6.2** Automated session reporting - 2h

**Goal:** Automated testing and reporting in CI/CD pipeline

**Note:** Future work, not currently prioritized

---

## Recommended Execution Order

### Option A: User-Focused (Recommended)
```
1. Phase 5 → Validate real use cases first
2. Phase 2 → Expand coverage based on findings
3. Phase 4 → Clean up as you go
4. Phase 3 → Benchmark when stable
```

**Rationale:** Get user value immediately, iterate based on real needs

### Option B: Coverage-Focused
```
1. Phase 2 → Build comprehensive coverage
2. Phase 5 → Apply to real scenarios
3. Phase 3 → Establish benchmarks
4. Phase 4 → Clean up legacy code
```

**Rationale:** Systematic approach, all functionality tested first

### Option C: Clean-Up-Focused
```
1. Phase 4 → Migrate old tests first
2. Phase 2 → Expand with clean foundation
3. Phase 5 → Apply to production
4. Phase 3 → Benchmark at the end
```

**Rationale:** Clean slate before building more

---

## Quick Start Commands

### Validate Current State
```bash
# Run existing E2E tests
npm run test:e2e:copilot

# Run session analysis validation
npm run test:copilot-session
```

### Start Phase 2
```bash
# Create test file for all agents
touch tests/e2e/copilot-cli-all-agents.test.ts

# Use existing test as template
code tests/e2e/copilot-cli-agent-loading.test.ts
```

### Start Phase 5
```bash
# Create user scenario tests
mkdir -p tests/e2e/user-scenarios
touch tests/e2e/user-scenarios/debugging-session.test.ts
```

### Start Phase 4
```bash
# Open file to migrate
code tests/e2e/agent-loading-flow.test.ts

# Reference new helper
code tests/framework/helpers/copilot-session-helper.ts
```

---

## Effort Summary

| Phase | Tasks | Hours | Status |
|-------|-------|-------|--------|
| Phase 1 | 6 | ~10h | ✅ Complete |
| Phase 2 | 4 | ~13h | 📋 TODO |
| Phase 3 | 4 | ~8h | 📋 TODO |
| Phase 4 | 4 | ~6h | 📋 TODO |
| Phase 5 | 4 | ~11h | 📋 TODO |
| Phase 6 | 2 | ~5h | 📋 Future |
| **Total** | **24** | **~53h** | **22% done** |

---

## Key Deliverables by Phase

### Phase 2 Deliverables
- `tests/e2e/copilot-cli-all-agents.test.ts`
- `tests/e2e/copilot-cli-workflows.test.ts`
- `tests/e2e/copilot-cli-error-handling.test.ts`
- `tests/e2e/copilot-cli-multi-module.test.ts`

### Phase 3 Deliverables
- `tests/benchmarks/agent-loading-baseline.test.ts`
- `tests/framework/helpers/performance-tracker.ts`
- `docs/performance-baseline.md`
- `docs/performance-slas.md`

### Phase 4 Deliverables
- Migrated `tests/e2e/agent-loading-flow.test.ts`
- Migrated `tests/e2e/tool-calling.smoke.test.ts`
- Cleaned up `tests/framework/helpers/`

### Phase 5 Deliverables
- `tests/e2e/user-scenarios/*.test.ts`
- `tests/e2e/quality/agent-behavior.test.ts`
- `scripts/generate-quality-report.mjs`
- `docs/quality-dashboard.md`

---

## Success Metrics

### Phase 1 ✅
- [x] Parallel-safe execution working
- [x] Session analysis capturing data
- [x] Zero cost (using Copilot CLI)
- [x] Comprehensive documentation

### Phase 2 📋
- [ ] All 8+ agents tested
- [ ] All major workflows tested
- [ ] Error scenarios validated
- [ ] Multi-module coverage

### Phase 3 📋
- [ ] Baseline metrics established
- [ ] Performance SLAs defined
- [ ] Trend tracking implemented
- [ ] Regression detection working

### Phase 4 📋
- [ ] All old tests migrated
- [ ] Copilot-proxy code removed
- [ ] Single test framework
- [ ] Documentation updated

### Phase 5 📋
- [ ] 3+ user scenarios tested
- [ ] Agent behavior validated
- [ ] Quality dashboard created
- [ ] Regression suite running

---

## Next Actions

**Immediate (Today):**
1. Review roadmap and choose starting phase
2. Run `npm run test:e2e:copilot` to validate current state
3. Select first task to implement

**Recommended (This Week):**
- Start Phase 5 Task 5.1 (user workflows) OR
- Start Phase 2 Task 2.1 (all agents)

**Follow-Up (Next Week):**
- Continue selected phase
- Document findings
- Adjust priorities based on learnings

---

## Resources

- **Quick Start:** [docs/e2e-testing-quickstart.md](./e2e-testing-quickstart.md)
- **Full Guide:** [docs/copilot-cli-session-analysis.md](./copilot-cli-session-analysis.md)
- **Status:** [docs/e2e-testing-status.md](./e2e-testing-status.md)
- **Workflow:** [.workflow-status.yaml](../.workflow-status.yaml)

---

**Last Updated:** November 9, 2025  
**Overall Status:** Phase 1 Complete (22% total progress)  
**Next Milestone:** Complete Phase 2 or Phase 5
