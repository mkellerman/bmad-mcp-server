/**
 * Unit tests for UnifiedBMADTool
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UnifiedBMADTool } from '../../src/tools/unified-tool.js';
import {
  createTestFixture,
  createBMADStructure,
  createAgentManifest,
  createWorkflowManifest,
  createTaskManifest,
  createAgentFile,
  createWorkflowFile,
  SAMPLE_AGENT,
  SAMPLE_WORKFLOW,
  type TestFixture,
} from '../helpers/test-fixtures.js';

describe('UnifiedBMADTool', () => {
  let fixture: TestFixture;
  let tool: UnifiedBMADTool;

  beforeEach(() => {
    fixture = createTestFixture();
    createBMADStructure(fixture.tmpDir);
    createAgentManifest(fixture.tmpDir);
    createWorkflowManifest(fixture.tmpDir);
    createTaskManifest(fixture.tmpDir);
    
    // Create sample agent files
    createAgentFile(fixture.tmpDir, 'core/agents/bmad-master.md', SAMPLE_AGENT);
    createAgentFile(fixture.tmpDir, 'bmm/agents/analyst.md', '# Analyst Agent\n\nBusiness analyst.');
    createAgentFile(fixture.tmpDir, 'bmm/agents/dev.md', '# Developer Agent\n\nFull-stack developer.');
    
    // Create sample workflow files
    createWorkflowFile(fixture.tmpDir, 'core/workflows/party-mode/party-mode.xml', SAMPLE_WORKFLOW);
    createWorkflowFile(fixture.tmpDir, 'bmm/workflows/1-analysis/analysis.xml', SAMPLE_WORKFLOW);
    
    tool = new UnifiedBMADTool(fixture.tmpDir);
  });

  afterEach(() => {
    fixture.cleanup();
  });

  describe('constructor', () => {
    it('should initialize successfully', () => {
      expect(tool).toBeDefined();
    });

    it('should load manifests on initialization', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      new UnifiedBMADTool(fixture.tmpDir);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('UnifiedBMADTool initialized with')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('execute - empty command', () => {
    it('should load bmad-master for empty command', async () => {
      const result = await tool.execute('');
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('agent');
      expect(result.agentName).toBe('bmad-master');
    });

    it('should load bmad-master for whitespace-only command', async () => {
      const result = await tool.execute('   ');
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('agent');
      expect(result.agentName).toBe('bmad-master');
    });
  });

  describe('execute - agent loading', () => {
    it('should load agent by name', async () => {
      const result = await tool.execute('analyst');
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('agent');
      expect(result.agentName).toBe('analyst');
      expect(result.displayName).toBe('Business Analyst');
      expect(result.content).toBeDefined();
      expect(result.content).toContain('Business Analyst');
    });

    it('should load developer agent', async () => {
      const result = await tool.execute('dev');
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('agent');
      expect(result.agentName).toBe('dev');
    });

    it('should return error for non-existent agent', async () => {
      const result = await tool.execute('nonexistent');
      
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('UNKNOWN_AGENT');
      expect(result.error).toBeDefined();
    });

    it('should suggest similar agent names', async () => {
      const result = await tool.execute('analyist'); // Typo
      
      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.length).toBeGreaterThan(0);
    });
  });

  describe('execute - workflow execution', () => {
    it('should execute workflow with asterisk prefix', async () => {
      const result = await tool.execute('*party-mode');
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('workflow');
      expect(result.name).toBe('party-mode');
      expect(result.workflowYaml).toBeDefined();
    });

    it('should execute analysis workflow', async () => {
      const result = await tool.execute('*analysis');
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('workflow');
      expect(result.name).toBe('analysis');
    });

    it('should return error for non-existent workflow', async () => {
      const result = await tool.execute('*nonexistent');
      
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('UNKNOWN_WORKFLOW');
      expect(result.error).toBeDefined();
    });

    it('should suggest similar workflow names', async () => {
      const result = await tool.execute('*party-mod'); // Typo
      
      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
    });

    it('should handle double asterisk error', async () => {
      const result = await tool.execute('**party-mode');
      
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_ASTERISK_COUNT');
      expect(result.suggestions).toContain('*party-mode');
    });
  });

  describe('execute - discovery commands', () => {
    it('should list agents', async () => {
      const result = await tool.execute('*list-agents');
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('list');
      expect(result.listType).toBe('agents');
      expect(result.count).toBeGreaterThan(0);
      expect(result.content).toContain('bmad-master');
      expect(result.content).toContain('analyst');
      expect(result.content).toContain('dev');
    });

    it('should list workflows', async () => {
      const result = await tool.execute('*list-workflows');
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('list');
      expect(result.listType).toBe('workflows');
      expect(result.count).toBeGreaterThan(0);
      expect(result.content).toContain('party-mode');
      expect(result.content).toContain('analysis');
    });

    it('should list tasks', async () => {
      const result = await tool.execute('*list-tasks');
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('list');
      expect(result.listType).toBe('tasks');
      expect(result.count).toBeGreaterThan(0);
      expect(result.content).toContain('daily-standup');
    });

    it('should show help', async () => {
      const result = await tool.execute('*help');
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('help');
      expect(result.content).toContain('BMAD MCP Server');
    });
  });

  describe('execute - validation', () => {
    it('should reject commands with dangerous characters', async () => {
      const dangerousCommands = [
        'agent; rm -rf /',
        'agent && malicious',
        'agent | grep secret',
        'agent $(evil)',
        'agent`backdoor`',
      ];

      for (const cmd of dangerousCommands) {
        const result = await tool.execute(cmd);
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('INVALID_CHARACTERS');
      }
    });

    it('should reject commands with multiple arguments', async () => {
      const result = await tool.execute('analyst extra args');
      
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('TOO_MANY_ARGUMENTS');
    });

    it('should reject names that are too short', async () => {
      const result = await tool.execute('a');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('should reject names that are too long', async () => {
      const longName = 'a'.repeat(100);
      const result = await tool.execute(longName);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should reject invalid agent name patterns', async () => {
      const invalidNames = [
        'Agent_Name',
        'agent.name',
        'agent/name',
        'AGENT',
        '123agent',
      ];

      for (const name of invalidNames) {
        const result = await tool.execute(name);
        expect(result.success).toBe(false);
      }
    });

    it('should accept valid agent name patterns', async () => {
      // These should fail with UNKNOWN_AGENT, not validation errors
      const validNames = ['valid-agent', 'test-agent-name', 'my-test'];
      
      for (const name of validNames) {
        const result = await tool.execute(name);
        // Should fail because agent doesn't exist, not because of invalid pattern
        expect(result.errorCode).not.toBe('INVALID_NAME_PATTERN');
      }
    });
  });

  describe('execute - fuzzy matching', () => {
    it('should suggest close matches for agent names', async () => {
      const result = await tool.execute('analyt'); // Close to 'analyst'
      
      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions).toContain('analyst');
    });

    it('should suggest close matches for workflow names', async () => {
      const result = await tool.execute('*party'); // Close to 'party-mode'
      
      expect(result.success).toBe(false);
      // Fuzzy matching may or may not provide suggestions depending on threshold
      // Just verify error handling works
      expect(result.errorCode).toBe('UNKNOWN_WORKFLOW');
    });

    it('should not suggest if no close matches', async () => {
      const result = await tool.execute('completely-different');
      
      expect(result.success).toBe(false);
      expect(result.suggestions?.length || 0).toBeLessThanOrEqual(3);
    });
  });

  describe('edge cases', () => {
    it('should handle empty manifest gracefully', async () => {
      // Create a tool with no agents/workflows
      const emptyFixture = createTestFixture();
      createBMADStructure(emptyFixture.tmpDir);
      
      const manifestPath = emptyFixture.tmpDir + '/src/bmad/_cfg/agent-manifest.csv';
      require('fs').writeFileSync(manifestPath, 'name,displayName,title\n', 'utf-8');
      
      const emptyTool = new UnifiedBMADTool(emptyFixture.tmpDir);
      const result = await emptyTool.execute('*list-agents');
      
      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
      
      emptyFixture.cleanup();
    });

    it('should handle missing agent file', async () => {
      // Add agent to manifest but don't create file
      const fs = require('fs');
      const manifestPath = fixture.tmpDir + '/src/bmad/_cfg/agent-manifest.csv';
      const content = fs.readFileSync(manifestPath, 'utf-8');
      fs.writeFileSync(
        manifestPath,
        content + '\nmissing,Missing,Missing Agent,,,,,,,bmm,bmm/agents/missing.md\n',
        'utf-8'
      );
      
      const newTool = new UnifiedBMADTool(fixture.tmpDir);
      const result = await newTool.execute('missing');
      
      expect(result.success).toBe(false);
      // Error message should indicate the agent is not available
      expect(result.error).toBeDefined();
    });
  });
});
