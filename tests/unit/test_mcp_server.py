"""
Unit tests for BMADMCPServer.

Tests initialization logic and placeholder method implementations.
Story T1.1 + T1.2 from user-stories-testing.md
"""

import pytest
from pathlib import Path

from src.mcp_server import BMADMCPServer


class TestBMADMCPServerInit:
    """Test BMADMCPServer initialization."""
    
    @pytest.fixture
    def bmad_root(self, tmp_path):
        """Create minimal BMAD structure."""
        bmad = tmp_path / "bmad"
        (bmad / "_cfg").mkdir(parents=True)
        return bmad
    
    def test_init_valid_bmad_root(self, bmad_root):
        """Test server initializes with valid BMAD root."""
        server = BMADMCPServer(bmad_root)
        assert server.bmad_root == bmad_root.resolve()
    
    def test_init_missing_bmad_root_raises_error(self, tmp_path):
        """Test server raises error when BMAD root missing."""
        missing = tmp_path / "nonexistent"
        with pytest.raises(ValueError, match="does not exist"):
            BMADMCPServer(missing)
    
    def test_init_missing_manifest_dir_raises_error(self, tmp_path):
        """Test server raises error when _cfg directory missing."""
        bmad = tmp_path / "bmad"
        bmad.mkdir()
        with pytest.raises(ValueError, match="manifest directory not found"):
            BMADMCPServer(bmad)
    
    def test_init_resolves_relative_paths(self, tmp_path):
        """Test server resolves relative paths to absolute."""
        bmad = tmp_path / "bmad"
        (bmad / "_cfg").mkdir(parents=True)
        
        # Create server with relative path
        import os
        original_cwd = os.getcwd()
        try:
            os.chdir(tmp_path)
            server = BMADMCPServer(Path("bmad"))
            # Should be resolved to absolute path
            assert server.bmad_root.is_absolute()
            assert server.bmad_root == bmad.resolve()
        finally:
            os.chdir(original_cwd)
    
    def test_init_logs_success_message(self, bmad_root, caplog):
        """Test server logs success message on initialization."""
        import logging
        caplog.set_level(logging.INFO)
        
        server = BMADMCPServer(bmad_root)
        
        # Check that success message was logged
        assert "BMAD MCP Server initialized successfully" in caplog.text
        assert str(bmad_root) in caplog.text


class TestBMADMCPServerPlaceholders:
    """Test placeholder method implementations."""
    
    @pytest.fixture
    def bmad_root(self, tmp_path):
        """Create minimal BMAD structure."""
        bmad = tmp_path / "bmad"
        (bmad / "_cfg").mkdir(parents=True)
        return bmad
    
    @pytest.fixture
    def mcp_server(self, bmad_root):
        """Create BMADMCPServer instance."""
        return BMADMCPServer(bmad_root)
    
    @pytest.mark.asyncio
    async def test_list_prompts_placeholder_returns_empty(self, mcp_server):
        """Test list_prompts returns empty list (placeholder)."""
        prompts = await mcp_server.list_prompts()
        assert prompts == []
        assert isinstance(prompts, list)
    
    @pytest.mark.asyncio
    async def test_get_prompt_placeholder_returns_message(self, mcp_server):
        """Test get_prompt returns placeholder message."""
        result = await mcp_server.get_prompt("bmad-analyst", {})
        
        # Check structure
        assert result.description == "BMAD Agent: bmad-analyst"
        assert len(result.messages) == 1
        
        # Check placeholder content
        message = result.messages[0]
        assert message.role == "user"
        assert "Placeholder" in message.content.text
        assert "not yet implemented" in message.content.text
    
    @pytest.mark.asyncio
    async def test_list_tools_placeholder_returns_empty(self, mcp_server):
        """Test list_tools returns empty list (placeholder)."""
        tools = await mcp_server.list_tools()
        assert tools == []
        assert isinstance(tools, list)
    
    @pytest.mark.asyncio
    async def test_call_tool_placeholder_returns_message(self, mcp_server):
        """Test call_tool returns placeholder message."""
        result = await mcp_server.call_tool("list_workflows", {})
        
        # Check structure
        assert len(result.content) == 1
        assert result.content[0].type == "text"
        
        # Check placeholder content
        text = result.content[0].text
        assert "Placeholder" in text
        assert "not yet implemented" in text
        assert "list_workflows" in text
    
    @pytest.mark.asyncio
    async def test_list_resources_placeholder_returns_empty(self, mcp_server):
        """Test list_resources returns empty list (placeholder)."""
        resources = await mcp_server.list_resources()
        assert resources == []
        assert isinstance(resources, list)
    
    @pytest.mark.asyncio
    async def test_read_resource_placeholder_raises_not_implemented(self, mcp_server):
        """Test read_resource raises NotImplementedError (placeholder)."""
        with pytest.raises(NotImplementedError, match="Resource not implemented"):
            await mcp_server.read_resource("bmad://test")
    
    @pytest.mark.asyncio
    async def test_get_prompt_with_different_names(self, mcp_server):
        """Test get_prompt placeholder works with any name."""
        for agent_name in ["bmad-analyst", "bmad-architect", "bmad-dev"]:
            result = await mcp_server.get_prompt(agent_name, {})
            assert agent_name in result.description
    
    @pytest.mark.asyncio
    async def test_call_tool_with_different_tools(self, mcp_server):
        """Test call_tool placeholder works with any tool name."""
        for tool_name in ["list_workflows", "execute_workflow", "list_tasks"]:
            result = await mcp_server.call_tool(tool_name, {})
            assert tool_name in result.content[0].text
    
    @pytest.mark.asyncio
    async def test_get_prompt_with_arguments(self, mcp_server):
        """Test get_prompt accepts and ignores arguments (placeholder)."""
        result = await mcp_server.get_prompt(
            "bmad-analyst",
            {"user_name": "TestUser", "language": "English"}
        )
        # Placeholder should still work
        assert result.description == "BMAD Agent: bmad-analyst"
    
    @pytest.mark.asyncio
    async def test_call_tool_with_arguments(self, mcp_server):
        """Test call_tool accepts and ignores arguments (placeholder)."""
        result = await mcp_server.call_tool(
            "list_workflows",
            {"category": "analysis", "module": "bmm"}
        )
        # Placeholder should still work
        assert "list_workflows" in result.content[0].text
