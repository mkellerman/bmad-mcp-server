# User Stories: BMAD MCP Server

**Project:** BMAD MCP Server  
**Sprint Planning Date:** October 23, 2025  
**Scrum Master:** Bob  

---

## Story Sizing Guide
- **XS (1 point):** < 2 hours
- **S (2 points):** 2-4 hours  
- **M (3 points):** 4-8 hours (half day to full day)
- **L (5 points):** 1-2 days
- **XL (8 points):** 2-3 days

---

## Phase 1: Foundation (MVP) - 5 Stories, 16 points, ~2-3 days

### Story 1.1: Setup Project Structure & MCP Server Skeleton
**Size:** M (3 points)  
**Priority:** P0 - Must Have  

**As a** developer  
**I want to** set up the project structure and basic MCP server skeleton  
**So that** I have a foundation to build upon

**Acceptance Criteria:**
- [ ] Create `src/` directory structure per PRD
- [ ] Initialize Python project with `pyproject.toml`
- [ ] Install MCP SDK (`mcp` package)
- [ ] Create `src/mcp_server.py` with basic MCP server class
- [ ] Implement placeholder handlers for: `list_prompts()`, `get_prompt()`, `list_tools()`, `call_tool()`
- [ ] Server starts without errors
- [ ] README.md with setup instructions created

**Technical Notes:**
```python
# src/mcp_server.py skeleton
from mcp.server import Server
from mcp.types import *

class BMADMCPServer(Server):
    def __init__(self, bmad_root: Path):
        super().__init__("bmad-mcp-server")
        self.bmad_root = bmad_root
        
    async def list_prompts(self) -> list[Prompt]:
        # TODO: Implement
        return []
        
    async def get_prompt(self, name: str, arguments: dict) -> GetPromptResult:
        # TODO: Implement
        pass
```

**Definition of Done:**
- Code committed to repo
- Server runs with `python src/mcp_server.py`
- Basic project documentation in place

---

### Story 1.2: Implement Manifest Loader
**Size:** S (2 points)  
**Priority:** P0 - Must Have  
**Dependencies:** Story 1.1

**As a** developer  
**I want to** read and parse BMAD CSV manifest files  
**So that** I can discover available agents, workflows, and tasks

**Acceptance Criteria:**
- [ ] Create `src/loaders/manifest_loader.py`
- [ ] Implement `ManifestLoader` class with methods:
  - `load_agent_manifest()` → returns list of agent dicts
  - `load_workflow_manifest()` → returns list of workflow dicts
  - `load_task_manifest()` → returns list of task dicts
- [ ] Use Python's `csv` module (standard library, no pandas)
- [ ] Handle missing files gracefully (return empty list, log warning)
- [ ] Unit tests covering: valid CSV, missing file, malformed CSV

**Technical Notes:**
```python
import csv
from pathlib import Path

class ManifestLoader:
    def __init__(self, bmad_root: Path):
        self.bmad_root = bmad_root
        self.manifest_dir = bmad_root / "_cfg"
        
    def load_agent_manifest(self) -> list[dict]:
        """Load agent-manifest.csv, return list of dicts"""
        path = self.manifest_dir / "agent-manifest.csv"
        if not path.exists():
            logger.warning(f"Manifest not found: {path}")
            return []
        with open(path, 'r') as f:
            return list(csv.DictReader(f))
```

**Test Data:**
- Use actual `/bmad/_cfg/agent-manifest.csv` from repo
- Create mock CSV for unit tests

**Definition of Done:**
- Unit tests pass (>80% coverage)
- Integration test loads real BMAD manifests
- Error handling verified

---

### Story 1.3: Implement File Reader
**Size:** XS (1 point)  
**Priority:** P0 - Must Have  
**Dependencies:** Story 1.1

**As a** developer  
**I want to** read raw file content from BMAD directory  
**So that** I can serve files without parsing them

