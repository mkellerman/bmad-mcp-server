/**
 * Comprehensive Integration Tests for BMAD Fixture Inventory
 *
 * This test suite validates ALL agents and workflows from the test fixtures.
 * It ensures that every agent persona loads correctly and every workflow can be executed.
 *
 * Fixture structure (tests/fixtures/bmad-core-v6):
 * - core module: bmad-master agent + 2 workflows
 * - bmb module: bmad-builder agent + 10 workflows
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClientFixture } from '../../support/mcp-client-fixture.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Expected fixture inventory based on tests/fixtures/bmad-core-v6
 */
const FIXTURE_INVENTORY = {
  agents: [
    {
      module: 'core',
      name: 'bmad-master',
      file: 'bmad-master.md',
      expectedContent: ['BMad Master', 'orchestrat'],
    },
    {
      module: 'bmb',
      name: 'bmad-builder',
      file: 'bmad-builder.md',
      expectedContent: ['BMAD Builder', 'module'],
    },
  ],
  workflows: [
    // Core module workflows
    {
      module: 'core',
      name: 'party-mode',
      file: 'workflow.yaml',
      expectedContent: ['party-mode', 'workflow'],
    },
    {
      module: 'core',
      name: 'brainstorming',
      file: 'workflow.yaml',
      expectedContent: ['brainstorming', 'workflow'],
    },
    // BMB module workflows
    {
      module: 'bmb',
      name: 'module-brief',
      file: 'workflow.yaml',
      expectedContent: ['module-brief', 'workflow'],
    },
    {
      module: 'bmb',
      name: 'redoc',
      file: 'workflow.yaml',
      expectedContent: ['redoc', 'workflow'],
    },
    {
      module: 'bmb',
      name: 'create-module',
      file: 'workflow.yaml',
      expectedContent: ['create-module', 'workflow'],
    },
    {
      module: 'bmb',
      name: 'create-workflow',
      file: 'workflow.yaml',
      expectedContent: ['create-workflow', 'workflow'],
    },
    {
      module: 'bmb',
      name: 'edit-workflow',
      file: 'workflow.yaml',
      expectedContent: ['edit-workflow', 'workflow'],
    },
    {
      module: 'bmb',
      name: 'convert-legacy',
      file: 'workflow.yaml',
      expectedContent: ['convert-legacy', 'workflow'],
    },
    {
      module: 'bmb',
      name: 'edit-module',
      file: 'workflow.yaml',
      expectedContent: ['edit-module', 'workflow'],
    },
    {
      module: 'bmb',
      name: 'audit-workflow',
      file: 'workflow.yaml',
      expectedContent: ['audit-workflow', 'workflow'],
    },
    {
      module: 'bmb',
      name: 'create-agent',
      file: 'workflow.yaml',
      expectedContent: ['create-agent', 'workflow'],
    },
    {
      module: 'bmb',
      name: 'edit-agent',
      file: 'workflow.yaml',
      expectedContent: ['edit-agent', 'workflow'],
    },
  ],
};

