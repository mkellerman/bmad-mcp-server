#!/usr/bin/env python3
"""Test the bmad_agent tool."""

from bmad_mcp.server import bmad_agent
import json


def test_bmad_agent_tool():
    """Test that bmad_agent loads an agent correctly."""
    print("=" * 60)
    print("Testing bmad_agent tool")
    print("=" * 60)

    # Test loading the analyst agent
    result = bmad_agent(name='analyst', user_name='mkellerman', language='English')

    print("\n✓ Tool executed successfully\n")

    # Parse JSON
    data = json.loads(result)
    print("✅ Valid JSON response")

    # Check structure
    print("\n📦 Response Structure:")
    print(f"  - instructions: {len(data.get('instructions', ''))} characters")
    print(f"  - files: {len(data.get('files', {}))} categories")

    # Assertions
    assert 'instructions' in data, "Response should have 'instructions' field"
    assert 'files' in data, "Response should have 'files' field"
    assert len(data['instructions']) > 1000, "Instructions should be substantial"
    
    instructions = data['instructions']
    assert 'analyst' in instructions.lower() or 'mary' in instructions.lower(), "Should contain analyst info"
    
    print("\n✅ All checks passed!")


if __name__ == "__main__":
    test_bmad_agent_tool()
