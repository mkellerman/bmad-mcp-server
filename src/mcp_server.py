"""
BMAD MCP Server - Main server implementation with unified tool.

This server exposes BMAD methodology through the Model Context Protocol,
using a single unified 'bmad' tool with instruction-based routing.
The LLM processes files according to BMAD methodology instructions.
"""

import asyncio
import json
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
from src.unified_tool import UnifiedBMADTool

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class BMADMCPServer:
    """
    MCP Server for BMAD methodology with unified tool interface.

    Exposes a single 'bmad' tool that uses instruction-based routing:
    - `bmad` → Load bmad-master agent (default)
    - `bmad <agent-name>` → Load specified agent
    - `bmad *<workflow-name>` → Execute specified workflow

    The server acts as a file proxy - no parsing or transformation.
    LLM processes files using BMAD methodology loaded in context.
    """

    def __init__(self, bmad_root: Path):
        """
        Initialize BMAD MCP Server.

        Args:
            bmad_root: Path to BMAD installation directory or project root
                      Can be either:
                      - Project root containing bmad/ subdirectory
                      - BMAD directory itself containing _cfg/
        """
        self.bmad_root = Path(bmad_root).resolve()
        logger.info(f"Initializing BMAD MCP Server with root: {self.bmad_root}")

        # Validate BMAD installation - handle both project root and bmad directory
        if not self.bmad_root.exists():
            raise ValueError(f"BMAD root does not exist: {self.bmad_root}")

        # Check if bmad_root is the project root (contains bmad/ subdirectory),
        # src root (contains src/bmad/ subdirectory), or the BMAD directory itself (contains _cfg/)
        manifest_dir = self.bmad_root / "bmad" / "_cfg"
        if manifest_dir.exists():
            # Project root - bmad_root points to project, manifests in bmad/_cfg
            self.project_root = self.bmad_root
        elif (self.bmad_root / "src" / "bmad" / "_cfg").exists():
            # Repository root - manifests are under src/bmad/_cfg
            manifest_dir = self.bmad_root / "src" / "bmad" / "_cfg"
            self.project_root = self.bmad_root / "src"
        else:
            # BMAD directory - bmad_root points to bmad, manifests in _cfg
            manifest_dir = self.bmad_root / "_cfg"
            if not manifest_dir.exists():
                raise ValueError(
                    f"BMAD manifest directory not found. "
                    f"Expected one of: {self.bmad_root / 'bmad' / '_cfg'}, "
                    f"{self.bmad_root / 'src' / 'bmad' / '_cfg'}, or "
                    f"{self.bmad_root / '_cfg'}"
                )
            # bmad_root is the BMAD directory, so project root is parent
            self.project_root = self.bmad_root.parent

        logger.info(f"Project root: {self.project_root}")
        logger.info(f"Manifest directory: {manifest_dir}")

        # Initialize components
        self.manifest_loader = ManifestLoader(self.project_root)
        self.file_reader = FileReader(self.project_root)
        self.unified_tool = UnifiedBMADTool(self.project_root)

        # Load manifests for prompts
        self.agents = self.manifest_loader.load_agent_manifest()
        self.workflows = self.manifest_loader.load_workflow_manifest()

        logger.info(f"Loaded {len(self.agents)} agents from manifest")
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
        agent_name_stripped = name.replace('bmad-', '')

        # Find agent in manifest - try both with and without prefix
        agent = None
        agent_name = None
        for a in self.agents:
            manifest_name = a.get('name')
            if manifest_name == agent_name_stripped or manifest_name == name:
                agent = a
                agent_name = manifest_name
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

        # Use unified tool to load agent
        result = await self.unified_tool._load_agent(agent_name)

        if not result.get('success', False):
            return GetPromptResult(
                description=f"Error loading agent",
                messages=[
                    PromptMessage(
                        role="user",
                        content=TextContent(
                            type="text",
                            text=result.get('error', 'Unknown error')
                        )
                    )
                ]
            )

        return GetPromptResult(
            description=f"BMAD Agent: {result['display_name']} - {agent.get('title', '')}",
            messages=[
                PromptMessage(
                    role="user",
                    content=TextContent(
                        type="text",
                        text=result['content']
                    )
                )
            ]
        )

    async def list_tools(self) -> list[Tool]:
        """
        List available BMAD tools.

        Returns single unified 'bmad' tool with instruction-based routing.

        Returns:
            List containing the unified bmad tool definition
        """
        logger.info(f"list_tools called - returning unified bmad tool")

        tools = [
            Tool(
                name="bmad",
                description="""Unified BMAD tool with instruction-based routing.

**Command Patterns:**

1. Load default agent (bmad-master):
   - Input: "" (empty string)
   - Example: bmad

2. Load specific agent:
   - Input: "<agent-name>"
   - Example: "analyst" loads the Business Analyst agent
   - Example: "architect" loads the Architect agent
   - Available agents: analyst, architect, dev, pm, sm, tea, ux-expert, bmad-master, game-architect, game-designer, game-dev

3. Execute workflow:
   - Input: "*<workflow-name>" (note the asterisk prefix)
   - Example: "*party-mode" executes the party-mode workflow
   - Example: "*brainstorm-project" executes brainstorming workflow
   - The asterisk (*) is REQUIRED for workflows

4. Discovery commands (built-in):
   - Input: "*list-agents" → Show all available BMAD agents
   - Input: "*list-workflows" → Show all available workflows
   - Input: "*list-tasks" → Show all available tasks
   - Input: "*help" → Show command reference and usage guide

**Naming Rules:**
- Agent names: lowercase letters and hyphens only (e.g., "analyst", "bmad-master")
- Workflow names: lowercase letters, numbers, and hyphens (e.g., "party-mode", "dev-story")
- Names must be 2-50 characters
- Case-sensitive matching

**Important:**
- To execute a workflow, you MUST prefix the name with an asterisk (*)
- Without the asterisk, the tool will try to load an agent with that name
- Use only ONE argument at a time
- Discovery commands are built-in and work independently

**Examples:**
- bmad → Load bmad-master (default orchestrator)
- bmad analyst → Load Mary the Business Analyst
- bmad *party-mode → Execute party-mode workflow
- bmad *list-agents → See all available agents
- bmad *list-workflows → See all workflows you can run
- bmad *help → Show complete command reference

**Error Handling:**
The tool provides helpful suggestions if you:
- Misspell an agent or workflow name (fuzzy matching)
- Forget the asterisk for a workflow
- Use invalid characters or formatting
""",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "command": {
                            "type": "string",
                            "description": "Command to execute: empty string for default, 'agent-name' for agents, '*workflow-name' for workflows"
                        }
                    },
                    "required": ["command"]
                }
            )
        ]

        return tools

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> CallToolResult:
        """
        Execute a BMAD tool.

        Args:
            name: Tool name (should be "bmad" for unified tool)
            arguments: Tool-specific arguments

        Returns:
            Tool execution result
        """
        logger.info(f"call_tool called: {name} with args: {arguments}")

        if name == "bmad":
            return await self._execute_bmad_tool(arguments)
        else:
            # Unknown tool
            return CallToolResult(
                content=[
                    TextContent(
                        type="text",
                        text=f"Error: Unknown tool '{name}'. Only 'bmad' tool is available."
                    )
                ],
                isError=True
            )

    async def _execute_bmad_tool(self, arguments: dict[str, Any]) -> CallToolResult:
        """Execute the unified bmad tool."""
        command = arguments.get('command', '')

        logger.info(f"Executing bmad tool with command: '{command}'")

        # Execute through unified tool
        result = await self.unified_tool.execute(command)

        # Check if error occurred
        if not result.get('success', False):
            error_text = result.get('error', 'Unknown error occurred')
            logger.error(f"BMAD tool error: {error_text}")

            return CallToolResult(
                content=[
                    TextContent(
                        type="text",
                        text=error_text
                    )
                ],
                isError=True
            )

        # Success - format response based on type
        if result.get('type') == 'agent':
            # Agent loaded successfully
            return CallToolResult(
                content=[
                    TextContent(
                        type="text",
                        text=result.get('content', '')
                    )
                ]
            )
        elif result.get('type') == 'workflow':
            # Workflow executed successfully
            response_parts = []
            response_parts.append(f"# Workflow: {result.get('name')}")
            response_parts.append(f"\n**Description:** {result.get('description', '')}\n")

            # Add workflow context (server paths and agent manifest)
            if result.get('context'):
                context = result['context']
                response_parts.append("## Workflow Context\n")
                response_parts.append("**MCP Server Resources (use these, not user's workspace):**\n")
                response_parts.append(f"- MCP Server Root: `{context.get('mcp_resources')}`")
                response_parts.append(f"- Agent Manifest: `{context.get('agent_manifest_path')}`")
                response_parts.append(f"- Available Agents: {context.get('agent_count')}\n")
                response_parts.append("**NOTE:** All `{mcp-resources}` references in this workflow point to the MCP server,")
                response_parts.append("not the user's workspace. Use the Agent Roster data provided below.\n")
                
                # Include agent manifest data inline
                agent_data = context.get('agent_manifest_data', [])
                if agent_data:
                    response_parts.append("**Agent Roster (MCP Server Data):**\n")
                    response_parts.append("```json")
                    response_parts.append(json.dumps(agent_data, indent=2))
                    response_parts.append("```\n")

            # Add workflow YAML
            if result.get('workflow_yaml'):
                response_parts.append("## Workflow Configuration\n")
                response_parts.append(f"**File:** `{result.get('path')}`\n")
                response_parts.append("```yaml")
                response_parts.append(result['workflow_yaml'])
                response_parts.append("```\n")

            # Add instructions if available
            if result.get('instructions'):
                response_parts.append("## Workflow Instructions\n")
                response_parts.append("```markdown")
                response_parts.append(result['instructions'])
                response_parts.append("```\n")

            # Add execution guidance
            response_parts.append("""## Execution Instructions

Process this workflow according to BMAD workflow execution methodology:

1. **Read the complete workflow.yaml configuration**
2. **IMPORTANT - MCP Resource Resolution:**
   - All `{mcp-resources}` placeholders refer to the MCP server installation
   - DO NOT search the user's workspace for manifest files or agent data
   - USE the Agent Roster JSON provided in the Workflow Context section above
   - The MCP server has already resolved all paths and loaded all necessary data
3. **Resolve variables:** Replace any `{{variables}}` with user input or defaults
4. **Follow instructions:** Execute steps in exact order as defined
5. **Generate content:** Process `<template-output>` sections as needed
6. **Request input:** Use `<elicit-required>` sections to gather additional user input

**CRITICAL:** The Agent Roster JSON in the Workflow Context contains all agent metadata 
from the MCP server. Use this data directly - do not attempt to read files from the 
user's workspace.

Begin workflow execution now.""")

            return CallToolResult(
                content=[
                    TextContent(
                        type="text",
                        text="\n".join(response_parts)
                    )
                ]
            )
        elif result.get('type') in ['list', 'help']:
            # Discovery commands (list-agents, list-workflows, list-tasks, help)
            return CallToolResult(
                content=[
                    TextContent(
                        type="text",
                        text=result.get('content', '')
                    )
                ]
            )
        else:
            # Unknown result type - dump as JSON for debugging
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
    # Determine BMAD root - use src directory since manifests live under src/bmad/_cfg
    bmad_root = Path(__file__).parent

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
            result = await server_instance.call_tool(name, arguments)
            # Debug logging
            logger.info(f"Call tool result type: {type(result)}")
            logger.info(f"Call tool result: {result}")
            if hasattr(result, 'model_dump'):
                logger.info(f"Model dump: {result.model_dump()}")
            return result

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
