"""
Example E2E tests using the declarative framework.

Shows QA testers how to write simple, readable tests.
"""

import pytest
from pathlib import Path

from src.mcp_server import BMADMCPServer
from tests.utils.e2e_framework import (
    E2ETest,
    E2EScenario,
    quick_test,
    test_sequence as run_sequence,
    agent_loaded,
    workflow_executed
)


@pytest.mark.e2e
class TestDeclarativeExamples:
    """Example tests using declarative framework."""
    
    @pytest.fixture
    def mcp_server(self):
        """Create MCP server instance."""
        project_root = Path(__file__).parent.parent.parent / "src"
        return BMADMCPServer(project_root)
    
    # ==================================================================
    # Example 1: Simple step-by-step test
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_example_1_simple_steps(self, mcp_server):
        """
        Example 1: Simple declarative test.
        
        QA tester writes clear steps with validations.
        """
        test = E2ETest("Load analyst and check status")
        
        # Step 1: Load analyst agent
        test.step(
            "analyst",
            description="Load analyst agent",
            contains=["analyst", "Mary"],
            min_length=500
        )
        
        # Step 2: Execute workflow
        test.step(
            "*workflow-status",
            description="Check workflow status",
            contains=["workflow"],
            min_length=100
        )
        
        # Run the test
        result = await test.run(mcp_server)
        assert result, "Test should pass"
    
    # ==================================================================
    # Example 2: Multi-agent workflow
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_example_2_multi_agent(self, mcp_server):
        """
        Example 2: Multi-agent workflow test.
        
        Test agent switching scenario.
        """
        test = E2ETest(
            "Multi-agent workflow",
            "Test switching between analyst, architect, and dev"
        )
        
        test.step("analyst", contains=["analyst", "Mary"])
        test.step("architect", contains=["architect"])
        test.step("dev", contains=["dev"])
        
        result = await test.run(mcp_server)
        assert result
    
    # ==================================================================
    # Example 3: Using quick_test helper
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_example_3_quick_test(self, mcp_server):
        """
        Example 3: Quick test with helper function.
        
        Super simple syntax for basic validation.
        """
        result = await quick_test(mcp_server, [
            ("analyst", ["Mary", "analyst"]),
            ("*workflow-status", ["workflow"]),
            ("pm", ["John", "product"])
        ], test_name="Quick agent test")
        
        assert result
    
    # ==================================================================
    # Example 4: Test sequence helper
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_example_4_sequence(self, mcp_server):
        """
        Example 4: Test command sequence.
        
        Just validate that commands execute successfully.
        """
        result = await run_sequence(mcp_server, [
            "analyst",
            "*workflow-status",
            "pm"
        ])
        
        assert result
    
    # ==================================================================
    # Example 5: Custom validators
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_example_5_custom_validators(self, mcp_server):
        """
        Example 5: Using custom validators.
        
        Add custom validation logic when needed.
        """
        test = E2ETest("Custom validation test")
        
        # Use built-in validator
        test.step(
            "analyst",
            description="Load analyst with custom validation",
            custom_validator=agent_loaded("analyst")
        )
        
        # Use built-in workflow validator
        test.step(
            "*workflow-status",
            description="Execute workflow",
            custom_validator=workflow_executed()
        )
        
        result = await test.run(mcp_server)
        assert result
    
    # ==================================================================
    # Example 6: Negative testing (error validation)
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_example_6_error_validation(self, mcp_server):
        """
        Example 6: Test error handling.
        
        Validate that errors are handled correctly.
        """
        test = E2ETest("Error handling test")
        
        # Valid command
        test.step(
            "analyst",
            description="Load valid agent",
            contains=["analyst"]
        )
        
        # Invalid command - should contain error message
        test.step(
            "invalid-agent-xyz",
            description="Try invalid agent",
            contains=["error", "unknown"],
            min_length=50
        )
        
        result = await test.run(mcp_server)
        assert result
    
    # ==================================================================
    # Example 7: Scenario with multiple tests
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_example_7_scenario(self, mcp_server):
        """
        Example 7: Group related tests into a scenario.
        
        Organize tests for a complete user workflow.
        """
        scenario = E2EScenario(
            "Complete analyst workflow",
            "Full workflow from loading analyst to executing workflows"
        )
        
        # Test 1: Load analyst
        load_test = E2ETest("Load analyst agent")
        load_test.step("analyst", contains=["Mary", "analyst"])
        scenario.add_test(load_test)
        
        # Test 2: Execute workflow-status
        workflow_test = E2ETest("Execute workflow-status")
        workflow_test.step("*workflow-status", contains=["workflow"])
        scenario.add_test(workflow_test)
        
        # Test 3: Switch to PM
        pm_test = E2ETest("Switch to PM agent")
        pm_test.step("pm", contains=["John", "product"])
        scenario.add_test(pm_test)
        
        result = await scenario.run_all(mcp_server)
        assert result
    
    # ==================================================================
    # Example 8: Method chaining
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_example_8_method_chaining(self, mcp_server):
        """
        Example 8: Fluent interface with method chaining.
        
        Write tests in a single fluent chain.
        """
        test = (
            E2ETest("Chained test example")
            .step("analyst", contains=["analyst"])
            .step("*workflow-status", contains=["workflow"])
            .step("pm", contains=["product"])
        )
        
        result = await test.run(mcp_server)
        assert result
    
    # ==================================================================
    # Example 9: Content validation
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_example_9_content_validation(self, mcp_server):
        """
        Example 9: Detailed content validation.
        
        Check that specific strings are present or absent.
        """
        test = E2ETest("Content validation")
        
        test.step(
            "analyst",
            description="Load analyst - should NOT mention PM",
            contains=["analyst", "Mary"],
            not_contains=["John"],  # PM agent name
            min_length=500,
            max_length=10000
        )
        
        result = await test.run(mcp_server)
        assert result
    
    # ==================================================================
    # Example 10: Real-world workflow
    # ==================================================================
    
    @pytest.mark.asyncio
    async def test_example_10_real_world_workflow(self, mcp_server):
        """
        Example 10: Real-world product development workflow.
        
        Simulates actual user journey through BMAD system.
        """
        test = E2ETest(
            "Product development workflow",
            "Complete flow: requirements → design → implementation"
        )
        
        # 1. Start with analyst for requirements
        test.step(
            "analyst",
            description="Load analyst for requirements gathering",
            contains=["analyst", "requirements", "Mary"],
            min_length=500
        )
        
        # 2. Check workflow status
        test.step(
            "*workflow-status",
            description="Check current workflow status",
            contains=["workflow"],
            min_length=100
        )
        
        # 3. Switch to architect for design
        test.step(
            "architect",
            description="Switch to architect for system design",
            contains=["architect"],
            min_length=500
        )
        
        # 4. Switch to PM for planning
        test.step(
            "pm",
            description="Switch to PM for project planning",
            contains=["product", "manager"],
            min_length=500
        )
        
        # 5. Finally developer for implementation
        test.step(
            "dev",
            description="Switch to developer for implementation",
            contains=["dev"],
            min_length=500
        )
        
        result = await test.run(mcp_server)
        assert result
        
        # Print detailed summary
        test.print_summary()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
