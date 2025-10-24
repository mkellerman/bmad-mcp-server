"""
Unified BMAD Tool - Instruction-based routing for agents and workflows.

This module implements a single `bmad` tool that intelligently routes commands:
- `bmad` → Load bmad-master agent (default)
- `bmad <agent-name>` → Load specified agent
- `bmad *<workflow-name>` → Execute specified workflow

The tool uses instruction-based routing where the LLM reads instructions
in the tool description to understand how to route commands correctly.
"""

import logging
import re
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Optional, Tuple

from src.loaders.manifest_loader import ManifestLoader
from src.utils.file_reader import FileReader

logger = logging.getLogger(__name__)


# Validation patterns
AGENT_NAME_PATTERN = re.compile(r'^[a-z]+(-[a-z]+)*$')
WORKFLOW_NAME_PATTERN = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')
MIN_NAME_LENGTH = 2
MAX_NAME_LENGTH = 50
DANGEROUS_CHARS = [';', '&', '|', '$', '`', '<', '>', '\n', '\r', '(', ')']
FUZZY_MATCH_THRESHOLD = 0.70


class ValidationResult:
    """Result of input validation."""

    def __init__(
        self,
        valid: bool,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
        suggestions: Optional[list[str]] = None,
        exit_code: int = 0
    ):
        self.valid = valid
        self.error_code = error_code
        self.error_message = error_message
        self.suggestions = suggestions or []
        self.exit_code = exit_code