**Acceptance Criteria:**
- [ ] Create `src/loaders/file_reader.py`
- [ ] Implement `FileReader` class with `read_file(relative_path)` method
- [ ] Returns raw text content (UTF-8 encoding)
- [ ] Security: validate path stays within `bmad_root` (no path traversal)
- [ ] Handle file not found gracefully (return error message string)
- [ ] Unit tests covering: valid file, missing file, path traversal attempt

**Technical Notes:**
```python
from pathlib import Path

class FileReader:
    def __init__(self, bmad_root: Path):
        self.bmad_root = bmad_root.resolve()
        
    def read_file(self, relative_path: str) -> str:
        """Read file as raw text, validate path security"""
        full_path = self.bmad_root / relative_path
        
        # Security check
        if not self._is_safe_path(full_path):
            return f"[Error: Path outside BMAD root]"
            
        if not full_path.exists():
            return f"[File not found: {relative_path}]"
            
        with open(full_path, 'r', encoding='utf-8') as f:
            return f.read()
            
    def _is_safe_path(self, path: Path) -> bool:
        try:
            path.resolve().relative_to(self.bmad_root)
            return True
        except ValueError:
            return False
```

**Security Tests:**
- Attempt `read_file("../../etc/passwd")` → should be blocked
- Attempt `read_file("bmm/agents/analyst.md")` → should succeed

**Definition of Done:**
- Security tests pass
- Unit tests pass
- Can read actual BMAD files

---

### Story 1.4: Implement Prompt Builder for Agent Prompts
**Size:** L (5 points)  
**Priority:** P0 - Must Have  
**Dependencies:** Stories 1.2, 1.3

**As a** developer  
**I want to** build MCP prompts that serve raw agent files  
**So that** users can invoke BMAD agents via `/bmad-{name}` commands

**Acceptance Criteria:**
- [ ] Create `src/builders/prompt_builder.py`
- [ ] Implement `PromptBuilder` class with methods:
  - `list_agent_prompts()` → returns list of `PromptDefinition` objects
  - `build_agent_prompt(agent_name)` → returns formatted prompt string
- [ ] Prompt format includes:
  - Raw agent markdown content (from `bmad/{module}/agents/{name}.md`)
  - Raw customization YAML content (from `bmad/_cfg/agents/{module}-{name}.customize.yaml`)
  - BMAD processing instructions for LLM
  - List of available MCP tools
- [ ] Handle missing customization files gracefully
- [ ] Generate prompts for all 11 agents dynamically from manifest

**Technical Notes:**
```python
class PromptBuilder:
    def __init__(self, manifest_loader: ManifestLoader, file_reader: FileReader):
        self.manifest_loader = manifest_loader
        self.file_reader = file_reader
        
    def list_agent_prompts(self) -> list[PromptDefinition]:
        agents = self.manifest_loader.load_agent_manifest()
        return [
            PromptDefinition(
                name=f"bmad-{agent['name']}",
                description=f"Load {agent['displayName']} - {agent['title']}"
            )
            for agent in agents
        ]
        
    def build_agent_prompt(self, agent_name: str) -> str:
        # Find agent in manifest
        agents = self.manifest_loader.load_agent_manifest()
        agent = next((a for a in agents if a['name'] == agent_name), None)
        
        # Read raw files
        agent_md = self.file_reader.read_file(f"{agent['module']}/agents/{agent_name}.md")
        customize_yaml = self.file_reader.read_file(f"_cfg/agents/{agent['module']}-{agent_name}.customize.yaml")
        
        # Wrap with BMAD instructions
        return self._format_prompt(agent, agent_md, customize_yaml)
```

**Prompt Template:**
```
# BMAD Agent: {displayName}

You are an LLM with BMAD methodology loaded in your context.

## Agent Base Definition
File: bmad/{module}/agents/{name}.md

```markdown
{raw_markdown_content}
```

## Agent Customization Override  
File: bmad/_cfg/agents/{module}-{name}.customize.yaml

```yaml
{raw_yaml_content}
```

## Processing Instructions
Process per BMAD agent loading methodology:
1. Parse markdown: extract role, identity, communicationStyle, principles
2. Parse YAML customizations (if present)
3. Merge: YAML overrides markdown fields
4. Assume persona and respond in character

## Available Tools
- list_workflows(category?, module?)
- execute_workflow(workflow_name)
- list_tasks()
- get_knowledge(domain)

Begin conversation as this agent.
```

