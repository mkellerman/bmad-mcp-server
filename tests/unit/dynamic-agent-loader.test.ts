/**
 * Unit tests for dynamic-agent-loader.ts
 *
 * Coverage:
 * - Remote agent reference parsing
 * - Agent frontmatter parsing
 * - Remote agent loading
 * - Caching behavior
 * - Error scenarios
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  parseRemoteAgentRef,
  parseAgentFrontmatter,
  loadRemoteAgent,
  getCacheStats,
  clearCache,
  type RemoteAgentRef,
} from '../../src/utils/dynamic-agent-loader.js';
import type { RemoteRegistry } from '../../src/utils/remote-registry.js';
import { readFileSync, existsSync } from 'node:fs';
import { GitSourceResolver } from '../../src/utils/git-source-resolver.js';

// Mock dependencies
vi.mock('node:fs');
vi.mock('../../src/utils/git-source-resolver.js');
vi.mock('../../src/tools/common/agent-instructions.js', () => ({
  getAgentInstructions: vi.fn(
    () => '\n---\n\n## BMAD Instructions\n\nTest instructions',
  ),
}));

describe('parseRemoteAgentRef', () => {
  it('should parse valid remote agent reference', () => {
    const result = parseRemoteAgentRef('@awesome:agents/analyst');
    expect(result).toEqual({
      remote: 'awesome',
      agentPath: 'agents/analyst',
      fullRef: '@awesome:agents/analyst',
      isModule: true, // 2 segments = module
    });
  });

  it('should parse remote with hyphenated name', () => {
    const result = parseRemoteAgentRef('@my-org:agents/custom-agent');
    expect(result).toEqual({
      remote: 'my-org',
      agentPath: 'agents/custom-agent',
      fullRef: '@my-org:agents/custom-agent',
      isModule: true, // 2 segments = module
    });
  });

  it('should return null if missing @ prefix', () => {
    const result = parseRemoteAgentRef('awesome:agents/analyst');
    expect(result).toBeNull();
  });

  it('should return null if missing colon separator', () => {
    const result = parseRemoteAgentRef('@awesome-agents/analyst');
    expect(result).toBeNull();
  });

  it('should return null if remote name is empty', () => {
    const result = parseRemoteAgentRef('@:agents/analyst');
    expect(result).toBeNull();
  });

  it('should return null if agent path is empty', () => {
    const result = parseRemoteAgentRef('@awesome:');
    expect(result).toBeNull();
  });

  it('should return null if agent path does not start with agents/', () => {
    const result = parseRemoteAgentRef('@awesome:workflows/test');
    expect(result).toBeNull();
  });

  it('should handle nested agent paths', () => {
    const result = parseRemoteAgentRef(
      '@awesome:agents/category/subcategory/agent',
    );
    expect(result).toEqual({
      remote: 'awesome',
      agentPath: 'agents/category/subcategory/agent',
      fullRef: '@awesome:agents/category/subcategory/agent',
      isModule: false, // 4 segments = agent file
    });
  });
});

describe('parseAgentFrontmatter', () => {
  it('should parse valid YAML frontmatter', () => {
    const content = `---
name: analyst
displayName: Mary the Business Analyst
title: Senior Business Analyst
description: Expert in requirements
---
# Agent Content`;

    const result = parseAgentFrontmatter(content);
    expect(result).toEqual({
      name: 'analyst',
      displayName: 'Mary the Business Analyst',
      title: 'Senior Business Analyst',
      description: 'Expert in requirements',
    });
  });

  it('should return empty object if no frontmatter delimiters', () => {
    const content = `# Agent Content
No frontmatter here`;

    const result = parseAgentFrontmatter(content);
    expect(result).toEqual({});
  });

  it('should return empty object if missing closing delimiter', () => {
    const content = `---
name: analyst
# No closing delimiter
# Agent Content`;

    const result = parseAgentFrontmatter(content);
    expect(result).toEqual({});
  });

  it('should handle empty frontmatter', () => {
    const content = `---
---
# Agent Content`;

    const result = parseAgentFrontmatter(content);
    expect(result).toEqual({}); // Empty YAML returns empty object
  });

  it('should return empty object on invalid YAML', () => {
    const content = `---
invalid: yaml: syntax
---
# Agent Content`;

    const result = parseAgentFrontmatter(content);
    expect(result).toEqual({});
  });

  it('should handle nested YAML objects', () => {
    const content = `---
name: analyst
metadata:
  version: 1.0
  author: Test
---
# Agent Content`;

    const result = parseAgentFrontmatter(content);
    expect(result).toHaveProperty('name', 'analyst');
    expect(result).toHaveProperty('metadata');
    expect((result.metadata as { version: number }).version).toBe(1.0);
  });
});

describe('loadRemoteAgent', () => {
  const mockRegistry: RemoteRegistry = {
    remotes: new Map([
      ['awesome', 'git+https://github.com/mkellerman/awesome-bmad-agents#main'],
      ['test', 'git+https://github.com/test/repo#main'],
    ]),
  };

  const mockRef: RemoteAgentRef = {
    remote: 'awesome',
    agentPath: 'agents/analyst',
    fullRef: '@awesome:agents/analyst',
    isModule: true,
  };

  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully load remote agent', async () => {
    const mockLocalPath = '/tmp/git-cache/awesome';
    const mockAgentContent = `---
name: analyst
displayName: Mary the Business Analyst
title: Senior Business Analyst
---
# Business Analyst Agent
Expert in requirements gathering.`;

    // Spy on GitSourceResolver.prototype.resolve
    const resolveSpy = vi
      .spyOn(GitSourceResolver.prototype, 'resolve')
      .mockResolvedValue(mockLocalPath);

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(mockAgentContent);

    const result = await loadRemoteAgent(mockRef, mockRegistry);

    expect(result.success).toBe(true);
    expect(result.type).toBe('agent');
    expect(result.agentName).toBe('analyst');
    expect(result.displayName).toBe('Mary the Business Analyst');
    expect(result.content).toContain('# BMAD Agent: Mary the Business Analyst');
    expect(result.content).toContain('**Title:** Senior Business Analyst');
    expect(result.content).toContain('**Source:** awesome');
    expect(result.exitCode).toBe(0);

    resolveSpy.mockRestore();
  });

  it('should return error for unknown remote', async () => {
    const unknownRef: RemoteAgentRef = {
      remote: 'unknown',
      agentPath: 'agents/test',
      fullRef: '@unknown:agents/test',
      isModule: true,
    };

    const result = await loadRemoteAgent(unknownRef, mockRegistry);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown Remote');
    expect(result.error).toContain('unknown');
    expect(result.exitCode).toBe(1);
  });

  it('should return error if git clone fails', async () => {
    const mockResolve = vi
      .fn()
      .mockRejectedValue(new Error('Git clone failed'));
    vi.spyOn(GitSourceResolver.prototype, 'resolve').mockImplementation(
      mockResolve,
    );

    const result = await loadRemoteAgent(mockRef, mockRegistry);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to Clone Remote Repository');
    expect(result.error).toContain('Git clone failed');
    expect(result.exitCode).toBe(2);
  });

  it('should return error if agent file does not exist', async () => {
    const mockLocalPath = '/tmp/git-cache/awesome';

    const mockResolve = vi.fn().mockResolvedValue(mockLocalPath);
    vi.spyOn(GitSourceResolver.prototype, 'resolve').mockImplementation(
      mockResolve,
    );

    vi.mocked(existsSync).mockReturnValue(false);

    const result = await loadRemoteAgent(mockRef, mockRegistry);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Agent Not Found');
    expect(result.error).toContain('agents/analyst');
    expect(result.exitCode).toBe(3);
  });

  it('should return error if file read fails', async () => {
    const mockLocalPath = '/tmp/git-cache/awesome';

    const mockResolve = vi.fn().mockResolvedValue(mockLocalPath);
    vi.spyOn(GitSourceResolver.prototype, 'resolve').mockImplementation(
      mockResolve,
    );

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('Permission denied');
    });

    const result = await loadRemoteAgent(mockRef, mockRegistry);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to Read Agent File');
    expect(result.error).toContain('Permission denied');
    expect(result.exitCode).toBe(4);
  });

  it('should use displayName from frontmatter if available', async () => {
    const mockLocalPath = '/tmp/git-cache/awesome';
    const mockAgentContent = `---
displayName: Custom Display Name
title: Custom Title
---
# Agent Content`;

    const mockResolve = vi.fn().mockResolvedValue(mockLocalPath);
    vi.spyOn(GitSourceResolver.prototype, 'resolve').mockImplementation(
      mockResolve,
    );

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(mockAgentContent);

    const result = await loadRemoteAgent(mockRef, mockRegistry);

    expect(result.success).toBe(true);
    expect(result.displayName).toBe('Custom Display Name');
    expect(result.content).toContain('# BMAD Agent: Custom Display Name');
    expect(result.content).toContain('**Title:** Custom Title');
  });

  it('should fallback to agent name if no displayName in frontmatter', async () => {
    const mockLocalPath = '/tmp/git-cache/awesome';
    const mockAgentContent = `# Agent Content without frontmatter`;

    const mockResolve = vi.fn().mockResolvedValue(mockLocalPath);
    vi.spyOn(GitSourceResolver.prototype, 'resolve').mockImplementation(
      mockResolve,
    );

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(mockAgentContent);

    const result = await loadRemoteAgent(mockRef, mockRegistry);

    expect(result.success).toBe(true);
    expect(result.displayName).toBe('analyst');
    expect(result.content).toContain('# BMAD Agent: analyst');
    expect(result.content).toContain('**Title:** BMAD Agent');
  });

  it('should use name from frontmatter if displayName missing', async () => {
    const mockLocalPath = '/tmp/git-cache/awesome';
    const mockAgentContent = `---
name: CustomName
title: Test Title
---
# Agent Content`;

    const mockResolve = vi.fn().mockResolvedValue(mockLocalPath);
    vi.spyOn(GitSourceResolver.prototype, 'resolve').mockImplementation(
      mockResolve,
    );

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(mockAgentContent);

    const result = await loadRemoteAgent(mockRef, mockRegistry);

    expect(result.success).toBe(true);
    expect(result.displayName).toBe('CustomName');
  });
});

describe('Agent Caching', () => {
  const mockRegistry: RemoteRegistry = {
    remotes: new Map([
      ['awesome', 'git+https://github.com/mkellerman/awesome-bmad-agents#main'],
    ]),
  };

  const mockRef: RemoteAgentRef = {
    remote: 'awesome',
    agentPath: 'agents/analyst',
    fullRef: '@awesome:agents/analyst',
    isModule: true,
  };

  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should cache loaded agents', async () => {
    const mockLocalPath = '/tmp/git-cache/awesome';
    const mockAgentContent = `---
name: analyst
---
# Agent Content`;

    const resolveMock = vi.fn().mockResolvedValue(mockLocalPath);
    vi.spyOn(GitSourceResolver.prototype, 'resolve').mockImplementation(
      resolveMock,
    );

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(mockAgentContent);

    // First call
    const result1 = await loadRemoteAgent(mockRef, mockRegistry);
    expect(result1.success).toBe(true);
    expect(resolveMock).toHaveBeenCalledTimes(1);

    // Second call - should use cache
    const result2 = await loadRemoteAgent(mockRef, mockRegistry);
    expect(result2.success).toBe(true);
    expect(resolveMock).toHaveBeenCalledTimes(1); // Still 1, not called again
    expect(result2.content).toBe(result1.content);
  });

  it('should track cache size', async () => {
    const mockLocalPath = '/tmp/git-cache/awesome';
    const mockAgentContent = `# Agent Content`;

    const mockResolve = vi.fn().mockResolvedValue(mockLocalPath);
    vi.spyOn(GitSourceResolver.prototype, 'resolve').mockImplementation(
      mockResolve,
    );

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(mockAgentContent);

    const stats1 = getCacheStats();
    expect(stats1.size).toBe(0);

    await loadRemoteAgent(mockRef, mockRegistry);

    const stats2 = getCacheStats();
    expect(stats2.size).toBe(1);
    expect(stats2.maxSize).toBe(100);
  });

  it('should clear cache', async () => {
    const mockLocalPath = '/tmp/git-cache/awesome';
    const mockAgentContent = `# Agent Content`;

    const mockResolve = vi.fn().mockResolvedValue(mockLocalPath);
    vi.spyOn(GitSourceResolver.prototype, 'resolve').mockImplementation(
      mockResolve,
    );

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(mockAgentContent);

    await loadRemoteAgent(mockRef, mockRegistry);
    expect(getCacheStats().size).toBe(1);

    clearCache();
    expect(getCacheStats().size).toBe(0);
  });

  it('should cache different agents separately', async () => {
    const mockLocalPath = '/tmp/git-cache/awesome';
    const mockAgentContent1 = `# Agent 1`;
    const mockAgentContent2 = `# Agent 2`;

    const mockResolve = vi.fn().mockResolvedValue(mockLocalPath);
    vi.spyOn(GitSourceResolver.prototype, 'resolve').mockImplementation(
      mockResolve,
    );

    vi.mocked(existsSync).mockReturnValue(true);

    // Load first agent
    vi.mocked(readFileSync).mockReturnValue(mockAgentContent1);
    const ref1: RemoteAgentRef = {
      remote: 'awesome',
      agentPath: 'agents/agent1',
      fullRef: '@awesome:agents/agent1',
      isModule: true,
    };
    const result1 = await loadRemoteAgent(ref1, mockRegistry);

    // Load second agent
    vi.mocked(readFileSync).mockReturnValue(mockAgentContent2);
    const ref2: RemoteAgentRef = {
      remote: 'awesome',
      agentPath: 'agents/agent2',
      fullRef: '@awesome:agents/agent2',
      isModule: true,
    };
    const result2 = await loadRemoteAgent(ref2, mockRegistry);

    expect(getCacheStats().size).toBe(2);
    expect(result1.content).toContain('# Agent 1');
    expect(result2.content).toContain('# Agent 2');
  });

  it('should not cache failed loads', async () => {
    const mockResolve = vi.fn().mockRejectedValue(new Error('Git error'));
    vi.spyOn(GitSourceResolver.prototype, 'resolve').mockImplementation(
      mockResolve,
    );

    const result1 = await loadRemoteAgent(mockRef, mockRegistry);
    expect(result1.success).toBe(false);
    expect(getCacheStats().size).toBe(0);

    const result2 = await loadRemoteAgent(mockRef, mockRegistry);
    expect(result2.success).toBe(false);
    expect(getCacheStats().size).toBe(0);
  });
});
