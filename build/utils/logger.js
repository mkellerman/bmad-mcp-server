/**
 * Minimal logger wrapper centralizing logging behavior.
 * Uses console.* under the hood to preserve existing test expectations.
 */
function isDebugEnabled() {
    return (process.env.BMAD_DEBUG === '1' || process.env.BMAD_DEBUG === 'true');
}
function fmt(msg, ...args) {
    return [msg, ...args];
}
export const logger = {
    debug: (msg, ...args) => {
        // eslint-disable-next-line no-console
        if (isDebugEnabled())
            console.debug(...fmt(msg, ...args));
    },
    info: (msg, ...args) => console.error(...fmt(msg, ...args)),
    warn: (msg, ...args) => console.warn(...fmt(msg, ...args)),
    error: (msg, ...args) => console.error(...fmt(msg, ...args)),
};
export default logger;
//# sourceMappingURL=logger.js.map