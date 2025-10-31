import path from 'node:path';
import type {
  Workflow,
  BMADToolResult,
  WorkflowContext,
} from '../../types/index.js';
import { FileReader } from '../../utils/file-reader.js';
import { parseQualifiedName } from '../../utils/name-parser.js';

export interface ExecuteWorkflowOptions {
  workflowName: string;
  workflows: Workflow[];
  fileReader: FileReader;
  buildWorkflowContext: () => WorkflowContext;
}

export function executeWorkflow({
  workflowName,
  workflows,
  fileReader,
  buildWorkflowContext,
}: ExecuteWorkflowOptions): BMADToolResult {
  // Parse the workflow name to handle module-qualified names
  const parsed = parseQualifiedName(workflowName);

  // Find workflow in manifest using parsed name and optional module
  let wf: Workflow | undefined;

  if (parsed.module) {
    // Module-qualified: match both module and name
    wf = workflows.find(
      (w) => w.module === parsed.module && w.name === parsed.name,
    );
  } else {
    // Simple name: match just the name (first match by priority)
    wf = workflows.find((w) => w.name === parsed.name);
  }

  if (!wf) {
    return {
      success: false,
      error: `Workflow '${workflowName}' not found`,
      exitCode: 2,
    };
  }

  // Load workflow.yaml and optional instructions.md alongside it
  const yamlContent = fileReader.readFile(wf.path);
  const instructionsPath = path.join(path.dirname(wf.path), 'instructions.md');
  let instructions: string | undefined;
  try {
    instructions = fileReader.readFile(instructionsPath);
  } catch {
    // optional, ignore
  }

  return {
    success: true,
    type: 'workflow',
    name: wf.name,
    description: wf.description,
    module: wf.module,
    path: wf.path,
    workflowYaml: yamlContent,
    instructions,
    context: buildWorkflowContext(),
    exitCode: 0,
  };
}
