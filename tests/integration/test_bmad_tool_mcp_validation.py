"""
Integration test for BMAD unified tool MCP response validation.

This test validates that the bmad tool returns responses that conform
to the MCP CallToolResult schema.
"""

import pytest
from pathlib import Path
from pydantic import ValidationError

from src.mcp_server import BMADMCPServer
from mcp.types import CallToolResult, TextContent


@pytest.mark.integration
class TestBMADToolMCPValidation:
    """Test that bmad tool responses conform to MCP schema."""

    @pytest.fixture
    def real_bmad_root(self):
        """Path to actual BMAD installation (src/bmad)."""
        return Path(__file__).parent.parent.parent / "src" / "bmad"

    @pytest.fixture
    def mcp_server(self, real_bmad_root):
        """Create MCP server with real BMAD installation."""
        return BMADMCPServer(real_bmad_root)

    @pytest.mark.asyncio
    async def test_bmad_tool_empty_command_returns_valid_mcp_response(self, mcp_server):
        """Test empty command returns valid CallToolResult."""
        result = await mcp_server.call_tool("bmad", {"command": ""})

        # Should be a CallToolResult instance
        assert isinstance(result, CallToolResult), f"Expected CallToolResult, got {type(result)}"

        # Should have content list
        assert hasattr(result, 'content'), "CallToolResult missing 'content' attribute"
        assert isinstance(result.content, list), f"Expected list, got {type(result.content)}"
        assert len(result.content) > 0, "Content list is empty"

        # Each content item should be TextContent
        for i, content_item in enumerate(result.content):
            assert isinstance(content_item, TextContent), \
                f"Content item {i} is {type(content_item)}, expected TextContent. Value: {content_item}"
            assert hasattr(content_item, 'type'), f"Content item {i} missing 'type' attribute"
            assert content_item.type == "text", f"Content item {i} type is '{content_item.type}', expected 'text'"
            assert hasattr(content_item, 'text'), f"Content item {i} missing 'text' attribute"
            assert isinstance(content_item.text, str), f"Content item {i} text is {type(content_item.text)}, expected str"

    @pytest.mark.asyncio
    async def test_bmad_tool_agent_load_returns_valid_mcp_response(self, mcp_server):
        """Test loading agent returns valid CallToolResult."""
        result = await mcp_server.call_tool("bmad", {"command": "analyst"})

        # Should be a CallToolResult instance
        assert isinstance(result, CallToolResult), f"Expected CallToolResult, got {type(result)}"

        # Validate content structure
        assert hasattr(result, 'content'), "CallToolResult missing 'content' attribute"
        assert isinstance(result.content, list), f"Expected list, got {type(result.content)}"
        assert len(result.content) > 0, "Content list is empty"

        # Validate each content item
        for i, content_item in enumerate(result.content):
            assert isinstance(content_item, TextContent), \
                f"Content item {i} is {type(content_item)}, expected TextContent. Value: {content_item}"
            assert hasattr(content_item, 'type'), f"Content item {i} missing 'type' attribute"
            assert content_item.type == "text", f"Content item {i} type is '{content_item.type}', expected 'text'"
            assert hasattr(content_item, 'text'), f"Content item {i} missing 'text' attribute"
            assert isinstance(content_item.text, str), f"Content item {i} text is {type(content_item.text)}, expected str"
            assert len(content_item.text) > 0, f"Content item {i} text is empty"

    @pytest.mark.asyncio
    async def test_bmad_tool_workflow_execution_returns_valid_mcp_response(self, mcp_server):
        """Test workflow execution returns valid CallToolResult."""
        # Get first workflow name
        workflows = mcp_server.workflows
        if len(workflows) == 0:
            pytest.skip("No workflows available for testing")

        workflow_name = workflows[0].get('name', 'party-mode')
        result = await mcp_server.call_tool("bmad", {"command": f"*{workflow_name}"})

        # Should be a CallToolResult instance
        assert isinstance(result, CallToolResult), f"Expected CallToolResult, got {type(result)}"

        # Validate content structure
        assert hasattr(result, 'content'), "CallToolResult missing 'content' attribute"
        assert isinstance(result.content, list), f"Expected list, got {type(result.content)}"
        assert len(result.content) > 0, "Content list is empty"

        # Validate each content item
        for i, content_item in enumerate(result.content):
            assert isinstance(content_item, TextContent), \
                f"Content item {i} is {type(content_item)}, expected TextContent. Value: {content_item}"

    @pytest.mark.asyncio
    async def test_bmad_tool_error_response_returns_valid_mcp_response(self, mcp_server):
        """Test error response returns valid CallToolResult with isError=True."""
        result = await mcp_server.call_tool("bmad", {"command": "nonexistent-agent"})

        # Should be a CallToolResult instance
        assert isinstance(result, CallToolResult), f"Expected CallToolResult, got {type(result)}"

        # Should be marked as error
        assert hasattr(result, 'isError'), "CallToolResult missing 'isError' attribute"
        assert result.isError == True, "Expected isError=True for invalid agent"

        # Validate content structure
        assert hasattr(result, 'content'), "CallToolResult missing 'content' attribute"
        assert isinstance(result.content, list), f"Expected list, got {type(result.content)}"
        assert len(result.content) > 0, "Content list is empty"

        # Validate each content item
        for i, content_item in enumerate(result.content):
            assert isinstance(content_item, TextContent), \
                f"Content item {i} is {type(content_item)}, expected TextContent. Value: {content_item}"

    @pytest.mark.asyncio
    async def test_bmad_tool_response_serializable_to_json(self, mcp_server):
        """Test that response can be serialized (for MCP protocol)."""
        result = await mcp_server.call_tool("bmad", {"command": ""})

        # Should be able to convert to dict (for JSON serialization)
        try:
            result_dict = result.model_dump()
            assert isinstance(result_dict, dict), "model_dump() should return dict"
            assert 'content' in result_dict, "Serialized result missing 'content'"
        except Exception as e:
            pytest.fail(f"Failed to serialize CallToolResult: {e}")

    @pytest.mark.asyncio
    async def test_bmad_tool_validates_against_mcp_schema(self, mcp_server):
        """Test that response validates against Pydantic MCP schema."""
        result = await mcp_server.call_tool("bmad", {"command": ""})

        # Try to re-validate using Pydantic
        try:
            # This will raise ValidationError if schema doesn't match
            validated = CallToolResult.model_validate(result.model_dump())
            assert validated is not None
        except ValidationError as e:
            pytest.fail(f"CallToolResult failed MCP schema validation: {e}")

    @pytest.mark.asyncio
    async def test_bmad_tool_content_items_not_tuples(self, mcp_server):
        """Test that content items are not tuples (common bug)."""
        result = await mcp_server.call_tool("bmad", {"command": ""})

        # Check each content item
        for i, content_item in enumerate(result.content):
            # Should NOT be a tuple
            assert not isinstance(content_item, tuple), \
                f"Content item {i} is a tuple: {content_item}. Expected TextContent object."

            # Should be TextContent
            assert isinstance(content_item, TextContent), \
                f"Content item {i} is {type(content_item)}, expected TextContent"
