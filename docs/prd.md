# Product Requirements Document: BMAD MCP Server

**Product Name:** BMAD MCP Server  
**Version:** 1.0  
**Date:** October 23, 2025  
**Owner:** John (Product Manager)  
**Status:** Draft - Planning Phase

---

## Executive Summary

The BMAD MCP Server is a Model Context Protocol implementation that exposes the BMAD (Business Methodology for Agile Development) framework to any MCP-compatible host (Claude Desktop, Cursor, etc.). It acts as a **file proxy**, serving BMAD files on-demand without parsing or transformation. The LLM (with BMAD methodology already loaded via GitHub Copilot instructions) processes files according to BMAD rules, enabling users to leverage BMAD methodology without per-project installation.

## Problem Statement

### Current State
- BMAD methodology requires installation in every project (`npx install` per repo)
- Users must maintain multiple BMAD installations across projects
- No centralized BMAD distribution mechanism
- Format-specific parsing logic would be fragile and hard to maintain

### Desired State
- Single BMAD installation accessible from any project via MCP server
- BMAD files served on-demand as raw content
- LLM processes files using existing BMAD methodology knowledge
- Format-agnostic: server doesn't care if BMAD changes file formats

## Goals & Success Metrics

### Primary Goals
1. Enable BMAD agent access through MCP prompts (serve raw agent files)
2. Provide workflow discovery and raw file serving via MCP tools
3. Maintain `/bmad` folder integrity for upstream updates
4. Keep server simple and format-agnostic (no parsing logic)

### Success Metrics
- All 11 BMAD agents accessible via `/bmad-{name}` prompts  
- Workflows discoverable and files served correctly
- Zero modifications to `/bmad` directory structure
- Server remains functional if BMAD changes file formats (format-agnostic)
- Implementation <700 lines of code (simple, maintainable)

