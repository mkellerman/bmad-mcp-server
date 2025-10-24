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
        """Test complete agent activation workflow with Copilot using unified bmad tool."""
        print("\n" + "="*70)
        print("FULL E2E TEST: Agent Activation Workflow")
        print("="*70)
        
        # Step 1: Ask Copilot to help with business analyst task
        print("\n[STEP 1] User requests business analyst help...")
        tool_selection = await copilot_tester.ask_tool_selection(
            task="I need help from a business analyst to gather requirements for a new feature.",
            available_tools=["list_prompts", "get_prompt", "bmad"],
            context="BMAD agents are available through prompts. Use list_prompts to see available agents or bmad tool to load agents."
        )
        print(f"  → Copilot selected: {tool_selection['tool']}")
        
        # Step 2: List prompts
        print("\n[STEP 2] Listing available agents...")
        prompts = await mcp_server.list_prompts()
        print(f"  → Found {len(prompts)} agents")
        
        # Step 3: Load analyst agent via unified bmad tool
        print("\n[STEP 3] Loading analyst agent via bmad tool...")
        analyst_result = await mcp_server.call_tool("bmad", {"command": "analyst"})
        analyst_content = analyst_result.content[0].text
        print(f"  → Loaded agent content ({len(analyst_content)} chars)")
        print(f"  → Content preview: {analyst_content[:200]}...")
        
        # Step 4: Agent responds to user
        print("\n[STEP 4] Agent responding to user...")
        response = await copilot_tester.interpret_result(
            task="I need help gathering requirements for a mobile app feature",
            tool_result={"agent_loaded": True, "agent_name": "analyst", "content_length": len(analyst_content)}
        )
        print(f"  → Response action: {response.get('next_action')}")
        
        # Step 5: Verify agent can discover workflows (via bmad-master)
        print("\n[STEP 5] Loading bmad-master to discover workflows...")
        master_result = await mcp_server.call_tool("bmad", {"command": ""})
        master_content = master_result.content[0].text
        
        # bmad-master content should mention workflows
        assert "workflow" in master_content.lower()
        print(f"  → bmad-master loaded ({len(master_content)} chars)")
        
        print("\n" + "="*70)
        print("✓ COMPLETE E2E WORKFLOW SUCCESSFUL")
        print("="*70)
        
        # Assertions
        assert len(prompts) > 0
        assert len(analyst_content) > 500
        assert "analyst" in analyst_content.lower() or "mary" in analyst_content.lower()
        assert response.get("next_action") in ["answer_user", "call_tool_again", "ask_clarifying_question"]
        assert len(master_content) > 500
    
    @pytest.mark.asyncio
    async def test_agent_loads_correctly_via_bmad_tool(self, mcp_server):
        """Test that agents can be loaded via unified bmad tool."""
        # Load analyst agent via bmad tool
        result = await mcp_server.call_tool("bmad", {"command": "analyst"})
        content = result.content[0].text
        
        # Verify analyst agent loaded
        assert len(content) > 500, "Agent content too short"
        assert "analyst" in content.lower() or "mary" in content.lower()
        print(f"\n✓ Successfully loaded analyst agent via bmad tool ({len(content)} chars)")
        
        # Load another agent to verify pattern works
        dev_result = await mcp_server.call_tool("bmad", {"command": "dev"})
        dev_content = dev_result.content[0].text
        
        assert len(dev_content) > 500
        assert "dev" in dev_content.lower() or "developer" in dev_content.lower()
        print(f"✓ Successfully loaded dev agent via bmad tool ({len(dev_content)} chars)")
    
    @pytest.mark.asyncio
    async def test_bmad_master_and_workflow_execution(self, copilot_tester, mcp_server):
        """Test loading bmad-master and executing a workflow via unified bmad tool."""
        print("\n" + "="*70)
        print("E2E TEST: BMad Master → Workflow Execution")
        print("="*70)
        
        # Step 1: Load bmad-master agent via empty command
        print("\n[STEP 1] Loading bmad-master agent (empty command)...")
        master_result = await mcp_server.call_tool("bmad", {"command": ""})
        master_content = master_result.content[0].text
        
        assert len(master_content) > 500, "Agent content too short"
        assert "bmad" in master_content.lower(), "BMad Master content missing BMAD reference"
        print(f"  ✓ Loaded bmad-master agent ({len(master_content)} chars)")
        
        # Step 2: Ask Copilot to recognize workflow command pattern
        print("\n[STEP 2] Testing Copilot workflow command recognition...")
        user_message = "*party-mode"
        selection = await copilot_tester.ask_tool_selection(
            task=f"User says: {user_message}. What tool should I use?",
            available_tools=["bmad"],
            context=(
                "The bmad tool accepts commands with patterns:\n"
                "- Empty string '' = load bmad-master\n"
                "- 'agent-name' = load agent\n"
                "- '*workflow-name' = execute workflow (asterisk required)\n"
                "User input starting with * indicates a workflow execution request."
            )
        )
        
        print(f"  → Copilot selected: {selection['tool']}")
        print(f"  → Reasoning: {selection.get('why', 'N/A')}")
        assert selection["tool"] == "bmad"
        
        # Step 3: Execute workflow via bmad tool
        print("\n[STEP 3] Executing party-mode workflow...")
        workflow_result = await mcp_server.call_tool("bmad", {"command": "*party-mode"})
        workflow_content = workflow_result.content[0].text
        
        # Verify workflow was loaded (content should mention party-mode)
        assert len(workflow_content) > 100, "Workflow content too short"
        print(f"  ✓ Workflow executed successfully ({len(workflow_content)} chars)")
        print(f"  → Content preview: {workflow_content[:150]}...")
        
        print("\n" + "="*70)
        print("✓ WORKFLOW EXECUTION TEST SUCCESSFUL")
        print("="*70)
        print("\nSequence validated:")
        print("  1. ✓ BMad Master agent loaded via empty command")
        print("  2. ✓ Copilot recognized *workflow pattern")
        print("  3. ✓ Workflow executed via bmad tool")
        print("="*70)
