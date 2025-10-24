"""
Pytest configuration for BMAD MCP Server tests.

Defines custom markers and shared fixtures.
"""

import pytest
from pathlib import Path


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers",
        "manual: Manual/interactive tests with verbose output"
    )
    config.addinivalue_line(
        "markers", 
        "integration: Integration tests (may be slow or require auth)"
    )
    config.addinivalue_line(
        "markers",
        "e2e: End-to-end tests with real Copilot API calls"
    )
    config.addinivalue_line(
        "markers",
        "security: Security and validation tests"
    )
    config.addinivalue_line(
        "markers",
        "performance: Performance and stress tests"
    )


@pytest.fixture(scope="session")
def project_root():
    """Get project root directory."""
    return Path(__file__).parent.parent


@pytest.fixture(scope="session")
def bmad_root(project_root):
    """Get BMAD root directory."""
    return project_root / "bmad"


@pytest.fixture
def mcp_server(project_root):
    """Create MCP server instance."""
    from src.mcp_server import BMADMCPServer
    return BMADMCPServer(project_root)


@pytest.fixture
def unified_tool(project_root):
    """Create unified tool instance."""
    from src.unified_tool import UnifiedBMADTool
    return UnifiedBMADTool(project_root)
