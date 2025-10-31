import { type BmadPathResolution } from '../../utils/bmad-path-resolver.js';
import type { BMADToolResult } from '../../types/index.js';
export interface DoctorContext {
    discovery: BmadPathResolution;
    projectRoot: string;
    bmadRoot: string;
    userBmadPath: string;
}
export declare function doctor(command: string, ctx: DoctorContext): BMADToolResult;
//# sourceMappingURL=doctor.d.ts.map