### Non-Goals
- Creating new BMAD workflows or agents (use existing)
- Modifying BMAD core functionality
- Building a custom UI (rely on MCP host UIs)
- **Parsing or transforming BMAD files (serve as-is)**
- **Merging configurations server-side (LLM's responsibility)**

## User Personas

### Primary: Development Teams
- Software engineers using Cursor/VSCode with Claude
- Need quick access to BMAD expertise without context switching
- Want guided workflows for analysis, planning, architecture

### Secondary: Product Managers
- Using Claude Desktop for strategic planning
- Need business analysis and product strategy support
- Want structured brainstorming and documentation workflows

## User Stories

### Epic 1: Agent Access
**As a** developer  
**I want to** invoke BMAD agents via slash commands  
**So that** I can get expert guidance in my current conversation

**Acceptance Criteria:**
- Type `/bmad-analyst` to load Mary's persona
- Type `/bmad-architect` to load Winston's persona
- Agent responds in-character with full capabilities
- All 11 agents available as prompts

### Epic 2: Workflow Discovery
**As a** user working with a BMAD agent  
**I want to** discover available workflows through conversation  
**So that** I don't need to know workflow names in advance

**Acceptance Criteria:**
- Agent can call `list_workflows()` to see available workflows
- Results filterable by category (analysis, planning, implementation)
- Workflow descriptions clearly explain purpose
- Agent presents options conversationally

### Epic 3: Workflow Execution
**As a** user  
**I want to** execute workflows on-demand  
**So that** I only load context when actively using it

**Acceptance Criteria:**
- Agent calls `execute_workflow(name)` to begin workflow
- Workflow instructions loaded just-in-time
- Instructions include all necessary templates and steps
- Context cleared after workflow completion

### Epic 4: Knowledge Access
**As a** specialist agent (TEA, etc.)  
**I want to** access domain-specific knowledge bases  
**So that** I can provide expert guidance

**Acceptance Criteria:**
- `get_knowledge(domain)` loads relevant knowledge files
- Knowledge organized by domain (testarch, architecture, etc.)
- Agent can reference knowledge in responses
- Knowledge loaded only when requested

## Requirements

### Functional Requirements

#### FR1: Agent Prompt System
- **FR1.1** Expose 11 BMAD agents as MCP prompts
- **FR1.2** Naming convention: `/bmad-{agent-name}`
- **FR1.3** Serve raw agent markdown + customization YAML files
- **FR1.4** Wrap files with BMAD processing instructions for LLM
- **FR1.5** LLM processes files per BMAD methodology (merging, persona assumption)

#### FR2: Workflow Discovery Tools
- **FR2.1** `list_workflows(category?, module?)` returns filtered workflow list
- **FR2.2** `get_workflow_details(workflow_name)` returns metadata
- **FR2.3** Results include: name, description, author, module, path
- **FR2.4** Read from `/bmad/_cfg/workflow-manifest.csv`

#### FR3: Workflow Execution Tools
- **FR3.1** `execute_workflow(workflow_name, params?)` loads and returns raw workflow files
- **FR3.2** Serve raw workflow.yaml file content
- **FR3.3** Serve raw instructions.md or .xml file content  
- **FR3.4** Wrap files with BMAD execution instructions for LLM
- **FR3.5** LLM processes workflow per BMAD methodology (variable resolution, step execution)

#### FR4: Task Execution Tools
- **FR4.1** `list_tasks()` returns available BMAD tasks
- **FR4.2** `execute_task(task_name, params?)` executes specific task
- **FR4.3** Read from `/bmad/_cfg/task-manifest.csv`

#### FR5: Knowledge Access Tools
- **FR5.1** `get_knowledge(domain)` serves raw knowledge base files
- **FR5.2** Support domains: testarch, architecture, patterns
- **FR5.3** Return raw markdown content for LLM to process

#### FR6: Manifest Resources
- **FR6.1** Expose manifests as MCP resources
- **FR6.2** `bmad://manifests/workflows` - workflow manifest
- **FR6.3** `bmad://manifests/agents` - agent manifest  
- **FR6.4** `bmad://manifests/tasks` - task manifest
- **FR6.5** `bmad://config/current` - active project config

### Non-Functional Requirements

#### NFR1: Performance
- Agent prompt invocation < 1 second
- Workflow list retrieval < 500ms
- Workflow execution initiation < 2 seconds

#### NFR2: Maintainability
- Zero modifications to `/bmad` directory
- All server code in `/src` directory
- Updates via `git pull` in `/bmad` folder work seamlessly

#### NFR3: Scalability
- Support 50+ workflows without performance degradation
- Handle multiple simultaneous agent sessions
- Lazy loading prevents context overflow

#### NFR4: Compatibility
- Compatible with MCP protocol standard
- Works with Claude Desktop, Cursor, and other MCP hosts
- Python-based for reference implementation compatibility

## Technical Stack

### Language & Framework
- **Python 3.11+** - Matches MCP reference implementation
- **MCP SDK** - Official Model Context Protocol SDK
- **AsyncIO** - Asynchronous operation support

### Dependencies
- `mcp` - MCP protocol implementation
- Standard library only - no YAML/markdown parsing libraries needed!

## Architecture Overview

(See `architecture.md` for detailed architecture)

### High-Level Components
1. **MCP Server** - Protocol implementation and request routing
2. **Manifest Loader** - Read CSV manifests for discovery only
3. **File Reader** - Serve raw file content (no parsing)
4. **Prompt Builder** - Wrap raw files with BMAD instructions
5. **Tool Executor** - Coordinate file serving for workflows/tasks

### Data Flow
```
User invokes /bmad-analyst
  ↓
MCP Server receives prompt request
  ↓
Prompt Builder reads analyst.md + customization.yaml (RAW)
  ↓
Server wraps raw files with BMAD processing instructions
  ↓
Raw files + instructions returned to LLM
  ↓
LLM processes per BMAD methodology (merges, assumes persona)
  ↓
User converses with agent
  ↓
Agent calls list_workflows()
  ↓
Manifest Loader reads workflow-manifest.csv (for discovery)
  ↓
Filtered results returned to agent
  ↓
Agent presents options to user
  ↓
Agent calls execute_workflow('brainstorm-project')
  ↓
File Reader serves workflow.yaml + instructions.md (RAW)
  ↓
Server wraps raw files with BMAD execution instructions
  ↓
LLM processes workflow per BMAD methodology
```

## File Structure

```
bmad-mcp-server/
├── src/
│   ├── mcp_server.py           # Main MCP server entry point
│   ├── loaders/
│   │   ├── __init__.py
│   │   ├── manifest_loader.py  # CSV manifest parsing (discovery only)
│   │   └── file_reader.py      # Raw file reading (no parsing)
│   ├── builders/
│   │   ├── __init__.py
│   │   ├── prompt_builder.py   # Wrap raw files with BMAD instructions
│   │   ├── tool_builder.py     # MCP tool definitions
│   │   └── resource_builder.py # MCP resource definitions
│   └── utils/
│       ├── __init__.py
│       └── path_validator.py   # Security: validate paths stay in /bmad
├── bmad/                       # BMAD installation (untouched)
│   ├── core/
│   ├── bmm/
│   └── _cfg/
├── docs/
│   ├── prd.md                  # This document
│   ├── architecture.md         # Architecture specification
│   └── user-guide.md           # End-user documentation
├── tests/
│   ├── test_manifest_loader.py
│   ├── test_file_reader.py
│   └── test_integration.py
├── pyproject.toml              # Python project configuration
├── uv.lock                     # Dependency lock file
└── README.md                   # Project overview
```

## Development Phases

### Phase 1: Foundation (MVP)
**Goal:** Basic agent prompt system working

**Deliverables:**
- MCP server skeleton
- Manifest loader (CSV parsing for discovery)
- File reader (raw file serving)
- Prompt builder (wrap raw files)
- Expose 11 agent prompts
- Basic testing

**Success Criteria:**
- User can invoke `/bmad-analyst` in Claude Desktop
- Raw agent files served correctly with BMAD instructions
- LLM processes files and responds in-character

### Phase 2: Workflow Discovery
**Goal:** Agents can discover workflows

**Deliverables:**
- Workflow manifest loader
- `list_workflows()` tool
- `get_workflow_details()` tool
- Category filtering

**Success Criteria:**
- Agent can query available workflows
- Results filterable by category
- Workflow metadata accurate

### Phase 3: Workflow Execution
**Goal:** Workflows execute on-demand

**Deliverables:**
- File reader for workflows
- `execute_workflow()` tool
- Wrap raw files with BMAD execution instructions

**Success Criteria:**
- Raw workflow files served correctly
- LLM processes and executes workflows per BMAD methodology

### Phase 4: Extended Capabilities
**Goal:** Full feature set

**Deliverables:**
- Task execution tools
- Knowledge base access
- Resource endpoints
- Comprehensive testing

**Success Criteria:**
- All tools functional
- All resources accessible
- Integration tests passing

## Dependencies & Risks

### Dependencies
- MCP protocol stability (external)
- BMAD v6-alpha structure remains consistent (external)
- Python 3.11+ runtime available (environmental)

### Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| BMAD structure changes breaking manifest parsing | Low | Medium | Only parse CSV manifests, rest is raw files |
| MCP protocol changes | High | Low | Track MCP SDK updates, abstract protocol layer |
| File format changes in BMAD | None | High | Format-agnostic design - server doesn't parse |
| Performance issues with large files | Low | Low | Simple file I/O is fast, optional caching |

## Open Questions

1. **Q:** Should we cache manifest data or reload on every request?  
   **A:** TBD - needs performance testing

2. **Q:** How do we handle workflow state persistence across sessions?  
   **A:** TBD - may punt to Phase 4 or host responsibility

3. **Q:** Should agents be able to invoke other agents?  
   **A:** TBD - interesting but complex, defer to later phase

4. **Q:** How do we handle BMAD updates while server is running?  
   **A:** TBD - may require server restart or hot-reload mechanism

## Approval & Sign-off

- [ ] Product Manager (John) - Approved
- [ ] Architect (Winston) - Approved
- [ ] Scrum Master (Bob) - Approved
- [ ] UX Expert (Sally) - Approved
- [ ] Business Analyst (Mary) - Approved
- [ ] Stakeholder (BLad) - Approved

---

**Next Steps:**
1. Review and approve this PRD
2. Review architecture.md
3. Bob creates user stories
4. Winston creates technical specification
5. Begin Phase 1 implementation
