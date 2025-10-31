import type { Agent, Workflow, ValidationResult } from '../../types/index.js';
export declare function checkSecurity(command: string): ValidationResult;
export declare function validateName(name: string, commandType: 'agent' | 'workflow', agents: Agent[], workflows: Workflow[]): ValidationResult;
//# sourceMappingURL=validators.d.ts.map