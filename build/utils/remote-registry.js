/**
 * Remote Registry - Manages remote BMAD agent repositories
 *
 * Parses --remote CLI arguments and provides resolution for @remote:path syntax
 * Format: --remote=<name>,<git-url>
 * Example: --remote=awesome,git+https://github.com/mkellerman/awesome-bmad-agents#main
 */
/**
 * Built-in remote repositories available by default
 */
const BUILTIN_REMOTES = new Map([
    ['awesome', 'git+https://github.com/mkellerman/awesome-bmad-agents#main'],
]);
/**
 * Validates remote name format
 * Must start with letter, contain only alphanumeric and hyphens
 */
export function isValidRemoteName(name) {
    if (!name || name.length === 0)
        return false;
    if (!/^[a-z]/.test(name))
        return false; // Must start with letter
    return /^[a-z][a-z0-9-]*$/.test(name); // Alphanumeric + hyphens, lowercase
}
/**
 * Validates git URL format
 * Must be git+https:// format
 */
export function isValidGitUrl(url) {
    if (!url || url.length === 0)
        return false;
    return url.startsWith('git+https://');
}
/**
 * Parse --remote CLI arguments into RemoteRegistry
 *
 * @param args - Array of CLI arguments (e.g., ['--remote=awesome,git+https://...'])
 * @returns RemoteRegistry with built-in and custom remotes
 */
export function parseRemoteArgs(args) {
    const remotes = new Map(BUILTIN_REMOTES);
    for (const arg of args) {
        if (!arg.startsWith('--remote='))
            continue;
        const value = arg.substring(9); // Skip '--remote='
        const commaIndex = value.indexOf(',');
        if (commaIndex === -1) {
            console.warn(`[remote-registry] Invalid --remote format (missing comma): ${arg}`);
            continue;
        }
        const name = value.substring(0, commaIndex).trim();
        const url = value.substring(commaIndex + 1).trim();
        if (!isValidRemoteName(name)) {
            console.warn(`[remote-registry] Invalid remote name '${name}': must start with letter, contain only lowercase alphanumeric and hyphens`);
            continue;
        }
        if (!isValidGitUrl(url)) {
            console.warn(`[remote-registry] Invalid remote URL for '${name}': must start with git+https://`);
            continue;
        }
        if (remotes.has(name) && BUILTIN_REMOTES.has(name)) {
            console.warn(`[remote-registry] Overriding built-in remote: @${name}`);
        }
        remotes.set(name, url);
    }
    return { remotes };
}
/**
 * Parse @remote:path syntax into remote name and path components
 *
 * Supports:
 * - @remote:path/to/agent
 * - @remote:/path/to/agent (leading slash optional)
 *
 * @param input - Input string starting with @
 * @returns Object with remote name and path
 * @throws Error if format is invalid
 */
export function parseRemotePath(input) {
    if (!input.startsWith('@')) {
        throw new Error('Remote path must start with @');
    }
    const withoutAt = input.substring(1);
    const colonIndex = withoutAt.indexOf(':');
    if (colonIndex === -1) {
        throw new Error(`Invalid remote path format. Use: @remote:path or @remote:/path`);
    }
    const remote = withoutAt.substring(0, colonIndex);
    let path = withoutAt.substring(colonIndex + 1);
    // Strip leading slash if present
    if (path.startsWith('/')) {
        path = path.substring(1);
    }
    if (!remote) {
        throw new Error('Remote name cannot be empty');
    }
    if (!path) {
        throw new Error('Path cannot be empty');
    }
    return { remote, path };
}
/**
 * Resolve @remote:path to full git+https URL
 *
 * @param input - Input string (may or may not start with @)
 * @param registry - RemoteRegistry containing remote mappings
 * @returns Full git+https URL with path, or original input if not a remote reference
 * @throws Error if remote not found in registry
 */
export function resolveRemotePath(input, registry) {
    // If doesn't start with @, assume it's already a full URL or local path
    if (!input.startsWith('@')) {
        return input;
    }
    const { remote, path } = parseRemotePath(input);
    const baseUrl = registry.remotes.get(remote);
    if (!baseUrl) {
        const available = Array.from(registry.remotes.keys())
            .map(k => `@${k}`)
            .join(', ');
        throw new Error(`Remote '@${remote}' not found.\n\n` +
            `Available remotes: ${available}\n\n` +
            `Add custom remotes via mcp.json:\n` +
            `  --remote=${remote},git+https://github.com/...`);
    }
    // Append path to base URL
    // Base URL might already have a path (e.g., git+https://...#main:/bmad)
    // We need to intelligently append our path to it
    // Check if base URL already contains a path (looks for :/ after the # ref marker)
    const hashIndex = baseUrl.indexOf('#');
    const pathSeparatorIndex = baseUrl.indexOf(':/', hashIndex !== -1 ? hashIndex : 0);
    if (pathSeparatorIndex !== -1) {
        // Base URL has path, append with / separator (not :/)
        return `${baseUrl}/${path}`;
    }
    else {
        // Base URL has no path, add it with :/ separator
        return `${baseUrl}:/${path}`;
    }
}
/**
 * Get list of all registered remotes for display
 *
 * @param registry - RemoteRegistry
 * @returns Array of remote info objects
 */
export function listRemotes(registry) {
    const result = [];
    for (const [name, url] of registry.remotes.entries()) {
        result.push({
            name,
            url,
            isBuiltin: BUILTIN_REMOTES.has(name),
        });
    }
    return result.sort((a, b) => {
        // Built-in first, then alphabetical
        if (a.isBuiltin && !b.isBuiltin)
            return -1;
        if (!a.isBuiltin && b.isBuiltin)
            return 1;
        return a.name.localeCompare(b.name);
    });
}
//# sourceMappingURL=remote-registry.js.map