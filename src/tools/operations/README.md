# BMAD Tools - Modular Operations

This directory contains the modular operation handlers for the unified BMAD tool.

## Overview

Each operation is implemented in its own TypeScript file for clarity, testability, and maintainability. All operations use the transport-agnostic `BMADEngine` and return standardized `BMADResult` objects.

## Operations

### 📋 List (`list.ts`)

**Purpose**: Discover available BMAD resources

- **Query Types**: `agents`, `workflows`, `modules`, `resources`
- **Filters**: Module name, resource pattern (glob)
- **Returns**: Array of matching items with metadata
- **Read-only**: ✅ Yes
- **Side effects**: ❌ None

**Examples**:

```javascript
// List all agents
{ operation: "list", query: "agents" }

// List BMM module agents only
{ operation: "list", query: "agents", module: "bmm" }

// List YAML resources in core module
{ operation: "list", query: "resources", module: "core", pattern: "**/*.yaml" }
```

---

### 🔍 Search (`search.ts`)

**Purpose**: Fuzzy search across agents and workflows

- **Search Types**: `agents`, `workflows`, `all`
- **Filters**: Module name
- **Returns**: Ranked results with relevance scoring
- **Read-only**: ✅ Yes
- **Side effects**: ❌ None

**Examples**:

```javascript
// Search everywhere for "debug"
{ operation: "search", searchQuery: "debug" }

// Search only workflows for "architecture"
{ operation: "search", searchQuery: "architecture", searchType: "workflows" }
```

---

### 📖 Read (`read.ts`)

**Purpose**: Retrieve full definitions of agents, workflows, or resources

- **Read Types**: `agent`, `workflow`, `resource`
- **Parameters**: Agent/workflow name, or resource URI
- **Returns**: Complete definition with content
- **Read-only**: ✅ Yes
- **Side effects**: ❌ None

**Examples**:

```javascript
// Read agent definition
{ operation: "read", type: "agent", agent: "analyst", module: "bmm" }

// Read workflow YAML
{ operation: "read", type: "workflow", workflow: "prd" }

// Read resource file
{ operation: "read", type: "resource", uri: "bmad://core/config.yaml" }
```

---

### ⚡ Execute (`execute.ts`)

**Purpose**: Run agents or workflows with user messages

- **Execute Types**: `agent`, `workflow`
- **Required**: User message/context
- **Returns**: Execution result with outputs
- **Read-only**: ❌ No
- **Side effects**: ⚠️ **May create files, modify workspace**

**Examples**:

```javascript
// Execute agent
{
  operation: "execute",
  type: "agent",
  agent: "analyst",
  message: "Help me brainstorm a mobile app idea"
}

// Execute workflow
{
  operation: "execute",
  type: "workflow",
  workflow: "prd",
  module: "bmm",
  message: "Create PRD for e-commerce platform"
}
```

---

## Architecture

### Parameter Validation

Each operation exports a `validate*Params()` function that:

- Checks required parameters
- Validates parameter types
- Returns error messages for invalid input
- Returns `undefined` if valid

### Execution

Each operation exports an `execute*Operation()` function that:

- Takes `BMADEngine` instance
- Takes operation-specific parameters
- Returns `BMADResult` with success status, data, and formatted text

### Examples

Each operation exports a `get*Examples()` function that:

- Returns array of usage example strings
- Used in error messages to guide users
- Serves as documentation

## Usage

### Direct Import (Testing)

```typescript
import { executeListOperation, validateListParams } from './list.js';

const error = validateListParams(params);
if (error) {
  console.error(error);
} else {
  const result = await executeListOperation(engine, params);
  console.log(result.text);
}
```

### Via Index (Production)

```typescript
import { executeListOperation } from './operations/index.js';

const result = await executeListOperation(engine, { query: 'agents' });
```

### Via Unified Tool (MCP Server)

```typescript
import { handleBMADTool } from '../bmad-unified.js';

const response = await handleBMADTool(
  { operation: 'list', query: 'agents' },
  engine,
);
```

## Testing

Each operation can be tested independently:

```typescript
describe('List Operation', () => {
  it('validates parameters', () => {
    expect(validateListParams({})).toBe('Missing required parameter: query');
    expect(validateListParams({ query: 'invalid' })).toContain(
      'Invalid query type',
    );
    expect(validateListParams({ query: 'agents' })).toBeUndefined();
  });

  it('executes successfully', async () => {
    const result = await executeListOperation(engine, { query: 'agents' });
    expect(result.success).toBe(true);
    expect(result.data).toBeArray();
  });
});
```

## Type Safety

All operations are strongly typed:

- Parameters interfaces are exported for type checking
- Return type is always `Promise<BMADResult>`
- Validation functions return `string | undefined`
- No `any` types used

## Error Handling

Operations follow a consistent error pattern:

1. Validate parameters first
2. Return helpful error messages with examples
3. Never throw exceptions (return error in BMADResult)
4. Include context in error messages

## Extension

To add a new operation:

1. Create `new-operation.ts` in this directory
2. Define `*Params` interface
3. Implement `execute*Operation()` function
4. Implement `validate*Params()` function
5. Implement `get*Examples()` function
6. Export from `index.ts`
7. Update `bmad-unified.ts` to wire it up
8. Add tests
