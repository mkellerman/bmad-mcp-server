# MCP Server Review Report

Date: 2025-11-07
Agent: MCP SDK Optimizer (LLM Payload Performance Specialist)
Scope: bmad-mcp-server (branch: feature/manifest-integration)

## Summary (Intent + Top Recommendations)

Intent: Assess MCP server structure, protocol compliance, LLM-readiness of responses, performance/reliability, DX/observability; deliver prioritized improvements.

Top 5 Recommendations (Impact / Effort):

1. Response Shaping Middleware (High / Medium)
   - Add optional pre-send transform to inject `intent`, `summary`, `affordances`, and `metrics` into tool/resource responses for first-attempt success.
2. Large Resource Handling (High / Medium)
   - Provide excerpted reads (line/page caps), explicit truncation markers, and streaming for big files.
3. Structured Errors with Remediation (High / Low)
   - Standardize error payloads (code, message, remediation, next-call suggestion) to reduce retries.
4. Observability & Correlation (Medium / Low)
   - Add structured logs with correlation IDs per request and timing metrics per handler.
5. Security Input Validation (Medium / Medium)
   - Validate tool/resource params, normalize and restrict file paths, and add size/time limits to parsers.

## Context

- Entrypoint: `src/index.ts` (BMADServerLiteMultiToolGit)
- Server implementation: `src/server.ts`
- SDK: @modelcontextprotocol/sdk ^1.0.4
- Capabilities exposed: tools, resources, resourceTemplates, prompts, completions

## 1) Protocol Compliance and Structure

- Handlers registered:
  - ListResourceTemplates, ListResources, ReadResource, ListTools, CallTool, ListPrompts, GetPrompt, Complete
- Resource templates use `bmad://` URIs with clear categories (agents, workflows, knowledge, config) ✔️
- ReadResource maps `bmad://` → filesystem via `engine.getLoader().loadFile` ✔️
- Virtual manifests supported for `_cfg/*-manifest.csv` ✔️
- Tools: single unified `bmad` tool constructed via `createBMADTool(...)` ✔️
- Prompts: Agents surfaced as prompts (activation via `GetPrompt`) ✔️

Opportunities:

- Consider declaring stream capability where responses may be large (SDK supports streaming) → better UX for big payloads.
- Add idempotency note for tool behaviors and consistent payload shapes (include `kind`/`type` fields where relevant).

## 2) Response Shaping for LLM Actionability

Heuristics used: intent+summary, affordance enumeration, deduplication, top-N with truncation, compact metrics, next-step suggestions.

Findings:

- Tool output from `handleBMADTool` likely returns plain content arrays without guaranteed `intent/summary/metrics` blocks.
- ReadResource returns raw file contents without excerpting/affordances or metrics.

Improvements:

- Add middleware to shape tool/resource outputs before returning to the SDK:
  - Prepend `{ intent, summary }` relevant to operation
  - Enumerate affordances (what the model can do next)
  - For lists, show top-N and include `...(showing top N of M)`
  - Append `metrics` (token_estimate, section_count, predicted_followups)
- Provide alternate resource view `excerpt`/`summary` endpoints with configurable line limits.

## 3) Performance and Reliability

- Lazy engine initialization is good for startup cost.
- Large files: `loadFile` reads whole file; risk of memory pressure and latency.

Recommendations:

- Implement chunked/excerpted reads, pagination, or streaming for large resources.
- Introduce timeouts and backpressure policies for expensive operations.
- Cache frequently accessed manifests and metadata (with invalidation).

## 4) DX, Testing, and Observability

- Scripts and tests are rich (vitest, e2e framework with docker, various test scripts) ✔️
- Logging primarily via `console.error` at startup; request-level logs minimal.

Recommendations:

- Structured logs (JSON) with fields: `correlationId`, `handler`, `durationMs`, `status`.
- Wrap each handler with timing and error boundaries feeding structured logs.
- Expand tests to include response-shaping assertions (first-attempt success proxies: presence of intent, summary, affordances).

## 5) Prioritized Recommendations (Detail)

1. Response Shaping Middleware
   - Hook at `CallToolRequestSchema` and `ReadResourceRequestSchema` after core handler logic; shape payloads using optimizer templates.
   - Env-flag gated (e.g., BMAD_OPTIMIZE_OUTPUT=true) and/or per-request toggle.

2. Large Resource Handling
   - Add `readResourceExcerpt(uri, maxLines=40)` behavior; surface truncation markers and affordances to request full body or a summary variant.
   - Consider SDK streaming for `ReadResource` responses.

3. Structured Errors
   - Standardize `{ code, message, remediation, next }` error format.
   - Convert thrown Errors into standardized payloads where appropriate.

4. Observability
   - Wrap handlers to log `{ correlationId, route, durationMs, sizeBytes }`.
   - Add minimal metrics (counts/latency) for quick health tracking.

5. Security (see dedicated audit workflow)
   - Validate and normalize file/system paths; restrict to allowlisted roots.
   - Enforce size/time limits for parsers (yaml/json/csv).

## References (KB)

- Sidecar KB: `bmad/agents/mcp-sdk-optimizer-sidecar/knowledge/best-practices/`
  - sdk-usage.md, response-shaping.md, performance.md, logging-monitoring.md, security.md, testing-ci.md

## Appendix A — Noted Code Anchors

- `src/index.ts`: Entrypoint; discovery mode parsing; console error logs; server start.
- `src/server.ts`: Handler setup; resources mapped to bmad://; unified bmad tool; agent prompts; completions.

---

Report generated by MCP SDK Optimizer.
