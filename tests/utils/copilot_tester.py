"""
Copilot MCP Testing Utility

Provides a reusable framework for testing MCP tools and prompts using
GitHub Copilot's LLM to simulate real-world interactions.
"""

import json
from typing import Any, Dict, Optional
from jsonschema import validate, ValidationError

try:
    from litellm import completion
    LITELLM_AVAILABLE = True
except ImportError:
    LITELLM_AVAILABLE = False


class CopilotMCPTester:
    """
    Helper class for testing MCP server interactions using GitHub Copilot.
    
    This class provides methods to:
    - Ask Copilot to select appropriate MCP tools
    - Validate tool arguments and results against schemas
    - Interpret tool execution results
    
    Example:
        tester = CopilotMCPTester()
        result = await tester.test_tool_selection(
            task="List all BMAD agents",
            available_tools=["list_prompts", "list_tools"],
            tool_schemas={"list_prompts": {...}}
        )
    """
    
    def __init__(
        self,
        model: str = "github_copilot/gpt-4",
        temperature: float = 0,
        extra_headers: Optional[Dict[str, str]] = None
    ):
        """
        Initialize Copilot MCP Tester.
        
        Args:
            model: LiteLLM model identifier
            temperature: Sampling temperature (0 for deterministic)
            extra_headers: Additional headers for Copilot API
        """
        if not LITELLM_AVAILABLE:
            raise ImportError(
                "litellm is required for CopilotMCPTester. "
                "Install with: pip install litellm"
            )
        
        self.model = model
        self.temperature = temperature
        self.extra_headers = extra_headers or {
            "editor-version": "vscode/1.85.1",
            "Copilot-Integration-Id": "vscode-chat",
        }
    
    def extract_debug_json(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Extract DEBUG_JSON from LLM response.
        
        Args:
            text: LLM response text
            
        Returns:
            Parsed JSON dict or None if not found
        """
        for line in text.splitlines():
            if line.strip().startswith("DEBUG_JSON:"):
                raw = line.split("DEBUG_JSON:", 1)[1].strip()
                try:
                    return json.loads(raw)
                except Exception:
                    pass
        return None
    
    async def ask_tool_selection(
        self,
        task: str,
        available_tools: list[str],
        context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Ask Copilot to select an appropriate MCP tool for a task.
        
        Args:
            task: Natural language task description
            available_tools: List of available tool names
            context: Optional additional context about tools
            
        Returns:
            Dict with keys: tool, args, why, confidence
            
        Raises:
            ValueError: If Copilot doesn't provide expected response
        """
        tools_list = ", ".join(available_tools)
        system_rules = (
            f"You are an MCP-style agent helping test the BMAD MCP Server.\n"
            f"Available tools: {tools_list}\n"
            f"{context or ''}\n\n"
            "CRITICAL: You MUST respond with EXACTLY this format:\n"
            "DEBUG_JSON:{\"action\":{\"tool\":\"TOOL_NAME\",\"args\":{}},"
            "\"why\":\"...\",\"confidence\":0.9}\n\n"
            "Example: DEBUG_JSON:{\"action\":{\"tool\":\"list_prompts\",\"args\":{}},"
            "\"why\":\"Need to see available agents\",\"confidence\":0.9}\n\n"
            "No other text. No explanations. Just the DEBUG_JSON line."
        )
        
        response = completion(
            model=self.model,
            messages=[
                {"role": "assistant", "content": system_rules},
                {"role": "user", "content": task},
            ],
            extra_headers=self.extra_headers,
            temperature=self.temperature,
        )
        
        text = response["choices"][0]["message"]["content"]
        debug = self.extract_debug_json(text or "")
        
        if not debug:
            raise ValueError(f"No DEBUG_JSON found in response: {text}")
        
        action = debug.get("action", {})
        return {
            "tool": action.get("tool"),
            "args": action.get("args", {}),
            "why": debug.get("why", ""),
            "confidence": debug.get("confidence", 0.0),
            "raw_response": text
        }
    
    async def interpret_result(
        self,
        task: str,
        tool_result: Dict[str, Any],
        conversation_history: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Ask Copilot to interpret tool execution results.
        
        Args:
            task: Original task description
            tool_result: Result from tool execution
            conversation_history: Optional previous conversation messages
            
        Returns:
            Dict with keys: satisfied, updated_debug, next_action
        """
        interp_instr = (
            "Given this tool_result, respond ONLY as compact JSON:\n"
            '{"satisfied":true|false,'
            '"updated_debug":{"why":"...","confidence":0.0-1.0},'
            '"next_action":"answer_user|call_tool_again|ask_clarifying_question"}'
            "\nNo prose; JSON only."
        )
        
        messages = conversation_history or [{"role": "user", "content": task}]
        messages.extend([
            {"role": "user", "content": f"tool_result: {json.dumps(tool_result)}"},
            {"role": "user", "content": interp_instr},
        ])
        
        response = completion(
            model=self.model,
            messages=messages,
            extra_headers=self.extra_headers,
            temperature=self.temperature,
        )
        
        final_txt = response["choices"][0]["message"]["content"].strip()
        
        # Try to extract JSON from markdown code blocks
        if final_txt.startswith("```"):
            # Extract content between ```json and ```
            lines = final_txt.split("\n")
            json_lines = []
            in_code_block = False
            for line in lines:
                if line.strip().startswith("```"):
                    if in_code_block:
                        break
                    in_code_block = True
                    continue
                if in_code_block:
                    json_lines.append(line)
            final_txt = "\n".join(json_lines).strip()
        
        return json.loads(final_txt)
    
    def validate_tool_args(
        self,
        args: Dict[str, Any],
        schema: Dict[str, Any]
    ) -> bool:
        """
        Validate tool arguments against JSON schema.
        
        Args:
            args: Tool arguments to validate
            schema: JSON schema for validation
            
        Returns:
            True if valid
            
        Raises:
            ValidationError: If validation fails
        """
        validate(args, schema)
        return True
    
    def validate_tool_result(
        self,
        result: Dict[str, Any],
        schema: Dict[str, Any]
    ) -> bool:
        """
        Validate tool result against JSON schema.
        
        Args:
            result: Tool result to validate
            schema: JSON schema for validation
            
        Returns:
            True if valid
            
        Raises:
            ValidationError: If validation fails
        """
        validate(result, schema)
        return True


def skip_if_no_litellm():
    """Pytest decorator to skip tests if litellm is not available."""
    import pytest
    return pytest.mark.skipif(
        not LITELLM_AVAILABLE,
        reason="litellm not installed (pip install litellm)"
    )
