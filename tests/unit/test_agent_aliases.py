"""
Tests for agent name aliasing feature.

Validates that common aliases like "master" resolve to canonical names.
"""

import pytest
from pathlib import Path
from src.unified_tool import UnifiedBMADTool


class TestAgentAliases:
    """Test agent name alias resolution."""
    
    @pytest.fixture
    def unified_tool(self):
        """Create unified tool instance."""
        return UnifiedBMADTool(Path(__file__).parent.parent.parent / "src")
    
    def test_master_alias_resolves(self, unified_tool):
        """Test that 'master' resolves to 'bmad-master'."""
        canonical = unified_tool._resolve_agent_alias("master")
        assert canonical == "bmad-master"
    
    def test_canonical_name_unchanged(self, unified_tool):
        """Test that canonical names pass through unchanged."""
        canonical = unified_tool._resolve_agent_alias("bmad-master")
        assert canonical == "bmad-master"
    
    def test_unknown_alias_unchanged(self, unified_tool):
        """Test that unknown aliases pass through unchanged."""
        canonical = unified_tool._resolve_agent_alias("unknown-agent")
        assert canonical == "unknown-agent"
    
    @pytest.mark.asyncio
    async def test_load_agent_with_master_alias(self, unified_tool):
        """Test loading agent using 'master' alias."""
        result = await unified_tool.execute("master")
        
        assert result.get('success') == True
        assert result.get('type') == 'agent'
        assert result.get('agent_name') == 'bmad-master'
        assert 'BMad Master' in result.get('content', '')
    
    @pytest.mark.asyncio
    async def test_load_agent_with_canonical_name(self, unified_tool):
        """Test loading agent using canonical name still works."""
        result = await unified_tool.execute("bmad-master")
        
        assert result.get('success') == True
        assert result.get('type') == 'agent'
        assert result.get('agent_name') == 'bmad-master'
    
    def test_is_agent_name_with_alias(self, unified_tool):
        """Test that _is_agent_name recognizes aliases."""
        assert unified_tool._is_agent_name("master") == True
        assert unified_tool._is_agent_name("bmad-master") == True
    
    def test_validation_accepts_alias(self, unified_tool):
        """Test that validation accepts aliases."""
        validation = unified_tool._validate_name("master", "agent")
        assert validation.valid == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
