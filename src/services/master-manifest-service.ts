import type { MasterManifests } from '../types/index.js';
import type { BmadPathResolution } from '../utils/bmad-path-resolver.js';
import {
  originsFromResolution,
  buildMasterManifests,
} from '../utils/master-manifest.js';

export class MasterManifestService {
  private discovery: BmadPathResolution;
  private cache: MasterManifests | null = null;

  constructor(discovery: BmadPathResolution) {
    this.discovery = discovery;
  }

  generate(): MasterManifests {
    const origins = originsFromResolution(this.discovery);
    
    if (origins.length === 0) {
      throw new Error('No valid BMAD origins available');
    }
    
    this.cache = buildMasterManifests(origins);
    return this.cache;
  }

  get(): MasterManifests {
    if (!this.cache) return this.generate();
    return this.cache;
  }

  reload(): MasterManifests {
    return this.generate();
  }
}
