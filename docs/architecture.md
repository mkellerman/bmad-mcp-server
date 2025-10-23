# Architecture Specification: BMAD MCP Server

**Document Owner:** Winston (Architect)  
**Version:** 1.0  
**Date:** October 23, 2025  
**Status:** Draft - Planning Phase

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Component Architecture](#component-architecture)
4. [Data Flow](#data-flow)
5. [Interface Specifications](#interface-specifications)
6. [Deployment Architecture](#deployment-architecture)
7. [Security Considerations](#security-considerations)
8. [Performance Strategy](#performance-strategy)

---

## System Overview

### Purpose
The BMAD MCP Server acts as an adapter layer between the BMAD methodology framework and MCP-compatible hosts (Claude Desktop, Cursor, etc.), exposing BMAD capabilities through the standardized Model Context Protocol.

### Architecture Pattern
**File Proxy Pattern** with **Lazy Loading Strategy**

The server acts as a transparent file proxy that serves BMAD files on-demand through MCP protocol. It does NOT parse, transform, or merge content - it returns raw files for the LLM to process according to existing BMAD instructions in the LLM's context (GitHub Copilot instructions).

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              MCP Host (Claude/Cursor with BMAD Context)      │
│  LLM has BMAD instructions loaded via GitHub Copilot         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Prompts  │  │   Tools    │  │ Resources  │            │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘            │
└─────────┼────────────────┼────────────────┼─────────────────┘
          │                │                │
          │    MCP Protocol (JSON-RPC)      │
          │  "Give me analyst agent files"  │
          │                │                │
┌─────────▼────────────────▼────────────────▼─────────────────┐
│              BMAD MCP Server (File Proxy)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           MCP Protocol Handler Layer                 │   │
│  │  (list_prompts, get_prompt, list_tools, call_tool)  │   │
│  └────────┬─────────────────────────────────────┬───────┘   │
│           │                                     │            │
│  ┌────────▼───────────┐              ┌─────────▼────────┐   │
│  │  Prompt Builder    │              │   Tool Executor  │   │
│  │  - Read raw files  │              │   - Read raw files│  │
│  │  - No parsing      │              │   - No parsing   │   │
│  │  - No merging      │              │   - No transform │   │
│  └────────┬───────────┘              └─────────┬────────┘   │
│           │                                     │            │
│  ┌────────▼─────────────────────────────────────▼────────┐  │
│  │         File Reader Layer (Simple I/O)               │   │
│  │   - CSV reader (manifests for discovery only)        │   │
│  │   - Raw file reader (no parsing, return as-is)       │   │
│  └────────┬──────────────────────────────────────────────┘  │
└───────────┼──────────────────────────────────────────────────┘
            │
            │ Read-Only File Access (Raw Content)
            │
┌───────────▼──────────────────────────────────────────────────┐
│                    BMAD Installation                          │
│  /bmad/_cfg/                                                  │
│    ├── agent-manifest.csv        (for discovery)             │
│    ├── workflow-manifest.csv     (for discovery)             │
│    ├── task-manifest.csv         (for discovery)             │
│    └── agents/*.customize.yaml   (served raw to LLM)         │
│  /bmad/core/                                                  │
│    ├── agents/*.md                (served raw to LLM)        │
│    ├── workflows/*/workflow.yaml  (served raw to LLM)        │
│    └── tasks/*.xml                (served raw to LLM)        │
│  /bmad/bmm/                                                   │
│    ├── agents/*.md                (served raw to LLM)        │
│    ├── workflows/*/workflow.yaml  (served raw to LLM)        │
│    └── testarch/knowledge/*.md    (served raw to LLM)        │
└───────────────────────────────────────────────────────────────┘
                        ▲
                        │
              LLM processes files using
              BMAD instructions already
              in its context
```

---

## Architecture Principles

### 1. Read-Only BMAD Access
**Principle:** The MCP server NEVER writes to `/bmad` directory.

**Rationale:** Maintains ability to update BMAD via `git pull` without conflicts.

**Implementation:**
- All file operations are read-only (`open(path, 'r')`)
- No state stored in BMAD directories
- Server state (if needed) stored in `/src/.cache` or memory

### 2. File Proxy - No Parsing
**Principle:** Server returns raw file content without parsing or transformation.

**Rationale:** 
- Format-agnostic: BMAD can change file formats, server doesn't need updates
- Simpler: No parsing logic to maintain
- Faithful: LLM receives exact same content as local BMAD install

**Implementation:**
- Read files as plain text
- No YAML parsing (except manifests for discovery)
- No markdown parsing
- No content merging
- Return raw content with BMAD processing instructions

### 3. Lazy Loading
**Principle:** Load resources just-in-time, never preemptively.

**Rationale:** Minimizes memory footprint and context pollution.

**Implementation:**
- Manifests parsed only when tool invoked
- Agent files loaded only when prompt invoked
- Workflow instructions loaded only when executed
- Optional caching layer for performance

### 4. Manifest-Driven Discovery
**Principle:** All capabilities discovered through manifest files.

**Rationale:** Single source of truth, automatic updates when BMAD changes.

**Implementation:**
- Parse CSV manifests at runtime
- No hardcoded agent/workflow lists in server code
- Dynamic MCP schema generation from manifest data

### 5. Stateless Design
**Principle:** Server maintains minimal state between requests.

**Rationale:** Simplifies deployment, enables horizontal scaling.

**Implementation:**
- Each MCP request is independent
- Conversation state maintained by MCP host
- Optional caching is invalidatable and non-critical

### 6. Fail-Safe Defaults
**Principle:** Graceful degradation when BMAD files unavailable.

**Rationale:** Resilience to BMAD updates or file system issues.

**Implementation:**
- Return empty lists if manifest missing
- Log errors but don't crash server
- Provide clear error messages to user

---

## Component Architecture

### Layer 1: MCP Protocol Handler

**Responsibility:** Implements MCP server interface.

**Components:**
```python
class BMadMCPServer:
    """Main MCP server implementation"""
    
    async def list_prompts(self) -> list[Prompt]:
        """Return list of available BMAD agent prompts"""
        
    async def get_prompt(self, name: str, arguments: dict) -> GetPromptResult:
        """Load specific agent prompt with full persona"""
        
    async def list_tools(self) -> list[Tool]:
        """Return list of meta-tools for workflow/task discovery"""
        
    async def call_tool(self, name: str, arguments: dict) -> CallToolResult:
        """Execute workflow discovery or execution tool"""
        
    async def list_resources(self) -> list[Resource]:
        """Return list of available BMAD resources (manifests, config)"""
        
    async def read_resource(self, uri: str) -> ReadResourceResult:
        """Read manifest or config resource"""
```

**Dependencies:**
- `mcp` SDK for protocol implementation
- Prompt Builder for agent loading
- Tool Executor for workflow/task operations

**Error Handling:**
- Catch all exceptions at this layer
- Return MCP-compliant error responses
- Log errors for debugging

---

### Layer 2: Builders & Executors

#### 2A: Prompt Builder

**Responsibility:** Return raw BMAD agent files as MCP prompts.

**Components:**
```python
class PromptBuilder:
    """Serves raw BMAD agent files as prompts - NO PARSING"""
    
    def __init__(self, bmad_root: Path, manifest_loader: ManifestLoader):
        self.bmad_root = bmad_root
        self.manifest_loader = manifest_loader
        
    def list_agent_prompts(self) -> list[PromptDefinition]:
        """Generate prompt definitions from agent manifest"""
        agents = self.manifest_loader.load_agent_manifest()
        return [
            PromptDefinition(
                name=f"bmad-{agent['name']}",
                description=f"Load {agent['displayName']} - {agent['title']}",
                arguments=[]
            )
            for agent in agents
        ]
        
    def build_agent_prompt(self, agent_name: str) -> str:
        """Return RAW agent files with BMAD loading instructions"""
        # 1. Find agent in manifest
        agents = self.manifest_loader.load_agent_manifest()
        agent_entry = next((a for a in agents if a['name'] == agent_name), None)
        
        if not agent_entry:
            return f"Error: Agent '{agent_name}' not found in manifest"
        
        # 2. Read raw files (NO PARSING)
        agent_md_path = self.bmad_root / agent_entry['module'] / "agents" / f"{agent_name}.md"
        agent_md_content = self._read_raw_file(agent_md_path)
        
        customize_yaml_path = self.bmad_root / "_cfg" / "agents" / f"{agent_entry['module']}-{agent_name}.customize.yaml"
        customize_yaml_content = self._read_raw_file(customize_yaml_path)
        
        # 3. Return raw content with BMAD processing instructions
        return f"""# BMAD Agent: {agent_entry['displayName']}

You are an LLM with BMAD methodology instructions loaded in your context (via GitHub Copilot).

## Agent Base Definition
**File:** `bmad/{agent_entry['module']}/agents/{agent_name}.md`

```markdown
{agent_md_content}
```

## Agent Customization Override
**File:** `bmad/_cfg/agents/{agent_entry['module']}-{agent_name}.customize.yaml`

```yaml
{customize_yaml_content}
```

## Processing Instructions
Process these files according to BMAD agent loading methodology:
1. Parse agent markdown to extract: role, identity, communicationStyle, principles
2. Parse customization YAML (if present)
3. Merge: YAML fields override markdown fields
4. Assume the resulting persona and respond in character

## Available BMAD Tools
You have access to these MCP tools to help users:
- `list_workflows(category?, module?)` - Discover available workflows
- `get_workflow_details(workflow_name)` - Get workflow metadata
- `execute_workflow(workflow_name, params?)` - Load and execute a workflow
- `list_tasks()` - Discover available tasks
- `execute_task(task_name, params?)` - Execute a specific task
- `get_knowledge(domain)` - Load knowledge base content

Begin your conversation as this agent, introducing yourself naturally."""
        
    def _read_raw_file(self, path: Path) -> str:
        """Read file content as-is, no parsing"""
        if not path.exists():
            return "[File not found]"
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            return f"[Error reading file: {e}]"
    
    def __init__(self, manifest_loader: ManifestLoader, agent_loader: AgentLoader):
        self.manifest_loader = manifest_loader
        self.agent_loader = agent_loader
        
    def list_agent_prompts(self) -> list[PromptDefinition]:
        """Generate prompt definitions from agent manifest"""
        agents = self.manifest_loader.load_agent_manifest()
        return [
            PromptDefinition(
                name=f"bmad-{agent['name']}",
                description=f"Load {agent['displayName']} - {agent['title']}",
                arguments=[]
            )
            for agent in agents
        ]
        
    def build_agent_prompt(self, agent_name: str) -> str:
        """Load and merge agent persona into formatted prompt"""
        agent_data = self.agent_loader.load_agent(agent_name)
        return self._format_agent_prompt(agent_data)
        
    def _format_agent_prompt(self, agent_data: dict) -> str:
        """Format agent data into system prompt"""
        return f"""You are {agent_data['displayName']}, {agent_data['title']}.

**Role:** {agent_data['role']}

**Identity:** {agent_data['identity']}

**Communication Style:** {agent_data['communicationStyle']}

**Principles:** {agent_data['principles']}

You have access to BMAD workflows and tasks through tools:
- list_workflows() - Discover available workflows
- execute_workflow(name) - Execute a specific workflow
- list_tasks() - Discover available tasks
- execute_task(name) - Execute a specific task

Respond in character based on your communication style and principles."""
```

**Data Flow:**
1. MCP host requests `/bmad-analyst`
2. Prompt Builder calls Manifest Loader
3. Manifest Loader reads `agent-manifest.csv` (for metadata only)
4. Prompt Builder finds 'analyst' entry
5. Prompt Builder reads `bmad/bmm/agents/analyst.md` (raw text)
6. Prompt Builder reads `bmad/_cfg/agents/bmm-analyst.customize.yaml` (raw text)
7. Prompt Builder wraps both files with BMAD processing instructions
8. Returns complete prompt to MCP host
9. LLM receives raw files + instructions, processes per BMAD methodology

---

#### 2B: Tool Executor

**Responsibility:** Serve raw workflow/task files on-demand.

**Components:**
```python
class ToolExecutor:
    """Executes BMAD workflow and task operations - returns RAW files"""
    
    def __init__(self, bmad_root: Path, manifest_loader: ManifestLoader):
        self.bmad_root = bmad_root
        self.manifest_loader = manifest_loader
        
    async def list_workflows(self, category: str = None, module: str = None) -> dict:
        """List available workflows with optional filtering"""
        workflows = self.manifest_loader.load_workflow_manifest()
        
        if category:
            workflows = [w for w in workflows if category.lower() in w.get('path', '').lower()]
        if module:
            workflows = [w for w in workflows if w.get('module') == module]
            
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
        
    async def execute_workflow(self, workflow_name: str, params: dict = None) -> dict:
        """Load and return RAW workflow files (no parsing, no merging)"""
        # 1. Find workflow in manifest
        workflows = self.manifest_loader.load_workflow_manifest()
        workflow_entry = next((w for w in workflows if w['name'] == workflow_name), None)
        
        if not workflow_entry:
            return {"error": f"Workflow '{workflow_name}' not found"}
        
        # 2. Read RAW workflow files
        workflow_dir = self.bmad_root / workflow_entry['path']
        workflow_yaml_path = workflow_dir / 'workflow.yaml'
        workflow_yaml_content = self._read_raw_file(workflow_yaml_path)
        
        # Try to find instructions file
        instructions_path = workflow_dir / 'instructions.md'
        if not instructions_path.exists():
            instructions_path = workflow_dir / 'instructions.xml'
        instructions_content = self._read_raw_file(instructions_path)
        
        # 3. Return RAW content with BMAD execution instructions
        return {
            "workflow_name": workflow_name,
            "message": f"""# BMAD Workflow: {workflow_name}

You are an LLM with BMAD workflow execution instructions loaded in your context.

## Workflow Configuration
**File:** `{workflow_entry['path']}/workflow.yaml`

```yaml
{workflow_yaml_content}
```

## Workflow Instructions
**File:** `{workflow_entry['path']}/instructions.md`

```markdown
{instructions_content}
```

## Execution Instructions
Process this workflow according to BMAD workflow execution methodology:
1. Read the complete workflow.yaml configuration
2. Resolve any {{variables}} with user input or defaults
3. Follow instructions step-by-step in exact order
4. Execute any <template-output> sections by generating content
5. Use <elicit-required> sections to gather additional user input when needed

Begin workflow execution now."""
        }
        
    def _read_raw_file(self, path: Path) -> str:
        """Read file as-is"""
        if not path.exists():
            return "[File not found]"
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            return f"[Error: {e}]"
            
    def _infer_category(self, path: str) -> str:
        """Simple category inference from path"""
        path_lower = path.lower()
        if '1-analysis' in path_lower or 'analysis' in path_lower:
            return 'analysis'
        elif '2-plan' in path_lower or 'planning' in path_lower:
            return 'planning'
        elif '3-solutioning' in path_lower or 'solutioning' in path_lower:
            return 'solutioning'
        elif '4-implementation' in path_lower or 'implementation' in path_lower:
            return 'implementation'
        return 'other'
```
    
    def __init__(self, 
                 workflow_loader: WorkflowLoader,
                 task_loader: TaskLoader,
                 manifest_loader: ManifestLoader):
        self.workflow_loader = workflow_loader
        self.task_loader = task_loader
        self.manifest_loader = manifest_loader
        
    async def list_workflows(self, category: str = None, module: str = None) -> dict:
        """List available workflows with optional filtering"""
        workflows = self.manifest_loader.load_workflow_manifest()
        
        if category:
            workflows = [w for w in workflows if category in w.get('path', '')]
        if module:
            workflows = [w for w in workflows if w.get('module') == module]
            
        return {
            "workflows": [
                {
                    "name": w['name'],
                    "description": w['description'],
                    "module": w['module'],
                    "category": self._infer_category(w['path'])
                }
                for w in workflows
            ]
        }
        
    async def execute_workflow(self, workflow_name: str, params: dict = None) -> dict:
        """Load and return workflow instructions for execution"""
        workflow = self.workflow_loader.load_workflow(workflow_name)
        
        return {
            "workflow_name": workflow['name'],
            "description": workflow['description'],
            "instructions": workflow['instructions'],
            "config": workflow['config'],
            "message": f"Workflow '{workflow_name}' loaded. Begin execution following the instructions."
        }
```

**Tool Definitions:**
```python
TOOL_DEFINITIONS = [
    {
        "name": "list_workflows",
        "description": "List available BMAD workflows, optionally filtered by category or module",
        "inputSchema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "description": "Filter by category: analysis, planning, implementation",
                    "enum": ["analysis", "planning", "implementation", "solutioning"]
                },
                "module": {
                    "type": "string",
                    "description": "Filter by module: core, bmm",
                    "enum": ["core", "bmm"]
                }
            }
        }
    },
    {
        "name": "get_workflow_details",
        "description": "Get detailed information about a specific workflow",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workflow_name": {
                    "type": "string",
                    "description": "Name of the workflow",
                    "required": True
                }
            }
        }
    },
    {
        "name": "execute_workflow",
        "description": "Load and begin execution of a BMAD workflow",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workflow_name": {
                    "type": "string",
                    "description": "Name of the workflow to execute",
                    "required": True
                },
                "params": {
                    "type": "object",
                    "description": "Optional parameters for workflow execution"
                }
            }
        }
    },
    {
        "name": "list_tasks",
        "description": "List available BMAD tasks",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "execute_task",
        "description": "Execute a specific BMAD task",
        "inputSchema": {
            "type": "object",
            "properties": {
                "task_name": {
                    "type": "string",
                    "description": "Name of the task to execute",
                    "required": True
                },
                "params": {
                    "type": "object",
                    "description": "Task parameters"
                }
            }
        }
    },
    {
        "name": "get_knowledge",
        "description": "Load knowledge base content for a specific domain",
        "inputSchema": {
            "type": "object",
            "properties": {
                "domain": {
                    "type": "string",
                    "description": "Knowledge domain to load",
                    "enum": ["testarch", "architecture", "patterns"],
                    "required": True
                }
            }
        }
    }
]
```

---

### Layer 3: Loaders

#### 3A: Manifest Loader

**Responsibility:** Parse BMAD CSV manifests FOR DISCOVERY ONLY.

**Note:** This is the ONLY component that parses files. Manifests are parsed to enable discovery (list agents, list workflows), but the actual agent/workflow files are served raw.

**Implementation:**
```python
import csv
from pathlib import Path
from typing import List, Dict

class ManifestLoader:
    """Loads and parses BMAD manifest CSV files for discovery"""
    
    def __init__(self, bmad_root: Path):
        self.bmad_root = bmad_root
        self.manifest_dir = bmad_root / "_cfg"
        
    def load_agent_manifest(self) -> List[Dict]:
        """Load agent manifest CSV for agent discovery"""
        manifest_path = self.manifest_dir / "agent-manifest.csv"
        return self._load_csv(manifest_path)
        
    def load_workflow_manifest(self) -> List[Dict]:
        """Load workflow manifest CSV for workflow discovery"""
        manifest_path = self.manifest_dir / "workflow-manifest.csv"
        return self._load_csv(manifest_path)
        
    def load_task_manifest(self) -> List[Dict]:
        """Load task manifest CSV for task discovery"""
        manifest_path = self.manifest_dir / "task-manifest.csv"
        return self._load_csv(manifest_path)
        
    def _load_csv(self, path: Path) -> List[Dict]:
        """Generic CSV loader with error handling"""
        if not path.exists():
            logger.warning(f"Manifest not found: {path}")
            return []
            
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return list(csv.DictReader(f))
        except Exception as e:
            logger.error(f"Error loading manifest {path}: {e}")
            return []
```

**Caching Strategy:**
```python
from functools import lru_cache
from datetime import datetime, timedelta

class CachedManifestLoader(ManifestLoader):
    """Manifest loader with time-based caching"""
    
    def __init__(self, bmad_root: Path, cache_ttl: int = 300):
        super().__init__(bmad_root)
        self.cache_ttl = cache_ttl  # 5 minutes default
        self._cache = {}
        
    def load_agent_manifest(self) -> List[Dict]:
        return self._cached_load('agents', super().load_agent_manifest)
        
    def _cached_load(self, key: str, loader_func):
        now = datetime.now()
        if key in self._cache:
            data, timestamp = self._cache[key]
            if now - timestamp < timedelta(seconds=self.cache_ttl):
                return data
                
        data = loader_func()
        self._cache[key] = (data, now)
        return data
```

---

#### 3B: File Reader (Simplified)

**Responsibility:** Read raw file content - NO PARSING.

**Implementation:**
```python
from pathlib import Path

class FileReader:
    """Simple raw file reader - no parsing, no transformation"""
    
    def __init__(self, bmad_root: Path):
        self.bmad_root = bmad_root
        
    def read_file(self, relative_path: str) -> str:
        """Read file content as raw text"""
        full_path = self.bmad_root / relative_path
        
        # Security: ensure path is within bmad_root
        if not self._is_safe_path(full_path):
            raise ValueError(f"Path outside BMAD root: {relative_path}")
            
        if not full_path.exists():
            return f"[File not found: {relative_path}]"
            
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            return f"[Error reading {relative_path}: {e}]"
            
    def _is_safe_path(self, path: Path) -> bool:
        """Ensure path doesn't escape BMAD root (security)"""
        try:
            path.resolve().relative_to(self.bmad_root.resolve())
            return True
        except ValueError:
            return False
```

**Note:** We removed `AgentLoader`, `WorkflowLoader`, `YAMLMerger`, and all parsing logic. The server only needs:
1. Manifest loader (for discovery)
2. File reader (for raw content)

---

### Layer 4: Utilities

#### 4A: Path Validator

**Responsibility:** Ensure file paths stay within BMAD root (security).

**Implementation:**
```python
from pathlib import Path

class PathValidator:
    """Validates paths for security"""
    
    def __init__(self, bmad_root: Path):
        self.bmad_root = bmad_root.resolve()
        
    def is_safe_path(self, path: Path) -> bool:
        """Ensure path doesn't escape BMAD root"""
        try:
            resolved = path.resolve()
            resolved.relative_to(self.bmad_root)
            return True
        except (ValueError, RuntimeError):
            return False
            
    def validate_or_raise(self, path: Path):
        """Raise exception if path is unsafe"""
        if not self.is_safe_path(path):
            raise ValueError(f"Path outside BMAD root: {path}")
```

---

**Removed Components:**
- ❌ `PathResolver` - No longer needed (no variable resolution in server)
- ❌ `YAMLMerger` - No longer needed (no merging in server)
- ❌ Complex parsing logic - Replaced with simple file reading

The LLM handles all variable resolution and merging using BMAD instructions already in its context.

---

## Data Flow

### Flow 1: Agent Prompt Invocation

```
[User in Claude Desktop]
    |
    | Types: /bmad-analyst
    |
    v
[Claude Desktop] → list_prompts() → [BMAD MCP Server]
    |                                      |
    | Sees "bmad-analyst" available        | PromptBuilder.list_agent_prompts()
    |                                      |
    v                                      v
[Claude Desktop] → get_prompt("bmad-analyst") → [BMAD MCP Server]
                                                      |
                                                      v
                                            ManifestLoader.load_agent_manifest()
                                                      |
                                                      v
                                            Read: bmad/_cfg/agent-manifest.csv
                                                      |
                                                      v
                                            Find: analyst entry with module=bmm
                                                      |
                                                      v
                                            AgentLoader.load_agent("analyst", "bmm")
                                                      |
                                                      v
                                            Read: bmad/bmm/agents/analyst.md
                                                      |
                                                      v
                                            Read: bmad/_cfg/agents/bmm-analyst.customize.yaml
                                                      |
                                                      v
                                            YAMLMerger.merge(base, customization)
                                                      |
                                                      v
                                            PromptBuilder._format_agent_prompt()
                                                      |
                                                      v
                                            Return formatted system prompt
    cat> /Users/mkellerman/GitHub/bmad-mcp-server/docs/prd.md << 'EOF'
# Product Requirements Document: BMAD MCP Server

**Product Name:** BMAD MCP Server  
**Version:** 1.0  
**Date:** October 23, 2025  
**Owner:** John (Product Manager)  
**Status:** Draft - Planning Phase

---

## Executive Summary

The BMAD MCP Server is a Model Context Protocol implementation that exposes the BMAD (Business Methodology for Agile Development) framework to any MCP-compatible host (Claude Desktop, Cursor, etc.). It provides lazy-loaded access to BMAD agents, workflows, tasks, and knowledge bases through a standardized protocol interface, enabling users to leverage BMAD methodology without leaving their development environment.

## Problem Statement

### Current State
- BMAD methodology exists as a standalone system requiring manual activation
- Users must context-switch between their IDE/chat environment and BMAD
- Full workflow context loading causes token bloat and cognitive overload
- No standardized way to inject BMAD capabilities into existing LLM workflows

### Desired State
- BMAD agents accessible via simple slash commands (e.g., `/bmad-analyst`)
- Workflows discoverable and executable on-demand through agent conversation
- Context loaded lazily - only what's needed, when it's needed
- Seamless integration with any MCP-compatible host

## Goals & Success Metrics

### Primary Goals
1. Enable BMAD agent invocation through MCP prompts
2. Provide dynamic workflow discovery and execution via MCP tools
3. Maintain `/bmad` folder integrity for upstream updates
4. Minimize context pollution through lazy loading

### Success Metrics
- All 11 BMAD agents accessible via `/bmad-{name}` prompts
- Workflows discoverable through conversational interface
- Zero modifications to `/bmad` directory structure
- Context size reduced by 80%+ vs. full-load approach

### Non-Goals
- Creating new BMAD workflows or agents (use existing)
- Modifying BMAD core functionality
- Building a custom UI (rely on MCP host UIs)

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
- **FR1.3** Load full agent persona including: role, identity, communication style, principles
- **FR1.4** Merge agent markdown with customization YAML overrides
- **FR1.5** Agent persists in conversation context until dismissed

#### FR2: Workflow Discovery Tools
- **FR2.1** `list_workflows(category?, module?)` returns filtered workflow list
- **FR2.2** `get_workflow_details(workflow_name)` returns metadata
- **FR2.3** Results include: name, description, author, module, path
- **FR2.4** Read from `/bmad/_cfg/workflow-manifest.csv`

#### FR3: Workflow Execution Tools
- **FR3.1** `execute_workflow(workflow_name, params?)` loads and begins workflow
- **FR3.2** Load workflow.yaml configuration
- **FR3.3** Load instructions.md or embedded instructions
- **FR3.4** Resolve all variables and paths
- **FR3.5** Return formatted workflow context to agent

#### FR4: Task Execution Tools
- **FR4.1** `list_tasks()` returns available BMAD tasks
- **FR4.2** `execute_task(task_name, params?)` executes specific task
- **FR4.3** Read from `/bmad/_cfg/task-manifest.csv`

#### FR5: Knowledge Access Tools
- **FR5.1** `get_knowledge(domain)` loads knowledge base section
- **FR5.2** Support domains: testarch, architecture, patterns
- **FR5.3** Return markdown content for LLM consumption

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
- `pyyaml` - YAML configuration parsing
- `pandas` - CSV manifest parsing (optional, can use csv module)

## Architecture Overview

(See `architecture.md` for detailed architecture)

### High-Level Components
1. **MCP Server** - Protocol implementation and request routing
2. **Manifest Loaders** - Read and parse CSV manifests
3. **Agent Builder** - Construct agent prompts from markdown + YAML
4. **Workflow Engine** - Load and execute workflows
5. **Resource Manager** - Serve static resources

### Data Flow
```
User invokes /bmad-analyst
  ↓
MCP Server receives prompt request
  ↓
Agent Builder loads analyst.md + customization
  ↓
Merged persona returned to user context
  ↓
User converses with agent
  ↓
Agent calls list_workflows()
  ↓
Manifest Loader reads workflow-manifest.csv
  ↓
Filtered results returned to agent
  ↓
Agent presents options to user
  ↓
Agent calls execute_workflow('brainstorm-project')
  ↓
Workflow Engine loads workflow.yaml + instructions.md
  ↓
Workflow context injected into conversation
```

## File Structure

```
bmad-mcp-server/
├── src/
│   ├── mcp_server.py           # Main MCP server entry point
│   ├── loaders/
│   │   ├── __init__.py
│   │   ├── manifest_loader.py  # CSV manifest parsing
│   │   ├── agent_loader.py     # Agent markdown + YAML loading
│   │   ├── workflow_loader.py  # Workflow YAML + instructions
│   │   └── knowledge_loader.py # Knowledge base file loading
│   ├── builders/
│   │   ├── __init__.py
│   │   ├── prompt_builder.py   # MCP prompt construction
│   │   ├── tool_builder.py     # MCP tool definitions
│   │   └── resource_builder.py # MCP resource definitions
│   └── utils/
│       ├── __init__.py
│       ├── path_resolver.py    # Resolve {project-root} etc.
│       └── yaml_merger.py      # Merge YAML overrides
├── bmad/                       # BMAD installation (untouched)
│   ├── core/
│   ├── bmm/
│   └── _cfg/
├── docs/
│   ├── prd.md                  # This document
│   ├── architecture.md         # Architecture specification
│   └── user-guide.md           # End-user documentation
├── tests/
│   ├── test_loaders.py
│   ├── test_builders.py
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
- Manifest loader for agents
- Agent builder (markdown + YAML merge)
- Expose 11 agent prompts
- Basic testing

**Success Criteria:**
- User can invoke `/bmad-analyst` in Claude Desktop
- Mary's full persona loads correctly
- Agent responds in-character

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
- Workflow loader (YAML + instructions)
- `execute_workflow()` tool
- Variable resolution
- Template loading

**Success Criteria:**
- Workflow instructions load correctly
- All variables resolved
- Context injected properly

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
| BMAD structure changes breaking manifest parsing | High | Medium | Version pinning, automated tests |
| MCP protocol changes | High | Low | Track MCP SDK updates, abstract protocol layer |
| Context size limits in MCP hosts | Medium | Medium | Aggressive lazy loading, chunking strategies |
| Performance issues with large manifests | Low | Low | Caching, indexing strategies |

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
EOF                                               |
    |                                                |
[Claude injects prompt into conversation] <─────────┘
    |
    v
[User now chatting with "Mary the Business Analyst"]
```

---

### Flow 2: Workflow Discovery & Execution

```
[User chatting with Mary (analyst agent)]
    |
    | User: "I need to brainstorm a new project"
    |
    v
[Mary (LLM)] decides to call tool: list_workflows(category="analysis")
    |
    v
[BMAD MCP Server] → ToolExecutor.list_workflows(category="analysis")
                            |
                            v
                  ManifestLoader.load_workflow_manifest()
                            |
                            v
                  Read: bmad/_cfg/workflow-manifest.csv
                            |
                            v
                  Filter workflows containing "analysis" in path
                            |
                            v
                  Return: [
                      {name: "brainstorm-project", description: "..."},
                      {name: "product-brief", description: "..."},
                      {name: "research", description: "..."}
                  ]
    cat> /Users/mkellerman/GitHub/bmad-mcp-server/docs/prd.md << 'EOF'
# Product Requirements Document: BMAD MCP Server

**Product Name:** BMAD MCP Server  
**Version:** 1.0  
**Date:** October 23, 2025  
**Owner:** John (Product Manager)  
**Status:** Draft - Planning Phase

---

## Executive Summary

The BMAD MCP Server is a Model Context Protocol implementation that exposes the BMAD (Business Methodology for Agile Development) framework to any MCP-compatible host (Claude Desktop, Cursor, etc.). It provides lazy-loaded access to BMAD agents, workflows, tasks, and knowledge bases through a standardized protocol interface, enabling users to leverage BMAD methodology without leaving their development environment.

## Problem Statement

### Current State
- BMAD methodology exists as a standalone system requiring manual activation
- Users must context-switch between their IDE/chat environment and BMAD
- Full workflow context loading causes token bloat and cognitive overload
- No standardized way to inject BMAD capabilities into existing LLM workflows

### Desired State
- BMAD agents accessible via simple slash commands (e.g., `/bmad-analyst`)
- Workflows discoverable and executable on-demand through agent conversation
- Context loaded lazily - only what's needed, when it's needed
- Seamless integration with any MCP-compatible host

## Goals & Success Metrics

### Primary Goals
1. Enable BMAD agent invocation through MCP prompts
2. Provide dynamic workflow discovery and execution via MCP tools
3. Maintain `/bmad` folder integrity for upstream updates
4. Minimize context pollution through lazy loading

### Success Metrics
- All 11 BMAD agents accessible via `/bmad-{name}` prompts
- Workflows discoverable through conversational interface
- Zero modifications to `/bmad` directory structure
- Context size reduced by 80%+ vs. full-load approach

### Non-Goals
- Creating new BMAD workflows or agents (use existing)
- Modifying BMAD core functionality
- Building a custom UI (rely on MCP host UIs)

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
- **FR1.3** Load full agent persona including: role, identity, communication style, principles
- **FR1.4** Merge agent markdown with customization YAML overrides
- **FR1.5** Agent persists in conversation context until dismissed

#### FR2: Workflow Discovery Tools
- **FR2.1** `list_workflows(category?, module?)` returns filtered workflow list
- **FR2.2** `get_workflow_details(workflow_name)` returns metadata
- **FR2.3** Results include: name, description, author, module, path
- **FR2.4** Read from `/bmad/_cfg/workflow-manifest.csv`

#### FR3: Workflow Execution Tools
- **FR3.1** `execute_workflow(workflow_name, params?)` loads and begins workflow
- **FR3.2** Load workflow.yaml configuration
- **FR3.3** Load instructions.md or embedded instructions
- **FR3.4** Resolve all variables and paths
- **FR3.5** Return formatted workflow context to agent

#### FR4: Task Execution Tools
- **FR4.1** `list_tasks()` returns available BMAD tasks
- **FR4.2** `execute_task(task_name, params?)` executes specific task
- **FR4.3** Read from `/bmad/_cfg/task-manifest.csv`

#### FR5: Knowledge Access Tools
- **FR5.1** `get_knowledge(domain)` loads knowledge base section
- **FR5.2** Support domains: testarch, architecture, patterns
- **FR5.3** Return markdown content for LLM consumption

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
- `pyyaml` - YAML configuration parsing
- `pandas` - CSV manifest parsing (optional, can use csv module)

## Architecture Overview

(See `architecture.md` for detailed architecture)

### High-Level Components
1. **MCP Server** - Protocol implementation and request routing
2. **Manifest Loaders** - Read and parse CSV manifests
3. **Agent Builder** - Construct agent prompts from markdown + YAML
4. **Workflow Engine** - Load and execute workflows
5. **Resource Manager** - Serve static resources

### Data Flow
```
User invokes /bmad-analyst
  ↓
MCP Server receives prompt request
  ↓
Agent Builder loads analyst.md + customization
  ↓
Merged persona returned to user context
  ↓
User converses with agent
  ↓
Agent calls list_workflows()
  ↓
Manifest Loader reads workflow-manifest.csv
  ↓
Filtered results returned to agent
  ↓
Agent presents options to user
  ↓
Agent calls execute_workflow('brainstorm-project')
  ↓
Workflow Engine loads workflow.yaml + instructions.md
  ↓
Workflow context injected into conversation
```

## File Structure

```
bmad-mcp-server/
├── src/
│   ├── mcp_server.py           # Main MCP server entry point
│   ├── loaders/
│   │   ├── __init__.py
│   │   ├── manifest_loader.py  # CSV manifest parsing
│   │   ├── agent_loader.py     # Agent markdown + YAML loading
│   │   ├── workflow_loader.py  # Workflow YAML + instructions
│   │   └── knowledge_loader.py # Knowledge base file loading
│   ├── builders/
│   │   ├── __init__.py
│   │   ├── prompt_builder.py   # MCP prompt construction
│   │   ├── tool_builder.py     # MCP tool definitions
│   │   └── resource_builder.py # MCP resource definitions
│   └── utils/
│       ├── __init__.py
│       ├── path_resolver.py    # Resolve {project-root} etc.
│       └── yaml_merger.py      # Merge YAML overrides
├── bmad/                       # BMAD installation (untouched)
│   ├── core/
│   ├── bmm/
│   └── _cfg/
├── docs/
│   ├── prd.md                  # This document
│   ├── architecture.md         # Architecture specification
│   └── user-guide.md           # End-user documentation
├── tests/
│   ├── test_loaders.py
│   ├── test_builders.py
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
- Manifest loader for agents
- Agent builder (markdown + YAML merge)
- Expose 11 agent prompts
- Basic testing

**Success Criteria:**
- User can invoke `/bmad-analyst` in Claude Desktop
- Mary's full persona loads correctly
- Agent responds in-character

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
- Workflow loader (YAML + instructions)
- `execute_workflow()` tool
- Variable resolution
- Template loading

**Success Criteria:**
- Workflow instructions load correctly
- All variables resolved
- Context injected properly

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
| BMAD structure changes breaking manifest parsing | High | Medium | Version pinning, automated tests |
| MCP protocol changes | High | Low | Track MCP SDK updates, abstract protocol layer |
| Context size limits in MCP hosts | Medium | Medium | Aggressive lazy loading, chunking strategies |
| Performance issues with large manifests | Low | Low | Caching, indexing strategies |

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
EOF                      |
    |                       |
[Mary receives list] <─────┘
    |
    | Mary: "I see three approaches: 1) Brainstorm Project..."
    |
    v
[User]: "Let's do brainstorm project"
    |
    v
[Mary] calls tool: execute_workflow("brainstorm-project")
    |
    v
[BMAD MCP Server] → ToolExecutor.execute_workflow("brainstorm-project")
                            |
                            v
                  WorkflowLoader.load_workflow("brainstorm-project")
                            |
                            v
                  Find in manifest → path: bmm/workflows/1-analysis/brainstorm-project
                            |
                            v
                  Read: bmad/bmm/workflows/1-analysis/brainstorm-project/workflow.yaml
                            |
                            v
                  Extract: instructions path from config
                            |
                            v
                  Read: bmad/bmm/workflows/1-analysis/brainstorm-project/instructions.md
                            |
                            v
                  PathResolver.resolve_config() → resolve {project-root} etc
                            |
                            v
                  Return: {
                      name: "brainstorm-project",
                      description: "...",
                      config: {...resolved...},
                      instructions: "...full markdown..."
                  }
    cat> /Users/mkellerman/GitHub/bmad-mcp-server/docs/prd.md << 'EOF'
# Product Requirements Document: BMAD MCP Server

**Product Name:** BMAD MCP Server  
**Version:** 1.0  
**Date:** October 23, 2025  
**Owner:** John (Product Manager)  
**Status:** Draft - Planning Phase

---

## Executive Summary

The BMAD MCP Server is a Model Context Protocol implementation that exposes the BMAD (Business Methodology for Agile Development) framework to any MCP-compatible host (Claude Desktop, Cursor, etc.). It provides lazy-loaded access to BMAD agents, workflows, tasks, and knowledge bases through a standardized protocol interface, enabling users to leverage BMAD methodology without leaving their development environment.

## Problem Statement

### Current State
- BMAD methodology exists as a standalone system requiring manual activation
- Users must context-switch between their IDE/chat environment and BMAD
- Full workflow context loading causes token bloat and cognitive overload
- No standardized way to inject BMAD capabilities into existing LLM workflows

### Desired State
- BMAD agents accessible via simple slash commands (e.g., `/bmad-analyst`)
- Workflows discoverable and executable on-demand through agent conversation
- Context loaded lazily - only what's needed, when it's needed
- Seamless integration with any MCP-compatible host

## Goals & Success Metrics

### Primary Goals
1. Enable BMAD agent invocation through MCP prompts
2. Provide dynamic workflow discovery and execution via MCP tools
3. Maintain `/bmad` folder integrity for upstream updates
4. Minimize context pollution through lazy loading

### Success Metrics
- All 11 BMAD agents accessible via `/bmad-{name}` prompts
- Workflows discoverable through conversational interface
- Zero modifications to `/bmad` directory structure
- Context size reduced by 80%+ vs. full-load approach

### Non-Goals
- Creating new BMAD workflows or agents (use existing)
- Modifying BMAD core functionality
- Building a custom UI (rely on MCP host UIs)

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
- **FR1.3** Load full agent persona including: role, identity, communication style, principles
- **FR1.4** Merge agent markdown with customization YAML overrides
- **FR1.5** Agent persists in conversation context until dismissed

#### FR2: Workflow Discovery Tools
- **FR2.1** `list_workflows(category?, module?)` returns filtered workflow list
- **FR2.2** `get_workflow_details(workflow_name)` returns metadata
- **FR2.3** Results include: name, description, author, module, path
- **FR2.4** Read from `/bmad/_cfg/workflow-manifest.csv`

#### FR3: Workflow Execution Tools
- **FR3.1** `execute_workflow(workflow_name, params?)` loads and begins workflow
- **FR3.2** Load workflow.yaml configuration
- **FR3.3** Load instructions.md or embedded instructions
- **FR3.4** Resolve all variables and paths
- **FR3.5** Return formatted workflow context to agent

#### FR4: Task Execution Tools
- **FR4.1** `list_tasks()` returns available BMAD tasks
- **FR4.2** `execute_task(task_name, params?)` executes specific task
- **FR4.3** Read from `/bmad/_cfg/task-manifest.csv`

#### FR5: Knowledge Access Tools
- **FR5.1** `get_knowledge(domain)` loads knowledge base section
- **FR5.2** Support domains: testarch, architecture, patterns
- **FR5.3** Return markdown content for LLM consumption

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
- `pyyaml` - YAML configuration parsing
- `pandas` - CSV manifest parsing (optional, can use csv module)

## Architecture Overview

(See `architecture.md` for detailed architecture)

### High-Level Components
1. **MCP Server** - Protocol implementation and request routing
2. **Manifest Loaders** - Read and parse CSV manifests
3. **Agent Builder** - Construct agent prompts from markdown + YAML
4. **Workflow Engine** - Load and execute workflows
5. **Resource Manager** - Serve static resources

### Data Flow
```
User invokes /bmad-analyst
  ↓
MCP Server receives prompt request
  ↓
Agent Builder loads analyst.md + customization
  ↓
Merged persona returned to user context
  ↓
User converses with agent
  ↓
Agent calls list_workflows()
  ↓
Manifest Loader reads workflow-manifest.csv
  ↓
Filtered results returned to agent
  ↓
Agent presents options to user
  ↓
Agent calls execute_workflow('brainstorm-project')
  ↓
Workflow Engine loads workflow.yaml + instructions.md
  ↓
Workflow context injected into conversation
```

## File Structure

```
bmad-mcp-server/
├── src/
│   ├── mcp_server.py           # Main MCP server entry point
│   ├── loaders/
│   │   ├── __init__.py
│   │   ├── manifest_loader.py  # CSV manifest parsing
│   │   ├── agent_loader.py     # Agent markdown + YAML loading
│   │   ├── workflow_loader.py  # Workflow YAML + instructions
│   │   └── knowledge_loader.py # Knowledge base file loading
│   ├── builders/
│   │   ├── __init__.py
│   │   ├── prompt_builder.py   # MCP prompt construction
│   │   ├── tool_builder.py     # MCP tool definitions
│   │   └── resource_builder.py # MCP resource definitions
│   └── utils/
│       ├── __init__.py
│       ├── path_resolver.py    # Resolve {project-root} etc.
│       └── yaml_merger.py      # Merge YAML overrides
├── bmad/                       # BMAD installation (untouched)
│   ├── core/
│   ├── bmm/
│   └── _cfg/
├── docs/
│   ├── prd.md                  # This document
│   ├── architecture.md         # Architecture specification
│   └── user-guide.md           # End-user documentation
├── tests/
│   ├── test_loaders.py
│   ├── test_builders.py
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
- Manifest loader for agents
- Agent builder (markdown + YAML merge)
- Expose 11 agent prompts
- Basic testing

**Success Criteria:**
- User can invoke `/bmad-analyst` in Claude Desktop
- Mary's full persona loads correctly
- Agent responds in-character

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
- Workflow loader (YAML + instructions)
- `execute_workflow()` tool
- Variable resolution
- Template loading

**Success Criteria:**
- Workflow instructions load correctly
- All variables resolved
- Context injected properly

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
| BMAD structure changes breaking manifest parsing | High | Medium | Version pinning, automated tests |
| MCP protocol changes | High | Low | Track MCP SDK updates, abstract protocol layer |
| Context size limits in MCP hosts | Medium | Medium | Aggressive lazy loading, chunking strategies |
| Performance issues with large manifests | Low | Low | Caching, indexing strategies |

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
EOF                      |
    |                       |
[Mary receives workflow] <─┘
    |
    | Mary injects instructions into context
    | Mary: "Great! Let's begin the brainstorming workflow..."
    |
    v
[Workflow execution begins guided by instructions]
```

---

## Interface Specifications

### MCP Prompt Interface

**List Prompts Response:**
```json
{
  "prompts": [
    {
      "name": "bmad-analyst",
      "description": "Load Mary - Business Analyst",
      "arguments": []
    },
    {
      "name": "bmad-architect",
      "description": "Load Winston - Architect",
      "arguments": []
    }
  ]
}
```

**Get Prompt Response:**
```json
{
  "description": "Business Analyst agent persona",
  "messages": [
    {
      "role": "system",
      "content": {
        "type": "text",
        "text": "You are Mary, Business Analyst.\n\n**Role:** Strategic Business Analyst + Requirements Expert\n\n..."
      }
    }
  ]
}
```

---

### MCP Tool Interface

**List Tools Response:**
```json
{
  "tools": [
    {
      "name": "list_workflows",
      "description": "List available BMAD workflows",
      "inputSchema": {
        "type": "object",
        "properties": {
          "category": {"type": "string", "enum": ["analysis", "planning", "implementation"]},
          "module": {"type": "string", "enum": ["core", "bmm"]}
        }
      }
    },
    {
      "name": "execute_workflow",
      "description": "Execute a BMAD workflow",
      "inputSchema": {
        "type": "object",
        "properties": {
          "workflow_name": {"type": "string", "required": true}
        },
        "required": ["workflow_name"]
      }
    }
  ]
}
```

**Call Tool Response (list_workflows):**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"workflows\": [\n    {\n      \"name\": \"brainstorm-project\",\n      \"description\": \"Structured brainstorming for new project ideas\",\n      \"module\": \"bmm\",\n      \"category\": \"analysis\"\n    }\n  ]\n}"
    }
  ]
}
```

**Call Tool Response (execute_workflow):**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Workflow 'brainstorm-project' loaded successfully.\n\n**Description:** Structured brainstorming...\n\n**Instructions:**\n\n# Brainstorming Workflow\n\n<step n=\"1\">..."
    }
  ]
}
```

---

### MCP Resource Interface

**List Resources Response:**
```json
{
  "resources": [
    {
      "uri": "bmad://manifests/workflows",
      "name": "Workflow Manifest",
      "description": "Complete list of available BMAD workflows",
      "mimeType": "text/csv"
    },
    {
      "uri": "bmad://manifests/agents",
      "name": "Agent Manifest",
      "description": "Complete list of BMAD agents",
      "mimeType": "text/csv"
    }
  ]
}
```

**Read Resource Response:**
```json
{
  "contents": [
    {
      "uri": "bmad://manifests/workflows",
      "mimeType": "text/csv",
      "text": "name,description,author,module,path\nbrainstorm-project,Structured brainstorming..."
    }
  ]
}
```

---

## Deployment Architecture

### Local Development
```
Developer Machine
├── Python 3.11+ venv
├── bmad-mcp-server/
│   ├── src/ (server code)
│   └── bmad/ (installed via npx)
└── Claude Desktop / Cursor
    └── MCP client connects to localhost
```

### Configuration File
**Location:** `~/.config/claude/config.json` or Cursor settings

```json
{
  "mcpServers": {
    "bmad": {
      "command": "python",
      "args": ["/path/to/bmad-mcp-server/src/mcp_server.py"],
      "env": {
        "BMAD_ROOT": "/path/to/bmad-mcp-server/bmad"
      }
    }
  }
}
```

---

## Security Considerations

### File System Access
- **Threat:** Malicious workflows could attempt path traversal
- **Mitigation:** Validate all paths stay within BMAD root
- **Implementation:**
  ```python
  def validate_path(self, path: Path) -> bool:
      """Ensure path is within BMAD root"""
      return path.resolve().is_relative_to(self.bmad_root.resolve())
  ```

### Command Execution
- **Threat:** Workflows might contain executable commands
- **Mitigation:** Server only READS files, never executes
- **Implementation:** No `eval()`, `exec()`, or subprocess calls

### Data Exposure
- **Threat:** Sensitive project data in configs exposed via MCP
- **Mitigation:** Sanitize config data before returning
- **Implementation:**
  ```python
  SENSITIVE_KEYS = ['api_key', 'token', 'password']
  
  def sanitize_config(self, config: Dict) -> Dict:
      """Remove sensitive data from config"""
      return {k: v for k, v in config.items() if k not in SENSITIVE_KEYS}
  ```

---

## Performance Strategy

### Caching Strategy
```python
class PerformanceConfig:
    MANIFEST_CACHE_TTL = 300  # 5 minutes
    AGENT_CACHE_TTL = 600     # 10 minutes
    WORKFLOW_CACHE_TTL = 300  # 5 minutes
    MAX_CACHE_SIZE_MB = 50    # 50 MB total cache
```

### Lazy Loading Implementation
- Manifests: Load once, cache with TTL
- Agents: Load on prompt invocation, cache merged result
- Workflows: Load on execution, don't cache (too large)
- Knowledge: Load on demand, don't cache

### Performance Targets
| Operation | Target | Strategy |
|-----------|--------|----------|
| list_prompts() | < 100ms | Cached manifest |
| get_prompt() | < 1s | Cached agent merge |
| list_workflows() | < 500ms | Cached manifest + filter |
| execute_workflow() | < 2s | Direct file read |

---

## Technology Decisions

### Why Python?
1. MCP reference implementation is Python
2. Excellent YAML/CSV parsing libraries
3. Simple async/await for MCP protocol
4. Easy deployment (single venv)

### Why Not TypeScript?
- Python chosen for consistency with MCP examples
- Can be ported to TS if needed in Phase 4

### Why AsyncIO?
- MCP protocol uses async patterns
- Non-blocking I/O for multiple clients
- Future-proof for scaling

### Why No Database?
- Data already in files (manifests)
- Adding DB adds complexity without value
- File-based approach simpler to maintain

---

## Future Enhancements (Post-MVP)

### Phase 5+: Advanced Features
1. **Hot Reload:** Watch `/bmad` for changes, invalidate cache
2. **Workflow State:** Persist workflow progress across sessions
3. **Multi-Agent:** Agents invoking other agents
4. **Telemetry:** Track usage patterns, popular workflows
5. **Performance:** Pre-warm cache on startup
6. **Validation:** Schema validation for BMAD files

---

## Appendix: File Structure

```
src/
├── mcp_server.py                 # Main entry point (100-150 lines)
├── loaders/
│   ├── __init__.py
│   ├── manifest_loader.py        # CSV parsing for discovery (100 lines)
│   └── file_reader.py            # Raw file reading (50 lines)
├── builders/
│   ├── __init__.py
│   ├── prompt_builder.py         # MCP prompt construction with raw files (150 lines)
│   ├── tool_builder.py           # MCP tool definitions (100 lines)
│   └── resource_builder.py       # MCP resource definitions (80 lines)
├── utils/
│   ├── __init__.py
│   └── path_validator.py         # Security path validation (40 lines)
└── config.py                     # Configuration constants (40 lines)

Total Estimated: ~700 lines of Python (dramatically simpler than original ~1400 lines)
```

---

**Document Status:** Ready for review  
**Next Step:** Approval from team, then Bob creates user stories
