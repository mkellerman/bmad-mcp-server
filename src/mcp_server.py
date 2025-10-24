"""
BMAD MCP Server - Main server implementation.

This server exposes BMAD methodology through the Model Context Protocol,
serving raw agent files, workflows, and tasks without parsing or transformation.
The LLM processes files according to BMAD methodology instructions.
"""

import asyncio
import logging
from pathlib import Path
from typing import Any

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Prompt,
    PromptMessage,
    TextContent,
    Tool,
    GetPromptResult,
    CallToolResult,
    Resource,
    ReadResourceResult,
)

from src.loaders.manifest_loader import ManifestLoader
from src.utils.file_reader import FileReader

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class BMADMCPServer:
    """
    MCP Server for BMAD methodology.
    
    Serves raw BMAD files (agents, workflows, tasks) to MCP clients.
    The server acts as a file proxy - no parsing or transformation.
    LLM processes files using BMAD methodology loaded in context.
    """
    
    def __init__(self, bmad_root: Path):
        """
        Initialize BMAD MCP Server.
        
        Args:
            bmad_root: Path to BMAD installation directory
        """
        self.bmad_root = Path(bmad_root).resolve()
        logger.info(f"Initializing BMAD MCP Server with root: {self.bmad_root}")
        
        # Validate BMAD installation
        if not self.bmad_root.exists():
            raise ValueError(f"BMAD root does not exist: {self.bmad_root}")
        
        manifest_dir = self.bmad_root / "bmad" / "_cfg"
        if not manifest_dir.exists():
            raise ValueError(f"BMAD manifest directory not found: {manifest_dir}")
        
        # Initialize loaders
        self.manifest_loader = ManifestLoader(self.bmad_root)
        self.file_reader = FileReader(self.bmad_root)
        
        # Load agent manifest
        self.agents = self.manifest_loader.load_agent_manifest()
        logger.info(f"Loaded {len(self.agents)} agents from manifest")
        
        # Load workflow manifest
        self.workflows = self.manifest_loader.load_workflow_manifest()
        logger.info(f"Loaded {len(self.workflows)} workflows from manifest")
        
        logger.info("BMAD MCP Server initialized successfully")
    
    async def list_prompts(self) -> list[Prompt]:
        """
        List available BMAD agent prompts.
        
        Returns:
            List of prompt definitions for BMAD agents
        """
        logger.info(f"list_prompts called - returning {len(self.agents)} agents")
        
        prompts = []
        for agent in self.agents:
            # Use agent name as prompt name (with bmad- prefix if not present)
            agent_name = agent.get('name', '')
            if not agent_name.startswith('bmad-'):
                prompt_name = f"bmad-{agent_name}"
            else:
                prompt_name = agent_name
            
            # Create description from agent metadata
            display_name = agent.get('displayName', agent_name)
            title = agent.get('title', 'BMAD Agent')
            description = f"{display_name} - {title}"
            
            prompts.append(Prompt(
                name=prompt_name,
                description=description
            ))
        
        return prompts
    
    async def get_prompt(self, name: str, arguments: dict[str, Any]) -> GetPromptResult:
        """
        Get a specific BMAD agent prompt.
        
        Args:
            name: Prompt name (e.g., "bmad-analyst")
            arguments: Optional arguments for prompt customization
            
        Returns:
            Prompt result containing agent files and instructions
        """
        logger.info(f"get_prompt called for: {name}")
        
        # Normalize agent name (handle both "analyst" and "bmad-analyst")
        # Try stripping bmad- prefix for agents like "analyst"
        agent_name_stripped = name.replace('bmad-', '')
        
        # Find agent in manifest - try both with and without prefix
        agent = None
        agent_name = None
        for a in self.agents:
            manifest_name = a.get('name')
            # Match if manifest name equals stripped name OR original name
            # This handles both "analyst" -> "analyst" and "bmad-master" -> "bmad-master"
            if manifest_name == agent_name_stripped or manifest_name == name:
                agent = a
                agent_name = manifest_name  # Use the actual name from manifest
                break
        
        if not agent:
            # Agent not found
            error_msg = f"Agent '{name}' not found. Available agents: {', '.join([a.get('name', '') for a in self.agents])}"
            logger.warning(error_msg)
            return GetPromptResult(
                description=f"Error: Agent not found",
                messages=[
                    PromptMessage(
                        role="user",
                        content=TextContent(
                            type="text",
                            text=error_msg
                        )
                    )
                ]
            )
        
        # Build prompt content
        content_parts = []
        
        # Header
        display_name = agent.get('displayName', agent_name)
        title = agent.get('title', 'BMAD Agent')
        content_parts.append(f"# BMAD Agent: {display_name}")
        content_parts.append(f"**Title:** {title}\n")
        
        # Agent markdown file
        agent_path = agent.get('path', '')
        if agent_path:
            content_parts.append(f"## Agent Definition\n")
            content_parts.append(f"**File:** `{agent_path}`\n")
            
            try:
                agent_md_content = self.file_reader.read_file(agent_path)
                content_parts.append("```markdown")
                content_parts.append(agent_md_content)
                content_parts.append("```\n")
            except Exception as e:
                content_parts.append(f"[Error reading agent file: {e}]\n")
        
        # Customization YAML file
        module = agent.get('module', 'bmm')
        customize_path = f"bmad/_cfg/agents/{module}-{agent_name}.customize.yaml"
        content_parts.append(f"## Agent Customization\n")
        content_parts.append(f"**File:** `{customize_path}`\n")
        
        try:
            yaml_content = self.file_reader.read_file(customize_path)
            content_parts.append("```yaml")
            content_parts.append(yaml_content)
            content_parts.append("```\n")
        except Exception as e:
            content_parts.append(f"[Customization file not found or error: {e}]\n")
        
        # BMAD Processing Instructions
        content_parts.append("## BMAD Processing Instructions\n")
        content_parts.append("""
This agent is part of the BMAD (BMad Methodology for Agile Development) framework.

**How to Process:**
1. Read the agent definition markdown to understand role, identity, and principles
2. Apply the communication style specified in the agent definition
3. Use the customization YAML for any project-specific overrides
4. Access available BMAD tools and workflows as needed
5. Follow the agent's core principles when making decisions

**Agent Activation:**
- You are now embodying this agent's persona
- Communicate using the specified communication style
- Apply the agent's principles to all recommendations
- Use the agent's identity and role to guide your responses
""")
        
        # Available Tools
        content_parts.append("## Available BMAD Tools\n")
        content_parts.append("""
The following MCP tools are available for workflow execution:
- `list_workflows` - Discover available BMAD workflows
- `get_workflow_details` - Get details about a specific workflow
- `execute_workflow` - Load and execute a BMAD workflow
- `list_tasks` - Discover available BMAD tasks
- `get_task_details` - Get details about a specific task

Use these tools to access BMAD workflows and tasks as needed.
""")
        
        # Combine all parts
        full_content = "\n".join(content_parts)
        
        return GetPromptResult(
            description=f"BMAD Agent: {display_name} - {title}",
            messages=[
                PromptMessage(
                    role="user",
                    content=TextContent(
                        type="text",
                        text=full_content
                    )
                )
            ]
        )
    
    async def list_tools(self) -> list[Tool]:
        """
        List available BMAD tools (workflows, tasks, knowledge access).
        
        Returns:
            List of tool definitions
        """
        logger.info(f"list_tools called - returning workflow tools")
        
        tools = [
            Tool(
                name="list_workflows",
                description="List all available BMAD workflows. Optional filters: module (core/bmm), category",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "module": {
                            "type": "string",
                            "description": "Filter by module: core or bmm",
                            "enum": ["core", "bmm"]
                        },
                        "category": {
                            "type": "string",
                            "description": "Filter by workflow category"
                        }
                    }
                }
            ),
            Tool(
                name="get_workflow_details",
                description="Get detailed information about a specific workflow",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "workflow_name": {
                            "type": "string",
                            "description": "Name of the workflow"
                        }
                    },
                    "required": ["workflow_name"]
                }
            ),
            Tool(
                name="execute_workflow",
                description="Load and execute a BMAD workflow, returns workflow YAML and instructions",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "workflow_name": {
                            "type": "string",
                            "description": "Name of the workflow to execute"
                        }
                    },
                    "required": ["workflow_name"]
                }
            )
        ]
        
        return tools
    
    async def call_tool(self, name: str, arguments: dict[str, Any]) -> CallToolResult:
        """
        Execute a BMAD tool (workflow, task, etc.).
        
        Args:
            name: Tool name (e.g., "list_workflows", "execute_workflow")
            arguments: Tool-specific arguments
            
        Returns:
            Tool execution result
        """
        logger.info(f"call_tool called: {name} with args: {arguments}")
        
        # Route to appropriate tool handler
        if name == "list_workflows":
            return await self._list_workflows(arguments)
        elif name == "get_workflow_details":
            return await self._get_workflow_details(arguments)
        elif name == "execute_workflow":
            return await self._execute_workflow(arguments)
        else:
            # Unknown tool
            return CallToolResult(
                content=[
                    TextContent(
                        type="text",
                        text=f"[Placeholder - tool '{name}' not yet implemented]"
                    )
                ]
            )
    
    async def _list_workflows(self, arguments: dict[str, Any]) -> CallToolResult:
        """List available workflows with optional filtering."""
        import json
        
        # Get filter parameters
        module_filter = arguments.get('module')
        category_filter = arguments.get('category')
        
        # Filter workflows
        filtered_workflows = []
        for wf in self.workflows:
            # Apply module filter
            if module_filter and wf.get('module') != module_filter:
                continue
            
            # Apply category filter (check in path or description)
            if category_filter:
                path = wf.get('path', '').lower()
                desc = wf.get('description', '').lower()
                if category_filter.lower() not in path and category_filter.lower() not in desc:
                    continue
            
            filtered_workflows.append({
                "name": wf.get('name'),
                "description": wf.get('description', ''),
                "module": wf.get('module'),
                "path": wf.get('path')
            })
        
        result = {
            "workflows": filtered_workflows,
            "count": len(filtered_workflows)
        }
        
        return CallToolResult(
            content=[
                TextContent(
                    type="text",
                    text=json.dumps(result, indent=2)
                )
            ]
        )
    
    async def _get_workflow_details(self, arguments: dict[str, Any]) -> CallToolResult:
        """Get details about a specific workflow."""
        import json
        
        workflow_name = arguments.get('workflow_name')
        
        # Find workflow
        workflow = None
        for wf in self.workflows:
            if wf.get('name') == workflow_name:
                workflow = wf
                break
        
        if not workflow:
            return CallToolResult(
                content=[
                    TextContent(
                        type="text",
                        text=json.dumps({
                            "error": f"Workflow '{workflow_name}' not found"
                        })
                    )
                ]
            )
        
        return CallToolResult(
            content=[
                TextContent(
                    type="text",
                    text=json.dumps(workflow, indent=2)
                )
            ]
        )
    
    async def _execute_workflow(self, arguments: dict[str, Any]) -> CallToolResult:
        """Execute a workflow by loading its YAML and instructions."""
        import json
        
        workflow_name = arguments.get('workflow_name')
        
        # Find workflow
        workflow = None
        for wf in self.workflows:
            if wf.get('name') == workflow_name:
                workflow = wf
                break
        
        if not workflow:
            return CallToolResult(
                content=[
                    TextContent(
                        type="text",
                        text=f"Error: Workflow '{workflow_name}' not found. Available workflows: {', '.join([w.get('name', '') for w in self.workflows])}"
                    )
                ]
            )
        
        # Load workflow YAML file
        workflow_path = workflow.get('path', '')
        workflow_yaml = None
        if workflow_path:
            try:
                workflow_yaml = self.file_reader.read_file(workflow_path)
            except Exception as e:
                workflow_yaml = f"[Error reading workflow file: {e}]"
        
        # Try to load instructions.md from workflow directory
        instructions = None
        if workflow_path:
            workflow_dir = str(Path(workflow_path).parent)
            instructions_path = f"{workflow_dir}/instructions.md"
            try:
                instructions = self.file_reader.read_file(instructions_path)
            except:
                # Instructions file not required
                pass
        
        result = {
            "name": workflow.get('name'),
            "description": workflow.get('description', ''),
            "module": workflow.get('module'),
            "path": workflow_path,
            "workflow_yaml": workflow_yaml,
            "instructions": instructions
        }
        
        return CallToolResult(
            content=[
                TextContent(
                    type="text",
                    text=json.dumps(result, indent=2)
                )
            ]
        )
    
    async def list_resources(self) -> list[Resource]:
        """
        List available BMAD resources (manifests, configs).
        
        Returns:
            List of resource definitions
        """
        logger.info("list_resources called - placeholder implementation")
        # TODO: Implement in Story 4.3
        return []
    
    async def read_resource(self, uri: str) -> ReadResourceResult:
        """
        Read a BMAD resource by URI.
        
        Args:
            uri: Resource URI (e.g., "bmad://manifests/agents")
            
        Returns:
            Resource contents
        """
        logger.info(f"read_resource called: {uri} - placeholder implementation")
        # TODO: Implement in Story 4.3
        raise NotImplementedError(f"Resource not implemented: {uri}")


