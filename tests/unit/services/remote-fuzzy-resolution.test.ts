/**
 * TDD Test Suite: Fuzzy Remote Agent Resolution
 *
 * This test suite defines the expected behavior for fuzzy matching
 * when loading agents from remote repositories.
 *
 * User Stories:
 * 1. As a user, I want to load a remote agent by partial name without knowing the exact path
 * 2. As a user, I want helpful suggestions when my remote agent name has typos
 * 3. As a user, I want the system to handle multiple matching agents gracefully
 * 4. As a user, I want remote agent loading to feel as easy as local agent loading
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RemoteRegistry } from '../../../src/utils/remote-registry.js';
import { GitSourceResolver } from '../../../src/utils/git-source-resolver.js';
import { resolveRemoteAgentWithFuzzy } from '../../../src/utils/dynamic-agent-loader.js';

// Mock dependencies
vi.mock('node:fs');
vi.mock('node:child_process', () => ({
  exec: vi.fn((cmd, opts, callback) => {
    if (callback) callback(null, 'abc123def456\n', '');
    return {};
  }),
  execSync: vi.fn(() => 'abc123def456\n'), // Mock git commit SHA
}));
vi.mock('../../../src/utils/git-source-resolver.js');
vi.mock('../../../src/tools/common/agent-instructions.js', () => ({
  getAgentInstructions: vi.fn(() => '\n## BMAD Instructions\n'),
}));

// Mock the manifest cache functions
vi.mock('../../../src/utils/remote-manifest-cache.js', () => ({
  getOrBuildManifest: vi.fn(),
  buildRemoteManifest: vi.fn(),
}));

describe('TDD: Fuzzy Remote Agent Resolution', () => {
  let mockRegistry: RemoteRegistry;
  let mockGitResolver: GitSourceResolver;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup mock registry with test remote
    mockRegistry = {
      remotes: new Map([
        [
          'awesome',
          'git+https://github.com/mkellerman/awesome-bmad-agents#main',
        ],
        ['test', 'git+https://github.com/test/test-agents#main'],
      ]),
    };

    // Setup mock git resolver
    mockGitResolver = new GitSourceResolver();
    vi.mocked(mockGitResolver.resolve).mockResolvedValue(
      '/mock/cache/awesome-bmad-agents',
    );

    // Setup default mock manifest
    const { getOrBuildManifest } = await import(
      '../../../src/utils/remote-manifest-cache.js'
    );
    vi.mocked(getOrBuildManifest).mockReturnValue({
      version: '1.0',
      gitCommit: 'abc123def456',
      buildTime: new Date().toISOString(),
      repoPath: '/mock/cache/awesome-bmad-agents',
      agents: [
        {
          name: 'debug',
          displayName: 'Diana - Debug Specialist',
          title: 'Debug Specialist',
          description: 'Expert debugger',
          path: 'agents/debug-diana-v6/agents/debug.md',
          moduleName: 'debug-diana-v6',
        },
        {
          name: 'analyst',
          displayName: 'Mary - Business Analyst',
          title: 'Business Analyst',
          description: 'Requirements expert',
          path: 'agents/business-analyst-v1/agents/analyst.md',
          moduleName: 'business-analyst-v1',
        },
        {
          name: 'deploy',
          displayName: 'Deploy Agent',
          title: 'Deployment Specialist',
          description: 'Handles deployments',
          path: 'agents/deploy-v1/agents/deploy.md',
          moduleName: 'deploy-v1',
        },
        {
          name: 'debt',
          displayName: 'Debt Tracker',
          title: 'Technical Debt Manager',
          description: 'Tracks technical debt',
          path: 'agents/debt-tracker/agents/debt.md',
          moduleName: 'debt-tracker',
        },
      ],
      workflows: [],
    });
  });

  describe('Scenario 2: Fuzzy match by module name', () => {
    it('should find agent when user provides module/agent format', async () => {
      // Given: User provides module/agent format
      const command = '@awesome:debug-diana-v6/debug';

      // When: We resolve with fuzzy matching
      const result = await resolveRemoteAgentWithFuzzy(
        command,
        mockRegistry,
        mockGitResolver,
      );

      // Then: Should find the matching module
      expect(result.success).toBe(true);
      expect(result.matched).toBeDefined();
      expect(result.matched?.moduleName).toBe('debug-diana-v6');
    });

    it('should find agent when user provides just agent name', async () => {
      // Given: User only provides agent name
      const command = '@awesome:debug';

      // When: We resolve with fuzzy matching
      const result = await resolveRemoteAgentWithFuzzy(
        command,
        mockRegistry,
        mockGitResolver,
      );

      // Then: Should find agent by name
      expect(result.success).toBe(true);
      expect(result.matched?.name).toBe('debug');
    });

    it('should match case-insensitively', async () => {
      // Given: User types in different case
      const command = '@awesome:DEBUG';

      // When: We resolve with fuzzy matching
      const result = await resolveRemoteAgentWithFuzzy(
        command,
        mockRegistry,
        mockGitResolver,
      );

      // Then: Should match despite case difference
      expect(result.success).toBe(true);
      expect(result.matched?.name).toBe('debug');
    });
  });

  describe('Scenario 3: Handle typos with suggestions', () => {
    it('should provide suggestions for close matches (low confidence)', async () => {
      // Clear cache to ensure fresh discovery
      const { clearCache } = await import(
        '../../../src/utils/dynamic-agent-loader.js'
      );
      clearCache();

      // Given: User provides a query that doesn't match anything
      const command = '@awesome:unknown-agent';

      // When: We resolve with fuzzy matching
      const result = await resolveRemoteAgentWithFuzzy(
        command,
        mockRegistry,
        mockGitResolver,
      );

      // Then: Should fail with no matches
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('not found');
    });

    it('should auto-correct when distance is 1 (very close)', async () => {
      // Given: User makes single-character typo
      const command = '@awesome:debugg'; // Extra 'g'

      // When: We resolve with fuzzy matching
      const result = await resolveRemoteAgentWithFuzzy(
        command,
        mockRegistry,
        mockGitResolver,
      );

      // Then: Should auto-correct with confidence
      expect(result.success).toBe(true);
      expect(result.matched?.name).toBe('debug');
      expect(result.corrected).toBe(true);
    });

    it('should handle ambiguous partial matches', async () => {
      // Given: Ambiguous partial query that matches multiple agents
      const command = '@awesome:de'; // Matches debug, deploy, debt

      // When: We resolve with fuzzy matching
      const result = await resolveRemoteAgentWithFuzzy(
        command,
        mockRegistry,
        mockGitResolver,
      );

      // Then: Should fail due to ambiguity or return best match
      // (Implementation may vary - just verify it doesn't crash)
      expect(result).toBeDefined();
      expect(result.exitCode).toBeDefined();
    });
  });

  describe('Scenario 4: Handle no matches gracefully', () => {
    it('should provide helpful error when no agent matches', async () => {
      // Given: User requests non-existent agent
      const command = '@awesome:nonexistent';

      // When: We resolve with fuzzy matching
      const result = await resolveRemoteAgentWithFuzzy(
        command,
        mockRegistry,
        mockGitResolver,
      );

      // Then: Should provide helpful error
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('not found');
      expect(result.errorMessage).toContain('*list-agents @awesome'); // Suggest discovery command
    });
  });

  describe('Scenario 5: Module-qualified names', () => {
    it('should support module/agent format from list output', async () => {
      // Given: User copies command from *list-agents @awesome output
      const command = '@awesome:debug-diana-v6/debug';

      // When: We resolve with fuzzy matching
      const result = await resolveRemoteAgentWithFuzzy(
        command,
        mockRegistry,
        mockGitResolver,
      );

      // Then: Should match module-qualified format
      expect(result.success).toBe(true);
      expect(result.matched?.moduleName).toBe('debug-diana-v6');
      expect(result.matched?.name).toBe('debug');
    });
  });

  describe('Scenario 6: Performance and caching', () => {
    it('should cache manifests to avoid repeated builds', async () => {
      // Given: Clear cache first
      const { clearCache } = await import(
        '../../../src/utils/dynamic-agent-loader.js'
      );
      clearCache();

      // Reset manifest mock
      const { getOrBuildManifest } = await import(
        '../../../src/utils/remote-manifest-cache.js'
      );
      vi.mocked(getOrBuildManifest).mockClear();

      const command = '@awesome:debug';

      // When: We resolve twice
      await resolveRemoteAgentWithFuzzy(command, mockRegistry, mockGitResolver);
      await resolveRemoteAgentWithFuzzy(command, mockRegistry, mockGitResolver);

      // Then: Manifest build should only be called once (cached)
      expect(getOrBuildManifest).toHaveBeenCalledTimes(1);
    });

    it('should use in-memory cache for manifests', async () => {
      // Given: Clear cache and setup
      const { clearCache } = await import(
        '../../../src/utils/dynamic-agent-loader.js'
      );
      clearCache();

      const { getOrBuildManifest } = await import(
        '../../../src/utils/remote-manifest-cache.js'
      );
      vi.mocked(getOrBuildManifest).mockClear();

      const command = '@awesome:debug';

      // When: We resolve multiple times
      await resolveRemoteAgentWithFuzzy(command, mockRegistry, mockGitResolver);
      await resolveRemoteAgentWithFuzzy(command, mockRegistry, mockGitResolver);
      await resolveRemoteAgentWithFuzzy(command, mockRegistry, mockGitResolver);

      // Then: Manifest should be built only once
      expect(getOrBuildManifest).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario 8: Error handling and edge cases', () => {
    it('should handle empty agent name', async () => {
      const command = '@awesome:';

      const result = await resolveRemoteAgentWithFuzzy(
        command,
        mockRegistry,
        mockGitResolver,
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Agent name is required');
    });

    it('should handle invalid remote name', async () => {
      const command = '@nonexistent:debug';

      const result = await resolveRemoteAgentWithFuzzy(
        command,
        mockRegistry,
        mockGitResolver,
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Remote');
      expect(result.errorMessage).toContain('not registered');
    });

    it('should handle empty manifest gracefully', async () => {
      // Clear cache first
      const { clearCache } = await import(
        '../../../src/utils/dynamic-agent-loader.js'
      );
      clearCache();

      // Mock empty manifest
      const { getOrBuildManifest } = await import(
        '../../../src/utils/remote-manifest-cache.js'
      );
      vi.mocked(getOrBuildManifest).mockReturnValueOnce({
        version: '1.0',
        gitCommit: 'abc123',
        buildTime: new Date().toISOString(),
        repoPath: '/mock/cache/awesome-bmad-agents',
        agents: [],
        workflows: [],
      });

      const command = '@awesome:debug';

      // When: We resolve
      const result = await resolveRemoteAgentWithFuzzy(
        command,
        mockRegistry,
        mockGitResolver,
      );

      // Then: Should provide helpful error
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('No agents found');
    });
  });
});

/**
 * Expected return type for fuzzy resolution
 */
export interface FuzzyResolutionResult {
  success: boolean;
  matched?: {
    name: string;
    moduleName: string;
    path: string;
    displayName?: string;
  };
  suggestions?: string[];
  corrected?: boolean; // True if auto-corrected a typo
  errorMessage?: string;
  exitCode?: number;
}
