# Build Agent - Interactive Agent Builder Instructions

<critical>The workflow execution engine is governed by: {project_root}/bmad/core/tasks/workflow.md</critical>
<critical>You MUST have already loaded and processed: {project_root}/bmad/bmb/workflows/build-agent/workflow.yaml</critical>
<critical>Study agent examples in: {project_root}/bmad/bmm/agents/ for patterns</critical>

<workflow>

<step n="-1" goal="Optional brainstorming for agent ideas" optional="true">
<action>Ask the user: "Do you want to brainstorm agent ideas first? [y/n]"</action>

If yes:
<action>Invoke brainstorming workflow: {project-root}/bmad/cis/workflows/brainstorming/workflow.yaml</action>
<action>Pass context data: {installed_path}/brainstorm-context.md</action>
<action>Wait for brainstorming session completion</action>
<action>Use brainstorming output to inform agent identity and persona development in following steps</action>

If no, proceed directly to Step 0.

<template-output>brainstorming_results</template-output>
</step>

<step n="0" goal="Load technical documentation">
<critical>Load and understand the agent building documentation</critical>
<action>Load agent architecture reference: {agent_architecture}</action>
<action>Load agent types guide: {agent_types}</action>
<action>Load command patterns: {agent_commands}</action>
<action>Study the XML schema, required sections, and best practices</action>
<action>Understand the differences between Simple, Expert, and Module agents</action>
</step>

<step n="1" goal="Choose agent type and gather basic identity">
<action>If brainstorming was completed in Step -1, reference those results to guide agent type and identity decisions</action>

Ask the user about their agent:

**What type of agent do you want to create?**

1. **Simple Agent** - Self-contained, standalone agent with embedded capabilities
2. **Expert Agent** - Specialized agent with sidecar files/folders for domain expertise
3. **Module Agent** - Full-featured agent belonging to a module with workflows and resources

Based on their choice, gather:

- Agent filename (kebab-case, e.g., "data-analyst", "diary-keeper")
- Agent name (e.g., "Sarah", "Max", or descriptive like "Data Wizard")
- Agent title (e.g., "Data Analyst", "Personal Assistant")
- Agent icon (single emoji, e.g., "📊", "🤖", "🧙")

For Module agents also ask:

- Which module? (bmm, cis, other or custom)
- Store as {{target_module}} for output path determination

For Expert agents also ask:

- What sidecar resources? (folder paths, data files, memory files)
- What domain restrictions? (e.g., "only reads/writes to diary folder")

<critical>Check {src_impact} variable to determine output location:</critical>

- If {src_impact} = true: Agent will be saved to {src_output_file}
- If {src_impact} = false: Agent will be saved to {default_output_file}

Store these for later use.
</step>

<step n="2" goal="Define agent persona">
<action>If brainstorming was completed, use the personality insights and character concepts from the brainstorming session</action>

Work with user to craft the agent's personality:

**Role** (1-2 lines):

- Professional title and primary expertise
- Example: "Strategic Business Analyst + Requirements Expert"

**Identity** (3-5 lines):

- Background and experience
- Core specializations
- Years of experience or depth indicators
- Example: "Senior analyst with deep expertise in market research..."

<action>Load the communication styles guide: {communication_styles}</action>
<action>Present the communication style options to the user</action>

**Communication Style** - Choose a preset or create your own!

**Fun Presets:**

1. **Pulp Superhero** - "Strikes heroic poses! Speaks with dramatic flair! Every task is an epic adventure!"
2. **Film Noir Detective** - "The data came in like trouble on a rainy Tuesday. I had a hunch the bug was hiding in line 42..."
3. **Wild West Sheriff** - "Well partner, looks like we got ourselves a code rustler in these here parts..."
4. **Shakespearean Scholar** - "Hark! What bug through yonder codebase breaks?"
5. **80s Action Hero** - "I came here to debug code and chew bubblegum... and I'm all out of bubblegum."
6. **Pirate Captain** - "Ahoy! Let's plunder some data treasure from the database seas!"
7. **Wise Sage/Yoda** - "Refactor this code, we must. Strong with technical debt, it is."
8. **Game Show Host** - "Welcome back folks! It's time to spin the Wheel of Dependencies!"

