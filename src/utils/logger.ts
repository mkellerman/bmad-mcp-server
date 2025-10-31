/**
 * Minimal logger wrapper centralizing logging behavior.
 * Uses console.* under the hood to preserve existing test expectations.
 */

function isDebugEnabled(): boolean {
  return process.env.BMAD_DEBUG === '1' || process.env.BMAD_DEBUG === 'true';
}

function fmt(msg: any, ...args: any[]): any[] {
  return [msg, ...args];
}

export const logger = {
  debug: (msg: any, ...args: any[]) => {
    // eslint-disable-next-line no-console
    if (isDebugEnabled()) console.debug(...fmt(msg, ...args));
  },
  info: (msg: any, ...args: any[]) => console.error(...fmt(msg, ...args)),
  warn: (msg: any, ...args: any[]) => console.warn(...fmt(msg, ...args)),
  error: (msg: any, ...args: any[]) => console.error(...fmt(msg, ...args)),
};

export default logger;
