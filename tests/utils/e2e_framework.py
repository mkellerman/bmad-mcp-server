"""
E2E Testing Framework for BMAD MCP Server.

Simple, declarative framework for QA testers to write E2E tests
using clear prompts and validations.

Example:
    test = E2ETest("Load analyst and execute workflow")
    test.step("analyst", contains=["analyst", "Mary"])
    test.step("*workflow-status", contains=["workflow", "status"])
    test.run()
"""

import asyncio
from typing import List, Optional, Dict, Any, Callable
from dataclasses import dataclass, field
from pathlib import Path

from tests.utils.copilot_tester import CopilotMCPTester


@dataclass
class TestStep:
    """Represents a single test step with validations."""
    
    command: str
    description: Optional[str] = None
    
    # Validation criteria
    contains: Optional[List[str]] = None
    not_contains: Optional[List[str]] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    should_succeed: bool = True
    custom_validator: Optional[Callable[[Dict[str, Any]], bool]] = None
    
    # Results
    result: Optional[Dict[str, Any]] = field(default=None, repr=False)
    passed: Optional[bool] = None
    error_message: Optional[str] = None


class E2ETest:
    """
    Declarative E2E test builder.
    
    Allows QA testers to write clear, readable tests without
    dealing with async/await or complex API details.
    
    Example:
        test = E2ETest("Multi-agent workflow")
        test.step("analyst", contains=["Mary", "analyst"])
        test.step("*workflow-status", contains=["workflow"])
        test.step("pm", contains=["John", "product"])
        
        await test.run(mcp_server)
        assert test.all_passed()
    """
    
    def __init__(self, name: str, description: str = ""):
        """
        Initialize E2E test.
        
        Args:
            name: Test name
            description: Optional detailed description
        """
        self.name = name
        self.description = description
        self.steps: List[TestStep] = []
        self.results: List[Dict[str, Any]] = []
    
    def step(
        self,
        command: str,
        description: str = None,
        contains: List[str] = None,
        not_contains: List[str] = None,
        min_length: int = None,
        max_length: int = None,
        should_succeed: bool = True,
        custom_validator: Callable[[Dict[str, Any]], bool] = None
    ) -> 'E2ETest':
        """
        Add a test step with validations.
        
        Args:
            command: Command to execute (e.g., "analyst", "*workflow-status")
            description: Optional step description
            contains: Strings that should appear in response
            not_contains: Strings that should NOT appear in response
            min_length: Minimum response length
            max_length: Maximum response length
            should_succeed: Whether command should succeed
            custom_validator: Custom validation function
            
        Returns:
            Self for method chaining
        """
        self.steps.append(TestStep(
            command=command,
            description=description,
            contains=contains,
            not_contains=not_contains,
            min_length=min_length,
            max_length=max_length,
            should_succeed=should_succeed,
            custom_validator=custom_validator
        ))
        return self
    
    async def run(self, mcp_server) -> bool:
        """
        Execute all test steps.
        
        Args:
            mcp_server: MCP server instance
            
        Returns:
            True if all steps passed
        """
        print(f"\n{'='*80}")
        print(f"E2E Test: {self.name}")
        if self.description:
            print(f"Description: {self.description}")
        print(f"{'='*80}")
        
        for i, step in enumerate(self.steps, 1):
            print(f"\n[Step {i}/{len(self.steps)}] {step.description or step.command}")
            print(f"  Command: {step.command}")
            
            try:
                # Execute command
                result = await mcp_server.call_tool("bmad", {"command": step.command})
                content = result.content[0].text if result.content else ""
                
                step.result = {
                    'content': content,
                    'length': len(content),
                    'raw_result': result
                }
                
                # Validate
                validation_passed, error_msg = self._validate_step(step)
                step.passed = validation_passed
                step.error_message = error_msg
                
                if validation_passed:
                    print(f"  ✅ PASSED")
                    if step.min_length:
                        print(f"     Length: {len(content)} chars")
                else:
                    print(f"  ❌ FAILED: {error_msg}")
                    
            except Exception as e:
                step.passed = False
                step.error_message = f"Exception: {str(e)}"
                print(f"  ❌ FAILED: {step.error_message}")
        
        # Summary
        print(f"\n{'='*80}")
        passed_count = sum(1 for s in self.steps if s.passed)
        print(f"Results: {passed_count}/{len(self.steps)} steps passed")
        print(f"{'='*80}\n")
        
        return self.all_passed()
    
    def _validate_step(self, step: TestStep) -> tuple[bool, Optional[str]]:
        """
        Validate a single step.
        
        Returns:
            (passed, error_message)
        """
        content = step.result['content']
        
        # Check if should succeed
        if step.should_succeed:
            if not content or len(content) == 0:
                return False, "Expected content but got empty response"
        else:
            if content and len(content) > 0:
                return False, "Expected failure but got success response"
        
        # Check contains
        if step.contains:
            for text in step.contains:
                if text.lower() not in content.lower():
                    return False, f"Expected to find '{text}' in response"
        
        # Check not_contains
        if step.not_contains:
            for text in step.not_contains:
                if text.lower() in content.lower():
                    return False, f"Did not expect to find '{text}' in response"
        
        # Check length
        if step.min_length and len(content) < step.min_length:
            return False, f"Response too short: {len(content)} < {step.min_length}"
        
        if step.max_length and len(content) > step.max_length:
            return False, f"Response too long: {len(content)} > {step.max_length}"
        
        # Custom validator
        if step.custom_validator:
            try:
                if not step.custom_validator(step.result):
                    return False, "Custom validation failed"
            except Exception as e:
                return False, f"Custom validator error: {str(e)}"
        
        return True, None
    
    def all_passed(self) -> bool:
        """Check if all steps passed."""
        return all(step.passed for step in self.steps)
    
    def get_step_result(self, index: int) -> Optional[Dict[str, Any]]:
        """Get result from specific step (0-indexed)."""
        if 0 <= index < len(self.steps):
            return self.steps[index].result
        return None
    
    def print_summary(self):
        """Print detailed summary of test results."""
        print(f"\n{'='*80}")
        print(f"Test Summary: {self.name}")
        print(f"{'='*80}")
        
        for i, step in enumerate(self.steps, 1):
            status = "✅ PASS" if step.passed else "❌ FAIL"
            print(f"\n{i}. {status} - {step.description or step.command}")
            print(f"   Command: {step.command}")
            
            if step.result:
                print(f"   Response length: {step.result['length']} chars")
            
            if step.error_message:
                print(f"   Error: {step.error_message}")
            
            if step.contains:
                print(f"   Required strings: {', '.join(step.contains)}")


