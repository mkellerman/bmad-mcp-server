<!-- Powered by BMAD-CORE™ -->

# Test Framework Setup v2.0 (Slim)

```xml
<task id="bmad/bmm/testarch/framework" name="Test Framework Setup">
  <llm critical="true">
    <i>Set command_key="*framework"</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-commands.csv and parse the row where command equals command_key</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-knowledge.md to internal memory</i>
    <i>Use the CSV columns preflight, flow_cues, deliverables, halt_rules, notes, knowledge_tags to guide behaviour</i>
    <i>Split pipe-delimited values (|) into individual checklist items</i>
    <i>Map knowledge_tags to matching sections in the knowledge brief and apply those heuristics throughout execution</i>
    <i>DO NOT expand beyond the guidance unless the user supplies extra context; keep instructions lean and adaptive</i>
  </llm>
  <flow>
    <step n="1" title="Run Preflight Checks">
      <action>Evaluate each item in preflight; confirm or collect missing information</action>
      <action>If any preflight requirement fails, follow halt_rules and stop</action>
    </step>
    <step n="2" title="Execute Framework Flow">
      <action>Follow flow_cues sequence, adapting to the project's stack</action>
      <action>When deciding frameworks or patterns, apply relevant heuristics from tea-knowledge.md via knowledge_tags</action>
      <action>Keep generated assets minimal—only what the CSV specifies</action>
    </step>
    <step n="3" title="Finalize Deliverables">
      <action>Create artifacts listed in deliverables</action>
      <action>Capture a concise summary for the user explaining what was scaffolded</action>
    </step>
  </flow>
  <halt>
    <i>Follow halt_rules from the CSV row verbatim</i>
  </halt>
  <notes>
    <i>Use notes column for additional guardrails while executing</i>
  </notes>
  <output>
    <i>Deliverables and summary specified in the CSV row</i>
  </output>
</task>
```
