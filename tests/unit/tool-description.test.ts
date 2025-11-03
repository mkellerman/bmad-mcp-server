/**
 * Integration test for dynamic tool description generation
 */

import { describe, it, expect } from 'vitest';
import { buildToolDescription } from '../../src/tools/common/help.js';

describe('Dynamic Tool Description', () => {
  it('should build description with agent and workflow names', () => {
    const agents = [
      { name: 'analyst', description: 'Business Analyst' },
      { name: 'debug', description: 'Debug Specialist' },
      { name: 'architect', description: 'System Architect' },
    ];

    const workflows = [
      { name: 'party-mode', description: 'Party mode workflow' },
      { name: 'debug-quick', description: 'Quick debug' },
      { name: 'dev-story', description: 'Dev story workflow' },
    ];

    const description = buildToolDescription(agents, workflows);

    // Should include all agent names
    expect(description).toContain('analyst');
    expect(description).toContain('debug');
    expect(description).toContain('architect');

    // Should include all workflow names
    expect(description).toContain('party-mode');
    expect(description).toContain('debug-quick');
    expect(description).toContain('dev-story');

    // Should include counts
    expect(description).toContain('Available agents (3)');
    expect(description).toContain('Available workflows (3)');
  });

  it('should deduplicate agent and workflow names', () => {
    const agents = [
      { name: 'analyst', description: 'First' },
      { name: 'analyst', description: 'Duplicate' },
      { name: 'debug', description: 'Debug' },
    ];

    const workflows = [
      { name: 'party-mode', description: 'First' },
      { name: 'party-mode', description: 'Duplicate' },
      { name: 'dev-story', description: 'Dev' },
    ];

    const description = buildToolDescription(agents, workflows);

    // Should show deduplicated counts
    expect(description).toContain('Available agents (2)');
    expect(description).toContain('Available workflows (2)');

    // Extract the agent list from description
    const agentListMatch = description.match(
      /Available agents \(\d+\): ([^\n]+)/,
    );
    expect(agentListMatch).toBeTruthy();

    const agentList = agentListMatch![1];

    // Count occurrences in the list (should be 1 each)
    const analystCount = (agentList.match(/\banalyst\b/g) || []).length;
    const debugCount = (agentList.match(/\bdebug\b/g) || []).length;

    expect(analystCount).toBe(1);
    expect(debugCount).toBe(1);
  });

  it('should sort agents and workflows alphabetically', () => {
    const agents = [
      { name: 'zzz-last', description: 'Last' },
      { name: 'aaa-first', description: 'First' },
      { name: 'mmm-middle', description: 'Middle' },
    ];

    const workflows = [
      { name: 'zzz-workflow', description: 'Last' },
      { name: 'aaa-workflow', description: 'First' },
    ];

    const description = buildToolDescription(agents, workflows);

    // Find the positions in the description
    const aaaPos = description.indexOf('aaa-first');
    const mmmPos = description.indexOf('mmm-middle');
    const zzzPos = description.indexOf('zzz-last');

    // Should be in alphabetical order
    expect(aaaPos).toBeLessThan(mmmPos);
    expect(mmmPos).toBeLessThan(zzzPos);
  });

  it('should include command pattern instructions', () => {
    const description = buildToolDescription([], []);

    // Should include key sections
    expect(description).toContain('Load default agent');
    expect(description).toContain('Load specific agent');
    expect(description).toContain('Execute workflow');
    expect(description).toContain('Discovery commands');

    // Should explain asterisk requirement
    expect(description).toContain(
      'To execute a workflow, you MUST prefix the name with an asterisk (*)',
    );
  });

  it('should include helpful examples', () => {
    const description = buildToolDescription([], []);

    // Should include examples for common operations
    expect(description).toContain('bmad analyst');
    expect(description).toContain('bmad *party-mode');
    expect(description).toContain('bmad *list-agents');
    expect(description).toContain('bmad *list-workflows');
  });

  it('should include error handling guidance', () => {
    const description = buildToolDescription([], []);

    expect(description).toContain('Error Handling');
    expect(description).toContain('fuzzy matching');
    expect(description).toContain('Forget the asterisk');
  });

  it('should handle empty agent and workflow lists', () => {
    const description = buildToolDescription([], []);

    expect(description).toContain('Available agents (0)');
    expect(description).toContain('Available workflows (0)');
    expect(description).toContain('Command Patterns');
  });
});
