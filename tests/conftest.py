"""
Pytest configuration for BMAD MCP Server tests.

Defines custom markers and shared fixtures.
"""

import pytest


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
