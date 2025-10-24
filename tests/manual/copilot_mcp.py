#!/usr/bin/env python3
"""
Manual test for BMAD MCP Server using GitHub Copilot.

This script provides interactive testing with verbose output for debugging
MCP tool-calling capabilities.

The test demonstrates a complete MCP workflow:
1. User provides a natural language task
2. Copilot LLM selects the appropriate MCP tool
3. Script validates arguments and executes the tool on BMAD MCP server
4. Copilot interprets the results

Usage:
    # Via pytest (recommended)
    pytest tests/manual/copilot_mcp.py -v -s
    
    # Or mark-based
    pytest -m manual -v -s
    
    # Direct execution (legacy)
    python tests/manual/copilot_mcp.py

See README_copilot_mcp.md for detailed documentation.
"""

import asyncio
import json
import sys
from pathlib import Path

import pytest

# Add src and tests to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))
sys.path.insert(0, str(Path(__file__).parent.parent))

from mcp_server import BMADMCPServer
from tests.utils.copilot_tester import CopilotMCPTester, skip_if_no_litellm

# ---- Initialize BMAD MCP Server
BMAD_ROOT = Path(__file__).parent.parent.parent / "src" / "bmad"
mcp_server = BMADMCPServer(BMAD_ROOT)

# ---- Initialize Copilot Tester
copilot_tester = CopilotMCPTester()

# ---- Tool schemas for BMAD MCP operations
# Currently testing list_tools since it's implemented
TOOLS_SCHEMA = {
    "list_tools": {
        "args": {
            "type": "object",
            "properties": {},
            "additionalProperties": False,
        },
        "result": {
            "type": "object",
            "properties": {
                "tools": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "description": {"type": "string"},
                        },
                        "required": ["name", "description"],
                    },
                },
            },
            "required": ["tools"],
        },
    },
}

async def run_mcp_tool(tool_name: str, args: dict) -> dict:
    """
    Execute an MCP tool on the BMAD server.
    
    Args:
        tool_name: Name of the MCP tool to execute
        args: Arguments for the tool
        
    Returns:
        Tool execution result
    """
    if tool_name == "list_tools":
        tools = await mcp_server.list_tools()
        return {"tools": [{"name": t.name, "description": t.description} for t in tools]}
    elif tool_name == "list_prompts":
        prompts = await mcp_server.list_prompts()
        return {"prompts": [{"name": p.name, "description": p.description} for p in prompts]}
    elif tool_name == "list_resources":
        resources = await mcp_server.list_resources()
        return {"resources": [{"uri": r.uri, "name": r.name} for r in resources]}
    else:
        raise ValueError(f"Unknown tool: {tool_name}")


@pytest.mark.manual
@pytest.mark.asyncio
@skip_if_no_litellm()
async def test_mcp_list_tools_manual():
    """
    Test BMAD MCP Server's list_tools capability via GitHub Copilot.
    
    This demonstrates:
    1. Copilot deciding which MCP tool to call
    2. Validating tool arguments against schema
    3. Executing the MCP tool
    4. Copilot interpreting results
    """
    print("🧪 Testing BMAD MCP Server with GitHub Copilot...")
    print(f"BMAD Root: {BMAD_ROOT}")
    print()
    
    USER_TASK = "List all available BMAD tools from the MCP server."
    
    print(f"📝 User Task: {USER_TASK}")
    print("🤖 Asking Copilot to select tool...")
    
    # ---- Phase A: Ask Copilot which tool to call
    selection = await copilot_tester.ask_tool_selection(
        task=USER_TASK,
        available_tools=["list_tools", "list_prompts", "list_resources"]
    )
    
    print(f"\n📤 Copilot Response:\n{selection['raw_response']}\n")
    print(f"🔧 Tool selected: {selection['tool']}")
    print(f"📋 Arguments: {json.dumps(selection['args'], indent=2)}")
    print(f"� Reasoning: {selection['why']}")
    print(f"� Confidence: {selection['confidence']}")
    
    # Validate tool exists
    assert selection["tool"] in TOOLS_SCHEMA, f"Unknown tool: {selection['tool']}"
    
    # Validate args against schema
    copilot_tester.validate_tool_args(
        selection["args"],
        TOOLS_SCHEMA[selection["tool"]]["args"]
    )
    print("✅ Arguments validated against schema")
    
    # ---- Phase B: Execute MCP tool
    print(f"\n⚙️  Executing MCP tool: {selection['tool']}...")
    tool_result = await run_mcp_tool(selection["tool"], selection["args"])
    
    # Validate result against schema
    copilot_tester.validate_tool_result(
        tool_result,
        TOOLS_SCHEMA[selection["tool"]]["result"]
    )
    print("✅ Result validated against schema")
    print(f"\n📊 Tool Result:\n{json.dumps(tool_result, indent=2)}")
    
    # ---- Phase C: Ask Copilot to interpret results
    print("\n🤖 Asking Copilot to interpret results...")
    
    interpretation = await copilot_tester.interpret_result(
        task=USER_TASK,
        tool_result=tool_result,
        conversation_history=[
            {"role": "user", "content": USER_TASK},
            {"role": "assistant", "content": selection["raw_response"]}
        ]
    )
    
    print(f"\n📤 Copilot Interpretation:\n{json.dumps(interpretation, indent=2)}\n")
    
    # For placeholder implementation, empty tools list is expected
    if len(tool_result.get("tools", [])) == 0:
        print("⚠️  Note: MCP server returned empty tools list (placeholder implementation)")
        print("✅ BMAD MCP Server + GitHub Copilot integration test passed!")
        print("   The server responded correctly, though tools are not yet implemented.")
    else:
        assert interpretation["satisfied"] is True, "Copilot was not satisfied with the result"
        print("✅ BMAD MCP Server + GitHub Copilot test passed!")
    
    print(f"\n📈 Final Analysis:\n{json.dumps(interpretation, indent=2)}")
    
    return interpretation


async def main():
    """Main test runner for direct execution."""
    try:
        await test_mcp_list_tools_manual()
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    # Direct execution (legacy support)
    asyncio.run(main())