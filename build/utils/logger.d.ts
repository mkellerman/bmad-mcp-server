/**
 * Minimal logger wrapper centralizing logging behavior.
 * Uses console.* under the hood to preserve existing test expectations.
 */
export declare const logger: {
    debug: (msg: any, ...args: any[]) => void;
    info: (msg: any, ...args: any[]) => void;
    warn: (msg: any, ...args: any[]) => void;
    error: (msg: any, ...args: any[]) => void;
};
export default logger;
//# sourceMappingURL=logger.d.ts.map