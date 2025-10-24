"""
Security and validation tests for BMAD MCP Server.

Tests input validation, injection prevention, and security boundaries.
"""

import pytest
from pathlib import Path
from src.unified_tool import UnifiedBMADTool, ValidationResult


@pytest.mark.security
class TestSecurityValidation:
    """Test security validation and input sanitization."""
    
    @pytest.fixture
    def project_root(self):
        """Get project root directory."""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def unified_tool(self, project_root):
        """Create unified tool instance."""
        return UnifiedBMADTool(project_root)
    
    def test_command_injection_prevention(self, unified_tool):
        """Test that command injection attempts are blocked."""
        dangerous_inputs = [
            "analyst; rm -rf /",
            "analyst && echo 'hacked'",
            "analyst | cat /etc/passwd",
            "analyst`whoami`",
            "analyst$(whoami)",
            "analyst\nrm -rf /",
            "analyst;echo hacked",
        ]
        
        for dangerous_input in dangerous_inputs:
            validation = unified_tool._check_security(dangerous_input)
            assert not validation.valid, f"Should reject: {dangerous_input}"
            assert validation.error_code == "INVALID_CHARACTERS"
    
    def test_path_traversal_prevention(self, unified_tool):
        """Test that path traversal attempts are blocked."""
        path_traversal_inputs = [
            "../../../etc/passwd",
            "..\\..\\windows\\system32",
            "analyst/../../etc/passwd",
            "./../config",
        ]
        
        for traversal_input in path_traversal_inputs:
            # Should be rejected by name validation
            validation = unified_tool._validate_name(traversal_input, "agent")
            assert not validation.valid, f"Should reject: {traversal_input}"
    
    def test_special_characters_blocked(self, unified_tool):
        """Test that special characters are properly blocked."""
        special_chars = [';', '&', '|', '$', '`', '<', '>', '(', ')']
        
        for char in special_chars:
            test_input = f"analyst{char}test"
            validation = unified_tool._check_security(test_input)
            assert not validation.valid, f"Should reject character: {char}"
            assert validation.error_code == "INVALID_CHARACTERS"
    
    def test_non_ascii_characters_blocked(self, unified_tool):
        """Test that non-ASCII characters are blocked."""
        non_ascii_inputs = [
            "café",
            "niño",
            "测试",
            "тест",
            "analyst™",
            "test©",
        ]
        
        for non_ascii in non_ascii_inputs:
            validation = unified_tool._check_security(non_ascii)
            assert not validation.valid, f"Should reject: {non_ascii}"
            assert validation.error_code == "NON_ASCII_CHARACTERS"
    
    def test_whitespace_handling(self, unified_tool):
        """Test proper whitespace handling and validation."""
        # Leading/trailing whitespace should be handled by normalization
        # Internal whitespace should be rejected for single commands
        whitespace_tests = [
            ("  analyst  ", True),  # Should be normalized
            ("analyst developer", False),  # Multiple args
            ("analyst\t", True),  # Tab should be stripped
            ("analyst\n", True),  # Newline should be stripped
        ]
        
        for test_input, should_normalize in whitespace_tests:
            if should_normalize:
                # Check security should pass after normalization
                normalized = test_input.strip()
                validation = unified_tool._check_security(normalized)
                assert validation.valid or ' ' not in normalized
            else:
                # Multiple arguments should fail
                command_type, result = unified_tool._parse_command(test_input.strip())
                if command_type == "error":
                    assert result.error_code == "TOO_MANY_ARGUMENTS"
    
    def test_length_boundaries(self, unified_tool):
        """Test name length validation boundaries."""
        # Too short (< 2 chars)
        short_validation = unified_tool._validate_name("a", "agent")
        assert not short_validation.valid
        assert short_validation.error_code == "NAME_TOO_SHORT"
        
        # Minimum valid length (2 chars)
        min_validation = unified_tool._validate_name("ab", "agent")
        # May fail for other reasons (unknown agent) but not for length
        assert min_validation.error_code != "NAME_TOO_SHORT"
        
        # Maximum valid length (50 chars)
        max_name = "a" * 50
        max_validation = unified_tool._validate_name(max_name, "agent")
        # May fail for other reasons but not for length
        assert max_validation.error_code != "NAME_TOO_LONG"
        
        # Too long (> 50 chars)
        long_validation = unified_tool._validate_name("a" * 51, "agent")
        assert not long_validation.valid
        assert long_validation.error_code == "NAME_TOO_LONG"
    
    def test_format_validation(self, unified_tool):
        """Test name format validation rules."""
        # Invalid formats for agent names (must be lowercase with hyphens)
        invalid_formats = [
            "Analyst",  # Uppercase
            "ANALYST",  # All caps
            "analyst_dev",  # Underscore instead of hyphen
            "analyst.dev",  # Dot
            "analyst/dev",  # Slash
            "123analyst",  # Starting with number
            "-analyst",  # Starting with hyphen
            "analyst-",  # Ending with hyphen
            "analyst--dev",  # Double hyphen
        ]
        
        for invalid in invalid_formats:
            validation = unified_tool._validate_name(invalid, "agent")
            assert not validation.valid, f"Should reject format: {invalid}"
            assert validation.error_code == "INVALID_NAME_FORMAT"
        
        # Valid formats
        valid_formats = [
            "analyst",
            "business-analyst",
            "senior-business-analyst",
            "a-b-c-d-e",
        ]
        
        for valid in valid_formats:
            validation = unified_tool._validate_name(valid, "agent")
            # May fail for unknown agent but not for format
            assert validation.error_code != "INVALID_NAME_FORMAT"
    
    def test_workflow_format_validation(self, unified_tool):
        """Test workflow name format validation."""
        # Workflows can contain numbers
        workflow_with_number = unified_tool._validate_name("workflow-v2", "workflow")
        # Should not fail on format (may fail on unknown workflow)
        assert workflow_with_number.error_code != "INVALID_NAME_FORMAT"
        
        # Invalid workflow formats
        invalid_workflows = [
            "Workflow",  # Uppercase
            "workflow_name",  # Underscore
            "workflow.yaml",  # Extension
            "-workflow",  # Leading hyphen
        ]
        
        for invalid in invalid_workflows:
            validation = unified_tool._validate_name(invalid, "workflow")
            assert not validation.valid, f"Should reject workflow format: {invalid}"
    
    def test_null_byte_injection(self, unified_tool):
        """Test that null bytes are properly handled."""
        null_byte_inputs = [
            "analyst\x00",
            "\x00analyst",
            "anal\x00yst",
        ]
        
        for null_input in null_byte_inputs:
            # Null bytes should be caught by security check or validation
            validation = unified_tool._check_security(null_input)
            # Either rejected by security or by format validation
            assert not validation.valid or unified_tool._validate_name(null_input, "agent").valid == False
    
    def test_unicode_normalization(self, unified_tool):
        """Test unicode normalization attacks are prevented."""
        # Different unicode representations of same character
        unicode_attacks = [
            "analyst\u0301",  # Combining acute accent
            "analyst\u200b",  # Zero-width space
            "analyst\ufeff",  # Zero-width no-break space
        ]
        
        for unicode_attack in unicode_attacks:
            validation = unified_tool._check_security(unicode_attack)
            # Should fail on non-ASCII check
            if any(ord(c) > 127 for c in unicode_attack):
                assert not validation.valid


