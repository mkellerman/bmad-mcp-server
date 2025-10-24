# BMAD MCP Server - Architecture Diagrams

**Generated:** October 24, 2025

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AI Assistant Layer                             │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   GitHub     │  │    Claude    │  │    Cursor    │             │
│  │   Copilot    │  │   Desktop    │  │              │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                  │                  │                      │
└─────────┼──────────────────┼──────────────────┼──────────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                    Model Context Protocol
                             │
          ┌──────────────────┴──────────────────┐
          ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BMAD MCP Server Process                          │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              mcp_server.py (Main Entry Point)                 │ │
│  │                                                               │ │
│  │  Protocol Handlers:                                          │ │
│  │  • list_tools()    → Expose 'bmad' tool                      │ │
│  │  • call_tool()     → Execute commands                        │ │
│  │  • list_prompts()  → Agent discovery                         │ │
│  │  • get_prompt()    → Load agent content                      │ │
│  │  • list_resources()→ Workflow/task listing                   │ │
│  │  • read_resource() → Read workflow content                   │ │
│  └────────┬─────────────────────────────────────────┬────────────┘ │
│           │                                          │              │
│           ▼                                          ▼              │
│  ┌──────────────────────┐               ┌──────────────────────┐  │
│  │  UnifiedBMADTool     │               │  ManifestLoader      │  │
│  │                      │               │                      │  │
│  │  • execute()         │◄──────────────┤  • load_agent_       │  │
│  │  • _parse_command()  │               │    manifest()        │  │
│  │  • _validate_name()  │               │  • load_workflow_    │  │
│  │  • _load_agent()     │               │    manifest()        │  │
│  │  • _execute_workflow()│              │  • load_task_        │  │
│  │  • _list_agents()    │               │    manifest()        │  │
│  │  • _list_workflows() │               └──────────────────────┘  │
│  │  • _fuzzy_match()    │                                          │
│  └──────────┬───────────┘                                          │
│             │                                                       │
│             ▼                                                       │
│  ┌──────────────────────┐                                          │
│  │  FileReader          │                                          │
│  │                      │                                          │
│  │  • read_file()       │                                          │
│  │  • file_exists()     │                                          │
│  │  • _validate_path()  │◄─── Security Boundary: bmad_root        │
│  │  • _resolve_path()   │                                          │
│  └──────────────────────┘                                          │
│                                                                      │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       ▼ Reads from
┌─────────────────────────────────────────────────────────────────────┐
│                    BMAD Framework (File System)                     │
│                                                                      │
│  src/bmad/                                                          │
│  ├── _cfg/                      ◄── Discovery Manifests            │
│  │   ├── agent-manifest.csv     ◄── 11 agents                      │
│  │   ├── workflow-manifest.csv  ◄── 36+ workflows                  │
│  │   └── task-manifest.csv      ◄── Tasks                          │
│  │                                                                  │
│  ├── core/                      ◄── Core Module                    │
│  │   ├── agents/                                                   │
│  │   │   └── bmad-master.md                                        │
│  │   └── workflows/                                                │
│  │       ├── brainstorming/                                        │
│  │       └── party-mode/                                           │
│  │                                                                  │
│  └── bmm/                       ◄── BMM Module                     │
│      ├── config.yaml                                               │
│      ├── agents/                                                   │
│      │   ├── analyst.md                                            │
│      │   ├── architect.md                                          │
│      │   ├── dev.md                                                │
│      │   └── ... (8 more)                                          │
│      └── workflows/                                                │
│          ├── 1-analysis/                                           │
│          ├── 2-plan-workflows/                                     │
│          ├── 3-solutioning/                                        │
│          └── 4-implementation/                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Command Flow - Agent Loading

```
User: "bmad analyst"
   │
   ▼
┌─────────────────────────┐
│  AI Assistant           │
│  MCP Client             │
└──────────┬──────────────┘
           │ call_tool("bmad", {command: "analyst"})
           ▼
┌─────────────────────────┐
│  mcp_server.py          │
│  call_tool()            │
└──────────┬──────────────┘
           │ await unified_tool.execute("analyst")
           ▼
┌─────────────────────────┐
│  UnifiedBMADTool        │
│  execute()              │
└──────────┬──────────────┘
           │
           ▼
    ┌──────────────┐
    │ Parse        │  "analyst" → type: "agent", name: "analyst"
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Validate     │  Check: security, length, pattern, existence
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Route        │  type == "agent" → _load_agent("analyst")
    └──────┬───────┘
           │
           ▼
┌─────────────────────────┐
│  _load_agent()          │
│  1. Find in manifest    │
│  2. Get file path       │
│  3. Read agent.md       │
│  4. Format response     │
└──────────┬──────────────┘
           │ file_reader.read_file("bmad/bmm/agents/analyst.md")
           ▼
┌─────────────────────────┐
│  FileReader             │
│  1. Resolve path        │
│  2. Validate path       │
│  3. Read file           │
└──────────┬──────────────┘
           │ File content
           ▼
┌─────────────────────────┐
│  Format Response        │
│  {                      │
│    success: true,       │
│    type: "agent",       │
│    name: "analyst",     │
│    content: "...",      │
│    metadata: {...}      │
│  }                      │
└──────────┬──────────────┘
           │ Return to AI Assistant
           ▼
┌─────────────────────────┐
│  AI adopts agent        │
│  persona and responds   │
│  as Mary, the Business  │
│  Analyst                │
└─────────────────────────┘
```

## Command Flow - Workflow Execution

