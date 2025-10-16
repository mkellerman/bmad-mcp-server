#!/usr/bin/env python3
"""Test the bmad_task tool."""

from bmad_mcp.server import bmad_task


def test_bmad_task_tool():
    """Test that bmad_task loads a task correctly."""
    print("=" * 60)
    print("Testing bmad_task tool")
    print("=" * 60)

    # Test loading a task (daily-standup)
    result = bmad_task(name='daily-standup')

    print("\n✓ Tool executed successfully\n")

    # Task should return XML or text content
    assert isinstance(result, str), "Result should be a string"
    assert len(result) > 50, "Task content should be substantial"
    
    print(f"📦 Task loaded: {len(result)} characters")
    print("✅ Task structure valid")
    
    # Test listing all tasks
    print("\n📋 Testing task listing...")
    list_result = bmad_task()
    assert isinstance(list_result, str), "List result should be a string"
    assert len(list_result) > 0, "Should return task list"
    print("✅ Task listing works")
    
    print("\n✅ All checks passed!")


if __name__ == "__main__":
    test_bmad_task_tool()
