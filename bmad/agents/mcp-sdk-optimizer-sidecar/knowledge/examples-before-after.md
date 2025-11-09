# Before vs After — MCP Response Optimization Examples

## Example 1 — Tool List

### Before

- 21 tools listed with verbose paragraphs; no summary, no affordances; random ordering.

### After (pattern)

```
intent: "Tool discovery overview"
summary: "21 tools available. Top relevance: *optimize, *refine, *search."
affordances:
  - trigger: "*optimize" — Semantic analysis of response clarity
  - trigger: "*refine" — Rewrite payload parts for structure & brevity
  - trigger: "*search" — Find resources matching query

# top-N shown; truncated
tools:
  - name: optimize
    desc: Analyze and score payload
  - name: refine
    desc: Rewrite for clarity
  - name: search
    desc: Query resources
  - ... (showing top 5 of 21)

metrics:
  token_estimate: 860
  sections: 4
  potential_followups: 1
```

## Example 2 — Resource Content

### Before

- Full resource body (4,000+ lines) inlined; no guidance.

### After (pattern)

```
intent: "Resource content fetch"
summary: "Trimmed excerpt (max 40 lines). Request full if needed."
affordances:
  - action: Request full body
  - action: Ask for summarization variant
resource:
  path: /path/to/file
  excerpt: |
    ... 40 lines ...
metrics:
  original_lines: 4011
  provided_lines: 40
  ambiguity_score: 0.28
```
