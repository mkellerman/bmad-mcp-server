import os
import json
from typing import Any, Dict, List
from jsonschema import validate, ValidationError
from anthropic import Anthropic, APIStatusError

# -----------------------------
# Config
# -----------------------------
MODEL_NAME = "claude-3.5-sonnet-latest"  # Claude 3.5 Sonnet; good at tool-use
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
assert ANTHROPIC_API_KEY, "Set ANTHROPIC_API_KEY env var."

client = Anthropic(api_key=ANTHROPIC_API_KEY)

# -----------------------------
# Example MCP-like tool registry
# -----------------------------
# We'll demo with a deterministic "lookup_item" tool to ensure repeatable tests.
IN_MEMORY_DB = {
    "item_001": {"id": "item_001", "name": "Flux Capacitor", "price": 299.99, "stock": 3},
    "item_002": {"id": "item_002", "name": "Retro Vacuum Tube", "price": 19.5, "stock": 42},
}

TOOL_ARG_SCHEMAS: Dict[str, Dict[str, Any]] = {
    "lookup_item": {
        "type": "object",
        "properties": {
            "id": {"type": "string", "pattern": "^item_\\d{3}$"}
        },
        "required": ["id"],
        "additionalProperties": False
    }
}

TOOL_RESULT_SCHEMAS: Dict[str, Dict[str, Any]] = {
    "lookup_item": {
        "type": "object",
        "properties": {
            "found": {"type": "boolean"},
            "item": {
                "type": ["object", "null"],
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "price": {"type": "number"},
                    "stock": {"type": "integer"}
                },
                "required": ["id", "name", "price", "stock"]
            }
        },
        "required": ["found", "item"],
        "additionalProperties": False
    }
}

def run_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """Execute the actual tool logic (deterministic)."""
    if tool_name == "lookup_item":
        item_id = tool_input["id"]
        item = IN_MEMORY_DB.get(item_id)
        return {"found": item is not None, "item": item if item else None}
    raise ValueError(f"Unknown tool: {tool_name}")

# -----------------------------
# Claude tool specs (exposed to the model)
# -----------------------------
CLAUDE_TOOLS = [
    {
        "name": "lookup_item",
        "description": "Look up an inventory item by ID (format: item_XXX). Returns details if found.",
        "input_schema": TOOL_ARG_SCHEMAS["lookup_item"],
    }
]

SYSTEM_PROMPT = """You are an MCP-style agent with strict JSON discipline.

When deciding to use a tool, you MUST:
- Return a short text explanation AND a machine-readable JSON block on *why* this tool was chosen and what you *expect* back.

Emit the explanation JSON as a text block that begins with:
DEBUG_JSON:
<valid compact JSON on the same line after DEBUG_JSON:>

The JSON must have:
{
  "why": "string",
  "expected_output_shape": {"found": "boolean", "item": "object|null"},
  "confidence": 0.0 to 1.0
}

Do NOT include private chain-of-thought—only the required fields above.
"""

# -----------------------------
# Multi-phase test driver
# -----------------------------

def extract_debug_json_from_text_blocks(content_blocks: List[Any]) -> Dict[str, Any]:
    """Parse the 'DEBUG_JSON:' line if the model included it as required."""
    for block in content_blocks:
        if getattr(block, "type", None) == "text":
            text = block.text.strip()
            if text.startswith("DEBUG_JSON:"):
                payload = text.split("DEBUG_JSON:", 1)[1].strip()
                try:
                    return json.loads(payload)
                except Exception:
                    pass
    return {}

def collect_tool_uses(content_blocks: List[Any]) -> List[Any]:
    """Return all tool_use blocks from Claude."""
    return [b for b in content_blocks if getattr(b, "type", None) == "tool_use"]

