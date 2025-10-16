#!/usr/bin/env python3
"""Test the bmad_workflow tool."""

from bmad_mcp.server import bmad_workflow


def test_bmad_workflow_tool():
    """Test that bmad_workflow loads a workflow correctly."""
    print("=" * 60)
    print("Testing bmad_workflow tool")
    print("=" * 60)

    # Test loading the party-mode workflow
    result = bmad_workflow(name='party-mode')

    print("\n✓ Tool executed successfully\n")

    # Workflow should return YAML content
    assert isinstance(result, str), "Result should be a string"
    assert len(result) > 100, "Workflow content should be substantial"
    
    # Check for YAML indicators
    assert 'name:' in result or 'description:' in result, "Should contain YAML fields"
    
    print(f"📦 Workflow loaded: {len(result)} characters")
    print("✅ Workflow structure valid")
    
    # Test listing all workflows
    print("\n📋 Testing workflow listing...")
    list_result = bmad_workflow()
    assert isinstance(list_result, str), "List result should be a string"
    assert len(list_result) > 0, "Should return workflow list"
    print("✅ Workflow listing works")
    
    print("\n✅ All checks passed!")


if __name__ == "__main__":
    test_bmad_workflow_tool()
