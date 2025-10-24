"""
E2E tests for agent activation - DECLARATIVE VERSION

Converted from test_copilot_agent_activation.py to use the new
declarative testing framework for simpler, more readable tests.

Original: test_copilot_agent_activation.py
Framework: tests/utils/e2e_framework.py
Guide: QA_TESTING_GUIDE.md
"""

import pytest
from pathlib import Path

from tests.utils.e2e_framework import (
    E2ETest,
    E2EScenario,
    quick_test,
    test_sequence as run_sequence,
    agent_loaded
)


@pytest.mark.e2e
class TestAgentActivationDeclarative:
    """Agent activation tests using declarative framework."""
    
    @pytest.fixture
    def mcp_server(self):
        """Create MCP server instance."""
        project_root = Path(__file__).parent.parent.parent
        from src.mcp_server import BMADMCPServer
        return BMADMCPServer(project_root)
    
    # ==================================================================
    # Basic Agent Loading
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_load_analyst_agent(self, mcp_server):
        """Load analyst agent and verify basic content."""
        test = E2ETest("Load analyst agent")
        
        test.step(
            "analyst",
            description="Load analyst agent (Mary)",
            contains=["analyst", "Mary"],
            min_length=500
        )
        
        result = await test.run(mcp_server)
        assert result, "Analyst agent should load successfully"
    
    @pytest.mark.asyncio
    async def test_load_all_core_agents(self, mcp_server):
        """Test loading all core BMAD agents."""
        result = await quick_test(mcp_server, [
            ("analyst", ["analyst", "Mary"]),
            ("architect", ["architect"]),
            ("dev", ["dev"]),
            ("pm", ["product"])
        ], test_name="Load all core agents")
        
        assert result, "All core agents should load"
    
    # ==================================================================
    # Agent Switching
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_agent_switching_workflow(self, mcp_server):
        """
        Test switching between agents in a workflow:
        Analyst → Architect → Dev
        """
        test = E2ETest(
            "Agent switching workflow",
            "Switch from analyst to architect to dev"
        )
        
        # Start with analyst
        test.step(
            "analyst",
            description="Load analyst for requirements",
            contains=["analyst", "Mary"],
            min_length=500
        )
        
        # Switch to architect
        test.step(
            "architect",
            description="Switch to architect for design",
            contains=["architect"],
            not_contains=["analyst"],  # Should not show analyst anymore
            min_length=500
        )
        
        # Switch to dev
        test.step(
            "dev",
            description="Switch to developer for implementation",
            contains=["dev"],
            not_contains=["architect"],  # Should not show architect anymore
            min_length=500
        )
        
        result = await test.run(mcp_server)
        assert result, "Agent switching should work smoothly"
    
    # ==================================================================
    # BMad Master & Workflow Discovery
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_bmad_master_loads(self, mcp_server):
        """Test that bmad-master agent loads with empty command."""
        test = E2ETest("Load bmad-master agent")
        
        test.step(
            "",  # Empty command loads bmad-master
            description="Load bmad-master with empty command",
            contains=["bmad"],
            min_length=500
        )
        
        result = await test.run(mcp_server)
        assert result
    
    @pytest.mark.asyncio
    async def test_workflow_execution(self, mcp_server):
        """Test executing a workflow via bmad tool."""
        test = E2ETest("Execute workflow")
        
        # Load bmad-master first
        test.step(
            "",
            description="Load bmad-master",
            contains=["bmad"],
            min_length=500
        )
        
        # Execute workflow-status workflow
        test.step(
            "*workflow-status",
            description="Execute workflow-status",
            contains=["workflow"],
            min_length=100
        )
        
        result = await test.run(mcp_server)
        assert result
    
    # ==================================================================
    # Complete Workflows
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_complete_analyst_workflow(self, mcp_server):
        """
        Complete analyst workflow:
        1. Load analyst
        2. Check workflow status
        3. Verify agent menu interaction
        """
        test = E2ETest(
            "Complete analyst workflow",
            "Full workflow from loading analyst to executing workflows"
        )
        
        # Step 1: Load analyst agent
        test.step(
            "analyst",
            description="Load analyst agent",
            contains=["analyst", "Mary", "requirements"],
            min_length=500
        )
        
        # Step 2: Execute workflow-status
        test.step(
            "*workflow-status",
            description="Check workflow status",
            contains=["workflow"],
            min_length=100
        )
        
        result = await test.run(mcp_server)
        assert result
        
        # Print summary for visibility
        test.print_summary()
    
    @pytest.mark.asyncio
    async def test_full_product_development_flow(self, mcp_server):
        """
        Real-world scenario: Complete product development flow
        Analyst → Architect → PM → Dev
        """
        scenario = E2EScenario(
            "Product Development Flow",
            "Complete flow from requirements to implementation"
        )
        
        # Phase 1: Requirements gathering with analyst
        requirements_test = E2ETest("Requirements gathering")
        requirements_test.step(
            "analyst",
            description="Gather requirements",
            contains=["analyst", "requirements"]
        )
        requirements_test.step(
            "*workflow-status",
            description="Check workflow status",
            contains=["workflow"]
        )
        scenario.add_test(requirements_test)
        
        # Phase 2: System design with architect
        design_test = E2ETest("System design")
        design_test.step(
            "architect",
            description="Design system architecture",
            contains=["architect"]
        )
        scenario.add_test(design_test)
        
        # Phase 3: Project planning with PM
        planning_test = E2ETest("Project planning")
        planning_test.step(
            "pm",
            description="Plan project execution",
            contains=["product", "manager"]
        )
        scenario.add_test(planning_test)
        
        # Phase 4: Implementation with developer
        implementation_test = E2ETest("Implementation")
        implementation_test.step(
            "dev",
            description="Implement features",
            contains=["dev"]
        )
        scenario.add_test(implementation_test)
        
        # Run complete scenario
        result = await scenario.run_all(mcp_server)
        assert result, "Complete product flow should succeed"
    
    # ==================================================================
    # Error Handling
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_invalid_agent_handling(self, mcp_server):
        """Test that invalid agent commands are handled gracefully."""
        test = E2ETest("Invalid agent handling")
        
        # Valid agent first
        test.step(
            "analyst",
            description="Load valid agent",
            contains=["analyst"]
        )
        
        # Invalid agent - should produce error
        test.step(
            "invalid-agent-xyz",
            description="Try invalid agent",
            contains=["error", "unknown"],
            min_length=50
        )
        
        result = await test.run(mcp_server)
        assert result
    
    # ==================================================================
    # Custom Validators
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_agent_loading_with_custom_validator(self, mcp_server):
        """Test agent loading using custom validator."""
        test = E2ETest("Agent loading with validator")
        
        test.step(
            "analyst",
            description="Load analyst with custom validation",
            custom_validator=agent_loaded("analyst")
        )
        
        result = await test.run(mcp_server)
        assert result
    
    # ==================================================================
    # Quick Tests (Simplest Syntax)
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_quick_agent_sequence(self, mcp_server):
        """Quick test of common agent sequence."""
        result = await quick_test(mcp_server, [
            ("analyst", ["Mary", "analyst"]),
            ("*workflow-status", ["workflow"]),
            ("architect", ["architect"]),
            ("dev", ["dev"])
        ], test_name="Quick agent sequence")
        
        assert result
    
    @pytest.mark.asyncio
    async def test_simple_command_sequence(self, mcp_server):
        """Just verify commands execute successfully."""
        result = await run_sequence(mcp_server, [
            "analyst",
            "*workflow-status",
            "pm"
        ])
        
        assert result
    
    # ==================================================================
    # Method Chaining
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_chained_workflow(self, mcp_server):
        """Test using method chaining syntax."""
        test = (
            E2ETest("Chained workflow")
            .step("analyst", contains=["analyst"])
            .step("*workflow-status", contains=["workflow"])
            .step("architect", contains=["architect"])
        )
        
        result = await test.run(mcp_server)
        assert result


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
