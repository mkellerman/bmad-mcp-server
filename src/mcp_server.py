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
        
        manifest_dir = self.bmad_root / "_cfg"
        if not manifest_dir.exists():
            raise ValueError(f"BMAD manifest directory not found: {manifest_dir}")
        
        logger.info("BMAD MCP Server initialized successfully")
    
    async def list_prompts(self) -> list[Prompt]:
        """
        List available BMAD agent prompts.
        
        Returns:
            List of prompt definitions for BMAD agents
        """
        logger.info("list_prompts called - placeholder implementation")
        # TODO: Implement in Story 1.4/1.5
        return []
    
    async def get_prompt(self, name: str, arguments: dict[str, Any]) -> GetPromptResult:
        """
        Get a specific BMAD agent prompt.
        
        Args:
            name: Prompt name (e.g., "bmad-analyst")
            arguments: Optional arguments for prompt customization
            
        Returns:
            Prompt result containing agent files and instructions
        """
        logger.info(f"get_prompt called for: {name} - placeholder implementation")
        # TODO: Implement in Story 1.4/1.5
        return GetPromptResult(
            description=f"BMAD Agent: {name}",
            messages=[
                PromptMessage(
                    role="user",
                    content=TextContent(
                        type="text",
                        text="[Placeholder - agent loading not yet implemented]"
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
        logger.info("list_tools called - placeholder implementation")
        # TODO: Implement in Story 2.1
        return []
    
    async def call_tool(self, name: str, arguments: dict[str, Any]) -> CallToolResult:
        """
        Execute a BMAD tool (workflow, task, etc.).
        
        Args:
            name: Tool name (e.g., "list_workflows", "execute_workflow")
            arguments: Tool-specific arguments
            
        Returns:
            Tool execution result
        """
        logger.info(f"call_tool called: {name} - placeholder implementation")
        # TODO: Implement in Story 2.3, 3.2, 4.1, 4.2
        return CallToolResult(
            content=[
                TextContent(
                    type="text",
                    text=f"[Placeholder - tool '{name}' not yet implemented]"
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
    # Determine BMAD root - default to ./bmad relative to current directory
    bmad_root = Path(__file__).parent.parent / "bmad"
    
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


if __name__ == "__main__":
    asyncio.run(main())
