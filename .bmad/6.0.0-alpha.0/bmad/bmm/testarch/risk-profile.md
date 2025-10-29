<!-- Powered by BMAD-CORE™ -->

# Risk Profile v2.0 (Slim)

```xml
<task id="bmad/bmm/testarch/risk-profile" name="Risk Profile">
  <llm critical="true">
    <i>Set command_key="*risk-profile"</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-commands.csv and parse the row where command equals command_key</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-knowledge.md focusing on risk-model guidance</i>
    <i>Use CSV columns preflight, flow_cues, deliverables, halt_rules, notes, knowledge_tags as the full instruction set</i>
    <i>Split pipe-delimited values into actionable items</i>
    <i>Keep assessment grounded in evidence from PRD/architecture/story files—do not restate requirements as risks</i>
  </llm>
  <flow>
    <step n="1" title="Preflight">
      <action>Verify prerequisites; stop if halt_rules trigger</action>
    </step>
    <step n="2" title="Execute Risk Analysis">
      <action>Follow flow_cues to distinguish requirements from genuine risks and score probability × impact</action>
      <action>Use knowledge heuristics to calibrate scoring (score 9 rare, ≥6 notable) and recommend mitigations</action>
    </step>
    <step n="3" title="Deliverables">
      <action>Produce artifacts described in deliverables (assessment markdown, gate snippet, mitigation plan)</action>
      <action>Summarize key findings with clear recommendations</action>
    </step>
  </flow>
  <halt>
    <i>Apply halt_rules from the CSV row without modification</i>
  </halt>
  <notes>
    <i>Use notes column for calibration reminders</i>
  </notes>
  <output>
    <i>Risk assessment report + gate summary</i>
  </output>
</task>
```
