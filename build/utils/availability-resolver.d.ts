import type { MasterManifests, MasterRecord, BmadOriginSource } from '../types/index.js';
export interface ResolveOptions {
    originPriority?: BmadOriginSource[];
    scope?: 'active-only' | 'all';
    prefer?: 'manifest' | 'filesystem';
    activeRoot?: string;
    activeRoots?: string[];
}
export interface ConflictDetail {
    key: string;
    selected: MasterRecord | null;
    candidates: MasterRecord[];
}
export interface AvailableCatalog {
    agents: MasterRecord[];
    workflows: MasterRecord[];
    tasks: MasterRecord[];
    conflicts: ConflictDetail[];
}
export declare function resolveAvailableCatalog(master: MasterManifests, options?: ResolveOptions): AvailableCatalog;
//# sourceMappingURL=availability-resolver.d.ts.map