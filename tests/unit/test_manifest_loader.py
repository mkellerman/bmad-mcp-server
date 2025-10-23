"""
Unit tests for ManifestLoader.

Tests CSV parsing, error handling, and discovery functionality.
"""

import csv
import tempfile
from pathlib import Path

import pytest

from src.loaders.manifest_loader import ManifestLoader


class TestManifestLoader:
    """Test suite for ManifestLoader class."""
    
    @pytest.fixture
    def temp_bmad_root(self):
        """Create temporary BMAD directory structure."""
        with tempfile.TemporaryDirectory() as tmpdir:
            bmad_root = Path(tmpdir)
            manifest_dir = bmad_root / "_cfg"
            manifest_dir.mkdir()
            yield bmad_root
    
    @pytest.fixture
    def valid_agent_manifest(self, temp_bmad_root):
        """Create valid agent-manifest.csv for testing."""
        manifest_path = temp_bmad_root / "_cfg" / "agent-manifest.csv"
        with open(manifest_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'name', 'displayName', 'title', 'icon', 'role', 'identity',
                'communicationStyle', 'principles', 'module', 'path'
            ])
            writer.writeheader()
            writer.writerow({
                'name': 'analyst',
                'displayName': 'Mary',
                'title': 'Business Analyst',
                'icon': '📊',
                'role': 'Requirements analyst',
                'identity': 'Expert in gathering requirements',
                'communicationStyle': 'Clear and structured',
                'principles': 'User-focused',
                'module': 'bmm',
                'path': '/bmad/bmm/agents/analyst.md'
            })
            writer.writerow({
                'name': 'architect',
                'displayName': 'Winston',
                'title': 'Solution Architect',
                'icon': '🏗️',
                'role': 'Architecture design',
                'identity': 'Expert in system design',
                'communicationStyle': 'Technical and precise',
                'principles': 'Scalability first',
                'module': 'bmm',
                'path': '/bmad/bmm/agents/architect.md'
            })
        return temp_bmad_root
    
    @pytest.fixture
    def valid_workflow_manifest(self, temp_bmad_root):
        """Create valid workflow-manifest.csv for testing."""
        manifest_path = temp_bmad_root / "_cfg" / "workflow-manifest.csv"
        with open(manifest_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'name', 'description', 'module', 'path'
            ])
            writer.writeheader()
            writer.writerow({
                'name': 'brainstorming',
                'description': 'Brainstorm ideas collaboratively',
                'module': 'core',
                'path': '/bmad/core/workflows/brainstorming/workflow.yaml'
            })
            writer.writerow({
                'name': 'party-mode',
                'description': 'Group chat with all agents',
                'module': 'core',
                'path': '/bmad/core/workflows/party-mode/workflow.yaml'
            })
        return temp_bmad_root
    
    @pytest.fixture
    def empty_task_manifest(self, temp_bmad_root):
        """Create empty task-manifest.csv (only header)."""
        manifest_path = temp_bmad_root / "_cfg" / "task-manifest.csv"
        with open(manifest_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'name', 'displayName', 'description', 'module', 'path'
            ])
            writer.writeheader()
        return temp_bmad_root
    
    def test_init_valid_directory(self, temp_bmad_root):
        """Test initialization with valid BMAD directory."""
        loader = ManifestLoader(temp_bmad_root)
        assert loader.bmad_root == temp_bmad_root.resolve()
        assert loader.manifest_dir == temp_bmad_root.resolve() / "_cfg"
    
    def test_init_missing_manifest_directory(self, tmp_path):
        """Test initialization with missing _cfg directory."""
        loader = ManifestLoader(tmp_path)
        assert loader.bmad_root == tmp_path.resolve()
        # Should not raise error, just log warning
    
    def test_load_agent_manifest_valid(self, valid_agent_manifest):
        """Test loading valid agent manifest."""
        loader = ManifestLoader(valid_agent_manifest)
        agents = loader.load_agent_manifest()
        
        assert len(agents) == 2
        assert agents[0]['name'] == 'analyst'
        assert agents[0]['displayName'] == 'Mary'
        assert agents[0]['icon'] == '📊'
        assert agents[1]['name'] == 'architect'
        assert agents[1]['displayName'] == 'Winston'
    
    def test_load_workflow_manifest_valid(self, valid_workflow_manifest):
        """Test loading valid workflow manifest."""
        loader = ManifestLoader(valid_workflow_manifest)
        workflows = loader.load_workflow_manifest()
        
        assert len(workflows) == 2
        assert workflows[0]['name'] == 'brainstorming'
        assert workflows[0]['description'] == 'Brainstorm ideas collaboratively'
        assert workflows[1]['name'] == 'party-mode'
    
    def test_load_task_manifest_empty(self, empty_task_manifest):
        """Test loading empty task manifest (only header)."""
        loader = ManifestLoader(empty_task_manifest)
        tasks = loader.load_task_manifest()
        
        assert len(tasks) == 0
    
    def test_load_manifest_missing_file(self, temp_bmad_root):
        """Test loading non-existent manifest file."""
        loader = ManifestLoader(temp_bmad_root)
        agents = loader.load_agent_manifest()  # File doesn't exist
        
        assert agents == []
    
    def test_load_manifest_malformed_csv(self, temp_bmad_root):
        """Test loading CSV with invalid data."""
        manifest_path = temp_bmad_root / "_cfg" / "agent-manifest.csv"
        # Create file with invalid structure - missing columns that would cause KeyError
        with open(manifest_path, 'w', encoding='utf-8') as f:
            f.write("invalid_header\n")
            f.write("some_value\n")
        
        loader = ManifestLoader(temp_bmad_root)
        # Python's csv module is forgiving, so this will just return data with unexpected keys
        # The important thing is it doesn't crash
        agents = loader.load_agent_manifest()
        
        # Should handle gracefully - may return data or empty list, just shouldn't crash
        assert isinstance(agents, list)
    
    def test_get_agent_by_name_found(self, valid_agent_manifest):
        """Test getting agent by name when it exists."""
        loader = ManifestLoader(valid_agent_manifest)
        agent = loader.get_agent_by_name('analyst')
        
        assert agent is not None
        assert agent['name'] == 'analyst'
        assert agent['displayName'] == 'Mary'
    
    def test_get_agent_by_name_not_found(self, valid_agent_manifest):
        """Test getting agent by name when it doesn't exist."""
        loader = ManifestLoader(valid_agent_manifest)
        agent = loader.get_agent_by_name('nonexistent')
        
        assert agent is None
    
    def test_get_workflow_by_name_found(self, valid_workflow_manifest):
        """Test getting workflow by name when it exists."""
        loader = ManifestLoader(valid_workflow_manifest)
        workflow = loader.get_workflow_by_name('party-mode')
        
        assert workflow is not None
        assert workflow['name'] == 'party-mode'
        assert workflow['description'] == 'Group chat with all agents'
    
    def test_get_workflow_by_name_not_found(self, valid_workflow_manifest):
        """Test getting workflow by name when it doesn't exist."""
        loader = ManifestLoader(valid_workflow_manifest)
        workflow = loader.get_workflow_by_name('nonexistent')
        
        assert workflow is None
    
    def test_get_task_by_name_empty_manifest(self, empty_task_manifest):
        """Test getting task from empty manifest."""
        loader = ManifestLoader(empty_task_manifest)
        task = loader.get_task_by_name('any-task')
        
        assert task is None
    
    def test_load_manifest_with_empty_rows(self, temp_bmad_root):
        """Test that completely empty rows are filtered out."""
        manifest_path = temp_bmad_root / "_cfg" / "workflow-manifest.csv"
        with open(manifest_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['name', 'description', 'module', 'path'])
            writer.writeheader()
            writer.writerow({
                'name': 'workflow1',
                'description': 'Test workflow',
                'module': 'core',
                'path': '/path/to/workflow.yaml'
            })
            # Write empty row
            writer.writerow({'name': '', 'description': '', 'module': '', 'path': ''})
            writer.writerow({
                'name': 'workflow2',
                'description': 'Another workflow',
                'module': 'bmm',
                'path': '/path/to/workflow2.yaml'
            })
        
        loader = ManifestLoader(temp_bmad_root)
        workflows = loader.load_workflow_manifest()
        
        # Should only return 2 workflows, filtering out empty row
        assert len(workflows) == 2
        assert workflows[0]['name'] == 'workflow1'
        assert workflows[1]['name'] == 'workflow2'
