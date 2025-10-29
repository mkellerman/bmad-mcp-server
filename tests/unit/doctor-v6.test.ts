import { describe, it, expect } from 'vitest';
import path from 'node:path';

import { resolveBmadPaths } from '../../src/utils/bmad-path-resolver.js';
import { MasterManifestService } from '../../src/services/master-manifest-service.js';
import { doctor } from '../../src/tools/internal/doctor.js';

function sampleProjectRoot(): string {
  // Use the directory containing the 'bmad' folder as the project root
  return path.resolve(
    process.cwd(),
    'tests',
    'support',
    'fixtures',
    'bmad_samples',
    '6.0.0-alpha.0',
  );
}

describe('doctor v6 integration', () => {
  it('reports inventory and supports --reload and --conflicts', () => {
    const projectRoot = sampleProjectRoot();
    const bmadRoot = path.join(projectRoot, 'bmad');
    const discovery = resolveBmadPaths({
      cwd: projectRoot,
      cliArgs: [bmadRoot],
      envVar: undefined,
      userBmadPath: path.join(projectRoot, '.bmad'),
    });
    const service = new MasterManifestService(discovery);
    service.generate();

    const resCompact = doctor('*doctor --reload', {
      discovery,
      projectRoot,
      bmadRoot,
      userBmadPath: path.join(projectRoot, '.bmad'),
      masterManifestService: service,
    });
    expect(resCompact.success).toBe(true);
    expect(resCompact.content).toContain('Inventory Summary (All Origins)');

    const resFull = doctor('*doctor --reload', {
      discovery,
      projectRoot,
      bmadRoot,
      userBmadPath: path.join(projectRoot, '.bmad'),
      masterManifestService: service,
    });
    expect(resFull.success).toBe(true);
    expect(resFull.content).toContain('Inventory Summary (All Origins)');
  });
});