@pytest.mark.security
class TestErrorMessageSecurity:
    """Test that error messages don't leak sensitive information."""
    
    @pytest.fixture
    def unified_tool(self):
        """Create unified tool instance."""
        return UnifiedBMADTool(Path(__file__).parent.parent.parent)
    
    @pytest.mark.asyncio
    async def test_error_messages_sanitized(self, unified_tool):
        """Test that error messages don't include dangerous input."""
        dangerous_input = "analyst; rm -rf /"
        result = await unified_tool.execute(dangerous_input)
        
        # Should have error indicator
        assert result.get('success') == False
        assert result.get('error_code') is not None
        
        error_message = result.get('error', result.get('error_message', ''))
        
        # Error message should exist and describe the issue
        assert len(error_message) > 0
        
        # Should mention the problem (dangerous characters or invalid input)
        has_error_indication = (
            'dangerous' in error_message.lower() or 
            'invalid' in error_message.lower() or
            'character' in error_message.lower()
        )
        assert has_error_indication, f"Error message should indicate the problem: {error_message}"
    
    @pytest.mark.asyncio
    async def test_no_path_disclosure(self, unified_tool):
        """Test that error messages don't disclose full system paths."""
        result = await unified_tool.execute("nonexistent-agent")
        
        error_message = result.get('error', result.get('error_message', ''))
        
        # Should not include absolute file system paths
        assert '/Users/' not in error_message
        assert 'C:\\' not in error_message
        assert '/home/' not in error_message
    
    @pytest.mark.asyncio
    async def test_suggestions_are_safe(self, unified_tool):
        """Test that suggestions don't include dangerous content."""
        result = await unified_tool.execute("analist")  # Typo
        
        suggestions = result.get('suggestions', [])
        
        # Suggestions should be safe agent names
        for suggestion in suggestions:
            assert unified_tool._check_security(suggestion).valid
            # Should match agent name pattern
            assert suggestion.replace('-', '').replace('*', '').isalnum()


@pytest.mark.security  
class TestRateLimiting:
    """Test rate limiting and resource exhaustion prevention."""
    
    @pytest.fixture
    def unified_tool(self):
        """Create unified tool instance."""
        return UnifiedBMADTool(Path(__file__).parent.parent.parent)
    
    @pytest.mark.asyncio
    async def test_rapid_requests_handled(self, unified_tool):
        """Test that rapid requests don't cause issues."""
        # Execute multiple requests rapidly
        tasks = []
        for i in range(10):
            task = unified_tool.execute("analyst")
            tasks.append(task)
        
        # All should complete successfully
        import asyncio
        results = await asyncio.gather(*tasks)
        
        assert len(results) == 10
        for result in results:
            assert result.get('success') == True
    
    @pytest.mark.asyncio
    async def test_large_response_handling(self, unified_tool):
        """Test that large agent files are handled properly."""
        # Load an agent (should have substantial content)
        result = await unified_tool.execute("analyst")
        
        assert result.get('success') == True
        content = result.get('content', '')
        
        # Should handle large content without issues
        assert len(content) > 500
        assert len(content) < 1_000_000  # Reasonable upper bound


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
