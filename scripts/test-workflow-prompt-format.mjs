#!/usr/bin/env node
import { getWorkflowExecutionPrompt } from '../build/config.js';

console.log('=== TESTING NEW WORKFLOW EXECUTION PROMPT ===\n');

console.log('SCENARIO 1: Agent-based workflow (with handler)\n');
console.log('---');
const agentBasedPrompt = getWorkflowExecutionPrompt({
  agent: 'pm',
  workflow: 'prd',
  workflowPath: '{project-root}/bmad/bmm/workflows/prd/workflow.yaml',
  userContext: 'Help me create a PRD for my e-commerce project',
  agentWorkflowHandler: `When menu item has: workflow="path/to/workflow.yaml"
    1. CRITICAL: Always LOAD {project-root}/bmad/core/tasks/workflow.xml
    2. Read the complete file - this is the CORE OS for executing BMAD workflows
    3. Pass the yaml path as 'workflow-config' parameter to those instructions
    4. Execute workflow.xml instructions precisely following all steps
    5. Save outputs after completing EACH workflow step
    6. If workflow.yaml path is "todo", inform user the workflow hasn't been implemented yet`,
});

console.log(agentBasedPrompt);
console.log('\n\n');

console.log('SCENARIO 2: Standalone workflow (no agent)\n');
console.log('---');
const standalonePrompt = getWorkflowExecutionPrompt({
  workflow: 'brainstorm-project',
  workflowPath:
    '{project-root}/bmad/bmm/workflows/brainstorm-project/workflow.yaml',
  userContext: 'Help me brainstorm a mobile app',
});

console.log(standalonePrompt);
