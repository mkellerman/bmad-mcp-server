#!/usr/bin/env python3
"""Test the new structured BMad tools."""

import sys
import json


def test_bmad_config():
    """Test bmad_config tool."""
    print("🧪 Testing bmad_config...")
    
    from bmad_mcp.server import bmad_config
    
    # Test default config
    result = bmad_config()
    assert "user_name" in result or "yaml" in result.lower(), "Default config should load user_name or YAML content"
    print("  ✅ Default config loaded")
    
    # Test explicit path
    result = bmad_config("bmm/config.yaml")
    if "ERROR" not in result:
        print("  ✅ BMM config loaded")
    else:
        print("  ⚠️  BMM config not found (may be expected)")


def test_bmad_manifest():
    """Test bmad_manifest tool."""
    print("\n🧪 Testing bmad_manifest...")
    
    from bmad_mcp.server import bmad_manifest
    
    # Test agent manifest
    result = bmad_manifest("agent")
    data = json.loads(result)
    assert data.get("type") == "agent", "Agent manifest should have type='agent'"
    assert data.get("count", 0) > 0, "Agent manifest should have at least one agent"
    print(f"  ✅ Agent manifest loaded: {data['count']} agents")
    
    # Test workflow manifest
    result = bmad_manifest("workflow")
    data = json.loads(result)
    assert data.get("type") == "workflow", "Workflow manifest should have type='workflow'"
    print(f"  ✅ Workflow manifest loaded: {data['count']} workflows")


def test_bmad_agent():
    """Test bmad_agent tool."""
    print("\n🧪 Testing bmad_agent...")
    
    from bmad_mcp.server import bmad_agent
    
    # Test list agents
    result = bmad_agent()
    data = json.loads(result)
    assert "available_agents" in data, "Should have available_agents list"
    count = len(data["available_agents"])
    print(f"  ✅ List agents works: {count} agents available")
    
    # Show first few
    for agent in data["available_agents"][:3]:
        print(f"     - {agent['name']}: {agent['displayName']}")
    
    # Test load specific agent
    result = bmad_agent("master", user_name="TestUser")
    data = json.loads(result)
    assert "instructions" in data, "Agent should have instructions"
    assert "files" in data, "Agent should have files"
    print(f"  ✅ Load master agent works")
    print(f"     Instructions: {len(data['instructions'])} chars")
    print(f"     File categories: {list(data['files'].keys())}")


def test_bmad_workflow():
    """Test bmad_workflow tool."""
    print("\n🧪 Testing bmad_workflow...")
    
    from bmad_mcp.server import bmad_workflow
    
    # Test list workflows
    result = bmad_workflow()
    data = json.loads(result)
    assert "available_workflows" in data, "Should have available_workflows list"
    count = len(data["available_workflows"])
    print(f"  ✅ List workflows works: {count} workflows available")
    
    # Show first few
    for wf in data["available_workflows"][:3]:
        print(f"     - {wf['name']}: {wf['description'][:50]}...")
    
    # Test load specific workflow
    result = bmad_workflow("party-mode")
    assert "name:" in result, "Workflow should have name field"
    assert "party-mode" in result.lower(), "Workflow should reference party-mode"
    print(f"  ✅ Load party-mode workflow works")


def test_bmad_smart_routing():
    """Test bmad smart command routing."""
    print("\n🧪 Testing bmad smart routing...")
    
    from bmad_mcp.server import bmad
    
    # Test default (should load master)
    result = bmad()
    data = json.loads(result)
    assert "instructions" in data, "Default should load master agent with instructions"
    print("  ✅ Default loads master agent")
    
    # Test agent name
    result = bmad("analyst")
    data = json.loads(result)
    assert "instructions" in data, "Agent should have instructions"
    assert "analyst" in data["instructions"].lower(), "Instructions should mention analyst"
    print("  ✅ Routes agent name correctly")
    
    # Test list command
    result = bmad("list-workflows")
    data = json.loads(result)
    assert "available_workflows" in data, "List command should return workflows"
    print("  ✅ Routes list command correctly")
    
    # Test workflow name
    result = bmad("party-mode")
    data = json.loads(result)
    assert "type" in data, "Workflow should have type field"
    assert data["type"] == "workflow", "Type should be 'workflow'"
    print("  ✅ Routes workflow name correctly")


def test_bmad_file_restrictions():
    """Test that _cfg/ files are blocked."""
    print("\n🧪 Testing bmad_file restrictions...")
    
    from bmad_mcp.server import bmad_file
    
    # Try to access _cfg/ file (should be blocked)
    result = bmad_file("_cfg/agent-manifest.csv")
    assert "ERROR" in result, "_cfg/ files should return ERROR"
    assert "manifest" in result.lower(), "Error should mention manifest"
    print("  ✅ _cfg/ files are properly blocked")
    
    # Try to access regular file (should work)
    result = bmad_file("core/config.yaml")
    assert "ERROR" not in result, "Regular files should be accessible"
    print("  ✅ Regular files are accessible")


def main():
    """Run all tests."""
    print("=" * 60)
    print("Testing New Structured BMad Tools")
    print("=" * 60)
    
    tests = [
        test_bmad_config,
        test_bmad_manifest,
        test_bmad_agent,
        test_bmad_workflow,
        test_bmad_smart_routing,
        test_bmad_file_restrictions,
    ]
    
    results = []
    for test in tests:
        try:
            results.append(test())
        except Exception as e:
            print(f"\n❌ Test {test.__name__} crashed: {e}")
            import traceback
            traceback.print_exc()
            results.append(False)
    
    print("\n" + "=" * 60)
    print(f"Results: {sum(results)}/{len(results)} tests passed")
    print("=" * 60)
    
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
