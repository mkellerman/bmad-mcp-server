import type { DiscoveryMode } from './types/index.js';
export interface DiscoveryConfig {
    mode: DiscoveryMode;
    envRoot?: string;
    userBmadPath: string;
    includeUserBmad: boolean;
    rootSearchMaxDepth: number;
    excludeDirs: string[];
}
export interface GitConfig {
    cacheDir: string;
    autoUpdate: boolean;
}
export interface LoggingConfig {
    debug: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
}
export interface CLIConfig {
    modeArg?: string;
    remotes: string[];
    rawArgs: string[];
}
export interface BMADConfig {
    discovery: DiscoveryConfig;
    git: GitConfig;
    logging: LoggingConfig;
    cli: CLIConfig;
}
export declare function loadConfig(options?: {
    argv?: string[];
    env?: NodeJS.ProcessEnv;
}): BMADConfig;
export default loadConfig;
//# sourceMappingURL=config.d.ts.map