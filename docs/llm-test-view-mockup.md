# 🎨 LLM Test View - UX Mockup

## Design Philosophy

Use the **Steps pattern** (like E2E tests) to show the conversation flow chronologically. Each step represents a conversational turn or action in the LLM interaction.

---

## Visual Mockup (ASCII representation)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 💬 Conversation Flow                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ⚙️  System Prompt                                           0.00s │
│      ├─ You are a helpful assistant. When asked to load an         │
│      │  agent, use the mcp_bmad_bmad tool with JUST the agent      │
│      │  name as the command parameter...                           │
│      └─ [View Full Prompt ▼]                                       │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  👤  User Input                                              0.00s │
│      Use the tool to load the analyst agent                        │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🤖  Assistant Response                                      1.24s │
│      ├─ 🔧 Tool Called: mcp_bmad_bmad                              │
│      │   Arguments: { "command": "analyst" }                       │
│      │   [View Details ▼]                                          │
│      └─ No text response (tool call only)                          │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🔧  Tool Execution                                          0.89s │
│      ├─ mcp_bmad_bmad                                              │
│      ├─ Status: ✅ Success                                         │
│      ├─ Output: 2,847 chars                                        │
│      └─ [View Tool Result ▼]                                       │
│          # BMAD Agent: Mary                                        │
│          **Title:** Business Analyst                               │
│          ...                                                        │
│          (truncated, click to expand)                              │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🤖  Assistant Final Response                                1.12s │
│      Mary (Business Analyst) activated! 📊                         │
│                                                                     │
│      Here are my available commands:                               │
│      1. Brainstorm a topic                                         │
│      2. Create competitor analysis                                 │
│      3. Create project brief                                       │
│      ...                                                            │
│      [View Full Response ▼]                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

📊 Summary: 4 steps • 3.25s total • 1,744 tokens (1,566 prompt + 178 completion)
```

---

## Multi-Turn Example (Multiple User Inputs)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 💬 Conversation Flow                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ⚙️  System Prompt                                           0.00s │
│      You are a helpful assistant...                                │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  👤  User Input #1                                           0.00s │
│      Load the analyst agent                                        │
├─────────────────────────────────────────────────────────────────────┤
│  🤖  Assistant Response #1                                   1.24s │
│      🔧 Tool: mcp_bmad_bmad → analyst                              │
├─────────────────────────────────────────────────────────────────────┤
│  🔧  Tool Result #1                                          0.89s │
│      ✅ Agent loaded successfully                                  │
├─────────────────────────────────────────────────────────────────────┤
│  🤖  Assistant Response #1 (cont.)                           1.12s │
│      Mary activated! Here are my commands...                       │
│                                                                     │
├═════════════════════════════════════════════════════════════════════┤
│                                                                     │
│  👤  User Input #2                                           0.00s │
│      What is your name and what are your duties?                   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  🤖  Assistant Response #2                                   0.87s │
│      I'm Mary, the Business Analyst! 📊                            │
│      My duties include market research, brainstorming...           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

📊 Summary: 7 steps • 2 user turns • 4.12s total • 2,341 tokens
```

---

## Design Decisions

### ✅ What Works Well (Keep from Current Steps)

1. **Clean, scannable layout** - Easy to follow top-to-bottom
2. **Status indicators** - ✅/❌/⏭️ icons for quick status recognition
3. **Duration display** - Right-aligned timing for each step
4. **Color coding** - Green (success), Red (error), Gray (skipped)
5. **Expandable details** - Collapsed by default for long content

### 🎯 LLM-Specific Adaptations

#### Step Types & Icons

- ⚙️ **System Prompt** - Yellow background (like system in current chat view)
- 👤 **User Input** - Blue background (user color)
- 🤖 **Assistant Response** - Green background (assistant color)
- 🔧 **Tool Execution** - Purple background (tool color)

#### Collapsible Content

- System prompts > 200 chars → show preview + "View Full Prompt"
- Tool results > 500 chars → show truncated + "View Tool Result"
- Assistant responses > 300 chars → show preview + "View Full Response"

#### Tool Call Visualization

When assistant makes tool call(s):

```
🤖  Assistant Response                                      1.24s
    ├─ 🔧 Tool Called: mcp_bmad_bmad
    │   Arguments: { "command": "analyst" }
    │   [View Details ▼]
    └─ No text response (tool call only)
```

#### Multi-Turn Separators

Add visual divider between conversation rounds:

```
├═════════════════════════════════════════════════════════════════════┤
```

### 📊 Summary Bar

At bottom of conversation:

- Total steps count
- Number of user turns (if > 1)
- Total duration
- Token usage breakdown

---

## Implementation Notes

### Data Structure Mapping

```typescript
ChatConversation.messages[] → Steps[]

Step mapping:
- message.role = 'system' → Step: "⚙️ System Prompt"
- message.role = 'user' → Step: "👤 User Input #N"
- message.role = 'assistant' (with toolCalls) → Step: "🤖 Assistant Response #N (tool call)"
- message.role = 'tool' → Step: "🔧 Tool Execution"
- message.role = 'assistant' (text only) → Step: "🤖 Assistant Response #N"
```

### Step Numbering

- Number user inputs: "User Input #1", "User Input #2"
- Number assistant responses per user turn: "Assistant Response #1", "Assistant Response #2"
- Keep tool executions unnumbered (they're sub-steps)

### Collapsed/Expanded State

- Default: All steps VISIBLE but content TRUNCATED
- Click step to expand full content
- Persist expansion state in sessionStorage

---

## Benefits vs Current Chat View

| Current Chat View              | Proposed Steps View                     |
| ------------------------------ | --------------------------------------- |
| Full messages always visible   | Smart truncation - less scrolling       |
| No clear turn separation       | Clear user turn boundaries              |
| Tool calls nested in assistant | Tool execution as separate step         |
| No step count                  | Shows "N steps" for quick understanding |
| Harder to scan quickly         | Icon + color = instant recognition      |

---

## Open Questions for User

1. **Should system prompts be shown by default or hidden?**
   - Option A: Always show (transparency)
   - Option B: Hide by default, show on expand (reduce noise)

2. **How to handle very long tool results?**
   - Option A: Truncate to 500 chars with expand
   - Option B: Show first/last 200 chars with "... X chars omitted ..." in middle

3. **Multi-turn visualization - prefer:**
   - Option A: Clear visual separator (═══) between turns
   - Option B: Indent all steps within a turn
   - Option C: Number-based grouping (1.1, 1.2 for turn 1)

4. **Token usage - where to show?**
   - Option A: Only in summary bar at bottom
   - Option B: Per-step (each LLM call shows its tokens)
   - Option C: Both summary + per-step

---

## Recommendation

**Start with this hybrid approach:**

- Use Steps-style layout (your favorite!)
- Apply Chat Conversation data (chronological flow)
- Smart truncation (expandable details)
- Clear turn separation for multi-turn tests

This gives you the clean, scannable Steps UI you already like, while properly handling the complexity of multi-turn LLM conversations.

Want me to implement this as the new LLM test view?
