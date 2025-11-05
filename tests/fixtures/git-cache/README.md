# Test Fixture - Awesome BMAD Agents

This directory contains test fixtures that simulate a cached git repository for the `@awesome` remote.

## Structure

```
awesome-bmad-agents/
└── agents/
    └── debug-diana-v6/
        └── agents/
            └── debug.md       # Test fixture agent
```

## Purpose

These fixtures allow integration tests to verify agent loading without:

- Real git clone/fetch operations
- Network dependencies
- Git lock conflicts
- Slow test execution

## Usage

Tests use `mockGitResolverWithFixtures()` from `tests/support/mock-git-resolver.ts` to return these fixture paths instead of cloning real repositories.

## Adding New Fixtures

To add a new test agent or remote:

1. Create the directory structure matching the remote repository layout
2. Add agent/workflow files with proper metadata
3. Update `mock-git-resolver.ts` to map the remote URL to the fixture path
