import { type BmadPathResolution } from '../../utils/bmad-path-resolver.js';
import type { BMADToolResult } from '../../types/index.js';
import { MasterManifestService } from '../../services/master-manifest-service.js';
export interface DoctorContext {
    discovery: BmadPathResolution;
    projectRoot: string;
    bmadRoot: string;
    userBmadPath: string;
    masterManifestService?: MasterManifestService;
}
export declare function doctor(command: string, ctx: DoctorContext): BMADToolResult;
export default doctor;
//# sourceMappingURL=doctor.d.ts.map