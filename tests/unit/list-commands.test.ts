import { describe, it, expect } from 'vitest';
import path from 'node:path';

import { resolveBmadPaths } from '../../src/utils/bmad-path-resolver.js';
import { MasterManifestService } from '../../src/services/master-manifest-service.js';
import { UnifiedBMADTool } from '../../src/tools/index.js';

describe('List commands', () => {
  it('lists agents, workflows, tasks, and modules from v6 sample', async () => {
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

    const workflows = await tool.execute('*list-workflows');
    expect(workflows.success).toBe(true);
    expect(workflows.content).toContain('BMAD Workflows');
    expect(workflows.content).toContain('party-mode');

    const tasks = await tool.execute('*list-tasks');
    expect(tasks.success).toBe(true);
    expect(tasks.content).toContain('BMAD Tasks');

    const modules = await tool.execute('*list-modules');
    expect(modules.success).toBe(true);
    expect(modules.content).toContain('BMAD Modules');
    expect(modules.content).toContain(
      '| Module | Agents | Workflows | Tasks |',
    );
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
    expect(agents.content).toContain('Summary:');

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
