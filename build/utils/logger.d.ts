/**
 * Minimal logger wrapper centralizing logging behavior.
 * Uses console.* under the hood to preserve existing test expectations.
 */
/**
 * Configure logger with settings from config
 */
export declare function configureLogger(config: {
    debug?: boolean;
    level?: 'debug' | 'info' | 'warn' | 'error';
}): void;
export declare const logger: {
    debug: (msg: any, ...args: any[]) => void;
    info: (msg: any, ...args: any[]) => void;
    warn: (msg: any, ...args: any[]) => void;
    error: (msg: any, ...args: any[]) => void;
};
export default logger;
//# sourceMappingURL=logger.d.ts.map