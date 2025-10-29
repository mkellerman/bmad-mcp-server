import type { BMADToolResult, Workflow, WorkflowContext } from '../../types/index.js';
import { FileReader } from '../../utils/file-reader.js';
export interface ExecuteWorkflowOptions {
    workflowName: string;
    workflows: Workflow[];
    fileReader: FileReader;
    buildWorkflowContext: () => WorkflowContext;
}
/**
 * Execute a workflow by returning its YAML and optional instructions.
 */
export declare function executeWorkflow({ workflowName, workflows, fileReader, buildWorkflowContext, }: ExecuteWorkflowOptions): BMADToolResult;
//# sourceMappingURL=workflow-executor.d.ts.map