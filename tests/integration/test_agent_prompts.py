"""
Integration tests for agent prompt loading (TDD for Story 1.4/1.5).

These tests are written BEFORE implementation (TDD red phase).
Tests define expected behavior for agent prompt loading functionality.

Story T2.1 from user-stories-testing.md
"""

import pytest
import json
from pathlib import Path

from src.mcp_server import BMADMCPServer


@pytest.mark.integration
class TestAgentPromptLoading:
    """Test agent prompt loading functionality using TDD approach."""
    
    @pytest.fixture
    def real_bmad_root(self):
        """Path to actual BMAD installation."""
        return Path(__file__).parent.parent.parent / "bmad"
    
    @pytest.fixture
    def mcp_server(self, real_bmad_root):
        """Create MCP server with real BMAD installation."""
        return BMADMCPServer(real_bmad_root)
    
    @pytest.mark.asyncio
    async def test_list_prompts_returns_all_agents(self, mcp_server):
        """Test that all agents from manifest are listed as prompts."""
        prompts = await mcp_server.list_prompts()
        
        # Should have all agents from manifest (11 total in real BMAD)
        assert len(prompts) >= 10, f"Expected at least 10 agents, got {len(prompts)}"
        
        # Get agent names
        agent_names = [p.name for p in prompts]
        
        # Check for key agents
        assert "bmad-analyst" in agent_names or "analyst" in agent_names
        assert "bmad-architect" in agent_names or "architect" in agent_names
        assert "bmad-dev" in agent_names or "dev" in agent_names
        assert "bmad-pm" in agent_names or "pm" in agent_names
        assert "bmad-tea" in agent_names or "tea" in agent_names
    
    @pytest.mark.asyncio
    async def test_list_prompts_includes_descriptions(self, mcp_server):
        """Test that prompts include agent descriptions."""
        prompts = await mcp_server.list_prompts()
        
        assert len(prompts) > 0, "No prompts returned"
        
        # Each prompt should have a description
        for prompt in prompts:
            assert hasattr(prompt, 'description'), f"Prompt {prompt.name} missing description"
            assert len(prompt.description) > 0, f"Prompt {prompt.name} has empty description"
    
    @pytest.mark.asyncio
    async def test_get_prompt_loads_analyst_agent(self, mcp_server):
        """Test loading analyst agent prompt."""
        # Try both naming conventions
        for name in ["bmad-analyst", "analyst"]:
            try:
                result = await mcp_server.get_prompt(name, {})
                break
            except:
                continue
        
        # Should have a description
        assert "analyst" in result.description.lower() or "mary" in result.description.lower()
        
        # Should have messages
        assert len(result.messages) > 0
        
        # First message should contain agent content
        content = result.messages[0].content.text
        assert len(content) > 100, "Agent content too short"
        
        # Should not be placeholder
        assert "placeholder" not in content.lower()
        assert "not yet implemented" not in content.lower()
    
    @pytest.mark.asyncio
    async def test_get_prompt_includes_raw_markdown(self, mcp_server):
        """Test prompt includes raw agent markdown content."""
        result = await mcp_server.get_prompt("bmad-analyst", {})
        content = result.messages[0].content.text
        
        # Should contain markdown section with file path
        assert "analyst.md" in content or "agent" in content.lower()
        
        # Should have markdown code blocks
        assert "```" in content or "markdown" in content.lower()
    
    @pytest.mark.asyncio
    async def test_get_prompt_includes_raw_yaml(self, mcp_server):
        """Test prompt includes raw customization YAML if available."""
        result = await mcp_server.get_prompt("bmad-analyst", {})
        content = result.messages[0].content.text
        
        # Should attempt to include YAML customization
        # May include "File not found" if customization doesn't exist
        # But should at least reference the customization file path
        assert "yaml" in content.lower() or "customize" in content.lower() or "config" in content.lower()
    
    @pytest.mark.asyncio
    async def test_get_prompt_includes_processing_instructions(self, mcp_server):
        """Test prompt includes BMAD processing instructions."""
        result = await mcp_server.get_prompt("bmad-analyst", {})
        content = result.messages[0].content.text
        
        # Should include instructions for how to use the agent
        assert "bmad" in content.lower() or "instructions" in content.lower() or "process" in content.lower()
    
    @pytest.mark.asyncio
    async def test_get_prompt_includes_available_tools(self, mcp_server):
        """Test prompt lists available MCP tools."""
        result = await mcp_server.get_prompt("bmad-analyst", {})
        content = result.messages[0].content.text
        
        # Should mention tools or workflows
        assert "tool" in content.lower() or "workflow" in content.lower() or "available" in content.lower()
    
    @pytest.mark.asyncio
    async def test_get_prompt_handles_missing_agent(self, mcp_server):
        """Test handling of non-existent agent."""
        result = await mcp_server.get_prompt("bmad-nonexistent", {})
        content = result.messages[0].content.text
        
        # Should return error message
        assert "not found" in content.lower() or "error" in content.lower() or "unknown" in content.lower()
    
    @pytest.mark.asyncio
    async def test_get_prompt_handles_missing_customization(self, mcp_server):
        """Test graceful handling when customization YAML is missing."""
        # Test with any agent
        result = await mcp_server.get_prompt("bmad-analyst", {})
        
        # Should not crash
        assert result is not None
        assert len(result.messages) > 0
        
        # Content should indicate if customization is missing or include it
        content = result.messages[0].content.text
        assert len(content) > 0
    
    @pytest.mark.asyncio
    async def test_get_prompt_with_multiple_agents(self, mcp_server):
        """Test loading different agents returns different content."""
        # Load two different agents
        analyst_result = await mcp_server.get_prompt("bmad-analyst", {})
        architect_result = await mcp_server.get_prompt("bmad-architect", {})
        
        analyst_content = analyst_result.messages[0].content.text
        architect_content = architect_result.messages[0].content.text
        
        # Content should be different
        assert analyst_content != architect_content
        
        # Each should contain their respective agent name or role
        assert "analyst" in analyst_content.lower() or "mary" in analyst_content.lower()
        assert "architect" in architect_content.lower() or "winston" in architect_content.lower()
    
    @pytest.mark.asyncio
    async def test_prompt_structure_matches_mcp_spec(self, mcp_server):
        """Test that prompt structure matches MCP specification."""
        prompts = await mcp_server.list_prompts()
        
        # Check first prompt structure
        if len(prompts) > 0:
            prompt = prompts[0]
            
            # Should have required fields
            assert hasattr(prompt, 'name')
            assert hasattr(prompt, 'description')
            
            # Name should be string
            assert isinstance(prompt.name, str)
            assert len(prompt.name) > 0
            
            # Description should be string
            assert isinstance(prompt.description, str)
    
    @pytest.mark.asyncio
    async def test_get_prompt_result_structure_matches_mcp_spec(self, mcp_server):
        """Test that GetPromptResult structure matches MCP specification."""
        result = await mcp_server.get_prompt("bmad-analyst", {})
        
        # Should have required fields
        assert hasattr(result, 'description')
        assert hasattr(result, 'messages')
        
        # Messages should be list
        assert isinstance(result.messages, list)
        assert len(result.messages) > 0
        
        # First message should have role and content
        message = result.messages[0]
        assert hasattr(message, 'role')
        assert hasattr(message, 'content')
        
        # Content should have text
        assert hasattr(message.content, 'text')
        assert isinstance(message.content.text, str)
