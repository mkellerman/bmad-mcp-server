# BMAD MCP Server

## I built an MCP server with portable BMAD configs (local folders, user-level, or GitHub)

TL;DR: BMAD MCP Server exposes a single “bmad” tool with discovery and routing. Point it at a BMAD config in any folder (in-repo, shared repo, user-level), or add GitHub URLs as sources. That means you can publish individual agents on GitHub and other projects can pull them directly—no path wrangling. Repo: https://github.com/mkellerman/bmad-mcp-server

### Why care

- Share the same BMAD config across multiple projects.
- Keep a user-level BMAD library (e.g., ~/.bmad) and reuse it everywhere.
- Reference GitHub as a source so teams can publish small, independent agents/workflows that “just plug in.”

### What it does

- One tool: bmad
  - Empty → default agent
  - analyst → load an agent by name
  - \*party-mode → run a workflow
- Discovery commands: *list-agents, *list-workflows, \*doctor
- Smart discovery: looks in ./bmad → CLI arg → BMAD_ROOT → ~/.bmad → package defaults
- Master manifest: resolves agents/workflows across all sources (including GitHub) without hardcoded paths

### Pointing to configs (portable by design)

- Project folder: BMAD_ROOT=./bmad
- Shared repo folder: BMAD_ROOT=../shared/bmad
- User-level: BMAD_ROOT=$HOME/.bmad
- GitHub sources: add GitHub URLs in your BMAD config; bmad will resolve them into the manifest so agents can be used by name

### Try it in VSCode now!

````json
{
  "servers": {
    "bmad": {
      "command": "npx",
      "args": [
        "-y",
        "bmad-mcp-server"
        "git+https://github.com/mkellerman/bmad-mcp-server.git#main"
      ]
    }
  }
}```

Then from Copilot, call:
````

#bmad
#bmad analyst
#bmad *list-agents
#bmad *party-mode

```

If this sounds useful, I’d love feedback—especially on GitHub-sourced agent workflows and naming UX. Stars and PRs welcome!
```
