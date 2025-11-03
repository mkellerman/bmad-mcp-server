import fs from 'node:fs';
import { masterRecordToAgent } from '../../utils/master-manifest-adapter.js';
import { listRemotes } from '../../utils/remote-registry.js';
import { GitSourceResolver } from '../../utils/git-source-resolver.js';
import { discoverAgents, discoverModules, } from '../../utils/remote-discovery.js';
/**
 * Format a list of agents grouped by module
 */
function formatAgentsByModule(agents, title, totalCount, moduleCount) {
    const lines = [];
    lines.push(`# ${title}\n`);
    lines.push(`**Found ${totalCount} agents across ${moduleCount} modules**\n`);
    lines.push('---\n');
    // Group agents by module
    const agentsByModule = new Map();
    for (const agent of agents) {
        const moduleList = agentsByModule.get(agent.module) || [];
        moduleList.push(agent);
        agentsByModule.set(agent.module, moduleList);
    }
    // Sort modules
    const sortedModules = Array.from(agentsByModule.keys()).sort();
    // Display each module group
    for (const moduleName of sortedModules) {
        const moduleAgents = agentsByModule.get(moduleName) || [];
        const displayModuleName = moduleName || 'Core/Standalone';
        lines.push(`## 📦 ${displayModuleName}\n`);
        // Sort agents within module by load command
        const sortedAgents = moduleAgents.sort((a, b) => a.loadCommand.localeCompare(b.loadCommand));
        for (const agent of sortedAgents) {
            // Build line segments
            const segments = [];
            // Format: "- `load-command`: Title (**DisplayName**) Role"
            const prefix = `- \`${agent.loadCommand}\`:`;
            if (agent.title) {
                segments.push(agent.title);
            }
            // Always show display name for clarity
            segments.push(`(**${agent.displayName}**)`);
            if (agent.role) {
                segments.push(agent.role);
            }
            // Join segments and combine with prefix
            const agentLine = segments.length > 0 ? `${prefix} ${segments.join(' - ')}` : prefix;
            lines.push(agentLine);
        }
        lines.push(''); // Add spacing between modules
    }
    lines.push('---');
    return lines.join('\n');
}
/**
 * Simple formatter for module lists
 */
