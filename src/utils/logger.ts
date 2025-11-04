/**
 * Minimal logger wrapper centralizing logging behavior.
 * Uses console.* under the hood to preserve existing test expectations.
 */

let debugEnabled = false;
let logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

/**
 * Configure logger with settings from config
 */
export function configureLogger(config: {
  debug?: boolean;
  level?: 'debug' | 'info' | 'warn' | 'error';
}): void {
  debugEnabled = config.debug ?? false;
  logLevel = config.level ?? 'info';
}

function isDebugEnabled(): boolean {
  // Fall back to env var if not explicitly configured
  if (debugEnabled) return true;
  return process.env.BMAD_DEBUG === '1' || process.env.BMAD_DEBUG === 'true';
}

function shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
  const levels = ['debug', 'info', 'warn', 'error'];
  const currentLevel = levels.indexOf(logLevel);
  const messageLevel = levels.indexOf(level);
  return messageLevel >= currentLevel;
}

function fmt(msg: any, ...args: any[]): any[] {
  return [msg, ...args];
}

export const logger = {
  debug: (msg: any, ...args: any[]) => {
    if (isDebugEnabled() && shouldLog('debug'))
      // eslint-disable-next-line no-console
      console.debug(...fmt(msg, ...args));
  },
  info: (msg: any, ...args: any[]) => {
    if (shouldLog('info')) console.error(...fmt(msg, ...args));
  },
  warn: (msg: any, ...args: any[]) => {
    if (shouldLog('warn')) console.warn(...fmt(msg, ...args));
  },
  error: (msg: any, ...args: any[]) => {
    if (shouldLog('error')) console.error(...fmt(msg, ...args));
  },
};

export default logger;
