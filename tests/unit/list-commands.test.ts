import { describe, it, expect } from 'vitest';
import path from 'node:path';

import { resolveBmadPaths } from '../../src/utils/bmad-path-resolver.js';
import { MasterManifestService } from '../../src/services/master-manifest-service.js';
import { UnifiedBMADTool } from '../../src/tools/index.js';

describe('List commands', () => {
  it('lists agents and workflows from v6 sample', async () => {
    const projectRoot = process.cwd();
    const bmadRoot = path.resolve(
      projectRoot,
      '.bmad',
      '6.0.0-alpha.0',
      'bmad',
    );
    const discovery = resolveBmadPaths({
      cwd: projectRoot,
      cliArgs: [bmadRoot],
      envVar: undefined,
      userBmadPath: path.join(projectRoot, '.bmad'),
    });
    const service = new MasterManifestService(discovery);
    service.generate();
    const tool = new UnifiedBMADTool({
      bmadRoot,
      discovery,
      masterManifestService: service,
    });

    const agents = await tool.execute('*list-agents');
    expect(agents.success).toBe(true);
    expect(agents.content).toContain('BMAD Agents');
    expect(agents.content).toContain('analyst');

    // Verify agents are sorted by command name (not display name)
    const agentLines = (agents.content ?? '')
      .split('\n')
      .filter((l) => l.trim().startsWith('- '));
    const agentNames = agentLines
      .map((l) => {
        const match = l.match(/`([^`]+)`/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    // Check that agent names are in alphabetical order
    const sortedNames = [...agentNames].sort();
    expect(agentNames).toEqual(sortedNames);

    // Verify ux-expert comes after analyst (alphabetically by command, not display name)
    const analystIndex = agentNames.indexOf('analyst');
    const uxIndex = agentNames.indexOf('ux-expert');
    expect(uxIndex).toBeGreaterThan(analystIndex);

    const workflows = await tool.execute('*list-workflows');
    expect(workflows.success).toBe(true);
    expect(workflows.content).toContain('BMAD Workflows');
    expect(workflows.content).toContain('party-mode');

    // Verify workflows are sorted by command name
    const workflowLines = (workflows.content ?? '')
      .split('\n')
      .filter((l) => l.trim().startsWith('- '));
    const workflowNames = workflowLines
      .map((l) => {
        const match = l.match(/`([^`]+)`/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    // Check that workflow names are in alphabetical order
    const sortedWorkflows = [...workflowNames].sort();
    expect(workflowNames).toEqual(sortedWorkflows);
  });

  it('lists agents from multiple CLI roots (multi-root support)', async () => {
    const projectRoot = process.cwd();
    const customRoot = path.resolve(projectRoot, '.bmad', 'custom');
    const v6Root = path.resolve(projectRoot, '.bmad', '6.0.0-alpha.0', 'bmad');

    const discovery = resolveBmadPaths({
      cwd: projectRoot,
      cliArgs: [customRoot, v6Root], // Multiple roots
      envVar: undefined,
      userBmadPath: path.join(projectRoot, '.bmad'),
      mode: 'strict',
    });

    const service = new MasterManifestService(discovery);
    service.generate();
    const tool = new UnifiedBMADTool({
      bmadRoot: v6Root,
      discovery,
      masterManifestService: service,
    });

    const agents = await tool.execute('*list-agents');
    expect(agents.success).toBe(true);
    expect(agents.content).toContain('BMAD Agents');
    expect(agents.content).toContain('Found');

    // Should contain agents from both roots
    expect(agents.content).toContain('debug'); // from custom
    expect(agents.content).toContain('analyst'); // from v6

    // Verify activeLocations has both roots
    expect(discovery.activeLocations).toHaveLength(2);
    expect(discovery.activeLocations[0].resolvedRoot).toContain('custom');
    expect(discovery.activeLocations[1].resolvedRoot).toContain(
      '6.0.0-alpha.0',
    );
  });

  it('backward compatibility: single root still works', async () => {
    const projectRoot = process.cwd();
    const bmadRoot = path.resolve(
      projectRoot,
      '.bmad',
      '6.0.0-alpha.0',
      'bmad',
    );

    const discovery = resolveBmadPaths({
      cwd: projectRoot,
      cliArgs: [bmadRoot], // Single root
      envVar: undefined,
      userBmadPath: path.join(projectRoot, '.bmad'),
      mode: 'strict', // Use strict mode to avoid discovery
    });

    const service = new MasterManifestService(discovery);
    service.generate();
    const tool = new UnifiedBMADTool({
      bmadRoot,
      discovery,
      masterManifestService: service,
    });

    const agents = await tool.execute('*list-agents');
    expect(agents.success).toBe(true);
    expect(agents.content).toContain('analyst');

    // Should have 1 active location
    expect(discovery.activeLocations).toHaveLength(1);
    expect(discovery.activeLocations[0].resolvedRoot).toBe(
      discovery.activeLocation.resolvedRoot,
    );
  });
});
