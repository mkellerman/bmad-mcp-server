"""
Unit tests for FileReader.

Tests secure file reading, path validation, and security boundaries.
"""

import tempfile
from pathlib import Path

import pytest

from src.utils.file_reader import FileReader, FileReadError, PathTraversalError


class TestFileReader:
    """Test suite for FileReader class."""
    
    @pytest.fixture
    def temp_bmad_root(self):
        """Create temporary BMAD directory structure with test files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            bmad_root = Path(tmpdir)
            
            # Create subdirectories
            (bmad_root / "core").mkdir()
            (bmad_root / "bmm").mkdir()
            
            # Create test files
            (bmad_root / "config.yaml").write_text("test: value")
            (bmad_root / "core" / "agent.md").write_text("# Agent\n\nContent here")
            (bmad_root / "bmm" / "workflow.yaml").write_text("steps:\n  - step1")
            
            yield bmad_root
    
    def test_init_valid_directory(self, temp_bmad_root):
        """Test initialization with valid BMAD directory."""
        reader = FileReader(temp_bmad_root)
        assert reader.bmad_root == temp_bmad_root.resolve()
    
    def test_init_missing_directory(self, tmp_path):
        """Test initialization with missing directory."""
        missing_dir = tmp_path / "nonexistent"
        reader = FileReader(missing_dir)
        # Should not crash, just log warning
        assert reader.bmad_root == missing_dir.resolve()
    
    def test_read_file_absolute_path(self, temp_bmad_root):
        """Test reading file with absolute path."""
        reader = FileReader(temp_bmad_root)
        config_path = temp_bmad_root / "config.yaml"
        
        content = reader.read_file(str(config_path))
        assert content == "test: value"
    
    def test_read_file_relative_path(self, temp_bmad_root):
        """Test reading file with relative path."""
        reader = FileReader(temp_bmad_root)
        
        content = reader.read_file("core/agent.md")
        assert "# Agent" in content
        assert "Content here" in content
    
    def test_read_file_nested_path(self, temp_bmad_root):
        """Test reading file in nested directory."""
        reader = FileReader(temp_bmad_root)
        
        content = reader.read_file("bmm/workflow.yaml")
        assert "steps:" in content
    
    def test_read_file_not_found(self, temp_bmad_root):
        """Test reading non-existent file."""
        reader = FileReader(temp_bmad_root)
        
        with pytest.raises(FileReadError, match="File not found"):
            reader.read_file("nonexistent.txt")
    
    def test_read_file_path_traversal_relative(self, temp_bmad_root):
        """Test path traversal prevention with relative paths."""
        reader = FileReader(temp_bmad_root)
        
        # Try to escape using ../..
        with pytest.raises(PathTraversalError, match="Path traversal attempt"):
            reader.read_file("../../etc/passwd")
    
    def test_read_file_path_traversal_absolute(self, temp_bmad_root):
        """Test path traversal prevention with absolute paths outside root."""
        reader = FileReader(temp_bmad_root)
        
        # Try to read file outside BMAD root
        with pytest.raises(PathTraversalError, match="outside BMAD root"):
            reader.read_file("/etc/passwd")
    
    def test_read_file_symlink_outside_root(self, temp_bmad_root):
        """Test that symlinks to files outside root are blocked."""
        reader = FileReader(temp_bmad_root)
        
        # Create a symlink to a file outside the root
        outside_file = temp_bmad_root.parent / "outside.txt"
        outside_file.write_text("outside content")
        
        symlink = temp_bmad_root / "link_to_outside"
        try:
            symlink.symlink_to(outside_file)
            
            # Reading through symlink should fail
            with pytest.raises(PathTraversalError, match="outside BMAD root"):
                reader.read_file("link_to_outside")
        finally:
            if symlink.exists():
                symlink.unlink()
            if outside_file.exists():
                outside_file.unlink()
    
    def test_file_exists_valid(self, temp_bmad_root):
        """Test file_exists with valid file."""
        reader = FileReader(temp_bmad_root)
        
        assert reader.file_exists("config.yaml") is True
        assert reader.file_exists("core/agent.md") is True
    
    def test_file_exists_missing(self, temp_bmad_root):
        """Test file_exists with missing file."""
        reader = FileReader(temp_bmad_root)
        
        assert reader.file_exists("nonexistent.txt") is False
    
    def test_file_exists_directory(self, temp_bmad_root):
        """Test file_exists returns False for directories."""
        reader = FileReader(temp_bmad_root)
        
        # Directory exists but is not a file
        assert reader.file_exists("core") is False
    
    def test_file_exists_path_traversal(self, temp_bmad_root):
        """Test file_exists returns False for paths outside root."""
        reader = FileReader(temp_bmad_root)
        
        assert reader.file_exists("../../etc/passwd") is False
        assert reader.file_exists("/etc/passwd") is False
    
    def test_resolve_path_relative(self, temp_bmad_root):
        """Test _resolve_path with relative path."""
        reader = FileReader(temp_bmad_root)
        
        resolved = reader._resolve_path("core/agent.md")
        expected = (temp_bmad_root / "core" / "agent.md").resolve()
        assert resolved == expected
    
    def test_resolve_path_absolute(self, temp_bmad_root):
        """Test _resolve_path with absolute path."""
        reader = FileReader(temp_bmad_root)
        
        abs_path = temp_bmad_root / "config.yaml"
        resolved = reader._resolve_path(str(abs_path))
        assert resolved == abs_path.resolve()
    
    def test_validate_path_inside_root(self, temp_bmad_root):
        """Test _validate_path with path inside root."""
        reader = FileReader(temp_bmad_root)
        
        valid_path = (temp_bmad_root / "config.yaml").resolve()
        # Should not raise exception
        reader._validate_path(valid_path)
    
    def test_validate_path_outside_root(self, temp_bmad_root):
        """Test _validate_path with path outside root."""
        reader = FileReader(temp_bmad_root)
        
        outside_path = temp_bmad_root.parent / "outside.txt"
        with pytest.raises(PathTraversalError, match="outside BMAD root"):
            reader._validate_path(outside_path)
    
    def test_read_file_unicode(self, temp_bmad_root):
        """Test reading file with unicode content."""
        reader = FileReader(temp_bmad_root)
        
        # Create file with unicode content
        unicode_file = temp_bmad_root / "unicode.txt"
        unicode_content = "Hello 世界 🌍 Émojis"
        unicode_file.write_text(unicode_content, encoding="utf-8")
        
        content = reader.read_file("unicode.txt")
        assert content == unicode_content
    
    def test_read_large_file(self, temp_bmad_root):
        """Test reading larger file."""
        reader = FileReader(temp_bmad_root)
        
        # Create a larger file (10KB)
        large_content = "Line of text\n" * 1000
        large_file = temp_bmad_root / "large.txt"
        large_file.write_text(large_content)
        
        content = reader.read_file("large.txt")
        assert len(content) == len(large_content)
        assert content == large_content
