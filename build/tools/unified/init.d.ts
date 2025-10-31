import type { BMADToolResult } from '../../types/index.js';
export interface InitContext {
    projectRoot: string;
    userBmadPath: string;
}
export declare function handleInit(command: string, ctx: InitContext): BMADToolResult;
//# sourceMappingURL=init.d.ts.map