import type { Agent, Workflow, ValidationResult } from '../../types/index.js';
export declare function checkSecurity(input: string): ValidationResult;
export declare function validateName(name: string, type: 'agent' | 'workflow', agents: Agent[], workflows: Workflow[]): ValidationResult;
//# sourceMappingURL=validators.d.ts.map