# Test Response Fixtures

This directory contains test response files for the BMAD tool's `test` operation.

## Purpose

The `test` operation allows rapid iteration on execute response structures without modifying code. This is useful for:

- Experimenting with different response formats
- Testing how LLMs respond to various prompt structures
- Comparing activation sequence designs
- Validating agent persona formatting

## Usage

### From MCP Client

```typescript
bmad({
  operation: 'test',
  testScenario: 'new-response-v1',
});
```

### From Test Script

```bash
node scripts/test-new-response.mjs [scenario-name]
```

Default scenario: `new-response-v1`

## File Format

Test responses are plain text files with `.txt` extension:

- Filename: `{scenario-name}.txt`
- Content: Any text format (markdown, plain text, formatted prompts, etc.)
- Encoding: UTF-8

## Available Scenarios

### new-response-v1.txt

Complete proposed execute response structure for debug agent (Diana). Demonstrates:

- Agent identity and persona
- 10-step activation sequence
- Menu handlers for workflows
- Critical rules for agent behavior
- Available commands
- User request integration
- Action directives

**Use case:** Testing comprehensive agent activation with immediate actions

### minimal-response.txt

Simple minimal response to demonstrate flexibility.

**Use case:** Quick testing of basic formatting

## Adding New Scenarios

1. Create a new `.txt` file in this directory
2. Add your response content
3. Test with: `node scripts/test-new-response.mjs your-scenario-name`

Example:

```bash
# Create new scenario
echo "Your test content here" > tests/fixtures/test-responses/my-test.txt

# Test it
node scripts/test-new-response.mjs my-test
```

## Design Notes

**Why .txt files?**

- Simple and editable
- No parsing required
- Version control friendly
- Any text editor can modify them

**Why not JSON?**

- Response content is naturally text (prompts, instructions, formatted output)
- JSON would require escaping newlines and special characters
- Direct text files are easier to read and edit

**Path Resolution:**
Files are loaded from the project root, not the build directory:

```
{project-root}/tests/fixtures/test-responses/{scenario}.txt
```

## Future Scenarios

Consider adding:

- `workflow-response.txt` - Workflow execution response format
- `structured-data.txt` - Response with structured data sections
- `action-focused.txt` - Minimal response optimized for immediate action
- `conversational.txt` - More natural language style
- `error-response.txt` - How to format error messages

## Implementation

See `src/tools/bmad-unified.ts` → `handleTest()` function for the implementation.
