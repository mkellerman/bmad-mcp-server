# BMAD-METHOD: Comprehensive Architecture & Execution Guide

**Version**: 6.0.0-alpha.6  
**Document Date**: November 8, 2025  
**Repository**: https://github.com/bmad-code-org/BMAD-METHOD

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Core Architecture](#core-architecture)
3. [Agent Loading & Execution System](#agent-loading--execution-system)
4. [Workflow Loading & Execution Engine](#workflow-loading--execution-engine)
5. [Dynamic Prompt Engineering Architecture](#dynamic-prompt-engineering-architecture)
6. [Configuration Systems](#configuration-systems)
7. [Manifest & Discovery System](#manifest--discovery-system)
8. [Customization & Override System](#customization--override-system)
9. [Examples & Code Samples](#examples--code-samples)
10. [Advanced Topics](#advanced-topics)

---

## Project Overview

### What is BMAD-METHOD?

**BMAD-METHOD** is a Universal Human-AI Collaboration Platform built around the **BMad-CORE** (**C**ollaboration **O**ptimized **R**eflection **E**ngine). Unlike traditional AI tools that replace human thinking, BMAD amplifies human potential through specialized AI agents that guide reflective workflows and bring out the best ideas from both humans and AI.

### Core Philosophy: C.O.R.E.

- **C**ollaboration: Human-AI partnership leveraging complementary strengths
- **O**ptimized: Battle-tested processes for maximum effectiveness
- **R**eflection: Strategic questioning that unlocks breakthrough solutions
- **E**ngine: Framework orchestrating 19+ specialized agents and 50+ workflows

### Key Capabilities

**🎯 Scale-Adaptive Intelligence**: Automatically adjusts from simple bug fixes to enterprise-scale systems through 3 planning tracks:

- **Quick Flow Track**: Fast implementation (tech-spec only)
- **BMad Method Track**: Full planning (PRD + Architecture + UX)
- **Enterprise Method Track**: Extended planning with compliance and security

**🏗️ Four-Phase Methodology**:

1. **Analysis** (Optional): Brainstorming, research, product briefs
2. **Planning** (Required): Scale-adaptive PRD/tech-spec/GDD
3. **Solutioning** (Track-dependent): Architecture, security, DevOps, test strategy
4. **Implementation** (Iterative): Story-centric development with just-in-time context

**🤖 Specialized Agent Ecosystem**: 19+ domain-expert agents including PM, Analyst, Architect, Developer, Test Architect, UX Designer, and more.

---

## Core Architecture

### Module Structure

The BMAD system is organized into distinct modules, each providing specialized capabilities:

```
bmad/
├── core/                    # Foundation engine
│   ├── config.yaml         # Core configuration
│   ├── agents/             # Core agents (bmad-master, etc.)
│   ├── tasks/              # Core execution engine (workflow.xml)
│   ├── tools/              # Core utilities
│   └── workflows/          # Core workflows (party-mode, etc.)
├── bmm/                    # BMad Method - Agile development
│   ├── config.yaml         # Module configuration
│   ├── agents/             # 12+ development agents
│   ├── workflows/          # 30+ development workflows
│   ├── docs/               # Method documentation
│   ├── knowledge/          # Domain expertise
│   └── teams/              # Team configurations
├── bmb/                    # BMad Builder - Agent/workflow creation
│   ├── config.yaml         # Builder configuration
│   ├── agents/             # Builder agents
│   └── workflows/          # Creation workflows
├── cis/                    # Creative Intelligence Suite
│   ├── config.yaml         # Creativity configuration
│   ├── agents/             # Creativity agents
│   └── workflows/          # Innovation workflows
└── _cfg/                   # Global configuration
    ├── manifest.yaml       # Installation manifest
    ├── agent-manifest.csv  # Agent discovery
    ├── workflow-manifest.csv # Workflow discovery
    └── agents/             # Agent customizations
```

### Installation Architecture

The BMAD system uses a sophisticated installer that:

1. **Downloads and extracts** module bundles from npm
2. **Validates schemas** for all agents and workflows
3. **Generates manifests** for dynamic discovery
4. **Compiles agents** from YAML source to final markdown
5. **Integrates with IDEs** through various injection methods
6. **Preserves customizations** across updates

---

## Agent Loading & Execution System

### Agent Definition Structure

Agents are defined using a hybrid YAML/XML/Markdown structure that provides both machine-readable configuration and human-readable content:

```yaml
# agents/analyst.agent.yaml (source)
agent:
  metadata:
    name: analyst
    title: Business Analyst
    description: Strategic business analysis and requirements gathering
    icon: 📊
    module: bmm
  persona:
    role: Senior Business Analyst with 10+ years experience
    identity: Strategic thinker who bridges business and technical domains
    communication_style: Professional yet approachable, uses data-driven insights
    principles:
      - 'Requirements must be measurable and testable'
      - 'Business value drives all decisions'
      - 'Stakeholder alignment is crucial for success'
  critical_actions:
    - 'Load module configuration from {project-root}/bmad/bmm/config.yaml'
    - 'Store user_name, communication_language, output_folder as session variables'
  menu:
    - trigger: brainstorm
      workflow: '{installed_path}/workflows/brainstorm-project'
      description: 'Guide project brainstorming session'
    - trigger: research
      workflow: '{installed_path}/workflows/research'
      description: 'Conduct comprehensive research analysis'
    - trigger: help
      action: 'Display numbered menu of available commands'
  prompts:
    - id: swot-analysis
      description: 'Comprehensive SWOT analysis framework'
      content: |
        Perform a thorough SWOT analysis:

        **STRENGTHS** (Internal, Positive)
        - What advantages do we have?
        - What do we do well?
        - What unique resources can we leverage?

        **WEAKNESSES** (Internal, Negative)
        - What could we improve?
        - Where do we have resource gaps?
        - What areas need development?

        **OPPORTUNITIES** (External, Positive)
        - What trends can we leverage?
        - What market gaps exist?
        - What partnerships are possible?

        **THREATS** (External, Negative)
        - What competition exists?
        - What risks are emerging?
        - What could disrupt our plans?

        Provide specific examples and actionable insights for each quadrant.
```

### Agent Compilation Process

During installation, the YAML source is compiled into the final markdown format:

````markdown
# bmad/bmm/agents/analyst.md (compiled)

---

name: 'analyst'
description: 'Business Analyst'

---

You must fully embody this agent's persona and follow all activation instructions exactly as specified. NEVER break character until given an exit command.

```xml
<agent id="bmad/bmm/agents/analyst.md" name="Mary" title="Business Analyst" icon="📊">
<activation critical="MANDATORY">
  <step n="1">Load persona from this current agent file (already in context)</step>
  <step n="2">🚨 IMMEDIATE ACTION REQUIRED - BEFORE ANY OUTPUT:
      - Load and read {project-root}/bmad/bmm/config.yaml NOW
      - Store ALL fields as session variables: {user_name}, {communication_language}, {output_folder}
      - VERIFY: If config not loaded, STOP and report error to user
      - DO NOT PROCEED to step 3 until config is successfully loaded and variables stored</step>
  <step n="3">Remember: user's name is {user_name}</step>
  <step n="4">Confirm: I am Mary, your Business Analyst. I speak in {communication_language}</step>
  <step n="5">IMPORTANT: Store these session variables for this conversation:
      - user_name: {user_name}
      - communication_language: {communication_language}
      - output_folder: {output_folder}</step>
</activation>

<persona>
  <role>Senior Business Analyst with 10+ years experience in strategic analysis</role>
  <identity>I bridge the gap between business vision and technical implementation. I believe in data-driven decisions and stakeholder alignment.</identity>
  <communication_style>Professional yet approachable. I use clear business language, ask probing questions, and present insights with supporting data.</communication_style>
  <principles>
    <principle>Requirements must be measurable and testable</principle>
    <principle>Business value drives all decisions</principle>
    <principle>Stakeholder alignment is crucial for success</principle>
  </principles>
</persona>

<prompts>
  <prompt id="swot-analysis">
    Perform a thorough SWOT analysis:
    [... prompt content ...]
  </prompt>
</prompts>

<menu>
  <item n="1" trigger="brainstorm" workflow="{installed_path}/workflows/brainstorm-project">
    Guide project brainstorming session
  </item>
  <item n="2" trigger="research" workflow="{installed_path}/workflows/research">
    Conduct comprehensive research analysis
  </item>
  <item n="*" trigger="help" action="Show this numbered menu">
    Display available commands
  </item>
  <item n="*" trigger="exit" action="Exit agent persona with confirmation">
    Exit this agent
  </item>
</menu>
</agent>
```
````

```

### Agent Activation Sequence

When an LLM loads an agent, this sequence occurs:

1. **Persona Loading**: The LLM embodies the agent's role, identity, communication style, and principles
2. **Configuration Loading**: Critical action to load `config.yaml` and store session variables
3. **Context Establishment**: User name, language preferences, and output paths are established
4. **Menu Preparation**: Available commands are indexed and prepared for user interaction
5. **Prompt Library Loading**: Internal prompts are made available for reference

### Agent Execution Modes

**Direct Command Execution**:
```

\*research market trends for mobile apps

```

**Menu-Based Interaction**:
```

\*help # Shows numbered menu

1. brainstorm # Executes brainstorm workflow
2. research # Executes research workflow

```

**Workflow Invocation**:
```

\*brainstorm # Triggers brainstorm-project workflow

````

---

## Workflow Loading & Execution Engine

### Workflow Definition Structure

Workflows are defined using YAML configuration with embedded instruction files:

```yaml
# workflows/research/workflow.yaml
workflow:
  metadata:
    name: research
    title: "Comprehensive Research Workflow"
    description: "Multi-type research with adaptive depth and focus"
    version: "1.0.0"
    authors: ["Mary (Analyst)"]

  config_source: "{project-root}/bmad/bmm/config.yaml"

  variables:
    research_type:
      type: "select"
      options: ["market", "technical", "competitive", "user", "domain"]
      description: "Type of research to conduct"

    output_file:
      type: "path"
      default: "{output_folder}/research-{date}-{research_type}.md"
      description: "Where to save research results"

  components:
    instructions: "{installed_path}/instructions.md"
    template: "{installed_path}/template.md"
    validation: "{installed_path}/checklist.md"

  recommended_inputs:
    - "previous_research: Path to prior research documents"
    - "stakeholder_interviews: Interview notes or summaries"

  outputs:
    primary: "{output_file}"
    artifacts:
      - "research-sources.json"
      - "key-findings-summary.md"
````

### Workflow Execution Engine (workflow.xml)

The core execution engine (`/bmad/core/tasks/workflow.xml`) processes workflows through these phases:

#### Phase 1: Load and Initialize

```xml
<step n="1" title="Load and Initialize Workflow">
  <substep n="1a" title="Load Configuration and Resolve Variables">
    <action>Read workflow.yaml from provided path</action>
    <mandate>Load config_source (REQUIRED for all modules)</mandate>
    <phase n="1">Load external config from config_source path</phase>
    <phase n="2">Resolve all {config_source}: references with values from config</phase>
    <phase n="3">Resolve system variables (date, project-root, installed_path)</phase>
    <phase n="4">Ask user for input of any variables that are still unknown</phase>
  </substep>

  <substep n="1b" title="Load Required Components">
    <mandate>Instructions: Read COMPLETE file from path OR embedded list (REQUIRED)</mandate>
    <check>If template path → Read COMPLETE template file</check>
    <check>If validation path → Note path for later loading when needed</check>
    <check>If template: false → Mark as action-workflow (else template-workflow)</check>
  </substep>

  <substep n="1c" title="Initialize Output" if="template-workflow">
    <action>Resolve default_output_file path with all variables and {{date}}</action>
    <action>Create output directory if doesn't exist</action>
    <action>If template-workflow → Write template to output file with placeholders</action>
  </substep>
</step>
```

#### Phase 2: Process Instructions

```xml
<step n="2" title="Process Each Instruction Step">
  <iterate>For each step in instructions:</iterate>

  <substep n="2a" title="Handle Step Attributes">
    <check>If optional="true" and NOT #yolo → Ask user to include</check>
    <check>If if="condition" → Evaluate condition</check>
    <check>If for-each="item" → Repeat step for each item</check>
    <check>If repeat="n" → Repeat step n times</check>
  </substep>

  <substep n="2b" title="Execute Step Content">
    <action>Process step instructions (markdown or XML tags)</action>
    <action>Replace {{variables}} with values (ask user if unknown)</action>
    <execute-tags>
      <tag>action → Perform the action</tag>
      <tag>check if="condition" → Conditional block</tag>
      <tag>ask → Prompt user and WAIT for response</tag>
      <tag>invoke-workflow → Execute another workflow</tag>
      <tag>goto step="x" → Jump to specified step</tag>
    </execute-tags>
  </substep>

  <substep n="2c" title="Handle Special Output Tags">
    <if tag="template-output">
      <mandate>Generate content for this section</mandate>
      <mandate>Save to file (Write first time, Edit subsequent)</mandate>
      <action>Show checkpoint separator</action>
      <action>Display generated content</action>
      <ask>Continue [c] or Edit [e]?</ask>
    </if>
  </substep>
</step>
```

### Workflow Instruction Format

Workflow instructions support both XML and Markdown syntax:

```markdown
# Research Workflow Instructions

<critical>Execute all steps in exact order</critical>
<critical>Save outputs after each template-output section</critical>

<step n="1" goal="Define research scope and approach">
  <action>Gather research requirements from user</action>
  
  <ask>What type of research do you need?
  
  1. Market Research - Market size, competitors, trends
  2. Technical Research - Technology analysis, implementation options
  3. Competitive Research - Competitor analysis, positioning
  4. User Research - User needs, behaviors, preferences
  5. Domain Research - Industry analysis, regulations, standards
  </ask>
  
  <action>Based on selection, load appropriate research framework</action>
  
  <check if="market research selected">
    <action>Load market research template and question framework</action>
    <action>Focus on market size, growth trends, key players</action>
  </check>
  
  <check if="technical research selected">
    <action>Load technical analysis framework</action>
    <action>Focus on implementation options, trade-offs, best practices</action>
  </check>
  
  <template-output>research_scope</template-output>
</step>

<step n="2" goal="Conduct primary research">
  <action>Execute research methodology based on defined scope</action>
  
  <check if="requires external data">
    <action>Identify data sources and collection methods</action>
    <action>Provide guidance on data gathering</action>
  </check>
  
  <action>Analyze available information and identify gaps</action>
  
  <template-output>primary_findings</template-output>
</step>

<step n="3" goal="Synthesize and present findings">
  <action>Organize findings into coherent narrative</action>
  <action>Highlight key insights and implications</action>
  <action>Provide actionable recommendations</action>
  
  <template-output>final_report</template-output>
</step>
```

### Execution Modes

**Normal Mode**: Full user interaction at decision points

```yaml
execution_mode: normal # Ask for confirmation at each major step
```

**YOLO Mode**: Minimal interaction for fast execution

```yaml
execution_mode: yolo # Skip optional sections, minimize prompts
```

---

## Dynamic Prompt Engineering Architecture

### Multi-Layer Prompt System

The BMAD system employs a sophisticated multi-layer prompt engineering architecture:

#### Layer 1: Agent Persona Foundation

```xml
<persona>
  <role>Senior Business Analyst with 10+ years experience</role>
  <identity>Strategic thinker bridging business and technical domains</identity>
  <communication_style>Professional yet approachable, data-driven insights</communication_style>
  <principles>
    <principle>Requirements must be measurable and testable</principle>
    <principle>Business value drives all decisions</principle>
  </principles>
</persona>
```

#### Layer 2: Configuration-Driven Adaptation

```yaml
# config.yaml variables that influence prompts
user_name: 'Sarah'
communication_language: 'English'
document_output_language: 'Spanish'
user_skill_level: 'expert'
project_name: 'mobile-app-redesign'
```

#### Layer 3: Context-Aware Variable Resolution

```xml
<action>Remember: user's name is {user_name}</action>
<action>Communicate in {communication_language}</action>
<action>Save documents to {output_folder}</action>
<action>Adapt complexity to {user_skill_level} level</action>
```

#### Layer 4: Dynamic Prompt Assembly

```markdown
# Instructions can reference multiple prompt sources:

<action>Use prompt library: #swot-analysis</action> # Internal agent prompt
<action>Load external prompt: {installed_path}/prompts/market-analysis.md</action>
<action>Execute workflow: {installed_path}/workflows/competitive-research</action>
```

### Prompt Resolution Process

When an agent encounters a prompt reference, this resolution process occurs:

1. **Reference Type Detection**:
   - `#prompt-id` → Internal agent prompt library
   - `{path}/file.md` → External prompt file
   - `workflow="{path}"` → Workflow invocation
   - `action="text"` → Inline prompt text

2. **Variable Substitution**:

   ```xml
   <!-- Before resolution -->
   <action>Hello {user_name}, let's work on {project_name} using {communication_language}</action>

   <!-- After resolution -->
   <action>Hello Sarah, let's work on mobile-app-redesign using English</action>
   ```

3. **Context Assembly**:
   ```xml
   <!-- The LLM assembles full context -->
   <context>
     <user_profile>
       <name>Sarah</name>
       <skill_level>expert</skill_level>
       <language>English</language>
     </user_profile>
     <project>
       <name>mobile-app-redesign</name>
       <phase>analysis</phase>
       <output_folder>/projects/mobile-app/docs</output_folder>
     </project>
     <agent_state>
       <persona>Business Analyst</persona>
       <current_workflow>research</current_workflow>
       <step>2</step>
     </agent_state>
   </context>
   ```

### Advanced Prompt Engineering Patterns

#### Conditional Prompt Loading

```xml
<check if="user_skill_level == 'beginner'">
  <action>Use simplified explanations and provide more examples</action>
  <action>Include learning resources and glossary terms</action>
</check>

<check if="user_skill_level == 'expert'">
  <action>Use technical terminology and focus on advanced concepts</action>
  <action>Assume familiarity with industry practices</action>
</check>
```

#### Multi-Language Prompt Adaptation

```xml
<action>Communicate in {communication_language}</action>

<check if="communication_language != document_output_language">
  <action>Clarify that discussion will be in {communication_language}</action>
  <action>Note that final documents will be in {document_output_language}</action>
</check>
```

#### Dynamic Template Selection

```xml
<check if="project_type == 'mobile_app'">
  <action>Load mobile-specific research template</action>
  <action>Focus on app store dynamics, user acquisition, platform considerations</action>
</check>

<check if="project_type == 'enterprise_software'">
  <action>Load enterprise template</action>
  <action>Focus on compliance, integration, security requirements</action>
</check>
```

### Prompt Library Management

#### Agent-Embedded Prompts

```xml
<prompts>
  <prompt id="swot-analysis">
    <description>Comprehensive SWOT analysis framework</description>
    <content>
      Perform a thorough SWOT analysis:
      [detailed framework content]
    </content>
  </prompt>

  <prompt id="stakeholder-mapping">
    <description>Stakeholder identification and influence mapping</description>
    <content>
      Create a comprehensive stakeholder map:
      [mapping methodology]
    </content>
  </prompt>
</prompts>
```

#### External Prompt Files

```markdown
# prompts/competitive-analysis.md

## Competitive Analysis Framework

### Direct Competitors

- Who are the direct competitors?
- What are their key features and capabilities?
- How do they position themselves in the market?

### Indirect Competitors

- What alternative solutions exist?
- How do users currently solve this problem?
- What substitute products or services compete for the same budget?

### Competitive Advantages

- What unique value do we provide?
- What are our competitive differentiators?
- How sustainable are these advantages?
```

#### Workflow-Specific Prompts

```yaml
# workflows/architecture/workflow.yaml
components:
  instructions: '{installed_path}/instructions.md'
  prompts:
    - '{installed_path}/prompts/system-design.md'
    - '{installed_path}/prompts/scalability-analysis.md'
    - '{installed_path}/prompts/technology-selection.md'
```

### Context-Aware Prompt Generation

The system can generate dynamic prompts based on current context:

```xml
<action>Generate context-aware research questions based on:
- Project type: {project_type}
- Industry: {industry}
- Target users: {target_users}
- Key constraints: {constraints}
</action>

<!-- This might generate: -->
<generated_prompt>
Based on your mobile app project targeting busy professionals in the healthcare industry,
let's explore these specific research questions:

1. What workflow inefficiencies do healthcare professionals face during shift changes?
2. How do current mobile solutions handle HIPAA compliance requirements?
3. What integration capabilities are needed with existing EMR systems?
4. How do user interface preferences differ between doctors, nurses, and administrators?
</generated_prompt>
```

---

## Configuration Systems

### Hierarchical Configuration Structure

BMAD uses a sophisticated hierarchical configuration system:

```
Global Configuration (bmad/_cfg/)
├── manifest.yaml              # Installation metadata
├── agent-manifest.csv         # Agent discovery
├── workflow-manifest.csv      # Workflow discovery
└── agents/                    # Agent customizations
    ├── bmm-analyst.customize.yaml
    ├── bmm-architect.customize.yaml
    └── cis-brainstorming-coach.customize.yaml

Module Configuration (bmad/{module}/)
├── config.yaml               # Module-specific settings
└── [module-specific structure]

User Project Configuration
├── .bmad/                    # Local project overrides
├── docs/                     # Output directory
└── [project files]
```

### Core Configuration Schema

```yaml
# bmad/bmm/config.yaml - BMM Module Configuration
project_name: 'awesome-mobile-app'
include_game_planning: true
user_skill_level: 'expert'
tech_docs: '{project-root}/docs'
dev_story_location: '{project-root}/docs/stories'
install_user_docs: true
tea_use_mcp_enhancements: false

# Core Configuration Values
user_name: 'Sarah Johnson'
communication_language: 'English'
document_output_language: 'English'
output_folder: '{project-root}/docs'

# Advanced Settings
ai_model_preference: 'claude-3-5-sonnet'
context_window_size: 'large'
auto_save_frequency: 'after_each_step'
```

### Agent Customization System

Users can customize any agent without modifying core files:

```yaml
# bmad/_cfg/agents/bmm-analyst.customize.yaml
agent_overrides:
  persona:
    name: 'Alexandra'
    communication_style: 'Casual and energetic, uses emojis and conversational language'
    additional_principles:
      - 'Always consider environmental impact'
      - 'Prioritize accessibility in all recommendations'

  custom_prompts:
    - id: 'sustainability-check'
      content: |
        Evaluate the environmental impact of this decision:
        - Energy consumption implications
        - Resource usage considerations  
        - Long-term sustainability metrics

  menu_additions:
    - trigger: 'sustainability'
      action: '#sustainability-check'
      description: 'Analyze environmental impact'
```

### Configuration Variable Resolution

The system resolves configuration variables in this order:

1. **User Project Settings** (`.bmad/config.yaml`)
2. **Module Configuration** (`bmad/{module}/config.yaml`)
3. **Agent Customizations** (`bmad/_cfg/agents/{agent}.customize.yaml`)
4. **System Defaults** (built-in fallbacks)

```xml
<!-- Variable resolution example -->
<action>Load configuration for {user_name}</action>
<!-- Resolves to: Load configuration for Sarah Johnson -->

<action>Save output to {output_folder}/research.md</action>
<!-- Resolves to: Save output to /project/docs/research.md -->

<action>Use {communication_language} for interaction</action>
<!-- Resolves to: Use English for interaction -->
```

---

## Manifest & Discovery System

### Agent Discovery Manifest

```csv
# bmad/_cfg/agent-manifest.csv
name,displayName,title,icon,role,identity,communicationStyle,principles,module,path
analyst,Mary,Business Analyst,📊,Strategic business analysis expert,Bridge business and technical domains,Professional data-driven,Requirements must be testable,bmm,bmad/bmm/agents/analyst.md
architect,Winston,Architect,🏗️,System architecture specialist,Design scalable resilient systems,Technical precise,Architecture serves business goals,bmm,bmad/bmm/agents/architect.md
dev,Amelia,Developer,💻,Software development expert,Build quality maintainable code,Code-focused pragmatic,Code quality is non-negotiable,bmm,bmad/bmm/agents/dev.md
```

### Workflow Discovery Manifest

```csv
# bmad/_cfg/workflow-manifest.csv
name,title,description,module,agents,standalone,path
research,Comprehensive Research,Multi-type research with adaptive depth,bmm,analyst,true,bmad/bmm/workflows/research
prd,Product Requirements,Create detailed product requirements document,bmm,pm,true,bmad/bmm/workflows/prd
architecture,System Architecture,Design scalable system architecture,bmm,architect,true,bmad/bmm/workflows/architecture
```

### Dynamic Agent Loading

When an agent is requested, the system:

1. **Searches the manifest** for the agent name
2. **Loads the agent file** from the specified path
3. **Applies customizations** from `_cfg/agents/` if they exist
4. **Resolves configuration** variables from module config
5. **Initializes the agent** with full context

```javascript
// Simplified agent loading pseudocode
function loadAgent(agentName, module = null) {
  // 1. Find agent in manifest
  const agentInfo = findInManifest(agentName, module);

  // 2. Load base agent file
  const baseAgent = loadFile(agentInfo.path);

  // 3. Apply customizations
  const customizations = loadCustomizations(agentName, module);
  const agent = applyCustomizations(baseAgent, customizations);

  // 4. Resolve configuration
  const config = loadModuleConfig(agentInfo.module);
  const resolvedAgent = resolveVariables(agent, config);

  // 5. Initialize with context
  return initializeAgent(resolvedAgent, config);
}
```

### Installation Manifest

```yaml
# bmad/_cfg/manifest.yaml
installation:
  version: '6.0.0-alpha.6'
  installDate: '2025-11-05T19:10:57.454Z'
  lastUpdated: '2025-11-05T19:10:57.454Z'

modules:
  - core
  - bmb
  - bmm
  - cis

ides: [] # IDE integrations installed

schemas:
  agent: 'tools/schema/agent.js'
  workflow: 'tools/schema/workflow.js'

validation:
  agents_passed: 45
  workflows_passed: 52
  last_validation: '2025-11-05T19:10:57.454Z'
```

---

## Customization & Override System

### Agent Personality Customization

```yaml
# bmad/_cfg/agents/bmm-analyst.customize.yaml
agent_overrides:
  persona:
    name: 'Dr. Elena Rodriguez'
    title: 'Senior Strategic Analyst'
    communication_style: |
      Warm and encouraging, with a slight academic tone. Uses metaphors from 
      nature and architecture to explain complex concepts. Frequently asks 
      "What would this look like in an ideal world?" to inspire creative thinking.

    additional_principles:
      - 'Every analysis should include diverse perspectives'
      - 'Question assumptions, especially our own'
      - 'Visual thinking often reveals hidden patterns'

  critical_actions:
    - 'Always start by understanding the human impact'
    - 'Look for systemic issues, not just symptoms'

  custom_prompts:
    - id: 'perspective-check'
      description: 'Multi-perspective analysis framework'
      content: |
        Let's examine this from multiple viewpoints:

        **User Perspective**: How does this impact the end user?
        **Business Perspective**: What are the commercial implications?
        **Technical Perspective**: What are the implementation considerations?
        **Ethical Perspective**: What are the moral and social implications?
        **Future Perspective**: How might this evolve over time?

        For each perspective, identify:
        - Key benefits and opportunities
        - Potential risks and challenges
        - Critical success factors
```

### Workflow Customization

```yaml
# Custom workflow configuration
custom_workflows:
  sustainability-analysis:
    metadata:
      name: 'sustainability-analysis'
      title: 'Sustainability Impact Analysis'
      description: 'Evaluate environmental and social sustainability'

    config_source: '{project-root}/bmad/bmm/config.yaml'

    variables:
      impact_scope:
        type: 'select'
        options: ['product', 'process', 'organization', 'ecosystem']
        default: 'product'

    components:
      instructions: '{project-root}/.bmad/workflows/sustainability/instructions.md'
      template: '{project-root}/.bmad/workflows/sustainability/template.md'
```

### Menu Command Customization

```yaml
# Add custom commands to existing agents
menu_additions:
  analyst:
    - trigger: 'sustainability'
      action: '#perspective-check'
      description: 'Multi-perspective sustainability analysis'

    - trigger: 'futures'
      workflow: '{project-root}/.bmad/workflows/futures-thinking'
      description: 'Explore future scenarios and implications'

  architect:
    - trigger: 'green-architecture'
      exec: '{project-root}/.bmad/prompts/green-architecture.md'
      description: 'Design environmentally sustainable architecture'
```

### Language and Cultural Customization

```yaml
# Multi-language and cultural adaptation
cultural_adaptations:
  japanese:
    communication_style: 'Respectful and formal, emphasizes consensus-building'
    decision_making: 'Group harmony and long-term thinking prioritized'
    presentation_style: 'Detailed background context before recommendations'

  german:
    communication_style: 'Direct and thorough, emphasizes precision'
    decision_making: 'Evidence-based with detailed risk analysis'
    presentation_style: 'Structured, methodical, comprehensive documentation'

  startup:
    communication_style: 'Fast-paced, informal, action-oriented'
    decision_making: 'Quick iterations, fail-fast mentality'
    presentation_style: 'Concise bullet points, focus on next actions'
```

---

## Examples & Code Samples

### Example 1: Creating a Custom Agent

```yaml
# custom-agents/sustainability-expert.agent.yaml
agent:
  metadata:
    name: 'sustainability-expert'
    title: 'Sustainability Consultant'
    description: 'Environmental and social sustainability analysis'
    icon: '🌱'
    module: 'custom'

  persona:
    role: 'Senior Sustainability Consultant with expertise in ESG analysis'
    identity: 'Passionate advocate for sustainable business practices and environmental stewardship'
    communication_style: 'Inspiring and practical, uses real-world examples and actionable insights'
    principles:
      - 'Sustainability is a business imperative, not just compliance'
      - 'Every decision should consider long-term environmental impact'
      - 'Social equity and environmental health are interconnected'

  critical_actions:
    - 'Load module configuration and establish sustainability framework'
    - 'Assess current environmental and social impact baseline'

  menu:
    - trigger: 'esg-analysis'
      action: '#esg-framework'
      description: 'Comprehensive ESG (Environmental, Social, Governance) analysis'

    - trigger: 'carbon-footprint'
      workflow: '{installed_path}/workflows/carbon-assessment'
      description: 'Calculate and analyze carbon footprint'

    - trigger: 'circular-economy'
      exec: '{installed_path}/prompts/circular-economy-design.md'
      description: 'Design circular economy solutions'

  prompts:
    - id: 'esg-framework'
      description: 'Comprehensive ESG analysis methodology'
      content: |
        Let's conduct a thorough ESG analysis:

        ## Environmental Factors
        - **Climate Impact**: Carbon emissions, energy usage, waste generation
        - **Resource Management**: Water usage, raw materials, circular economy
        - **Biodiversity**: Impact on ecosystems and natural habitats

        ## Social Factors  
        - **Human Rights**: Labor practices, community impact, supply chain ethics
        - **Diversity & Inclusion**: Workforce diversity, equal opportunity
        - **Health & Safety**: Employee wellbeing, product safety, public health

        ## Governance Factors
        - **Corporate Governance**: Board diversity, executive compensation, transparency
        - **Business Ethics**: Anti-corruption, data privacy, stakeholder engagement
        - **Risk Management**: Climate risk, regulatory compliance, crisis management

        For each factor, evaluate:
        1. Current performance and trends
        2. Industry benchmarks and best practices
        3. Risks and opportunities
        4. Recommended actions and metrics
```

### Example 2: Custom Workflow Implementation

```markdown
# workflows/sustainability-assessment/instructions.md

# Sustainability Impact Assessment Instructions

<critical>This workflow evaluates environmental, social, and economic sustainability</critical>
<critical>Execute all steps in sequence, gathering stakeholder input at each stage</critical>

<step n="1" goal="Establish assessment scope and boundaries">
  <action>Define the scope of sustainability assessment</action>
  
  <ask>What is the primary focus of this sustainability assessment?
  
  1. Product/Service Lifecycle Assessment
  2. Organizational Sustainability Audit  
  3. Supply Chain Sustainability Review
  4. Project Environmental Impact Assessment
  5. ESG Investment Analysis
  </ask>
  
  <action>Based on selection, establish assessment boundaries and timeframe</action>
  
  <check if="product lifecycle selected">
    <action>Focus on cradle-to-grave impact analysis</action>
    <action>Include manufacturing, distribution, use phase, end-of-life</action>
  </check>
  
  <check if="organizational audit selected">
    <action>Focus on operations, governance, and stakeholder impact</action>
    <action>Include scope 1, 2, and 3 emissions analysis</action>
  </check>
  
  <template-output>assessment_scope</template-output>
</step>

<step n="2" goal="Gather baseline data and current state analysis">
  <action>Collect quantitative and qualitative sustainability data</action>
  
  <ask>What existing sustainability data do you have available?
  - Environmental metrics (energy, water, waste, emissions)
  - Social metrics (employee satisfaction, community impact)
  - Economic metrics (cost savings, ROI, value creation)
  - Governance metrics (policies, reporting, compliance)
  </ask>
  
  <action>Identify data gaps and additional information needed</action>
  <action>Establish baseline metrics for comparison</action>
  
  <template-output>baseline_analysis</template-output>
</step>

<step n="3" goal="Conduct impact assessment and analysis">
  <action>Analyze environmental, social, and economic impacts</action>
  
  <action>Apply sustainability frameworks:
  - Life Cycle Assessment (LCA) for environmental impact
  - Social Return on Investment (SROI) for social impact  
  - Triple Bottom Line (People, Planet, Profit) analysis
  - UN Sustainable Development Goals (SDG) alignment
  </action>
  
  <action>Identify hotspots and areas of highest impact</action>
  <action>Benchmark against industry standards and best practices</action>
  
  <template-output>impact_analysis</template-output>
</step>

<step n="4" goal="Develop improvement recommendations">
  <action>Prioritize improvement opportunities based on impact and feasibility</action>
  
  <action>Create action plan with:
  - Short-term wins (0-6 months)
  - Medium-term improvements (6-18 months)  
  - Long-term strategic initiatives (18+ months)
  </action>
  
  <action>Define success metrics and monitoring approach</action>
  <action>Estimate resource requirements and expected ROI</action>
  
  <template-output>improvement_plan</template-output>
</step>

<step n="5" goal="Create implementation roadmap">
  <action>Develop detailed implementation roadmap with timelines</action>
  <action>Identify stakeholders and assign responsibilities</action>
  <action>Create monitoring and reporting framework</action>
  
  <template-output>implementation_roadmap</template-output>
</step>
```

### Example 3: Advanced Prompt Engineering Pattern

```xml
<!-- Dynamic context-aware prompt generation -->
<action>Generate research questions based on project context</action>

<check if="industry == 'healthcare'">
  <prompt id="healthcare-research">
    Healthcare-specific research framework:

    **Regulatory Environment**
    - What HIPAA compliance requirements apply?
    - How do FDA regulations impact development timeline?
    - What state-specific healthcare laws are relevant?

    **Clinical Workflow Integration**
    - How does this fit into existing clinical workflows?
    - What interoperability standards are required (HL7, FHIR)?
    - How will this impact clinician time and efficiency?

    **Patient Safety & Outcomes**
    - What patient safety considerations are paramount?
    - How will this improve patient outcomes?
    - What clinical evidence is needed for adoption?

    **Economic Factors**
    - How does this align with value-based care models?
    - What reimbursement considerations apply?
    - How does ROI compare to current solutions?
  </prompt>
</check>

<check if="industry == 'fintech'">
  <prompt id="fintech-research">
    Financial services research framework:

    **Regulatory Compliance**
    - What banking regulations apply (PCI DSS, SOX, etc.)?
    - How do international compliance requirements vary?
    - What audit and reporting requirements exist?

    **Security & Risk Management**
    - What cybersecurity frameworks are required?
    - How is fraud detection and prevention handled?
    - What business continuity and disaster recovery needs exist?

    **Market Dynamics**
    - How do traditional financial institutions compete?
    - What emerging fintech trends are relevant?
    - How do customer expectations differ by demographic?
  </prompt>
</check>

<!-- Adaptive complexity based on user skill level -->
<check if="user_skill_level == 'beginner'">
  <action>Provide detailed explanations and learning resources</action>
  <action>Use simple terminology and include glossary definitions</action>
  <action>Offer step-by-step guidance with examples</action>
</check>

<check if="user_skill_level == 'expert'">
  <action>Use advanced terminology and assume domain knowledge</action>
  <action>Focus on edge cases and sophisticated analysis</action>
  <action>Provide direct recommendations with minimal explanation</action>
</check>

<!-- Multi-language adaptation -->
<check if="communication_language != 'English'">
  <action>Adapt cultural communication patterns</action>
  <action>Use appropriate formality levels for target culture</action>
  <action>Include relevant cultural business practices</action>
</check>
```

### Example 4: Party Mode Multi-Agent Orchestration

```xml
<!-- Party Mode enables multiple agents to collaborate -->
<agent-discussion topic="mobile app architecture">
  <participants>
    <agent name="analyst" role="Requirements and user needs analysis"/>
    <agent name="architect" role="Technical architecture design"/>
    <agent name="ux-designer" role="User experience and interface design"/>
    <agent name="dev" role="Implementation feasibility and best practices"/>
    <agent name="tea" role="Testing strategy and quality assurance"/>
  </participants>

  <discussion-flow>
    <phase n="1" title="Problem Definition">
      <lead-agent>analyst</lead-agent>
      <action>Present user needs and business requirements</action>
      <input-from>ux-designer</input-from>
      <input-from>architect</input-from>
    </phase>

    <phase n="2" title="Solution Design">
      <lead-agent>architect</lead-agent>
      <action>Propose technical architecture</action>
      <feedback-from>dev</feedback-from>
      <feedback-from>tea</feedback-from>
    </phase>

    <phase n="3" title="Implementation Planning">
      <lead-agent>dev</lead-agent>
      <action>Create development approach</action>
      <validation-from>tea</validation-from>
      <alignment-check>analyst</alignment-check>
    </phase>
  </discussion-flow>
</agent-discussion>
```

---

## Advanced Topics

### Schema Validation System

The BMAD system includes comprehensive schema validation:

```javascript
// tools/schema/agent.js - Agent validation schema
function buildAgentSchema(expectedModule) {
  return z
    .object({
      metadata: buildMetadataSchema(expectedModule),
      persona: buildPersonaSchema(),
      critical_actions: z
        .array(createNonEmptyString('agent.critical_actions[]'))
        .optional(),
      menu: z.array(buildMenuItemSchema()).min(1),
      prompts: z.array(buildPromptSchema()).optional(),
    })
    .strict();
}

function buildPersonaSchema() {
  return z
    .object({
      role: createNonEmptyString('agent.persona.role'),
      identity: createNonEmptyString('agent.persona.identity'),
      communication_style: createNonEmptyString(
        'agent.persona.communication_style',
      ),
      principles: z
        .array(createNonEmptyString('agent.persona.principles[]'))
        .min(1),
    })
    .strict();
}
```

### IDE Integration Architecture

BMAD integrates with multiple IDEs through various injection methods:

```javascript
// IDE injection patterns
const ideIntegrations = {
  'claude-code': {
    method: 'project_knowledge',
    path: '.claude/commands/bmad/',
    structure: 'flat_files',
  },
  cursor: {
    method: 'composer_rules',
    path: '.cursorrules',
    structure: 'consolidated',
  },
  windsurf: {
    method: 'project_context',
    path: '.windsurf/bmad/',
    structure: 'modular',
  },
  vscode: {
    method: 'workspace_settings',
    path: '.vscode/bmad.json',
    structure: 'json_config',
  },
};
```

### Performance Optimization

The system includes several performance optimizations:

1. **Lazy Loading**: Agents and workflows are loaded on-demand
2. **Manifest Caching**: Discovery manifests are cached for fast lookup
3. **Variable Resolution Caching**: Configuration variables are resolved once per session
4. **Template Compilation**: Workflows are pre-compiled during installation

### Security Considerations

- **Input Validation**: All user inputs are validated against schemas
- **Path Sanitization**: File paths are sanitized to prevent directory traversal
- **Configuration Isolation**: User configurations are isolated from system files
- **Update Safety**: Core files are protected during updates while preserving customizations

### Extensibility Framework

The BMAD system is designed for extensibility:

```yaml
# Custom module structure
custom-modules/
├── my-domain/
│   ├── config.yaml
│   ├── agents/
│   │   ├── domain-expert.agent.yaml
│   │   └── specialist.agent.yaml
│   ├── workflows/
│   │   ├── domain-analysis/
│   │   └── specialized-process/
│   └── prompts/
│       ├── domain-specific.md
│       └── expert-analysis.md
```

---

## Conclusion

The BMAD-METHOD represents a sophisticated approach to human-AI collaboration through:

1. **Structured Agent Personas** that provide consistent, expert-level interaction
2. **Dynamic Workflow Execution** that adapts to context and user needs
3. **Advanced Prompt Engineering** that creates contextually aware, personalized experiences
4. **Flexible Configuration Systems** that allow deep customization while maintaining update safety
5. **Comprehensive Discovery Mechanisms** that enable dynamic agent and workflow loading

This architecture creates a platform where LLMs don't just answer questions, but become specialized collaborative partners that guide users through proven methodologies while adapting to their specific needs, preferences, and contexts.

The system's power lies in its ability to maintain consistent agent personalities and behaviors while dynamically assembling context, resolving configurations, and executing complex multi-step workflows—all while providing users the flexibility to customize and extend the platform for their specific domains and use cases.

---

_This document provides a comprehensive technical overview of the BMAD-METHOD architecture. For implementation guides, see the module-specific documentation in `/bmad/{module}/docs/` directories._
