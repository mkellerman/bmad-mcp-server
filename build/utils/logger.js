/**
 * Minimal logger wrapper centralizing logging behavior.
 * Uses console.* under the hood to preserve existing test expectations.
 */
let debugEnabled = false;
let logLevel = 'info';
/**
 * Configure logger with settings from config
 */
export function configureLogger(config) {
    debugEnabled = config.debug ?? false;
    logLevel = config.level ?? 'info';
}
function isDebugEnabled() {
    // Fall back to env var if not explicitly configured
    if (debugEnabled)
        return true;
    return process.env.BMAD_DEBUG === '1' || process.env.BMAD_DEBUG === 'true';
}
function shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevel = levels.indexOf(logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= currentLevel;
}
function fmt(msg, ...args) {
    return [msg, ...args];
}
export const logger = {
    debug: (msg, ...args) => {
        if (isDebugEnabled() && shouldLog('debug'))
            // eslint-disable-next-line no-console
            console.debug(...fmt(msg, ...args));
    },
    info: (msg, ...args) => {
        if (shouldLog('info'))
            console.error(...fmt(msg, ...args));
    },
    warn: (msg, ...args) => {
        if (shouldLog('warn'))
            console.warn(...fmt(msg, ...args));
    },
    error: (msg, ...args) => {
        if (shouldLog('error'))
            console.error(...fmt(msg, ...args));
    },
};
export default logger;
//# sourceMappingURL=logger.js.map