```
User: "bmad *party-mode"
   │
   ▼
┌─────────────────────────┐
│  AI Assistant           │
└──────────┬──────────────┘
           │ call_tool("bmad", {command: "*party-mode"})
           ▼
┌─────────────────────────┐
│  UnifiedBMADTool        │
│  execute()              │
└──────────┬──────────────┘
           │
           ▼
    ┌──────────────┐
    │ Parse        │  "*party-mode" → type: "workflow", name: "party-mode"
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Validate     │  Check workflow exists in manifest
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Route        │  type == "workflow" → _execute_workflow("party-mode")
    └──────┬───────┘
           │
           ▼
┌─────────────────────────┐
│  _execute_workflow()    │
│  1. Find in manifest    │
│  2. Read workflow.yaml  │
│  3. Read instructions   │
│  4. Format response     │
└──────────┬──────────────┘
           │ Return workflow content
           ▼
┌─────────────────────────┐
│  AI processes workflow  │
│  instructions and       │
│  orchestrates multi-    │
│  agent discussion       │
└─────────────────────────┘
```

## Validation Pipeline

```
Command Input
      │
      ▼
┌─────────────────────────┐
│  Security Check         │
│  • Dangerous chars?     │
│  • Non-ASCII?           │
└──────────┬──────────────┘
           │ ✓ Pass
           ▼
┌─────────────────────────┐
│  Length Check           │
│  • Min: 2 chars         │
│  • Max: 50 chars        │
└──────────┬──────────────┘
           │ ✓ Pass
           ▼
┌─────────────────────────┐
│  Pattern Check          │
│  • Lowercase only       │
│  • Hyphens allowed      │
│  • Numbers (workflows)  │
└──────────┬──────────────┘
           │ ✓ Pass
           ▼
┌─────────────────────────┐
│  Existence Check        │
│  • In manifest?         │
│  • File exists?         │
└──────────┬──────────────┘
           │ ✗ Fail
           ▼
┌─────────────────────────┐
│  Fuzzy Match            │
│  • 70% similarity       │
│  • Suggest closest      │
└──────────┬──────────────┘
           │
           ▼
    Error with Suggestion
```

## Data Flow - Manifest Loading

```
Server Startup
      │
      ▼
┌─────────────────────────┐
│  BMADMCPServer.__init__ │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  ManifestLoader         │
│  Locate: bmad/_cfg/     │
└──────────┬──────────────┘
           │
           ├──► load_agent_manifest()
           │    │
           │    ├── Read agent-manifest.csv
           │    ├── Parse CSV → list[dict]
           │    └── Cache in memory
           │
           ├──► load_workflow_manifest()
           │    │
           │    ├── Read workflow-manifest.csv
           │    ├── Parse CSV → list[dict]
           │    └── Cache in memory
           │
           └──► load_task_manifest()
                │
                ├── Read task-manifest.csv
                ├── Parse CSV → list[dict]
                └── Cache in memory
```

## Security Boundary

```
┌─────────────────────────────────────────────────────┐
│  Security Boundary: bmad_root                       │
│  /Users/user/bmad-mcp-server/src/                  │
│                                                      │
│  ✅ ALLOWED:                                        │
│  src/bmad/core/agents/analyst.md                   │
│  src/bmad/bmm/workflows/prd/workflow.yaml          │
│  src/bmad/_cfg/agent-manifest.csv                  │
│                                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Outside Boundary                                    │
│                                                      │
│  ❌ BLOCKED:                                        │
│  /etc/passwd                                        │
│  /Users/user/.ssh/id_rsa                           │
│  ../../../etc/hosts                                │
│  /Users/user/bmad-mcp-server/secret.key            │
│                                                      │
└─────────────────────────────────────────────────────┘

FileReader Validation:
1. Resolve path (handle symlinks, .., relative)
2. Check if resolved path starts with bmad_root
3. Reject if outside boundary
4. Read file only if validated
```

## Module Dependencies

```
┌─────────────────┐
│  mcp_server.py  │
└────────┬────────┘
         │
         ├──► UnifiedBMADTool
         │    └──► ManifestLoader
         │    └──► FileReader
         │
         ├──► ManifestLoader
         │    └──► csv (stdlib)
         │
         └──► FileReader
              └──► pathlib (stdlib)

External Dependencies:
• mcp (SDK) - Model Context Protocol
• pytest - Testing framework
• litellm - LLM testing (e2e only)
```

## Test Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Test Suite                        │
└─────────────────────────────────────────────────────┘
         │
         ├──► Unit Tests (Fast, Isolated)
         │    ├── test_unified_tool.py
         │    ├── test_mcp_server.py
         │    ├── test_file_reader.py
         │    └── test_manifest_loader.py
         │
         ├──► Integration Tests (Component Integration)
         │    ├── test_mcp_server_integration.py
         │    ├── test_agent_prompts.py
         │    └── test_bmad_tool_mcp_validation.py
         │
         └──► E2E Tests (Full Workflow with AI)
              ├── test_copilot_agent_activation.py
              ├── test_declarative_examples.py
              └── test_multi_agent_workflows.py
                   │
                   └──► Uses: CopilotTester
                        • Real GitHub Copilot API
                        • Full MCP protocol
                        • Actual LLM responses
```

## State Transitions

```
Agent Activation States:
┌─────────┐  load agent   ┌─────────┐
│ Neutral │ ────────────► │ Active  │
│  State  │               │ Agent   │
└─────────┘               └────┬────┘
                               │
                               │ load different agent
                               ▼
                          ┌─────────┐
                          │ New     │
                          │ Agent   │
                          └─────────┘

Workflow Execution States:
┌─────────┐  *workflow    ┌──────────┐
│ Idle    │ ────────────► │ Executing│
└─────────┘               └────┬─────┘
                               │
                               │ complete
                               ▼
                          ┌─────────┐
                          │ Complete│
                          └─────────┘
```

---

**For complete documentation, see:** `docs/bmm-index.md`
