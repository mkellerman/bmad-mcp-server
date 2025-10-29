import type { MasterManifests } from '../types/index.js';
import type { BmadPathResolution } from '../utils/bmad-path-resolver.js';
export declare class MasterManifestService {
    private discovery;
    private cache;
    constructor(discovery: BmadPathResolution);
    generate(): MasterManifests;
    get(): MasterManifests;
    reload(): MasterManifests;
}
//# sourceMappingURL=master-manifest-service.d.ts.map