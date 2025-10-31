import type { BmadOrigin, MasterRecord, V6ModuleInfo } from '../types/index.js';
export interface OriginInventoryResult {
    modules: V6ModuleInfo[];
    agents: MasterRecord[];
    workflows: MasterRecord[];
    tasks: MasterRecord[];
}
/**
 * Inventory a v4 BMAD installation by reading install-manifest.yaml
 * and scanning filesystem for orphaned files
 */
export declare function inventoryOriginV4(origin: BmadOrigin): OriginInventoryResult;
//# sourceMappingURL=v4-module-inventory.d.ts.map