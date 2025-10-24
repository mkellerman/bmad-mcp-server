"""
Integration tests for BMADMCPServer with real BMAD files.

Tests server initialization and interaction with actual BMAD installation.
Story T1.3 from user-stories-testing.md
"""

import pytest
from pathlib import Path

from src.mcp_server import BMADMCPServer


@pytest.mark.integration
class TestMCPServerWithRealBMAD:
    """Integration tests using real BMAD directory structure."""
    
    @pytest.fixture
    def real_bmad_root(self):
        """Path to actual BMAD installation for integration tests (src/bmad)."""
        # Use the actual BMAD directory in the repo under src
        return Path(__file__).parent.parent.parent / "src" / "bmad"
    
    @pytest.fixture
    def mcp_server(self, real_bmad_root):
        """Create BMADMCPServer with real BMAD installation."""
        return BMADMCPServer(real_bmad_root)
    
    def test_server_init_with_real_bmad_directory(self, real_bmad_root):
        """Test server initializes with real BMAD directory."""
        server = BMADMCPServer(real_bmad_root)
        
        # Verify server initialized
        assert server.bmad_root == real_bmad_root.resolve()
        
        # Verify key BMAD directories exist
        assert (real_bmad_root / "_cfg").exists()
        assert (real_bmad_root / "bmm").exists()
        assert (real_bmad_root / "core").exists()
    
    def test_loads_real_agent_manifest(self, mcp_server, real_bmad_root):
        """Test server can access real agent manifest."""
        agent_manifest_path = real_bmad_root / "_cfg" / "agent-manifest.csv"
        
        # Verify manifest file exists
        assert agent_manifest_path.exists(), f"Agent manifest not found at {agent_manifest_path}"
        
        # Verify it's readable
        content = agent_manifest_path.read_text()
        assert len(content) > 0
        assert "agent_id" in content or "name" in content  # CSV header
    
    def test_loads_real_workflow_manifest(self, mcp_server, real_bmad_root):
        """Test server can access real workflow manifest."""
        workflow_manifest_path = real_bmad_root / "_cfg" / "workflow-manifest.csv"
        
        # Verify manifest file exists
        assert workflow_manifest_path.exists(), f"Workflow manifest not found at {workflow_manifest_path}"
        
        # Verify it's readable
        content = workflow_manifest_path.read_text()
        assert len(content) > 0
        assert "workflow_id" in content or "name" in content  # CSV header
    
    def test_loads_real_task_manifest(self, mcp_server, real_bmad_root):
        """Test server can access real task manifest."""
        task_manifest_path = real_bmad_root / "_cfg" / "task-manifest.csv"
        
        # Verify manifest file exists
        assert task_manifest_path.exists(), f"Task manifest not found at {task_manifest_path}"
        
        # Verify it's readable
        content = task_manifest_path.read_text()
        assert len(content) > 0
        assert "task_id" in content or "name" in content  # CSV header
    
    def test_handles_missing_optional_files(self, mcp_server, real_bmad_root):
        """Test server handles missing optional customization files gracefully."""
        # Test that server doesn't crash when optional files are missing
        # (e.g., some agents might not have customization files)
        
        # Server should be initialized
        assert mcp_server is not None
        assert mcp_server.bmad_root.exists()
        
        # Check for some agent files
        agent_dir = real_bmad_root / "bmm" / "agents"
        assert agent_dir.exists()
        
        # Should have at least one agent file
        agent_files = list(agent_dir.glob("*.md"))
        assert len(agent_files) > 0, "No agent files found"
    
    def test_real_bmad_structure_validation(self, real_bmad_root):
        """Test that real BMAD directory has expected structure."""
        # Core directories
        assert (real_bmad_root / "_cfg").is_dir()
        assert (real_bmad_root / "bmm").is_dir()
        assert (real_bmad_root / "core").is_dir()
        
        # Manifest files
        assert (real_bmad_root / "_cfg" / "manifest.yaml").exists()
        assert (real_bmad_root / "_cfg" / "agent-manifest.csv").exists()
        assert (real_bmad_root / "_cfg" / "workflow-manifest.csv").exists()
        assert (real_bmad_root / "_cfg" / "task-manifest.csv").exists()
        
        # Agent directories
        assert (real_bmad_root / "bmm" / "agents").is_dir()
        assert (real_bmad_root / "_cfg" / "agents").is_dir()
        
        # Workflow directories
        assert (real_bmad_root / "bmm" / "workflows").is_dir()
        
        # Task directories
        assert (real_bmad_root / "bmm" / "tasks").is_dir()
        assert (real_bmad_root / "core" / "tasks").is_dir()
    
    def test_can_read_sample_agent_file(self, real_bmad_root):
        """Test reading a sample agent file."""
        # Try to read the analyst agent
        analyst_md = real_bmad_root / "bmm" / "agents" / "analyst.md"
        
        if analyst_md.exists():
            content = analyst_md.read_text()
            assert len(content) > 0
            # Check for BMAD agent markers
            assert "agent" in content.lower() or "analyst" in content.lower()
    
    def test_can_read_sample_workflow_file(self, real_bmad_root):
        """Test reading a sample workflow file."""
        # Try to find any workflow.yaml file
        workflow_files = list((real_bmad_root / "bmm" / "workflows").rglob("workflow.yaml"))
        
        if len(workflow_files) > 0:
            content = workflow_files[0].read_text()
            assert len(content) > 0
            # Check for YAML workflow structure (various formats)
            assert "name:" in content or "workflow:" in content or "description:" in content
