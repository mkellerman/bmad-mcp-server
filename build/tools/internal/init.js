export function handleInit() {
    return performInitialization();
}
function performInitialization() {
    // BMAD initialization now requires external installation via npx bmad-method install
    // We provide a clear error message and guidance
    const message = [
        'ℹ️ Manual Installation Required',
        '',
        'The BMAD MCP server doesn\'t handle installation.',
        'Please run: npx bmad-method install',
        '',
        'Once installed, restart the MCP server to detect it.',
    ].join('\n');
    return {
        success: false,
        type: 'init',
        exitCode: 1,
        error: message,
    };
}
export default handleInit;
//# sourceMappingURL=init.js.map