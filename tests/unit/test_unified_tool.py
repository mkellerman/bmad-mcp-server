"""
Tests for unified BMAD tool.

Tests the instruction-based routing, error handling, and validation.
"""

import pytest
from pathlib import Path
from src.unified_tool import UnifiedBMADTool, ValidationResult


@pytest.fixture
def bmad_root():
    """Get BMAD root directory."""
    return Path(__file__).parent.parent.parent


@pytest.fixture
def unified_tool(bmad_root):
    """Create unified tool instance."""
    return UnifiedBMADTool(bmad_root)


class TestCommandParsing:
    """Test command parsing logic."""

    def test_empty_command_loads_default(self, unified_tool):
        """Empty command should load bmad-master."""
        command_type, name = unified_tool._parse_command("")
        assert command_type == "agent"
        # Empty gets normalized to default in execute()

    def test_agent_command_parsed(self, unified_tool):
        """Agent command should be parsed correctly."""
        command_type, name = unified_tool._parse_command("analyst")
        assert command_type == "agent"
        assert name == "analyst"

    def test_workflow_command_parsed(self, unified_tool):
        """Workflow command should be parsed correctly."""
        command_type, name = unified_tool._parse_command("*party-mode")
        assert command_type == "workflow"
        assert name == "party-mode"

    def test_double_asterisk_error(self, unified_tool):
        """Double asterisk should return error."""
        command_type, result = unified_tool._parse_command("**party-mode")
        assert command_type == "error"
        assert isinstance(result, ValidationResult)
        assert result.error_code == "INVALID_ASTERISK_COUNT"

    def test_asterisk_only_error(self, unified_tool):
        """Asterisk without name should return error."""
        command_type, result = unified_tool._parse_command("*")
        assert command_type == "error"
        assert isinstance(result, ValidationResult)
        assert result.error_code == "MISSING_WORKFLOW_NAME"

    def test_multiple_arguments_error(self, unified_tool):
        """Multiple arguments should return error."""
        command_type, result = unified_tool._parse_command("analyst architect")
        assert command_type == "error"
        assert isinstance(result, ValidationResult)
        assert result.error_code == "TOO_MANY_ARGUMENTS"


class TestSecurity:
    """Test security validation."""

    def test_dangerous_characters_rejected(self, unified_tool):
        """Dangerous characters should be rejected."""
        validation = unified_tool._check_security("analyst; rm -rf /")
        assert not validation.valid
        assert validation.error_code == "INVALID_CHARACTERS"

    def test_non_ascii_rejected(self, unified_tool):
        """Non-ASCII characters should be rejected."""
        validation = unified_tool._check_security("café")
        assert not validation.valid
        assert validation.error_code == "NON_ASCII_CHARACTERS"

    def test_safe_input_accepted(self, unified_tool):
        """Safe input should pass security check."""
        validation = unified_tool._check_security("analyst")
        assert validation.valid


class TestNameValidation:
    """Test name validation logic."""

    def test_valid_agent_name(self, unified_tool):
        """Valid agent name should pass validation."""
        validation = unified_tool._validate_name("analyst", "agent")
        assert validation.valid

    def test_valid_workflow_name(self, unified_tool):
        """Valid workflow name should pass validation."""
        # Find a workflow from manifest
        if unified_tool.workflows:
            workflow_name = unified_tool.workflows[0].get('name', 'party-mode')
            validation = unified_tool._validate_name(workflow_name, "workflow")
            assert validation.valid

    def test_name_too_short(self, unified_tool):
        """Name shorter than 2 characters should be rejected."""
        validation = unified_tool._validate_name("a", "agent")
        assert not validation.valid
        assert validation.error_code == "NAME_TOO_SHORT"

    def test_name_too_long(self, unified_tool):
        """Name longer than 50 characters should be rejected."""
        long_name = "a" * 51
        validation = unified_tool._validate_name(long_name, "agent")
        assert not validation.valid
        assert validation.error_code == "NAME_TOO_LONG"

    def test_invalid_agent_format(self, unified_tool):
        """Invalid agent name format should be rejected."""
        validation = unified_tool._validate_name("Analyst", "agent")
        assert not validation.valid
        assert validation.error_code == "INVALID_NAME_FORMAT"

    def test_unknown_agent(self, unified_tool):
        """Unknown agent name should be rejected."""
        validation = unified_tool._validate_name("unknown-agent-xyz", "agent")
        assert not validation.valid
        assert validation.error_code == "UNKNOWN_AGENT"

    def test_unknown_workflow(self, unified_tool):
        """Unknown workflow name should be rejected."""
        validation = unified_tool._validate_name("unknown-workflow-xyz", "workflow")
        assert not validation.valid
        assert validation.error_code == "UNKNOWN_WORKFLOW"