class E2EScenario:
    """
    Collection of related E2E tests forming a scenario.
    
    Example:
        scenario = E2EScenario("Complete analyst workflow")
        
        scenario.add_test(
            E2ETest("Load analyst")
            .step("analyst", contains=["Mary", "analyst"])
        )
        
        scenario.add_test(
            E2ETest("Execute workflow")
            .step("*workflow-status", contains=["workflow"])
        )
        
        await scenario.run_all(mcp_server)
    """
    
    def __init__(self, name: str, description: str = ""):
        """Initialize scenario."""
        self.name = name
        self.description = description
        self.tests: List[E2ETest] = []
    
    def add_test(self, test: E2ETest) -> 'E2EScenario':
        """Add a test to the scenario."""
        self.tests.append(test)
        return self
    
    async def run_all(self, mcp_server) -> bool:
        """Run all tests in the scenario."""
        print(f"\n{'#'*80}")
        print(f"# E2E Scenario: {self.name}")
        if self.description:
            print(f"# {self.description}")
        print(f"{'#'*80}")
        
        results = []
        for test in self.tests:
            passed = await test.run(mcp_server)
            results.append(passed)
        
        # Overall summary
        print(f"\n{'#'*80}")
        print(f"# Scenario Summary: {self.name}")
        print(f"# Tests passed: {sum(results)}/{len(results)}")
        print(f"{'#'*80}\n")
        
        return all(results)


# Convenience functions for simple tests

async def quick_test(
    mcp_server,
    steps: List[tuple],
    test_name: str = "Quick E2E Test"
) -> bool:
    """
    Run a quick test with simple syntax.
    
    Args:
        mcp_server: MCP server instance
        steps: List of (command, contains_list) tuples
        test_name: Test name
        
    Example:
        await quick_test(mcp_server, [
            ("analyst", ["Mary", "analyst"]),
            ("*workflow-status", ["workflow"]),
            ("pm", ["John", "product manager"])
        ])
    """
    test = E2ETest(test_name)
    
    for step_data in steps:
        if len(step_data) == 2:
            command, contains = step_data
            test.step(command, contains=contains)
        elif len(step_data) == 3:
            command, contains, description = step_data
            test.step(command, description=description, contains=contains)
    
    return await test.run(mcp_server)


async def test_sequence(
    mcp_server,
    commands: List[str],
    test_name: str = "Command Sequence Test"
) -> bool:
    """
    Test a simple sequence of commands.
    
    Args:
        mcp_server: MCP server instance
        commands: List of commands to execute
        test_name: Test name
        
    Example:
        await test_sequence(mcp_server, [
            "analyst",
            "*workflow-status",
            "pm",
            "*prd"
        ])
    """
    test = E2ETest(test_name)
    
    for cmd in commands:
        test.step(cmd, min_length=100)
    
    return await test.run(mcp_server)


# Validation helpers

def agent_loaded(agent_name: str) -> Callable:
    """Create validator to check if agent loaded correctly."""
    def validator(result: Dict[str, Any]) -> bool:
        content = result['content'].lower()
        return agent_name.lower() in content and len(content) > 500
    return validator


def workflow_executed() -> Callable:
    """Create validator to check if workflow executed."""
    def validator(result: Dict[str, Any]) -> bool:
        content = result['content']
        return len(content) > 100
    return validator


def error_occurred() -> Callable:
    """Create validator to check if error occurred."""
    def validator(result: Dict[str, Any]) -> bool:
        content = result['content'].lower()
        return 'error' in content or 'invalid' in content
    return validator
