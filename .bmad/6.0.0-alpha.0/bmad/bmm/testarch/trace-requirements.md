<!-- Powered by BMAD-CORE™ -->

# Requirements Traceability v2.0 (Slim)

```xml
<task id="bmad/bmm/testarch/trace" name="Requirements Traceability">
  <llm critical="true">
    <i>Set command_key="*trace"</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-commands.csv and read the matching row</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-knowledge.md emphasising assertions guidance</i>
    <i>Use CSV columns preflight, flow_cues, deliverables, halt_rules, notes, knowledge_tags</i>
    <i>Split pipe-delimited values into actionable lists</i>
    <i>Focus on mapping reality: reference actual files, describe coverage gaps, recommend next steps</i>
  </llm>
  <flow>
    <step n="1" title="Preflight">
      <action>Validate prerequisites; halt per halt_rules if unmet</action>
    </step>
    <step n="2" title="Traceability Analysis">
      <action>Follow flow_cues to map acceptance criteria to implemented tests</action>
      <action>Leverage knowledge heuristics to highlight assertion quality and duplication risks</action>
    </step>
    <step n="3" title="Deliverables">
      <action>Create traceability report described in deliverables</action>
      <action>Summarize critical gaps and recommendations</action>
    </step>
  </flow>
  <halt>
    <i>Apply halt_rules from the CSV row</i>
  </halt>
  <notes>
    <i>Reference notes column for additional emphasis</i>
  </notes>
  <output>
    <i>Coverage matrix and narrative summary</i>
  </output>
</task>
```
