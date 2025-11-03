import type { BMADToolResult } from '../../types/index.js';
import type { RemoteRegistry } from '../../utils/remote-registry.js';
interface ListContext {
    resolved: any;
    master: any;
    discovery: any;
    remoteRegistry?: RemoteRegistry;
}
export declare function handleListCommand(cmd: string, ctx: ListContext): Promise<BMADToolResult>;
export {};
//# sourceMappingURL=list.d.ts.map