**Definition of Done:**
- All 11 agents generate valid prompts
- Integration test with real BMAD agent files
- Prompt format validated manually

---

### Story 1.5: Wire Prompt System to MCP Server
**Size:** M (3 points)  
**Priority:** P0 - Must Have  
**Dependencies:** Stories 1.1, 1.4

**As a** developer  
**I want to** connect the prompt builder to MCP server handlers  
**So that** MCP clients can list and invoke agent prompts

**Acceptance Criteria:**
- [ ] Implement `BMadMCPServer.list_prompts()` using `PromptBuilder`
- [ ] Implement `BMadMCPServer.get_prompt(name, arguments)` using `PromptBuilder`
- [ ] Return proper MCP protocol responses (JSON-RPC format)
- [ ] Handle errors gracefully (invalid agent name, file not found)
- [ ] Add logging for debugging
- [ ] Manual test: connect with MCP inspector tool

**Technical Notes:**
```python
class BMADMCPServer(Server):
    def __init__(self, bmad_root: Path):
        super().__init__("bmad-mcp-server")
        self.bmad_root = bmad_root
        
        # Initialize components
        self.manifest_loader = ManifestLoader(bmad_root)
        self.file_reader = FileReader(bmad_root)
        self.prompt_builder = PromptBuilder(self.manifest_loader, self.file_reader)
        
    async def list_prompts(self) -> list[Prompt]:
        try:
            return self.prompt_builder.list_agent_prompts()
        except Exception as e:
            logger.error(f"Error listing prompts: {e}")
            return []
            
    async def get_prompt(self, name: str, arguments: dict) -> GetPromptResult:
        try:
            # Extract agent name from "bmad-analyst" → "analyst"
            agent_name = name.replace("bmad-", "")
            prompt_text = self.prompt_builder.build_agent_prompt(agent_name)
            
            return GetPromptResult(
                description=f"BMAD Agent: {agent_name}",
                messages=[
                    PromptMessage(
                        role="user",
                        content=TextContent(type="text", text=prompt_text)
                    )
                ]
            )
        except Exception as e:
            logger.error(f"Error getting prompt {name}: {e}")
            raise
```

**Manual Testing:**
1. Start server: `python src/mcp_server.py`
2. Use MCP inspector or Claude Desktop dev mode
3. Call `list_prompts` → should return 11 prompts
4. Call `get_prompt("bmad-analyst")` → should return full prompt with raw files

**Definition of Done:**
- MCP protocol compliance verified
- All 11 agent prompts accessible
- Error handling tested
- Integration test passes

---

## Phase 2: Workflow Discovery - 3 Stories, 7 points, ~1-2 days

### Story 2.1: Implement Tool Builder & Definitions
**Size:** S (2 points)  
**Priority:** P0 - Must Have  
**Dependencies:** Story 1.1

**As a** developer  
**I want to** define MCP tool schemas for workflow/task operations  
**So that** LLMs can discover and invoke BMAD capabilities

**Acceptance Criteria:**
- [ ] Create `src/builders/tool_builder.py`
- [ ] Implement `ToolBuilder` class with `get_tool_definitions()` method
- [ ] Define tool schemas for:
  - `list_workflows(category?: string, module?: string)`
  - `get_workflow_details(workflow_name: string)`
  - `execute_workflow(workflow_name: string, params?: object)`
  - `list_tasks()`
  - `execute_task(task_name: string, params?: object)`
  - `get_knowledge(domain: string)`
- [ ] Use proper JSON Schema for input parameters
- [ ] Include clear descriptions for each tool

**Technical Notes:**
```python
class ToolBuilder:
    def get_tool_definitions(self) -> list[Tool]:
        return [
            Tool(
                name="list_workflows",
                description="List available BMAD workflows, optionally filtered by category or module",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "description": "Filter by category: analysis, planning, implementation, solutioning",
                            "enum": ["analysis", "planning", "implementation", "solutioning"]
                        },
                        "module": {
                            "type": "string",
                            "description": "Filter by module: core, bmm",
                            "enum": ["core", "bmm"]
                        }
                    }
                }
            ),
            # ... other tools
        ]
```

