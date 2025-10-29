import path from 'node:path';
import { resolveWorkflowPlaceholders } from './placeholders.js';
/**
 * Execute a workflow by returning its YAML and optional instructions.
 */
export function executeWorkflow({ workflowName, workflows, fileReader, buildWorkflowContext, }) {
    // Find workflow in manifest
    const workflow = workflows.find((w) => w.name === workflowName);
    if (!workflow) {
        return {
            success: false,
            error: `Workflow '${workflowName}' not found in manifest`,
            exitCode: 2,
        };
    }
    const workflowPath = workflow.path;
    let workflowYaml;
    // Load workflow YAML file
    if (workflowPath) {
        try {
            const workflowYamlRaw = fileReader.readFile(workflowPath);
            workflowYaml = resolveWorkflowPlaceholders(workflowYamlRaw);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            workflowYaml = `[Error reading workflow file: ${errorMessage}]`;
        }
    }
    // Try to load instructions.md from workflow directory
    let instructions;
    if (workflowPath) {
        const workflowDir = path.dirname(workflowPath);
        const instructionsPath = path.join(workflowDir, 'instructions.md');
        try {
            const instructionsRaw = fileReader.readFile(instructionsPath);
            instructions = resolveWorkflowPlaceholders(instructionsRaw);
        }
        catch {
            // Optional
        }
    }
    const workflowContext = buildWorkflowContext();
    return {
        success: true,
        type: 'workflow',
        name: workflow.name,
        description: workflow.description || '',
        module: workflow.module,
        path: workflowPath,
        workflowYaml,
        instructions,
        context: workflowContext,
        exitCode: 0,
    };
}
//# sourceMappingURL=workflow-executor.js.map