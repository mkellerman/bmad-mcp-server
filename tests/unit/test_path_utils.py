"""
Tests for centralized path utilities.

Validates that path resolution works consistently.
"""

import pytest
from pathlib import Path
from src.utils.paths import (
    get_project_root,
    get_bmad_root,
    get_manifest_dir,
    get_test_project_root
)


class TestPathUtilities:
    """Test centralized path resolution utilities."""
    
    def test_get_project_root(self):
        """Test that get_project_root returns src/ directory."""
        project_root = get_project_root()
        
        assert project_root.exists()
        assert project_root.name == "src"
        assert (project_root / "bmad").exists()
    
    def test_get_bmad_root(self):
        """Test that get_bmad_root returns src/bmad/ directory."""
        bmad_root = get_bmad_root()
        
        assert bmad_root.exists()
        assert bmad_root.name == "bmad"
        assert (bmad_root / "_cfg").exists()
    
    def test_get_manifest_dir(self):
        """Test that get_manifest_dir returns src/bmad/_cfg/ directory."""
        manifest_dir = get_manifest_dir()
        
        assert manifest_dir.exists()
        assert manifest_dir.name == "_cfg"
        assert (manifest_dir / "agent-manifest.csv").exists()
        assert (manifest_dir / "workflow-manifest.csv").exists()
    
    def test_get_test_project_root(self):
        """Test that get_test_project_root returns src/ directory."""
        test_root = get_test_project_root()
        
        assert test_root.exists()
        assert test_root.name == "src"
        assert (test_root / "bmad" / "_cfg").exists()
    
    def test_paths_are_resolved(self):
        """Test that all paths are resolved (absolute)."""
        project_root = get_project_root()
        bmad_root = get_bmad_root()
        manifest_dir = get_manifest_dir()
        
        assert project_root.is_absolute()
        assert bmad_root.is_absolute()
        assert manifest_dir.is_absolute()
    
    def test_path_relationships(self):
        """Test that paths have correct relationships."""
        project_root = get_project_root()
        bmad_root = get_bmad_root()
        manifest_dir = get_manifest_dir()
        
        assert bmad_root.parent == project_root
        assert manifest_dir.parent == bmad_root
        assert manifest_dir == project_root / "bmad" / "_cfg"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
