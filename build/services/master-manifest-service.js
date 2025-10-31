import { originsFromResolution, buildMasterManifests, } from '../utils/master-manifest.js';
export class MasterManifestService {
    discovery;
    cache = null;
    constructor(discovery) {
        this.discovery = discovery;
    }
    generate() {
        const origins = originsFromResolution(this.discovery);
        this.cache = buildMasterManifests(origins);
        return this.cache;
    }
    get() {
        if (!this.cache)
            return this.generate();
        return this.cache;
    }
    reload() {
        return this.generate();
    }
}
//# sourceMappingURL=master-manifest-service.js.map