**Definition of Done:**
- All 6 tools defined with valid schemas
- Schema validation passes
- Documentation for each tool parameter

---

### Story 2.2: Implement Workflow Discovery Tools
**Size:** M (3 points)  
**Priority:** P0 - Must Have  
**Dependencies:** Stories 1.2, 2.1

**As a** developer  
**I want to** implement workflow discovery functionality  
**So that** agents can list and query available workflows

**Acceptance Criteria:**
- [ ] Create `src/builders/tool_executor.py`
- [ ] Implement `ToolExecutor` class with methods:
  - `list_workflows(category=None, module=None)` → returns filtered list
  - `get_workflow_details(workflow_name)` → returns workflow metadata
- [ ] Filtering logic:
  - Category filter: check if category keyword in workflow path
  - Module filter: exact match on module field
- [ ] Return format: JSON with workflow name, description, module, category, path
- [ ] Handle empty results gracefully
- [ ] Unit tests for filtering logic

**Technical Notes:**
```python
class ToolExecutor:
    def __init__(self, manifest_loader: ManifestLoader, file_reader: FileReader):
        self.manifest_loader = manifest_loader
        self.file_reader = file_reader
        
    async def list_workflows(self, category: str = None, module: str = None) -> dict:
        workflows = self.manifest_loader.load_workflow_manifest()
        
        # Apply filters
        if category:
            workflows = [w for w in workflows 
                        if category.lower() in w.get('path', '').lower()]
        if module:
            workflows = [w for w in workflows 
                        if w.get('module') == module]
        
        return {
            "workflows": [
                {
                    "name": w['name'],
                    "description": w.get('description', ''),
                    "module": w.get('module', ''),
                    "path": w.get('path', ''),
                    "category": self._infer_category(w.get('path', ''))
                }
                for w in workflows
            ]
        }
        
    def _infer_category(self, path: str) -> str:
        """Infer category from path structure"""
        path_lower = path.lower()
        if '1-analysis' in path_lower or 'analysis' in path_lower:
            return 'analysis'
        elif '2-plan' in path_lower or 'planning' in path_lower:
            return 'planning'
        elif '3-solutioning' in path_lower:
            return 'solutioning'
        elif '4-implementation' in path_lower:
            return 'implementation'
        return 'other'
```

**Test Cases:**
- List all workflows → returns full list
- Filter by category="analysis" → returns only analysis workflows
- Filter by module="bmm" → returns only BMM workflows
- Filter by both → returns intersection

**Definition of Done:**
- All filter combinations tested
- Returns correct workflow counts
- Integration test with real manifest

---

### Story 2.3: Wire Workflow Tools to MCP Server
**Size:** S (2 points)  
**Priority:** P0 - Must Have  
**Dependencies:** Stories 2.1, 2.2

**As a** developer  
**I want to** connect workflow tools to MCP server handlers  
**So that** LLMs can call workflow discovery functions

**Acceptance Criteria:**
- [ ] Implement `BMadMCPServer.list_tools()` using `ToolBuilder`
- [ ] Implement `BMadMCPServer.call_tool(name, arguments)` with routing:
  - Route "list_workflows" → `ToolExecutor.list_workflows()`
  - Route "get_workflow_details" → `ToolExecutor.get_workflow_details()`
- [ ] Return proper MCP tool call results (JSON format)
- [ ] Handle tool not found errors
- [ ] Handle invalid arguments errors
- [ ] Manual test with MCP inspector