class UnifiedBMADTool:
    """
    Unified BMAD tool handler with instruction-based routing.

    Handles all BMAD commands through a single entry point:
    - Agent loading
    - Workflow execution
    - Smart error handling with fuzzy matching
    - Comprehensive validation
    """

    def __init__(self, bmad_root: Path):
        """
        Initialize unified BMAD tool.

        Args:
            bmad_root: Path to BMAD installation directory
        """
        self.bmad_root = Path(bmad_root).resolve()
        self.manifest_loader = ManifestLoader(self.bmad_root)
        self.file_reader = FileReader(self.bmad_root)

        # Load manifests on init for validation
        self.agents = self.manifest_loader.load_agent_manifest()
        self.workflows = self.manifest_loader.load_workflow_manifest()

        logger.info(
            f"UnifiedBMADTool initialized with {len(self.agents)} agents "
            f"and {len(self.workflows)} workflows"
        )

    async def execute(self, command: str) -> dict[str, Any]:
        """
        Execute unified BMAD command with intelligent routing.

        Args:
            command: Command string to parse and execute
                    - "" or whitespace → load bmad-master
                    - "agent-name" → load specified agent
                    - "*workflow-name" → execute workflow

        Returns:
            Dict with result data or error information
        """
        # Normalize command (trim whitespace)
        normalized = command.strip()

        # Empty command → load bmad-master (default)
        if not normalized:
            logger.info("Empty command, loading bmad-master (default)")
            return await self._load_agent("bmad-master")

        # Check for built-in discovery commands first (before parsing)
        if normalized == "*list-agents":
            logger.info("Discovery command: list-agents")
            return await self._list_agents()
        elif normalized == "*list-workflows":
            logger.info("Discovery command: list-workflows")
            return await self._list_workflows()
        elif normalized == "*list-tasks":
            logger.info("Discovery command: list-tasks")
            return await self._list_tasks()
        elif normalized == "*help":
            logger.info("Discovery command: help")
            return await self._help()

        # Parse command to determine type
        command_type, name = self._parse_command(normalized)

        if command_type == "error":
            # Validation error occurred
            return self._format_error_response(name)  # name contains ValidationResult

        # Validate the name
        validation = self._validate_name(name, command_type)
        if not validation.valid:
            return self._format_error_response(validation)

        # Route to appropriate handler
        if command_type == "workflow":
            return await self._execute_workflow(name)
        else:  # agent
            return await self._load_agent(name)

    def _parse_command(self, command: str) -> Tuple[str, Any]:
        """
        Parse command to determine type and extract name.

        Returns:
            Tuple of (command_type, name_or_validation_result)
            command_type: "agent", "workflow", or "error"
            name_or_validation_result: string name or ValidationResult on error
        """
        # Security check: dangerous characters
        validation = self._check_security(command)
        if not validation.valid:
            return ("error", validation)

        # Check for multiple arguments (spaces)
        if ' ' in command:
            parts = command.split()
            if len(parts) > 1:
                return ("error", ValidationResult(
                    valid=False,
                    error_code="TOO_MANY_ARGUMENTS",
                    error_message=self._format_too_many_args_error(parts),
                    exit_code=1
                ))

        # Workflow pattern: starts with *
        if command.startswith('**'):
            # Double asterisk error
            workflow_name = command[2:]
            return ("error", ValidationResult(
                valid=False,
                error_code="INVALID_ASTERISK_COUNT",
                error_message=self._format_double_asterisk_error(workflow_name),
                suggestions=[f"*{workflow_name}"],
                exit_code=1
            ))
        elif command.startswith('*'):
            # Extract workflow name (everything after *)
            workflow_name = command[1:].strip()

            if not workflow_name:
                # Asterisk only, no name
                return ("error", ValidationResult(
                    valid=False,
                    error_code="MISSING_WORKFLOW_NAME",
                    error_message=self._format_missing_workflow_name_error(),
                    exit_code=1
                ))

            return ("workflow", workflow_name)
        else:
            # Agent pattern: no asterisk
            agent_name = command

            # Check if user forgot asterisk for workflow
            if self._is_workflow_name(agent_name):
                return ("error", ValidationResult(
                    valid=False,
                    error_code="MISSING_ASTERISK",
                    error_message=self._format_missing_asterisk_error(agent_name),
                    suggestions=[f"*{agent_name}"],
                    exit_code=1
                ))

            return ("agent", agent_name)

    def _check_security(self, command: str) -> ValidationResult:
        """Check for dangerous characters and non-ASCII."""
        # Check dangerous characters
        found_dangerous = [c for c in DANGEROUS_CHARS if c in command]
        if found_dangerous:
            return ValidationResult(
                valid=False,
                error_code="INVALID_CHARACTERS",
                error_message=self._format_dangerous_chars_error(found_dangerous),
                exit_code=1
            )

        # Check non-ASCII
        if not command.isascii():
            non_ascii = [c for c in command if ord(c) > 127]
            return ValidationResult(
                valid=False,
                error_code="NON_ASCII_CHARACTERS",
                error_message=self._format_non_ascii_error(non_ascii),
                exit_code=1
            )

        return ValidationResult(valid=True)

    def _validate_name(self, name: str, command_type: str) -> ValidationResult:
        """
        Validate agent or workflow name.

        Args:
            name: Name to validate
            command_type: "agent" or "workflow"

        Returns:
            ValidationResult
        """
        # Length validation
        if len(name) < MIN_NAME_LENGTH:
            return ValidationResult(
                valid=False,
                error_code="NAME_TOO_SHORT",
                error_message=self._format_name_too_short_error(name, command_type),
                exit_code=1
            )

        if len(name) > MAX_NAME_LENGTH:
            return ValidationResult(
                valid=False,
                error_code="NAME_TOO_LONG",
                error_message=self._format_name_too_long_error(name, len(name)),
                exit_code=1
            )

        # Pattern validation
        pattern = WORKFLOW_NAME_PATTERN if command_type == "workflow" else AGENT_NAME_PATTERN
        if not pattern.match(name):
            return ValidationResult(
                valid=False,
                error_code="INVALID_NAME_FORMAT",
                error_message=self._format_invalid_format_error(name, command_type),
                exit_code=1
            )

        # Existence validation
        if command_type == "workflow":
            if not self._is_workflow_name(name):
                # Try fuzzy match
                suggestion = self._find_closest_match(name, self._get_workflow_names())
                return ValidationResult(
                    valid=False,
                    error_code="UNKNOWN_WORKFLOW",
                    error_message=self._format_unknown_workflow_error(name, suggestion),
                    suggestions=[suggestion] if suggestion else [],
                    exit_code=1
                )
        else:  # agent
            if not self._is_agent_name(name):
                # Check case mismatch
                case_match = self._check_case_mismatch(name, self._get_agent_names())
                if case_match:
                    return ValidationResult(
                        valid=False,
                        error_code="CASE_MISMATCH",
                        error_message=self._format_case_mismatch_error(name, case_match),
                        suggestions=[case_match],
                        exit_code=1
                    )

                # Try fuzzy match
                suggestion = self._find_closest_match(name, self._get_agent_names())
                return ValidationResult(
                    valid=False,
                    error_code="UNKNOWN_AGENT",
                    error_message=self._format_unknown_agent_error(name, suggestion),
                    suggestions=[suggestion] if suggestion else [],
                    exit_code=1
                )

        return ValidationResult(valid=True)

    def _is_agent_name(self, name: str) -> bool:
        """Check if name exists in agent manifest."""
        return any(a.get('name') == name for a in self.agents)

    def _is_workflow_name(self, name: str) -> bool:
        """Check if name exists in workflow manifest."""
        return any(w.get('name') == name for w in self.workflows)

    def _get_agent_names(self) -> list[str]:
        """Get list of all agent names."""
        return [a.get('name', '') for a in self.agents]

    def _get_workflow_names(self) -> list[str]:
        """Get list of all workflow names."""
        return [w.get('name', '') for w in self.workflows]

    def _check_case_mismatch(self, name: str, valid_names: list[str]) -> Optional[str]:
        """Check if name matches a valid name but with wrong case."""
        lowercase_name = name.lower()
        for valid_name in valid_names:
            if valid_name.lower() == lowercase_name and valid_name != name:
                return valid_name
        return None

    def _find_closest_match(
        self,
        input_name: str,
        valid_names: list[str]
    ) -> Optional[str]:
        """
        Find closest matching name using fuzzy matching.

        Uses SequenceMatcher with 70% similarity threshold.

        Args:
            input_name: User input
            valid_names: List of valid names to match against

        Returns:
            Closest match if >= 70% similar, None otherwise
        """
        best_match = None
        best_score = 0.0

        for valid_name in valid_names:
            ratio = SequenceMatcher(None, input_name.lower(), valid_name.lower()).ratio()
            if ratio >= FUZZY_MATCH_THRESHOLD and ratio > best_score:
                best_score = ratio
                best_match = valid_name

        return best_match

    async def _load_agent(self, agent_name: str) -> dict[str, Any]:
        """
        Load agent prompt content.

        Args:
            agent_name: Name of agent to load

        Returns:
            Dict with agent prompt content
        """
        logger.info(f"Loading agent: {agent_name}")

        # Find agent in manifest
        agent = next((a for a in self.agents if a.get('name') == agent_name), None)

        if not agent:
            # This shouldn't happen after validation, but handle gracefully
            return {
                "success": False,
                "error": f"Agent '{agent_name}' not found in manifest",
                "exit_code": 2
            }

        # Build agent prompt content
        content_parts = []

        # Header
        display_name = agent.get('displayName', agent_name)
        title = agent.get('title', 'BMAD Agent')
        content_parts.append(f"# BMAD Agent: {display_name}")
        content_parts.append(f"**Title:** {title}\n")

        # Agent markdown file
        agent_path = agent.get('path', '')
        if agent_path:
            content_parts.append(f"## Agent Definition\n")
            content_parts.append(f"**File:** `{agent_path}`\n")

            try:
                agent_md_content_raw = self.file_reader.read_file(agent_path)
                # Dynamically replace {project-root} with {mcp-resources}
                agent_md_content = self._resolve_workflow_placeholders(agent_md_content_raw)
                content_parts.append("```markdown")
                content_parts.append(agent_md_content)
                content_parts.append("```\n")
            except Exception as e:
                content_parts.append(f"[Error reading agent file: {e}]\n")
                logger.error(f"Error reading agent file {agent_path}: {e}")

        # Customization YAML file
        module = agent.get('module', 'bmm')
        customize_path = f"bmad/_cfg/agents/{module}-{agent_name}.customize.yaml"
        content_parts.append(f"## Agent Customization\n")
        content_parts.append(f"**File:** `{customize_path}`\n")

        try:
            yaml_content_raw = self.file_reader.read_file(customize_path)
            # Dynamically replace {project-root} with {mcp-resources}
            yaml_content = self._resolve_workflow_placeholders(yaml_content_raw)
            content_parts.append("```yaml")
            content_parts.append(yaml_content)
            content_parts.append("```\n")
        except Exception as e:
            content_parts.append(f"[Customization file not found or error: {e}]\n")

        # BMAD Processing Instructions
        content_parts.append(self._get_agent_instructions())

        return {
            "success": True,
            "type": "agent",
            "agent_name": agent_name,
            "display_name": display_name,
            "content": "\n".join(content_parts),
            "exit_code": 0
        }

    async def _list_agents(self) -> dict[str, Any]:
        """
        List all available agents from agent manifest.
        
        Returns:
            Dict with formatted agent list
        """
        content_parts = ["# Available BMAD Agents\n"]
        
        if not self.agents:
            content_parts.append("No agents found in manifest.\n")
        else:
            content_parts.append(f"Found {len(self.agents)} agents:\n")
            
            for i, agent in enumerate(self.agents, 1):
                name = agent.get('name', 'unknown')
                display_name = agent.get('displayName', name)
                role = agent.get('role', 'No role specified')
                module = agent.get('module', 'core')
                
                content_parts.append(f"\n{i}. **{display_name}** (`{name}`)")
                content_parts.append(f"   - Role: {role}")
                content_parts.append(f"   - Module: {module}")
                content_parts.append(f"   - Command: `bmad {name}`\n")
        
        content_parts.append("\n**Usage:**")
        content_parts.append("- Load an agent: `bmad <agent-name>`")
        content_parts.append("- Example: `bmad analyst` loads Mary, the Business Analyst\n")
        
        return {
            "success": True,
            "type": "list",
            "list_type": "agents",
            "count": len(self.agents),
            "content": "\n".join(content_parts),
            "exit_code": 0
        }

    async def _list_workflows(self) -> dict[str, Any]:
        """
        List all available workflows from workflow manifest.
        
        Returns:
            Dict with formatted workflow list
        """
        content_parts = ["# Available BMAD Workflows\n"]
        
        if not self.workflows:
            content_parts.append("No workflows found in manifest.\n")
        else:
            content_parts.append(f"Found {len(self.workflows)} workflows:\n")
            
            for i, workflow in enumerate(self.workflows, 1):
                name = workflow.get('name', 'unknown')
                description = workflow.get('description', 'No description')
                trigger = workflow.get('trigger', name)
                module = workflow.get('module', 'core')
                
                content_parts.append(f"\n{i}. **{trigger}** - {description}")
                content_parts.append(f"   - Module: {module}")
                content_parts.append(f"   - Command: `bmad *{trigger}`\n")
        
        content_parts.append("\n**Usage:**")
        content_parts.append("- Execute a workflow: `bmad *<workflow-name>`")
        content_parts.append("- Example: `bmad *party-mode` starts group discussion\n")
        
        return {
            "success": True,
            "type": "list",
            "list_type": "workflows",
            "count": len(self.workflows),
            "content": "\n".join(content_parts),
            "exit_code": 0
        }

    async def _list_tasks(self) -> dict[str, Any]:
        """
        List all available tasks from task manifest.
        
        Returns:
            Dict with formatted task list
        """
        content_parts = ["# Available BMAD Tasks\n"]
        
        # Load task manifest
        task_manifest_path = self.bmad_root / "_cfg" / "task-manifest.csv"
        tasks = []
        
        if task_manifest_path.exists():
            try:
                import csv
                with open(task_manifest_path, 'r') as f:
                    reader = csv.DictReader(f)
                    tasks = list(reader)
            except Exception as e:
                logger.error(f"Error reading task manifest: {e}")
                content_parts.append(f"Error reading task manifest: {e}\n")
                
        if not tasks:
            content_parts.append("No tasks found in manifest.\n")
        else:
            content_parts.append(f"Found {len(tasks)} tasks:\n")
            
            for i, task in enumerate(tasks, 1):
                name = task.get('name', 'unknown')
                description = task.get('description', 'No description')
                module = task.get('module', 'core')
                
                content_parts.append(f"\n{i}. **{name}**")
                content_parts.append(f"   - {description}")
                content_parts.append(f"   - Module: {module}\n")
        
        content_parts.append("\n**Note:** Tasks are referenced within workflows and agent instructions.\n")
        
        return {
            "success": True,
            "type": "list",
            "list_type": "tasks",
            "count": len(tasks),
            "content": "\n".join(content_parts),
            "exit_code": 0
        }

    async def _help(self) -> dict[str, Any]:
        """
        Show help and command reference.
        
        Returns:
            Dict with help content
        """
        content_parts = [
            "# BMAD MCP Server - Command Reference\n",
            "## Available Commands\n",
            "### Load Agents",
            "Load and interact with BMAD agents:",
            "- `bmad \"\"` or `bmad` (empty) → Load bmad-master (default agent)",
            "- `bmad <agent-name>` → Load specific agent",
            "- Examples:",
            "  - `bmad analyst` → Load Mary (Business Analyst)",
            "  - `bmad dev` → Load Olivia (Senior Developer)",
            "  - `bmad tea` → Load Murat (Master Test Architect)\n",
            
            "### Execute Workflows",
            "Run BMAD workflows (prefix with `*`):",
            "- `bmad *<workflow-name>` → Execute workflow",
            "- Examples:",
            "  - `bmad *party-mode` → Start group discussion with all agents",
            "  - `bmad *framework` → Initialize test framework\n",
            
            "### Discovery Commands",
            "Explore available BMAD resources:",
            "- `bmad *list-agents` → Show all available agents",
            "- `bmad *list-workflows` → Show all available workflows",
            "- `bmad *list-tasks` → Show all available tasks",
            "- `bmad *help` → Show this help message\n",
            
            "## Quick Start",
            "1. **Discover agents:** `bmad *list-agents`",
            "2. **Load an agent:** `bmad analyst`",
            "3. **Discover workflows:** `bmad *list-workflows`",
            "4. **Run a workflow:** `bmad *party-mode`\n",
            
            "## Agent vs Workflow",
            "- **Agents** provide personas and interactive menus (no `*` prefix)",
            "- **Workflows** execute automated tasks (use `*` prefix)\n",
            
            "## MCP Resources",
            f"All resources are loaded from: `{self.bmad_root}`",
            f"- Agents: {len(self.agents)} available",
            f"- Workflows: {len(self.workflows)} available\n",
            
            "For more information about specific agents or workflows, use the `*list-*` commands."
        ]
        
        return {
            "success": True,
            "type": "help",
            "content": "\n".join(content_parts),
            "exit_code": 0
        }

    async def _execute_workflow(self, workflow_name: str) -> dict[str, Any]:
        """
        Execute workflow by loading its configuration and instructions.

        Args:
            workflow_name: Name of workflow to execute

        Returns:
            Dict with workflow content and instructions
        """
        logger.info(f"Executing workflow: {workflow_name}")

        # Find workflow in manifest
        workflow = next(
            (w for w in self.workflows if w.get('name') == workflow_name),
            None
        )

        if not workflow:
            return {
                "success": False,
                "error": f"Workflow '{workflow_name}' not found in manifest",
                "exit_code": 2
            }

        # Load workflow YAML file
        workflow_path = workflow.get('path', '')
        workflow_yaml = None
        if workflow_path:
            try:
                workflow_yaml_raw = self.file_reader.read_file(workflow_path)
                # Dynamically replace {project-root} with {mcp-resources}
                workflow_yaml = self._resolve_workflow_placeholders(workflow_yaml_raw)
            except Exception as e:
                workflow_yaml = f"[Error reading workflow file: {e}]"
                logger.error(f"Error reading workflow file {workflow_path}: {e}")

        # Try to load instructions.md from workflow directory
        instructions = None
        if workflow_path:
            workflow_dir = str(Path(workflow_path).parent)
            instructions_path = f"{workflow_dir}/instructions.md"
            try:
                instructions_raw = self.file_reader.read_file(instructions_path)
                # Dynamically replace {project-root} with {mcp-resources}
                instructions = self._resolve_workflow_placeholders(instructions_raw)
            except:
                # Instructions file not required
                pass

        # Resolve paths and add agent manifest data for workflows that need it
        workflow_context = self._build_workflow_context()

        return {
            "success": True,
            "type": "workflow",
            "name": workflow.get('name'),
            "description": workflow.get('description', ''),
            "module": workflow.get('module'),
            "path": workflow_path,
            "workflow_yaml": workflow_yaml,
            "instructions": instructions,
            "context": workflow_context,  # Add resolved paths and manifest data
            "exit_code": 0
        }

    def _format_error_response(self, validation: ValidationResult) -> dict[str, Any]:
        """Format validation error as response dict."""
        return {
            "success": False,
            "error_code": validation.error_code,
            "error": validation.error_message,
            "suggestions": validation.suggestions,
            "exit_code": validation.exit_code
        }

    def _build_workflow_context(self) -> dict[str, Any]:
        """
        Build workflow execution context with resolved paths and manifest data.
        
        This provides workflows with access to BMAD server resources regardless
        of where the workflow is executed.
        
        Returns:
            Dict containing:
                - bmad_server_root: Absolute path to BMAD server installation
                - project_root: Absolute path to project root
                - agent_manifest_path: Absolute path to agent manifest CSV
                - agent_manifest_data: List of all agents with their metadata
                - agent_count: Number of available agents
        """
        return {
            "bmad_server_root": str(self.bmad_root),
            "project_root": str(self.bmad_root),
            "mcp_resources": str(self.bmad_root),  # Alias for clarity
            "agent_manifest_path": str(self.bmad_root / "bmad" / "_cfg" / "agent-manifest.csv"),
            "agent_manifest_data": self.agents,
            "agent_count": len(self.agents),
        }

    def _resolve_workflow_placeholders(self, content: str) -> str:
        """
        Dynamically resolve workflow placeholders to clarify MCP resource usage.
        
        Replaces {project-root} with {mcp-resources} to emphasize that these
        are MCP server resources, not user workspace files.
        
        Args:
            content: Workflow YAML or instruction content
            
        Returns:
            Content with resolved placeholders
        """
        # Replace {project-root} with {mcp-resources} to clarify these are MCP server resources
        return content.replace("{project-root}", "{mcp-resources}")

    # Error message formatters

    def _format_too_many_args_error(self, parts: list[str]) -> str:
        """Format error for multiple arguments."""
        return f"""Error: Too many arguments

The bmad tool accepts only one argument at a time.

You provided: {' '.join(parts)}

Did you mean one of these?
  - bmad {parts[0]} (load {parts[0]} agent)
  - bmad *{parts[1]} (execute {parts[1]} workflow)

Usage:
  bmad                  → Load bmad-master
  bmad <agent-name>     → Load specified agent
  bmad *<workflow-name> → Execute specified workflow"""

    def _format_double_asterisk_error(self, workflow_name: str) -> str:
        """Format error for double asterisk."""
        return f"""Error: Invalid syntax

Workflows require exactly one asterisk (*) prefix, not two (**).

Correct syntax:
  bmad *{workflow_name}

Try: bmad *{workflow_name}"""

    def _format_missing_workflow_name_error(self) -> str:
        """Format error for asterisk without name."""
        return """Error: Missing workflow name

The asterisk (*) prefix requires a workflow name.

Correct syntax:
  bmad *<workflow-name>

Example:
  bmad *party-mode

To list all workflows, try:
  bmad list-workflows"""

    def _format_missing_asterisk_error(self, workflow_name: str) -> str:
        """Format error for workflow without asterisk."""
        return f"""Error: Missing workflow prefix

'{workflow_name}' appears to be a workflow name, but is missing the asterisk (*) prefix.

Workflows must be invoked with the asterisk prefix:
  Correct:   bmad *{workflow_name}
  Incorrect: bmad {workflow_name}

To load an agent instead, use:
  bmad <agent-name>

Did you mean: bmad *{workflow_name}?"""

    def _format_dangerous_chars_error(self, chars: list[str]) -> str:
        """Format error for dangerous characters."""
        return f"""Error: Invalid characters detected

The command contains potentially dangerous characters: {', '.join(chars)}

For security reasons, the following characters are not allowed:
  ; & | $ ` < > ( )

Agent and workflow names use only:
  - Lowercase letters (a-z)
  - Numbers (0-9, workflows only)
  - Hyphens (-)

Try: bmad analyst"""

    def _format_non_ascii_error(self, chars: list[str]) -> str:
        """Format error for non-ASCII characters."""
        return f"""Error: Non-ASCII characters detected

The command contains non-ASCII characters: {', '.join(chars)}

Agent and workflow names must use ASCII characters only:
  - Lowercase letters (a-z)
  - Numbers (0-9, workflows only)
  - Hyphens (-)

Try using ASCII equivalents."""

    def _format_name_too_short_error(self, name: str, command_type: str) -> str:
        """Format error for name too short."""
        entity = "Agent" if command_type == "agent" else "Workflow"
        available = self._format_available_list(command_type)
        return f"""Error: {entity} name too short

{entity} name '{name}' is only {len(name)} character(s) long. Names must be at least {MIN_NAME_LENGTH} characters.

{available}

Try: bmad <agent-name>"""

    def _format_name_too_long_error(self, name: str, length: int) -> str:
        """Format error for name too long."""
        return f"""Error: Name too long

The provided name is {length} characters long. Names must be at most {MAX_NAME_LENGTH} characters.

Please use a shorter agent or workflow name."""

    def _format_invalid_format_error(self, name: str, command_type: str) -> str:
        """Format error for invalid name format."""
        if command_type == "agent":
            return f"""Error: Invalid agent name format

Agent name '{name}' contains invalid characters.

Agent names must:
  - Use lowercase letters only
  - Use hyphens (-) to separate words
  - Start and end with a letter
  - Not contain numbers or special characters

Valid examples:
  - analyst
  - bmad-master
  - game-dev"""
        else:
            return f"""Error: Invalid workflow name format

Workflow name '{name}' contains invalid characters.

Workflow names must:
  - Use lowercase letters and numbers
  - Use hyphens (-) to separate words
  - Start and end with alphanumeric character
  - Not contain underscores or special characters

Valid examples:
  - party-mode
  - brainstorm-project
  - dev-story"""

    def _format_unknown_agent_error(self, name: str, suggestion: Optional[str]) -> str:
        """Format error for unknown agent."""
        message = f"Error: Unknown agent '{name}'\n\n"

        if suggestion:
            message += f"Did you mean: {suggestion}?\n\n"

        message += f"The agent '{name}' is not available in the BMAD system.\n\n"
        message += self._format_available_list("agent")
        message += "\nTry: bmad <agent-name>\nExample: bmad analyst"

        return message

    def _format_unknown_workflow_error(self, name: str, suggestion: Optional[str]) -> str:
        """Format error for unknown workflow."""
        message = f"Error: Unknown workflow '*{name}'\n\n"

        if suggestion:
            message += f"Did you mean: *{suggestion}?\n\n"

        message += f"The workflow '{name}' is not available in the BMAD system.\n\n"
        message += self._format_available_list("workflow")
        message += "\nTry: bmad *<workflow-name>\nExample: bmad *party-mode"

        return message

    def _format_case_mismatch_error(self, name: str, correct_name: str) -> str:
        """Format error for case mismatch."""
        return f"""Error: Case sensitivity mismatch

Agent names are case-sensitive. '{name}' does not match '{correct_name}'.

Did you mean: bmad {correct_name}?

Note: All agent and workflow names use lowercase letters only."""

    def _format_available_list(self, command_type: str) -> str:
        """Format list of available agents or workflows."""
        if command_type == "agent":
            lines = ["Available agents:"]
            for agent in self.agents[:10]:  # Show first 10
                name = agent.get('name', '')
                title = agent.get('title', '')
                lines.append(f"  - {name} ({title})")
            if len(self.agents) > 10:
                lines.append(f"  ... ({len(self.agents) - 10} more)")
            return "\n".join(lines)
        else:
            lines = ["Available workflows:"]
            for workflow in self.workflows[:10]:  # Show first 10
                name = workflow.get('name', '')
                desc = workflow.get('description', '')
                lines.append(f"  - *{name} ({desc})")
            if len(self.workflows) > 10:
                lines.append(f"  ... ({len(self.workflows) - 10} more, use list-workflows for complete list)")
            return "\n".join(lines)

    def _get_agent_instructions(self) -> str:
        """Get BMAD processing instructions for agents."""
        return """## BMAD Processing Instructions

This agent is part of the BMAD (BMad Methodology for Agile Development) framework.

**How to Process:**
1. Read the agent definition markdown to understand role, identity, and principles
2. Apply the communication style specified in the agent definition
3. Use the customization YAML for any project-specific overrides
4. Access available BMAD tools and workflows as needed
5. Follow the agent's core principles when making decisions

**Agent Activation:**
- You are now embodying this agent's persona
- Communicate using the specified communication style
- Apply the agent's principles to all recommendations
- Use the agent's identity and role to guide your responses

**Available BMAD Tools:**
The following MCP tools are available for workflow execution:
- `bmad *<workflow-name>` - Execute a BMAD workflow
- Use the bmad tool to discover and execute workflows as needed

Use these tools to access BMAD workflows and tasks as needed."""
