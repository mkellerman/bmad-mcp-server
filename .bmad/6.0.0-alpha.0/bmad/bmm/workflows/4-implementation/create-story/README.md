# Create Story

## Purpose

Generate the next user story from epics/PRD and architecture context into your configured stories directory using a consistent structure.

## Highlights

- Auto-detects next story id based on existing files
- Pulls ACs from `epics.md` (or PRD) when available
- Saves to `{dev_story_location}` from `bmad/bmm/config.yaml`
- Optional: immediately runs Story Context workflow for the new story
- Spec-compliant with core workflow engine at `bmad/core/tasks/workflow.md`
- Defaults to non-interactive `#yolo` mode; only asks when strictly necessary
- Safeguard: Will NOT create a new story unless epics.md explicitly enumerates it; otherwise halts and instructs to run PM/SM `*correct-course`

## Invoke

- By path: `workflow {project-root}/bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`

## Variables

- `story_dir`: from config `dev_story_location`
- `epics_file`: default `{output_folder}/epics.md`
- `prd_file`: default `{output_folder}/prd.md`
- `hla_file`: default `{output_folder}/high-level-architecture.md`
- `auto_run_context`: default `true`
- `tech_spec_file`: auto-discovered in `{project-root}/docs` with pattern `tech-spec-epic-<epic_num>-*.md` (latest by modified time)
- `execution_mode`: `#yolo` by default to minimize prompts
- `arch_docs_search_dirs`: `docs/` and `output_folder` are searched for architecture docs
- `arch_docs_file_names`: includes `tech-stack.md`, `unified-project-structure.md`, `coding-standards.md`, `testing-strategy.md`, `backend-architecture.md`, `frontend-architecture.md`, `data-models.md`, `database-schema.md`, `rest-api-spec.md`, `external-apis.md`

## Output

- New story markdown: `{story_dir}/story-<epic_num>.<story_num>.md`
- Status: `Draft`
- Guardrail: If `epics.md` lacks the next story under the current epic, the workflow halts with: "No planned next story found in epics.md for epic <epic_num>. Please load either PM (Product Manager) agent at `{project-root}/bmad/bmm/agents/pm.md` or SM (Scrum Master) agent at `{project-root}/bmad/bmm/agents/sm.md` and run `*correct-course` to add/modify epic stories, then rerun create-story."

## After Creation

- Approve the story when ready (Status → Approved)
- Then run the Dev agent `*develop` command (uses the Dev Story workflow)
