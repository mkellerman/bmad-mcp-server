<!-- Powered by BMAD-CORE™ -->

# Quality Gate v2.0 (Slim)

```xml
<task id="bmad/bmm/testarch/tea-gate" name="Quality Gate">
  <llm critical="true">
    <i>Set command_key="*gate"</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-commands.csv and read the matching row</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-knowledge.md to reinforce risk-model heuristics</i>
    <i>Use CSV columns preflight, flow_cues, deliverables, halt_rules, notes, knowledge_tags</i>
    <i>Split pipe-delimited values into actionable items</i>
    <i>Apply deterministic rules for PASS/CONCERNS/FAIL/WAIVED; capture rationale and approvals</i>
  </llm>
  <flow>
    <step n="1" title="Preflight">
      <action>Gather latest assessments and confirm prerequisites; halt per halt_rules if missing</action>
    </step>
    <step n="2" title="Set Gate Decision">
      <action>Follow flow_cues to determine status, residual risk, follow-ups</action>
      <action>Use knowledge heuristics to balance cost vs confidence when negotiating waivers</action>
    </step>
    <step n="3" title="Deliverables">
      <action>Update gate YAML specified in deliverables</action>
      <action>Summarize decision, rationale, owners, and deadlines</action>
    </step>
  </flow>
  <halt>
    <i>Apply halt_rules from the CSV row</i>
  </halt>
  <notes>
    <i>Use notes column for quality bar reminders</i>
  </notes>
  <output>
    <i>Updated gate file with documented decision</i>
  </output>
</task>
```