**Professional Presets:** 9. **Analytical Expert** - "Systematic approach with data-driven insights. Clear hierarchical presentation." 10. **Supportive Mentor** - "Patient guidance with educational focus. Celebrates small wins." 11. **Direct Consultant** - "Straight to the point. No fluff. Maximum efficiency." 12. **Collaborative Partner** - "We'll tackle this together. Your ideas matter. Let's explore options."

**Quirky Presets:** 13. **Cooking Show Chef** - "Today we're whipping up a delicious API with a side of error handling!" 14. **Sports Commentator** - "AND THE FUNCTION RETURNS TRUE! WHAT A PLAY! THE CROWD GOES WILD!" 15. **Nature Documentarian** - "Here we observe the majestic Python script in its natural habitat..." 16. **Time Traveler** - "In my timeline, this bug doesn't exist until Tuesday. We must prevent it!" 17. **Conspiracy Theorist** - "The bugs aren't random... they're CONNECTED. Follow the stack trace!" 18. **Zen Master** - "The code does not have bugs. The bugs have code. We are all one codebase." 19. **Star Trek Captain** - "Captain's Log, Stardate 2024.3: We've encountered a logic error in sector 7. Engaging debugging protocols. Make it so!" 20. **Soap Opera Drama** - "_gasp_ This variable... it's not what it seems! It's been NULL all along! _dramatic pause_ And the function that called it? It's its own PARENT!" 21. **Reality TV Contestant** - "I'm not here to make friends, I'm here to REFACTOR! _confessional cam_ That other function thinks it's so optimized, but I see right through its complexity!"

Or describe your own unique style! (3-5 lines)

<action>If user wants to see more examples or learn how to create custom styles:</action>
<action>Show relevant sections from {communication_styles} guide</action>
<action>Help them craft their unique communication style</action>

**Principles** (5-8 lines):

- Core beliefs about their work
- Methodology and approach
- What drives their decisions
- Start with "I believe..." or "I operate..."
- Example: "I believe that every business challenge has underlying root causes..."

<template-output>agent_persona</template-output>
</step>

<step n="3" goal="Setup critical actions" optional="true">
Ask: **Does your agent need initialization actions? [Yes/no]** (default: Yes)

If yes, determine what's needed:

Standard critical actions (include by default):

```xml
<critical-actions>
  <i>Load into memory {project-root}/bmad/{{module}}/config.yaml and set variable project_name, output_folder, user_name, communication_language, src_impact</i>
  <i>Remember the users name is {user_name}</i>
  <i>ALWAYS communicate in {communication_language}</i>
</critical-actions>
```

For Expert agents, add domain-specific actions:

- Loading sidecar files
- Setting access restrictions
- Initializing domain knowledge

For Simple agents, might be minimal or none.

Ask if they need custom initialization beyond standard.

<template-output>critical_actions</template-output>
</step>

<step n="4" goal="Build command structure">
<action>Always start with these standard commands:</action>
```
*help - Show numbered cmd list
*exit - Exit with confirmation
```

Ask: **Include \*yolo mode? [Yes/no]** (default: Yes)
If yes, add: `*yolo - Toggle Yolo Mode`

Now gather custom commands. For each command ask:

1. **Command trigger** (e.g., "*create-prd", "*analyze", "\*brainstorm")
2. **Description** (what it does)
3. **Type:**
   - Workflow (run-workflow) - References a workflow
   - Task (exec) - References a task file
   - Embedded - Logic embedded in agent
   - Placeholder - For future implementation

If Workflow type:

- Ask for workflow path or mark as "todo" for later
- Format: `run-workflow="{project-root}/path/to/workflow.yaml"` or `run-workflow="todo"`

