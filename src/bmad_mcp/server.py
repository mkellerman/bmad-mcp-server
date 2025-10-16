"""BMAD MCP Server - Main entry point."""

import asyncio
from mcp.server.fastmcp import FastMCP
from .resources import load_embedded_file, load_config, get_embedded_path, list_embedded_files
import re
import xml.etree.ElementTree as ET
from pathlib import Path
import json
import csv
import io

# Initialize FastMCP server
mcp = FastMCP("BMAD Agent Personas")


def main():
    """Entry point for the MCP server."""
    # Run the server with stdio transport (default)
    mcp.run()


def get_embedded_files_dict() -> dict:
    """Get a dictionary of all available embedded files organized by category (excludes _cfg)."""
    files = list_embedded_files("**/*")
    if not files:
        return {}
    
    # Organize files by category, EXCLUDING _cfg/ files
    categories = {
        "config": [],
        "agents": [],
        "workflows": [],
        "tasks": [],
        "teams": [],
        "knowledge": [],
        "other": []
    }
    
    for f in sorted(files):
        # Skip _cfg/ files - these should be loaded from user's workspace
        if f.startswith("_cfg/") or "/_cfg/" in f:
            continue
            
        if "config.yaml" in f:
            categories["config"].append(f)
        elif "/agents/" in f and f.endswith((".md", ".yaml")):
            categories["agents"].append(f)
        elif "/workflows/" in f:
            categories["workflows"].append(f)
        elif "/tasks/" in f:
            categories["tasks"].append(f)
        elif "/teams/" in f:
            categories["teams"].append(f)
        elif "/knowledge/" in f or "/testarch/" in f:
            categories["knowledge"].append(f)
        else:
            categories["other"].append(f)
    
    return categories


@mcp.tool()
def bmad_config(path: str | None = None) -> str:
    """
    Load BMad configuration files.
    
    If no path provided, returns the main config file (core/config.yaml).
    Specify a path to load a different config file.
    
    Available configs:
    - core/config.yaml (main configuration)
    - bmm/config.yaml (BMM module configuration)
    
    Args:
        path: Optional path to specific config file
        
    Returns:
        Configuration file content in YAML format
    """
    if not path:
        path = "core/config.yaml"
    
    try:
        content = load_embedded_file(path)
        return content
    except FileNotFoundError:
        # List available configs
        files = list_embedded_files("**/*config.yaml")
        config_files = [f for f in files if not f.startswith("_cfg/")]
        return f"Config file not found: {path}\n\nAvailable configs:\n" + "\n".join(f"  - {f}" for f in config_files)
    except Exception as e:
        return f"ERROR: Failed to load config {path}: {e}"


@mcp.tool()
def bmad_manifest(type: str = "agent") -> str:
    """
    Load BMad manifest files from the current workspace or embedded resources.
    
    Manifests list available resources. First attempts to load from workspace,
    falls back to embedded manifests.
    
    Args:
        type: Type of manifest to load (agent, workflow, task, file)
        
    Returns:
        Manifest content in CSV format or error message
    """
    manifest_map = {
        "agent": "_cfg/agent-manifest.csv",
        "workflow": "_cfg/workflow-manifest.csv",
        "task": "_cfg/task-manifest.csv",
        "file": "_cfg/files-manifest.csv"
    }
    
    if type not in manifest_map:
        return f"Unknown manifest type: {type}\n\nAvailable types: {', '.join(manifest_map.keys())}"
    
    path = manifest_map[type]
    
    # Try to load from embedded (will be overridden by workspace files in real usage)
    try:
        content = load_embedded_file(path)
        
        # Parse and format for readability
        reader = csv.DictReader(io.StringIO(content))
        rows = list(reader)
        
        if not rows:
            return f"No entries found in {type} manifest"
        
        # Return formatted JSON for better LLM consumption
        return json.dumps({
            "type": type,
            "path": path,
            "count": len(rows),
            "entries": rows
        }, indent=2)
        
    except FileNotFoundError:
        return f"Manifest not found: {path}\n\nNote: Manifests should be in workspace _cfg/ directory or embedded resources."
    except Exception as e:
        return f"ERROR: Failed to load {type} manifest: {e}"


