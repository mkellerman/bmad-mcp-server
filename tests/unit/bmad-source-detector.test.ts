/**
 * Unit tests for BMAD Source Detector (TDD)
 *
 * Tests detection of v4 and v6 BMAD structures from filesystem paths
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { detectBmadSource } from '../../src/utils/bmad-source-detector.js';
import {
  createTestFixture,
  type TestFixture,
} from '../helpers/test-fixtures.js';

describe('BmadSourceDetector', () => {
  let fixture: TestFixture;

  beforeEach(() => {
    fixture = createTestFixture();
  });

  afterEach(() => {
    fixture.cleanup();
  });

  describe('v6 structure detection', () => {
    it('should detect v6 structure from bmad/_cfg/manifest.yaml', () => {
      // Arrange: Create v6 structure
      const bmadRoot = path.join(fixture.tmpDir, 'bmad');
      const cfgDir = path.join(bmadRoot, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      const manifest = {
        installation: {
          version: '6.0.0-alpha.0',
          installDate: '2025-10-27T16:19:58.232Z',
          lastUpdated: '2025-10-27T16:19:58.232Z',
        },
        modules: [
          { name: 'core', version: '', shortTitle: '' },
          { name: 'bmm', version: '', shortTitle: '' },
        ],
        ides: ['claude-code'],
      };

      fs.writeFileSync(
        path.join(cfgDir, 'manifest.yaml'),
        `installation:
  version: ${manifest.installation.version}
  installDate: '${manifest.installation.installDate}'
  lastUpdated: '${manifest.installation.lastUpdated}'
modules:
  - name: core
    version: ''
    shortTitle: ''
  - name: bmm
    version: ''
    shortTitle: ''
ides:
  - claude-code
`,
      );

      // Act
      const result = detectBmadSource(bmadRoot);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('v6');
      expect(result.version).toBe('6.0.0-alpha.0');
      expect(result.path).toBe(bmadRoot);
      expect(result.manifestPath).toBe(path.join(cfgDir, 'manifest.yaml'));
      expect(result.modules).toEqual(['core', 'bmm']);
    });

    it('should detect v6 from _cfg/agent-manifest.csv presence', () => {
      // Arrange: Create minimal v6 structure without manifest.yaml
      const bmadRoot = path.join(fixture.tmpDir, 'bmad');
      const cfgDir = path.join(bmadRoot, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      // Create agent-manifest.csv (v6 indicator)
      fs.writeFileSync(
        path.join(cfgDir, 'agent-manifest.csv'),
        'name,displayName,description,module,path\nbmad-master,BMad Master,,core,bmad/core/agents/bmad-master.md\n',
      );

      // Act
      const result = detectBmadSource(bmadRoot);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('v6');
    });

    it('should return agent manifest path for v6', () => {
      // Arrange
      const bmadRoot = path.join(fixture.tmpDir, 'bmad');
      const cfgDir = path.join(bmadRoot, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      const agentManifestPath = path.join(cfgDir, 'agent-manifest.csv');
      fs.writeFileSync(agentManifestPath, 'name,displayName,description,module,path\n');

      // Act
      const result = detectBmadSource(bmadRoot);

      // Assert
      expect(result.agentManifestPath).toBe(agentManifestPath);
    });

    it('should return workflow manifest path for v6', () => {
      // Arrange
      const bmadRoot = path.join(fixture.tmpDir, 'bmad');
      const cfgDir = path.join(bmadRoot, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      const agentManifestPath = path.join(cfgDir, 'agent-manifest.csv');
      const workflowManifestPath = path.join(cfgDir, 'workflow-manifest.csv');
      fs.writeFileSync(agentManifestPath, 'name,displayName,description,module,path\n');
      fs.writeFileSync(workflowManifestPath, 'name,description,module,path\n');

      // Act
      const result = detectBmadSource(bmadRoot);

      // Assert
      expect(result.workflowManifestPath).toBe(workflowManifestPath);
    });

    it('should detect v6 modules from manifest.yaml', () => {
      // Arrange
      const bmadRoot = path.join(fixture.tmpDir, 'bmad');
      const cfgDir = path.join(bmadRoot, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      fs.writeFileSync(
        path.join(cfgDir, 'manifest.yaml'),
        `installation:
  version: 6.0.0-alpha.0
modules:
  - name: core
  - name: bmm
  - name: bmb
  - name: cis
`,
      );

      // Act
      const result = detectBmadSource(bmadRoot);

      // Assert
      expect(result.modules).toEqual(['core', 'bmm', 'bmb', 'cis']);
    });
  });

  describe('v4 structure detection', () => {
    it('should detect v4 structure from .bmad-core/install-manifest.yaml', () => {
      // Arrange: Create v4 structure (dotfolder)
      const bmadRoot = path.join(fixture.tmpDir, '.bmad-core');
      fs.mkdirSync(bmadRoot, { recursive: true });

      fs.writeFileSync(
        path.join(bmadRoot, 'install-manifest.yaml'),
        `version: 4.44.1
installed_at: '2025-10-27T16:12:27.611Z'
install_type: full
agent: null
ides_setup: []
expansion_packs:
  - bmad-2d-phaser-game-dev
files: []
`,
      );

      // Act
      const result = detectBmadSource(bmadRoot);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('v4');
      expect(result.version).toBe('4.44.1');
      expect(result.path).toBe(bmadRoot);
      expect(result.manifestPath).toBe(path.join(bmadRoot, 'install-manifest.yaml'));
    });

    it('should detect expansion packs from v4 manifest', () => {
      // Arrange
      const bmadRoot = path.join(fixture.tmpDir, '.bmad-core');
      fs.mkdirSync(bmadRoot, { recursive: true });

      fs.writeFileSync(
        path.join(bmadRoot, 'install-manifest.yaml'),
        `version: 4.44.1
expansion_packs:
  - bmad-2d-phaser-game-dev
  - bmad-infrastructure-devops
  - bmad-creative-writing
`,
      );

      // Act
      const result = detectBmadSource(bmadRoot);

      // Assert
      expect(result.expansionPacks).toEqual([
        'bmad-2d-phaser-game-dev',
        'bmad-infrastructure-devops',
        'bmad-creative-writing',
      ]);
    });

    it('should return agent directory path for v4', () => {
      // Arrange
      const bmadRoot = path.join(fixture.tmpDir, '.bmad-core');
      const agentsDir = path.join(bmadRoot, 'agents');
      fs.mkdirSync(agentsDir, { recursive: true });

      fs.writeFileSync(
        path.join(bmadRoot, 'install-manifest.yaml'),
        'version: 4.44.1\n',
      );

      // Act
      const result = detectBmadSource(bmadRoot);

      // Assert
      expect(result.agentDir).toBe(agentsDir);
    });

    it('should return workflow directory path for v4', () => {
      // Arrange
      const bmadRoot = path.join(fixture.tmpDir, '.bmad-core');
      const workflowsDir = path.join(bmadRoot, 'workflows');
      fs.mkdirSync(workflowsDir, { recursive: true });

      fs.writeFileSync(
        path.join(bmadRoot, 'install-manifest.yaml'),
        'version: 4.44.1\n',
      );

      // Act
      const result = detectBmadSource(bmadRoot);

      // Assert
      expect(result.workflowDir).toBe(workflowsDir);
    });

    it('should detect v4 even without expansion packs', () => {
      // Arrange
      const bmadRoot = path.join(fixture.tmpDir, '.bmad-core');
      fs.mkdirSync(bmadRoot, { recursive: true });

      fs.writeFileSync(
        path.join(bmadRoot, 'install-manifest.yaml'),
        'version: 4.44.1\nexpansion_packs: []\n',
      );

      // Act
      const result = detectBmadSource(bmadRoot);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('v4');
      expect(result.expansionPacks).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should return invalid for non-existent path', () => {
      // Arrange
      const nonExistentPath = path.join(fixture.tmpDir, 'does-not-exist');

      // Act
      const result = detectBmadSource(nonExistentPath);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.type).toBe('unknown');
      expect(result.error).toContain('does not exist');
    });

    it('should return invalid for path without manifest', () => {
      // Arrange: Create empty directory
      const emptyDir = path.join(fixture.tmpDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      // Act
      const result = detectBmadSource(emptyDir);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.type).toBe('unknown');
      expect(result.error).toContain('No BMAD manifest found');
    });

    it('should return invalid for file instead of directory', () => {
      // Arrange: Create a file
      const filePath = path.join(fixture.tmpDir, 'not-a-directory.txt');
      fs.writeFileSync(filePath, 'content');

      // Act
      const result = detectBmadSource(filePath);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not a directory');
    });

    it('should handle malformed manifest.yaml gracefully', () => {
      // Arrange
      const bmadRoot = path.join(fixture.tmpDir, 'bmad');
      const cfgDir = path.join(bmadRoot, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      // Write invalid YAML
      fs.writeFileSync(
        path.join(cfgDir, 'manifest.yaml'),
        'invalid: yaml: content: [[[\n',
      );

      // Act
      const result = detectBmadSource(bmadRoot);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Failed to parse');
    });

    it('should handle missing version field in manifest', () => {
      // Arrange
      const bmadRoot = path.join(fixture.tmpDir, 'bmad');
      const cfgDir = path.join(bmadRoot, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      fs.writeFileSync(
        path.join(cfgDir, 'manifest.yaml'),
        'installation:\n  installDate: "2025-01-01"\n',
      );

      // Act
      const result = detectBmadSource(bmadRoot);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('version');
    });
  });

  describe('version parsing', () => {
    it('should parse semantic version correctly', () => {
      // Arrange
      const bmadRoot = path.join(fixture.tmpDir, 'bmad');
      const cfgDir = path.join(bmadRoot, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      fs.writeFileSync(
        path.join(cfgDir, 'manifest.yaml'),
        'installation:\n  version: 6.1.2\n',
      );

      // Act
      const result = detectBmadSource(bmadRoot);

      // Assert
      expect(result.version).toBe('6.1.2');
      expect(result.versionMajor).toBe(6);
      expect(result.versionMinor).toBe(1);
      expect(result.versionPatch).toBe(2);
    });

    it('should parse prerelease versions', () => {
      // Arrange
      const bmadRoot = path.join(fixture.tmpDir, 'bmad');
      const cfgDir = path.join(bmadRoot, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      fs.writeFileSync(
        path.join(cfgDir, 'manifest.yaml'),
        'installation:\n  version: 7.0.0-beta.3\n',
      );

      // Act
      const result = detectBmadSource(bmadRoot);

      // Assert
      expect(result.version).toBe('7.0.0-beta.3');
      expect(result.versionMajor).toBe(7);
      expect(result.versionPrerelease).toBe('beta.3');
    });
  });

  describe('metadata extraction', () => {
    it('should extract install date for v6', () => {
      // Arrange
      const bmadRoot = path.join(fixture.tmpDir, 'bmad');
      const cfgDir = path.join(bmadRoot, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      fs.writeFileSync(
        path.join(cfgDir, 'manifest.yaml'),
        `installation:
  version: 6.0.0
  installDate: '2025-10-27T16:19:58.232Z'
`,
      );

      // Act
      const result = detectBmadSource(bmadRoot);

      // Assert
      expect(result.installDate).toBe('2025-10-27T16:19:58.232Z');
    });

    it('should extract install type for v4', () => {
      // Arrange
      const bmadRoot = path.join(fixture.tmpDir, '.bmad-core');
      fs.mkdirSync(bmadRoot, { recursive: true });

      fs.writeFileSync(
        path.join(bmadRoot, 'install-manifest.yaml'),
        `version: 4.44.1
install_type: full
`,
      );

      // Act
      const result = detectBmadSource(bmadRoot);

      // Assert
      expect(result.installType).toBe('full');
    });

    it('should detect configured IDEs for v6', () => {
      // Arrange
      const bmadRoot = path.join(fixture.tmpDir, 'bmad');
      const cfgDir = path.join(bmadRoot, '_cfg');
      fs.mkdirSync(cfgDir, { recursive: true });

      fs.writeFileSync(
        path.join(cfgDir, 'manifest.yaml'),
        `installation:
  version: 6.0.0
ides:
  - claude-code
  - cursor
  - vscode
`,
      );

      // Act
      const result = detectBmadSource(bmadRoot);

      // Assert
      expect(result.configuredIdes).toEqual(['claude-code', 'cursor', 'vscode']);
    });
  });

  describe('real sample paths', () => {
    it('should detect v6 from actual sample path', () => {
      // This test uses the actual sample directory if it exists
      const v6SamplePath = path.join(
        process.cwd(),
        'tests',
        'support',
        'fixtures',
        'bmad_samples',
        '6.0.0-alpha.0',
        'bmad',
      );

      // Skip if sample doesn't exist
      if (!fs.existsSync(v6SamplePath)) {
        console.warn('Skipping real sample test - path not found:', v6SamplePath);
        return;
      }

      // Act
      const result = detectBmadSource(v6SamplePath);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('v6');
      expect(result.version).toBe('6.0.0-alpha.0');
      expect(result.modules).toContain('core');
      expect(result.modules).toContain('bmm');
    });

    it('should detect v4 from actual sample path', () => {
      // This test uses the actual sample directory if it exists
      const v4SamplePath = path.join(
        process.cwd(),
        'tests',
        'support',
        'fixtures',
        'bmad_samples',
        '4.44.1',
        '.bmad-core',
      );

      // Skip if sample doesn't exist
      if (!fs.existsSync(v4SamplePath)) {
        console.warn('Skipping real sample test - path not found:', v4SamplePath);
        return;
      }

      // Act
      const result = detectBmadSource(v4SamplePath);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('v4');
      expect(result.version).toBe('4.44.1');
      expect(result.expansionPacks?.length).toBeGreaterThan(0);
    });
  });
});
