# ADR-005: Manifest Merge Strategy

**Status:** Accepted  
**Date:** November 6, 2025  
**Depends On:** [ADR-004: Multi-Source Discovery](./004-multi-source-discovery.md)

---

## Context

With multi-source discovery, we may have agent-manifest.csv and workflow-manifest.csv files in multiple locations:

- `./bmad/_cfg/agent-manifest.csv` (project)
- `~/.bmad/_cfg/agent-manifest.csv` (user)
- `~/.cache/bmad-git/*/bmad/_cfg/agent-manifest.csv` (git remotes)

We need a strategy to:

1. Load manifests from all sources
2. Merge entries into unified view
3. Handle duplicate entries (same agent in multiple sources)
4. Provide consistent discovery for LLMs

---

## Decision

Implement **priority-based manifest merging** with deduplication using source priority order.

**Merge Algorithm:**

1. Load manifests from all enabled sources (based on discovery mode)
2. Parse CSV entries from each manifest
3. Deduplicate by name (first occurrence wins, per priority order)
4. Return unified manifest to LLM

**Deduplication Rule:**

```
If agent "pm" appears in:
- Project manifest (priority 1)
- User manifest (priority 2)
- Git manifest (priority 3)

→ Use entry from project manifest (highest priority)
```

---

## Rationale

### Why Priority-Based Deduplication?

**Consistency with File Loading:**

- File loader uses priority order: project > user > git
- Manifest should match actual file resolution
- Prevents confusion (manifest says one thing, files say another)

**Example:**

```csv
# Project manifest: ./bmad/_cfg/agent-manifest.csv
name,displayName,title,module,path
pm,John (Custom),Custom PM,bmm,./bmad/bmm/agents/pm.md

# User manifest: ~/.bmad/_cfg/agent-manifest.csv
name,displayName,title,module,path
pm,John,Product Manager,bmm,~/.bmad/bmm/agents/pm.md

# Merged result (project wins):
name,displayName,title,module,path
pm,John (Custom),Custom PM,bmm,./bmad/bmm/agents/pm.md
```

### Why Not Merge Properties?

**Option:** Merge properties from multiple sources:

```
pm = {
  displayName: from_project,
  title: from_user,
  workflows: from_project + from_user,
}
```

**Rejected because:**

- Too complex (which properties to merge?)
- Unexpected behavior (where did this value come from?)
- Violates "single source of truth" principle

**Chosen:** First occurrence wins (simple, predictable)

---

## Consequences

### Positive

**Simplicity:**

- Clear rule: first match wins
- No complex merging logic
- Easy to reason about

**Consistency:**

- Manifest matches file resolution
- Predictable behavior
- "What you see is what you get"

**Performance:**

- Single pass through manifests
- O(n) deduplication (hash set)
- Fast manifest generation

### Negative

**No Property Merging:**

- Can't combine workflows from multiple sources
- Can't override single properties
- All-or-nothing per agent

**Mitigation:**

- Users can copy entire agent to override
- Custom manifests can reference any content
- Priority order allows surgical overrides

---

## Implementation

```typescript
// ManifestCache.ts
async generateManifest(): Promise<AgentManifest[]> {
  const seen = new Set<string>();
  const merged: AgentManifest[] = [];

  // Sources in priority order
  const sources = [
    ...this.getProjectManifests(),
    ...this.getUserManifests(),
    ...this.getGitManifests(),
  ];

  for (const manifest of sources) {
    for (const entry of manifest.entries) {
      // Deduplicate: first occurrence wins
      if (!seen.has(entry.name)) {
        seen.add(entry.name);
        merged.push(entry);
      }
    }
  }

  return merged;
}
```

---

## Alternatives Considered

### Alternative 1: Last Wins (Reverse Priority)

Use reverse priority: git > user > project

**Rejected because:**

- Counter-intuitive (why would git override project?)
- Inconsistent with file loading
- Makes overrides harder

### Alternative 2: Explicit Priority in Manifest

Add priority field to each entry:

```csv
name,priority,displayName,...
pm,100,Custom PM,...
```

**Rejected because:**

- Over-engineered for current needs
- Priority already implicit in source order
- Adds complexity to manifest format

### Alternative 3: Merge All, Flag Conflicts

Load all entries, mark duplicates:

```json
{
  "name": "pm",
  "sources": ["project", "user", "git"],
  "active": "project",
  "alternatives": ["user", "git"]
}
```

**Rejected because:**

- Confusing for LLMs
- Doesn't solve "which one to use?"
- Adds unnecessary complexity

---

## Edge Cases

### Empty Manifests

If a source has no manifest file:

- Skip silently
- Continue with other sources
- No error if at least one manifest exists

### Malformed CSV

If a manifest is malformed:

- Log warning
- Skip that manifest
- Continue with other sources

### Module-Scoped Manifests

If manifests are per-module (not global):

- Merge across modules
- Same deduplication logic
- Module prefix prevents name collisions

---

## Related Decisions

- [ADR-004: Multi-Source Discovery](./004-multi-source-discovery.md) - Establishes priority order
- [ADR-001: Pure Delivery Proxy](./001-pure-delivery-proxy.md) - Manifest is metadata, not execution

---

## References

- Implementation: `src/core/manifest-cache.ts`
- CSV Parsing: `csv-parse` library
- Related: Session-based ranking uses manifest priority field

---

## Review

**Next Review:** When adding module-scoped manifests or custom priority fields

**Success Criteria:**

- Manifest deduplication matches file resolution
- No performance degradation with multiple sources
- Clear logging shows which source was used
- LLM sees consistent agent list