@mcp.tool()
def bmad_agent(name: str | None = None, user_name: str = "User", language: str = "English") -> str:
    """
    Load a BMad agent persona.
    
    If no name provided, lists all available agents from the manifest.
    Otherwise loads the specified agent with injected user preferences.
    
    Available agents (when manifest is loaded):
    - master / bmad-master (Master orchestrator)
    - analyst (Business Analyst)
    - architect (System Architect)
    - dev (Developer)
    - pm (Product Manager)
    - sm (Scrum Master)
    - tea (Test Architect)
    - ux-expert (UX Expert)
    
    Args:
        name: Agent name from manifest (or None to list all)
        user_name: Your name for personalized interactions
        language: Preferred communication language
        
    Returns:
        JSON with agent instructions and available files, or list of agents
    """
    # If no name, list available agents
    if not name:
        try:
            manifest_content = load_embedded_file("_cfg/agent-manifest.csv")
            reader = csv.DictReader(io.StringIO(manifest_content))
            agents = []
            
            for row in reader:
                agents.append({
                    "name": row.get("name", ""),
                    "displayName": row.get("displayName", ""),
                    "title": row.get("title", ""),
                    "role": row.get("role", ""),
                    "icon": row.get("icon", ""),
                    "module": row.get("module", "")
                })
            
            return json.dumps({
                "available_agents": agents,
                "usage": "Call bmad_agent(name='<agent_name>') to load a specific agent"
            }, indent=2)
            
        except Exception as e:
            return f"ERROR: Failed to list agents: {e}"
    
    # Load specific agent
    agent_name_lookup = name.lower().strip()
    if agent_name_lookup == "master":
        agent_name_lookup = "bmad-master"
    
    # Find agent in manifest
    try:
        manifest_content = load_embedded_file("_cfg/agent-manifest.csv")
        reader = csv.DictReader(io.StringIO(manifest_content))
        agent_file_path = None
        
        for row in reader:
            if (row.get("name") or "").strip().lower() == agent_name_lookup:
                agent_file_path = (row.get("path") or "").strip()
                if agent_file_path.startswith("bmad/"):
                    agent_file_path = agent_file_path[5:]
                break
        
        if not agent_file_path:
            return f"Agent '{name}' not found in manifest. Use bmad_agent() without parameters to list available agents."
        
        # Load agent file
        agent_md = load_embedded_file(agent_file_path)
        
        # Inject variables
        agent_md_with_vars = agent_md.replace("{user_name}", user_name).replace("{communication_language}", language)
        
        # Return structured response
        return json.dumps({
            "instructions": agent_md_with_vars,
            "files": get_embedded_files_dict()
        }, indent=2, ensure_ascii=False)
        
    except FileNotFoundError as e:
        return f"ERROR: Agent file not found: {e}"
    except Exception as e:
        return f"ERROR: Failed to load agent: {e}"


@mcp.tool()
def bmad_workflow(name: str | None = None) -> str:
    """
    Load a BMad workflow definition.
    
    If no name provided, lists all available workflows from the manifest.
    Otherwise loads the specified workflow YAML configuration.
    
    Common workflows:
    - party-mode (Multi-agent group discussion)
    - brainstorming (Brainstorming sessions)
    - bmad-init (Initialize BMad in workspace)
    
    Args:
        name: Workflow name or path (or None to list all)
        
    Returns:
        Workflow YAML content or list of available workflows
    """
    # If no name, list available workflows
    if not name:
        try:
            manifest_content = load_embedded_file("_cfg/workflow-manifest.csv")
            reader = csv.DictReader(io.StringIO(manifest_content))
            workflows = []
            
            for row in reader:
                workflows.append({
                    "name": row.get("name", ""),
                    "description": row.get("description", ""),
                    "path": row.get("path", ""),
                    "module": row.get("module", "")
                })
            
            return json.dumps({
                "available_workflows": workflows,
                "usage": "Call bmad_workflow(name='<workflow_name>') to load a specific workflow"
            }, indent=2)
            
        except Exception as e:
            return f"ERROR: Failed to list workflows: {e}"
    
    # Try to find workflow by name in manifest
    try:
        manifest_content = load_embedded_file("_cfg/workflow-manifest.csv")
        reader = csv.DictReader(io.StringIO(manifest_content))
        workflow_path = None
        
        for row in reader:
            if (row.get("name") or "").strip().lower() == name.lower():
                workflow_path = (row.get("path") or "").strip()
                break
        
        # If not found by name, treat as direct path
        if not workflow_path:
            workflow_path = name
        
        # Normalize path
        if workflow_path.startswith("bmad/"):
            workflow_path = workflow_path[5:]
        
        # Load workflow file
        content = load_embedded_file(workflow_path)
        return content
        
    except FileNotFoundError:
        return f"Workflow not found: {name}\n\nUse bmad_workflow() without parameters to list available workflows."
    except Exception as e:
        return f"ERROR: Failed to load workflow: {e}"


