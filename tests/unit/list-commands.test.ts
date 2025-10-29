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
      'tests',
      'support',
      'fixtures',
      'bmad_samples',
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
    expect(agents.content).toContain('Agents (available)');
    expect(agents.content).toContain('analyst');

    const workflows = await tool.execute('*list-workflows');
    expect(workflows.success).toBe(true);
    expect(workflows.content).toContain('Workflows (available)');
    expect(workflows.content).toContain('party-mode');

    const tasks = await tool.execute('*list-tasks');
    expect(tasks.success).toBe(true);
    expect(tasks.content).toContain('Tasks (available)');

    const modules = await tool.execute('*list-modules');
    expect(modules.success).toBe(true);
    expect(modules.content).toContain('Modules (available)');
    expect(modules.content).toContain(
      '| Module | Agents | Workflows | Tasks |',
    );
  });
});
