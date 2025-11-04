# Repository Guidelines

## Project Structure & Module Organization

- `src/` — TypeScript source. Key files: `src/index.ts` (entry), `src/server.ts` (MCP server), `src/tools/unified-tool.ts`, `src/utils/{file-reader,manifest-loader,bmad-path-resolver}.ts`, `src/types/`.
- `src/bmad/` — BMAD assets (agents, workflows, tasks) with manifests in `src/bmad/_cfg/*.csv`.
- `tests/` — Unit tests (`tests/unit`), integration/E2E (`tests/e2e` with Playwright + YAML cases).
- `build/` — Compiled JS output. `scripts/` — helper scripts. `bin/` — internal tools.

## Architecture Overview

- MCP server (`src/server.ts`) uses `@modelcontextprotocol/sdk` with stdio transport; registers prompt handlers and a single `bmad` tool.
- Unified tool (`src/tools/unified-tool.ts`) routes commands: empty → default agent, `<agent>`, or `*<workflow>`; includes discovery commands.
- Discovery (`utils/bmad-path-resolver.ts`) resolves active BMAD root from CWD, CLI arg, `BMAD_ROOT`, `~/.bmad`, package defaults.
- Master manifest (`utils/master-manifest.ts`) aggregates all BMAD resources (agents, workflows, tasks) from all discovered installations into a flattened catalog with absolute paths.
- File resolution (`utils/file-reader.ts`) uses module-aware path resolution: parses v4 (`.bmad-<module>/file`) and v6 (`{project-root}/bmad/<module>/file`) formats, queries master manifest by module+file, returns first match by priority. No path traversal validation needed—master manifest is the source of truth.

## Build, Test, and Development Commands

- `npm run dev` — Run the server via tsx (respects `BMAD_ROOT`). Example: `BMAD_ROOT=/path/to/project npm run dev`.
- `npm run build` — Compile TypeScript to `build/` and prepare CLI.
- `npm start` — Run compiled server (`node build/index.js`).
- `npm test` — Run all tests and generate JSON/HTML reports in `test-results/`.
- E2E: `npm run test:litellm-start` (LiteLLM docker), `npm run test:e2e`, `npm run test:litellm-stop`.

## Coding Style & Naming Conventions

- Language: TypeScript + ESM. Use explicit `.js` in relative imports after build; prefer `interface` over `type` aliases.
- Prettier (`.prettierrc`): 2‑space indent, 80 char width, single quotes, trailing commas. Run `npm run format`.
- ESLint (typescript‑eslint flat config): semicolons required, `no-console` warns (tests/scripts allowed). Fix with `npm run lint:fix`.
- Runtime naming: agents/workflows are lowercase-hyphen (e.g., `analyst`, `party-mode`). Workflows are invoked with `*` (tool routing).

## Testing Guidelines

- Unit tests live in `tests/unit/*.test.ts`; E2E specs in `tests/e2e/framework/*.spec.ts` with YAML cases under `tests/e2e/test-cases/`.
- Keep or increase coverage; add tests for new utils, path resolution, and tool routing. Example: `npm test -- tests/unit/manifest-loader.test.ts`.
- E2E requires LiteLLM (Docker). Verify with `npm run test:litellm-health` if using the proxy scripts.

## Commit & Pull Request Guidelines

- Use Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`). Keep messages concise and scoped.
- PRs must include: clear description, linked issues, test plan, and updates to tests/docs/manifests (`src/bmad/_cfg/*.csv`) as needed.
- CI expectations: `npm run precommit` (lint + format) and all tests green. Attach Playwright report (`playwright-report/`) or logs for E2E changes.

## Security & Configuration Tips

- File access through `utils/file-reader.ts` uses master manifest for path resolution. Security validation happens during manifest construction (only validated BMAD installations are included).
- Agent/workflow lookup supports qualified names: `core/bmad-master` (specific module) or `bmad-master` (first by priority).
- Path resolution supports v4 format (`.bmad-<module>/file.md`) and v6 format (`{project-root}/bmad/<module>/file.yaml`) with placeholder expansion.
- BMAD discovery order: `./bmad` → CLI arg → `BMAD_ROOT` → `~/.bmad` → package defaults. Prefer explicit `BMAD_ROOT` during development.
