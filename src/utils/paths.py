"""
Centralized path resolution utilities for BMAD MCP Server.

Provides consistent path resolution across runtime and test contexts.
"""

from pathlib import Path


def get_project_root() -> Path:
    """
    Get the project root directory (src/).
    
    This function provides centralized path resolution for the BMAD MCP Server.
    The project root is where bmad/_cfg manifests are located.
    
    Returns:
        Path to the src/ directory (project root)
        
    Examples:
        >>> project_root = get_project_root()
        >>> manifest_dir = project_root / "bmad" / "_cfg"
        >>> agent_manifest = manifest_dir / "agent-manifest.csv"
    """
    # This file is in src/utils/paths.py
    # So parent is src/utils, parent.parent is src/
    return Path(__file__).parent.parent.resolve()


def get_bmad_root() -> Path:
    """
    Get the BMAD root directory (src/bmad/).
    
    Returns:
        Path to the src/bmad directory
    """
    return get_project_root() / "bmad"


def get_manifest_dir() -> Path:
    """
    Get the manifest directory (src/bmad/_cfg/).
    
    Returns:
        Path to the src/bmad/_cfg directory containing all manifests
    """
    return get_bmad_root() / "_cfg"


def get_test_project_root() -> Path:
    """
    Get the project root for test contexts.
    
    When called from tests, walks up to find the src/ directory.
    
    Returns:
        Path to the src/ directory (project root)
    """
    # From tests/*/test_*.py, we need to go up to repo root, then into src/
    current = Path(__file__).resolve()
    
    # Find the repo root (where pyproject.toml exists)
    repo_root = current
    while repo_root.parent != repo_root:
        if (repo_root / "pyproject.toml").exists():
            return repo_root / "src"
        repo_root = repo_root.parent
    
    # Fallback: assume we're in src/utils/
    return Path(__file__).parent.parent.resolve()
