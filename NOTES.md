

I want us to leverage the latest concepts of MCP server: tools, resources, prompts
Using this repo as a guide: https://github.com/ALucek/quick-mcp-example

# Install bmad in root of the repo
npx git+https://github.com/bmad-code-org/BMAD-METHOD.git#v6-alpha install

# How to test
create an empty tmp folder.
cd <tmp-folder>
create file <tmp-folder>/.vscode/mcp.json
```json
{
  "servers": {
    "bmad": {
      "command": "uv",
      "args": [
        "run",
        "--directory",
        "/Users/mkellerman/GitHub/bmad-mcp-server",
        "bmad-mcp-server"
      ]
    }
  }
}
```

copilot -p "</command you want to test>" --allow-tool 'bmad' --log-level debug --log-dir /Users/mkellerman/GitHub/bmad-mcp-server/.logs