function formatModulesList(modules, remoteName) {
    const lines = [];
    lines.push(`# 🌐 Remote Modules: @${remoteName}\n`);
    lines.push(`**Found ${modules.length} modules**\n`);
    lines.push('---\n');
    for (const mod of modules) {
        lines.push(`## 📦 ${mod.name}\n`);
        if (mod.description) {
            lines.push(`${mod.description}\n`);
        }
        lines.push(`**Content:** ${mod.agentCount} agents, ${mod.workflowCount} workflows\n`);
    }
    lines.push('---');
    return lines.join('\n');
}
export async function handleListCommand(cmd, ctx) {
    const { resolved, master, discovery } = ctx;
    const lines = [];
    if (cmd === '*list-agents') {
        // Build structured data
        const allAgentRecords = master.agents;
        // Parse metadata from agent files
        const parsedAgents = allAgentRecords.map((record) => masterRecordToAgent(record, true));
        // Process agents and build list
        const agents = [];
        const seenNames = new Map();
        for (const agent of parsedAgents) {
            // Use the original record name (from filename/manifest), not the parsed display name
            const record = allAgentRecords.find((r) => r.absolutePath === agent.path);
            const name = (record?.name || agent.name || '').toString().toLowerCase();
            const p = (agent.path || '').toString().toLowerCase();
            // Skip README files
            if (name === 'readme' || p.endsWith('/readme.md'))
                continue;
            const displayName = agent.displayName || agent.title || agent.name;
            const title = agent.title || '';
            const role = agent.role || '';
            const module = agent.module || '';
            // Determine load command - use module prefix for collisions
            let loadCommand = name;
            const nameCount = seenNames.get(name) || 0;
            seenNames.set(name, nameCount + 1);
            // If duplicate name, use module-qualified form
            if (nameCount > 0 ||
                parsedAgents.filter((a) => {
                    const aRecord = allAgentRecords.find((r) => r.absolutePath === a.path);
                    const aName = (aRecord?.name || a.name || '')
                        .toString()
                        .toLowerCase();
                    return aName === name;
                }).length > 1) {
                loadCommand = module ? `${module}/${name}` : name;
            }
            agents.push({
                name: name, // Use the actual agent name (from record), not display name
                module,
                displayName,
                title,
                role,
                loadCommand,
                isDuplicate: nameCount > 0,
            });
        }
        // Sort alphabetically by load command
        agents.sort((a, b) => a.loadCommand.localeCompare(b.loadCommand));
        // Count unique modules
        const moduleCount = new Set(agents.map((a) => a.module)).size;
        // Format using shared function
        const content = formatAgentsByModule(agents, '🤖 BMAD Agents', agents.length, moduleCount);
        // Build summary for structured data
        const agentsByModule = new Map();
        for (const agent of agents) {
            const moduleList = agentsByModule.get(agent.module) || [];
            moduleList.push(agent);
            agentsByModule.set(agent.module, moduleList);
        }
        const byGroup = {};
        for (const [mod, list] of agentsByModule) {
            byGroup[mod] = list.length;
        }
        return {
            success: true,
            type: 'list',
            listType: 'agents',
            count: agents.length,
            content,
            exitCode: 0,
            structuredData: {
                items: agents,
                summary: {
                    total: agents.length,
                    byGroup,
                    message: `Found ${agents.length} agents across ${moduleCount} modules`,
                },
                metadata: {
                    modules: Array.from(agentsByModule.keys()).sort(),
                    timestamp: new Date().toISOString(),
                },
            },
        };
    }
    if (cmd === '*list-workflows') {
        // Build structured data
        const workflowsByModule = new Map();
        const allWorkflows = [];
        const seenWorkflows = new Set(); // Track unique workflow names
        for (const r of resolved.workflows.filter((x) => {
            const workflow = x;
            return workflow.kind === 'workflow';
        })) {
            const workflow = r;
            const workflowName = workflow.name ?? workflow.moduleRelativePath ?? 'unknown';
            // Skip duplicate workflows (same name already seen)
            if (seenWorkflows.has(workflowName))
                continue;
            seenWorkflows.add(workflowName);
            const workflowData = {
                name: workflowName,
                module: workflow.moduleName,
                displayName: workflow.displayName || workflow.name,
                description: workflow.description,
                source: workflow.source === 'manifest' ? 'manifest' : 'filesystem',
                path: workflow.absolutePath || workflow.moduleRelativePath,
                trigger: workflow.trigger,
            };
            allWorkflows.push(workflowData);
            const moduleList = workflowsByModule.get(workflow.moduleName) ?? [];
            moduleList.push(workflowData);
            workflowsByModule.set(workflow.moduleName, moduleList);
        }
        // Sort modules for metadata
        const sortedModules = Array.from(workflowsByModule.keys()).sort();
        // Sort all workflows alphabetically by command name (workflow.name), not displayName
        const sortedWorkflows = allWorkflows.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        // Build markdown content
        const markdown = [];
        markdown.push('# 🔄 BMAD Workflows\n');
        markdown.push(`**Found ${allWorkflows.length} workflows across ${sortedModules.length} modules**\n`);
        markdown.push('---\n');
        // Simple list format like *list-agents
        for (const workflowData of sortedWorkflows) {
            const workflow = workflowData;
            const displayName = workflow.displayName || workflow.name;
            const desc = workflow.description || '';
            // Format: "- 🔄 `workflow-name`: Description"
            const prefix = `- 🔄 \`${workflow.name}\`:`;
            const segments = [];
            // Only show displayName if it's different from the workflow name
            if (displayName && displayName !== workflow.name) {
                segments.push(`**${displayName}**`);
            }
            // Only show description if it's different from displayName (avoid duplication)
            if (desc && desc !== displayName) {
                segments.push(desc);
            }
            else if (!desc && displayName !== workflow.name) {
                // If no description but we have a different displayName, that's sufficient
            }
            else if (!segments.length) {
                // If we have nothing, just show the name in bold
                segments.push(`**${workflow.name}**`);
            }
            const workflowLine = `${prefix} ${segments.join(' - ')}`;
            markdown.push(workflowLine);
        }
        markdown.push('');
        markdown.push('---\n');
        markdown.push('**Tip:** Execute any workflow with `bmad *workflow-name`, e.g., `bmad *party-mode` or `bmad *dev-story`');
        // Build summary
        const byGroup = {};
        for (const mod of sortedModules) {
            byGroup[mod] = workflowsByModule.get(mod).length;
        }
        return {
            success: true,
            type: 'list',
            listType: 'workflows',
            count: allWorkflows.length,
            content: markdown.join('\n'),
            exitCode: 0,
            structuredData: {
                items: allWorkflows,
                summary: {
                    total: allWorkflows.length,
                    byGroup,
                    message: `Found ${allWorkflows.length} workflows across ${sortedModules.length} modules`,
                },
                metadata: {
                    modules: sortedModules,
                    timestamp: new Date().toISOString(),
                },
                followUpSuggestions: [
                    'Tell me more about a specific workflow',
                    'Show me workflows in a specific module',
                    'Execute a workflow',
                    'What does a workflow do?',
                ],
            },
        };
    }
    if (cmd.startsWith('*export-master-manifest') ||
        cmd.startsWith('*dump-master-manifest')) {
        const parts = cmd.split(' ').filter(Boolean);
        const target = parts[1] || 'master-manifest.json';
        try {
            fs.writeFileSync(target, JSON.stringify(master, null, 2), 'utf-8');
            return {
                success: true,
                type: 'list',
                listType: 'dump',
                content: `Master manifest written to ${target}`,
                exitCode: 0,
            };
        }
        catch (e) {
            return {
                success: false,
                exitCode: 1,
                error: `Failed to write file: ${e?.message || String(e)}`,
            };
        }
    }
    if (cmd === '*list-remotes') {
        if (!ctx.remoteRegistry) {
            return {
                success: false,
                exitCode: 1,
                error: 'Remote registry not available',
            };
        }
        const remotes = listRemotes(ctx.remoteRegistry);
        if (remotes.length === 0) {
            lines.push('# No Remotes Registered\n');
            lines.push('Add remotes via mcp.json:');
            lines.push('```json');
            lines.push('"args": [');
            lines.push('  "bmad-mcp-server",');
            lines.push('  "--remote=myremote,git+https://github.com/org/repo#main"');
            lines.push(']');
            lines.push('```');
        }
        else {
            lines.push('# Registered Remotes\n');
            for (const remote of remotes) {
                const badge = remote.isBuiltin ? ' (built-in)' : ' (custom)';
                const friendlyUrl = remote.url
                    .replace('git+https://github.com/', '')
                    .replace('#main', '');
                lines.push(`**@${remote.name}**${badge}`);
                lines.push(`  └─ ${friendlyUrl}\n`);
            }
            lines.push('\n## Usage\n');
            lines.push('List agents from remote:');
            lines.push('```');
            lines.push('bmad *list-agents @<remote>');
            lines.push('```\n');
            lines.push('Load agent dynamically:');
            lines.push('```');
            lines.push('bmad @<remote>:agents/<agent-name>');
            lines.push('```');
        }
        return {
            success: true,
            type: 'list',
            listType: 'remotes',
            content: lines.join('\n'),
            exitCode: 0,
        };
    }
    // Handle *list-agents @remote
    if (cmd.startsWith('*list-agents @')) {
        if (!ctx.remoteRegistry) {
            return {
                success: false,
                exitCode: 1,
                error: 'Remote registry not available',
            };
        }
        // Extract remote name from command
        const remoteName = cmd.replace('*list-agents @', '').trim();
        if (!remoteName) {
            return {
                success: false,
                exitCode: 1,
                error: 'Remote name is required. Usage: *list-agents @<remote>',
            };
        }
        // Get installed agents for comparison
        const installedAgents = new Set(master.agents.map((a) => a.name).filter(Boolean));
        // Discover agents from remote
        const gitResolver = new GitSourceResolver();
        const result = await discoverAgents(remoteName, ctx.remoteRegistry, gitResolver, installedAgents);
        if (result.error) {
            return {
                success: false,
                exitCode: 1,
                error: result.error,
            };
        }
        const discoveredAgents = result.agents || [];
        // Transform discovered agents to the same format as local agents
        const agents = [];
        // Track seen names for collision detection
        const seenNames = new Map();
        for (const agent of discoveredAgents) {
            // Extract module from path (e.g., "bmad-2d-phaser-v4" from path)
            const module = agent.path
                .split('/')
                .find((p) => p.startsWith('bmad-') || p.startsWith('debug-')) || '';
            const name = agent.name.toLowerCase().replace(/\s+/g, '-');
            const displayName = agent.displayName || agent.name;
            const title = agent.title || agent.description || '';
            // Determine load command - always use module prefix for remote
            const loadCommand = module ? `${module}/${name}` : name;
            const nameCount = seenNames.get(name) || 0;
            seenNames.set(name, nameCount + 1);
            agents.push({
                name: agent.name,
                module,
                displayName,
                title,
                loadCommand,
                isDuplicate: nameCount > 0,
            });
        }
        // Sort alphabetically by load command
        agents.sort((a, b) => a.loadCommand.localeCompare(b.loadCommand));
        // Count unique modules
        const moduleCount = new Set(agents.map((a) => a.module)).size;
        // Format using shared function
        const content = formatAgentsByModule(agents, `🌐 Remote Agents: @${remoteName}`, agents.length, moduleCount);
        // Build summary for structured data
        const agentsByModule = new Map();
        for (const agent of agents) {
            const moduleList = agentsByModule.get(agent.module) || [];
            moduleList.push(agent);
            agentsByModule.set(agent.module, moduleList);
        }
        const byGroup = {};
        for (const [mod, list] of agentsByModule) {
            byGroup[mod] = list.length;
        }
        return {
            success: true,
            type: 'list',
            listType: 'remote-agents',
            content,
            exitCode: 0,
            structuredData: {
                items: agents,
                summary: {
                    total: agents.length,
                    byGroup,
                    message: `Found ${agents.length} agents from @${remoteName}`,
                },
                metadata: {
                    remote: result.remote,
                    url: result.url,
                    localPath: result.localPath,
                    modules: Array.from(agentsByModule.keys()).sort(),
                },
            },
        };
    }
    // Handle *list-modules @remote
    if (cmd.startsWith('*list-modules @')) {
        if (!ctx.remoteRegistry) {
            return {
                success: false,
                exitCode: 1,
                error: 'Remote registry not available',
            };
        }
        // Extract remote name from command
        const remoteName = cmd.replace('*list-modules @', '').trim();
        if (!remoteName) {
            return {
                success: false,
                exitCode: 1,
                error: 'Remote name is required. Usage: *list-modules @<remote>',
            };
        }
        // Get installed modules for comparison
        const installedModules = new Set(discovery.locations
            .filter((loc) => loc.status === 'valid')
            .map((loc) => loc.moduleName)
            .filter(Boolean));
        // Discover modules from remote
        const gitResolver = new GitSourceResolver();
        const result = await discoverModules(remoteName, ctx.remoteRegistry, gitResolver, installedModules);
        if (result.error) {
            return {
                success: false,
                exitCode: 1,
                error: result.error,
            };
        }
        // Format and return
        const content = formatModulesList(result.modules || [], remoteName);
        return {
            success: true,
            type: 'list',
            listType: 'remote-modules',
            content,
            exitCode: 0,
            structuredData: {
                items: result.modules || [],
                summary: {
                    total: result.modules?.length || 0,
                    message: result.error ||
                        `Found ${result.modules?.length || 0} modules from @${result.remote}`,
                },
                metadata: {
                    remote: result.remote,
                    url: result.url,
                    localPath: result.localPath,
                    error: result.error,
                },
            },
        };
    }
    return { success: false, exitCode: 1, error: 'Unknown list command' };
}
//# sourceMappingURL=list.js.map