def to_tool_result_block(tool_use_id: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Format a tool_result content block for Claude."""
    return {
        "type": "tool_result",
        "tool_use_id": tool_use_id,
        "content": [{"type": "text", "text": json.dumps(result)}],
    }

def phase_a_get_intent(user_message: str):
    """
    Phase A: Ask Claude for a decision.
    It may produce one or more tool_use blocks and the DEBUG_JSON explanation.
    """
    resp = client.messages.create(
        model=MODEL_NAME,
        max_tokens=500,
        tools=CLAUDE_TOOLS,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": user_message}
        ],
    )
    return resp

def phase_b_execute_tools(initial_response):
    """
    Phase B: For each tool_use block:
      - validate args against schema,
      - run the tool,
      - validate result,
      - build tool_result blocks to return to Claude.
    """
    tool_result_blocks = []
    for block in initial_response.content:
        if getattr(block, "type", None) == "tool_use":
            tool_name = block.name
            tool_input = block.input

            # Validate args
            try:
                validate(tool_input, TOOL_ARG_SCHEMAS[tool_name])
            except ValidationError as e:
                raise AssertionError(f"Tool arg schema validation failed: {e.message}")

            # Execute
            result = run_tool(tool_name, tool_input)

            # Validate result
            try:
                validate(result, TOOL_RESULT_SCHEMAS[tool_name])
            except ValidationError as e:
                raise AssertionError(f"Tool result schema validation failed: {e.message}")

            tool_result_blocks.append(to_tool_result_block(block.id, result))
    return tool_result_blocks

def phase_c_model_interpretation(prior_messages: List[Dict[str, Any]], tool_result_blocks: List[Dict[str, Any]]):
    """
    Phase C: Send tool_result(s) back to Claude and request structured interpretation.
    We ask for a small JSON confirming whether the output satisfied expectations.
    """
    interpretation_prompt = """Given the tool_result(s) just provided, update your interpretation:

Return ONLY a compact JSON object:
{
  "satisfied": true|false,
  "updated_debug": {"why": "...", "expected_output_shape": {"found":"boolean","item":"object|null"}, "confidence": 0.0-1.0},
  "next_action": "string"  // e.g., "answer_user", "call_tool_again", "ask_clarifying_question"
}"""

    messages = prior_messages + [
        {"role": "user", "content": tool_result_blocks},
        {"role": "user", "content": interpretation_prompt},
    ]

    resp = client.messages.create(
        model=MODEL_NAME,
        max_tokens=400,
        tools=CLAUDE_TOOLS,  # keep tools available in case model wants another round
        system=SYSTEM_PROMPT,
        messages=messages,
    )
    return resp

def main():
    # Example user task that should trigger the lookup_item tool:
    user_input = "Check if item_001 exists in inventory and tell me its price."

    trace = {"phases": {}}

    # Phase A: Get intent/tool uses + DEBUG_JSON
    initial = phase_a_get_intent(user_input)
    trace["phases"]["A_initial_response"] = initial.model_dump()

    debug_json = extract_debug_json_from_text_blocks(initial.content)
    tool_uses = collect_tool_uses(initial.content)

    # Basic assertions for testing
    assert tool_uses, "Expected at least one tool_use block."
    assert isinstance(debug_json, dict) and "why" in debug_json, "Missing or invalid DEBUG_JSON."

    # Phase B: Execute tools and validate
    tool_results = phase_b_execute_tools(initial)
    assert tool_results, "Expected at least one tool_result block."
    trace["phases"]["B_tool_results"] = tool_results

    # Phase C: Ask model to interpret tool output
    # Build minimal prior_messages to keep history coherent:
    prior_messages = [
        {"role": "user", "content": user_input},
        # We include the model's previous content so Claude has full context
        {"role": "assistant", "content": initial.content},
    ]
    interpretation = phase_c_model_interpretation(prior_messages, tool_results)
    trace["phases"]["C_interpretation_response"] = interpretation.model_dump()

    # Parse final JSON (assistant should reply with just JSON text)
    final_json = None
    for block in interpretation.content:
        if getattr(block, "type", None) == "text":
            txt = block.text.strip()
            try:
                final_json = json.loads(txt)
                break
            except Exception:
                pass

    assert final_json and isinstance(final_json, dict), "Interpretation not valid JSON."
    assert "satisfied" in final_json, "Missing 'satisfied' in interpretation."
    # Example assertion: the lookup for item_001 should satisfy expectations
    assert final_json["satisfied"] is True, "Model did not mark result as satisfied."

    # Persist trace for golden tests / replay
    with open("trace.claude.tooluse.json", "w") as f:
        json.dump(trace, f, indent=2)

    print("✅ Test completed. See trace.claude.tooluse.json for full trace.")
    print("Final interpretation JSON:", json.dumps(final_json, indent=2))

if __name__ == "__main__":
    try:
        main()
    except APIStatusError as e:
        print("Anthropic API error:", str(e))
        raise