import fs from 'node:fs';
import { masterRecordToAgent } from '../../utils/master-manifest-adapter.js';
export function handleListCommand(cmd, ctx) {
    const { resolved, master, discovery } = ctx;
    const lines = [];
    if (cmd === '*list-agents') {
        // Build structured data
        const agentsByModule = new Map();
        const allAgents = [];
        const seenAgents = new Set(); // Track unique agent names
        // Convert MasterRecords to Agents with parsed metadata
        const agentRecords = resolved.agents.filter((x) => {
            const agent = x;
            return agent.kind === 'agent';
        });
        // Parse metadata from agent files
        const parsedAgents = agentRecords.map((record) => masterRecordToAgent(record, true));
        for (const agent of parsedAgents) {
            const name = (agent.name || '').toString().toLowerCase();
            const p = (agent.path || '').toString().toLowerCase();
            // Skip README files
            if (name === 'readme' || p.endsWith('/readme.md'))
                continue;
            // Skip duplicate agents (same name already seen)
            if (seenAgents.has(name))
                continue;
            seenAgents.add(name);
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
            allAgents.push(agentData);
            const moduleList = agentsByModule.get(agent.module) ?? [];
            moduleList.push(agentData);
            agentsByModule.set(agent.module, moduleList);
        }
        // Sort modules for metadata
        const sortedModules = Array.from(agentsByModule.keys()).sort();
        // Sort all agents alphabetically by command name (agent.name), not displayName
        const sortedAgents = allAgents.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        // Build markdown content
        const markdown = [];
        markdown.push('# 🤖 BMAD Agents\n');
        markdown.push(`**Found ${allAgents.length} agents across ${sortedModules.length} modules**\n`);
        markdown.push('---\n');
        // Simple list format like party-mode
        for (const agentData of sortedAgents) {
            const agent = agentData;
            const icon = agent.icon || '🤖';
            const agentName = agent.name || 'unknown';
            const displayName = agent.displayName || agent.name || 'Unknown';
            const title = agent.title || '';
            const role = agent.role || '';
            // Build line segments safely
            const segments = [];
            // Format: "- icon [agent-name]: Title (**DisplayName**) Role"
            // Example: "- 🎨 [ux-expert]: UX Expert (**Sally**) User Experience Designer + UI Specialist"
            // Start with icon and agent name
            const prefix = `- ${icon} \`${agentName}\`:`;
            if (title) {
                segments.push(title);
            }
            // Build the description parts
            segments.push(`(**${displayName}**)`);
            if (role) {
                segments.push(role);
            }
            // Join segments with separator and combine with prefix
            const agentLine = `${prefix} ${segments.join(' - ')}`;
            markdown.push(agentLine);
        }
        markdown.push('');
        markdown.push('---\n');
        markdown.push('**Tip:** Load any agent by name, e.g., `bmad analyst` or `bmad ux-expert`');
        // Build summary for structured data
        const byGroup = {};
        for (const mod of sortedModules) {
            byGroup[mod] = agentsByModule.get(mod).length;
        }
        return {
            success: true,
            type: 'list',
            listType: 'agents',
            count: allAgents.length,
            content: markdown.join('\n'),
            exitCode: 0,
            structuredData: {
                items: allAgents,
                summary: {
                    total: allAgents.length,
                    byGroup,
                    message: `Found ${allAgents.length} agents across ${sortedModules.length} modules`,
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
    return { success: false, exitCode: 1, error: 'Unknown list command' };
}
//# sourceMappingURL=list.js.map