describe('BMAD Fixture Inventory - Complete Agent & Workflow Testing', () => {
  let client: MCPClientFixture;

  beforeAll(async () => {
    // Use ONLY the fixture directory, no user .bmad or git cache
    const fixtureRoot = path.join(__dirname, '../../fixtures/bmad-core-v6');

    client = new MCPClientFixture({
      BMAD_ROOT: fixtureRoot,
      BMAD_DISABLE_USER_BMAD: 'true', // Don't load ~/.bmad
      BMAD_GIT_AUTO_UPDATE: 'false', // No git operations
      BMAD_DEBUG: 'false', // Reduce noise
    });
    await client.setup();
  }, 30000);

  afterAll(async () => {
    await client.cleanup();
  });

  describe('Agent Persona Loading - ALL Fixtures', () => {
    // Dynamically generate tests for each agent
    FIXTURE_INVENTORY.agents.forEach((agent) => {
      it(`should load ${agent.module}/${agent.name} agent persona`, async () => {
        const result = await client.callTool('bmad', {
          command: `${agent.module}/${agent.name}`,
        });

        expect(result.isError).toBe(false);

        // Verify agent content is present
        agent.expectedContent.forEach((keyword) => {
          expect(result.content.toLowerCase()).toContain(keyword.toLowerCase());
        });

        // Verify it's an agent (not a workflow or error)
        expect(result.content).toMatch(/agent|persona|role/i);
      });
    });

    it('should have loaded all expected agents', () => {
      // Sanity check: we expect 2 agents
      expect(FIXTURE_INVENTORY.agents).toHaveLength(2);
    });
  });

  describe('Workflow Execution - ALL Fixtures', () => {
    // Dynamically generate tests for each workflow
    FIXTURE_INVENTORY.workflows.forEach((workflow) => {
      it(`should execute *${workflow.name} workflow`, async () => {
        const result = await client.callTool('bmad', {
          command: `*${workflow.name}`,
        });

        expect(result.isError).toBe(false);

        // Verify workflow content is present
        workflow.expectedContent.forEach((keyword) => {
          expect(result.content.toLowerCase()).toContain(keyword.toLowerCase());
        });

        // Verify it's a workflow (contains workflow structure)
        expect(result.content).toMatch(/workflow|step|task|instruction/i);
      });
    });

    it('should have loaded all expected workflows', () => {
      // Sanity check: we expect 12 workflows (2 core + 10 bmb)
      expect(FIXTURE_INVENTORY.workflows).toHaveLength(12);
    });
  });

  describe('Fixture File Verification', () => {
    it('should have all agent files present in fixtures', async () => {
      const fixtureRoot = path.join(__dirname, '../../fixtures/bmad-core-v6');

      for (const agent of FIXTURE_INVENTORY.agents) {
        const agentPath = path.join(
          fixtureRoot,
          agent.module,
          'agents',
          agent.file,
        );
        const exists = await fs
          .access(agentPath)
          .then(() => true)
          .catch(() => false);

        expect(exists).toBe(true);
      }
    });

    it('should have all workflow files present in fixtures', async () => {
      const fixtureRoot = path.join(__dirname, '../../fixtures/bmad-core-v6');

      for (const workflow of FIXTURE_INVENTORY.workflows) {
        const workflowPath = path.join(
          fixtureRoot,
          workflow.module,
          'workflows',
          workflow.name,
          workflow.file,
        );
        const exists = await fs
          .access(workflowPath)
          .then(() => true)
          .catch(() => false);

        expect(exists).toBe(true);
      }
    });
  });

  describe('Agent Disambiguation', () => {
    it('should handle ambiguous agent names with suggestions', async () => {
      // If we just say "bmad-master" without module, it should work or give disambiguation
      const result = await client.callTool('bmad', {
        command: 'bmad-master',
      });

      // Either loads the agent OR provides disambiguation
      if (result.isError) {
        // Should provide helpful disambiguation
        expect(result.content).toMatch(/multiple|disambiguat|choose|select/i);
      } else {
        // Or just loads the only matching agent
        expect(result.content).toMatch(/BMad Master/i);
      }
    });

    it('should handle non-existent agent with helpful error', async () => {
      const result = await client.callTool('bmad', {
        command: 'nonexistent-agent-xyz',
      });

      expect(result.isError).toBe(true);
      expect(result.content).toMatch(/not found|unknown|invalid/i);
    });
  });

  describe('Workflow Disambiguation', () => {
    it('should handle ambiguous workflow names', async () => {
      // Try a workflow that exists in only one module
      const result = await client.callTool('bmad', {
        command: '*party-mode',
      });

      expect(result.isError).toBe(false);
      expect(result.content.toLowerCase()).toContain('party-mode');
    });

    it('should handle non-existent workflow with helpful error', async () => {
      const result = await client.callTool('bmad', {
        command: '*nonexistent-workflow-xyz',
      });

      expect(result.isError).toBe(true);
      expect(result.content).toMatch(/not found|unknown|invalid/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty command (load default agent)', async () => {
      const result = await client.callTool('bmad', {
        command: '',
      });

      // Should load bmad-master (default)
      expect(result.isError).toBe(false);
      expect(result.content.toLowerCase()).toMatch(/bmad.*master/i);
    });

    it('should reject invalid command formats', async () => {
      const result = await client.callTool('bmad', {
        command: '***invalid***',
      });

      expect(result.isError).toBe(true);
    });

    it('should handle qualified names correctly', async () => {
      const result = await client.callTool('bmad', {
        command: 'core/bmad-master',
      });

      expect(result.isError).toBe(false);
      expect(result.content.toLowerCase()).toContain('bmad');
    });
  });

  describe('Performance', () => {
    it('should load agents quickly from fixtures', async () => {
      const start = Date.now();

      const result = await client.callTool('bmad', {
        command: 'core/bmad-master',
      });

      const duration = Date.now() - start;

      expect(result.isError).toBe(false);
      expect(duration).toBeLessThan(5000); // Should be fast (no git, no network)
    });

    it('should load workflows quickly from fixtures', async () => {
      const start = Date.now();

      const result = await client.callTool('bmad', {
        command: '*party-mode',
      });

      const duration = Date.now() - start;

      expect(result.isError).toBe(false);
      expect(duration).toBeLessThan(5000); // Should be fast
    });
  });
});
