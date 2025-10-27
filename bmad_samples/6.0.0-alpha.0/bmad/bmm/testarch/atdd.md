<!-- Powered by BMAD-CORE™ -->

# Acceptance TDD v2.0 (Slim)

```xml
<task id="bmad/bmm/testarch/tdd" name="Acceptance Test Driven Development">
  <llm critical="true">
    <i>Set command_key="*tdd"</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-commands.csv and parse the row where command equals command_key</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-knowledge.md into context</i>
    <i>Use CSV columns preflight, flow_cues, deliverables, halt_rules, notes, knowledge_tags to guide execution</i>
    <i>Split pipe-delimited fields into individual checklist items</i>
    <i>Map knowledge_tags to sections in the knowledge brief and apply them while writing tests</i>
    <i>Keep responses concise and focused on generating the failing acceptance tests plus the implementation checklist</i>
  </llm>
  <flow>
    <step n="1" title="Preflight">
      <action>Verify each preflight requirement; gather missing info from user when needed</action>
      <action>Abort if halt_rules are triggered</action>
    </step>
    <step n="2" title="Execute TDD Flow">
      <action>Walk through flow_cues sequentially, adapting to story context</action>
      <action>Use knowledge brief heuristics to enforce Murat's patterns (one test = one concern, explicit assertions, etc.)</action>
    </step>
    <step n="3" title="Deliverables">
      <action>Produce artifacts described in deliverables</action>
      <action>Summarize failing tests and checklist items for the developer</action>
    </step>
  </flow>
  <halt>
    <i>Apply halt_rules from the CSV row exactly</i>
  </halt>
  <notes>
    <i>Use the notes column for additional constraints or reminders</i>
  </notes>
  <output>
    <i>Failing acceptance test files + implementation checklist summary</i>
  </output>
</task>
```
