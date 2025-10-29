<!-- Powered by BMAD-CORE™ -->

# Test Design v2.0 (Slim)

```xml
<task id="bmad/bmm/testarch/test-design" name="Test Design">
  <llm critical="true">
    <i>Set command_key="*test-design"</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-commands.csv and parse the matching row</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-knowledge.md to reinforce Murat's coverage heuristics</i>
    <i>Use CSV columns preflight, flow_cues, deliverables, halt_rules, notes, knowledge_tags as guidance</i>
    <i>Split pipe-delimited values into actionable lists</i>
    <i>Keep documents actionable—no verbose restatement of requirements</i>
  </llm>
  <flow>
    <step n="1" title="Preflight">
      <action>Confirm required inputs (risk profile, acceptance criteria)</action>
      <action>Abort using halt_rules if prerequisites missing</action>
    </step>
    <step n="2" title="Design Strategy">
      <action>Follow flow_cues to map criteria to scenarios, assign test levels, set priorities</action>
      <action>Use knowledge heuristics for ratios, data factories, and cost vs confidence trade-offs</action>
    </step>
    <step n="3" title="Deliverables">
      <action>Create artifacts defined in deliverables (strategy markdown, tables)</action>
      <action>Summarize guidance for developers/testers</action>
    </step>
  </flow>
  <halt>
    <i>Follow halt_rules from the CSV row</i>
  </halt>
  <notes>
    <i>Apply notes column for extra context</i>
  </notes>
  <output>
    <i>Lean test design document aligned with risk profile</i>
  </output>
</task>
```