@mcp.tool()
def bmad_task(name: str | None = None) -> str:
    """
    Load a BMad task definition.
    
    If no name provided, lists all available tasks from the manifest.
    Otherwise loads the specified task file.
    
    Args:
        name: Task name or path (or None to list all)
        
    Returns:
        Task content or list of available tasks
    """
    # If no name, list available tasks
    if not name:
        try:
            manifest_content = load_embedded_file("_cfg/task-manifest.csv")
            reader = csv.DictReader(io.StringIO(manifest_content))
            tasks = []
            
            for row in reader:
                tasks.append({
                    "name": row.get("name", ""),
                    "description": row.get("description", ""),
                    "path": row.get("path", ""),
                    "module": row.get("module", "")
                })
            
            return json.dumps({
                "available_tasks": tasks,
                "usage": "Call bmad_task(name='<task_name>') to load a specific task"
            }, indent=2)
            
        except Exception as e:
            return f"ERROR: Failed to list tasks: {e}"
    
    # Try to find task by name in manifest
    try:
        manifest_content = load_embedded_file("_cfg/task-manifest.csv")
        reader = csv.DictReader(io.StringIO(manifest_content))
        task_path = None
        
        for row in reader:
            if (row.get("name") or "").strip().lower() == name.lower():
                task_path = (row.get("path") or "").strip()
                break
        
        # If not found by name, treat as direct path
        if not task_path:
            task_path = name
        
        # Normalize path
        if task_path.startswith("bmad/"):
            task_path = task_path[5:]
        
        # Load task file
        content = load_embedded_file(task_path)
        return content
        
    except FileNotFoundError:
        return f"Task not found: {name}\n\nUse bmad_task() without parameters to list available tasks."
    except Exception as e:
        return f"ERROR: Failed to load task: {e}"


@mcp.tool()
def bmad(command: str = "master", user_name: str = "User", language: str = "English") -> str:
    """
    Main BMad interface with smart command parsing.
    
    Intelligently routes commands to appropriate handlers:
    - Agent names → loads agent (analyst, architect, dev, pm, sm, tea, ux-expert)
    - Workflow names → loads workflow (party-mode, brainstorming, etc.)
    - Commands → executes (list-workflows, list-tasks, list-agents)
    - Default → loads master agent
    
    Examples:
      bmad()                    → Load master agent
      bmad("analyst")           → Load analyst agent
      bmad("party-mode")        → Load party-mode workflow
      bmad("list-workflows")    → List all workflows
      bmad("brainstorming")     → Load brainstorming workflow
    
    Args:
        command: Agent name, workflow name, or command (default: "master")
        user_name: Your name for personalized interactions
        language: Preferred communication language
        
    Returns:
        JSON response with instructions and files, or command result
    """
    cmd = command.lower().strip()
    
    # Handle list commands
    if cmd in ["list-agents", "list agents", "agents"]:
        return bmad_agent()
    
    if cmd in ["list-workflows", "list workflows", "workflows"]:
        return bmad_workflow()
    
    if cmd in ["list-tasks", "list tasks", "tasks"]:
        return bmad_task()
    
    # Try to match against agent names
    try:
        manifest = load_embedded_file("_cfg/agent-manifest.csv")
        reader = csv.DictReader(io.StringIO(manifest))
        agent_names = [row.get("name", "").strip().lower() for row in reader if row.get("name")]
        
        if cmd in agent_names or cmd == "master":
            return bmad_agent(name=cmd, user_name=user_name, language=language)
    except:
        pass
    
    # Try to match against workflow names
    try:
        manifest = load_embedded_file("_cfg/workflow-manifest.csv")
        reader = csv.DictReader(io.StringIO(manifest))
        workflow_names = [row.get("name", "").strip().lower() for row in reader if row.get("name")]
        
        if cmd in workflow_names:
            # Load workflow and return instructions
            workflow_yaml = bmad_workflow(name=cmd)
            return json.dumps({
                "type": "workflow",
                "name": cmd,
                "config": workflow_yaml,
                "next_step": f"Parse the workflow YAML and follow its instructions. Use bmad_file() to load additional resources as needed.",
                "files": get_embedded_files_dict()
            }, indent=2)
    except:
        pass
    
    # Default: load master agent
    return bmad_agent(name="master", user_name=user_name, language=language)


@mcp.tool()
def bmad_file(path: str) -> str:
    """
    Load embedded BMAD files on-demand (configs, agents, workflows, tasks, etc.).
    
    Use this tool to retrieve the content of files from the embedded BMAD resources.
    All files are relative to the embedded directory. Common paths:
    - Config: core/config.yaml
    - Agents: core/agents/bmad-master.md, bmm/agents/analyst.md
    - Workflows: core/workflows/party-mode/workflow.yaml
    - Workflow instructions: core/workflows/party-mode/instructions.md
    - Tasks: core/tasks/workflow.xml
    
    Note: _cfg/ manifest files are excluded - use bmad_manifest() instead.
    
    Args:
        path: Relative path within the embedded directory (e.g., "core/config.yaml")
    
    Returns:
        Content of the requested file, or an error message if the file doesn't exist
    """
    # Block access to _cfg/ files - use bmad_manifest() instead
    if path.startswith("_cfg/") or "/_cfg/" in path:
        return f"ERROR: Direct access to manifest files is not allowed. Use bmad_manifest() to access manifests."
    
    try:
        content = load_embedded_file(path)
        return content
    except FileNotFoundError:
        return f"ERROR: File not found: {path}\n\nTip: Use bmad_agent(), bmad_workflow(), etc. to discover available files."
    except Exception as e:
        return f"ERROR: Failed to read file {path}: {e}"


if __name__ == "__main__":
    main()
