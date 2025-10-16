#!/usr/bin/env python3
"""Test the bmad (master) tool with structured JSON response."""

from bmad_mcp.server import bmad
import json


def test_bmad_master_tool():
    """Test that the bmad tool returns expected structure."""
    print("=" * 60)
    print("Testing bmad() tool (master agent)")
    print("=" * 60)

    result = bmad(command="master", user_name='mkellerman', language='English')

    print("\n✓ Tool executed successfully\n")

    # Parse JSON response
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
    assert 'bmad' in instructions.lower() or 'master' in instructions.lower(), "Should contain master info"
    
    print("\n✅ All checks passed!")


if __name__ == "__main__":
    test_bmad_master_tool()
