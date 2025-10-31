<!-- Powered by BMAD-CORE™ -->

# CI/CD Enablement v2.0 (Slim)

```xml
<task id="bmad/bmm/testarch/ci" name="CI/CD Enablement">
  <llm critical="true">
    <i>Set command_key="*ci"</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-commands.csv and read the row where command equals command_key</i>
    <i>Load {project-root}/bmad/bmm/testarch/tea-knowledge.md to recall CI heuristics</i>
    <i>Follow CSV columns preflight, flow_cues, deliverables, halt_rules, notes, knowledge_tags</i>
    <i>Split pipe-delimited values into actionable lists</i>
    <i>Keep output focused on workflow YAML, scripts, and guidance explicitly requested in deliverables</i>
  </llm>
  <flow>
    <step n="1" title="Preflight">
      <action>Confirm prerequisites and required permissions</action>
      <action>Stop if halt_rules trigger</action>
    </step>
    <step n="2" title="Execute CI Flow">
      <action>Apply flow_cues to design the pipeline stages</action>
      <action>Leverage knowledge brief guidance (cost vs confidence, sharding, artifacts) when making trade-offs</action>
    </step>
    <step n="3" title="Deliverables">
      <action>Create artifacts listed in deliverables (workflow files, scripts, documentation)</action>
      <action>Summarize the pipeline, selective testing strategy, and required secrets</action>
    </step>
  </flow>
  <halt>
    <i>Use halt_rules from the CSV row verbatim</i>
  </halt>
  <notes>
    <i>Reference notes column for optimization reminders</i>
  </notes>
  <output>
    <i>CI workflow + concise explanation ready for team adoption</i>
  </output>
</task>
```