class TestFuzzyMatching:
    """Test fuzzy matching for suggestions."""

    def test_close_match_found(self, unified_tool):
        """Close match should be suggested."""
        # "analist" is close to "analyst"
        match = unified_tool._find_closest_match("analist", ["analyst", "architect", "dev"])
        assert match == "analyst"

    def test_no_close_match(self, unified_tool):
        """No close match should return None."""
        match = unified_tool._find_closest_match("xyz123", ["analyst", "architect", "dev"])
        assert match is None

    def test_case_mismatch_detected(self, unified_tool):
        """Case mismatch should be detected."""
        match = unified_tool._check_case_mismatch("Analyst", ["analyst", "architect"])
        assert match == "analyst"


@pytest.mark.asyncio
class TestExecution:
    """Test command execution."""

    async def test_empty_command_loads_bmad_master(self, unified_tool):
        """Empty command should load bmad-master."""
        result = await unified_tool.execute("")
        assert result.get('success') == True
        assert result.get('type') == 'agent'
        assert result.get('agent_name') == 'bmad-master'

    async def test_load_valid_agent(self, unified_tool):
        """Valid agent name should load agent."""
        result = await unified_tool.execute("analyst")
        assert result.get('success') == True
        assert result.get('type') == 'agent'
        assert result.get('agent_name') == 'analyst'

    async def test_execute_workflow(self, unified_tool):
        """Valid workflow command should execute workflow."""
        # Find a workflow from manifest
        if unified_tool.workflows:
            workflow_name = unified_tool.workflows[0].get('name', 'party-mode')
            result = await unified_tool.execute(f"*{workflow_name}")
            assert result.get('success') == True
            assert result.get('type') == 'workflow'
            assert result.get('name') == workflow_name

    async def test_invalid_command_returns_error(self, unified_tool):
        """Invalid command should return error."""
        result = await unified_tool.execute("analyst; rm -rf /")
        assert result.get('success') == False
        assert result.get('error_code') == 'INVALID_CHARACTERS'

    async def test_unknown_agent_returns_error(self, unified_tool):
        """Unknown agent should return error with suggestions."""
        result = await unified_tool.execute("unknown-agent")
        assert result.get('success') == False
        assert result.get('error_code') == 'UNKNOWN_AGENT'


class TestErrorMessages:
    """Test error message formatting."""

    def test_too_many_args_message(self, unified_tool):
        """Too many arguments error should be formatted correctly."""
        message = unified_tool._format_too_many_args_error(["analyst", "architect"])
        assert "Too many arguments" in message
        assert "analyst" in message
        assert "architect" in message

    def test_dangerous_chars_message(self, unified_tool):
        """Dangerous characters error should list characters."""
        message = unified_tool._format_dangerous_chars_error([";", "&"])
        assert "dangerous characters" in message.lower()
        assert ";" in message
        assert "&" in message

    def test_unknown_agent_message(self, unified_tool):
        """Unknown agent error should show available agents."""
        message = unified_tool._format_unknown_agent_error("xyz", None)
        assert "Unknown agent" in message
        assert "Available agents:" in message

    def test_unknown_agent_with_suggestion(self, unified_tool):
        """Unknown agent with suggestion should show suggestion."""
        message = unified_tool._format_unknown_agent_error("analist", "analyst")
        assert "Did you mean: analyst?" in message

    def test_missing_asterisk_message(self, unified_tool):
        """Missing asterisk error should explain prefix requirement."""
        # Need a workflow name that exists
        if unified_tool.workflows:
            workflow_name = unified_tool.workflows[0].get('name', 'party-mode')
            message = unified_tool._format_missing_asterisk_error(workflow_name)
            assert "asterisk (*) prefix" in message.lower()
            assert f"bmad *{workflow_name}" in message


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
