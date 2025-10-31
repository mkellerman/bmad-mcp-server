import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectManifestDirectory } from '../../utils/bmad-path-resolver.js';
export function handleInit(command, ctx) {
    const rawArgs = command.slice('*init'.length).trim();
    const normalizedArgs = rawArgs.toLowerCase();
    if (!rawArgs || normalizedArgs === '--project' || normalizedArgs === 'project') {
        return performInitialization({ scope: 'project' }, ctx);
    }
    if (normalizedArgs === '--user' || normalizedArgs === 'user') {
        return performInitialization({ scope: 'user' }, ctx);
    }
    if (normalizedArgs === '--help' || normalizedArgs === '-h' || normalizedArgs === 'help') {
        return initHelp();
    }
    return performInitialization({ scope: 'custom', customPath: rawArgs }, ctx);
}
function initHelp() {
    const lines = [
        '# BMAD Initialization',
        '',
        'Create a writable BMAD directory populated with the default templates.',
        '',
        'Usage:',
        '- `bmad *init --project` -> Copy into the current workspace (`./bmad`)',
        '- `bmad *init --user` -> Copy into the user directory (`~/.bmad`)',
        '- `bmad *init <path>` -> Copy into a custom path',
        '',
        'Priority order for resolving BMAD content:',
        '1. Local project (`./bmad`)',
        '2. Command argument (when provided)',
        '3. `BMAD_ROOT` environment variable',
        '4. User defaults (`~/.bmad`)',
        '5. Package defaults (read-only)',
        '',
        'After initialization, restart the BMAD MCP server or reconnect your client to load the new configuration.',
    ];
    return {
        success: true,
        type: 'help',
        content: lines.join('\n'),
        exitCode: 0,
    };
}
function performInitialization(options, ctx) {
    // BMAD initialization now requires external installation via npx bmad-method install
    return {
        success: false,
        exitCode: 1,
        error: 'BMAD initialization is not supported via MCP server. Please use: npx bmad-method install',
    };
}
// Legacy initialization helpers (currently disabled) preserved for completeness
function _performInitializationLegacy(options, ctx) {
    const target = resolveInitTarget(options, ctx);
    if (!target) {
        return {
            success: false,
            exitCode: 1,
            error: 'Initialization aborted: unable to determine target directory.',
        };
    }
    const existingManifest = detectManifestDirectory(target);
    if (existingManifest) {
        return {
            success: false,
            exitCode: 1,
            error: `BMAD already initialized at ${existingManifest.resolvedRoot}. Remove it before running *init again.`,
        };
    }
    if (fs.existsSync(target)) {
        const stats = fs.statSync(target);
        if (!stats.isDirectory()) {
            return {
                success: false,
                exitCode: 1,
                error: `Target path exists and is not a directory: ${target}`,
            };
        }
        const contents = fs.readdirSync(target);
        if (contents.length > 0) {
            return {
                success: false,
                exitCode: 1,
                error: `Target directory is not empty: ${target}. Choose an empty directory or remove existing files.`,
            };
        }
    }
    else {
        fs.mkdirSync(target, { recursive: true });
    }
    try {
        // copyBmadTemplate(source, target);
        throw new Error('Initialization is disabled - use npx bmad-method install');
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            exitCode: 1,
            error: `Failed to copy BMAD templates: ${errorMessage}`,
        };
    }
}
function resolveInitTarget(options, ctx) {
    if (options.scope === 'project')
        return path.join(ctx.projectRoot, 'bmad');
    if (options.scope === 'user')
        return ctx.userBmadPath;
    if (options.customPath)
        return path.resolve(expandHomePath(options.customPath));
    return undefined;
}
function expandHomePath(input) {
    const trimmed = input.trim();
    if (!trimmed)
        return trimmed;
    if (trimmed === '~')
        return os.homedir();
    if (trimmed.startsWith('~/'))
        return path.join(os.homedir(), trimmed.slice(2));
    if (trimmed.startsWith('~'))
        return path.join(os.homedir(), trimmed.slice(1));
    return trimmed;
}
function copyBmadTemplate(source, destination) {
    const entries = fs.readdirSync(source, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(source, entry.name);
        const destPath = path.join(destination, entry.name);
        if (entry.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyBmadTemplate(srcPath, destPath);
        }
        else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
function buildInitSuccessMessage(scope, targetPath) {
    return `# BMAD Initialization Successful

Scope: ${scope}
Path: ${targetPath}

Next steps:
- Restart or reconnect your MCP client to pick up the new BMAD configuration.
- Explore available agents with the MCP prompts list.
`;
}
//# sourceMappingURL=init.js.map