**Technical Notes:**
```python
async def call_tool(self, name: str, arguments: dict) -> CallToolResult:
    try:
        if name == "list_workflows":
            result = await self.tool_executor.list_workflows(
                category=arguments.get('category'),
                module=arguments.get('module')
            )
        elif name == "get_workflow_details":
            result = await self.tool_executor.get_workflow_details(
                workflow_name=arguments['workflow_name']
            )
        else:
            raise ValueError(f"Unknown tool: {name}")
            
        return CallToolResult(
            content=[
                TextContent(
                    type="text",
                    text=json.dumps(result, indent=2)
                )
            ]
        )
    except Exception as e:
        logger.error(f"Tool execution error: {e}")
        raise
```

**Manual Testing:**
1. Call `list_tools` → should return 6 tool definitions
2. Call `call_tool("list_workflows", {})` → should return all workflows
3. Call `call_tool("list_workflows", {"category": "analysis"})` → should return filtered list

**Definition of Done:**
- Tool routing works correctly
- Error handling tested
- Integration test passes

---

## Phase 3: Workflow Execution - 2 Stories, 5 points, ~1 day

### Story 3.1: Implement Workflow File Serving
**Size:** M (3 points)  
**Priority:** P0 - Must Have  
**Dependencies:** Stories 1.3, 2.2

**As a** developer  
**I want to** serve raw workflow files when workflows are executed  
**So that** LLMs can process workflow instructions

**Acceptance Criteria:**
- [ ] Extend `ToolExecutor` with `execute_workflow(workflow_name, params)` method
- [ ] Read raw workflow files:
  - `workflow.yaml` from workflow directory
  - `instructions.md` or `instructions.xml` from workflow directory
- [ ] Wrap files with BMAD execution instructions template
- [ ] Handle missing files gracefully (return error in response)
- [ ] Include workflow metadata in response
- [ ] Unit tests for file loading and wrapping

**Technical Notes:**
```python
async def execute_workflow(self, workflow_name: str, params: dict = None) -> dict:
    # Find workflow in manifest
    workflows = self.manifest_loader.load_workflow_manifest()
    workflow = next((w for w in workflows if w['name'] == workflow_name), None)
    
    if not workflow:
        return {"error": f"Workflow '{workflow_name}' not found"}
    
    # Read raw files
    workflow_dir = workflow['path']
    workflow_yaml = self.file_reader.read_file(f"{workflow_dir}/workflow.yaml")
    
    # Try both .md and .xml for instructions
    instructions = self.file_reader.read_file(f"{workflow_dir}/instructions.md")
    if "[File not found]" in instructions:
        instructions = self.file_reader.read_file(f"{workflow_dir}/instructions.xml")
    
    # Wrap with BMAD execution template
    return {
        "workflow_name": workflow_name,
        "message": self._format_workflow_execution(
            workflow_name, 
            workflow_dir,
            workflow_yaml, 
            instructions
        )
    }
    
def _format_workflow_execution(self, name, path, yaml_content, instructions_content):
    return f"""# BMAD Workflow: {name}

You are an LLM with BMAD workflow execution instructions loaded.

## Workflow Configuration
File: {path}/workflow.yaml

```yaml
{yaml_content}
```

## Workflow Instructions
File: {path}/instructions.md

```markdown
{instructions_content}
```

## Execution Instructions
Process per BMAD workflow execution methodology:
1. Read workflow.yaml configuration
2. Resolve {{variables}} with user input
3. Follow instructions step-by-step in exact order
4. Execute <template-output> sections by generating content
5. Use <elicit-required> sections for additional user input

Begin workflow execution now."""
```

**Definition of Done:**
- Can load and serve real BMAD workflows
- Template formatting correct
- Error handling for missing files

---

### Story 3.2: Wire Workflow Execution to MCP Server
**Size:** S (2 points)  
**Priority:** P0 - Must Have  
**Dependencies:** Stories 2.3, 3.1

**As a** developer  
**I want to** route workflow execution tool calls  
**So that** LLMs can load and execute workflows

**Acceptance Criteria:**
- [ ] Add "execute_workflow" route to `call_tool()` handler
- [ ] Extract and validate required parameters
- [ ] Call `ToolExecutor.execute_workflow()`
- [ ] Return formatted response
- [ ] Add error handling for workflow not found
- [ ] Manual test: execute a real workflow

