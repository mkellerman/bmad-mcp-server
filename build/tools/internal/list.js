import fs from 'node:fs';
import { masterRecordToAgent } from '../../utils/master-manifest-adapter.js';
import { listRemotes } from '../../utils/remote-registry.js';
import { GitSourceResolver } from '../../utils/git-source-resolver.js';
import { discoverAgents, discoverModules, formatAgentList, formatModuleList, } from '../../utils/remote-discovery.js';
export async function handleListCommand(cmd, ctx) {
    const { resolved, master, discovery } = ctx;
    const lines = [];
    if (cmd === '*list-agents') {
        // Build structured data
        const agentsByModule = new Map();
        const allAgents = [];
        // Use ALL agents from master manifest for complete discoverability
        // Group by name to handle duplicates with clear loading instructions
        const allAgentRecords = master.agents;
        // Parse metadata from agent files
        const parsedAgents = allAgentRecords.map((record) => masterRecordToAgent(record, true));
        // Group agents by name to handle duplicates with clear UX
        const agentsByName = new Map();
        const uniqueAgents = [];
        for (const agent of parsedAgents) {
            const name = (agent.name || '').toString().toLowerCase();
            const p = (agent.path || '').toString().toLowerCase();
            // Skip README files
            if (name === 'readme' || p.endsWith('/readme.md'))
                continue;
            const agentData = {
                name: agent.name,
                module: agent.module,
                displayName: agent.displayName || agent.title || agent.name,
                description: agent.title,
                title: agent.title,
                icon: agent.icon,
                role: agent.role,
                source: agent.sourceLocation?.includes('manifest')
                    ? 'manifest'
                    : 'filesystem',
                path: agent.path,
                commands: [], // Commands not available in Agent interface
            };
            // Group by name for duplicate detection
            const nameGroup = agentsByName.get(name) || [];
            nameGroup.push(agentData);
            agentsByName.set(name, nameGroup);
        }
        // Process groups: show ALL agents for complete discoverability
        for (const [name, group] of agentsByName) {
            if (group.length === 1) {
                // Single agent: show with simple name (user can load with just name)
                const agent = group[0];
                agent.loadCommand = name;
                uniqueAgents.push(agent);
                const moduleList = agentsByModule.get(agent.module) ?? [];
                moduleList.push(agent);
                agentsByModule.set(agent.module, moduleList);
            }
            else {
                // Multiple agents: show ALL variants with module qualification
                // This ensures complete discoverability - users see every loadable option
                for (const agent of group) {
                    const agentTyped = agent;
                    agentTyped.loadCommand = agentTyped.module
                        ? `${agentTyped.module}/${name}`
                        : name;
                    agentTyped.isDuplicate = true;
                    agentTyped.variantInfo = `(${agentTyped.module || 'core'})`;
                    uniqueAgents.push(agentTyped);
                    const moduleList = agentsByModule.get(agentTyped.module) ?? [];
                    moduleList.push(agentTyped);
                    agentsByModule.set(agentTyped.module, moduleList);
                }
            }
        }
        // Sort modules for metadata
        const sortedModules = Array.from(agentsByModule.keys()).sort();
        // Sort all agents alphabetically by load command for intuitive UX
        const sortedAgents = uniqueAgents.sort((a, b) => {
            const nameA = (a.loadCommand || a.name || '').toLowerCase();
            const nameB = (b.loadCommand || b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        // Build markdown content with module-grouped UX design
        const markdown = [];
        markdown.push('# 🤖 BMAD Agents\n');
        markdown.push(`**Found ${uniqueAgents.length} agents across ${sortedModules.length} modules**\n`);
        markdown.push('---\n');
        // Group agents by module for better discoverability
        for (const moduleName of sortedModules) {
            const moduleAgents = agentsByModule.get(moduleName) || [];
            const displayModuleName = moduleName || 'Core/Standalone';
            markdown.push(`## 📦 ${displayModuleName}\n`);
            // Sort agents within each module
            const sortedModuleAgents = moduleAgents.sort((a, b) => {
                const nameA = (a.loadCommand || a.name || '').toLowerCase();
                const nameB = (b.loadCommand || b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
            for (const agentData of sortedModuleAgents) {
                const agent = agentData;
                const icon = agent.icon || '🤖';
                const displayName = agent.displayName || agent.name || 'Unknown';
                const title = agent.title || '';
                const role = agent.role || '';
                const loadCmd = agent.loadCommand || agent.name;
                // Build line segments safely with clear UX guidance
                const segments = [];
                // Format: "- icon `load-command`: Title (**DisplayName**) Role"
                const prefix = `- ${icon} \`${loadCmd}\`:`;
                if (title) {
                    segments.push(title);
                }
                // Always show display name for clarity
                segments.push(`(**${displayName}**)`);
                if (role) {
                    segments.push(role);
                }
                // Join segments and combine with prefix
                const agentLine = segments.length > 0 ? `${prefix} ${segments.join(' - ')}` : prefix;
                markdown.push(agentLine);
            }
            markdown.push(''); // Add spacing between modules
        }
        markdown.push('');
        markdown.push('---');
        markdown.push('**Tip:** Load any agent using the command shown above');
        markdown.push('- Simple names: `bmad analyst`');
        markdown.push('- Module-qualified: `bmad bmad-core/ux-expert`');
        markdown.push('---');
        // Build summary for structured data
        const byGroup = {};
        for (const mod of sortedModules) {
            byGroup[mod] = agentsByModule.get(mod).length;
        }
        return {
            success: true,
            type: 'list',
            listType: 'agents',
            count: uniqueAgents.length,
            content: markdown.join('\n'),
            exitCode: 0,
            structuredData: {
                items: uniqueAgents,
                summary: {
                    total: uniqueAgents.length,
                    byGroup,
                    message: `Found ${uniqueAgents.length} agents across ${sortedModules.length} modules`,
                },
                metadata: {
                    modules: sortedModules,
                    timestamp: new Date().toISOString(),
                },
                followUpSuggestions: [
                    'Tell me more about a specific agent',
                    'Show me agents in a specific module',
                    'What commands does an agent have?',
                    'Load an agent to start working',
                ],
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