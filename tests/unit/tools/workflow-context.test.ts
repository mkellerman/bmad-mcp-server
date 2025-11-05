/**
 * Tests for enhanced workflow context with placeholder resolution
 */

import { describe, it, expect } from 'vitest';
import type { WorkflowContext } from '../../../src/types/index.js';
import path from 'node:path';

describe('Workflow Context', () => {
  describe('Placeholder Structure', () => {
    it('should have all required placeholder fields', () => {
      const context: WorkflowContext = {
        // Legacy fields
        bmadServerRoot: '/test/bmad',
        projectRoot: '/test/project',
        mcpResources: '/test/bmad',
        agentManifestPath: '/test/bmad/_cfg/agent-manifest.csv',
        agentManifestData: [],
        agentCount: 0,

        // Enhanced placeholders
        placeholders: {
          project_root: '/test/project',
          bmad_root: '/test/bmad',
          module_root: '/test/bmad/core',
          config_source: '/test/bmad/core/config.yaml',
          installed_path: '/test/bmad/core/workflows/test',
          output_folder: '/test/project/docs',
        },
      };

      expect(context.placeholders).toBeDefined();
      expect(context.placeholders.project_root).toBe('/test/project');
      expect(context.placeholders.bmad_root).toBe('/test/bmad');
      expect(context.placeholders.module_root).toBe('/test/bmad/core');
      expect(context.placeholders.config_source).toBe(
        '/test/bmad/core/config.yaml',
      );
      expect(context.placeholders.installed_path).toBe(
        '/test/bmad/core/workflows/test',
      );
      expect(context.placeholders.output_folder).toBe('/test/project/docs');
    });

    it('should support optional module and origin info', () => {
      const context: WorkflowContext = {
        bmadServerRoot: '/test/bmad',
        projectRoot: '/test/project',
        mcpResources: '/test/bmad',
        agentManifestPath: '/test/bmad/_cfg/agent-manifest.csv',
        agentManifestData: [],
        agentCount: 0,
        placeholders: {
          project_root: '/test/project',
          bmad_root: '/test/bmad',
          module_root: '/test/bmad/core',
          config_source: '/test/bmad/core/config.yaml',
          installed_path: '/test/bmad/core/workflows/test',
          output_folder: '/test/project/docs',
        },
        moduleInfo: {
          name: 'core',
          version: 'v6.x',
          bmadVersion: '6.0.0',
        },
        originInfo: {
          kind: 'project',
          displayName: 'Local project',
          priority: 1,
        },
        workflowInfo: {
          name: 'test-workflow',
          module: 'core',
          path: '/test/bmad/core/workflows/test/workflow.yaml',
          directory: '/test/bmad/core/workflows/test',
        },
      };

      expect(context.moduleInfo).toBeDefined();
      expect(context.moduleInfo?.name).toBe('core');
      expect(context.moduleInfo?.version).toBe('v6.x');

      expect(context.originInfo).toBeDefined();
      expect(context.originInfo?.kind).toBe('project');

      expect(context.workflowInfo).toBeDefined();
      expect(context.workflowInfo?.name).toBe('test-workflow');
    });
  });

  describe('Path Relationships', () => {
    it('should maintain hierarchical path relationships', () => {
      const projectRoot = '/Users/test/my-project';
      const bmadRoot = '/Users/test/.bmad/cache/git/repo/bmad';
      const moduleRoot = path.join(bmadRoot, 'core');
      const configSource = path.join(moduleRoot, 'config.yaml');
      const installedPath = path.join(bmadRoot, 'bmm/workflows/prd');
      const outputFolder = path.join(projectRoot, 'docs');

      const context: WorkflowContext = {
        bmadServerRoot: bmadRoot,
        projectRoot: bmadRoot,
        mcpResources: bmadRoot,
        agentManifestPath: path.join(bmadRoot, '_cfg/agent-manifest.csv'),
        agentManifestData: [],
        agentCount: 0,
        placeholders: {
          project_root: projectRoot,
          bmad_root: bmadRoot,
          module_root: moduleRoot,
          config_source: configSource,
          installed_path: installedPath,
          output_folder: outputFolder,
        },
      };

      // Verify relationships
      expect(context.placeholders.module_root).toContain(
        context.placeholders.bmad_root,
      );
      expect(context.placeholders.config_source).toContain(
        context.placeholders.module_root,
      );
      expect(context.placeholders.installed_path).toContain(
        context.placeholders.bmad_root,
      );
      expect(context.placeholders.output_folder).toContain(
        context.placeholders.project_root,
      );
    });

    it('should support relative path calculation', () => {
      const projectRoot = '/Users/test/my-project';
      const bmadRoot =
        '/Users/test/.bmad/cache/git/github.com-org-repo-main/bmad';
      const moduleRoot = path.join(bmadRoot, 'core');
      const installedPath = path.join(bmadRoot, 'bmm/workflows/2-plan/prd');
      const outputFolder = path.join(projectRoot, 'docs');

      // Calculate relative paths (like server.ts does)
      const relativeModuleRoot = path.relative(bmadRoot, moduleRoot);
      const relativeInstalledPath = path.relative(bmadRoot, installedPath);
      const relativeOutputFolder = path.relative(projectRoot, outputFolder);

      expect(relativeModuleRoot).toBe('core');
      expect(relativeInstalledPath).toBe('bmm/workflows/2-plan/prd');
      expect(relativeOutputFolder).toBe('docs');
    });
  });

  describe('Placeholder Name Mapping', () => {
    it('should map YAML placeholder names to TypeScript properties', () => {
      // YAML placeholder names (what appears in workflow.yaml)
      const yamlPlaceholders = {
        '{project-root}': 'project_root',
        '{bmad_root}': 'bmad_root',
        '{module_root}': 'module_root',
        '{config_source}': 'config_source',
        '{installed_path}': 'installed_path',
        '{output_folder}': 'output_folder',
      };

      const context: WorkflowContext = {
        bmadServerRoot: '/test/bmad',
        projectRoot: '/test/project',
        mcpResources: '/test/bmad',
        agentManifestPath: '/test/bmad/_cfg/agent-manifest.csv',
        agentManifestData: [],
        agentCount: 0,
        placeholders: {
          project_root: '/test/project',
          bmad_root: '/test/bmad',
          module_root: '/test/bmad/core',
          config_source: '/test/bmad/core/config.yaml',
          installed_path: '/test/bmad/core/workflows/test',
          output_folder: '/test/project/docs',
        },
      };

      // Verify all mapped properties exist
      Object.values(yamlPlaceholders).forEach((propName) => {
        expect(context.placeholders).toHaveProperty(propName);
      });
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle git cache source scenario', () => {
      const context: WorkflowContext = {
        bmadServerRoot:
          '/Users/user/.bmad/cache/git/github.com-org-BMAD-METHOD-main/bmad',
        projectRoot: '/Users/user/projects/my-app',
        mcpResources:
          '/Users/user/.bmad/cache/git/github.com-org-BMAD-METHOD-main/bmad',
        agentManifestPath:
          '/Users/user/.bmad/cache/git/github.com-org-BMAD-METHOD-main/bmad/_cfg/agent-manifest.csv',
        agentManifestData: [],
        agentCount: 16,
        placeholders: {
          project_root: '/Users/user/projects/my-app',
          bmad_root:
            '/Users/user/.bmad/cache/git/github.com-org-BMAD-METHOD-main/bmad',
          module_root:
            '/Users/user/.bmad/cache/git/github.com-org-BMAD-METHOD-main/bmad/bmm',
          config_source:
            '/Users/user/.bmad/cache/git/github.com-org-BMAD-METHOD-main/bmad/bmm/config.yaml',
          installed_path:
            '/Users/user/.bmad/cache/git/github.com-org-BMAD-METHOD-main/bmad/bmm/workflows/2-plan/prd',
          output_folder: '/Users/user/projects/my-app/docs',
        },
        moduleInfo: {
          name: 'bmm',
          version: 'v6.x',
          bmadVersion: '6.0.0-alpha.6',
        },
        originInfo: {
          kind: 'cli',
          displayName: 'CLI argument #1',
          priority: 1,
        },
        workflowInfo: {
          name: 'prd',
          module: 'bmm',
          path: '/Users/user/.bmad/cache/git/github.com-org-BMAD-METHOD-main/bmad/bmm/workflows/2-plan/prd/workflow.yaml',
          directory:
            '/Users/user/.bmad/cache/git/github.com-org-BMAD-METHOD-main/bmad/bmm/workflows/2-plan/prd',
        },
      };

      // Verify separation of concerns
      expect(context.placeholders.project_root).not.toContain('.bmad/cache');
      expect(context.placeholders.bmad_root).toContain('.bmad/cache/git');
      expect(context.placeholders.output_folder).toBe(
        '/Users/user/projects/my-app/docs',
      );
    });

    it('should handle local installation scenario', () => {
      const context: WorkflowContext = {
        bmadServerRoot: '/Users/user/projects/my-app/bmad',
        projectRoot: '/Users/user/projects/my-app',
        mcpResources: '/Users/user/projects/my-app/bmad',
        agentManifestPath:
          '/Users/user/projects/my-app/bmad/_cfg/agent-manifest.csv',
        agentManifestData: [],
        agentCount: 5,
        placeholders: {
          project_root: '/Users/user/projects/my-app',
          bmad_root: '/Users/user/projects/my-app/bmad',
          module_root: '/Users/user/projects/my-app/bmad/core',
          config_source: '/Users/user/projects/my-app/bmad/core/config.yaml',
          installed_path:
            '/Users/user/projects/my-app/bmad/core/workflows/brainstorming',
          output_folder: '/Users/user/projects/my-app/docs',
        },
        moduleInfo: {
          name: 'core',
          version: 'v6.x',
        },
        originInfo: {
          kind: 'project',
          displayName: 'Local project',
          priority: 1,
        },
      };

      // Verify local installation paths
      expect(context.placeholders.project_root).toBe(
        '/Users/user/projects/my-app',
      );
      expect(context.placeholders.bmad_root).toContain(
        context.placeholders.project_root,
      );
      expect(context.placeholders.output_folder).toContain(
        context.placeholders.project_root,
      );
    });
  });
});
