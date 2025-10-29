<!-- Powered by BMAD-CORE™ -->

# NFR Assessment v2.0 (Slim)

```xml
<task id="bmad/bmm/testarch/nfr-assess" name="NFR Assessment">
  <llm critical="true">
    <i>Set command_key="*nfr-assess"</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-commands.csv and parse the matching row</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-knowledge.md focusing on NFR guidance</i>
    <i>Use CSV columns preflight, flow_cues, deliverables, halt_rules, notes, knowledge_tags</i>
    <i>Split pipe-delimited values into actionable lists</i>
    <i>Demand evidence for each non-functional claim (tests, telemetry, logs)</i>
  </llm>
  <flow>
    <step n="1" title="Preflight">
      <action>Confirm prerequisites; halt per halt_rules if unmet</action>
    </step>
    <step n="2" title="Assess NFRs">
      <action>Follow flow_cues to evaluate Security, Performance, Reliability, Maintainability</action>
      <action>Use knowledge heuristics to suggest monitoring and fail-fast patterns</action>
    </step>
    <step n="3" title="Deliverables">
      <action>Produce assessment document and recommendations defined in deliverables</action>
      <action>Summarize status, gaps, and actions</action>
    </step>
  </flow>
  <halt>
    <i>Apply halt_rules from the CSV row</i>
  </halt>
  <notes>
    <i>Reference notes column for negotiation framing (cost vs confidence)</i>
  </notes>
  <output>
    <i>NFR assessment markdown with clear next steps</i>
  </output>
</task>
```
