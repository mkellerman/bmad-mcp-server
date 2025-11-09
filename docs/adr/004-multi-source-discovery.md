# ADR-004: Multi-Source Discovery

**Status:** Accepted  
**Date:** November 6, 2025  
**Supercedes:** Previous single-source discovery

---

## Context

Users may have BMAD content in multiple locations:

- Project-specific agents (e.g., custom company workflows)
- User-global agents (personal productivity agents)
- Team-shared agents (via git repositories)

We needed a discovery strategy that:

1. Finds BMAD installations across multiple sources
2. Provides consistent priority resolution
3. Supports both local and remote content
4. Allows flexible source selection

---

## Decision

Implement **multi-source discovery** with configurable discovery modes and priority-based resolution.

**Sources (Priority Order):**

1. **Project** - `{projectRoot}/bmad/`
2. **User** - `~/.bmad/`
3. **Git Remotes** - `git+https://...` (cloned to `~/.cache/bmad-git/`)

**Discovery Modes:**

- `auto` - All sources with priority resolution (default)
- `local` - Project only
- `user` - User home only
- `strict` - Git remotes only (no local/user)

---

## Rationale

### Priority Resolution Strategy

**Why project > user > git?**

1. **Project** has highest priority (most specific)
   - Custom agents for this project
   - Project-specific configurations
   - Overrides for company needs

2. **User** has medium priority (personal)
   - User's personal productivity agents
   - Cross-project utilities
   - Personal preferences

3. **Git** has lowest priority (shared/baseline)
   - Team-shared content
   - Official BMAD distributions
   - Fallback defaults

**Example scenario:**

```
Project has: custom-pm.md (company-specific PM agent)
User has: pm.md (personal PM tweaks)
Git has: pm.md (official BMAD PM)

→ Loads custom-pm.md (project wins)
```

### Git Remote Support

**Why git remotes?**

- Teams can share BMAD content via version control
- Easy updates (pull latest)
- Centralized management
- Works with existing git infrastructure

**Implementation:**

- Clone to `~/.cache/bmad-git/{hash}/`
- Lazy cloning (on first access)
- Cached across sessions

---

## Consequences

### Positive

**Flexibility:**

- Users choose which sources to enable
- Discovery modes for different use cases
- Override mechanism via priority

**Team Collaboration:**

- Share BMAD content via git URLs
- Version control for team agents
- Easy distribution

**User Experience:**

- "Just works" with auto mode
- Can restrict to specific sources when needed
- No configuration required for simple cases

### Negative

**Complexity:**

- Must scan multiple directories
- Priority resolution logic
- Git operations (cloning, caching)

**Potential Conflicts:**

- Same agent name in multiple sources
- Resolution rules must be clear
- Debugging which source was used

---

## Implementation

```typescript
// Discovery mode selection
constructor(
  projectRoot?: string,
  gitRemotes?: string[],
  discoveryMode: DiscoveryMode = 'auto'
) {
  this.discoveryMode = discoveryMode;
  // ...
}

// Source filtering
private shouldIncludeSource(source: 'project' | 'user' | 'git'): boolean {
  switch (this.discoveryMode) {
    case 'auto': return true;
    case 'local': return source === 'project';
    case 'user': return source === 'user';
    case 'strict': return source === 'git';
  }
}

// Priority resolution
async loadAgent(name: string): Promise<Resource> {
  const candidates = [
    ...this.getProjectPaths(name),
    ...this.getUserPaths(name),
    ...this.getGitPaths(name),
  ];

  // Return first existing file (priority order)
  for (const { path, source } of candidates) {
    if (existsSync(path)) {
      return { name, path, content: readFile(path), source };
    }
  }

  throw new Error(`Agent not found: ${name}`);
}
```

---

## Alternatives Considered

### Alternative 1: Single Source

Only support one source (e.g., project root):

**Rejected because:**

- Forces users to copy content
- No user-global agents
- Can't share via git

### Alternative 2: Configuration File

Use a config file to declare source priorities:

```yaml
sources:
  - path: ./bmad
    priority: 100
  - path: ~/.bmad
    priority: 50
  - git: git+https://...
    priority: 10
```

**Rejected because:**

- Over-engineered for current needs
- Priority order is intuitive (project > user > git)
- Can add later if needed

### Alternative 3: Symlinks

Use filesystem symlinks to organize sources:

**Rejected because:**

- Platform-dependent
- Harder for non-technical users
- Doesn't solve git remote problem

---

## References

- Implementation: `src/core/resource-loader.ts`
- Git resolution: `src/utils/git-source-resolver.ts`
- Related: [ADR-005: Manifest Merge Strategy](./005-manifest-merge.md)

---

## Review

**Next Review:** When adding new source types or changing priority logic

**Success Criteria:**

- Users can override agents without modifying git sources
- Git remotes work reliably across platforms
- Discovery mode switching is intuitive
- Performance acceptable (<100ms for multi-source scan)
