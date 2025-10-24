"""
Integration tests for workflow discovery and execution tools (TDD for Story 2.1).

These tests are written BEFORE implementation (TDD red phase).
Tests define expected behavior for workflow tools functionality.

Story T2.2 from user-stories-testing.md
"""

import pytest
import json
from pathlib import Path

from src.mcp_server import BMADMCPServer


@pytest.mark.integration
class TestWorkflowTools:
    """Test workflow tool functionality using TDD approach."""
    
    @pytest.fixture
    def real_bmad_root(self):
        """Path to actual BMAD installation."""
        return Path(__file__).parent.parent.parent / "bmad"
    
    @pytest.fixture
    def mcp_server(self, real_bmad_root):
        """Create MCP server with real BMAD installation."""
        return BMADMCPServer(real_bmad_root)
    
    @pytest.mark.asyncio
    async def test_list_tools_includes_workflow_operations(self, mcp_server):
        """Test that workflow tools are listed."""
        tools = await mcp_server.list_tools()
        tool_names = [t.name for t in tools]
        
        # Should include workflow tools
        assert "list_workflows" in tool_names
        assert "get_workflow_details" in tool_names
        assert "execute_workflow" in tool_names
    
    @pytest.mark.asyncio
    async def test_list_workflows_returns_all_workflows(self, mcp_server):
        """Test listing all workflows."""
        result = await mcp_server.call_tool("list_workflows", {})
        content = result.content[0].text
        data = json.loads(content)
        
        # Should have workflows key
        assert "workflows" in data
        assert isinstance(data["workflows"], list)
        assert len(data["workflows"]) > 0
        
        # Each workflow should have basic metadata
        for wf in data["workflows"]:
            assert "name" in wf
            assert "module" in wf
    
    @pytest.mark.asyncio
    async def test_list_workflows_with_module_filter(self, mcp_server):
        """Test filtering workflows by module."""
        result = await mcp_server.call_tool("list_workflows", {"module": "bmm"})
        content = result.content[0].text
        data = json.loads(content)
        
        # All returned workflows should be from bmm module
        for wf in data["workflows"]:
            assert wf.get("module") == "bmm" or "bmm" in wf.get("path", "")
    
    @pytest.mark.asyncio
    async def test_get_workflow_details_returns_metadata(self, mcp_server):
        """Test getting workflow details."""
        # First list workflows to get a valid name
        list_result = await mcp_server.call_tool("list_workflows", {})
        workflows = json.loads(list_result.content[0].text)["workflows"]
        
        if len(workflows) > 0:
            workflow_name = workflows[0]["name"]
            
            # Get details
            result = await mcp_server.call_tool("get_workflow_details", {"workflow_name": workflow_name})
            content = result.content[0].text
            data = json.loads(content)
            
            # Should have workflow metadata
            assert "name" in data
            assert "description" in data or "path" in data
    
    @pytest.mark.asyncio
    async def test_execute_workflow_loads_yaml(self, mcp_server):
        """Test executing workflow returns raw YAML."""
        # Get a valid workflow name
        list_result = await mcp_server.call_tool("list_workflows", {})
        workflows = json.loads(list_result.content[0].text)["workflows"]
        
        if len(workflows) > 0:
            workflow_name = workflows[0]["name"]
            
            # Execute workflow
            result = await mcp_server.call_tool("execute_workflow", {"workflow_name": workflow_name})
            content = result.content[0].text
            data = json.loads(content)
            
            # Should include workflow YAML
            assert "workflow_yaml" in data or "workflow" in data
            yaml_content = data.get("workflow_yaml", data.get("workflow", ""))
            assert len(yaml_content) > 0
    
    @pytest.mark.asyncio
    async def test_execute_workflow_loads_instructions(self, mcp_server):
        """Test workflow execution includes instructions if available."""
        list_result = await mcp_server.call_tool("list_workflows", {})
        workflows = json.loads(list_result.content[0].text)["workflows"]
        
        if len(workflows) > 0:
            workflow_name = workflows[0]["name"]
            
            result = await mcp_server.call_tool("execute_workflow", {"workflow_name": workflow_name})
            content = result.content[0].text
            data = json.loads(content)
            
            # Should attempt to include instructions (may be None if not found)
            assert "instructions" in data or "workflow_yaml" in data
    
    @pytest.mark.asyncio
    async def test_call_tool_handles_missing_workflow(self, mcp_server):
        """Test handling of non-existent workflow."""
        result = await mcp_server.call_tool("execute_workflow", {"workflow_name": "nonexistent-workflow-12345"})
        content = result.content[0].text
        
        # Should return error message (may be JSON or plain text)
        assert "not found" in content.lower() or "error" in content.lower()
    
    @pytest.mark.asyncio
    async def test_tool_structure_matches_mcp_spec(self, mcp_server):
        """Test that tool structure matches MCP specification."""
        tools = await mcp_server.list_tools()
        
        if len(tools) > 0:
            tool = tools[0]
            
            # Should have required fields
            assert hasattr(tool, 'name')
            assert hasattr(tool, 'description')
            
            # Name should be string
            assert isinstance(tool.name, str)
            assert len(tool.name) > 0
            
            # Description should be string
            assert isinstance(tool.description, str)
    
    @pytest.mark.asyncio
    async def test_workflow_names_are_unique(self, mcp_server):
        """Test that workflow names are unique."""
        result = await mcp_server.call_tool("list_workflows", {})
        content = result.content[0].text
        data = json.loads(content)
        
        workflow_names = [wf["name"] for wf in data["workflows"]]
        
        # All names should be unique
        assert len(workflow_names) == len(set(workflow_names))
    
    @pytest.mark.asyncio
    async def test_execute_workflow_includes_workflow_path(self, mcp_server):
        """Test that execute_workflow returns the workflow path."""
        list_result = await mcp_server.call_tool("list_workflows", {})
        workflows = json.loads(list_result.content[0].text)["workflows"]
        
        if len(workflows) > 0:
            workflow_name = workflows[0]["name"]
            
            result = await mcp_server.call_tool("execute_workflow", {"workflow_name": workflow_name})
            content = result.content[0].text
            data = json.loads(content)
            
            # Should include path information
            assert "path" in data or "workflow_path" in data or "workflow.yaml" in str(data)
