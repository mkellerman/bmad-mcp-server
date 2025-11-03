# BMAD MCP Server - Test Plan for Remote Agent Loading

## Sprint 1: Remote Registry Foundation ✅

### Unit Tests (27 tests - PASSING)

**File:** `tests/unit/remote-registry.test.ts`

- ✅ Remote name validation (alphanumeric, lowercase, starts with letter)
- ✅ Git URL validation (git+https:// format)
- ✅ CLI argument parsing (--remote=name,url)
- ✅ Built-in remote (@awesome) availability
- ✅ Remote path parsing (@remote:path format)
- ✅ Path resolution (with/without leading slash)
- ✅ URL construction (append path to base URL)
- ✅ Registry listing and sorting
- ✅ Error messages for unknown remotes
- ✅ Edge cases (colons in paths, duplicates, overrides)

### Integration Tests (16 tests - PASSING)

**File:** `tests/integration/remote-registry.test.ts`

- ✅ End-to-end remote resolution workflow
- ✅ Multiple remotes registration
- ✅ Agent and module path resolution
- ✅ Deep path handling
- ✅ Built-in remote preservation and override
- ✅ Real-world usage patterns (awesome-bmad-agents, enterprise)
- ✅ Git cache system compatibility
- ✅ Ref preservation (tags, branches, commits)

### Manual Tests

- ✅ `*list-remotes` command integration
- ✅ Server startup with `--remote` args
- ✅ Remote registry logging

**Sprint 1 Total: 43 automated tests**

---

## Sprint 2: Remote Discovery Commands (Planned)

### Unit Tests (Target: ~20 tests)

**File:** `tests/unit/remote-discovery.test.ts`

**`*list-agents @remote` command:**

- [ ] Resolve @remote to git URL
- [ ] Clone/cache repository if not present
- [ ] Pull updates if repository cached
- [ ] Scan agents/ directories
- [ ] Parse agent manifests (YAML/CSV/MD)
- [ ] Extract agent metadata (name, title, description, icon)
- [ ] Format agent list output
- [ ] Handle repositories without agents/
- [ ] Handle malformed manifests gracefully
- [ ] Error on unknown remote

**`*list-modules @remote` command:**

- [ ] Scan modules/ directories
- [ ] Parse module manifests
- [ ] Format module list output
- [ ] Handle repositories without modules/

**Installation status indicators:**

- [ ] Detect if agent already in mcp.json
- [ ] Mark installed agents with ✅
- [ ] Compare remote vs local versions

### Integration Tests (Target: ~15 tests)

**File:** `tests/integration/remote-discovery.test.ts`

- [ ] Full discovery workflow with mock git repo
- [ ] Cache hit vs cache miss scenarios
- [ ] Network failure handling
- [ ] Mixed success/failure across multiple remotes
- [ ] Large repository handling (many agents)
- [ ] Empty repository handling
- [ ] Discovery + listing in single session

### E2E Tests (Target: ~5 tests)

**File:** `tests/e2e/remote-discovery.spec.ts`

- [ ] List agents from actual awesome-bmad-agents repo
- [ ] List modules from actual repo
- [ ] Cache persistence across commands
- [ ] Error display for invalid remote

**Sprint 2 Target: 40 automated tests**

---

## Sprint 3: Dynamic Agent Loading (Planned)

### Unit Tests (Target: ~25 tests)

**File:** `tests/unit/dynamic-agent-loading.test.ts`

**Path parsing:**

- [ ] Parse `@remote:agents/name` format
- [ ] Extract remote and agent path
- [ ] Validate path structure
- [ ] Handle qualified paths (module/agent)

**Agent loading:**

- [ ] Load agent from cache
- [ ] Update master manifest in memory
- [ ] Agent becomes available for invocation
- [ ] Session-scoped availability
- [ ] Cleanup on server restart

**Conflict resolution:**

- [ ] Detect name conflicts with installed agents
- [ ] Prefer installed over dynamic
- [ ] Clear error messages
- [ ] Suggest alternatives

**Cache management:**

- [ ] First load triggers git pull
- [ ] Subsequent loads use cache
- [ ] Handle git errors gracefully
- [ ] Network failure fallback

### Integration Tests (Target: ~20 tests)

**File:** `tests/integration/dynamic-agent-loading.test.ts`

- [ ] Full load workflow (resolve → cache → load → invoke)
- [ ] Multiple agents from same remote
- [ ] Agents from different remotes
- [ ] Session persistence
- [ ] Server restart clears dynamic agents
- [ ] Mixed installed + dynamic agents
- [ ] Load → use → load another → use both
- [ ] Memory management (many dynamic agents)
- [ ] Agent metadata preservation
- [ ] File reader integration

### E2E Tests (Target: ~10 tests)

**File:** `tests/e2e/dynamic-agent-loading.spec.ts`

**Using MCP protocol:**

- [ ] Load debug-diana from @awesome
- [ ] Invoke loaded agent via `bmad debug`
- [ ] Load multiple agents in sequence
- [ ] Agent content verification
- [ ] Workflow execution with dynamic agent
- [ ] Error handling (agent not found)
- [ ] Performance (load time < 2s)

### Performance Tests (Target: ~5 tests)

**File:** `tests/performance/dynamic-loading.test.ts`

- [ ] Cold cache load time
- [ ] Warm cache load time
- [ ] Memory usage (10 agents)
- [ ] Concurrent load requests
- [ ] Large agent file handling

**Sprint 3 Target: 60 automated tests**

---

## Overall Testing Strategy

### Coverage Goals

- **Unit Tests:** >90% coverage for new code
- **Integration Tests:** All critical paths
- **E2E Tests:** Major user workflows
- **Performance Tests:** Baseline established

### CI/CD Requirements

- All tests must pass before merge
- Coverage must not decrease
- Performance benchmarks documented
- E2E tests run against real repos (cached in CI)

### Test Data

- Mock git repositories for unit/integration tests
- Use actual awesome-bmad-agents for E2E
- Fixture repositories for edge cases
- Performance test data sets

### Tools

- Vitest for unit/integration tests
- Playwright for E2E tests (if needed)
- Custom test harness for MCP protocol
- Coverage reporting via vitest

---

## Current Status

✅ **Sprint 1: 43 tests (100% passing)**

- 27 unit tests
- 16 integration tests
- Manual verification complete

⏳ **Sprint 2: 0/40 tests**
⏳ **Sprint 3: 0/60 tests**

**Total Planned: 143 automated tests**

---

## Test Execution Commands

```bash
# Run all tests
npm test

# Run specific suite
npm test -- tests/unit/remote-registry.test.ts
npm test -- tests/integration/remote-registry.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Run Sprint 2 tests (when ready)
npm test -- tests/unit/remote-discovery.test.ts
npm test -- tests/integration/remote-discovery.test.ts

# Run Sprint 3 tests (when ready)
npm test -- tests/unit/dynamic-agent-loading.test.ts
npm test -- tests/integration/dynamic-agent-loading.test.ts
npm test -- tests/e2e/dynamic-agent-loading.spec.ts
```

---

## Notes

- All tests use Vitest framework
- Integration tests mock git operations where possible
- E2E tests may require network access
- Performance tests establish baselines, not strict limits
- Tests should be independent and parallelizable
