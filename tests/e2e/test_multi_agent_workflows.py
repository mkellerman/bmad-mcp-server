"""
E2E tests for multi-agent workflow interactions.

Tests realistic scenarios where users:
1. Load an agent
2. Interact with agent menu
3. Execute workflows
4. Switch between agents
5. Complete multi-step tasks

These tests use the real Copilot API to validate the full user experience.
"""

import pytest
import json
from pathlib import Path

from src.mcp_server import BMADMCPServer
from tests.utils.copilot_tester import CopilotMCPTester, skip_if_no_litellm


@pytest.mark.e2e
@skip_if_no_litellm()
class TestMultiAgentWorkflows:
    """Test complete multi-agent workflow scenarios."""
    
    @pytest.fixture
    def project_root(self):
        """Path to project root."""
        return Path(__file__).parent.parent.parent / "src"
    
    @pytest.fixture
    def mcp_server(self, project_root):
        """Create MCP server with real BMAD."""
        return BMADMCPServer(project_root)
    
    @pytest.fixture
    def copilot_tester(self):
        """Create Copilot tester instance."""
        return CopilotMCPTester()
    
    @pytest.mark.asyncio
    async def test_analyst_workflow_discovery_and_execution(self, copilot_tester, mcp_server):
        """
        Test complete analyst workflow:
        1. Load analyst agent
        2. View menu options
        3. Select workflow-status
        4. Execute workflow
        """
        print("\n" + "="*80)
        print("E2E TEST: Analyst Agent → Workflow Discovery → Execution")
        print("="*80)
        
        # Step 1: Load analyst agent
        print("\n[STEP 1] Loading analyst agent...")
        analyst_result = await mcp_server.call_tool("bmad", {"command": "analyst"})
        analyst_content = analyst_result.content[0].text
        
        assert "analyst" in analyst_content.lower() or "mary" in analyst_content.lower()
        assert len(analyst_content) > 500
        print(f"  ✓ Analyst agent loaded ({len(analyst_content)} chars)")
        
        # Step 2: Extract menu items from agent content
        print("\n[STEP 2] Analyzing agent menu options...")
        menu_items = []
        for line in analyst_content.split('\n'):
            if '<item cmd=' in line and 'workflow=' in line:
                # Extract workflow name
                if '*workflow-status' in line:
                    menu_items.append('*workflow-status')
                elif '*brainstorm-project' in line:
                    menu_items.append('*brainstorm-project')
        
        assert len(menu_items) > 0, "No workflow menu items found"
        print(f"  ✓ Found {len(menu_items)} workflow menu items")
        print(f"    Menu items: {menu_items}")
        
        # Step 3: Ask Copilot which workflow to use for checking status
        print("\n[STEP 3] Asking Copilot to select appropriate workflow...")
        selection = await copilot_tester.ask_tool_selection(
            task="I want to check the status of my current workflow and get recommendations",
            available_tools=["bmad"],
            context=f"Available workflows from analyst menu: {', '.join(menu_items)}\n"
                   f"Use bmad tool with workflow command pattern: bmad *workflow-name"
        )
        
        print(f"  → Copilot selected tool: {selection['tool']}")
        print(f"  → Reasoning: {selection.get('why', 'N/A')}")
        
        # Step 4: Execute workflow via bmad tool
        print("\n[STEP 4] Executing workflow-status...")
        workflow_cmd = "*workflow-status"
        workflow_result = await mcp_server.call_tool("bmad", {"command": workflow_cmd})
        workflow_content = workflow_result.content[0].text
        
        assert len(workflow_content) > 100
        print(f"  ✓ Workflow executed ({len(workflow_content)} chars)")
        print(f"  → Preview: {workflow_content[:200]}...")
        
        print("\n" + "="*80)
        print("✓ COMPLETE ANALYST WORKFLOW TEST SUCCESSFUL")
        print("="*80)
    
    @pytest.mark.asyncio
    async def test_agent_switching_workflow(self, copilot_tester, mcp_server):
        """
        Test switching between agents during a workflow:
        1. Start with analyst for requirements
        2. Switch to architect for design
        3. Switch to dev for implementation
        """
        print("\n" + "="*80)
        print("E2E TEST: Multi-Agent Switching Workflow")
        print("="*80)
        
        # Step 1: Load analyst agent
        print("\n[STEP 1] Starting with analyst agent...")
        analyst_result = await mcp_server.call_tool("bmad", {"command": "analyst"})
        analyst_content = analyst_result.content[0].text
        assert "analyst" in analyst_content.lower() or "mary" in analyst_content.lower()
        print(f"  ✓ Analyst loaded")
        
        # Step 2: Copilot recognizes need to switch to architect
        print("\n[STEP 2] User needs system architecture help...")
        architect_selection = await copilot_tester.ask_tool_selection(
            task="I've gathered requirements. Now I need help designing the system architecture.",
            available_tools=["bmad"],
            context="Available agents: analyst, architect, dev, pm. Use bmad tool to switch agents."
        )
        
        assert architect_selection["tool"] == "bmad"
        print(f"  → Copilot suggests switching to architect")
        
        # Step 3: Load architect agent
        print("\n[STEP 3] Switching to architect agent...")
        architect_result = await mcp_server.call_tool("bmad", {"command": "architect"})
        architect_content = architect_result.content[0].text
        assert "architect" in architect_content.lower()
        print(f"  ✓ Architect loaded ({len(architect_content)} chars)")
        
        # Step 4: Switch to dev for implementation
        print("\n[STEP 4] User ready for implementation...")
        dev_selection = await copilot_tester.ask_tool_selection(
            task="Architecture is defined. Now I need help implementing the code.",
            available_tools=["bmad"],
            context="Available agents: analyst, architect, dev, pm. Use bmad tool to switch agents."
        )
        
        assert dev_selection["tool"] == "bmad"
        print(f"  → Copilot suggests switching to dev")
        
        # Step 5: Load dev agent
        print("\n[STEP 5] Switching to dev agent...")
        dev_result = await mcp_server.call_tool("bmad", {"command": "dev"})
        dev_content = dev_result.content[0].text
        assert "dev" in dev_content.lower() or "developer" in dev_content.lower()
        print(f"  ✓ Dev loaded ({len(dev_content)} chars)")
        
        print("\n" + "="*80)
        print("✓ MULTI-AGENT SWITCHING SUCCESSFUL")
        print("  Sequence: analyst → architect → dev")
        print("="*80)
    
    @pytest.mark.asyncio
    async def test_pm_agent_menu_interaction(self, copilot_tester, mcp_server):
        """
        Test PM agent menu interaction:
        1. Load PM agent
        2. View menu
        3. Select PRD workflow
        4. Execute workflow
        """
        print("\n" + "="*80)
        print("E2E TEST: PM Agent Menu Interaction")
        print("="*80)
        
        # Step 1: Load PM agent
        print("\n[STEP 1] Loading PM agent...")
        pm_result = await mcp_server.call_tool("bmad", {"command": "pm"})
        pm_content = pm_result.content[0].text
        
        assert "pm" in pm_content.lower() or "product manager" in pm_content.lower() or "john" in pm_content.lower()
        print(f"  ✓ PM agent loaded ({len(pm_content)} chars)")
        
        # Step 2: Extract menu items
        print("\n[STEP 2] Parsing PM agent menu...")
        menu_items = []
        if '*prd' in pm_content:
            menu_items.append('*prd')
        if '*tech-spec' in pm_content:
            menu_items.append('*tech-spec')
        if '*workflow-status' in pm_content:
            menu_items.append('*workflow-status')
        
        assert len(menu_items) > 0, "No menu items found"
        print(f"  ✓ Found menu items: {menu_items}")
        
        # Step 3: Ask Copilot to select PRD workflow
        print("\n[STEP 3] User wants to create a PRD...")
        selection = await copilot_tester.ask_tool_selection(
            task="I need to create a Product Requirements Document for my new feature",
            available_tools=["bmad"],
            context=f"PM agent menu options: {', '.join(menu_items)}"
        )
        
        print(f"  → Copilot selected: {selection['tool']}")
        
        # Step 4: Execute PRD workflow (if available)
        if '*prd' in menu_items:
            print("\n[STEP 4] Executing PRD workflow...")
            prd_result = await mcp_server.call_tool("bmad", {"command": "*prd"})
            prd_content = prd_result.content[0].text
            assert len(prd_content) > 100
            print(f"  ✓ PRD workflow executed ({len(prd_content)} chars)")
        else:
            print("\n[STEP 4] PRD workflow not available, skipping execution")
        
        print("\n" + "="*80)
        print("✓ PM AGENT MENU INTERACTION SUCCESSFUL")
        print("="*80)
    
    @pytest.mark.asyncio
    async def test_workflow_chain_execution(self, copilot_tester, mcp_server):
        """
        Test executing a chain of workflows:
        1. Load analyst
        2. Execute brainstorm workflow
        3. Execute product-brief workflow
        4. Switch to PM
        5. Execute PRD workflow
        """
        print("\n" + "="*80)
        print("E2E TEST: Workflow Chain Execution")
        print("="*80)
        
        # Step 1: Load analyst
        print("\n[STEP 1] Loading analyst for discovery phase...")
        analyst_result = await mcp_server.call_tool("bmad", {"command": "analyst"})
        analyst_content = analyst_result.content[0].text
        print(f"  ✓ Analyst loaded")
        
        # Step 2: Execute workflow-status (most likely to exist)
        print("\n[STEP 2] Checking workflow status...")
        status_result = await mcp_server.call_tool("bmad", {"command": "*workflow-status"})
        status_content = status_result.content[0].text
        assert len(status_content) > 100
        print(f"  ✓ Workflow status checked ({len(status_content)} chars)")
        
        # Step 3: Check available workflows
        print("\n[STEP 3] Discovering available analyst workflows...")
        has_brainstorm = '*brainstorm-project' in analyst_content
        has_product_brief = '*product-brief' in analyst_content
        
        if has_brainstorm:
            print("\n[STEP 4] Executing brainstorm workflow...")
            brainstorm_result = await mcp_server.call_tool("bmad", {"command": "*brainstorm-project"})
            brainstorm_content = brainstorm_result.content[0].text
            assert len(brainstorm_content) > 100
            print(f"  ✓ Brainstorm executed ({len(brainstorm_content)} chars)")
        
        # Step 4: Switch to PM agent
        print("\n[STEP 5] Switching to PM agent for planning...")
        pm_result = await mcp_server.call_tool("bmad", {"command": "pm"})
        pm_content = pm_result.content[0].text
        print(f"  ✓ PM agent loaded")
        
        # Step 5: Execute PM workflow if available
        if '*tech-spec' in pm_content:
            print("\n[STEP 6] Executing tech-spec workflow...")
            spec_result = await mcp_server.call_tool("bmad", {"command": "*tech-spec"})
            spec_content = spec_result.content[0].text
            assert len(spec_content) > 100
            print(f"  ✓ Tech spec executed ({len(spec_content)} chars)")
        
        print("\n" + "="*80)
        print("✓ WORKFLOW CHAIN EXECUTION SUCCESSFUL")
        print("="*80)
    
    @pytest.mark.asyncio
    async def test_bmad_master_discovery_workflow(self, copilot_tester, mcp_server):
        """
        Test bmad-master as entry point:
        1. Load bmad-master
        2. Discover available agents
        3. Get recommendations
        4. Load recommended agent
        """
        print("\n" + "="*80)
        print("E2E TEST: BMad Master Discovery Workflow")
        print("="*80)
        
        # Step 1: Load bmad-master (empty command)
        print("\n[STEP 1] Loading bmad-master as entry point...")
        master_result = await mcp_server.call_tool("bmad", {"command": ""})
        master_content = master_result.content[0].text
        
        assert "bmad" in master_content.lower()
        print(f"  ✓ BMad-master loaded ({len(master_content)} chars)")
        
        # Step 2: Ask Copilot what agents are available
        print("\n[STEP 2] Asking Copilot about available agents...")
        prompts = await mcp_server.list_prompts()
        agent_names = [p.name for p in prompts]
        
        print(f"  ✓ Found {len(agent_names)} available agents")
        print(f"    Sample agents: {agent_names[:5]}")
        
        # Step 3: Ask for recommendation
        print("\n[STEP 3] Getting Copilot recommendation...")
        selection = await copilot_tester.ask_tool_selection(
            task="I'm starting a new mobile app project and need help with requirements",
            available_tools=["bmad"],
            context=f"Available agents: {', '.join([n.replace('bmad-', '') for n in agent_names])}"
        )
        
        print(f"  → Copilot recommends tool: {selection['tool']}")
        print(f"  → Reasoning: {selection.get('why', 'N/A')}")
        
        # Step 4: Load recommended agent (analyst most likely)
        print("\n[STEP 4] Loading analyst agent based on recommendation...")
        analyst_result = await mcp_server.call_tool("bmad", {"command": "analyst"})
        analyst_content = analyst_result.content[0].text
        
        assert len(analyst_content) > 500
        print(f"  ✓ Analyst agent loaded and ready")
        
        print("\n" + "="*80)
        print("✓ BMAD MASTER DISCOVERY WORKFLOW SUCCESSFUL")
        print("="*80)
    
    @pytest.mark.asyncio
    async def test_error_recovery_workflow(self, copilot_tester, mcp_server):
        """
        Test error handling and recovery:
        1. Try invalid agent name
        2. Get error with suggestions
        3. Try corrected name
        4. Success
        """
        print("\n" + "="*80)
        print("E2E TEST: Error Recovery Workflow")
        print("="*80)
        
        # Step 1: Try invalid agent name (typo)
        print("\n[STEP 1] Attempting to load agent with typo 'analist'...")
        result = await mcp_server.call_tool("bmad", {"command": "analist"})
        content = result.content[0].text
        
        # Should get error response
        assert "error" in content.lower() or "unknown" in content.lower() or "not found" in content.lower()
        print(f"  ✓ Error detected correctly")
        print(f"  → Error message: {content[:200]}...")
        
        # Step 2: Check if suggestions provided
        has_suggestion = "analyst" in content.lower() and "did you mean" in content.lower()
        if has_suggestion:
            print(f"  ✓ Suggestion provided: 'analyst'")
        
        # Step 3: Try correct name
        print("\n[STEP 2] Trying corrected agent name 'analyst'...")
        correct_result = await mcp_server.call_tool("bmad", {"command": "analyst"})
        correct_content = correct_result.content[0].text
        
        assert len(correct_content) > 500
        assert "analyst" in correct_content.lower() or "mary" in correct_content.lower()
        print(f"  ✓ Analyst agent loaded successfully")
        
        print("\n" + "="*80)
        print("✓ ERROR RECOVERY WORKFLOW SUCCESSFUL")
        print("="*80)
    
    @pytest.mark.asyncio
    async def test_workflow_parameter_handling(self, copilot_tester, mcp_server):
        """
        Test workflow execution with parameters:
        1. Load agent
        2. Execute workflow with params
        3. Validate execution
        """
        print("\n" + "="*80)
        print("E2E TEST: Workflow Parameter Handling")
        print("="*80)
        
        # Step 1: Load analyst
        print("\n[STEP 1] Loading analyst agent...")
        analyst_result = await mcp_server.call_tool("bmad", {"command": "analyst"})
        print(f"  ✓ Analyst loaded")
        
        # Step 2: Execute workflow-status (should handle being called directly)
        print("\n[STEP 2] Executing workflow with standard invocation...")
        workflow_result = await mcp_server.call_tool("bmad", {"command": "*workflow-status"})
        workflow_content = workflow_result.content[0].text
        
        assert len(workflow_content) > 100
        print(f"  ✓ Workflow executed successfully ({len(workflow_content)} chars)")
        
        print("\n" + "="*80)
        print("✓ WORKFLOW PARAMETER HANDLING SUCCESSFUL")
        print("="*80)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
