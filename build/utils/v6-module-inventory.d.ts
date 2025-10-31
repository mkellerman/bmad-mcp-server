import type { BmadOrigin, MasterRecord, V6ModuleInfo } from '../types/index.js';
export interface OriginInventoryResult {
    modules: V6ModuleInfo[];
    agents: MasterRecord[];
    workflows: MasterRecord[];
    tasks: MasterRecord[];
}
export declare function inventoryOriginV6(origin: BmadOrigin): OriginInventoryResult;
//# sourceMappingURL=v6-module-inventory.d.ts.map