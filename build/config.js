import os from 'node:os';
import path from 'node:path';
function toBool(value, defaultValue) {
    if (value === undefined)
        return defaultValue;
    const v = value.toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}
function parseDiscoveryMode(value) {
    if (value === 'auto' || value === 'strict')
        return value;
    return 'auto';
}
function parseNumber(value, defaultValue) {
    if (value === undefined)
        return defaultValue;
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : defaultValue;
}
function splitList(value, defaults) {
    if (!value)
        return defaults;
    return value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}
export function loadConfig(options) {
    const argv = options?.argv ?? process.argv.slice(2);
    const env = options?.env ?? process.env;
    const modeArg = argv.find((a) => a.startsWith('--mode='));
    const modeValue = modeArg?.split('=')[1];
    const envMode = env.BMAD_DISCOVERY_MODE;
    const mode = parseDiscoveryMode(modeValue || envMode || 'auto');
    const envRoot = env.BMAD_ROOT || undefined;
    const userBmadPath = env.BMAD_USER_PATH || path.join(os.homedir(), '.bmad');
    const includeUserBmad = !toBool(env.BMAD_DISABLE_USER_BMAD, false);
    const rootSearchMaxDepth = parseNumber(env.BMAD_ROOT_SEARCH_MAX_DEPTH, 1);
    const excludeDirs = splitList(env.BMAD_EXCLUDE_DIRS, [
        '.git',
        'git',
        'node_modules',
        'cache',
        'build',
        'dist',
        'bin',
    ]);
    const gitCacheDir = env.BMAD_GIT_CACHE_DIR || path.join(userBmadPath, 'cache', 'git');
    const gitAutoUpdate = toBool(env.BMAD_AUTO_UPDATE_GIT, true);
    const debug = toBool(env.BMAD_DEBUG, false);
    const levelEnv = (env.BMAD_LOG_LEVEL || '').toLowerCase();
    const level = levelEnv === 'debug' || levelEnv === 'info' || levelEnv === 'warn' || levelEnv === 'error'
        ? levelEnv
        : debug
            ? 'debug'
            : 'info';
    const remotes = argv.filter((a) => a.startsWith('--remote='));
    return {
        discovery: {
            mode,
            envRoot,
            userBmadPath,
            includeUserBmad,
            rootSearchMaxDepth,
            excludeDirs,
        },
        git: {
            cacheDir: gitCacheDir,
            autoUpdate: gitAutoUpdate,
        },
        logging: {
            debug,
            level,
        },
        cli: {
            modeArg,
            remotes,
            rawArgs: argv,
        },
    };
}
export default loadConfig;
//# sourceMappingURL=config.js.map