async def main():
    """Main entry point for BMAD MCP Server."""
    # Determine BMAD root - use project root since manifest paths include 'bmad/' prefix
    bmad_root = Path(__file__).parent.parent
    
    logger.info(f"Starting BMAD MCP Server...")
    logger.info(f"BMAD root: {bmad_root}")
    
    try:
        # Initialize server
        server_instance = BMADMCPServer(bmad_root)
        
        # Create MCP server
        server = Server("bmad-mcp-server")
        
        # Register handlers
        @server.list_prompts()
        async def handle_list_prompts() -> list[Prompt]:
            return await server_instance.list_prompts()
        
        @server.get_prompt()
        async def handle_get_prompt(name: str, arguments: dict[str, Any]) -> GetPromptResult:
            return await server_instance.get_prompt(name, arguments)
        
        @server.list_tools()
        async def handle_list_tools() -> list[Tool]:
            return await server_instance.list_tools()
        
        @server.call_tool()
        async def handle_call_tool(name: str, arguments: dict[str, Any]) -> CallToolResult:
            return await server_instance.call_tool(name, arguments)
        
        @server.list_resources()
        async def handle_list_resources() -> list[Resource]:
            return await server_instance.list_resources()
        
        @server.read_resource()
        async def handle_read_resource(uri: str) -> ReadResourceResult:
            return await server_instance.read_resource(uri)
        
        # Run server with stdio transport
        logger.info("Server handlers registered, starting stdio server...")
        async with stdio_server() as (read_stream, write_stream):
            await server.run(read_stream, write_stream, server.create_initialization_options())
            
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        raise


def run():
    """Synchronous entry point for console script."""
    asyncio.run(main())


if __name__ == "__main__":
    run()
