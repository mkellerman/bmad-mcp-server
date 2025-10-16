"""Shared pytest fixtures for BMad MCP Server tests.

This module provides common fixtures used across unit and integration tests.
"""

import pytest
from pathlib import Path


@pytest.fixture
def project_root():
    """Return the project root directory."""
    return Path(__file__).parent.parent


@pytest.fixture
def embedded_root(project_root):
    """Return the embedded resources directory."""
    return project_root / "src" / "bmad_mcp" / "embedded"


@pytest.fixture
def sample_config():
    """Provide a sample configuration for testing."""
    return {
        "user_name": "TestUser",
        "communication_language": "English",
        "output_folder": "./output",
        "project_name": "test-project"
    }


@pytest.fixture
def sample_agent_data():
    """Provide sample agent manifest data for testing."""
    return {
        "name": "test-agent",
        "displayName": "Test Agent",
        "title": "Test Agent Title",
        "icon": "🧪",
        "role": "Test Role",
        "identity": "Test identity",
        "communicationStyle": "Test style",
        "principles": "Test principles",
        "module": "test",
        "path": "test/agents/test-agent.md"
    }