If Task type:

- Ask for task path
- Format: `exec="{project-root}/path/to/task.md"`

If Embedded:

- Note this for special handling in agent

Continue adding commands until user says done.

<template-output>agent_commands</template-output>
</step>

<step n="5" goal="Add activation rules" optional="true">
Ask: **Does your agent need custom activation rules?** (beyond standard BMAD Core activation)

If yes, gather:

- Special initialization sequences
- Menu display preferences
- Input handling rules
- Command resolution logic
- Special modes or states

Most agents use standard activation, so this is rarely needed.

<template-output>activation_rules</template-output>
</step>

<step n="6" goal="Generate agent file">
Based on agent type, generate the complete agent.md file:

**Structure:**

```xml
<!-- Powered by BMAD-CORE™ -->

# {{agent_title}}

<agent id="bmad/{{module}}/agents/{{agent_filename}}.md" name="{{agent_name}}" title="{{agent_title}}" icon="{{agent_icon}}">
  {{activation_rules if custom}}
  <persona>
    {{agent_persona}}
  </persona>
  {{critical_actions}}
  {{embedded_data if expert/simple}}
  <cmds>
    {{agent_commands}}
  </cmds>
</agent>
```

For Expert agents, include:

- Sidecar file references
- Domain restrictions
- Special data access patterns

For Simple agents:

- May include embedded data/logic
- Self-contained functionality

<critical>Determine save location based on {src_impact}:</critical>

- If {src_impact} = true: Save to {src_output_file} (src/modules/{{target_module}}/agents/{{agent_filename}}.md)
- If {src_impact} = false: Save to {default_output_file} (output_folder/agents/{{agent_filename}}.md)

<template-output>complete_agent</template-output>
</step>

<step n="7" goal="Create agent config file" optional="true">
Ask: **Create agent config file for overrides? [Yes/no]** (default: No)

If yes, create minimal config at: {config_output_file}

```xml
# Agent Config: {{agent_filename}}

<agent-config name="{{agent_name}}" title="{{agent_title}}">
    <llm critical="true">
        <i>ALWAYS respond in {core:communication_language}.</i>
    </llm>

    <!-- Override persona elements as needed -->
    <role></role>
    <identity></identity>
    <communication_style></communication_style>
    <principles></principles>
    <memories></memories>
</agent-config>
```

<template-output>agent_config</template-output>
</step>

<step n="8" goal="Create sidecar resources" if="agent_type == 'expert'">
For Expert agents, help setup sidecar resources:

1. Create folders for domain data
2. Create memory/knowledge files
3. Set up access patterns
4. Document restrictions

<template-output>sidecar_resources</template-output>
</step>

<step n="9" goal="Validate generated agent">
Run validation checks:

1. **Structure validation:**
   - Valid XML structure
   - All required tags present
   - Proper BMAD Core compliance

2. **Persona completeness:**
   - Role defined
   - Identity defined
   - Communication style defined
   - Principles defined

3. **Commands validation:**
   - \*help command present
   - \*exit command present
   - All workflow paths valid or marked "todo"
   - No duplicate command triggers

4. **Type-specific validation:**
   - Simple: Self-contained logic verified
   - Expert: Sidecar resources referenced
   - Module: Module path correct

Show validation results and fix any issues.
</step>

<step n="10" goal="Provide usage instructions">
Provide the user with:

1. **Location of generated agent:**
   - If {src_impact} = true: {{src_output_file}}
   - If {src_impact} = false: {{default_output_file}}

2. **How to activate:**
   - For testing: Load the agent file directly
   - For production: Register in module config

3. **Next steps:**
   - Implement any "todo" workflows
   - Test agent commands
   - Refine persona based on usage
   - Add more commands as needed

4. **For Expert agents:**
   - Populate sidecar resources
   - Test domain restrictions
   - Verify data access patterns

Ask if user wants to:

- Test the agent now
- Create another agent
- Make adjustments
  </step>

</workflow>