**Technical Notes:**
```python
async def call_tool(self, name: str, arguments: dict) -> CallToolResult:
    # ... existing routes ...
    
    elif name == "execute_workflow":
        if 'workflow_name' not in arguments:
            raise ValueError("Missing required parameter: workflow_name")
            
        result = await self.tool_executor.execute_workflow(
            workflow_name=arguments['workflow_name'],
            params=arguments.get('params', {})
        )
        
        return CallToolResult(
            content=[TextContent(type="text", text=result['message'])]
        )
```

**Manual Testing:**
1. Call `execute_workflow("brainstorm-project")` → should return workflow files wrapped
2. Verify YAML and instructions are included in response
3. Test with non-existent workflow → should return error

**Definition of Done:**
- Workflow execution works end-to-end
- Can execute real BMAD workflows
- Error cases handled

---

## Phase 4: Extended Capabilities - 4 Stories, 8 points, ~2 days

### Story 4.1: Implement Task Execution Tools
**Size:** S (2 points)  
**Priority:** P1 - Should Have  
**Dependencies:** Stories 1.2, 1.3, 2.2

**As a** developer  
**I want to** implement task listing and execution  
**So that** agents can invoke BMAD tasks

**Acceptance Criteria:**
- [ ] Extend `ToolExecutor` with:
  - `list_tasks()` → returns list of available tasks
  - `execute_task(task_name, params)` → serves raw task file
- [ ] Read task files from manifest paths
- [ ] Wrap task XML with execution instructions
- [ ] Handle missing tasks gracefully
- [ ] Add routes to `call_tool()` handler

**Technical Notes:**
Similar pattern to workflows - read manifest, serve raw files, wrap with instructions.

**Definition of Done:**
- Can list all BMAD tasks
- Can load and serve task files
- Integration test passes

---

### Story 4.2: Implement Knowledge Base Access
**Size:** S (2 points)  
**Priority:** P1 - Should Have  
**Dependencies:** Story 1.3

**As a** developer  
**I want to** serve knowledge base files  
**So that** specialist agents can access domain knowledge

**Acceptance Criteria:**
- [ ] Extend `ToolExecutor` with `get_knowledge(domain)` method
- [ ] Support domains:
  - "testarch" → load files from `bmm/testarch/knowledge/*.md`
  - "architecture" → load architecture patterns
  - "patterns" → load design patterns
- [ ] Return concatenated markdown content
- [ ] Add route to `call_tool()` handler

**Technical Notes:**
```python
async def get_knowledge(self, domain: str) -> dict:
    knowledge_paths = {
        'testarch': 'bmm/testarch/knowledge',
        # ... other domains
    }
    
    if domain not in knowledge_paths:
        return {"error": f"Unknown domain: {domain}"}
    
    # List all .md files in knowledge directory
    knowledge_dir = self.file_reader.bmad_root / knowledge_paths[domain]
    md_files = list(knowledge_dir.glob('*.md'))
    
    # Read and concatenate
    content = []
    for md_file in sorted(md_files):
        relative_path = md_file.relative_to(self.file_reader.bmad_root)
        file_content = self.file_reader.read_file(str(relative_path))
        content.append(f"# {md_file.name}\n\n{file_content}\n\n---\n\n")
    
    return {
        "domain": domain,
        "content": "".join(content)
    }
```

**Definition of Done:**
- All knowledge domains accessible
- Can load TEA knowledge base
- Content formatted properly

---

### Story 4.3: Implement Resource Endpoints
**Size:** S (2 points)  
**Priority:** P2 - Nice to Have  
**Dependencies:** Story 1.2

**As a** developer  
**I want to** expose manifest files as MCP resources  
**So that** users can browse BMAD capabilities

**Acceptance Criteria:**
- [ ] Create `src/builders/resource_builder.py`
- [ ] Implement `ResourceBuilder` class
- [ ] Implement `BMadMCPServer.list_resources()` handler
- [ ] Implement `BMadMCPServer.read_resource()` handler
- [ ] Expose resources:
  - `bmad://manifests/agents` → agent manifest CSV
  - `bmad://manifests/workflows` → workflow manifest CSV
  - `bmad://manifests/tasks` → task manifest CSV
  - `bmad://config/current` → current project config
