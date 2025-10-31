import type { Agent, Workflow } from '../../types/index.js';
export declare function formatTooManyArgsError(parts: string[]): string;
export declare function formatDoubleAsteriskError(workflowName: string): string;
export declare function formatMissingWorkflowNameError(): string;
export declare function formatMissingAsteriskError(workflowName: string): string;
export declare function formatDangerousCharsError(chars: string[]): string;
export declare function formatNonAsciiError(chars: string[]): string;
export declare function formatNameTooShortError(name: string, commandType: 'agent' | 'workflow', agents: Agent[], workflows: Workflow[]): string;
export declare function formatNameTooLongError(name: string, length: number): string;
export declare function formatInvalidFormatError(name: string, commandType: 'agent' | 'workflow'): string;
export declare function formatUnknownAgentError(name: string, agents: Agent[], suggestion?: string): string;
export declare function formatUnknownWorkflowError(name: string, workflows: Workflow[], suggestion?: string): string;
export declare function formatCaseMismatchError(name: string, correctName: string): string;
//# sourceMappingURL=formatters.d.ts.map