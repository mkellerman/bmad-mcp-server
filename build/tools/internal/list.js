import fs from 'node:fs';
import { masterRecordToAgent } from '../../utils/master-manifest-adapter.js';
import { listRemotes } from '../../utils/remote-registry.js';
import { GitSourceResolver } from '../../utils/git-source-resolver.js';
import { discoverAgents, discoverModules, formatAgentList, formatModuleList, } from '../../utils/remote-discovery.js';
import { paginationState } from '../../utils/pagination-state.js';
export async function handleListCommand(cmd, ctx) {
    const { resolved, master, discovery } = ctx;
    const lines = [];
    // Handle *more command
    if (cmd === '*more') {
        // Try to get next page from any active pagination state
        // Priority: local-agents, remote-agents-*, remote-modules-*
        const keys = [
            'local-agents',
            'local-workflows',
            'local-remotes',
            // Will also check for remote keys dynamically
        ];
        let page = null;
        let usedKey = '';
        // Try local keys first
        for (const key of keys) {
            page = paginationState.getNextPage(key);
            if (page) {
                usedKey = key;
                break;
            }
        }
        // If no local pagination found, it might be a remote list
        // We don't have a way to track which remote was last used,
        // so we'll return an error suggesting to use the list command again
        if (!page) {
            return {
                success: false,
                exitCode: 1,
                error: 'No active list to paginate. Please run a list command first (*list-agents, *list-workflows, *list-remotes, etc.)',
            };
        }
        // Determine what type of list this is
        const listType = usedKey.includes('agents')
            ? 'agents'
            : usedKey.includes('workflows')
                ? 'workflows'
                : usedKey.includes('remotes')
                    ? 'remotes'
                    : 'items';
        // Format output based on type
        const title = usedKey.includes('remote-agents')
            ? '🌐 Remote Agents (continued)'
            : usedKey.includes('remote-modules')
                ? '🌐 Remote Modules (continued)'
                : listType === 'agents'
                    ? '🤖 BMAD Agents (continued)'
                    : listType === 'workflows'
                        ? '🔄 BMAD Workflows (continued)'
                        : '📋 Items (continued)';
        lines.push(`# ${title}\n`);
        lines.push(`Showing ${page.start}-${page.end} of ${page.total}\n`);
        for (const item of page.items) {
            const num = item.number || 0;
            const name = item.displayName || item.name || 'Unknown';
            const moduleInfo = item.module ? ` (${item.module})` : '';
            lines.push(`${num}. **${name}**${moduleInfo}`);
            if (item.title) {
                lines.push(`   ${item.title}`);
            }
            else if (item.description) {
                lines.push(`   ${item.description}`);
            }
            if (item.loadCommand) {
                lines.push(`   Load: \`bmad ${item.loadCommand}\``);
            }
            lines.push('');
        }
        if (page.hasMore) {
            lines.push('---');
            lines.push('📄 **More available**');
            lines.push('Type `*more` to see the next page\n');
        }
        else {
            lines.push('---');
            lines.push('✅ End of list\n');
        }
        return {
            success: true,
            type: 'list',
            listType,
            count: page.total,
            content: lines.join('\n'),
            exitCode: 0,
            structuredData: {
                items: page.items,
                summary: {
                    total: page.total,
                    message: `Page ${page.currentPage} of ${page.totalPages}`,
                },
                metadata: {
                    currentPage: page.currentPage,
                    totalPages: page.totalPages,
                    hasMore: page.hasMore,
                },
            },
        };
    }
    if (cmd === '*list-agents') {
        // Build structured data
        const allAgentRecords = master.agents;
        // Parse metadata from agent files
        const parsedAgents = allAgentRecords.map((record) => masterRecordToAgent(record, true));
        // Process agents and build simple list
        const agents = [];
        const seenNames = new Map();
        for (const agent of parsedAgents) {
            const name = (agent.name || '').toString().toLowerCase();
            const p = (agent.path || '').toString().toLowerCase();
            // Skip README files
            if (name === 'readme' || p.endsWith('/readme.md'))
                continue;
            const displayName = agent.displayName || agent.title || agent.name;
            const title = agent.title || '';
            const module = agent.module || '';
            // Determine load command
            let loadCommand = name;
            const nameCount = seenNames.get(name) || 0;
            seenNames.set(name, nameCount + 1);
            // If duplicate name, use module-qualified form
            if (nameCount > 0 ||
                parsedAgents.filter((a) => a.name === agent.name).length > 1) {
                loadCommand = module ? `${module}/${name}` : name;
            }
            agents.push({
                number: agents.length + 1,
                name: agent.name || '',
                module,
                displayName,
                title,
                loadCommand,
            });
        }
        // Sort alphabetically by load command
        agents.sort((a, b) => a.loadCommand.localeCompare(b.loadCommand));
        // Reassign numbers after sorting
        agents.forEach((agent, idx) => {
            agent.number = idx + 1;
        });
        // Get first page
        const page = paginationState.getFirstPage('local-agents', agents, 'agents');
        // Build simple numbered list
        const lines = [];
        lines.push('# 🤖 BMAD Agents\n');
        lines.push(`Showing ${page.start}-${page.end} of ${page.total} agents\n`);
        for (const agent of page.items) {
            const moduleInfo = agent.module ? ` (${agent.module})` : '';
            lines.push(`${agent.number}. **${agent.displayName}**${moduleInfo}`);
            if (agent.title) {
                lines.push(`   ${agent.title}`);
            }
            lines.push(`   Load: \`bmad ${agent.loadCommand}\``);
            lines.push('');
        }
        if (page.hasMore) {
            lines.push('---');
            lines.push('📄 **More agents available**');
            lines.push('Type `*more` to see the next page\n');
        }
        else {
            lines.push('---');
            lines.push('✅ End of list\n');
        }
        return {
            success: true,
            type: 'list',
            listType: 'agents',
            count: page.total,
            content: lines.join('\n'),
            exitCode: 0,
            structuredData: {
                items: page.items,
                summary: {
                    total: page.total,
                    message: `Found ${page.total} agents (page ${page.currentPage}/${page.totalPages})`,
                },
                metadata: {
                    currentPage: page.currentPage,
                    totalPages: page.totalPages,
                    hasMore: page.hasMore,
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
        // Format and return
        const content = formatAgentList(result);
        return {
            success: true,
            type: 'list',
            listType: 'remote-agents',
            content,
            exitCode: 0,
            structuredData: {
                items: result.agents || [],
                summary: {
                    total: result.agents?.length || 0,
                    message: result.error ||
                        `Found ${result.agents?.length || 0} agents from @${result.remote}`,
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
        // Format and return
        const content = formatModuleList(result);
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