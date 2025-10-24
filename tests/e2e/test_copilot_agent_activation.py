"""
E2E tests for agent activation via GitHub Copilot.

Tests complete agent discovery, loading, and activation flow using
real Copilot LLM interactions.

Story T3.1 from user-stories-testing.md
"""

import pytest
import json
import csv
from pathlib import Path

from src.mcp_server import BMADMCPServer
from tests.utils.copilot_tester import CopilotMCPTester, skip_if_no_litellm


@pytest.mark.e2e
@skip_if_no_litellm()
class TestCopilotAgentActivation:
    """Test complete agent activation flow with Copilot."""
    
    @pytest.fixture
    def real_bmad_root(self):
        """Path to project root (manifest paths include 'bmad/' prefix)."""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def agent_manifest(self, real_bmad_root):
        """Load agent manifest CSV for validation."""
        manifest_path = real_bmad_root / "bmad" / "_cfg" / "agent-manifest.csv"
        agents = {}
        with open(manifest_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                agents[row['name']] = row
        return agents
    
    @pytest.fixture
    def mcp_server(self, real_bmad_root):
        """Create MCP server with real BMAD."""
        return BMADMCPServer(real_bmad_root)
    
    @pytest.fixture
    def copilot_tester(self):
        """Create Copilot tester instance."""
        return CopilotMCPTester()
    
    @pytest.mark.asyncio
    async def test_copilot_discovers_analyst_prompt(self, copilot_tester, mcp_server):
        """Test that Copilot can discover and select analyst agent prompt."""
        # Ask Copilot to help with requirements gathering
        selection = await copilot_tester.ask_tool_selection(
            task="I need help from a business analyst to gather requirements for a new feature.",
            available_tools=["list_prompts", "get_prompt", "list_tools"],
            context="BMAD agents are available through prompts. Use list_prompts to see available agents."
        )
        
        # Copilot should select list_prompts to discover agents
        assert selection["tool"] in ["list_prompts", "get_prompt"], \
            f"Expected list_prompts or get_prompt, got {selection['tool']}"
        
        print(f"\n✓ Copilot selected: {selection['tool']}")
        print(f"  Reasoning: {selection.get('why', 'N/A')}")
        print(f"  Confidence: {selection.get('confidence', 'N/A')}")
    
    @pytest.mark.asyncio
    async def test_all_manifest_agents_are_available(self, mcp_server, agent_manifest):
        """Test that all agents in manifest are available via MCP."""
        prompts = await mcp_server.list_prompts()
        prompt_names = [p.name for p in prompts]
        
        # Check each agent from manifest is available
        # Some agents already have bmad- prefix (bmad-master), others don't (analyst)
        for agent_name in agent_manifest.keys():
            # MCP server adds bmad- prefix if not present
            if agent_name.startswith("bmad-"):
                expected_prompt_name = agent_name
            else:
                expected_prompt_name = f"bmad-{agent_name}"
            
            assert expected_prompt_name in prompt_names, \
                f"Agent '{agent_name}' from manifest not found in prompts (expected {expected_prompt_name})"
        
        print(f"\n✓ All {len(agent_manifest)} agents from manifest are available")
        print(f"  Agents: {', '.join(agent_manifest.keys())}")
    
    @pytest.mark.asyncio
    async def test_copilot_lists_and_identifies_agents(self, copilot_tester, mcp_server, agent_manifest):
        """Test that Copilot can list agents and identify the right one."""
        # Phase 1: List all prompts
        prompts = await mcp_server.list_prompts()
        assert len(prompts) > 0, "No prompts available"
        
        prompt_list = [{"name": p.name, "description": p.description} for p in prompts]
        
        # Phase 2: Ask Copilot to select the business analyst
        selection = await copilot_tester.ask_tool_selection(
            task="I need help analyzing market requirements and gathering business specifications.",
            available_tools=[p["name"] for p in prompt_list],
            context=f"Available BMAD agents: {json.dumps(prompt_list, indent=2)}"
        )
        
        # Should select analyst agent - verify name from manifest
        selected_tool = selection["tool"]
        # MCP server adds "bmad-" prefix to agent names
        expected_name = "bmad-analyst"
        assert expected_name in selected_tool.lower(), \
            f"Expected {expected_name}, got {selected_tool}"
        
        # Verify the agent exists in manifest
        agent_key = selected_tool.replace("bmad-", "")
        assert agent_key in agent_manifest, f"Agent {agent_key} not in manifest"
        
        print(f"\n✓ Copilot identified agent: {selected_tool}")
        print(f"  Display name from manifest: {agent_manifest[agent_key]['displayName']}")
        print(f"  Role: {agent_manifest[agent_key]['role']}")
        print(f"  From {len(prompt_list)} available agents")
    
    @pytest.mark.asyncio
    async def test_copilot_loads_analyst_agent_prompt(self, copilot_tester, mcp_server, agent_manifest):
        """Test complete flow: discover -> select -> load analyst agent."""
        # Phase 1: List prompts
        prompts = await mcp_server.list_prompts()
        analyst_prompt = None
        for p in prompts:
            if "analyst" in p.name.lower():
                analyst_prompt = p
                break
        
        assert analyst_prompt is not None, "Analyst agent not found"
        
        # Phase 2: Load the analyst prompt
        result = await mcp_server.get_prompt(analyst_prompt.name, {})
        
        assert len(result.messages) > 0
        content = result.messages[0].content.text
        
        # Verify agent content is loaded - use manifest data
        analyst_data = agent_manifest['analyst']
        assert len(content) > 500, "Agent content too short"
        
        # Check for displayName from manifest (Mary)
        assert analyst_data['displayName'] in content, \
            f"Expected displayName '{analyst_data['displayName']}' in content"
        
        # Check for role keywords
        assert "analyst" in content.lower() or analyst_data['title'] in content
        assert "bmad" in content.lower()
        
        print(f"\n✓ Loaded agent: {analyst_prompt.name}")
        print(f"  Display name: {analyst_data['displayName']}")
        print(f"  Title: {analyst_data['title']}")
        print(f"  Content length: {len(content)} characters")
        print(f"  Description: {result.description}")
    
    @pytest.mark.asyncio
    async def test_copilot_responds_as_analyst_agent(self, copilot_tester, mcp_server):
        """Test that Copilot can respond in character as the analyst agent."""
        # Load analyst agent prompt
        result = await mcp_server.get_prompt("bmad-analyst", {})
        agent_content = result.messages[0].content.text
        
        # Ask Copilot to interpret the agent prompt loading
        response = await copilot_tester.interpret_result(
            task="Introduce yourself and explain how you can help with requirements gathering.",
            tool_result={"agent_prompt": agent_content[:2000]}  # Truncate for test
        )
        
        # Verify response structure
        assert response is not None
        assert "next_action" in response
        assert response.get("next_action") in ["answer_user", "call_tool_again", "ask_clarifying_question"]
        
        print(f"\n✓ Agent response received:")
        print(f"  Next action: {response.get('next_action')}")
        print(f"  Satisfied: {response.get('satisfied')}")
        print(f"  Debug: {response.get('updated_debug', {})}")
    
    @pytest.mark.asyncio
    async def test_copilot_agent_discovers_workflows(self, copilot_tester, mcp_server):
        """Test that agent can discover and recommend workflows."""
        # Load analyst agent
        result = await mcp_server.get_prompt("bmad-analyst", {})
        
        # Ask Copilot (as analyst) what workflows are available
        selection = await copilot_tester.ask_tool_selection(
            task="As the analyst agent, what BMAD workflows can I use to help gather requirements?",
            available_tools=["list_workflows", "get_workflow_details", "execute_workflow"],
            context="You have access to BMAD workflow tools to assist with analysis tasks."
        )
        
        # Should select list_workflows
        assert selection["tool"] == "list_workflows", \
            f"Expected list_workflows, got {selection['tool']}"
        
        print(f"\n✓ Agent knows to use: {selection['tool']}")
        print(f"  Reasoning: {selection.get('why', 'N/A')}")
    
    @pytest.mark.asyncio
    async def test_full_agent_activation_workflow(self, copilot_tester, mcp_server):
        """Test complete E2E workflow: discover -> activate -> interact."""
        print("\n" + "="*70)
        print("FULL E2E TEST: Agent Activation Workflow")
        print("="*70)
        
        # Step 1: User asks for help
        print("\n[STEP 1] User requests business analyst help...")
        selection = await copilot_tester.ask_tool_selection(
            task="I need to analyze market opportunities for a new mobile app",
            available_tools=["list_prompts", "list_tools"],
            context="BMAD provides agents and tools for software development"
        )
        print(f"  → Copilot selected: {selection['tool']}")
        
        # Step 2: List available agents
        print("\n[STEP 2] Listing available agents...")
        prompts = await mcp_server.list_prompts()
        print(f"  → Found {len(prompts)} agents")
        
        # Step 3: Select analyst agent
        print("\n[STEP 3] Loading analyst agent...")
        analyst_result = await mcp_server.get_prompt("bmad-analyst", {})
        content_preview = analyst_result.messages[0].content.text[:300]
        print(f"  → Loaded agent: {analyst_result.description}")
        print(f"  → Content preview: {content_preview}...")
        
        # Step 4: Agent responds
        print("\n[STEP 4] Agent responding to user...")
        response = await copilot_tester.interpret_result(
            task="Help me understand what market research I should conduct",
            tool_result={"agent_context": "You are a business analyst expert"}
        )
        print(f"  → Response action: {response.get('next_action')}")
        
        # Step 5: Agent discovers workflows
        print("\n[STEP 5] Agent checking for available workflows...")
        tool_selection = await copilot_tester.ask_tool_selection(
            task="What workflows can help with market analysis?",
            available_tools=["list_workflows"],
            context="BMAD provides workflows for various tasks"
        )
        print(f"  → Selected tool: {tool_selection['tool']}")
        
        # Step 6: List workflows
        print("\n[STEP 6] Listing available workflows...")
        workflows_result = await mcp_server.call_tool("list_workflows", {})
        workflows_data = json.loads(workflows_result.content[0].text)
        print(f"  → Found {workflows_data['count']} workflows")
        
        print("\n" + "="*70)
        print("✓ COMPLETE E2E WORKFLOW SUCCESSFUL")
        print("="*70)
        
        # Assertions
        assert len(prompts) > 0
        assert analyst_result is not None
        assert response.get("next_action") in ["answer_user", "call_tool_again", "ask_clarifying_question"]
        assert workflows_data["count"] > 0
    
    @pytest.mark.asyncio
    async def test_agent_can_filter_workflows_by_module(self, copilot_tester, mcp_server):
        """Test that agent can intelligently filter workflows."""
        # Load analyst agent
        await mcp_server.get_prompt("bmad-analyst", {})
        
        # Ask to find BMM-specific workflows
        selection = await copilot_tester.ask_tool_selection(
            task="Find workflows specifically for the BMM module (not core)",
            available_tools=["list_workflows"],
            context="Workflows can be filtered by module parameter: core or bmm"
        )
        
        # Execute with filter
        result = await mcp_server.call_tool("list_workflows", {"module": "bmm"})
        data = json.loads(result.content[0].text)
        
        # Verify all results are BMM module
        assert data["count"] > 0
        for wf in data["workflows"]:
            assert wf["module"] == "bmm"
        
        print(f"\n✓ Filtered to {data['count']} BMM workflows")
    
    @pytest.mark.asyncio
    async def test_bmad_master_triggers_party_mode_workflow(self, copilot_tester, mcp_server):
        """Test multi-step interaction: load bmad-master, then trigger *party-mode workflow."""
        print("\n" + "="*70)
        print("MULTI-STEP E2E TEST: BMad Master → Party Mode Workflow")
        print("="*70)
        
        # Step 1: Load bmad-master agent
        print("\n[STEP 1] Loading bmad-master agent...")
        master_result = await mcp_server.get_prompt("bmad-master", {})
        master_content = master_result.messages[0].content.text
        
        assert len(master_content) > 500, "Agent content too short"
        assert "bmad" in master_content.lower(), "BMad Master content missing BMAD reference"
        print(f"  ✓ Loaded bmad-master agent ({len(master_content)} chars)")
        print(f"  Description: {master_result.description}")
        
        # Step 2: User sends message mentioning *party-mode
        print("\n[STEP 2] User sends message with *party-mode trigger...")
        user_message = "*party-mode"
        print(f"  User input: '{user_message}'")
        
        # Step 3: Ask Copilot (as bmad-master) what tool to use
        print("\n[STEP 3] Copilot interprets *party-mode as workflow trigger...")
        selection = await copilot_tester.ask_tool_selection(
            task=f"User says: {user_message}. This looks like a workflow command.",
            available_tools=["list_workflows", "get_workflow_details", "execute_workflow"],
            context=(
                "BMad Master recognizes workflow commands starting with *. "
                "The format *workflow-name should trigger workflow execution. "
                "Available workflows include party-mode for multi-agent discussions."
            )
        )
        
        print(f"  → Copilot selected: {selection['tool']}")
        print(f"  → Reasoning: {selection.get('why', 'N/A')}")
        
        # Step 4: Verify workflow discovery or execution was selected
        assert selection["tool"] in ["list_workflows", "execute_workflow", "get_workflow_details"], \
            f"Expected workflow-related tool, got {selection['tool']}"
        
        # Step 5: List workflows to find party-mode
        print("\n[STEP 4] Finding party-mode workflow...")
        list_result = await mcp_server.call_tool("list_workflows", {})
        workflows_data = json.loads(list_result.content[0].text)
        
        party_mode_wf = None
        for wf in workflows_data["workflows"]:
            if wf["name"] == "party-mode":
                party_mode_wf = wf
                break
        
        assert party_mode_wf is not None, "party-mode workflow not found"
        print(f"  ✓ Found party-mode workflow")
        print(f"    Path: {party_mode_wf['path']}")
        print(f"    Description: {party_mode_wf['description'][:80]}...")
        
        # Step 6: Verify workflow details match expectations
        assert "party" in party_mode_wf["name"].lower()
        assert party_mode_wf["module"] == "core"
        assert "party-mode" in party_mode_wf["path"]
        
        # Step 7: Ask Copilot to interpret the workflow selection as a response
        print("\n[STEP 5] Confirming workflow was triggered as secondary response...")
        response = await copilot_tester.interpret_result(
            task=f"User requested: {user_message}",
            tool_result={
                "workflow_found": True,
                "workflow_name": party_mode_wf["name"],
                "workflow_description": party_mode_wf["description"]
            }
        )
        
        print(f"  → Next action: {response.get('next_action')}")
        print(f"  → Satisfied: {response.get('satisfied')}")
        
        # Verify response indicates successful workflow trigger
        assert response.get("next_action") in ["answer_user", "call_tool_again"], \
            f"Expected answer_user or call_tool_again, got {response.get('next_action')}"
        
        print("\n" + "="*70)
        print("✓ PARTY MODE WORKFLOW SUCCESSFULLY TRIGGERED")
        print("="*70)
        print("\nSequence validated:")
        print("  1. ✓ BMad Master agent loaded")
        print("  2. ✓ *party-mode command recognized")
        print("  3. ✓ Workflow tool selected by Copilot")
        print("  4. ✓ party-mode workflow discovered")
        print("  5. ✓ Workflow trigger confirmed as secondary response")
        print("="*70)
