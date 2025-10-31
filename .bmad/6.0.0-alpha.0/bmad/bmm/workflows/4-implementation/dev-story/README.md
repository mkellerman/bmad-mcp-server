# Dev Story

## Purpose

Execute a single user story end-to-end: select the next incomplete task, implement it following repo standards, write tests, run validations, and update the story file — all in a v6 action workflow.

## Key Features

- Auto-discovers recent stories from config `dev_story_location`
- Presents a selectable list of latest stories
- Iterates task-by-task until the story is complete
- Enforces acceptance criteria and test coverage
- Restricts edits to approved sections of the story file

## How to Invoke

- By workflow name (if your runner supports it):
  - `workflow dev-story`
- By path:
  - `workflow {project-root}/bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`

## Inputs and Variables

- `story_path` (optional): Explicit path to a story markdown file. If omitted, the workflow will auto-discover stories.
- `run_tests_command` (optional, default: `auto`): Command used to run tests. When `auto`, the runner should infer (e.g., `npm test`, `pnpm test`, `yarn test`, `pytest`, `go test`, etc.).
- `strict` (default: `true`): If `true`, halt on validation or test failures.
- `story_dir` (from config): Resolved from `{project-root}/bmad/bmm/config.yaml` key `dev_story_location`.
- `story_selection_limit` (default: `10`): Number of recent stories to show when selecting.

## Config

Ensure your BMM config defines the stories directory:

```yaml
# bmad/bmm/config.yaml
output_folder: ./outputs
user_name: Your Name
communication_language: en
# Directory where story markdown files live
dev_story_location: ./docs/stories
```

## Workflow Summary

1. Load story and select next task
   - Use `story_path` if provided; otherwise list most recent stories from `dev_story_location`
   - Parse Story, Acceptance Criteria, Tasks/Subtasks, Dev Notes, Status
   - Pick the first incomplete task
2. Plan and implement
   - Log brief plan in Dev Agent Record → Debug Log
   - Implement task and subtasks, handle edge cases
3. Write tests
   - Add unit, integration, and E2E (as applicable)
4. Run validations and tests
   - Run existing tests for regressions + new tests
   - Lint/quality checks if configured; ensure ACs met
5. Mark task complete and update story
   - Check [x] on task(s), update File List, add Completion Notes and Change Log
   - Repeat from step 1 if tasks remain
6. Completion sequence
   - Verify all tasks done, run full regression suite, update Status → "Ready for Review"
7. Validation and handoff (optional)
   - Optionally run validation and finalize notes

## Allowed Story File Modifications

Only these sections may be changed by this workflow:

- Tasks/Subtasks checkboxes
- Dev Agent Record (Debug Log, Completion Notes)
- File List
- Change Log
- Status

## Files in This Workflow

- `workflow.yaml` — configuration and variables
- `instructions.md` — execution logic and steps
- `checklist.md` — validation checklist for completion

## Related Workflows

- `story-context` — Build dev context for a single story
- `story-context-batch` — Process multiple stories and update status
