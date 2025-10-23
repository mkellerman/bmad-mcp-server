"""
Integration tests for MCP prompts using GitHub Copilot.

Tests that Copilot can correctly interact with BMAD MCP prompts,
selecting appropriate tools and interpreting results.
"""

import sys
from pathlib import Path

import pytest

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from mcp_server import BMADMCPServer
from tests.utils.copilot_tester import CopilotMCPTester, skip_if_no_litellm


@pytest.mark.integration
@skip_if_no_litellm()
class TestMCPPromptsWithCopilot:
    """Test MCP prompts using GitHub Copilot for realistic interactions."""
    
    @pytest.fixture
    def bmad_root(self):
        """Path to BMAD installation."""
        return Path(__file__).parent.parent.parent / "bmad"
    
    @pytest.fixture
    async def mcp_server(self, bmad_root):
        """Initialize BMAD MCP Server."""
        return BMADMCPServer(bmad_root)
    
    @pytest.fixture
    def copilot_tester(self):
        """Initialize Copilot MCP Tester."""
        return CopilotMCPTester()
    
    @pytest.fixture
    def tool_schemas(self):
        """Define JSON schemas for MCP tools."""
        return {
            "list_tools": {
                "args": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": False,
                },
                "result": {
                    "type": "object",
                    "properties": {
                        "tools": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "description": {"type": "string"},
                                },
                                "required": ["name", "description"],
                            },
                        },
                    },
                    "required": ["tools"],
                },
            },
            "list_prompts": {
                "args": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": False,
                },
                "result": {
                    "type": "object",
                    "properties": {
                        "prompts": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "description": {"type": "string"},
                                },
                                "required": ["name", "description"],
                            },
                        },
                    },
                    "required": ["prompts"],
                },
            },
        }
    
    @pytest.mark.asyncio
    async def test_copilot_selects_list_tools(
        self,
        copilot_tester,
        mcp_server,
        tool_schemas
    ):
        """
        Test that Copilot correctly selects list_tools for appropriate task.
        
        Verifies:
        - Copilot selects correct tool
        - Arguments are valid
        - Tool executes successfully
        - Result matches schema
        """
        # Phase 1: Ask Copilot to select tool
        selection = await copilot_tester.ask_tool_selection(
            task="List all available BMAD tools from the MCP server.",
            available_tools=["list_tools", "list_prompts", "list_resources"]
        )
        
        # Verify Copilot selected correct tool
        assert selection["tool"] == "list_tools", \
            f"Expected 'list_tools', got '{selection['tool']}'"
        
        assert selection["confidence"] >= 0.8, \
            f"Low confidence: {selection['confidence']}"
        
        # Phase 2: Validate arguments
        copilot_tester.validate_tool_args(
            selection["args"],
            tool_schemas["list_tools"]["args"]
        )
        
        # Phase 3: Execute tool
        tools = await mcp_server.list_tools()
        result = {
            "tools": [
                {"name": t.name, "description": t.description}
                for t in tools
            ]
        }
        
        # Phase 4: Validate result
        copilot_tester.validate_tool_result(
            result,
            tool_schemas["list_tools"]["result"]
        )
    
    @pytest.mark.asyncio
    async def test_copilot_selects_list_prompts(
        self,
        copilot_tester,
        mcp_server,
        tool_schemas
    ):
        """
        Test that Copilot selects list_prompts for agent-related tasks.
        
        Verifies:
        - Copilot selects correct tool for prompt/agent queries
        - Tool execution works
        - Result is valid
        """
        selection = await copilot_tester.ask_tool_selection(
            task="Show me all available BMAD agent prompts.",
            available_tools=["list_tools", "list_prompts", "list_resources"]
        )
        
        assert selection["tool"] == "list_prompts", \
            f"Expected 'list_prompts', got '{selection['tool']}'"
        
        # Validate and execute
        copilot_tester.validate_tool_args(
            selection["args"],
            tool_schemas["list_prompts"]["args"]
        )
        
        prompts = await mcp_server.list_prompts()
        result = {
            "prompts": [
                {"name": p.name, "description": p.description}
                for p in prompts
            ]
        }
        
        copilot_tester.validate_tool_result(
            result,
            tool_schemas["list_prompts"]["result"]
        )
    
    @pytest.mark.asyncio
    async def test_copilot_interprets_empty_results(
        self,
        copilot_tester,
        mcp_server
    ):
        """
        Test that Copilot can interpret empty results appropriately.
        
        This is important for placeholder implementations where
        tools return empty lists.
        """
        task = "List all available BMAD tools."
        
        # Get empty result (placeholder implementation)
        tools = await mcp_server.list_tools()
        result = {
            "tools": [
                {"name": t.name, "description": t.description}
                for t in tools
            ]
        }
        
        # Ask Copilot to interpret
        interpretation = await copilot_tester.interpret_result(
            task=task,
            tool_result=result
        )
        
        # Verify interpretation contains expected fields
        assert "satisfied" in interpretation
        assert "next_action" in interpretation
        assert interpretation["next_action"] in [
            "answer_user",
            "call_tool_again",
            "ask_clarifying_question"
        ]
    
    @pytest.mark.asyncio
    async def test_full_copilot_mcp_workflow(
        self,
        copilot_tester,
        mcp_server,
        tool_schemas
    ):
        """
        Test complete workflow: selection -> execution -> interpretation.
        
        This is the end-to-end test simulating real Copilot+MCP interaction.
        """
        task = "List all available BMAD tools from the MCP server."
        
        # Phase 1: Tool selection
        selection = await copilot_tester.ask_tool_selection(
            task=task,
            available_tools=["list_tools", "list_prompts", "list_resources"]
        )
        
        assert selection["tool"] in tool_schemas
        
        # Phase 2: Validate arguments
        copilot_tester.validate_tool_args(
            selection["args"],
            tool_schemas[selection["tool"]]["args"]
        )
        
        # Phase 3: Execute tool
        if selection["tool"] == "list_tools":
            tools = await mcp_server.list_tools()
            result = {
                "tools": [
                    {"name": t.name, "description": t.description}
                    for t in tools
                ]
            }
        elif selection["tool"] == "list_prompts":
            prompts = await mcp_server.list_prompts()
            result = {
                "prompts": [
                    {"name": p.name, "description": p.description}
                    for p in prompts
                ]
            }
        else:
            pytest.fail(f"Unexpected tool: {selection['tool']}")
        
        # Phase 4: Validate result
        copilot_tester.validate_tool_result(
            result,
            tool_schemas[selection["tool"]]["result"]
        )
        
        # Phase 5: Interpret result
        interpretation = await copilot_tester.interpret_result(
            task=task,
            tool_result=result,
            conversation_history=[
                {"role": "user", "content": task},
                {"role": "assistant", "content": selection["raw_response"]}
            ]
        )
        
        # Verify interpretation is valid
        assert isinstance(interpretation, dict)
        assert "next_action" in interpretation
