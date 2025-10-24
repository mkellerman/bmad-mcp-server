"""
E2E tests for workflow execution via GitHub Copilot.

Tests complete workflow discovery, selection, and execution flow using
real Copilot LLM interactions.

Story T3.2 from user-stories-testing.md
"""

import pytest
import json
from pathlib import Path

from src.mcp_server import BMADMCPServer
from tests.utils.copilot_tester import CopilotMCPTester, skip_if_no_litellm


@pytest.mark.e2e
@skip_if_no_litellm()
class TestCopilotWorkflowExecution:
    """Test complete workflow execution flow with Copilot."""
    
    @pytest.fixture
    def real_bmad_root(self):
        """Path to project root (manifest paths include 'bmad/' prefix)."""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def mcp_server(self, real_bmad_root):
        """Create MCP server with real BMAD."""
        return BMADMCPServer(real_bmad_root)
    
    @pytest.fixture
    def copilot_tester(self):
        """Create Copilot tester instance."""
        return CopilotMCPTester()
    
    @pytest.mark.asyncio
    async def test_copilot_discovers_workflow_tool(self, copilot_tester, mcp_server):
        """Test that Copilot can discover workflow execution capabilities."""
        # Ask Copilot about running a workflow
        selection = await copilot_tester.ask_tool_selection(
            task="I want to execute a BMAD workflow for brainstorming ideas",
            available_tools=["list_workflows", "get_workflow_details", "execute_workflow", "list_prompts"],
            context="BMAD provides workflow execution tools"
        )
        
        # Should select workflow-related tool
        assert selection["tool"] in ["list_workflows", "execute_workflow"], \
            f"Expected workflow tool, got {selection['tool']}"
        
        print(f"\n✓ Copilot selected: {selection['tool']}")
        print(f"  Reasoning: {selection.get('why', 'N/A')}")
    
    @pytest.mark.asyncio
    async def test_copilot_lists_and_selects_workflow(self, copilot_tester, mcp_server):
        """Test that Copilot can list workflows and select appropriate one."""
        # Phase 1: List all workflows
        result = await mcp_server.call_tool("list_workflows", {})
        workflows_data = json.loads(result.content[0].text)
        
        assert workflows_data["count"] > 0, "No workflows available"
        
        workflow_list = [
            {"path": wf["path"], "category": wf.get("category", "N/A")}
            for wf in workflows_data["workflows"][:10]  # Limit for test
        ]
        
        # Phase 2: Ask Copilot to select brainstorming workflow
        selection = await copilot_tester.ask_tool_selection(
            task="I need a creative brainstorming workflow",
            available_tools=[wf["path"] for wf in workflow_list],
            context=f"Available workflows: {json.dumps(workflow_list, indent=2)}"
        )
        
        # Should select workflow containing "brainstorm"
        selected = selection["tool"]
        assert "brainstorm" in selected.lower() or "party" in selected.lower(), \
            f"Expected brainstorming workflow, got {selected}"
        
        print(f"\n✓ Copilot selected workflow: {selected}")
        print(f"  From {len(workflow_list)} available workflows")
    
    @pytest.mark.asyncio
    async def test_copilot_gets_workflow_details(self, copilot_tester, mcp_server):
        """Test that Copilot can retrieve workflow details before execution."""
        # List workflows first
        list_result = await mcp_server.call_tool("list_workflows", {})
        workflows = json.loads(list_result.content[0].text)["workflows"]
        
        # Pick first workflow
        test_workflow = workflows[0]["path"]
        
        # Get workflow details
        details_result = await mcp_server.call_tool(
            "get_workflow_details",
            {"workflow_path": test_workflow}
        )
        
        details_data = json.loads(details_result.content[0].text)
        
        # Verify details structure
        assert "workflow_path" in details_data
        assert "metadata" in details_data
        assert "has_instructions" in details_data
        
        print(f"\n✓ Retrieved details for: {test_workflow}")
        print(f"  Category: {details_data['metadata'].get('category', 'N/A')}")
        print(f"  Has instructions: {details_data['has_instructions']}")
    
    @pytest.mark.asyncio
    async def test_copilot_executes_workflow(self, copilot_tester, mcp_server):
        """Test that Copilot can execute a workflow end-to-end."""
        # Find brainstorming workflow
        list_result = await mcp_server.call_tool("list_workflows", {})
        workflows = json.loads(list_result.content[0].text)["workflows"]
        
        brainstorm_wf = None
        for wf in workflows:
            if "brainstorm" in wf["path"].lower() or "party" in wf["path"].lower():
                brainstorm_wf = wf["path"]
                break
        
        if brainstorm_wf is None:
            pytest.skip("Brainstorming workflow not found")
        
        # Execute workflow
        exec_result = await mcp_server.call_tool(
            "execute_workflow",
            {"workflow_path": brainstorm_wf}
        )
        
        exec_data = json.loads(exec_result.content[0].text)
        
        # Verify execution result
        assert "workflow_path" in exec_data
        assert "yaml_config" in exec_data
        assert "instructions" in exec_data
        
        print(f"\n✓ Executed workflow: {brainstorm_wf}")
        print(f"  Has YAML: {exec_data['yaml_config'] is not None}")
        print(f"  Has instructions: {exec_data['instructions'] is not None}")
    
    @pytest.mark.asyncio
    async def test_copilot_interprets_workflow_instructions(self, copilot_tester, mcp_server):
        """Test that Copilot can interpret and follow workflow instructions."""
        # Execute a workflow
        list_result = await mcp_server.call_tool("list_workflows", {})
        workflows = json.loads(list_result.content[0].text)["workflows"]
        test_workflow = workflows[0]["path"]
        
        exec_result = await mcp_server.call_tool(
            "execute_workflow",
            {"workflow_path": test_workflow}
        )
        exec_data = json.loads(exec_result.content[0].text)
        
        # Ask Copilot to interpret the workflow
        response = await copilot_tester.interpret_result(
            task="Explain what this workflow does and what steps I should follow",
            tool_result=exec_data
        )
        
        # Verify Copilot provided interpretation
        assert response is not None
        assert "next_action" in response
        assert response.get("next_action") in ["answer_user", "call_tool_again", "ask_clarifying_question"]
        
        print(f"\n✓ Copilot interpreted workflow:")
        print(f"  Next action: {response.get('next_action')}")
        print(f"  Satisfied: {response.get('satisfied')}")
    
    @pytest.mark.asyncio
    async def test_full_workflow_execution_flow(self, copilot_tester, mcp_server):
        """Test complete E2E workflow: discover -> select -> execute -> interpret."""
        print("\n" + "="*70)
        print("FULL E2E TEST: Workflow Execution Flow")
        print("="*70)
        
        # Step 1: User asks for workflow help
        print("\n[STEP 1] User requests creative brainstorming...")
        selection = await copilot_tester.ask_tool_selection(
            task="I need to brainstorm creative solutions for my project",
            available_tools=["list_workflows", "list_prompts"],
            context="BMAD provides workflows for various development tasks"
        )
        print(f"  → Copilot selected: {selection['tool']}")
        
        # Step 2: List workflows
        print("\n[STEP 2] Listing available workflows...")
        list_result = await mcp_server.call_tool("list_workflows", {})
        workflows_data = json.loads(list_result.content[0].text)
        print(f"  → Found {workflows_data['count']} workflows")
        
        # Step 3: Filter to brainstorming workflows
        print("\n[STEP 3] Finding brainstorming workflows...")
        brainstorm_wfs = [
            wf for wf in workflows_data["workflows"]
            if "brainstorm" in wf["path"].lower() or "party" in wf["path"].lower()
        ]
        print(f"  → Found {len(brainstorm_wfs)} matching workflows")
        
        if len(brainstorm_wfs) == 0:
            pytest.skip("No brainstorming workflows available")
        
        selected_wf = brainstorm_wfs[0]["path"]
        
        # Step 4: Get workflow details
        print(f"\n[STEP 4] Getting details for: {selected_wf}...")
        details_result = await mcp_server.call_tool(
            "get_workflow_details",
            {"workflow_path": selected_wf}
        )
        details = json.loads(details_result.content[0].text)
        print(f"  → Category: {details['metadata'].get('category', 'N/A')}")
        print(f"  → Has instructions: {details['has_instructions']}")
        
        # Step 5: Execute workflow
        print(f"\n[STEP 5] Executing workflow...")
        exec_result = await mcp_server.call_tool(
            "execute_workflow",
            {"workflow_path": selected_wf}
        )
        exec_data = json.loads(exec_result.content[0].text)
        print(f"  → Loaded YAML config: {exec_data['yaml_config'] is not None}")
        print(f"  → Loaded instructions: {exec_data['instructions'] is not None}")
        
        # Step 6: Copilot interprets instructions
        print(f"\n[STEP 6] Copilot interpreting workflow instructions...")
        response = await copilot_tester.interpret_result(
            task="Explain this workflow and guide me through it",
            tool_result=exec_data
        )
        print(f"  → Response action: {response.get('next_action')}")
        print(f"  → Satisfied: {response.get('satisfied')}")
        
        print("\n" + "="*70)
        print("✓ COMPLETE E2E WORKFLOW EXECUTION SUCCESSFUL")
        print("="*70)
        
        # Assertions
        assert workflows_data["count"] > 0
        assert len(brainstorm_wfs) > 0
        assert details["has_instructions"] in [True, False]
        assert exec_data["workflow_path"] == selected_wf
        assert response.get("next_action") in ["answer_user", "call_tool_again"]
    
    @pytest.mark.asyncio
    async def test_copilot_handles_workflow_not_found(self, copilot_tester, mcp_server):
        """Test that Copilot handles missing workflow gracefully."""
        # Try to execute non-existent workflow
        try:
            result = await mcp_server.call_tool(
                "execute_workflow",
                {"workflow_path": "nonexistent/fake-workflow"}
            )
            
            # Should return error structure
            data = json.loads(result.content[0].text)
            assert "error" in data or "workflow_path" not in data
            
            print("\n✓ Handled missing workflow gracefully")
            
        except Exception as e:
            # Also acceptable to raise exception
            print(f"\n✓ Raised exception for missing workflow: {type(e).__name__}")
    
    @pytest.mark.asyncio
    async def test_workflow_filtering_by_category(self, copilot_tester, mcp_server):
        """Test that workflows can be filtered by category."""
        # List workflows with category filter
        result = await mcp_server.call_tool(
            "list_workflows",
            {"category": "brainstorming"}
        )
        
        data = json.loads(result.content[0].text)
        
        # Verify filtering worked
        if data["count"] > 0:
            for wf in data["workflows"]:
                # Category should match or be related
                category = wf.get("category", "").lower()
                assert "brainstorm" in category or "creative" in category or category == ""
        
        print(f"\n✓ Filtered to {data['count']} brainstorming workflows")
    
    @pytest.mark.asyncio
    async def test_agent_executes_workflow(self, copilot_tester, mcp_server):
        """Test that an agent can discover and execute workflows."""
        # Load analyst agent
        agent_result = await mcp_server.get_prompt("bmad-analyst", {})
        
        # Agent lists workflows
        list_result = await mcp_server.call_tool("list_workflows", {})
        workflows = json.loads(list_result.content[0].text)
        
        # Ask Copilot (as agent) to select and execute workflow
        selection = await copilot_tester.ask_tool_selection(
            task="As analyst, I need a workflow for stakeholder analysis",
            available_tools=["get_workflow_details", "execute_workflow"],
            context=f"Available workflows: {[w['path'] for w in workflows['workflows'][:5]]}"
        )
        
        # Should want to execute a workflow
        assert selection["tool"] in ["get_workflow_details", "execute_workflow"]
        
        print(f"\n✓ Agent selected: {selection['tool']}")
        print(f"  Context: Acting as analyst agent")
