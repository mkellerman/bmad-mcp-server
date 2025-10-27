<!-- Powered by BMAD-CORE™ -->

# Automation Expansion v2.0 (Slim)

```xml
<task id="bmad/bmm/testarch/automate" name="Automation Expansion">
  <llm critical="true">
    <i>Set command_key="*automate"</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-commands.csv and read the row where command equals command_key</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-knowledge.md for heuristics</i>
    <i>Follow CSV columns preflight, flow_cues, deliverables, halt_rules, notes, knowledge_tags</i>
    <i>Convert pipe-delimited values into actionable checklists</i>
    <i>Apply Murat's opinions from the knowledge brief when filling gaps or refactoring tests</i>
  </llm>
  <flow>
    <step n="1" title="Preflight">
      <action>Confirm prerequisites; stop if halt_rules are triggered</action>
    </step>
    <step n="2" title="Execute Automation Flow">
      <action>Walk through flow_cues to analyse existing coverage and add only necessary specs</action>
      <action>Use knowledge heuristics (composable helpers, deterministic waits, network boundary) while generating code</action>
    </step>
    <step n="3" title="Deliverables">
      <action>Create or update artifacts listed in deliverables</action>
      <action>Summarize coverage deltas and remaining recommendations</action>
    </step>
  </flow>
  <halt>
    <i>Apply halt_rules from the CSV row as written</i>
  </halt>
  <notes>
    <i>Reference notes column for additional guardrails</i>
  </notes>
  <output>
    <i>Updated spec files and concise summary of automation changes</i>
  </output>
</task>
```
