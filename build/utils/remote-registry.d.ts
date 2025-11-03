/**
 * Remote Registry - Manages remote BMAD agent repositories
 *
 * Parses --remote CLI arguments and provides resolution for @remote:path syntax
 * Format: --remote=<name>,<git-url>
 * Example: --remote=awesome,git+https://github.com/mkellerman/awesome-bmad-agents#main
 */
export interface RemoteRegistry {
    remotes: Map<string, string>;
}
/**
 * Validates remote name format
 * Must start with letter, contain only alphanumeric and hyphens
 */
export declare function isValidRemoteName(name: string): boolean;
/**
 * Validates git URL format
 * Must be git+https:// format
 */
export declare function isValidGitUrl(url: string): boolean;
/**
 * Parse --remote CLI arguments into RemoteRegistry
 *
 * @param args - Array of CLI arguments (e.g., ['--remote=awesome,git+https://...'])
 * @returns RemoteRegistry with built-in and custom remotes
 */
export declare function parseRemoteArgs(args: string[]): RemoteRegistry;
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
export declare function parseRemotePath(input: string): {
    remote: string;
    path: string;
};
/**
 * Resolve @remote:path to full git+https URL
 *
 * @param input - Input string (may or may not start with @)
 * @param registry - RemoteRegistry containing remote mappings
 * @returns Full git+https URL with path, or original input if not a remote reference
 * @throws Error if remote not found in registry
 */
export declare function resolveRemotePath(input: string, registry: RemoteRegistry): string;
/**
 * Get list of all registered remotes for display
 *
 * @param registry - RemoteRegistry
 * @returns Array of remote info objects
 */
export declare function listRemotes(registry: RemoteRegistry): Array<{
    name: string;
    url: string;
    isBuiltin: boolean;
}>;
//# sourceMappingURL=remote-registry.d.ts.map