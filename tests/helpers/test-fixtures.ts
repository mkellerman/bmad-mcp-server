/**
 * Test fixtures and helpers for BMAD MCP Server tests
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface TestFixture {
  tmpDir: string;
  cleanup: () => void;
}

/**
 * Create a temporary test directory with BMAD structure
 */
export function createTestFixture(): TestFixture {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-test-'));

  const cleanup = () => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  };

  return { tmpDir, cleanup };
}

/**
 * Create a minimal BMAD directory structure for testing
 */
export function createBMADStructure(baseDir: string): void {
  // Create src/bmad/_cfg directory
  const manifestDir = path.join(baseDir, 'src', 'bmad', '_cfg');
  fs.mkdirSync(manifestDir, { recursive: true });

  // Create agents directory
  const agentsDir = path.join(baseDir, 'src', 'bmad', 'bmm', 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });

  // Create workflows directory
  const workflowsDir = path.join(baseDir, 'src', 'bmad', 'bmm', 'workflows');
  fs.mkdirSync(workflowsDir, { recursive: true });

  // Create core agents directory
  const coreAgentsDir = path.join(baseDir, 'src', 'bmad', 'core', 'agents');
  fs.mkdirSync(coreAgentsDir, { recursive: true });

  // Create v6-style manifest.yaml (required for master manifest detection)
  const manifestYaml = `# BMAD v6 Manifest
version: "6.0.0"
modules:
  - name: core
    version: "6.0.0"
    path: core
  - name: bmm
    version: "6.0.0"
    path: bmm
`;
  fs.writeFileSync(
    path.join(manifestDir, 'manifest.yaml'),
    manifestYaml,
    'utf-8',
  );
}

/**
 * Create a sample agent manifest CSV
 */
export function createAgentManifest(baseDir: string): void {
  const manifestPath = path.join(
    baseDir,
    'src',
    'bmad',
    '_cfg',
    'agent-manifest.csv',
  );
  const content = `name,displayName,title,icon,role,identity,communicationStyle,principles,module,path
bmad-master,BMAD Master,AI Agent Orchestrator,🎯,orchestrator,You are the BMAD Master,Direct,Agile,core,core/agents/bmad-master.md
analyst,Business Analyst,Requirements Analyst,📊,analyst,You are a business analyst,Professional,User-focused,bmm,bmm/agents/analyst.md
dev,Developer,Full-Stack Developer,👨‍💻,developer,You are a developer,Technical,Clean code,bmm,bmm/agents/dev.md`;

  fs.writeFileSync(manifestPath, content, 'utf-8');
}

/**
 * Create a sample workflow manifest CSV
 */
export function createWorkflowManifest(baseDir: string): void {
  const manifestPath = path.join(
    baseDir,
    'src',
    'bmad',
    '_cfg',
    'workflow-manifest.csv',
  );
  const content = `name,description,trigger,module,path
party-mode,Brainstorming party mode,*party-mode,core,core/workflows/party-mode/party-mode.xml
analysis,Requirements analysis workflow,*analysis,bmm,bmm/workflows/1-analysis/analysis.xml`;

  fs.writeFileSync(manifestPath, content, 'utf-8');
}

/**
 * Create a sample task manifest CSV
 */
export function createTaskManifest(baseDir: string): void {
  const manifestPath = path.join(
    baseDir,
    'src',
    'bmad',
    '_cfg',
    'task-manifest.csv',
  );
  const content = `name,description,module,path
daily-standup,Daily standup meeting,bmm,bmm/tasks/daily-standup.xml
retrospective,Sprint retrospective,bmm,bmm/tasks/retrospective.xml`;

  fs.writeFileSync(manifestPath, content, 'utf-8');
}

/**
 * Create a sample agent file
 */
export function createAgentFile(
  baseDir: string,
  agentPath: string,
  content: string,
): void {
  const fullPath = path.join(baseDir, 'src', 'bmad', agentPath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, content, 'utf-8');
}

/**
 * Create a sample workflow file
 */
export function createWorkflowFile(
  baseDir: string,
  workflowPath: string,
  content: string,
): void {
  const fullPath = path.join(baseDir, 'src', 'bmad', workflowPath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, content, 'utf-8');
}

/**
 * Sample agent content
 */
export const SAMPLE_AGENT = `# Test Agent

You are a test agent for unit testing.

## Role
Testing specialist

## Responsibilities
- Run tests
- Validate functionality
- Report issues
`;

/**
 * Sample workflow content
 */
export const SAMPLE_WORKFLOW = `<?xml version="1.0" encoding="UTF-8"?>
<workflow>
  <name>Test Workflow</name>
  <description>A test workflow for unit testing</description>
  <steps>
    <step id="1">First step</step>
    <step id="2">Second step</step>
  </steps>
</workflow>`;
