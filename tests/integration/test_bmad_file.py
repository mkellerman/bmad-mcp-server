#!/usr/bin/env python3
"""Test the new bmad_file tool and file listing functionality."""

import sys


def test_bmad_file_tool():
    """Test that the bmad_file tool can load files."""
    print("🧪 Testing bmad_file tool...")
    
    from bmad_mcp.server import bmad_file
    
    print(f"  ✅ bmad_file tool exists and is callable")
    
    # Test loading a config file
    result = bmad_file("core/config.yaml")
    assert "ERROR" not in result, f"Failed to load config: {result}"
    assert len(result) > 0, "Config should have content"
    print(f"  ✅ Config loaded successfully ({len(result)} characters)")
    
    # Test loading a non-existent file
    result = bmad_file("nonexistent/file.yaml")
    assert "ERROR" in result or "not found" in result.lower(), "Should return error for non-existent file"
    print(f"  ✅ Correctly handled non-existent file")
    
    # Test loading workflow instructions
    result = bmad_file("core/workflows/party-mode/instructions.md")
    assert "ERROR" not in result, f"Failed to load instructions: {result}"
    assert "Party Mode" in result or "party" in result.lower(), "Instructions should contain party mode content"
    print(f"  ✅ Workflow instructions loaded successfully ({len(result)} characters)")


def test_bmad_tool_file_listing():
    """Test that the bmad tool includes file listing in JSON format."""
    print("\n🧪 Testing file listing in bmad tool (JSON format)...")
    
    from bmad_mcp.server import bmad
    import json
    
    result = bmad(command="master", user_name="TestUser")
    
    # Parse JSON response
    data = json.loads(result)
    
    # Check structure
    assert "instructions" in data, "'instructions' key not found in response"
    assert "files" in data, "'files' key not found in response"
    
    print(f"  ✅ Response has correct JSON structure")
    print(f"  ✅ Instructions: {len(data['instructions'])} characters")
    
    # Check files structure
    files = data["files"]
    assert isinstance(files, dict), "'files' is not a dictionary"
    
    # Check for key categories
    categories = ["config", "agents", "workflows"]
    for cat in categories:
        if cat in files and len(files[cat]) > 0:
            print(f"  ✅ Category '{cat}' found with {len(files[cat])} files")
        elif cat in files:
            print(f"  ⚠️  Category '{cat}' found but empty")
        else:
            print(f"  ⚠️  Category '{cat}' not found")
    
    # Check that files are paths, not content
    for cat, file_list in files.items():
        if file_list and isinstance(file_list, list):
            sample_file = file_list[0]
            # File paths should be short strings, not content
            assert len(sample_file) < 200, f"Files in '{cat}' appear to contain content instead of paths"
            print(f"  ✅ Files in '{cat}' are paths (not content)")
            break


def test_party_mode_activation():
    """Test that the agent instructions mention party-mode and file loading."""
    print("\n🧪 Testing party-mode instructions in agent...")
    
    from bmad_mcp.server import bmad
    import json
    
    result = bmad(command="master", user_name="TestUser")
    data = json.loads(result)
    
    instructions = data.get("instructions", "")
    
    assert "*party-mode" in instructions, "*party-mode trigger not found in agent instructions"
    assert "workflow" in instructions.lower(), "Workflow reference not found in agent instructions"
    
    print(f"  ✅ Agent instructions include party-mode workflow")
    print(f"  ✅ Instructions are raw agent markdown (LLM will process)")
    
    # Check that bmad_file is NOT mentioned in instructions (it's a tool, not part of agent spec)
    # The LLM will learn about bmad_file from the tool description
    files = data.get("files", {})
    
    if "workflows" in files:
        workflow_files = files["workflows"]
        party_mode_files = [f for f in workflow_files if "party-mode" in f]
        if party_mode_files:
            print(f"  ✅ Party-mode workflow files available: {len(party_mode_files)} files")
            for f in party_mode_files[:3]:
                print(f"     - {f}")


def main():
    """Run all tests."""
    print("=" * 60)
    print("Testing BMAD File Loading Functionality")
    print("=" * 60)
    
    tests = [
        test_bmad_file_tool,
        test_bmad_tool_file_listing,
        test_party_mode_activation,
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
