import { MIN_NAME_LENGTH, MAX_NAME_LENGTH } from './constants.js';
function formatAvailableList(commandType, agents, workflows) {
    if (commandType === 'agent') {
        const lines = ['Available agents:'];
        const displayAgents = agents.slice(0, 10);
        for (const agent of displayAgents) {
            const name = agent.name || '';
            const title = agent.title || '';
            lines.push(`  - ${name} (${title})`);
        }
        if (agents.length > 10)
            lines.push(`  ... (${agents.length - 10} more)`);
        return lines.join('\n');
    }
    else {
        const lines = ['Available workflows:'];
        const displayWorkflows = workflows.slice(0, 10);
        for (const workflow of displayWorkflows) {
            const name = workflow.name || '';
            const desc = workflow.description || '';
            lines.push(`  - *${name} (${desc})`);
        }
        return lines.join('\n');
    }
}
export function formatTooManyArgsError(parts) {
    return `Error: Too many arguments

The bmad tool accepts only one argument at a time.

You provided: ${parts.join(' ')}

Did you mean one of these?
  - bmad ${parts[0]} (load ${parts[0]} agent)
  - bmad *${parts[1]} (execute ${parts[1]} workflow)

Usage:
  bmad                  → Load bmad-master
  bmad <agent-name>     → Load specified agent
  bmad *<workflow-name> → Execute specified workflow`;
}
export function formatDoubleAsteriskError(workflowName) {
    return `Error: Invalid syntax

Workflows require exactly one asterisk (*) prefix, not two (**).

Correct syntax:
  bmad *${workflowName}

Try: bmad *${workflowName}`;
}
export function formatMissingWorkflowNameError() {
    return `Error: Missing workflow name

The asterisk (*) prefix requires a workflow name.

Correct syntax:
  bmad *<workflow-name>

Example:
  bmad *party-mode`;
}
export function formatMissingAsteriskError(workflowName) {
    return `Error: Missing workflow prefix

'${workflowName}' appears to be a workflow name, but is missing the asterisk (*) prefix.

Workflows must be invoked with the asterisk prefix:
  Correct:   bmad *${workflowName}
  Incorrect: bmad ${workflowName}

To load an agent instead, use:
  bmad <agent-name>

Did you mean: bmad *${workflowName}?`;
}
export function formatDangerousCharsError(chars) {
    return `Error: Invalid characters detected

The command contains potentially dangerous characters: ${chars.join(', ')}

For security reasons, the following characters are not allowed:
  ; & | $ \` < > ( )

Agent and workflow names use only:
  - Lowercase letters (a-z)
  - Numbers (0-9, workflows only)
  - Hyphens (-)

Try: bmad analyst`;
}
export function formatNonAsciiError(chars) {
    return `Error: Non-ASCII characters detected

The command contains non-ASCII characters: ${chars.join(', ')}

Agent and workflow names must use ASCII characters only:
  - Lowercase letters (a-z)
  - Numbers (0-9, workflows only)
  - Hyphens (-)

Try using ASCII equivalents.`;
}
export function formatNameTooShortError(name, commandType, agents, workflows) {
    const entity = commandType === 'agent' ? 'Agent' : 'Workflow';
    const available = formatAvailableList(commandType, agents, workflows);
    return `Error: ${entity} name too short

${entity} name '${name}' is only ${name.length} character(s) long. Names must be at least ${MIN_NAME_LENGTH} characters.

${available}

Try: bmad <agent-name>`;
}
export function formatNameTooLongError(name, length) {
    return `Error: Name too long

The provided name is ${length} characters long. Names must be at most ${MAX_NAME_LENGTH} characters.

Please use a shorter agent or workflow name.`;
}
export function formatInvalidFormatError(name, commandType) {
    if (commandType === 'agent') {
        return `Error: Invalid agent name format

Agent name '${name}' contains invalid characters.

Agent names must:
  - Use lowercase letters only
  - Use hyphens (-) to separate words
  - Start and end with a letter
  - Not contain numbers or special characters

Valid examples:
  - analyst
  - bmad-master
  - game-dev`;
    }
    else {
        return `Error: Invalid workflow name format

Workflow name '${name}' contains invalid characters.

Workflow names must:
  - Use lowercase letters and numbers
  - Use hyphens (-) to separate words
  - Start and end with alphanumeric character
  - Not contain underscores or special characters

Valid examples:
  - party-mode
  - brainstorm-project
  - dev-story`;
    }
}
export function formatUnknownAgentError(name, agents, suggestion) {
    let message = `Error: Unknown agent '${name}'\n\n`;
    if (suggestion)
        message += `Did you mean: ${suggestion}?\n\n`;
    message += `The agent '${name}' is not available in the BMAD system.\n\n`;
    message += formatAvailableList('agent', agents, []);
    message += '\nTry: bmad <agent-name>\nExample: bmad analyst';
    return message;
}
export function formatUnknownWorkflowError(name, workflows, suggestion) {
    let message = `Error: Unknown workflow '*${name}'\n\n`;
    if (suggestion)
        message += `Did you mean: *${suggestion}?\n\n`;
    message += `The workflow '${name}' is not available in the BMAD system.\n\n`;
    message += formatAvailableList('workflow', [], workflows);
    message += '\nTry: bmad *<workflow-name>\nExample: bmad *party-mode';
    return message;
}
export function formatCaseMismatchError(name, correctName) {
    return `Error: Case sensitivity mismatch

Agent names are case-sensitive. '${name}' does not match '${correctName}'.

Did you mean: bmad ${correctName}?

Note: All agent and workflow names use lowercase letters only.`;
}
//# sourceMappingURL=formatters.js.map