- [ ] Return raw CSV content

**Technical Notes:**
```python
async def list_resources(self) -> list[Resource]:
    return [
        Resource(
            uri="bmad://manifests/agents",
            name="Agent Manifest",
            description="Complete list of BMAD agents",
            mimeType="text/csv"
        ),
        # ... other resources
    ]
    
async def read_resource(self, uri: str) -> ReadResourceResult:
    if uri == "bmad://manifests/agents":
        content = self.file_reader.read_file("_cfg/agent-manifest.csv")
    # ... other URIs
    
    return ReadResourceResult(
        contents=[
            ResourceContents(
                uri=uri,
                mimeType="text/csv",
                text=content
            )
        ]
    )
```

**Definition of Done:**
- All manifest resources accessible
- Can browse manifests via MCP

---

### Story 4.4: Comprehensive Testing & Documentation
**Size:** S (2 points)  
**Priority:** P0 - Must Have  
**Dependencies:** All previous stories

**As a** developer  
**I want to** create comprehensive tests and documentation  
**So that** the system is reliable and maintainable

**Acceptance Criteria:**
- [ ] Integration tests covering:
  - Full agent invocation flow
  - Workflow discovery and execution flow
  - Task execution flow
  - Error scenarios
- [ ] Unit test coverage >80% overall
- [ ] Create `docs/user-guide.md` with:
  - Installation instructions
  - Configuration guide (Claude Desktop, Cursor)
  - Usage examples for each feature
  - Troubleshooting section
- [ ] Update README.md with quick start guide
- [ ] Add inline code documentation (docstrings)

**Documentation Sections:**
1. Installation & Setup
2. Configuring MCP Hosts
3. Using Agent Prompts
4. Discovering & Executing Workflows
5. Advanced Features (tasks, knowledge)
6. Troubleshooting Common Issues
7. Development Guide

**Definition of Done:**
- All tests passing
- Documentation complete and reviewed
- New developers can onboard from docs

---

## Summary

**Total Stories:** 14  
**Total Points:** 36  
**Estimated Duration:** 5-7 days

**Phase Breakdown:**
- Phase 1 (Foundation): 16 points, 2-3 days
- Phase 2 (Discovery): 7 points, 1-2 days
- Phase 3 (Execution): 5 points, 1 day
- Phase 4 (Extended): 8 points, 2 days

**Sprint Recommendations:**
- **Sprint 1 (Week 1):** Phase 1 + Phase 2 (23 points)
- **Sprint 2 (Week 2):** Phase 3 + Phase 4 (13 points)

**Team Composition:**
- 1 developer can complete in 2 weeks
- 2 developers can complete in 1 week (parallelizing phases)

---

## Story Dependencies Graph

```
Story 1.1 (Setup)
    ├─→ Story 1.2 (Manifest Loader)
    │       └─→ Story 2.1 (Tool Definitions)
    │               └─→ Story 2.2 (Workflow Discovery)
    │                       ├─→ Story 2.3 (Wire Tools)
    │                       │       └─→ Story 3.2 (Wire Execution)
    │                       ├─→ Story 3.1 (Workflow Files)
    │                       │       └─→ Story 3.2
    │                       ├─→ Story 4.1 (Tasks)
    │                       └─→ Story 4.3 (Resources)
    │
    ├─→ Story 1.3 (File Reader)
    │       ├─→ Story 1.4 (Prompt Builder)
    │       │       └─→ Story 1.5 (Wire Prompts)
    │       ├─→ Story 3.1
    │       └─→ Story 4.2 (Knowledge)
    │
    └─→ Story 1.4
            └─→ Story 1.5

Story 4.4 (Testing) depends on all previous stories
```

---

## Next Actions

1. **BLad:** Review and approve user stories
2. **Winston:** Review technical implementation details
3. **Bob:** Assign stories to developers
4. **Team:** Begin Sprint 1 with Story 1.1

