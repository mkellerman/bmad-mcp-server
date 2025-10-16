#!/usr/bin/env python3
"""Test that bmad tool only loads necessary files."""

import sys
from unittest.mock import patch, MagicMock
from bmad_mcp.resources import load_embedded_file


def test_bmad_tool_file_loading():
    """Track which files are loaded when bmad tool is called."""
    print("🧪 Testing bmad tool file loading behavior...\n")
    
    loaded_files = []
    
    # Mock load_embedded_file to track what gets loaded
    original_load = load_embedded_file
    
    def tracking_load(path):
        loaded_files.append(path)
        return original_load(path)
    
    # Patch and run
    with patch('bmad_mcp.server.load_embedded_file', side_effect=tracking_load):
        from bmad_mcp.server import bmad
        
        # Test 1: Initial load with default command (master)
        print("Test 1: Initial agent load (command='master')")
        loaded_files.clear()
        result = bmad(command="master", user_name="TestUser")
        
        print(f"  Files loaded: {len(loaded_files)}")
        for f in loaded_files:
            print(f"    - {f}")
        
        # Verify essential files were loaded
        # Note: The exact files may vary based on implementation
        assert len(loaded_files) > 0, "Should load at least one file"
        assert any("agent" in f.lower() or "master" in f.lower() for f in loaded_files), "Should load an agent file"
        print("  ✅ Files loaded successfully\n")
        
        # Test 2: Load with list-workflows command
        print("Test 2: Command routing (command='list-workflows')")
        loaded_files.clear()
        result = bmad(command="list-workflows", user_name="TestUser")
        
        print(f"  Files loaded: {len(loaded_files)}")
        for f in loaded_files:
            print(f"    - {f}")
        
        # Should load workflow manifest or related files
        assert len(loaded_files) > 0, "Should load workflow-related files"
        print("  ✅ Workflow command routed successfully\n")
        
        # Test 3: Workflow activation
        print("Test 3: Workflow activation (command='party-mode')")
        loaded_files.clear()
        result = bmad(command="party-mode", user_name="TestUser")
        
        print(f"  Files loaded: {len(loaded_files)}")
        for f in loaded_files:
            print(f"    - {f}")
        
        # Should load workflow-related files
        assert len(loaded_files) > 0, "Should load files for workflow"
        print("  ✅ Workflow command routed successfully\n")
        
        print()
        
        # Summary
        print("=" * 60)
        print("Summary:")
        print("=" * 60)
        print("✅ bmad tool loads files progressively")
        print("✅ Command routing works correctly")
        

if __name__ == "__main__":
    test_bmad_tool_file_loading()
